/**
 * oh-my-agent — pi (Earendil pi-coding-agent) hook bridge.
 *
 * SSOT source. At install time `installPiExtension` copies this file to
 * `.pi/extensions/oma/index.ts` alongside the core hook scripts. pi
 * auto-discovers it as a directory extension (`.pi/extensions/*​/index.ts`).
 *
 * Why a bridge instead of a `variants/*.json` entry: pi does NOT register
 * settings-file hooks like the other vendors. It loads in-process TS
 * extensions and dispatches `pi.on(event, handler)`. So rather than the
 * generic `installHooksFromVariant` path (events → settings file → `bun
 * <script>` subprocess), pi gets this thin shim that maps pi lifecycle events
 * onto oma's existing, vendor-agnostic core scripts via subprocess. All
 * matching logic stays in the core scripts; the per-vendor output dialect for
 * `"pi"` lives in `hook-output.ts`.
 *
 * Event mapping (see README.md):
 *   before_agent_start  ← UserPromptSubmit  (keyword-detector + skill-injector)
 *   tool_call (bash)    ← PreToolUse        (scm-guard + test-filter)
 *   agent_settled       ← Stop              (persistent-mode + re-entry)
 *
 * tool_call blocking: a handler that returns `{ block: true, reason }` blocks
 * the tool call (documented pi extension contract — see
 * badlogic/pi-mono packages/coding-agent/docs/extensions.md). scm-guard uses
 * this to deny `git add` of likely-secret files.
 *
 * persistent-mode: `agent_settled` fires once a run has fully settled (no
 * pending retry / compaction / queued continuation) — the pi analog of a Stop
 * hook. The bridge spawns `persistent-mode.ts` there; if it returns a `block`
 * decision, the bridge re-enters the loop with the reinforcement text via
 * `pi.sendUserMessage` (which always triggers a fresh turn). This event was
 * added after pi 0.78.1, so its registration is capability-guarded: on older
 * pi builds the handler is simply never emitted and persistent workflows
 * degrade to re-injection on the next user turn (the historical behavior).
 */

import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";

/** Absolute path to a core script copied next to this bridge at install time. */
function corePath(script: string): string {
  return fileURLToPath(new URL(`./${script}`, import.meta.url));
}

/**
 * Run an oma core hook script as a subprocess: feed it JSON on stdin, parse
 * its JSON stdout. Fail-open (returns null) on any error — a broken hook must
 * never block the agent. Spawns with `cwd` = pi's working directory so the
 * core scripts resolve the project (git) root the same way they do for every
 * other vendor.
 */
