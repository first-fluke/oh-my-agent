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
import { prepareNativeSession } from "../../io/native-transcript/identity.js";
import { createOrcaSubagent } from "../../io/orca-subagent.js";
import {
  ownedProcessSpawnOptions,
  stopOwnedProcess,
  stopUnidentifiedOwnedChild,
} from "../../io/owned-process.js";
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
  type UsageRecord,
} from "../../io/session-cost.js";
import { finalizeNativeUsage } from "../../io/session-cost-native.js";
import {
  type ExecutionOptions,
  ExecutionStoppedError,
  type SessionExecution,
  sessionExecutionStopStatus,
} from "../../io/session-execution.js";
import {
  forgetSubagentProcess,
  recordSubagentProcess,
  type SubagentProcessRecord,
} from "../../io/subagent-process.js";
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
import { emitEventWithMemory, type OmaEvent } from "../../state/events.js";
import {
  probeFreeProvider,
  resolveFreeProvider,
} from "../../utils/free-provider.js";
import { resolveProjectRoot } from "../../utils/fs-utils.js";
import { beginSessionExecution, isProcessRunning } from "./common.js";
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
  pendingMemoryDeliveries: Promise<unknown>[] = [],
  executionOptions: ExecutionOptions = {},
  inheritedExecution?: SessionExecution,
) {
  const accountingRoot = resolveProjectRoot(process.cwd());
  const execution =
    inheritedExecution ??
    beginSessionExecution(sessionId, accountingRoot, executionOptions);
  let launchedChild: ReturnType<typeof spawnProcess> | undefined;
  let launchedRecord: SubagentProcessRecord | undefined;
  let emergencyCleanup: ((confirmedStopped: boolean) => void) | undefined;
  try {
    execution.assertActive();
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
        color.blue(
          `[${agentId}] Auto-detected workspace: ${effectiveWorkspace}`,
        ),
      );
    }

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
      const cap = loadQuotaCap(accountingRoot);
      if (cap !== null) {
        const capResult = checkCap(sessionId, cap, [], accountingRoot);
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
      await execution.wait(
        probeFreeProvider(
          resolveFreeProvider(effectiveConfig),
          process.env,
          execution.signal,
        ),
      );
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
    // Separate launch evidence even when the same role runs concurrently in one
    // session. Shared logs could otherwise bind both runs to one native child.
    const logName = `subagent-${sessionId}-${agentId}-${run.runId}`;
    const logFile = path.join(tmpdir(), `${logName}.log`);
    const stderrFile = path.join(tmpdir(), `${logName}.stderr.log`);
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
      logStream = fs.openSync(logFile, "w", 0o600);
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
      stderrStream = hasFailover
        ? fs.openSync(stderrFile, "w", 0o600)
        : logStream;
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
    let nativeSession: ReturnType<typeof prepareNativeSession>;
    try {
      nativeSession = prepareNativeSession(
        dispatch.targetVendor,
        invocation.args,
      );
      invocation = { ...invocation, args: nativeSession.args };
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
      execution.assertActive();
      child = spawnProcess(command, args, {
        cwd: resolvedWorkspace,
        stdio: ["ignore", logStream, stderrStream],
        ...ownedProcessSpawnOptions(),
        env: execution.childEnv(orcaSubagent?.childEnv ?? env),
      });
    } catch (error) {
      fs.closeSync(logStream);
      if (stderrStream !== logStream) fs.closeSync(stderrStream);
      prepared.cleanup();
      finishAgentRun(runRoot, run.runId, null);
      throw error;
    }

    launchedChild = child;
    emergencyCleanup = (confirmedStopped) => {
      fs.closeSync(logStream);
      if (stderrStream !== logStream) fs.closeSync(stderrStream);
      if (confirmedStopped) prepared.cleanup();
      finishAgentRun(runRoot, run.runId, 1);
    };
    if (!child.pid) {
      finishAgentRun(runRoot, run.runId, null);
      prepared.cleanup();
      fs.closeSync(logStream);
      if (stderrStream !== logStream) fs.closeSync(stderrStream);
      if (worktreeHandle) {
        console.log(
          color.yellow(
            `[${agentId}] Worktree retained: ${worktreeHandle.path}`,
          ),
        );
      }
      console.error(color.red(`[${agentId}] Failed to spawn process`));
      await Promise.allSettled(pendingMemoryDeliveries);
      process.exit(1);
    }

    fs.writeFileSync(pidFile, child.pid.toString());
    const ownedPidFile = path.join(tmpdir(), `${logName}.pid`);
    fs.writeFileSync(ownedPidFile, child.pid.toString());
    const owned = recordSubagentProcess(ownedPidFile, child.pid, runRoot, {
      runId: run.runId,
      sessionId,
      isolatedProcessGroup: process.platform !== "win32",
      generatedPaths: [
        logFile,
        stderrFile,
        statusFile,
        ...(worktreeHandle ? [worktreeHandle.path] : []),
      ],
    });
    launchedRecord = owned;
    execution.recordResources([
      { kind: "process", id: `${child.pid}` },
      ...[
        ownedPidFile,
        logFile,
        stderrFile,
        statusFile,
        ...(worktreeHandle ? [worktreeHandle.path] : []),
      ].map((id) => ({ kind: "path", id })),
    ]);
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

    const reservation: Omit<UsageRecord, "sessionId" | "recordedAt"> = {
      vendor,
      agentId,
      runId: run.runId,
      tokens: Math.ceil(promptContent.length / 4),
      estimatedInputTokens: Math.ceil(promptContent.length / 4),
      usageSource: "prompt-estimate",
      state: "reserved",
      estimatedCostNote: `difficulty:${difficulty}`,
    };
    try {
      recordUsage(sessionId, reservation, accountingRoot);
    } catch (error) {
      console.warn(
        `[${agentId}] session-cost reservation error (non-fatal): ${String(error)}`,
      );
    }
    let usageFinalized = false;
    const recordFinalUsage = (
      interrupted = false,
      exitCode?: number | null,
    ) => {
      if (usageFinalized) return;
      usageFinalized = true;
      try {
        recordUsage(
          sessionId,
          finalizeNativeUsage(reservation, {
            stdout: fs.existsSync(logFile)
              ? fs.readFileSync(logFile, "utf8")
              : "",
            workspace: resolvedWorkspace,
            startedAt: attemptStartedAtMs,
            expectedSessionId: nativeSession.expectedSessionId,
            env,
            interrupted,
            exitCode,
          }),
          accountingRoot,
        );
      } catch (error) {
        console.warn(
          `[${agentId}] session-cost recordUsage error (non-fatal): ${String(error)}`,
        );
      }
    };

    const exitAfterOrca = (code: number) => {
      void (async () => {
        try {
          if (!terminating) {
            await execution.wait(Promise.allSettled(pendingMemoryDeliveries));
            if (orcaSubagent) await execution.wait(orcaSubagent.stop());
            execution.assertActive();
          } else void orcaSubagent?.stop();
        } catch (error) {
          if (error instanceof ExecutionStoppedError) {
            code = error.exitCode;
            fs.writeFileSync(statusFile, `${error.reason}\n`);
          } else code = 1;
        } finally {
          execution.dispose();
          process.exit(code);
        }
      })();
    };

    const emitLifecycleMemory = (
      event: Omit<Partial<OmaEvent>, "sid"> & { kind: string },
    ) => {
      // Queue durably before awaiting memory. A successor may start immediately;
      // its final exit also waits for this attempt's provider delivery.
      pendingMemoryDeliveries.push(
        emitEventWithMemory(runRoot, sessionId, event).catch((error) => {
          console.warn(
            `[${agentId}] Memory event delivery failed (non-fatal): ${String(error)}`,
          );
        }),
      );
    };

    // Remove the PID file but preserve the log for post-run inspection (#583).
    // Also drop the temporary OpenCode wrapper agent, if one was created.
    let cleaned = false;
    let terminating = false;
    const cleanup = (confirmedStopped = true) => {
      if (cleaned) return;
      cleaned = true;
      void orcaSubagent?.stop();
      fs.closeSync(logStream);
      if (stderrStream !== logStream) fs.closeSync(stderrStream);
      try {
        if (confirmedStopped) {
          if (
            fs.existsSync(pidFile) &&
            fs.readFileSync(pidFile, "utf8").trim() === String(child.pid)
          )
            fs.unlinkSync(pidFile);
          if (fs.existsSync(ownedPidFile)) fs.unlinkSync(ownedPidFile);
          forgetSubagentProcess(ownedPidFile);
        }
      } catch {
        // ignore
      }
      if (confirmedStopped) prepared.cleanup();
      // The deadline remains active while final evidence and memory drain.
    };

    const cleanAndExit = async (error: ExecutionStoppedError) => {
      if (terminating) return;
      terminating = true;
      const stopped = owned
        ? await stopOwnedProcess(owned)
        : await stopUnidentifiedOwnedChild(child);
      if (!stopped?.stopped)
        console.error(
          `[${agentId}] Process termination unconfirmed; retained ${ownedPidFile}. ${stopped?.limitations.join(" ") ?? "Owned process identity unavailable."}`,
        );
      unregisterStop();
      recordFinalUsage(true);
      finishAgentRun(runRoot, run.runId, error.exitCode, undefined, {
        stopReason: error.reason,
        logPath: logFile,
      });
      fs.writeFileSync(statusFile, `${error.reason}\n`);
      cleanup(stopped?.stopped ?? false);
      exitAfterOrca(error.exitCode);
    };

    const unregisterStop = execution.onStop((error) => {
      void cleanAndExit(error);
    });

    (child as unknown as NodeJS.EventEmitter).on(
      "exit",
      async (code: number | null, signal?: NodeJS.Signals) => {
        // Signal cleanup can wait briefly for Orca; do not finalize twice if the
        // child exits while that Stop request is draining.
        if (terminating) return;
        // A signal may arrive just before this exit callback. Admission and
        // verification must observe the same absolute deadline.
        try {
          execution.assertActive();
        } catch (error) {
          if (error instanceof ExecutionStoppedError) {
            await cleanAndExit(error);
            return;
          }
          throw error;
        }
        const stopped = owned
          ? await stopOwnedProcess(owned)
          : await stopUnidentifiedOwnedChild(child);
        if (terminating) return;
        if (!stopped?.stopped)
          console.error(
            `[${agentId}] Process termination unconfirmed; retained ${ownedPidFile}.`,
          );
        unregisterStop();
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
            ? classifyFailoverTerminal(
                code,
                fs.readFileSync(stderrFile, "utf8"),
              )
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
          stopped?.stopped &&
          terminalReason &&
          safeHandoff &&
          nextVendor &&
          result.status !== "completed";

        // A safe successor owns the continuation. Do not leave the session
        // blocked for that expected handoff; a transition is recorded below as a
        // decision. All other incomplete results keep the existing blocker.
        if (result.status !== "completed" && !willFailover) {
          emitLifecycleMemory({
            kind: "blocker.raised",
            vendor,
            payload: {
              code: "spawn.incomplete-result",
              summary: `${agentId} run ${run.runId} ended with ${result.status}: ${result.unresolved.join("; ") || "a verified completion result is missing"}`,
              agentId,
              runId: run.runId,
              status: result.status,
              unresolved: result.unresolved,
            },
          });
        }

        recordFinalUsage(false, code);

        if (worktreeHandle) {
          console.log(color.blue(`[${agentId}] Worktree retained for review:`));
          for (const line of formatWorktreeSummary(worktreeHandle).split(
            "\n",
          )) {
            console.log(color.dim(`  ${line}`));
          }
        }

        if (willFailover && nextVendor && safeHandoff && terminalReason) {
          emitLifecycleMemory({
            kind: "decision.made",
            vendor,
            payload: {
              code: "failover.transition",
              subject: `agent.failover.${agentId}`,
              decision: `Continue ${agentId} from ${vendor} with ${nextVendor}`,
              rationale: `${vendor} ended with ${terminalReason}; fresh safe handoff checkpoint: ${safeHandoff.path}`,
              instanceId: run.runId,
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
          execution.assertActive();
          cleanup(stopped?.stopped ?? false);
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
            pendingMemoryDeliveries,
            executionOptions,
            execution,
          ).catch((error) => {
            console.error(
              color.red(
                `[${agentId}] Failover could not start: ${String(error)}`,
              ),
            );
            exitAfterOrca(3);
          });
          return;
        }

        if (terminalReason && nextVendor && result.status !== "completed") {
          emitLifecycleMemory({
            kind: "blocker.raised",
            vendor,
            payload: {
              code: "failover.needs-review",
              summary: `${agentId} cannot continue from ${vendor} with ${nextVendor} after ${terminalReason}: ${safeHandoff ? "handoff result was not eligible" : "missing fresh safe handoff checkpoint"}`,
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

        cleanup(stopped?.stopped ?? false);
        // A clean process exit is insufficient when the task result is incomplete.
        exitAfterOrca(
          result.status === "completed"
            ? 0
            : code ||
                (signal === "SIGINT" ? 130 : signal === "SIGTERM" ? 143 : 3),
        );
      },
    );
  } catch (error) {
    if (launchedChild) {
      const result = launchedRecord
        ? await stopOwnedProcess(launchedRecord)
        : await stopUnidentifiedOwnedChild(launchedChild);
      emergencyCleanup?.(result.stopped);
    }
    execution.dispose();
    if (error instanceof ExecutionStoppedError)
      process.exitCode = error.exitCode;
    throw error;
  }
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
  let executionStop: string | undefined;
  try {
    executionStop = sessionExecutionStopStatus(
      resolveProjectRoot(rootPath),
      sessionId,
    );
  } catch {
    /* Preserve other status evidence if the ledger is unreadable. */
  }
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
    if (latest && executionStop && latest.status !== "completed") {
      results[agent] = executionStop;
      continue;
    }
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
