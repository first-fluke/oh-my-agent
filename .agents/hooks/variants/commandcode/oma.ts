/**
 * oh-my-agent — Command Code (commandcode.ai) mod bridge.
 *
 * SSOT source. `oma emit --target commandcode-mod` copies this file to
 * `commandcode-mod/mods/oma.ts`, the entry `package.json#commandcode.mods`
 * lists, so `cmd mods add oh-my-agent-commandcode` (or a local path) loads it.
 *
 * Command Code's settings-file hooks (`.agents/hooks/variants/commandcode.json`)
 * cover SessionStart / PostToolUse / Stop only — there is no prompt-submit
 * hook. A mod sees the full lifecycle through `cmd.hooks({...})`, so this
 * bridge maps the Command Code ModApi hooks onto oma's vendor-agnostic core
 * handlers the same way the opencode bridge does: every handler runs as a
 * subprocess of the installed `oma` CLI (`oma hook script --vendor commandcode
 * --script <name>`), which answers in the commandcode dialect (Claude-shaped
 * JSON: `hookSpecificOutput.additionalContext`, `updatedInput`,
 * `permissionDecision`, `{decision: "block", reason}`). Extraction is
 * defensive (top-level OR `hookSpecificOutput`).
 *
 * Dependency-free: no `@commandcode/harness` import (the types are bundled
 * with the CLI, not installable), and the ModApi shape is satisfied
 * structurally. Fail-open everywhere: a missing `oma` binary, a timeout or
 * malformed output leaves the host unchanged. Command Code also catches a
 * throwing hook (`mod_error`), so nothing here can crash a session.
 *
 * Hook mapping:
 *   transformInput        ← UserPromptSubmit
 *       Runs keyword-detector + skill-injector on the typed prompt and stashes
 *       the returned context. Returns `{action: "continue"}` — the prompt
 *       itself is never rewritten.
 *   appendSystemPrompt    ← context injection
 *       Appends the stashed session-start and prompt context to the system
 *       prompt. The value only changes when a new prompt is typed or a session
 *       starts, so it stays byte-stable across the rounds of one run (the
 *       provider prompt cache keys off the bytes).
 *   onSessionStart        ← SessionStart
 *       Runs code-intelligence-primer + state-boundary (the commandcode
 *       SessionStart chain) and stashes their context.
 *   beforeToolCall        ← PreToolUse (shell_command only)
 *       scm-guard first: a deny becomes `{block: true, additionalContext}`
 *       (the reason becomes the tool result the model sees). Then test-filter
 *       rewrites test-runner invocations via `{input: {...input, command}}`.
 *   onStop                ← Stop (persistent-mode)
 *       Runs persistent-mode; a block decision becomes `{continue: true,
 *       reason}` — Command Code's documented force-continue channel (capped at
 *       8 consecutive continuations by the host; persistent-mode's own
 *       reinforcement cap terminates first). The run-end hook cannot alter
 *       the result, so it is not used for this.
 */

import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

/** persistent-mode may run a goal stop gate (25s cap); the rest keep 5s. */
const PERSISTENT_MODE_TIMEOUT_MS = 30_000;
const DEFAULT_TIMEOUT_MS = 5_000;

/** Command Code's shell tool (`cmd mods inspect` and the bundled examples). */
const SHELL_TOOLS = new Set(["shell_command", "bash"]);

// ── Structural ModApi subset ──────────────────────────────────

type TransformInputResult =
  | { action: "continue" }
  | { action: "transform"; text: string }
  | { action: "handled"; message?: string };

interface BeforeToolCallResult {
  block?: boolean;
  additionalContext?: string;
  input?: Record<string, unknown>;
}

interface OmaModHooks {
  transformInput?: (args: {
    text: string;
  }) =>
    | TransformInputResult
    | undefined
    | Promise<TransformInputResult | undefined>;
  appendSystemPrompt?: (args: {
    state?: unknown;
  }) => string | undefined | Promise<string | undefined>;
  onSessionStart?: (args: { source?: string }) => void | Promise<void>;
  beforeToolCall?: (args: {
    toolCallId?: string;
    toolName: string;
    input: Record<string, unknown>;
    state?: unknown;
  }) =>
    | BeforeToolCallResult
    | undefined
    | Promise<BeforeToolCallResult | undefined>;
  onStop?: (args: {
    state?: unknown;
    stopReason?: string;
    turnNumber?: number;
    lastAssistantText?: string;
  }) =>
    | { continue?: boolean; reason?: string }
    | undefined
    | Promise<{ continue?: boolean; reason?: string } | undefined>;
}

