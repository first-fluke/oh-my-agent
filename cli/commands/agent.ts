import { execSync, spawn as spawnProcess } from "node:child_process";
import fs from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import color from "picocolors";
import { parse as parseYaml } from "yaml";
import { z } from "zod";
import {
  loadExecutionProtocol,
  resolvePromptContent,
  resolvePromptFlag,
  resolveVendor,
  type VendorConfig,
} from "../lib/agent-config.js";
import { formatSessionId, getSessionMeta } from "../lib/memory.js";
import { registerSignalCleanup } from "../lib/process-signals.js";
import { planDispatch } from "../lib/runtime-dispatch.js";
import { detectWorkspace } from "../lib/workspaces.js";

// Helper to check if process with PID is running
function isProcessRunning(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch (_e) {
    return false;
  }
}

export async function spawnAgent(
  agentId: string,
  prompt: string,
  sessionId: string,
  workspace: string,
  vendorOverride?: string,
) {
  const effectiveWorkspace =
    workspace === "." ? detectWorkspace(agentId) : workspace;
  const resolvedWorkspace = path.resolve(effectiveWorkspace);

  if (!fs.existsSync(resolvedWorkspace)) {
    fs.mkdirSync(resolvedWorkspace, { recursive: true });
    console.log(
      color.dim(`[${agentId}] Created workspace: ${resolvedWorkspace}`),
    );
  } else if (effectiveWorkspace !== workspace) {
    console.log(
      color.blue(`[${agentId}] Auto-detected workspace: ${effectiveWorkspace}`),
    );
  }

  const tmpDir = tmpdir();
  const logFile = path.join(tmpDir, `subagent-${sessionId}-${agentId}.log`);
  const pidFile = path.join(tmpDir, `subagent-${sessionId}-${agentId}.pid`);

  const rawPromptContent = resolvePromptContent(prompt);
  const { vendor, config } = resolveVendor(agentId, vendorOverride);

  // Inject vendor-specific execution protocol
  const executionProtocol = loadExecutionProtocol(vendor, process.cwd());
  const promptContent = executionProtocol
    ? `${rawPromptContent}\n\n${executionProtocol}`
    : rawPromptContent;

  const vendorConfig = config?.vendors?.[vendor] || {};

  // Prepare log stream
  const logStream = fs.openSync(logFile, "w");

  console.log(color.blue(`[${agentId}] Spawning subagent...`));
  console.log(color.dim(`  Vendor: ${vendor}`));
  console.log(color.dim(`  Workspace: ${resolvedWorkspace}`));
  console.log(color.dim(`  Log: ${logFile}`));
  const promptFlag = resolvePromptFlag(vendor, vendorConfig.prompt_flag);
  const dispatch = planDispatch(
    agentId,
    vendor,
    vendorConfig,
    promptFlag,
    promptContent,
  );
  const { command, args, env } = dispatch.invocation;
  console.log(
    color.dim(
      `  Dispatch: ${dispatch.mode} (${dispatch.runtimeVendor} -> ${dispatch.targetVendor}, ${dispatch.reason})`,
    ),
  );

  // Spawn selected CLI
  const child = spawnProcess(command, args, {
    cwd: resolvedWorkspace,
    stdio: ["ignore", logStream, logStream], // Redirect stdout/stderr to log file
    detached: false, // We want to wait for it, behaving like the script
    env,
  });

  if (!child.pid) {
    console.error(color.red(`[${agentId}] Failed to spawn process`));
    process.exit(1);
  }

  // Write PID
  fs.writeFileSync(pidFile, child.pid.toString());
  console.log(color.green(`[${agentId}] Started with PID ${child.pid}`));

  const cleanup = () => {
    try {
      if (fs.existsSync(pidFile)) fs.unlinkSync(pidFile);
      if (fs.existsSync(logFile)) fs.unlinkSync(logFile);
    } catch (_e) {
      // ignore
    }
  };

  // Handle signals to kill child
  const cleanAndExit = () => {
    if (child.pid && isProcessRunning(child.pid)) {
      process.kill(child.pid);
    }
    unregisterSignalCleanup();
    cleanup();
    process.exit();
  };

  const unregisterSignalCleanup = registerSignalCleanup(
    cleanAndExit,
    cleanAndExit,
  );

  (child as unknown as NodeJS.EventEmitter).on(
    "exit",
    (code: number | null) => {
      unregisterSignalCleanup();
      console.log(color.blue(`[${agentId}] Exited with code ${code}`));
      if (code !== 0 && fs.existsSync(logFile)) {
        const log = fs.readFileSync(logFile, "utf-8").trim();
        if (log) {
          console.log(color.red(`[${agentId}] Log output:`));
          console.log(log);
        }
      }
      cleanup();
      process.exit(code ?? 0);
    },
  );
}

