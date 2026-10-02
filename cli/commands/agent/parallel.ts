import { spawn as spawnProcess } from "node:child_process";
import { randomUUID } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import color from "picocolors";
import {
  AGENTS_RESULTS_DIR,
  agentsPathFromRoot,
} from "../../constants/paths.js";
import { prepareAgentDispatch } from "../../io/runtime-dispatch/prepared-agent-dispatch.js";
import {
  targetVendorNeedsPty,
  wrapInvocationWithPty,
} from "../../io/runtime-dispatch/pty-wrap.js";
import {
  checkCap,
  formatPromptMessage,
  loadQuotaCap,
  recordUsage,
  type UsageRecord,
} from "../../io/session-cost.js";
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

interface ParallelOptions {
  vendor?: string;
  inline?: boolean;
  noWait?: boolean;
  session?: string;
  /** Internal supervisor handoff; never exposed as a user CLI option. */
  runDir?: string;
}

type PendingUsage = Omit<UsageRecord, "sessionId" | "recordedAt">;

function assertParallelQuota(
  sessionId: string,
  cwd: string,
  pending: PendingUsage[] = [],
): void {
  try {
    const cap = loadQuotaCap(cwd);
    if (cap === null) return;
    const result = checkCap(sessionId, cap, pending, cwd);
    if (!result.exceeded) return;
    console.error(color.red(`[Parallel] ${formatPromptMessage(result)}`));
    throw new Error(
      `[session-cost] Quota cap exceeded for session ${sessionId}: ${result.reason} ` +
        `(current: ${result.current}, limit: ${result.limit})`,
    );
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("[session-cost]")) {
      throw error;
    }
    console.warn(
      `[Parallel] session-cost checkCap error (non-fatal): ${error}`,
    );
  }
}

async function startParallelSupervisor(
  tasks: TaskDefinition[],
  options: ParallelOptions,
  runDir: string,
): Promise<void> {
  const entry = process.argv[1];
  if (!entry)
    throw new Error("Cannot locate the CLI entry for background execution");
  const manifestFile = path.join(runDir, "supervisor.json");
  fs.writeFileSync(
    manifestFile,
    JSON.stringify({ tasks, vendor: options.vendor, session: options.session }),
    { mode: 0o600 },
  );
  const logFd = fs.openSync(path.join(runDir, "supervisor.log"), "w");
  let supervisor: ReturnType<typeof spawnProcess>;
  try {
    supervisor = spawnProcess(
      process.execPath,
      [...process.execArgv, entry, "agent:parallel-supervisor", manifestFile],
      {
        cwd: process.cwd(),
        detached: true,
        stdio: ["ignore", logFd, logFd],
        env: process.env,
      },
    );
  } finally {
    fs.closeSync(logFd);
  }
  await new Promise<void>((resolve, reject) => {
    supervisor.once("error", reject);
    supervisor.once("spawn", () => {
      try {
        fs.writeFileSync(
          path.join(runDir, "supervisor.pid"),
          String(supervisor.pid),
        );
        supervisor.unref();
        resolve();
      } catch (error) {
        supervisor.kill();
        reject(error);
      }
    });
  });
}

/** Own the complete child lifecycle after the calling CLI has exited. */
export async function runParallelSupervisor(
  manifestFile: string,
): Promise<void> {
  const manifest = JSON.parse(fs.readFileSync(manifestFile, "utf8")) as {
    vendor?: string;
    session?: string;
  };
  const runDir = path.dirname(path.resolve(manifestFile));
  try {
    await parallelRun([manifestFile], {
      vendor: manifest.vendor,
      session: manifest.session,
      runDir,
    });
  } finally {
    fs.rmSync(path.join(runDir, "supervisor.pid"), { force: true });
  }
}

