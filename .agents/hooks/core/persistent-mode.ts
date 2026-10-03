#!/usr/bin/env bun
/**
 * oh-my-agent — Stop Hook (Persistent Mode)
 *
 * Works with: Claude Code (Stop), Codex CLI (Stop)
 *
 * Prevents the agent from stopping while a long-running workflow
 * (ultrawork, orchestrate, work) is active.
 *
 * stdin : JSON  — { sessionId|session_id, hook_event_name?, ... }
 * stdout: JSON  — { decision: "block", reason } | {}
 * exit 0 = allow stop
 * exit 2 = block stop
 */

import { type ChildProcess, spawn, spawnSync } from "node:child_process";
import {
  existsSync,
  readdirSync,
  readFileSync,
  statSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
import { join } from "node:path";
import { agyConversationId } from "./agy-input.ts";
import { UNKNOWN_SESSION_ID } from "./constants.ts";
import { makeBlockOutput } from "./hook-output.ts";
import { isDeactivationRequest } from "./keyword-detector.ts";
// triggers.json is imported statically: bundler inlines it into the oma binary;
// standalone bun runs resolve the sibling file (pi / direct run).
import embeddedTriggers from "./triggers.json" with { type: "json" };
import type {
  HandlerCtx,
  HandlerResult,
  HookInput,
  ModeState,
  Vendor,
} from "./types.ts";
import { detectVendorFromInput, getProjectDir } from "./vendor-detect.ts";

const MAX_REINFORCEMENTS = 5;
const STALE_HOURS = 2;

/**
 * Persistent state older than this belongs to a session that is gone. A live
 * session's own Stop releases its workflow after STALE_HOURS, so a file this
 * old is an orphan (crashed or closed session, pre-fix `-unknown` files).
 */
const ORPHAN_STATE_HOURS = 24;

// ── Goal contract: deterministic stop gate + wall-clock budget ─
// (design-prime-agent-adoption Track B — no-exec-of-agent-writable-strings)

/**
 * The only gate values the Stop hook will ever execute. Each maps to a
 * package.json script of the same name, run as an argv array WITHOUT a shell.
 * The gate value lives in an agent-writable state file; executing anything
 * outside this allowlist would be an arbitrary-command path that bypasses the
 * PreToolUse permission layer. Never widen this to free-form strings.
 */
const GATE_KEYWORDS = new Set(["typecheck", "test", "lint"]);

/**
 * Hard cap on a gate run. The Stop budget chain, smallest to largest, keeps a
 * gate inside the hook so THIS code stops it — never the vendor, which would
 * kill the hook silently and fail open with nothing recorded:
 *
 *   GATE_TIMEOUT_MS (25s)
 *     < persistent-mode Stop handler timeout in every
 *       `.agents/hooks/variants/*.json` (30s — `oma hook run` races it, and
 *       the pi/opencode bridges spawn this script with the same budget)
 *     < vendor Stop timeout = chain sum + 5s margin
 *       (`chainTimeoutSeconds` in cli/platform/hooks-composer.ts → 40s).
 *
 * `cli/__tests__/hook-timeout-budget.test.ts` locks the chain.
 */
export const GATE_TIMEOUT_MS = 25_000;

/** Below this much remaining budget a gate is deferred instead of started. */
const MIN_GATE_RUN_MS = 1_000;

/** After the gate exits, wait this long for its pipes to drain. */
const EXIT_FLUSH_GRACE_MS = 500;

/** Tail of gate output carried back into the block reason. */
const GATE_OUTPUT_TAIL_CHARS = 2_000;

/** Rolling output buffer; trimmed to its latter half when exceeded. */
const GATE_OUTPUT_BUFFER_CHARS = 64_000;

/** Signals that, aimed at this hook process, must take the gate run down too. */
const FORWARDED_SIGNALS: NodeJS.Signals[] = ["SIGTERM", "SIGINT", "SIGHUP"];

/**
 * Effective gate budget in ms. `OMA_GATE_TIMEOUT_MS` may only LOWER it
 * (tests, slow CI): raising it past the handler budget would bring back the
 * silent vendor kill.
 */
export function gateTimeoutMs(): number {
  const raw = Number(process.env.OMA_GATE_TIMEOUT_MS);
  return Number.isFinite(raw) && raw > 0
    ? Math.min(raw, GATE_TIMEOUT_MS)
    : GATE_TIMEOUT_MS;
}

/** `25s`, `0.5s` — budget wording for block reasons. */
function formatSeconds(ms: number): string {
  return `${Number((ms / 1000).toFixed(1))}s`;
}

/**
 * Resolve an allowlisted gate keyword to a package-runner argv, or null when
 * the keyword is not allowlisted, package.json is absent, or it defines no
 * script of that name. Pure node:fs — no shell, no third-party imports.
 */
export function resolveGateArgv(
  gateKeyword: string,
  projectDir: string,
): string[] | null {
  if (!GATE_KEYWORDS.has(gateKeyword)) return null;
  const pkgPath = join(projectDir, "package.json");
  if (!existsSync(pkgPath)) return null;
  try {
    const pkg = JSON.parse(readFileSync(pkgPath, "utf-8")) as {
      scripts?: Record<string, unknown>;
    };
    if (typeof pkg.scripts?.[gateKeyword] !== "string") return null;
  } catch {
    return null;
  }
  if (
    existsSync(join(projectDir, "bun.lock")) ||
    existsSync(join(projectDir, "bun.lockb"))
  ) {
    return ["bun", "run", gateKeyword];
  }
  if (existsSync(join(projectDir, "pnpm-lock.yaml"))) {
    return ["pnpm", "run", gateKeyword];
  }
  if (existsSync(join(projectDir, "yarn.lock"))) {
    return ["yarn", gateKeyword];
  }
  return ["npm", "run", gateKeyword];
}

export interface GateRunResult {
  passed: boolean;
  timedOut: boolean;
  outputTail: string;
}

/**
 * Stop a gate run and everything it forked. POSIX gates lead their own
 * process group (spawned detached), so the negative pid also reaches the
 * test-runner workers; Windows has no process groups — taskkill /T walks the
 * tree. `leaderAlive: false` (after exit) never falls back to the bare pid,
 * which the OS may already have handed to an unrelated process.
 */
function killGateTree(pid: number | undefined, leaderAlive: boolean): void {
  if (!pid) return;
  if (process.platform === "win32") {
    if (!leaderAlive) return;
    try {
      spawnSync("taskkill", ["/pid", String(pid), "/T", "/F"], {
        stdio: "ignore",
        windowsHide: true,
      });
    } catch {
      // already gone
    }
    return;
  }
  try {
    process.kill(-pid, "SIGKILL");
  } catch {
    if (!leaderAlive) return;
    try {
      process.kill(pid, "SIGKILL");
    } catch {
      // already gone
    }
  }
}

/**
 * Run a resolved gate argv with a hard timeout. No shell involved. Async so
 * the dispatcher's per-handler timeout can still preempt it; on timeout, or
 * when this hook process is itself signalled (vendor kill, Ctrl-C), the whole
 * gate process tree is killed — no orphaned test runners.
 */
export function runGateCommand(
  argv: string[],
  projectDir: string,
  timeoutMs: number = gateTimeoutMs(),
): Promise<GateRunResult> {
  const [command, ...args] = argv;
  return new Promise((resolve) => {
    let output = "";
    let timedOut = false;
    let settled = false;
    let exitCode: number | null = null;
    let spawnError = "";
    let child: ChildProcess | undefined;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let flushTimer: ReturnType<typeof setTimeout> | undefined;

    const append = (chunk: Buffer | string): void => {
      output += chunk.toString();
      if (output.length > GATE_OUTPUT_BUFFER_CHARS) {
        output = output.slice(-GATE_OUTPUT_BUFFER_CHARS / 2);
      }
    };
    const onSignal = (signal: NodeJS.Signals): void => {
      killGateTree(child?.pid, true);
      // Keep the signal's default effect when nothing else handles it.
      if (process.listenerCount(signal) <= 1) {
        detachSignals();
        process.kill(process.pid, signal);
      }
    };
    const detachSignals = (): void => {
      for (const signal of FORWARDED_SIGNALS) {
        process.removeListener(signal, onSignal);
      }
    };
    const finish = (): void => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      clearTimeout(flushTimer);
      detachSignals();
      if (spawnError) append(`\n${spawnError}`);
      resolve({
        passed: exitCode === 0 && !timedOut && !spawnError,
        timedOut,
        outputTail: output.trim().slice(-GATE_OUTPUT_TAIL_CHARS),
      });
    };

    try {
      child = spawn(command as string, args, {
        cwd: projectDir,
        detached: process.platform !== "win32",
        stdio: ["ignore", "pipe", "pipe"],
        windowsHide: true,
      });
    } catch (error) {
      spawnError = error instanceof Error ? error.message : String(error);
      finish();
      return;
    }
    const gate = child;
    for (const signal of FORWARDED_SIGNALS) process.on(signal, onSignal);
    gate.stdout?.on("data", append);
    gate.stderr?.on("data", append);
    timer = setTimeout(() => {
      timedOut = true;
      killGateTree(gate.pid, true);
    }, timeoutMs);
    gate.on("error", (error) => {
      spawnError = error.message;
      finish();
    });
    gate.on("exit", (code) => {
      exitCode = code;
      // The verdict is the leader's exit code. Give its pipes a moment to
      // drain, then settle even if a straggler still holds stdout open.
      flushTimer = setTimeout(() => {
        killGateTree(gate.pid, false);
        finish();
      }, EXIT_FLUSH_GRACE_MS);
    });
    gate.on("close", (code) => {
      exitCode ??= code;
      // Reap stragglers the runner left in its group (leaked workers, servers).
      killGateTree(gate.pid, false);
      finish();
    });
  });
}

