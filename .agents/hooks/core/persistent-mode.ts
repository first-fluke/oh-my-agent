#!/usr/bin/env bun
/**
 * oh-my-agent — Stop Hook (Persistent Mode)
 *
 * Works with: Claude Code (Stop), Codex CLI (Stop), Gemini CLI (AfterAgent)
 *
 * Prevents the agent from stopping while a long-running workflow
 * (ultrawork, orchestrate, work) is active.
 *
 * stdin : JSON  — { sessionId|session_id, hook_event_name?, ... }
 * stdout: JSON  — { decision: "block", reason } | {}
 * exit 0 = allow stop
 * exit 2 = block stop
 */

import {
  existsSync,
  readdirSync,
  readFileSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
import { join } from "node:path";
import { agyConversationId, agyProjectDir, isAgyInput } from "./agy-input.ts";
import { resolveGitRoot } from "./fs-utils.ts";
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

const MAX_REINFORCEMENTS = 5;
const STALE_HOURS = 2;

function detectLanguage(projectDir: string): string {
  const prefsPath = join(projectDir, ".agents", "oma-config.yaml");
  if (!existsSync(prefsPath)) return "en";
  try {
    const content = readFileSync(prefsPath, "utf-8");
    const match = content.match(/^language:\s*(\S+)/m);
    return match?.[1] ?? "en";
  } catch {
    return "en";
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
  if (event === "AfterAgent") return "gemini";
  if (event === "Stop") {
    if ("session_id" in input && !("sessionId" in input)) return "codex";
  }
  if (process.env.QWEN_PROJECT_DIR) return "qwen";
  return "claude";
}

function getProjectDir(vendor: Vendor, input: Record<string, unknown>): string {
  let dir: string;
  switch (vendor) {
    case "codex":
      dir = (input.cwd as string) || process.cwd();
      break;
    case "gemini":
      dir = process.env.GEMINI_PROJECT_DIR || process.cwd();
      break;
    case "antigravity":
      dir =
        agyProjectDir(input) ||
        (input.cwd as string) ||
        process.env.ANTIGRAVITY_PROJECT_DIR ||
        process.env.AGY_PROJECT_DIR ||
        process.env.GEMINI_PROJECT_DIR ||
        process.cwd();
      break;
    case "qwen":
      dir = process.env.QWEN_PROJECT_DIR || process.cwd();
      break;
    case "grok":
      dir =
        process.env.GROK_WORKSPACE_ROOT ||
        (input.cwd as string) ||
        process.cwd();
      break;
    case "kiro":
      dir =
        process.env.KIRO_PROJECT_DIR || (input.cwd as string) || process.cwd();
      break;
    default:
      dir = process.env.CLAUDE_PROJECT_DIR || process.cwd();
      break;
  }
  return resolveGitRoot(dir);
}

function getSessionId(input: Record<string, unknown>): string {
  return (
    (input.sessionId as string) ||
    (input.session_id as string) ||
    agyConversationId(input) ||
    "unknown"
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

  const { cwd: projectDir, sid: sessionId = "unknown" } = ctx;

  // Honor "workflow done" deactivation carried in the stop payload's response
  // text (parity with the standalone main() path). Without this, persistent
  // mode could not be deactivated via the central `oma hook` dispatch.
  if (input.responseText) {
    const lang = detectLanguage(projectDir);
    if (isDeactivationRequest(input.responseText, lang)) {
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

    incrementReinforcement(projectDir, workflow, sessionId, state);

    const stateFile = `.agents/state/${workflow}-state-${sessionId}.json`;
    const reason = [
      `[OMA PERSISTENT MODE: ${workflow.toUpperCase()}]`,
      `The /${workflow} workflow is still active (reinforcement ${state.reinforcementCount}/${MAX_REINFORCEMENTS}).`,
      `Continue executing the workflow. If all tasks are genuinely complete:`,
      `  1. Delete the state file: Bash \`rm ${stateFile}\``,
      `  2. Or ask the user to say "워크플로우 완료" / "workflow done"`,
    ].join("\n");

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
  const lang = detectLanguage(projectDir);

  // Check all text fields in stdin for deactivation phrases.
  // The assistant may have included "workflow done" in its response,
  // or it may appear in transcript/content fields depending on vendor.
  // This raw-stdin check is standalone-path-only; the canonical HookInput
  // { kind: "stop" } does not carry these text fields.
  const textToCheck = [
    input.prompt_response, // Gemini AfterAgent
    input.response,
    input.content,
    input.message,
    input.transcript,
  ]
    .filter((v): v is string => typeof v === "string")
    .join(" ");

  if (textToCheck && isDeactivationRequest(textToCheck, lang)) {
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