export async function parallelRun(
  tasksOrFile: string[],
  options: ParallelOptions = {},
) {
  const cwd = process.cwd();
  const projectRoot = resolveProjectRoot(cwd);
  // Results must land at the project root's .agents/, not under a workspace
  // subdir (a raw cwd here seeded stray cli/.agents/ trees that then hijack
  // resolveProjectRoot for every later command run from that subdir).
  const resultsDir = agentsPathFromRoot(projectRoot, AGENTS_RESULTS_DIR);
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
  const runDir =
    options.runDir ??
    path.join(resultsDir, `parallel-${timestamp}-${randomUUID().slice(0, 8)}`);
  const pidListFile = path.join(runDir, "pids.txt");

  let tasks: TaskDefinition[];
  try {
    if (options.inline) {
      if (tasksOrFile.length === 0) {
        console.error(color.red("Error: No tasks specified"));
        console.log(
          'Usage: oh-my-ag agent parallel --inline "agent:task" "agent:task" ...',
        );
        process.exit(1);
      }
      tasks = parseInlineTasks(tasksOrFile);
    } else {
      if (tasksOrFile.length === 0) {
        console.error(color.red("Error: No tasks file specified"));
        console.log("Usage: oh-my-ag agent parallel <tasks-file.yaml>");
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

  const sessionId = options.session ?? path.basename(runDir);
  assertParallelQuota(sessionId, projectRoot);
  fs.mkdirSync(runDir, { recursive: true });

  if (options.noWait) {
    await startParallelSupervisor(
      tasks,
      { ...options, session: sessionId },
      runDir,
    );
    console.log(`${color.blue("[Parallel]")} Running in background mode`);
    console.log(`${color.blue("[Parallel]")} Results will be in: ${runDir}`);
    console.log(`${color.blue("[Parallel]")} PID list: ${pidListFile}`);
    return;
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
  const pendingUsage: PendingUsage[] = [];
  const activePids = new Set<number>();
  let quotaError: unknown;

  for (let idx = 0; idx < tasks.length; idx++) {
    const taskDef = tasks[idx];
    if (!taskDef) continue;
    try {
      assertParallelQuota(sessionId, projectRoot, pendingUsage);
    } catch (error) {
      quotaError = error;
      break;
    }

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
      sessionId,
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

    let prepared: ReturnType<typeof prepareAgentDispatch>;
    try {
      prepared = prepareAgentDispatch({
        agentId: agent,
        vendor,
        vendorConfig,
        promptFlag,
        promptContent,
        sessionId,
        wrapperId: run.runId,
        workspace: resolvedWorkspace,
      });
    } catch (error) {
      finishAgentRun(runRoot, run.runId, null);
      throw error;
    }
    const { dispatch } = prepared;
    console.log(
      `    Dispatch: ${dispatch.mode} (${dispatch.runtimeVendor} -> ${dispatch.targetVendor})`,
    );
    if (prepared.opencodeWrapper) {
      console.log(
        `    OpenCode: primary wrapper ${prepared.opencodeWrapper.name} → task(${agent})`,
      );
    }

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

    let logStream: number;
    try {
      logStream = fs.openSync(logFile, "w");
    } catch (error) {
      prepared.cleanup();
      finishAgentRun(runRoot, run.runId, null);
      throw error;
    }
    let child: ReturnType<typeof spawnProcess>;
    try {
      child = spawnProcess(command, args, {
        cwd: resolvedWorkspace,
        stdio: ["ignore", logStream, logStream],
        detached: false,
        env,
      });
    } catch (error) {
      fs.closeSync(logStream);
      prepared.cleanup();
      finishAgentRun(runRoot, run.runId, null);
      throw error;
    }

    const usage: PendingUsage = {
      vendor,
      agentId: agent,
      tokens: Math.ceil(promptContent.length / 4),
      estimatedCostNote: `difficulty:${classifyDifficulty(rawPromptContent, 3, 2)}`,
    };
    pendingUsage.push(usage);
    if (child.pid) activePids.add(child.pid);

    const exitPromise = new Promise<number | null>((resolve) => {
      let settled = false;
      const finish = (code: number | null) => {
        if (settled) return;
        settled = true;
        if (child.pid) activePids.delete(child.pid);
        fs.closeSync(logStream);
        prepared.cleanup();
        const pendingIndex = pendingUsage.indexOf(usage);
        if (pendingIndex >= 0) pendingUsage.splice(pendingIndex, 1);
        try {
          recordUsage(sessionId, usage, projectRoot);
        } catch (error) {
          console.warn(
            `[${agent}] session-cost recordUsage error (non-fatal): ${error}`,
          );
        }
        const result = finishAgentRun(runRoot, run.runId, code, undefined, {
          logPath: logFile,
        });
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

  console.log(`${color.blue("[Parallel]")} Waiting for completion...`);
  console.log("");

  const cleanup = (signal: NodeJS.Signals = "SIGTERM") => {
    console.log("");
    console.log(`${color.yellow("[Parallel]")} Cleaning up child processes...`);
    for (const { pid, agent } of childProcesses) {
      if (!pid) continue;
      if (!activePids.has(pid)) continue;
      if (!isProcessRunning(pid)) continue;
      try {
        process.kill(pid, signal);
        console.log(
          `${color.yellow("[Parallel]")} Killed PID ${pid} (${agent})`,
        );
      } catch {
        // empty
      }
    }
  };

  let signalExitCode: number | undefined;
  let killTimer: ReturnType<typeof setTimeout> | undefined;
  const stopParallel = (exitCode: number) => {
    unregisterSignalCleanup();
    cleanup();
    // Both modes wait for child exits so accounting, results, and temporary
    // wrappers are finalized before the CLI or supervisor exits.
    signalExitCode = exitCode;
    process.exitCode = exitCode;
    killTimer = setTimeout(() => cleanup("SIGKILL"), 1000);
    killTimer.unref();
  };
  const handleParallelSigint = () => stopParallel(130);
  const handleParallelSigterm = () => {
    stopParallel(143);
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
  if (killTimer) clearTimeout(killTimer);

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

  if (quotaError) throw quotaError;
  if (signalExitCode !== undefined) {
    if (!options.runDir) process.exit(signalExitCode);
    return;
  }
  if (failed > 0) {
    if (options.runDir) process.exitCode = 1;
    else process.exit(1);
  }
}