/** True when the goal's wall-clock budget (from activatedAt) is exhausted. */
export function isBudgetExhausted(state: ModeState): boolean {
  const minutes = state.goal?.budget?.wallClockMinutes;
  if (
    typeof minutes !== "number" ||
    !Number.isFinite(minutes) ||
    minutes <= 0
  ) {
    return false;
  }
  const elapsedMs = Date.now() - new Date(state.activatedAt).getTime();
  return elapsedMs >= minutes * 60_000;
}

/**
 * Emit a gate event onto the L1 trail recorded at activation. Best-effort:
 * older state files carry no omaSid, and event emission must never break the
 * Stop decision itself.
 */
async function emitGateEvent(
  projectDir: string,
  state: ModeState,
  kind: "gate.passed" | "gate.failed",
  payload: Record<string, unknown>,
): Promise<void> {
  if (!state.omaSid) return;
  try {
    const { emitEvent } = await import("./state-emit.ts");
    await emitEvent(projectDir, state.omaSid, {
      kind,
      payload: { workflow: state.workflow, ...payload },
    });
  } catch {
    // best-effort — never let event I/O change the stop decision
  }
}

interface PendingEnding {
  status: "completed" | "failed";
  reason: string;
}

interface SessionEnding extends PendingEnding {
  state: ModeState;
}

