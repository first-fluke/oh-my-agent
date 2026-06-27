import { spawn as spawnProcess } from "node:child_process";
import fs from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import color from "picocolors";
import { lookupFinding, recordFinding } from "../../io/findings-cache.js";
import {
  createOpencodeSpawnWrapper,
  type OpencodeWrapper,
  removeOpencodeSpawnWrapper,
  swapOpencodeAgentArg,
} from "../../io/runtime-dispatch/opencode-wrapper.js";
import {
  targetVendorNeedsPty,
  wrapInvocationWithPty,
} from "../../io/runtime-dispatch/pty-wrap.js";
import { planDispatch } from "../../io/runtime-dispatch.js";
import {
  checkCap,
  formatPromptMessage,
  loadQuotaCap,
  recordUsage,
} from "../../io/session-cost.js";
import { detectWorkspace } from "../../io/workspaces.js";
import {
  createWorktree,
  formatWorktreeSummary,
  type WorktreeHandle,
} from "../../io/worktree.js";
import {
  loadAgentPersona,
  loadExecutionProtocol,
  resolvePromptContent,
  resolvePromptFlag,
  resolveVendor,
} from "../../platform/agent-config.js";
import {
  classifyDifficulty,
  type Difficulty,
} from "../../platform/context-loader.js";
import { registerSignalCleanup } from "../../utils/process-signals.js";
import { isProcessRunning } from "./common.js";

// ---------------------------------------------------------------------------
// T12 + T16: Difficulty classification hints
// All fields are optional — callers that don't provide hints get Medium
// difficulty by default (no CHARTER_CHECK strip, no resource stripping).
// ---------------------------------------------------------------------------

export interface TaskHints {
  /** Number of acceptance criteria in the task (used for complexity scoring) */
  acCount?: number;
  /** Number of files in scope (used for complexity scoring) */
  filesInScope?: number;
}

/**
 * Classify difficulty from the prompt and optional task hints.
 * Returns "Medium" when hints are absent (backwards-compatible default).
 *
 * T12 integration: classifyDifficulty drives context bundle selection.
 * T16 integration: "Simple" difficulty strips the CHARTER_CHECK block in
 *   buildMarkdownAgentFile (agent-composer.ts) at install time — the same
 *   difficulty value should be forwarded there via installVendorAgents callers.
 */
export function classifySpawnDifficulty(
  taskDescription: string,
  hints?: TaskHints,
): Difficulty {
  const acCount = hints?.acCount ?? 3; // default: Medium-range
  const filesInScope = hints?.filesInScope ?? 2; // default: Medium-range
  return classifyDifficulty(taskDescription, acCount, filesInScope);
}

// ---------------------------------------------------------------------------
// T11: Findings cache directory pre-creation + handle export
// ---------------------------------------------------------------------------

const MEMORIES_BASE = ".serena/memories";

/**
 * Ensure the session memories directory exists for the given sessionId.
 * Called before spawn so agent processes can write to it immediately.
 * Non-fatal: logs a warning on failure rather than aborting spawn.
 */
export function ensureSessionMemoriesDir(cwd: string = process.cwd()): void {
  const memoriesDir = path.join(cwd, MEMORIES_BASE);
  try {
    if (!fs.existsSync(memoriesDir)) {
      fs.mkdirSync(memoriesDir, { recursive: true });
    }
  } catch (err) {
    console.warn(
      `[spawn] Could not pre-create memories dir ${memoriesDir}: ${String(err)}`,
    );
  }
}

/**
 * Returns a findings cache handle bound to the given sessionId.
 * Downstream agents and orchestrator code can import this to record/lookup
 * findings without needing to manage the sessionId themselves.
 *
 * Usage:
 *   import { getFindingsHandle } from "./spawn-status.js";
 *   const findings = getFindingsHandle(sessionId);
 *   findings.record({ symbol: "ModelSpec", kind: "symbol", result: {...} });
 *   findings.lookup("ModelSpec", "symbol");
 *
 * To use findings-cache directly (e.g. from a different module):
 *   import { recordFinding, lookupFinding } from "../../io/findings-cache.js";
 */