/** The ModApi members this bridge touches; the real `ModApi` is a superset. */
export interface OmaModApi {
  cwd?: string;
  hooks: (hooks: OmaModHooks) => unknown;
  on?: (
    event: string,
    handler: (event: Record<string, unknown>) => void,
  ) => unknown;
}

// ── Subprocess dispatch ───────────────────────────────────────

/** Directory of this mod; exported so test-filter can find filter-test-output.sh. */
function bridgeDir(): string {
  try {
    return fileURLToPath(new URL("..", import.meta.url));
  } catch {
    return "";
  }
}

/**
 * Run one oma core handler through the installed CLI: JSON on stdin, JSON on
 * stdout. Fail-open (null) on any error. `cwd` is the Command Code workspace
 * root so the handler resolves the project the same way every other vendor
 * does. A non-zero exit (persistent-mode blocks with exit 2) is expected and
 * stdout is still parsed.
 */
function runCore(
  script: string,
  payload: Record<string, unknown>,
  cwd: string,
  timeoutMs = DEFAULT_TIMEOUT_MS,
): Record<string, unknown> | null {
  try {
    const bin = process.env.OMA_BIN || "oma";
    const dir = bridgeDir();
    const res = spawnSync(
      bin,
      ["hook", "script", "--vendor", "commandcode", "--script", script],
      {
        input: JSON.stringify(payload),
        cwd,
        encoding: "utf-8",
        timeout: timeoutMs,
        maxBuffer: 4 * 1024 * 1024,
        env: dir ? { ...process.env, OMA_HOOK_BRIDGE_DIR: dir } : process.env,
        // A bare binary name on Windows resolves through PATHEXT (`oma.cmd`,
        // `oma.exe`) only via the shell; the args are fixed literals.
        shell: process.platform === "win32" && !/[\\/]/.test(bin),
      },
    );
    const out = (res.stdout ?? "").trim();
    if (!out) return null;
    return JSON.parse(out) as Record<string, unknown>;
  } catch {
    return null;
  }
}

// ── Dialect extraction ────────────────────────────────────────

function extractAdditionalContext(
  out: Record<string, unknown> | null,
): string | null {
  if (!out) return null;
  if (typeof out.additionalContext === "string" && out.additionalContext) {
    return out.additionalContext;
  }
  const hso = out.hookSpecificOutput;
  if (hso && typeof hso === "object") {
    const nested = (hso as Record<string, unknown>).additionalContext;
    if (typeof nested === "string" && nested) return nested;
  }
  return null;
}

function extractUpdatedInput(
  out: Record<string, unknown> | null,
): Record<string, unknown> | null {
  if (!out) return null;
  const read = (v: unknown): Record<string, unknown> | null =>
    v && typeof v === "object" && !Array.isArray(v)
      ? (v as Record<string, unknown>)
      : null;
  const direct = read(out.updatedInput);
  if (direct) return direct;
  const hso = out.hookSpecificOutput;
  if (hso && typeof hso === "object") {
    return read((hso as Record<string, unknown>).updatedInput);
  }
  return null;
}

function extractDenyReason(out: Record<string, unknown> | null): string | null {
  if (!out) return null;
  const hso = out.hookSpecificOutput;
  if (hso && typeof hso === "object") {
    const h = hso as Record<string, unknown>;
    if (h.permissionDecision === "deny") {
      return typeof h.permissionDecisionReason === "string" &&
        h.permissionDecisionReason
        ? h.permissionDecisionReason
        : "Blocked by oma scm-guard.";
    }
  }
  if (out.permission === "deny" || out.decision === "deny") {
    const reason = out.user_message ?? out.reason;
    return typeof reason === "string" && reason
      ? reason
      : "Blocked by oma scm-guard.";
  }
  return null;
}