type RecoverableModeState = ModeState & { pendingEnding?: PendingEnding };

async function finishPersistentSessions(
  projectDir: string,
  sessionId: string,
  endings: SessionEnding[],
): Promise<void> {
  const bySid = new Map<string, SessionEnding>();
  for (const ending of endings) {
    const sid = ending.state.omaSid;
    if (!sid) continue;
    const previous = bySid.get(sid);
    if (previous?.status !== "failed") bySid.set(sid, ending);
  }
  for (const [sid, ending] of bySid) {
    // Several persistent workflows can share one L1 session. Keep it active
    // while any sibling mode still needs work or a gate retry.
    if (
      loadPersistentWorkflows().some(
        (workflow) =>
          readModeState(projectDir, workflow, sessionId)?.omaSid === sid,
      )
    )
      continue;
    const pending: PendingEnding = {
      status: ending.status,
      reason: ending.reason,
    };
    try {
      const { emitEvent, readEvents } = await import("./state-emit.ts");
      const previousStopFailure =
        ending.reason === "workflow_done"
          ? undefined
          : readEvents(projectDir, sid).findLast(
              (event) =>
                event.kind === "gate.failed" &&
                [
                  "budget_exhausted",
                  "stale_state",
                  "reinforcement_exhausted",
                ].includes(String(event.payload?.reason ?? "")),
            );
      if (previousStopFailure) {
        pending.status = "failed";
        pending.reason = String(previousStopFailure.payload?.reason);
      }
      await emitEvent(projectDir, sid, {
        kind: "session.ended",
        payload: {
          workflow: ending.state.workflow,
          status: pending.status,
          reason: pending.reason,
        },
      });
    } catch {
      // Preserve a terminal retry without overwriting a newly activated mode.
      const path = join(
        getStateDir(projectDir),
        `${ending.state.workflow}-state-${sessionId}.json`,
      );
      try {
        if (!existsSync(path))
          writeFileSync(
            path,
            JSON.stringify(
              { ...ending.state, pendingEnding: pending },
              null,
              2,
            ),
            { flag: "wx" },
          );
      } catch (error) {
        process.stderr.write(
          `[oma] Could not retain session end retry for ${sid}: ${error instanceof Error ? error.message : String(error)}\n`,
        );
      }
      continue;
    }
    // Summary export is optional and follows successful terminal persistence.
    try {
      const { exportSessionSummary } = await import("./session-summary.ts");
      await exportSessionSummary({ projectDir, sid });
    } catch {
      // Optional export failure must not undo the terminal event or stop.
    }
  }
}

