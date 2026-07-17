/**
 * oh-my-agent — opencode (Sst opencode) plugin bridge.
 *
 * SSOT source. At install time `installOpencodePlugin` copies this file to
 * `.opencode/plugins/oma/oma.ts` alongside the core hook scripts, and
 * `registerOpencodePlugin` adds it to `.opencode/opencode.jsonc` (the nested
 * subdir is invisible to opencode's flat auto-discovery).
 *
 * Why a bridge instead of a per-vendor variants JSON entry: opencode does NOT
 * register settings-file hooks like the other vendors. It loads in-process
 * TypeScript plugins whose handlers are invoked with an `(input, output)` pair
 * and are expected to MUTATE `output` (return values are ignored). So rather
 * than the generic `installHooksFromVariant` path (events → settings file →
 * `bun <script>` subprocess), opencode gets this thin shim that maps opencode
 * lifecycle handlers onto oma's existing, vendor-agnostic core scripts via
 * subprocess. All matching logic stays in the core scripts.
 *
 * The core scripts installed under `.opencode/plugins/oma/` are not recognised
 * as an opencode vendor (there is no `.opencode` case in the shared
 * `inferVendorFromScriptPath`), so they resolve to the `claude` output dialect.
 * This bridge therefore reads the claude-shaped stdout: `additionalContext`
 * for prompt hooks, `hookSpecificOutput.updatedInput.command` for PreToolUse,
 * and `{ decision: "block", reason }` for the Stop equivalent. Extraction is
 * defensive (top-level OR `hookSpecificOutput`) so a dialect shift does not
 * silently break the bridge.
 *
 * Intentionally dependency-free (no @opencode-ai/plugin import) so this file
 * works in any user project without requiring opencode as a dev dependency.
 * Handler and client shapes are satisfied structurally via inline types.
 *
 * Event mapping:
 *   chat.message                        ← UserPromptSubmit
 *       Extracts user text from output.parts, runs keyword-detector +
 *       skill-injector, and stashes the resulting context per session (keyed
 *       by input.sessionID). The opencode session id is forwarded to the core
 *       scripts so keyword-detector's persistent-mode activation writes a
 *       session-scoped state file (an unresolved id would refuse to persist).
 *   experimental.chat.system.transform  ← context injection
 *       Peeks the stashed context for input.sessionID and pushes it onto
 *       output.system. Non-consuming: the stash is refreshed (or cleared)
 *       every chat.message, so re-injection across model calls in a turn is
 *       harmless and a chat.message→transform ordering assumption cannot
 *       permanently drop context.
 *   tool.execute.before                 ← PreToolUse (bash only)
 *       Runs scm-guard first (throws to block `git add` of likely-secret
 *       files — throwing is opencode's documented block mechanism, see
 *       opencode.ai/docs/plugins), then test-filter on output.args.command,
 *       writing the rewritten command back onto output.args.command.
 *       Known upstream caveat: plugin hooks do not intercept subagent tool
 *       calls (anomalyco/opencode#5894), so the guard covers the primary
 *       agent only.
 *   event: "session.idle"               ← Stop (BEST-EFFORT / re-entrant)
 *       Runs persistent-mode. If it returns a block decision, the workflow is
 *       still active: re-enter the loop by posting the block reason as a new
 *       prompt via client.session.prompt. Best-effort — any failure is
 *       swallowed. persistent-mode's own reinforcement cap (5) is the primary
 *       terminator; a per-session consecutive-idle counter is a runaway
 *       backstop only.
 */

import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

/** Absolute path to a core script copied next to this bridge at install time. */
function corePath(script: string): string {
  return fileURLToPath(new URL(`./${script}`, import.meta.url));
}