// ── Mod factory ───────────────────────────────────────────────

/**
 * oh-my-agent Command Code mod.
 *
 * @satisfies ModFactory
 */
export default function omaMod(cmd: OmaModApi): void {
  const cwd = cmd.cwd || process.cwd();

  // The host session id arrives on `run_start` (and `session_start`), which
  // fire AFTER the first transformInput. persistent-mode state is keyed by
  // session, so the id is locked at first dispatch: a real id learned before
  // then wins, otherwise a per-process fallback keeps every handler of this
  // session on one key.
  const fallbackSessionId = `commandcode-${process.pid}-${Date.now().toString(36)}`;
  let hostSessionId = "";
  let lockedSessionId = "";
  const sessionId = (): string => {
    if (!lockedSessionId) lockedSessionId = hostSessionId || fallbackSessionId;
    return lockedSessionId;
  };
  const learnSessionId = (event: Record<string, unknown>): void => {
    const id = event.sessionId;
    if (typeof id === "string" && id && !hostSessionId) hostSessionId = id;
  };
  try {
    cmd.on?.("run_start", learnSessionId);
    cmd.on?.("session_start", learnSessionId);
  } catch {
    // Observation only — never fail the factory.
  }

  let sessionContext = "";
  let promptContext = "";

  cmd.hooks({
    onSessionStart: ({ source }) => {
      const payload = {
        prompt: "",
        cwd,
        sessionId: sessionId(),
        hook_event_name: "SessionStart",
        ...(source ? { source } : {}),
      };
      const parts: string[] = [];
      for (const script of [
        "code-intelligence-primer.ts",
        "state-boundary.ts",
      ]) {
        const ctx = extractAdditionalContext(runCore(script, payload, cwd));
        if (ctx) parts.push(ctx);
      }
      sessionContext = parts.join("\n\n");
    },

    transformInput: ({ text }) => {
      const payload = {
        prompt: text,
        cwd,
        sessionId: sessionId(),
        hook_event_name: "UserPromptSubmit",
      };
      const parts: string[] = [];
      for (const script of ["keyword-detector.ts", "skill-injector.ts"]) {
        const ctx = extractAdditionalContext(runCore(script, payload, cwd));
        if (ctx) parts.push(ctx);
      }
      // Overwrite — even with "" — so a previous prompt's context is never
      // re-injected for this one.
      promptContext = parts.join("\n\n");
      return { action: "continue" };
    },

    appendSystemPrompt: () => {
      const joined = [sessionContext, promptContext]
        .filter(Boolean)
        .join("\n\n");
      return joined || undefined;
    },

    beforeToolCall: ({ toolName, input }) => {
      if (!SHELL_TOOLS.has(toolName)) return undefined;
      const command = input?.command;
      if (typeof command !== "string" || !command) return undefined;
      const payload = {
        tool_name: "Bash",
        tool_input: { command },
        cwd,
        sessionId: sessionId(),
        hook_event_name: "PreToolUse",
      };

      const denyReason = extractDenyReason(
        runCore("scm-guard.ts", payload, cwd),
      );
      if (denyReason) return { block: true, additionalContext: denyReason };

      const updated = extractUpdatedInput(
        runCore("test-filter.ts", payload, cwd),
      );
      const rewritten = updated?.command;
      if (typeof rewritten === "string" && rewritten && rewritten !== command) {
        return { input: { ...input, command: rewritten } };
      }
      return undefined;
    },

    onStop: ({ lastAssistantText }) => {
      const pm = runCore(
        "persistent-mode.ts",
        {
          cwd,
          sessionId: sessionId(),
          hook_event_name: "Stop",
          ...(lastAssistantText ? { response: lastAssistantText } : {}),
        },
        cwd,
        PERSISTENT_MODE_TIMEOUT_MS,
      );
      if (pm?.decision !== "block") return undefined;
      const reason =
        typeof pm.reason === "string" && pm.reason
          ? pm.reason
          : "The active OMA workflow is not complete. Continue executing it.";
      return { continue: true, reason };
    },
  });
}