// ── Config Loading ────────────────────────────────────────────

interface TriggerConfig {
  workflows: Record<string, { persistent: boolean }>;
}

function loadPersistentWorkflows(): string[] {
  try {
    const config = embeddedTriggers as TriggerConfig;
    return Object.entries(config.workflows)
      .filter(([, def]) => def.persistent)
      .map(([name]) => name);
  } catch {
    return ["ultrawork", "orchestrate", "work"];
  }
}

// ── Vendor Detection ──────────────────────────────────────────

function getSessionId(input: Record<string, unknown>): string {
  return (
    (input.sessionId as string) ||
    (input.session_id as string) ||
    agyConversationId(input) ||
    UNKNOWN_SESSION_ID
  );
}

// ── State ─────────────────────────────────────────────────────

function getStateDir(projectDir: string): string {
  return join(projectDir, ".agents", "state");
}

function readModeState(
  projectDir: string,
  workflow: string,
  sessionId: string,
): RecoverableModeState | null {
  const path = join(
    getStateDir(projectDir),
    `${workflow}-state-${sessionId}.json`,
  );
  if (!existsSync(path)) return null;
  try {
    return JSON.parse(readFileSync(path, "utf-8")) as RecoverableModeState;
  } catch {
    return null;
  }
}

export function isStale(state: ModeState): boolean {
  const elapsed = Date.now() - new Date(state.activatedAt).getTime();
  return elapsed > STALE_HOURS * 60 * 60 * 1000;
}

export function deactivate(
  projectDir: string,
  workflow: string,
  sessionId: string,
): void {
  const path = join(
    getStateDir(projectDir),
    `${workflow}-state-${sessionId}.json`,
  );
  if (existsSync(path)) unlinkSync(path);
}

/** Delete all persistent-workflow state files for a session (full deactivation). */
export function deactivateAllForSession(
  projectDir: string,
  sessionId: string,
): void {
  const stateDir = getStateDir(projectDir);
  if (!existsSync(stateDir)) return;
  const suffix = `-state-${sessionId}.json`;
  try {
    for (const file of readdirSync(stateDir)) {
      if (file.endsWith(suffix)) unlinkSync(join(stateDir, file));
    }
  } catch {
    /* ignore */
  }
}

/** activatedAt of a state file, falling back to its mtime when unreadable. */
function stateTimestampMs(path: string): number {
  try {
    const parsed = JSON.parse(readFileSync(path, "utf-8")) as {
      activatedAt?: unknown;
    };
    const ms =
      typeof parsed?.activatedAt === "string"
        ? Date.parse(parsed.activatedAt)
        : Number.NaN;
    if (Number.isFinite(ms)) return ms;
  } catch {
    // corrupt or half-written — judge by mtime instead
  }
  return statSync(path).mtimeMs;
}