function runCore(
  script: string,
  payload: Record<string, unknown>,
): Record<string, unknown> | null {
  try {
    const res = spawnSync("bun", [corePath(script)], {
      input: JSON.stringify(payload),
      cwd: process.cwd(),
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

// Dedup: pi auto-discovers extensions from BOTH `~/.pi/agent/extensions/`
// (global) and `.pi/extensions/` (project). When oma is installed in both
// global and project mode, this module loads twice in the SAME pi process —
// a single globalThis guard registers handlers exactly once. (The shell
// HOOK_DEDUP_PREAMBLE other vendors use does not apply here: pi loads
// extensions in-process, not as shell-wrapped subprocesses.)
const guard = globalThis as { __OMA_PI_EXT_REGISTERED?: boolean };

// Prefix that persistent-mode.ts prepends to every reinforcement reason (see
// `.agents/hooks/core/persistent-mode.ts`). The bridge re-injects that reason
// as a user message, so it re-enters this extension as a `before_agent_start`
// event too — this sentinel lets the bridge tell its own re-entry turn apart
// from a genuine user prompt.
const REENTRY_SENTINEL = "[OMA PERSISTENT MODE:";

// Runaway backstop: hard ceiling on consecutive programmatic re-entries within
// a single pi process, reset on every genuine user turn. persistent-mode's own
// state file (5-reinforcement + staleness cap) is the primary terminator; this
// only defends against a pathological state file that never exhausts.
const MAX_REENTRIES = 50;

/** Read a stable per-session id from pi's context, or undefined if unavailable. */
function sessionIdOf(ctx: unknown): string | undefined {
  const sm = (ctx as { sessionManager?: { getSessionId?: () => string } })
    ?.sessionManager;
  try {
    const sid = sm?.getSessionId?.();
    return sid || undefined;
  } catch {
    return undefined;
  }
}

export default function omaHooks(pi: ExtensionAPI): void {
  if (guard.__OMA_PI_EXT_REGISTERED) return;
  guard.__OMA_PI_EXT_REGISTERED = true;

  // Consecutive programmatic re-entries since the last genuine user turn.
  let reentryCount = 0;

  // before_agent_start ← UserPromptSubmit.
  // Inject workflow + skill context into the system prompt for this turn.
  pi.on("before_agent_start", async (event, ctx) => {
    // A bridge-driven re-entry re-fires this event with the reinforcement text
    // as the prompt. Skip injection for it: re-running keyword-detector would
    // re-activate the workflow and reset persistent-mode's reinforcement cap,
    // defeating the primary terminator. A genuine user turn resets the backstop.
    if (event.prompt?.startsWith(REENTRY_SENTINEL)) return undefined;
    reentryCount = 0;

    const sessionId = sessionIdOf(ctx);
    const payload = {
      prompt: event.prompt ?? "",
      cwd: process.cwd(),
      hook_event_name: "UserPromptSubmit",
      // Thread the session id so keyword-detector's activateMode persists the
      // workflow state file (it refuses to write under an unknown session).
      ...(sessionId ? { sessionId } : {}),
    };

    // Order matches the Claude chain: keyword-detector first (it may activate
    // a persistent workflow), then skill-injector (it skips when one is
    // already active for the session).
    const parts: string[] = [];
    const kd = runCore("keyword-detector.ts", payload);
    if (kd && typeof kd.additionalContext === "string") {
      parts.push(kd.additionalContext);
    }
    const si = runCore("skill-injector.ts", payload);
    if (si && typeof si.additionalContext === "string") {
      parts.push(si.additionalContext);
    }

    if (parts.length === 0) return undefined;
    return { systemPrompt: `${event.systemPrompt}\n\n${parts.join("\n\n")}` };
  });

  // tool_call ← PreToolUse (Bash). scm-guard first: it denies `git add` of
  // likely-secret files by returning pi's documented `{ block: true, reason }`
  // shape. Then test-filter rewrites test-runner commands so only failures
  // reach the model. pi exposes `event.input` as mutable, so we rewrite the
  // command in place.
  pi.on("tool_call", async (event) => {
    if (event.toolName !== "bash") return undefined;
    const input = event.input as { command?: string } | undefined;
    const command = input?.command;
    if (!command) return undefined;

    const sg = runCore("scm-guard.ts", {
      tool_name: "Bash",
      tool_input: { command },
      cwd: process.cwd(),
      hook_event_name: "PreToolUse",
    });
    // The core script emits the claude dialect
    // (`hookSpecificOutput.permissionDecision: "deny"`).
    const hso = sg?.hookSpecificOutput as
      | { permissionDecision?: string; permissionDecisionReason?: string }
      | undefined;
    if (hso?.permissionDecision === "deny") {
      return {
        block: true,
        reason: hso.permissionDecisionReason ?? "Blocked by oma scm-guard.",
      };
    }

    const tf = runCore("test-filter.ts", {
      tool_name: "Bash",
      tool_input: { command },
      cwd: process.cwd(),
      hook_event_name: "PreToolUse",
    });

    const updated = (tf?.updatedInput as { command?: string } | undefined)
      ?.command;
    if (updated && input) input.command = updated;
    return undefined;
  });

  // agent_settled ← Stop. Persistent-mode re-entry: after a run fully settles,
  // ask persistent-mode.ts whether a workflow is still active; if so, re-enter
  // the loop with its reinforcement text. Capability-guarded — pi builds before
  // this event existed never emit it, so this is a no-op there (workflows then
  // degrade to next-user-turn re-injection, the historical behavior).
  try {
    pi.on("agent_settled", async (_event, ctx) => {
      try {
        if (reentryCount >= MAX_REENTRIES) return undefined;
        // Never re-enter while the user has queued input, and require the
        // re-entry API (absent on very old pi builds).
        if (ctx?.hasPendingMessages?.()) return undefined;
        if (typeof pi.sendUserMessage !== "function") return undefined;

        const sessionId = sessionIdOf(ctx);
        const pm = runCore("persistent-mode.ts", {
          cwd: process.cwd(),
          hook_event_name: "Stop",
          ...(sessionId ? { sessionId } : {}),
        });

        // persistent-mode classifies this subprocess as a generic vendor, so
        // the decision arrives as `{ decision: "block" }`; also accept pi's
        // native `{ block: true }` dialect for forward-compat.
        const blocked = pm?.decision === "block" || pm?.block === true;
        const reason = typeof pm?.reason === "string" ? pm.reason : undefined;
        if (!blocked || !reason) return undefined;

        reentryCount += 1;
        void pi.sendUserMessage(reason);
      } catch {
        // Best-effort: a broken persistent-mode must never wedge pi.
      }
      return undefined;
    });
  } catch {
    // pi build predates `agent_settled` — persistent-mode re-entry unavailable.
  }
}