/**
 * Run an oma core hook script as a subprocess: feed it JSON on stdin, parse
 * its JSON stdout. Fail-open (returns null) on any error — a broken hook must
 * never block the agent. Spawns with `cwd` = opencode's working directory so
 * the core scripts resolve the project (git) root the same way they do for
 * every other vendor. Non-zero exit (persistent-mode blocks with exit 2) is
 * expected: stdout is still captured and parsed.
 */
function runCore(
  script: string,
  payload: Record<string, unknown>,
  cwd: string,
): Record<string, unknown> | null {
  try {
    const res = spawnSync("bun", [corePath(script)], {
      input: JSON.stringify(payload),
      cwd,
      encoding: "utf-8",
      timeout: 5000,
      env: process.env,
    });
    const out = (res.stdout ?? "").trim();
    if (!out) return null;
    return JSON.parse(out) as Record<string, unknown>;
  } catch {
    return null;
  }
}

/**
 * Extract injected context from a prompt-hook (keyword-detector / skill-
 * injector) result. The core scripts emit the `claude` dialect, which carries
 * `additionalContext` both at the top level and under `hookSpecificOutput`;
 * read either so a dialect change does not silently drop context.
 */
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

/**
 * Extract the rewritten command from a test-filter (PreToolUse) result. The
 * `claude` dialect nests it under `hookSpecificOutput.updatedInput.command`;
 * a top-level `updatedInput.command` is also accepted for dialect resilience.
 */
function extractUpdatedCommand(
  out: Record<string, unknown> | null,
): string | null {
  if (!out) return null;
  const readCommand = (v: unknown): string | null => {
    if (v && typeof v === "object") {
      const cmd = (v as Record<string, unknown>).command;
      if (typeof cmd === "string" && cmd) return cmd;
    }
    return null;
  };
  const direct = readCommand(out.updatedInput);
  if (direct) return direct;
  const hso = out.hookSpecificOutput;
  if (hso && typeof hso === "object") {
    return readCommand((hso as Record<string, unknown>).updatedInput);
  }
  return null;
}

/**
 * Extract a PreToolUse deny reason from an scm-guard result. The core script
 * emits the `claude` dialect (`hookSpecificOutput.permissionDecision: "deny"`
 * + `permissionDecisionReason`); a top-level `permission: "deny"` +
 * `user_message`/`reason` is also accepted for dialect resilience.
 */
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

/** Join the text parts of a chat.message output into the user's prompt text. */
function extractPromptText(output: {
  message?: unknown;
  parts?: Array<{ type?: string; text?: string }>;
}): string {
  const parts = Array.isArray(output.parts) ? output.parts : [];
  const texts = parts
    .filter((p) => p && p.type === "text" && typeof p.text === "string")
    .map((p) => p.text as string);
  if (texts.length > 0) return stripWrappingQuotes(texts.join("\n"));
  // Defensive fallback: some builds may surface text on the message object.
  const msg = output.message as { text?: unknown } | undefined;
  if (msg && typeof msg.text === "string") return stripWrappingQuotes(msg.text);
  return "";
}

/**
 * `opencode run "<prompt>"` delivers the part text wrapped in literal double
 * quotes (`"work: …"`), which defeats keyword detection anchored at the prompt
 * start. A prompt that is entirely enclosed in one matching pair of quotes is
 * that CLI artifact — unwrap exactly one pair; interior quotes are untouched.
 */
function stripWrappingQuotes(text: string): string {
  const t = text.trim();
  if (t.length >= 2 && t.startsWith('"') && t.endsWith('"')) {
    return t.slice(1, -1);
  }
  return t;
}

// ── Per-session bridge state ──────────────────────────────────
//
// opencode plugins are loaded once per server process, so module-level maps
// persist across a session's handler invocations. Both maps are keyed by the
// opencode sessionID and bounded so a long-lived server cannot leak memory
// across many sessions.

const MAX_TRACKED_SESSIONS = 256;

/**
 * Context computed on chat.message, awaiting injection by the system-prompt
 * transform. Overwrite-per-session: each chat.message replaces the entry
 * (with `""` when nothing matched), so the transform never injects stale
 * context and a peek does not need to consume.
 */