/**
 * Remove persistent-workflow state files of OTHER sessions older than
 * ORPHAN_STATE_HOURS. Only that session's own Stop deletes its file, so a
 * session that ended without one (crash, closed terminal) left it behind
 * forever. The current session's file is never touched. Returns the removed
 * file names; best-effort, never throws.
 */
export function sweepOrphanedModeStates(
  projectDir: string,
  currentSessionId: string,
  now: number = Date.now(),
): string[] {
  const stateDir = getStateDir(projectDir);
  let files: string[];
  try {
    files = readdirSync(stateDir);
  } catch {
    return [];
  }
  const prefixes = loadPersistentWorkflows().map((w) => `${w}-state-`);
  const cutoff = now - ORPHAN_STATE_HOURS * 60 * 60 * 1000;
  const removed: string[] = [];
  for (const file of files) {
    if (!file.endsWith(".json")) continue;
    const prefix = prefixes.find((p) => file.startsWith(p));
    if (!prefix) continue;
    const sid = file.slice(prefix.length, -".json".length);
    if (!sid || sid === currentSessionId) continue;
    const path = join(stateDir, file);
    try {
      if (stateTimestampMs(path) < cutoff) {
        unlinkSync(path);
        removed.push(file);
      }
    } catch {
      // raced with another remover or unreadable — leave it
    }
  }
  return removed;
}

function incrementReinforcement(
  projectDir: string,
  workflow: string,
  sessionId: string,
  state: ModeState,
): void {
  // Coalesce malformed/hand-edited state files (missing field -> NaN forever).
  state.reinforcementCount = (Number(state.reinforcementCount) || 0) + 1;
  writeFileSync(
    join(getStateDir(projectDir), `${workflow}-state-${sessionId}.json`),
    JSON.stringify(state, null, 2),
  );
}

// ── Pure handler (canonical ABI) ─────────────────────────────

/**
 * Pure decision function — the single logic source for persistent-mode blocking.
 *
 * Returns a `block` HandlerResult when a persistent workflow is still active and
 * the stop should be blocked, or `null` when no workflow is active / all are
 * stale/exhausted.
 *
 * Both canonical and standalone callers pass response text to this handler.
 *
 * `ctx.cwd` must be the resolved git-root project directory;
 * `ctx.sid` is the vendor session id.
 */
