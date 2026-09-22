import { spawn as spawnProcess } from "node:child_process";
import fs from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import color from "picocolors";
import { lookupFinding, recordFinding } from "../../io/findings-cache.js";
import {
  getCoordinationStorePath,
  resolveCoordinationFile,
} from "../../io/memory.js";
import { createOrcaSubagent } from "../../io/orca-subagent.js";
import { loadUserConfig } from "../../io/runtime-dispatch/config-loader.js";
import { detectRuntimeVendor } from "../../io/runtime-dispatch/detect.js";
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
  loadGraphContext,
} from "../../platform/context-loader.js";
import {
  agentResultInstructions,
  beginAgentRun,
  finishAgentRun,
  listAgentRuns,
  readOnlyClaim,
  resultEvidenceValid,
} from "../../state/agent-results.js";
import { emitEvent } from "../../state/events.js";
import {
  probeFreeProvider,
  resolveFreeProvider,
} from "../../utils/free-provider.js";
import { resolveProjectRoot } from "../../utils/fs-utils.js";
import { registerSignalCleanup } from "../../utils/process-signals.js";
import { isProcessRunning } from "./common.js";
import {
  buildFailoverPrompt,
  classifyFailoverTerminal,
  failoverCheckpointInstructions,
  findSafeFailoverHandoff,
  resolveFailoverCandidates,
} from "./failover.js";

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

/**
 * Ensure the session coordination directory exists before dispatch.
 * Called before spawn so agent processes can write to it immediately.
 * Non-fatal: logs a warning on failure rather than aborting spawn.
 */
export function ensureSessionCoordinationDir(
  cwd: string = process.cwd(),
): void {
  const coordinationDir = getCoordinationStorePath(cwd);
  try {
    if (!fs.existsSync(coordinationDir)) {
      fs.mkdirSync(coordinationDir, { recursive: true });
    }
  } catch (err) {
    console.warn(
      `[spawn] Could not pre-create coordination dir ${coordinationDir}: ${String(err)}`,
    );
  }
}

/** @deprecated Use ensureSessionCoordinationDir. */
export const ensureSessionMemoriesDir = ensureSessionCoordinationDir;

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

/**
 * True when a `result-*` memory artifact naming this session and modified at
 * or after `sinceMs` exists under the workspace (coordination store or legacy
 * `.agents/results`). Used to detect agy runs that exited 0 but wrote their
 * artifacts outside the workspace (tech-debt #7).
 */
