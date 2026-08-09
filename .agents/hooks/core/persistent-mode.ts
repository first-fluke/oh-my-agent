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

import { spawnSync } from "node:child_process";
import {
  existsSync,
  readdirSync,
  readFileSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
import { join } from "node:path";
import { agyConversationId, isAgyInput } from "./agy-input.ts";
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
import { getProjectDir } from "./vendor-detect.ts";

const MAX_REINFORCEMENTS = 5;
const STALE_HOURS = 2;

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

/** Hard cap on a gate run; SIGKILL after this. Keeps Stop-hook latency bounded. */
const GATE_TIMEOUT_MS = 60_000;

/** Tail of gate output carried back into the block reason. */
const GATE_OUTPUT_TAIL_CHARS = 2_000;

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

/** Run a resolved gate argv with a hard timeout. No shell involved. */
export function runGateCommand(
  argv: string[],
  projectDir: string,
): GateRunResult {
  const [command, ...args] = argv;
  const result = spawnSync(command as string, args, {
    cwd: projectDir,
    encoding: "utf-8",
    timeout: GATE_TIMEOUT_MS,
    killSignal: "SIGKILL",
    maxBuffer: 8 * 1024 * 1024,
  });
  const timedOut =
    (result.error as NodeJS.ErrnoException | undefined)?.code === "ETIMEDOUT" ||
    result.signal === "SIGKILL";
  const combined = `${result.stdout ?? ""}\n${result.stderr ?? ""}`.trim();
  return {
    passed: result.status === 0 && !result.error,
    timedOut,
    outputTail: combined.slice(-GATE_OUTPUT_TAIL_CHARS),
  };
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

function detectVendor(input: Record<string, unknown>): Vendor {
  const event = input.hook_event_name as string | undefined;
  const hookEventName = input.hookEventName as string | undefined;

  if (process.env.GROK_WORKSPACE_ROOT || hookEventName?.includes("stop")) {
    if (process.env.GROK_WORKSPACE_ROOT) return "grok";
  }

  if (
    process.env.KIRO_PROJECT_DIR ||
    event === "stop" ||
    hookEventName === "stop"
  ) {
    return "kiro";
  }

  // agy (Antigravity) Stop sends no hook_event_name; detect by stdin shape.
  if (isAgyInput(input)) return "antigravity";
  if (event === "Stop" && process.env.ANTIGRAVITY_PROJECT_DIR)
    return "antigravity";
  if (event === "Stop") {
    if ("session_id" in input && !("sessionId" in input)) return "codex";
  }
  if (process.env.QWEN_PROJECT_DIR) return "qwen";
  return "claude";
}

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
): ModeState | null {
  const path = join(
    getStateDir(projectDir),
    `${workflow}-state-${sessionId}.json`,
  );
  if (!existsSync(path)) return null;
  try {
    return JSON.parse(readFileSync(path, "utf-8")) as ModeState;
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
 * NOTE: The deactivation-via-response-text check (reading `prompt_response`,
 * `response`, `content` etc. from raw stdin) is not representable in the
 * canonical `HookInput { kind: "stop"; cwd }` shape — those fields are absent.
 * That check stays in the standalone `main()` path. When dispatched via
 * `oma hook`, the dispatch layer is responsible for passing a pre-checked input
 * (or extending HookInput in a future revision).
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
  // mode could not be deactivated via the central `oma hook` dispatch.
  if (input.responseText) {
    if (isDeactivationRequest(input.responseText)) {
      deactivateAllForSession(projectDir, sessionId);
      return null;
    }
  }

  const persistentWorkflows = loadPersistentWorkflows();

  for (const workflow of persistentWorkflows) {
    const state = readModeState(projectDir, workflow, sessionId);
    if (!state) continue;

    if (isStale(state) || state.reinforcementCount >= MAX_REINFORCEMENTS) {
      deactivate(projectDir, workflow, sessionId);
      continue;
    }

    // (1) Wall-clock budget: exhausted → honest partial stop. A machine
    // verdict, not model discretion — the stop is allowed and the exhaustion
    // is recorded on the L1 trail.
    if (isBudgetExhausted(state)) {
      deactivate(projectDir, workflow, sessionId);
      await emitGateEvent(projectDir, state, "gate.failed", {
        gate: "budget",
        summary: `wall-clock budget (${state.goal?.budget?.wallClockMinutes}m) exhausted for /${workflow}; stopping with partial status`,
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
        const gate = runGateCommand(argv, projectDir);
        if (gate.passed) {
          // The gate is the mechanical proof of completion: allow the stop.
          deactivate(projectDir, workflow, sessionId);
          await emitGateEvent(projectDir, state, "gate.passed", {
            gate: gateKeyword,
            summary: `stop gate '${gateKeyword}' passed for /${workflow}`,
          });
          continue;
        }
        // Failure and timeout both count toward MAX_REINFORCEMENTS so a
        // permanently red gate cannot block stops forever.
        incrementReinforcement(projectDir, workflow, sessionId, state);
        await emitGateEvent(projectDir, state, "gate.failed", {
          gate: gateKeyword,
          timedOut: gate.timedOut,
          summary: `stop gate '${gateKeyword}' ${gate.timedOut ? "timed out" : "failed"} for /${workflow}`,
        });
        const reason = [
          `[OMA PERSISTENT MODE: ${workflow.toUpperCase()}]`,
          `Stop gate '${gateKeyword}' ${gate.timedOut ? `timed out after ${GATE_TIMEOUT_MS / 1000}s` : "FAILED"} (reinforcement ${state.reinforcementCount}/${MAX_REINFORCEMENTS}).`,
          `Fix the failures below, then finish the workflow — the stop is allowed only when the gate passes.`,
          gate.outputTail
            ? `--- gate output (tail) ---\n${gate.outputTail}`
            : "",
          `To abandon instead: delete ${stateFile} or say "workflow done".`,
        ]
          .filter(Boolean)
          .join("\n");
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
      `  2. Or ask the user to say "워크플로우 완료" / "workflow done"`,
      ignoredGateNote,
    ]
      .filter(Boolean)
      .join("\n");

    return { type: "block", reason };
  }

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

  const vendor = detectVendor(input);
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

  if (textToCheck && isDeactivationRequest(textToCheck)) {
    // Deactivate all persistent workflows for this session (shared helper).
    deactivateAllForSession(projectDir, sessionId);
    process.exit(0);
  }

  // Delegate to run() for the block decision — single logic source.
  const hookInput: HookInput = { kind: "stop", cwd: projectDir };
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
