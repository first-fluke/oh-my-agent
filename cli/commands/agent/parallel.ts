import { spawn as spawnProcess } from "node:child_process";
import { randomUUID } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import color from "picocolors";
import {
  AGENTS_RESULTS_DIR,
  agentsPathFromRoot,
} from "../../constants/paths.js";
import {
  targetVendorNeedsPty,
  wrapInvocationWithPty,
} from "../../io/runtime-dispatch/pty-wrap.js";
import { planDispatch } from "../../io/runtime-dispatch.js";
import { detectWorkspace } from "../../io/workspaces.js";
import {
  loadExecutionProtocol,
  resolvePromptContent,
  resolvePromptFlag,
  resolveVendor,
} from "../../platform/agent-config.js";
import {
  classifyDifficulty,
  loadGraphContext,
} from "../../platform/context-loader.js";
import {
  agentResultInstructions,
  beginAgentRun,
  finishAgentRun,
} from "../../state/agent-results.js";
import { resolveProjectRoot } from "../../utils/fs-utils.js";
import { registerSignalCleanup } from "../../utils/process-signals.js";
import { isProcessRunning } from "./common.js";
import {
  parseInlineTasks,
  parseTasksFile,
  type TaskDefinition,
} from "./tasks.js";

export async function parallelRun(
  tasksOrFile: string[],
  options: {
    vendor?: string;
    inline?: boolean;
    noWait?: boolean;
    session?: string;
  } = {},
) {
  const cwd = process.cwd();
  // Results must land at the project root's .agents/, not under a workspace
  // subdir (a raw cwd here seeded stray cli/.agents/ trees that then hijack
  // resolveProjectRoot for every later command run from that subdir).
  const resultsDir = agentsPathFromRoot(
    resolveProjectRoot(cwd),
    AGENTS_RESULTS_DIR,
  );
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
  const runDir = path.join(
    resultsDir,
    `parallel-${timestamp}-${randomUUID().slice(0, 8)}`,
  );
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

  fs.mkdirSync(runDir, { recursive: true });

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
    const executionProtocol = loadExecutionProtocol(vendor, cwd);
    const runRoot = resolveProjectRoot(resolvedWorkspace);
    const run = beginAgentRun({
      root: runRoot,
      workspace: resolvedWorkspace,
      agentId: agent,
      sessionId: options.session ?? path.basename(runDir),
      taskId: taskDef.id ?? `${agent}-${idx}`,
      vendor,
      managed: true,
      dispatch: { prompt: rawPromptContent },
    });
    const taskPrompt = executionProtocol
      ? `${rawPromptContent}\n\n${executionProtocol}`
      : rawPromptContent;
    const taskContext = loadGraphContext(
      agent,
      classifyDifficulty(rawPromptContent, 3, 2),
      runRoot,
    );
    const promptContent = `${taskPrompt}\n\n${agentResultInstructions(runRoot, run)}${taskContext ? `\n\n${taskContext}` : ""}`;

    const dispatch = planDispatch(
      agent,
      vendor,
      vendorConfig,
      promptFlag,
      promptContent,
    );
    console.log(
      `    Dispatch: ${dispatch.mode} (${dispatch.runtimeVendor} -> ${dispatch.targetVendor})`,
    );

    // Workaround for agy's non-TTY stdout drop (antigravity-cli#76): run the
    // subagent under a pseudo-terminal so its headless output is captured.
    let invocation = dispatch.invocation;
    if (targetVendorNeedsPty(dispatch.targetVendor)) {
      const pty = wrapInvocationWithPty(dispatch.invocation);
      invocation = pty.invocation;
      if (pty.wrapped) {
        console.log(`    PTY: ${dispatch.targetVendor} run under script(1)`);
      } else {
        console.warn(
          color.yellow(
            `[${idx}] ${dispatch.targetVendor} headless output may be empty: ${pty.unsupportedReason}`,
          ),
        );
      }
    }
    const { command, args, env } = invocation;

    const logStream = fs.openSync(logFile, "w");
    const child = spawnProcess(command, args, {
      cwd: resolvedWorkspace,
      stdio: ["ignore", logStream, logStream],
      detached: false,
      env,
    });

    const exitPromise = new Promise<number | null>((resolve) => {
      let settled = false;
      const finish = (code: number | null) => {
        if (settled) return;
        settled = true;
        fs.closeSync(logStream);
        const result = finishAgentRun(runRoot, run.runId, code);
        resolve(result.status === "completed" ? 0 : code || 3);
      };
      (child as unknown as NodeJS.EventEmitter).on("exit", finish);
      (child as unknown as NodeJS.EventEmitter).on("error", () => {
        finish(null);
      });
      if (!child.pid) finish(null);
    });

    if (child.pid) fs.appendFileSync(pidListFile, `${child.pid}:${agent}\n`);
    else console.error(color.red(`[${idx}] Failed to spawn ${agent} process`));

    childProcesses.push({
      pid: child.pid ?? 0,
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
      if (!pid) continue;
      if (!isProcessRunning(pid)) continue;
      try {
        process.kill(pid, "SIGTERM");
        console.log(
          `${color.yellow("[Parallel]")} Killed PID ${pid} (${agent})`,
        );
      } catch {
        // empty
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
  const logFiles = fs
    .readdirSync(runDir)
    .filter((file) => file.endsWith(".log"));
  for (const file of logFiles) {
    console.log(`  - ${path.join(runDir, file)}`);
  }

  if (failed > 0) {
    process.exit(1);
  }
}