export function hasSessionResultArtifact(
  workspace: string,
  sessionId: string,
  sinceMs: number,
): boolean {
  const dirs = [
    getCoordinationStorePath(workspace),
    path.join(workspace, ".agents", "results"),
  ];
  for (const dir of dirs) {
    let entries: string[];
    try {
      entries = fs.readdirSync(dir);
    } catch {
      continue;
    }
    if (!Array.isArray(entries)) continue;
    for (const entry of entries) {
      if (!entry.startsWith("result-") || !entry.includes(sessionId)) continue;
      try {
        if (fs.statSync(path.join(dir, entry)).mtimeMs >= sinceMs) return true;
      } catch {
        // unreadable entry — ignore
      }
    }
  }
  return false;
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
  taskId?: string,
  resumedFrom?: string,
  fallbackVendors?: string | string[],
  failoverAttempt = 0,
  originalTaskPrompt?: string,
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

  const attemptSuffix =
    failoverAttempt === 0 ? "" : `-failover-${failoverAttempt}`;
  const logFile = path.join(
    tmpdir(),
    `subagent-${sessionId}-${agentId}${attemptSuffix}.log`,
  );
  const stderrFile = path.join(
    tmpdir(),
    `subagent-${sessionId}-${agentId}${attemptSuffix}.stderr.log`,
  );
  const pidFile = path.join(tmpdir(), `subagent-${sessionId}-${agentId}.pid`);
  // Session-specific terminal status. Persisted on child exit (#583) so
  // `agent:status` can distinguish a successful short-lived run that wrote no
  // result memory from an actual crash, even after the PID file is removed.
  const statusFile = path.join(
    tmpdir(),
    `subagent-${sessionId}-${agentId}.status`,
  );

  // T11: Pre-create the coordination store so agent subprocesses can write
  // findings immediately without having to create the directory themselves.
  ensureSessionCoordinationDir(process.cwd());

  const rawPromptContent = resolvePromptContent(prompt);
  const initialTaskPrompt = originalTaskPrompt ?? rawPromptContent;

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
  const effectiveConfig = loadUserConfig(process.cwd());
  if (effectiveConfig.model_preset === "free") {
    await probeFreeProvider(resolveFreeProvider(effectiveConfig));
  }
  const fallbackCandidates = resolveFailoverCandidates(
    fallbackVendors,
    vendor,
    config,
    detectRuntimeVendor(),
  );
  const hasFailover = fallbackCandidates.vendors.length > 0;
  for (const rejected of fallbackCandidates.rejected) {
    console.warn(color.yellow(`[${agentId}] Failover ignored: ${rejected}`));
  }
  const runRoot = resolveProjectRoot(resolvedWorkspace);
  const attemptStartedAtMs = Date.now();
  const run = beginAgentRun({
    root: runRoot,
    workspace: resolvedWorkspace,
    agentId,
    sessionId,
    taskId: taskId ?? agentId,
    vendor,
    managed: true,
    dispatch: { prompt: rawPromptContent, readOnly },
    resumedFrom,
  });
  const executionProtocol = loadExecutionProtocol(vendor, process.cwd());
  let promptContent = executionProtocol
    ? `${rawPromptContent}\n\n${executionProtocol}`
    : rawPromptContent;

  const resultInstructions = agentResultInstructions(runRoot, run, readOnly);
  if (resultInstructions) promptContent += `\n\n${resultInstructions}`;
  if (hasFailover && !readOnly) {
    promptContent += `\n\n${failoverCheckpointInstructions({
      root: runRoot,
      runId: run.runId,
      sessionId,
      agentId,
      vendor,
    })}`;
  }
  const taskContext = loadGraphContext(agentId, difficulty, runRoot);
  if (taskContext) promptContent += `\n\n${taskContext}`;

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

  console.log(color.blue(`[${agentId}] Spawning subagent...`));
  console.log(color.dim(`  Vendor: ${vendor}`));
  console.log(color.dim(`  Workspace: ${resolvedWorkspace}`));
  console.log(color.dim(`  Log: ${logFile}`));
  if (hasFailover) console.log(color.dim(`  Failover errors: ${stderrFile}`));

  const promptFlag = resolvePromptFlag(vendor, vendorConfig.prompt_flag);
  if (readOnly) {
    console.log(color.dim("  Mode: read-only (auto-approve suppressed)"));
  }
  let prepared: ReturnType<typeof prepareAgentDispatch>;
  try {
    prepared = prepareAgentDispatch({
      agentId,
      vendor,
      vendorConfig,
      promptFlag,
      promptContent,
      sessionId,
      workspace: resolvedWorkspace,
      readOnly,
    });
  } catch (error) {
    finishAgentRun(runRoot, run.runId, null);
    throw error;
  }
  const { dispatch } = prepared;
  let logStream: number;
  try {
    logStream = fs.openSync(logFile, "w");
  } catch (error) {
    prepared.cleanup();
    finishAgentRun(runRoot, run.runId, null);
    throw error;
  }
  // Keep the historical combined log unless failover is explicitly requested.
  // For failover, stderr is the only terminal-error input so task stdout cannot
  // forge a quota/rate-limit signal.
  let stderrStream: number;
  try {
    stderrStream = hasFailover ? fs.openSync(stderrFile, "w") : logStream;
  } catch (error) {
    fs.closeSync(logStream);
    prepared.cleanup();
    finishAgentRun(runRoot, run.runId, null);
    throw error;
  }

  console.log(
    color.dim(
      `  Dispatch: ${dispatch.mode} (${dispatch.runtimeVendor} -> ${dispatch.targetVendor}, ${dispatch.reason})`,
    ),
  );

  if (prepared.opencodeWrapper) {
    console.log(
      color.dim(
        `  OpenCode: primary wrapper ${prepared.opencodeWrapper.name} → task(${agentId})`,
      ),
    );
  }

  // Workaround for agy's non-TTY stdout drop (antigravity-cli#76): run the
  // subagent under a pseudo-terminal so its headless output is captured.
  let invocation = dispatch.invocation;
  try {
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
  } catch (error) {
    fs.closeSync(logStream);
    if (stderrStream !== logStream) fs.closeSync(stderrStream);
    prepared.cleanup();
    finishAgentRun(runRoot, run.runId, null);
    throw error;
  }
  const { command, args, env } = invocation;
  const orcaSubagent = createOrcaSubagent(
    dispatch.runtimeVendor,
    agentId,
    dispatch.targetVendor,
    env,
  );

  let child: ReturnType<typeof spawnProcess>;
  try {
    child = spawnProcess(command, args, {
      cwd: resolvedWorkspace,
      stdio: ["ignore", logStream, stderrStream],
      detached: false,
      env: orcaSubagent?.childEnv ?? env,
    });
  } catch (error) {
    fs.closeSync(logStream);
    if (stderrStream !== logStream) fs.closeSync(stderrStream);
    prepared.cleanup();
    finishAgentRun(runRoot, run.runId, null);
    throw error;
  }

  if (!child.pid) {
    finishAgentRun(runRoot, run.runId, null);
    prepared.cleanup();
    fs.closeSync(logStream);
    if (stderrStream !== logStream) fs.closeSync(stderrStream);
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
  orcaSubagent?.start();

  const exitAfterOrca = (code: number) => {
    if (orcaSubagent) {
      void orcaSubagent.stop().then(() => process.exit(code));
    } else {
      process.exit(code);
    }
  };

  // Remove the PID file but preserve the log for post-run inspection (#583).
  // Also drop the temporary OpenCode wrapper agent, if one was created.
  let cleaned = false;
  let terminating = false;
  const cleanup = () => {
    if (cleaned) return;
    cleaned = true;
    void orcaSubagent?.stop();
    fs.closeSync(logStream);
    if (stderrStream !== logStream) fs.closeSync(stderrStream);
    try {
      if (fs.existsSync(pidFile)) fs.unlinkSync(pidFile);
    } catch {
      // ignore
    }
    prepared.cleanup();
  };

  const cleanAndExit = () => {
    if (terminating) return;
    terminating = true;
    if (child.pid && isProcessRunning(child.pid)) {
      process.kill(child.pid, "SIGTERM");
    }
    unregisterSignalCleanup();
    finishAgentRun(runRoot, run.runId, null);
    cleanup();
    exitAfterOrca(130);
  };

  const unregisterSignalCleanup = registerSignalCleanup(
    cleanAndExit,
    cleanAndExit,
  );

  (child as unknown as NodeJS.EventEmitter).on(
    "exit",
    (code: number | null) => {
      // Signal cleanup can wait briefly for Orca; do not finalize twice if the
      // child exits while that Stop request is draining.
      if (terminating) return;
      unregisterSignalCleanup();
      console.log(color.blue(`[${agentId}] Exited with code ${code}`));

      const claim =
        readOnly && fs.existsSync(logFile)
          ? readOnlyClaim(fs.readFileSync(logFile, "utf8"))
          : undefined;
      const result = finishAgentRun(runRoot, run.runId, code, claim, {
        logPath: logFile,
      });
      fs.writeFileSync(statusFile, `${result.status}\n`);

      if (code !== 0 && fs.existsSync(logFile)) {
        const log = fs.readFileSync(logFile, "utf-8").trim();
        if (log) {
          console.log(color.red(`[${agentId}] Log output:`));
          console.log(log);
        }
      }

      const terminalReason =
        hasFailover && fs.existsSync(stderrFile)
          ? classifyFailoverTerminal(code, fs.readFileSync(stderrFile, "utf8"))
          : null;
      const safeHandoff = terminalReason
        ? findSafeFailoverHandoff({
            root: runRoot,
            runId: run.runId,
            sessionId,
            agentId,
            vendor,
            startedAtMs: attemptStartedAtMs,
          })
        : null;
      const nextVendor = fallbackCandidates.vendors[0];
      const willFailover =
        terminalReason &&
        safeHandoff &&
        nextVendor &&
        result.status !== "completed";

      // A safe successor owns the continuation. Do not leave the session
      // blocked for that expected handoff; a transition is recorded below as a
      // decision. All other incomplete results keep the existing blocker.
      if (result.status !== "completed" && !willFailover) {
        emitEvent(runRoot, sessionId, {
          kind: "blocker.raised",
          vendor,
          payload: {
            code: "spawn.incomplete-result",
            agentId,
            runId: run.runId,
            status: result.status,
            unresolved: result.unresolved,
          },
        });
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

      if (willFailover && nextVendor && safeHandoff && terminalReason) {
        emitEvent(runRoot, sessionId, {
          kind: "decision.made",
          vendor,
          payload: {
            code: "failover.transition",
            agentId,
            runId: run.runId,
            fromVendor: vendor,
            toVendor: nextVendor,
            reason: terminalReason,
            handoffPath: safeHandoff.path,
          },
        });
        console.log(
          color.yellow(
            `[${agentId}] Failover: ${vendor} -> ${nextVendor} (${terminalReason})`,
          ),
        );
        cleanup();
        void spawnAgent(
          agentId,
          buildFailoverPrompt({
            originalPrompt: initialTaskPrompt,
            handoff: safeHandoff,
            reason: terminalReason,
          }),
          sessionId,
          resolvedWorkspace,
          nextVendor,
          taskHints,
          undefined,
          readOnly,
          taskId,
          run.runId,
          fallbackCandidates.vendors.slice(1),
          failoverAttempt + 1,
          initialTaskPrompt,
        ).catch((error) => {
          console.error(
            color.red(
              `[${agentId}] Failover could not start: ${String(error)}`,
            ),
          );
          process.exit(3);
        });
        return;
      }

      if (terminalReason && nextVendor && result.status !== "completed") {
        emitEvent(runRoot, sessionId, {
          kind: "blocker.raised",
          vendor,
          payload: {
            code: "failover.needs-review",
            agentId,
            runId: run.runId,
            fromVendor: vendor,
            toVendor: nextVendor,
            reason: terminalReason,
            detail: safeHandoff
              ? "handoff result was not eligible"
              : "missing fresh safe handoff checkpoint",
          },
        });
        console.warn(
          color.yellow(
            `[${agentId}] Eligible for failover but not automatically resumable: missing a fresh safe handoff checkpoint.`,
          ),
        );
      }

      cleanup();
      // A clean process exit is insufficient when the task result is incomplete.
      exitAfterOrca(result.status === "completed" ? 0 : code || 3);
    },
  );
}

export async function checkStatus(
  sessionId: string,
  agentIds: string[],
  rootPath: string = process.cwd(),
) {
  const results: Record<string, string> = {};

  const runs = listAgentRuns(resolveProjectRoot(rootPath)).filter(
    (run) => run.sessionId === sessionId,
  );
  for (const agent of agentIds) {
    const resultFile =
      resolveCoordinationFile(rootPath, `result-${agent}.md`) ??
      path.join(getCoordinationStorePath(rootPath), `result-${agent}.md`);
    const pidFile = path.join(tmpdir(), `subagent-${sessionId}-${agent}.pid`);
    const statusFile = path.join(
      tmpdir(),
      `subagent-${sessionId}-${agent}.status`,
    );

    const latest = runs.filter((run) => run.agentId === agent).at(-1);
    if (latest) {
      results[agent] =
        latest.status === "running" &&
        latest.runnerPid &&
        !isProcessRunning(latest.runnerPid)
          ? "failed"
          : latest.status === "completed" && !resultEvidenceValid(latest, false)
            ? "stale"
            : latest.status;
    } else if (fs.existsSync(resultFile)) {
      const content = fs.readFileSync(resultFile, "utf-8");
      const match = content.match(/^## Status:\s*(\S+)/m);
      results[agent] = match?.[1] ? `legacy-${match[1]}` : "unverified";
    } else if (fs.existsSync(statusFile)) {
      // Session-specific terminal status written by spawnAgent on child exit
      // (#583). Ranks above the PID check: once a terminal status exists the
      // process has exited, even if its PID file was not yet cleaned up.
      const status = fs.readFileSync(statusFile, "utf-8").trim();
      results[agent] =
        status === "completed" ? "legacy-completed" : status || "crashed";
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