export async function run(
  input: HookInput,
  ctx: HandlerCtx,
): Promise<HandlerResult | null> {
  if (input.kind !== "stop") return null;

  const { cwd: projectDir, sid: sessionId = UNKNOWN_SESSION_ID } = ctx;

  // Every gate in this Stop shares one budget so the chain stays inside the
  // persistent-mode handler timeout (see GATE_TIMEOUT_MS).
  const gateBudgetMs = gateTimeoutMs();
  const gateDeadline = Date.now() + gateBudgetMs;
  let gateRanThisStop = false;

  // Housekeeping: other sessions' long-dead persistent state.
  sweepOrphanedModeStates(projectDir, sessionId);

  // A stop event whose session id resolves to the fallback cannot be isolated:
  // blocking on an `-unknown` state file would freeze unrelated sessions that
  // also lack a resolvable id. Sweep any such orphan files (they should no
  // longer be created — see activateMode) and never block under this id.
  if (sessionId === UNKNOWN_SESSION_ID) {
    deactivateAllForSession(projectDir, UNKNOWN_SESSION_ID);
    return null;
  }

  // Honor "workflow done" deactivation carried in the stop payload's response
  // text (parity with the standalone main() path). Without this, persistent
  // mode could not be deactivated via the central `oma hook run` dispatch.
  if (input.responseText) {
    if (isDeactivationRequest(input.responseText)) {
      const endings = loadPersistentWorkflows()
        .map((workflow) => readModeState(projectDir, workflow, sessionId))
        .filter((state): state is ModeState => state !== null)
        .map(
          (state): SessionEnding => ({
            state,
            status: "completed",
            reason: "workflow_done",
          }),
        );
      deactivateAllForSession(projectDir, sessionId);
      await finishPersistentSessions(projectDir, sessionId, endings);
      return null;
    }
  }

  const persistentWorkflows = loadPersistentWorkflows();
  const endings: SessionEnding[] = [];

  for (const workflow of persistentWorkflows) {
    const state = readModeState(projectDir, workflow, sessionId);
    if (!state) continue;

    if (
      state.pendingEnding &&
      (state.pendingEnding.status === "completed" ||
        state.pendingEnding.status === "failed") &&
      typeof state.pendingEnding.reason === "string" &&
      state.pendingEnding.reason.trim()
    ) {
      deactivate(projectDir, workflow, sessionId);
      endings.push({ state, ...state.pendingEnding });
      continue;
    }

    // (1) Wall-clock budget: exhausted → failed terminal stop. A machine
    // verdict, not model discretion — the stop is allowed and the exhaustion
    // is recorded on the L1 trail.
    if (isBudgetExhausted(state)) {
      deactivate(projectDir, workflow, sessionId);
      await emitGateEvent(projectDir, state, "gate.failed", {
        gate: "budget",
        reason: "budget_exhausted",
        summary: `wall-clock budget (${state.goal?.budget?.wallClockMinutes}m) exhausted for /${workflow}; stopping with failed status`,
      });
      endings.push({ state, status: "failed", reason: "budget_exhausted" });
      continue;
    }

    if (isStale(state) || state.reinforcementCount >= MAX_REINFORCEMENTS) {
      deactivate(projectDir, workflow, sessionId);
      const reason = isStale(state) ? "stale_state" : "reinforcement_exhausted";
      await emitGateEvent(projectDir, state, "gate.failed", {
        gate: "persistent-mode",
        reason,
        summary: `persistent stop released for /${workflow}: ${reason}`,
      });
      endings.push({
        state,
        status: "failed",
        reason,
      });
      continue;
    }

    const stateFile = `.agents/state/${workflow}-state-${sessionId}.json`;

    // (2) Deterministic completion gate. Only allowlisted keywords resolve to
    // a runnable argv; anything else (including free-form shell strings an
    // agent may have written into the state file) is NEVER executed and falls
    // through to the plain reinforcement block below.
    const gateKeyword = state.goal?.completion?.gate;
    let ignoredGateNote = "";
    if (gateKeyword) {
      const argv = resolveGateArgv(gateKeyword, projectDir);
      if (argv) {
        const budgetMs = Math.max(1, gateDeadline - Date.now());
        if (gateRanThisStop && budgetMs < MIN_GATE_RUN_MS) {
          // An earlier workflow's gate spent this Stop's budget. That gate's
          // workflow is now settled, so the next Stop runs this one in full —
          // not a failure, no reinforcement charged.
          await finishPersistentSessions(projectDir, sessionId, endings);
          return {
            type: "block",
            reason: [
              `[OMA PERSISTENT MODE: ${workflow.toUpperCase()}]`,
              `Stop gate '${gateKeyword}' deferred: another gate used this stop's ${formatSeconds(gateBudgetMs)} gate budget.`,
              `Finish your current step and stop again — the gate runs then.`,
              `To abandon instead: delete ${stateFile} or say "workflow done".`,
            ].join("\n"),
          };
        }
        gateRanThisStop = true;
        const gate = await runGateCommand(argv, projectDir, budgetMs);
        if (gate.passed) {
          // The gate is the mechanical proof of completion: allow the stop.
          deactivate(projectDir, workflow, sessionId);
          await emitGateEvent(projectDir, state, "gate.passed", {
            gate: gateKeyword,
            summary: `stop gate '${gateKeyword}' passed for /${workflow}`,
          });
          endings.push({
            state,
            status: "completed",
            reason: "completion_gate_passed",
          });
          continue;
        }
        // Failure and timeout both count toward MAX_REINFORCEMENTS so a
        // permanently red (or permanently slow) gate cannot block stops
        // forever. Recorded before anything else can go wrong.
        incrementReinforcement(projectDir, workflow, sessionId, state);
        const budget = formatSeconds(gateBudgetMs);
        await emitGateEvent(projectDir, state, "gate.failed", {
          gate: gateKeyword,
          timedOut: gate.timedOut,
          ...(gate.timedOut ? { budgetMs } : {}),
          summary: gate.timedOut
            ? `stop gate '${gateKeyword}' timed out after ${budget} (Stop-hook gate budget) for /${workflow}`
            : `stop gate '${gateKeyword}' failed for /${workflow}`,
        });
        const quicker = ["lint", "typecheck"]
          .filter((keyword) => keyword !== gateKeyword)
          .map((keyword) => `\`oma goal set --gate ${keyword}\``)
          .join(" or ");
        const reason = [
          `[OMA PERSISTENT MODE: ${workflow.toUpperCase()}]`,
          gate.timedOut
            ? `Stop gate '${gateKeyword}' timed out after ${budget} — the Stop-hook gate budget — and its process tree was stopped (reinforcement ${state.reinforcementCount}/${MAX_REINFORCEMENTS}).`
            : `Stop gate '${gateKeyword}' FAILED (reinforcement ${state.reinforcementCount}/${MAX_REINFORCEMENTS}).`,
          gate.timedOut
            ? `A gate runs inside the Stop hook and must finish within ${budget}: make the \`${gateKeyword}\` script faster (e.g. only the affected tests), or switch to a quicker gate with ${quicker}.`
            : `Fix the failures below, then finish the workflow — the stop is allowed only when the gate passes.`,
          gate.outputTail
            ? `--- gate output (tail) ---\n${gate.outputTail}`
            : "",
          `To abandon instead: delete ${stateFile} or say "workflow done".`,
        ]
          .filter(Boolean)
          .join("\n");
        await finishPersistentSessions(projectDir, sessionId, endings);
        return { type: "block", reason };
      }
      ignoredGateNote = `Note: configured stop gate ${JSON.stringify(gateKeyword)} is not an allowed keyword (typecheck|test|lint) or has no matching package.json script — it was NOT executed.`;
    }

    incrementReinforcement(projectDir, workflow, sessionId, state);

    const reason = [
      `[OMA PERSISTENT MODE: ${workflow.toUpperCase()}]`,
      `The /${workflow} workflow is still active (reinforcement ${state.reinforcementCount}/${MAX_REINFORCEMENTS}).`,
      `Continue executing the workflow. If all tasks are genuinely complete:`,
      `  1. Delete the state file: Bash \`rm ${stateFile}\``,
      ignoredGateNote,
    ]
      .filter(Boolean)
      .join("\n");

    await finishPersistentSessions(projectDir, sessionId, endings);
    return { type: "block", reason };
  }

  await finishPersistentSessions(projectDir, sessionId, endings);
  return null;
}