export async function checkStatus(
  sessionId: string,
  agentIds: string[],
  rootPath: string = process.cwd(),
) {
  const results: Record<string, string> = {};

  for (const agent of agentIds) {
    const resultFile = path.join(
      rootPath,
      ".serena",
      "memories",
      `result-${agent}.md`,
    );
    const pidFile = path.join(tmpdir(), `subagent-${sessionId}-${agent}.pid`);

    if (fs.existsSync(resultFile)) {
      const content = fs.readFileSync(resultFile, "utf-8");
      // grep "^## Status:" "$RESULT" | head -1 | awk '{print $3}'
      const match = content.match(/^## Status:\s*(\S+)/m);
      if (match?.[1]) {
        // Use the status from the file to be more precise if possible
        // But script logic was:
        // STATUS=$(grep "^## Status:" "$RESULT" | head -1 | awk '{print $3}')
        // echo "${agent}:${STATUS}"
        results[agent] = match[1];
      } else {
        results[agent] = `completed`; // Fallback if status header missing but file exists
      }
    } else if (fs.existsSync(pidFile)) {
      // Logic for checking PID
      const pidContent = fs.readFileSync(pidFile, "utf-8").trim();
      const pid = parseInt(pidContent, 10);
      if (!Number.isNaN(pid) && isProcessRunning(pid)) {
        results[agent] = "running";
      } else {
        results[agent] = "crashed";
      }
    } else {
      results[agent] = "crashed"; // or "not_started" but script says "crashed"
    }
  }

  // Output in format comparable to script: "agent:status"
  for (const [agent, status] of Object.entries(results)) {
    console.log(`${agent}:${status}`);
  }
}

type TaskDefinition = {
  agent: string;
  task: string;
  workspace?: string;
};

const TaskDefinitionSchema = z.object({
  agent: z.string(),
  task: z.string(),
  workspace: z.string().optional(),
});

const TasksFileSchema = z.object({
  tasks: z.array(TaskDefinitionSchema),
});

function parseTasksFile(filePath: string): TaskDefinition[] {
  if (!fs.existsSync(filePath)) {
    throw new Error(`Tasks file not found: ${filePath}`);
  }

  const content = fs.readFileSync(filePath, "utf-8");
  const parsed = parseYaml(content);
  const result = TasksFileSchema.safeParse(parsed);

  if (!result.success) {
    throw new Error(`Invalid tasks file format: ${result.error.message}`);
  }

  return result.data.tasks;
}

function parseInlineTasks(taskSpecs: string[]): TaskDefinition[] {
  return taskSpecs.map((spec) => {
    const parts = spec.split(":");
    if (parts.length < 2 || !parts[0]) {
      throw new Error(
        `Invalid task format: "${spec}". Expected "agent:task" or "agent:task:workspace"`,
      );
    }

    const agent = parts[0];
    const rest = parts.slice(1);
    let task: string;
    let workspace: string | undefined;

    if (rest.length >= 2) {
      const lastPart = rest[rest.length - 1] ?? "";
      if (
        lastPart.startsWith("./") ||
        lastPart.startsWith("/") ||
        lastPart === "."
      ) {
        workspace = lastPart;
        task = rest.slice(0, -1).join(":");
      } else {
        task = rest.join(":");
      }
    } else {
      task = rest.join(":");
    }

    return { agent, task, workspace };
  });
}

export async function parallelRun(
  tasksOrFile: string[],
  options: {
    vendor?: string;
    inline?: boolean;
    noWait?: boolean;
  } = {},
) {
  const cwd = process.cwd();
  const resultsDir = path.join(cwd, ".agents", "results");
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
  const runDir = path.join(resultsDir, `parallel-${timestamp}`);

  fs.mkdirSync(runDir, { recursive: true });

  const pidListFile = path.join(runDir, "pids.txt");

  let tasks: TaskDefinition[];
  try {
    if (options.inline) {
      if (tasksOrFile.length === 0) {
        console.error(color.red("Error: No tasks specified"));
        console.log(
          'Usage: oh-my-ag agent:parallel --inline "agent:task" "agent:task" ...',
        );
        process.exit(1);
      }
      tasks = parseInlineTasks(tasksOrFile);
    } else {
      if (tasksOrFile.length === 0) {
        console.error(color.red("Error: No tasks file specified"));
        console.log("Usage: oh-my-ag agent:parallel <tasks-file.yaml>");
        process.exit(1);
      }
      const tasksFile = tasksOrFile[0];
      if (!tasksFile) {
        console.error(color.red("Error: No tasks file specified"));
        process.exit(1);
      }
      tasks = parseTasksFile(tasksFile);
    }
  } catch (error) {
    console.error(color.red(`Error: ${(error as Error).message}`));
    process.exit(1);
  }

  console.log(color.cyan("======================================"));
  console.log(color.cyan("  Parallel SubAgent Execution"));
  console.log(color.cyan("======================================"));
  console.log("");
  console.log(color.blue("Starting parallel execution..."));
  console.log("");

  const childProcesses: Array<{
    pid: number;
    agent: string;
    idx: number;
    promise: Promise<number | null>;
  }> = [];

  for (let idx = 0; idx < tasks.length; idx++) {
    const taskDef = tasks[idx];
    if (!taskDef) continue;
    const { agent, task, workspace = "." } = taskDef;
    const effectiveWorkspace =
      workspace === "." ? detectWorkspace(agent) : workspace;
    const resolvedWorkspace = path.resolve(effectiveWorkspace);
    const logFile = path.join(runDir, `${agent}-${idx}.log`);

    console.log(
      `${color.blue(`[${idx}]`)} Spawning ${color.yellow(agent)} agent...`,
    );
    console.log(
      `    Task: ${task.slice(0, 60)}${task.length > 60 ? "..." : ""}`,
    );
    console.log(`    Workspace: ${effectiveWorkspace}`);

    if (!fs.existsSync(resolvedWorkspace)) {
      fs.mkdirSync(resolvedWorkspace, { recursive: true });
    }

    const { vendor, config } = resolveVendor(agent, options.vendor);
    const vendorConfig = config?.vendors?.[vendor] || {};
    const promptFlag = resolvePromptFlag(vendor, vendorConfig.prompt_flag);
    const rawPromptContent = resolvePromptContent(task);

    // Inject vendor-specific execution protocol
    const executionProtocol = loadExecutionProtocol(vendor, cwd);
    const promptContent = executionProtocol
      ? `${rawPromptContent}\n\n${executionProtocol}`
      : rawPromptContent;

    const dispatch = planDispatch(
      agent,
      vendor,
      vendorConfig,
      promptFlag,
      promptContent,
    );
    const { command, args, env } = dispatch.invocation;
    console.log(
      `    Dispatch: ${dispatch.mode} (${dispatch.runtimeVendor} -> ${dispatch.targetVendor})`,
    );

    const logStream = fs.openSync(logFile, "w");

    const child = spawnProcess(command, args, {
      cwd: resolvedWorkspace,
      stdio: ["ignore", logStream, logStream],
      detached: false,
      env,
    });

    if (!child.pid) {
      console.error(color.red(`[${idx}] Failed to spawn ${agent} process`));
      continue;
    }

    fs.appendFileSync(pidListFile, `${child.pid}:${agent}\n`);

    const exitPromise = new Promise<number | null>((resolve) => {
      (child as unknown as NodeJS.EventEmitter).on(
        "exit",
        (code: number | null) => {
          fs.closeSync(logStream);
          resolve(code);
        },
      );
      (child as unknown as NodeJS.EventEmitter).on("error", () => {
        fs.closeSync(logStream);
        resolve(null);
      });
    });

    childProcesses.push({
      pid: child.pid,
      agent,
      idx,
      promise: exitPromise,
    });
  }

  console.log("");
  console.log(
    color.blue("[Parallel]") +
      ` Started ${color.yellow(String(childProcesses.length))} agents`,
  );

  if (options.noWait) {
    console.log(`${color.blue("[Parallel]")} Running in background mode`);
    console.log(`${color.blue("[Parallel]")} Results will be in: ${runDir}`);
    console.log(`${color.blue("[Parallel]")} PID list: ${pidListFile}`);
    return;
  }

  console.log(`${color.blue("[Parallel]")} Waiting for completion...`);
  console.log("");

  const cleanup = () => {
    console.log("");
    console.log(`${color.yellow("[Parallel]")} Cleaning up child processes...`);
    for (const { pid, agent } of childProcesses) {
      if (isProcessRunning(pid)) {
        try {
          process.kill(pid);
          console.log(
            `${color.yellow("[Parallel]")} Killed PID ${pid} (${agent})`,
          );
        } catch {
          // empty
        }
      }
    }
    try {
      if (fs.existsSync(pidListFile)) {
        fs.unlinkSync(pidListFile);
      }
    } catch {
      // empty
    }
  };

  const handleParallelSigint = () => {
    unregisterSignalCleanup();
    cleanup();
    process.exit(130);
  };
  const handleParallelSigterm = () => {
    unregisterSignalCleanup();
    cleanup();
    process.exit(143);
  };
  const unregisterSignalCleanup = registerSignalCleanup(
    handleParallelSigint,
    handleParallelSigterm,
  );

  let completed = 0;
  let failed = 0;

  for (const { agent, idx, promise } of childProcesses) {
    const exitCode = await promise;
    if (exitCode === 0) {
      console.log(`${color.green("[DONE]")} ${agent} agent (${idx}) completed`);
      completed++;
    } else {
      console.log(
        color.red("[FAIL]") +
          ` ${agent} agent (${idx}) failed (exit code: ${exitCode})`,
      );
      failed++;
    }
  }

  try {
    if (fs.existsSync(pidListFile)) {
      fs.unlinkSync(pidListFile);
    }
  } catch {
    // empty
  }
  unregisterSignalCleanup();

  console.log("");
  console.log(color.cyan("======================================"));
  console.log(color.cyan("  Execution Summary"));
  console.log(color.cyan("======================================"));
  console.log(`Total:     ${childProcesses.length}`);
  console.log(`Completed: ${color.green(String(completed))}`);
  console.log(`Failed:    ${color.red(String(failed))}`);
  console.log(`Results:   ${runDir}`);
  console.log(color.cyan("======================================"));

  console.log("");
  console.log(color.blue("Result files:"));
  const logFiles = fs.readdirSync(runDir).filter((f) => f.endsWith(".log"));
  for (const f of logFiles) {
    console.log(`  - ${path.join(runDir, f)}`);
  }

  if (failed > 0) {
    process.exit(1);
  }
}

export function resolveSessionId(): string {
  const meta = getSessionMeta(process.cwd());
  if (meta.id && meta.status !== "completed" && meta.status !== "failed") {
    return meta.id;
  }
  return formatSessionId(new Date());
}

const REVIEW_FALLBACK_VENDOR = "codex";
const REVIEW_SUPPORTED_VENDORS = ["codex", "claude", "gemini", "qwen"];

function buildReviewDiffPrompt(
  prompt: string,
  uncommitted: boolean,
  cwd: string,
): string {
  if (uncommitted) {
    return `Review the uncommitted changes (git diff) in this repository. ${prompt}`;
  }
  // For committed-only mode, inline the diff so the CLI only sees committed changes
  try {
    const diff = execSync("git diff HEAD~1", { cwd, encoding: "utf-8" }).trim();
    if (!diff) return `No committed changes found. ${prompt}`;
    return `Review the following committed diff:\n\n\`\`\`diff\n${diff}\n\`\`\`\n\n${prompt}`;
  } catch {
    return `Review the latest committed changes. ${prompt}`;
  }
}

function buildReviewArgs(
  vendor: string,
  vendorConfig: VendorConfig,
  prompt: string,
  uncommitted: boolean,
  cwd: string,
): string[] {
  const command = vendorConfig.command || vendor;

  // Codex has native review subcommand
  if (vendor === "codex") {
    return uncommitted
      ? [command, "review", "--uncommitted"]
      : [command, "review"];
  }

  // Other vendors: use prompt flag with diff context
  const reviewPrompt = buildReviewDiffPrompt(prompt, uncommitted, cwd);
  const promptFlag = vendorConfig.prompt_flag || "-p";
  const args = [command, promptFlag, reviewPrompt];

  if (vendorConfig.model_flag && vendorConfig.default_model) {
    args.push(vendorConfig.model_flag, vendorConfig.default_model);
  }

  if (vendorConfig.auto_approve_flag) {
    args.push(vendorConfig.auto_approve_flag);
  } else {
    const defaultAutoApprove: Record<string, string> = {
      gemini: "--approval-mode=yolo",
      qwen: "--yolo",
    };
    const fallback = defaultAutoApprove[vendor];
    if (fallback) args.push(fallback);
  }

  if (vendor === "claude") {
    args.push("--output-format", "text");
  }

  return args;
}

export async function reviewAgent(options: {
  prompt?: string;
  model?: string;
  workspace?: string;
  uncommitted?: boolean;
}) {
  const sessionId = resolveSessionId();
  const prompt =
    options.prompt ||
    "Review for bugs, security vulnerabilities, performance issues, and code quality. Report findings with severity levels.";
  const agentId = "review";
  const workspace = options.workspace || ".";
  const resolvedWorkspace = path.resolve(workspace);

  // Resolve vendor, falling back to codex if resolved vendor doesn't support review
  const { vendor: resolvedVendor, config } = resolveVendor(
    agentId,
    options.model,
  );
  const vendor = REVIEW_SUPPORTED_VENDORS.includes(resolvedVendor)
    ? resolvedVendor
    : REVIEW_FALLBACK_VENDOR;
  if (vendor !== resolvedVendor) {
    console.log(
      color.yellow(
        `[${agentId}] "${resolvedVendor}" has no review mode, falling back to ${vendor}`,
      ),
    );
  }

  const vendorConfig = config?.vendors?.[vendor] || {};
  const uncommitted = options.uncommitted ?? true;
  const reviewArgs = buildReviewArgs(
    vendor,
    vendorConfig,
    prompt,
    uncommitted,
    resolvedWorkspace,
  );
  const command = reviewArgs[0]!;
  const args = reviewArgs.slice(1);

  const logFile = path.join(tmpdir(), `review-${sessionId}.log`);
  const pidFile = path.join(tmpdir(), `review-${sessionId}.pid`);

  console.log(color.dim(`  Session: ${sessionId}`));
  console.log(color.blue(`[${agentId}] Starting review...`));
  console.log(color.dim(`  Vendor: ${vendor}`));
  console.log(
    color.dim(`  Command: ${command} ${args.slice(0, 2).join(" ")}...`),
  );

  const logStream = fs.openSync(logFile, "w");

  const child = spawnProcess(command, args, {
    cwd: resolvedWorkspace,
    stdio: ["ignore", logStream, logStream],
    detached: false,
  });

  if (!child.pid) {
    console.error(color.red(`[${agentId}] Failed to spawn process`));
    process.exit(1);
  }

  fs.writeFileSync(pidFile, child.pid.toString());
  console.log(color.green(`[${agentId}] Started with PID ${child.pid}`));

  const cleanup = () => {
    try {
      if (fs.existsSync(pidFile)) fs.unlinkSync(pidFile);
      if (fs.existsSync(logFile)) fs.unlinkSync(logFile);
    } catch (_e) {
      // ignore
    }
  };

  const cleanAndExit = () => {
    if (child.pid && isProcessRunning(child.pid)) {
      process.kill(child.pid);
    }
    unregisterSignalCleanup();
    cleanup();
    process.exit();
  };

  const unregisterSignalCleanup = registerSignalCleanup(
    cleanAndExit,
    cleanAndExit,
  );

  (child as unknown as NodeJS.EventEmitter).on(
    "exit",
    (code: number | null) => {
      unregisterSignalCleanup();
      // Print output regardless of exit code for review results
      if (fs.existsSync(logFile)) {
        const log = fs.readFileSync(logFile, "utf-8").trim();
        if (log) {
          console.log("");
          console.log(log);
        }
      }
      console.log(
        code === 0
          ? color.green(`[${agentId}] Done`)
          : color.red(`[${agentId}] Exited with code ${code}`),
      );
      cleanup();
      process.exit(code ?? 0);
    },
  );
}
