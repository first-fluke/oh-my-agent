/**
 * oh-my-agent — opencode (Sst opencode) plugin bridge.
 *
 * SSOT source. At install time `installOpencodePlugin` copies this file to
 * `.opencode/plugins/oma/oma.ts` alongside the core hook scripts. opencode
 * auto-discovers plugins under each `.opencode/plugins` subdirectory.
 *
 * Why a bridge instead of a per-vendor variants JSON entry: opencode does NOT
 * register settings-file hooks like the other vendors. It loads in-process
 * TypeScript plugins and dispatches plugin event handlers. So rather than the
 * generic `installHooksFromVariant` path (events → settings file → `bun
 * <script>` subprocess), opencode gets this thin shim that maps opencode
 * lifecycle events onto oma's existing, vendor-agnostic core scripts via
 * subprocess. All matching logic stays in the core scripts.
 *
 * Intentionally dependency-free (no @opencode-ai/plugin import) so this file
 * works in any user project without requiring opencode as a dev dependency.
 * The `Plugin` type is satisfied structurally via JSDoc.
 *
 * Event mapping:
 *   chat.message        ← UserPromptSubmit  (keyword-detector + skill-injector)
 *   tool.execute.before ← PreToolUse        (test-filter for bash tools)
 *   session.idle        ← Stop              BEST-EFFORT / NON-BLOCKING
 *                         opencode's session.idle is a notification-only event
 *                         that fires when the session has no pending work. It
 *                         is the closest analog to the Claude `Stop` hook but
 *                         cannot block the session from terminating. Persistent
 *                         workflow Stop semantics are therefore DEGRADED under
 *                         opencode: the handler runs best-effort and must not
 *                         throw or block — if the underlying hook returns
 *                         non-zero or times out, the error is swallowed and
 *                         opencode proceeds normally.
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
 * every other vendor.
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
 * Run an oma core hook script best-effort: like runCore but swallows all
 * errors and never throws. Used for session.idle (Stop equivalent) where
 * throwing would surface as an unhandled rejection inside opencode.
 */
function runCoreBestEffort(
  script: string,
  payload: Record<string, unknown>,
  cwd: string,
): void {
  try {
    runCore(script, payload, cwd);
  } catch {
    // Non-zero exit or parse error — swallow silently (Stop degraded semantics).
  }
}

/**
 * oh-my-agent opencode plugin.
 *
 * Structural shape satisfies the opencode `Plugin` contract without importing
 * @opencode-ai/plugin, keeping this bridge dependency-free in the user's
 * project.
 *
 * @satisfies Plugin
 */
export default (async ({ $ }: { $: { cwd: string } }) => {
  const cwd = $.cwd ?? process.cwd();

  return {
    /**
     * chat.message ← UserPromptSubmit
     *
     * Invoked when the user submits a new message to the chat. Runs the OMA
     * keyword-detector (workflow activation) and skill-injector (context
     * injection) and appends any resulting context to the system prompt for
     * this turn.
     */
    "chat.message": async (event: {
      message?: { content?: string };
      session?: { systemPrompt?: string };
    }) => {
      const prompt = event.message?.content ?? "";
      const payload = {
        prompt,
        cwd,
        hook_event_name: "UserPromptSubmit",
      };

      const parts: string[] = [];

      const kd = runCore("keyword-detector.ts", payload, cwd);
      if (kd && typeof kd.additionalContext === "string") {
        parts.push(kd.additionalContext);
      }

      const si = runCore("skill-injector.ts", payload, cwd);
      if (si && typeof si.additionalContext === "string") {
        parts.push(si.additionalContext);
      }

      if (parts.length === 0) return undefined;

      const existing = event.session?.systemPrompt ?? "";
      return {
        session: {
          systemPrompt: existing
            ? `${existing}\n\n${parts.join("\n\n")}`
            : parts.join("\n\n"),
        },
      };
    },

    /**
     * tool.execute.before ← PreToolUse (Bash)
     *
     * Invoked before a tool call is executed. Runs the OMA test-filter for
     * bash/shell tools to rewrite test-runner commands so only failures reach
     * the model. Non-bash tools are passed through unchanged.
     */
    "tool.execute.before": async (event: {
      tool?: { name?: string };
      input?: { command?: string };
    }) => {
      const toolName = event.tool?.name ?? "";
      if (toolName !== "bash" && toolName !== "Bash") return undefined;

      const command = event.input?.command;
      if (!command) return undefined;

      const tf = runCore(
        "test-filter.ts",
        {
          tool_name: "Bash",
          tool_input: { command },
          cwd,
          hook_event_name: "PreToolUse",
        },
        cwd,
      );

      const updated = (tf?.updatedInput as { command?: string } | undefined)
        ?.command;
      if (updated && event.input) {
        event.input.command = updated;
      }

      return undefined;
    },

    /**
     * session.idle ← Stop (BEST-EFFORT / NON-BLOCKING)
     *
     * Invoked when the session has no pending work. This is the nearest
     * opencode analog to the Claude `Stop` hook but it CANNOT block session
     * termination — opencode treats it as a notification-only event.
     *
     * Persistent-workflow Stop semantics are therefore degraded: the handler
     * runs best-effort and any non-zero hook exit or thrown error is swallowed
     * so opencode can proceed normally. Do not rely on this handler to hold
     * the session open; keyword-detector re-injection on the next chat.message
     * event provides the fallback reinforcement path instead.
     */
    "session.idle": async (_event: unknown) => {
      // BEST-EFFORT: errors are swallowed — must not throw or block.
      runCoreBestEffort(
        "keyword-detector.ts",
        {
          cwd,
          hook_event_name: "Stop",
        },
        cwd,
      );
      return undefined;
    },
  };
}) satisfies (ctx: { $: { cwd: string } }) => Promise<{
  "chat.message": (event: unknown) => Promise<unknown>;
  "tool.execute.before": (event: unknown) => Promise<unknown>;
  "session.idle": (event: unknown) => Promise<unknown>;
}>;