// ── Standalone entry (pi subprocess / direct bun invocation) ──

async function main() {
  const raw = readFileSync(0, "utf-8");
  let input: Record<string, unknown>;
  try {
    input = JSON.parse(raw);
  } catch {
    process.exit(0);
  }

  const vendor = detectVendorFromInput(input, "stop", import.meta.filename);
  const projectDir = getProjectDir(vendor, input);
  const sessionId = getSessionId(input);

  // Check all text fields in stdin for deactivation phrases.
  // The assistant may have included "workflow done" in its response,
  // or it may appear in transcript/content fields depending on vendor.
  // This raw-stdin check is standalone-path-only; the canonical HookInput
  // { kind: "stop" } does not carry these text fields.
  const textToCheck = [
    input.prompt_response,
    input.response,
    input.content,
    input.message,
    input.transcript,
  ]
    .filter((v): v is string => typeof v === "string")
    .join(" ");

  // Delegate to run() for the block decision — single logic source.
  const hookInput: HookInput = {
    kind: "stop",
    cwd: projectDir,
    responseText: textToCheck || undefined,
  };
  const ctxVal: HandlerCtx = { vendor, cwd: projectDir, sid: sessionId };

  const result = await run(hookInput, ctxVal);
  if (result && result.type === "block") {
    writeBlockAndExit(vendor, result.reason);
  }

  process.exit(0);
}

export function writeBlockAndExit(vendor: Vendor, reason: string): never {
  process.stderr.write(reason);
  process.stdout.write(makeBlockOutput(vendor, reason));
  // agy gates the stop via the JSON `decision:"continue"` on stdout and treats
  // a non-zero exit as a failed (fail-open) hook; exit 0 so the decision sticks.
  // Other vendors block via exit code 2.
  process.exit(vendor === "antigravity" ? 0 : 2);
}

if (import.meta.main) {
  main().catch(() => process.exit(0));
}