export function getFindingsHandle(sessionId: string) {
  return {
    record: (
      entry: Omit<
        import("../../io/findings-cache.js").FindingRecord,
        "recordedAt"
      >,
    ) =>
      recordFinding(sessionId, {
        ...entry,
        recordedAt: new Date().toISOString(),
      }),
    lookup: (
      symbol: string,
      kind?: import("../../io/findings-cache.js").FindingRecord["kind"],
    ) => lookupFinding(sessionId, symbol, kind),
  };
}

export async function spawnAgent(
  agentId: string,
  prompt: string,
  sessionId: string,
  workspace: string,
  vendorOverride?: string,
  taskHints?: TaskHints,
  isolation?: string,
  readOnly?: boolean,
) {
  let worktreeHandle: WorktreeHandle | null = null;
  if (isolation === "worktree") {
    worktreeHandle = createWorktree(sessionId, agentId);
    console.log(
      color.blue(
        `[${agentId}] Isolated worktree: ${worktreeHandle.path} (branch ${worktreeHandle.branch})`,
      ),
    );
  } else if (isolation && isolation !== "none") {
    throw new Error(
      `Unknown --isolation mode: ${JSON.stringify(isolation)}. Supported: worktree`,
    );
  }

  const effectiveWorkspace = worktreeHandle
    ? worktreeHandle.path
    : workspace === "."
      ? detectWorkspace(agentId)
      : workspace;
  const resolvedWorkspace = path.resolve(effectiveWorkspace);

  if (!fs.existsSync(resolvedWorkspace)) {
    fs.mkdirSync(resolvedWorkspace, { recursive: true });
    console.log(
      color.dim(`[${agentId}] Created workspace: ${resolvedWorkspace}`),
    );
  } else if (!worktreeHandle && effectiveWorkspace !== workspace) {
    console.log(
      color.blue(`[${agentId}] Auto-detected workspace: ${effectiveWorkspace}`),
    );
  }

  const logFile = path.join(tmpdir(), `subagent-${sessionId}-${agentId}.log`);
  const pidFile = path.join(tmpdir(), `subagent-${sessionId}-${agentId}.pid`);
  // Session-specific terminal status. Persisted on child exit (#583) so
  // `agent:status` can distinguish a successful short-lived run that wrote no
  // result memory from an actual crash, even after the PID file is removed.
  const statusFile = path.join(
    tmpdir(),
    `subagent-${sessionId}-${agentId}.status`,
  );

  // T11: Pre-create .serena/memories/ so agent subprocesses can write findings
  // immediately without having to create the directory themselves.
  ensureSessionMemoriesDir(process.cwd());

  const rawPromptContent = resolvePromptContent(prompt);

  // T12: Classify difficulty from the task description + optional hints.
  // The resulting difficulty value can be forwarded to buildMarkdownAgentFile
  // via installVendorAgents callers at install time (same classifySpawnDifficulty
  // export), enabling T16's CHARTER_CHECK strip for Simple tasks.
  const difficulty = classifySpawnDifficulty(rawPromptContent, taskHints);
  console.log(color.dim(`  Difficulty: ${difficulty}`));

  // T15: Check quota cap BEFORE spawning the subprocess.
  // If loadQuotaCap() returns null (no cap configured), skip gating entirely.
  // If exceeded, print the message and throw so orchestrators can catch/halt.
  try {
    const cap = loadQuotaCap(process.cwd());
    if (cap !== null) {
      const capResult = checkCap(sessionId, cap);
      if (capResult.exceeded) {
        const msg = formatPromptMessage(capResult);
        console.error(color.red(`[${agentId}] ${msg}`));
        throw new Error(
          `[session-cost] Quota cap exceeded for session ${sessionId}: ${capResult.reason} ` +
            `(current: ${capResult.current}, limit: ${capResult.limit})`,
        );
      }
    }
  } catch (err) {
    // Re-throw quota exceeded errors — they are intentional blocking signals.
    if (err instanceof Error && err.message.startsWith("[session-cost]")) {
      throw err;
    }
    // Downgrade unexpected session-cost I/O errors to WARN and continue (non-fatal).
    console.warn(
      `[${agentId}] session-cost checkCap error (non-fatal): ${String(err)}`,
    );
  }

  const { vendor, config } = resolveVendor(agentId, vendorOverride);
  const executionProtocol = loadExecutionProtocol(vendor, process.cwd());
  let promptContent = executionProtocol
    ? `${rawPromptContent}\n\n${executionProtocol}`
    : rawPromptContent;

  // pi has no vendor-side agent file to resolve via `@<agentId>` mention, so the
  // agent's persona (system prompt) must be inlined ahead of the task. Other
  // vendors get this from `.{vendor}/agents/<id>.md`.
  if (vendor === "pi") {
    const persona = loadAgentPersona(agentId, process.cwd());
    if (persona) {
      promptContent = `${persona}\n\n---\n\n${promptContent}`;
    }
  }

  const vendorConfig = config?.vendors?.[vendor] || {};
  const logStream = fs.openSync(logFile, "w");

  console.log(color.blue(`[${agentId}] Spawning subagent...`));
  console.log(color.dim(`  Vendor: ${vendor}`));
  console.log(color.dim(`  Workspace: ${resolvedWorkspace}`));
  console.log(color.dim(`  Log: ${logFile}`));

  const promptFlag = resolvePromptFlag(vendor, vendorConfig.prompt_flag);
  if (readOnly) {
    console.log(color.dim("  Mode: read-only (auto-approve suppressed)"));
  }
  const dispatch = planDispatch(
    agentId,
    vendor,
    vendorConfig,
    promptFlag,
    promptContent,
    undefined,
    { readOnly: readOnly ?? false },
  );
  console.log(
    color.dim(
      `  Dispatch: ${dispatch.mode} (${dispatch.runtimeVendor} -> ${dispatch.targetVendor}, ${dispatch.reason})`,
    ),
  );

  // #583: OpenCode refuses to run a `mode: subagent` agent as the entry point
  // (`opencode run --agent <subagent>` falls back to the default agent and
  // still exits 0 — silently running the WRONG agent). For the external
  // fallback, create a throwaway primary wrapper that delegates to the real
  // subagent via the task tool, and repoint `--agent` at the wrapper. The
  // wrapper lives under `process.cwd()` to match the `--dir` opencode is given.
  let opencodeWrapper: OpencodeWrapper | null = null;
  if (dispatch.targetVendor === "opencode" && dispatch.mode === "external") {
    const dispatchArgs = dispatch.invocation.args;
    const modelIdx = dispatchArgs.indexOf("-m");
    const wrapperModel =
      modelIdx !== -1 ? dispatchArgs[modelIdx + 1] : undefined;
    const wrapper = createOpencodeSpawnWrapper(
      agentId,
      sessionId,
      process.cwd(),
      wrapperModel,
    );
    if (swapOpencodeAgentArg(dispatchArgs, agentId, wrapper.name)) {
      opencodeWrapper = wrapper;
      console.log(
        color.dim(
          `  OpenCode: primary wrapper ${wrapper.name} → task(${agentId})`,
        ),
      );
    } else {
      // `--agent` was not present as expected — drop the unused wrapper file.
      removeOpencodeSpawnWrapper(wrapper.filePath);
    }
  }

  // Workaround for agy's non-TTY stdout drop (antigravity-cli#76): run the
  // subagent under a pseudo-terminal so its headless output is captured.
  let invocation = dispatch.invocation;
  if (targetVendorNeedsPty(dispatch.targetVendor)) {
    const pty = wrapInvocationWithPty(dispatch.invocation);
    invocation = pty.invocation;
    if (pty.wrapped) {
      console.log(
        color.dim(
          `  PTY: ${dispatch.targetVendor} run under script(1) (non-TTY stdout workaround)`,
        ),
      );
    } else {
      console.warn(
        color.yellow(
          `[${agentId}] ${dispatch.targetVendor} headless output may be empty: ${pty.unsupportedReason}`,
        ),
      );
    }
  }
  const { command, args, env } = invocation;

  const child = spawnProcess(command, args, {
    cwd: resolvedWorkspace,
    stdio: ["ignore", logStream, logStream],
    detached: false,
    env,
  });

  if (!child.pid) {
    fs.closeSync(logStream);
    if (worktreeHandle) {
      console.log(
        color.yellow(`[${agentId}] Worktree retained: ${worktreeHandle.path}`),
      );
    }
    console.error(color.red(`[${agentId}] Failed to spawn process`));
    process.exit(1);
  }

  fs.writeFileSync(pidFile, child.pid.toString());
  // Drop any stale terminal status left by a previous run that reused this
  // session id + agent id, so a lingering "completed" cannot mask the new run
  // while it is still in flight.
  try {
    if (fs.existsSync(statusFile)) fs.unlinkSync(statusFile);
  } catch {
    // ignore
  }
  console.log(color.green(`[${agentId}] Started with PID ${child.pid}`));

  // Remove the PID file but preserve the log for post-run inspection (#583).
  // Also drop the temporary OpenCode wrapper agent, if one was created.
  const cleanup = () => {
    try {
      if (fs.existsSync(pidFile)) fs.unlinkSync(pidFile);
    } catch {
      // ignore
    }
    if (opencodeWrapper) removeOpencodeSpawnWrapper(opencodeWrapper.filePath);
  };

  const cleanAndExit = () => {
    if (child.pid && isProcessRunning(child.pid)) {
      process.kill(child.pid, "SIGTERM");
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

      // Persist a durable, session-specific terminal status BEFORE cleanup
      // removes the PID file (#583). A clean exit (code 0) is "completed"; any
      // other code is "crashed". `agent:status` reads this when the agent left
      // no result memory, so a successful short-lived run is no longer
      // indistinguishable from a crash.
      try {
        fs.writeFileSync(
          statusFile,
          `${code === 0 ? "completed" : "crashed"}\n`,
        );
      } catch (err) {
        console.warn(
          `[${agentId}] could not persist terminal status (non-fatal): ${String(err)}`,
        );
      }

      if (code !== 0 && fs.existsSync(logFile)) {
        const log = fs.readFileSync(logFile, "utf-8").trim();
        if (log) {
          console.log(color.red(`[${agentId}] Log output:`));
          console.log(log);
        }
      }

      // T15: Record usage after subprocess exits.
      // Token estimate: conservative approximation using prompt character count.
      // (Math.ceil(charCount / 4) ≈ input token count; no subprocess instrumentation.)
      // Errors here are non-fatal — we downgrade to WARN and continue cleanup.
      try {
        recordUsage(sessionId, {
          vendor,
          agentId,
          tokens: Math.ceil(promptContent.length / 4),
          estimatedCostNote: `difficulty:${difficulty}`,
        });
      } catch (err) {
        console.warn(
          `[${agentId}] session-cost recordUsage error (non-fatal): ${String(err)}`,
        );
      }

      if (worktreeHandle) {
        console.log(color.blue(`[${agentId}] Worktree retained for review:`));
        for (const line of formatWorktreeSummary(worktreeHandle).split("\n")) {
          console.log(color.dim(`  ${line}`));
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
    const statusFile = path.join(
      tmpdir(),
      `subagent-${sessionId}-${agent}.status`,
    );

    if (fs.existsSync(resultFile)) {
      const content = fs.readFileSync(resultFile, "utf-8");
      const match = content.match(/^## Status:\s*(\S+)/m);
      results[agent] = match?.[1] ? match[1] : "completed";
    } else if (fs.existsSync(statusFile)) {
      // Session-specific terminal status written by spawnAgent on child exit
      // (#583). Ranks above the PID check: once a terminal status exists the
      // process has exited, even if its PID file was not yet cleaned up.
      const status = fs.readFileSync(statusFile, "utf-8").trim();
      results[agent] = status || "crashed";
    } else if (fs.existsSync(pidFile)) {
      const pidContent = fs.readFileSync(pidFile, "utf-8").trim();
      const pid = Number.parseInt(pidContent, 10);
      results[agent] =
        !Number.isNaN(pid) && isProcessRunning(pid) ? "running" : "crashed";
    } else {
      results[agent] = "crashed";
    }
  }

  for (const [agent, status] of Object.entries(results)) {
    console.log(`${agent}:${status}`);
  }
}