const pendingContext = new Map<string, string>();

/**
 * Consecutive session.idle re-entries per session, reset by any chat.message.
 * A runaway backstop only — persistent-mode's reinforcement cap terminates the
 * loop first under normal operation.
 */
const idleReentryCount = new Map<string, number>();
const MAX_CONSECUTIVE_IDLE_REENTRIES = 50;

/** Set a bounded map entry, evicting the oldest key when over capacity. */
function setBounded<V>(map: Map<string, V>, key: string, value: V): void {
  if (map.has(key)) map.delete(key);
  map.set(key, value);
  while (map.size > MAX_TRACKED_SESSIONS) {
    const oldest = map.keys().next().value;
    if (oldest === undefined) break;
    map.delete(oldest);
  }
}

/**
 * Minimal structural view of the opencode SDK client used for loop re-entry.
 * Kept optional and dependency-free; the real client is a superset.
 */
type OmaOpencodeClient = {
  session?: {
    prompt?: (options: {
      path: { id: string };
      body: { parts: Array<{ type: "text"; text: string }> };
    }) => Promise<unknown>;
  };
};

/**
 * oh-my-agent opencode plugin.
 *
 * Structural shape satisfies the opencode `Plugin` contract without importing
 * @opencode-ai/plugin, keeping this bridge dependency-free in the user's
 * project. Handlers mutate their `output` argument (return values are ignored).
 *
 * @satisfies Plugin
 */
export default (async ({
  directory,
  client,
}: {
  directory?: string;
  client?: OmaOpencodeClient;
}) => {
  const cwd = directory ?? process.cwd();

  return {
    /**
     * chat.message ← UserPromptSubmit
     *
     * Runs keyword-detector (workflow activation) and skill-injector (context
     * injection), then stashes the concatenated context for this session so
     * `experimental.chat.system.transform` can inject it. Forwards the opencode
     * sessionID so persistent-workflow state is written session-scoped.
     */
    "chat.message": async (
      input: { sessionID?: string },
      output: {
        message?: unknown;
        parts?: Array<{ type?: string; text?: string }>;
      },
    ): Promise<void> => {
      const sessionID = input.sessionID ?? "";
      // A genuine user turn resets the runaway idle backstop.
      if (sessionID) idleReentryCount.delete(sessionID);

      const prompt = extractPromptText(output);
      const payload = {
        prompt,
        cwd,
        sessionId: sessionID,
        hook_event_name: "UserPromptSubmit",
      };

      const parts: string[] = [];
      const kd = extractAdditionalContext(
        runCore("keyword-detector.ts", payload, cwd),
      );
      if (kd) parts.push(kd);
      const si = extractAdditionalContext(
        runCore("skill-injector.ts", payload, cwd),
      );
      if (si) parts.push(si);

      // Overwrite per session — even with "" — so the transform reflects this
      // turn's detection and never re-injects a previous turn's context.
      if (sessionID) setBounded(pendingContext, sessionID, parts.join("\n\n"));
    },

    /**
     * experimental.chat.system.transform ← context injection
     *
     * Peeks (non-consuming) the context stashed by chat.message for this
     * session and appends it to the system prompt. chat.message runs before the
     * system transform within a turn; peeking keeps injection idempotent across
     * multiple model calls in a turn and prevents an ordering race from
     * permanently dropping context (the stash is refreshed every chat.message).
     */
    "experimental.chat.system.transform": async (
      input: { sessionID?: string },
      output: { system?: string[] },
    ): Promise<void> => {
      const sessionID = input.sessionID;
      if (!sessionID) return;
      const ctx = pendingContext.get(sessionID);
      if (ctx && Array.isArray(output.system)) {
        output.system.push(ctx);
      }
    },

    /**
     * tool.execute.before ← PreToolUse (bash)
     *
     * `input.tool` is a plain string and the command lives on
     * `output.args.command`. First runs scm-guard — throwing is opencode's
     * documented mechanism for blocking a tool call, so a deny becomes a
     * `throw` (this is the ONE deliberate non-fail-open path in this bridge).
     * Then runs the OMA test-filter for bash commands to rewrite test-runner
     * invocations so only failures reach the model, and writes the rewritten
     * command back. Non-bash tools pass through unchanged.
     */
    "tool.execute.before": async (
      input: { tool?: string },
      output: { args?: { command?: string } },
    ): Promise<void> => {
      if (input.tool !== "bash") return;
      const command = output.args?.command;
      if (typeof command !== "string" || !command) return;

      const denyReason = extractDenyReason(
        runCore(
          "scm-guard.ts",
          {
            tool_name: "Bash",
            tool_input: { command },
            cwd,
            hook_event_name: "PreToolUse",
          },
          cwd,
        ),
      );
      if (denyReason) throw new Error(denyReason);

      const updated = extractUpdatedCommand(
        runCore(
          "test-filter.ts",
          {
            tool_name: "Bash",
            tool_input: { command },
            cwd,
            hook_event_name: "PreToolUse",
          },
          cwd,
        ),
      );
      if (updated && output.args) {
        output.args.command = updated;
      }
    },

    /**
     * event: "session.idle" ← Stop (BEST-EFFORT / re-entrant)
     *
     * opencode delivers session.idle over the event bus (it is no longer a
     * top-level hook). Unlike the Claude `Stop` hook this cannot block
     * termination, but the SDK client lets us re-enter the loop: run
     * persistent-mode and, if a persistent workflow is still active (block
     * decision), post the block reason back as a new prompt so the agent
     * continues.
     *
     * BEST-EFFORT: every step is wrapped so a failure can never throw into
     * opencode. persistent-mode's own reinforcement cap (5) terminates the
     * loop under normal operation; the per-session consecutive-idle counter is
     * a runaway backstop for pathological cases only.
     */
    event: async (input: {
      event?: { type?: string; properties?: Record<string, unknown> };
    }): Promise<void> => {
      const event = input.event;
      if (event?.type !== "session.idle") return;
      const sessionID = (event.properties as { sessionID?: string } | undefined)
        ?.sessionID;
      if (!sessionID) return;

      const count = idleReentryCount.get(sessionID) ?? 0;
      if (count >= MAX_CONSECUTIVE_IDLE_REENTRIES) return;

      const pm = runCore(
        "persistent-mode.ts",
        { cwd, sessionId: sessionID, hook_event_name: "Stop" },
        cwd,
      );

      if (pm?.decision !== "block") {
        // Workflow complete / not active — clear the backstop counter.
        idleReentryCount.delete(sessionID);
        return;
      }

      const reason =
        typeof pm.reason === "string" && pm.reason
          ? pm.reason
          : "The active OMA workflow is not complete. Continue executing it.";
      idleReentryCount.set(sessionID, count + 1);

      try {
        await client?.session?.prompt?.({
          path: { id: sessionID },
          body: { parts: [{ type: "text", text: reason }] },
        });
      } catch {
        // Best-effort re-entry — never throw into opencode.
      }
    },
  };
}) satisfies (ctx: {
  directory?: string;
  client?: OmaOpencodeClient;
}) => Promise<{
  "chat.message": (
    input: { sessionID?: string },
    output: {
      message?: unknown;
      parts?: Array<{ type?: string; text?: string }>;
    },
  ) => Promise<void>;
  "experimental.chat.system.transform": (
    input: { sessionID?: string },
    output: { system?: string[] },
  ) => Promise<void>;
  "tool.execute.before": (
    input: { tool?: string },
    output: { args?: { command?: string } },
  ) => Promise<void>;
  event: (input: {
    event?: { type?: string; properties?: Record<string, unknown> };
  }) => Promise<void>;
}>;
