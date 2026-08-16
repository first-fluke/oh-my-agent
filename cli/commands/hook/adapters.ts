// Raw stdin → HookInput normalisation — design 019, Section 2.
// Converts the vendor-native JSON payload from stdin into the canonical
// HookInput discriminated union understood by handlers.

import {
  agyConversationId,
  agyProjectDir,
  isAgyInput,
  readAgyPrompt,
} from "../../../.agents/hooks/core/agy-input.js";
import { normalizePromptInput } from "../../../.agents/hooks/core/prompt-input.js";
import type { HookInput, Vendor } from "./types.js";

// ---------------------------------------------------------------------------
// nativeEventToKind — maps (vendor, nativeEvent) → HookInput["kind"] | null.
//
// This table is the single source of truth for which native hook event names
// map to which canonical HookInput kind.  A null return means the event is
// not handled by the oma hook dispatch path (e.g. statusLine events).
//
// Vendor → event kind mapping (sourced from variant JSONs and vendor docs):
//
// prompt  : UserPromptSubmit (claude, codex, grok, qwen, antigravity)
//           BeforeAgent      (gemini)
//           beforeSubmitPrompt (cursor)
//           PreInvocation    (antigravity)
//           userPromptSubmit  (kiro)
//           (commandcode has NO prompt event — only PreToolUse/PostToolUse/
//            Stop per commandcode.ai/docs/hooks/reference)
//
// pre_tool: PreToolUse  (claude, codex, qwen)
//           BeforeTool  (gemini)
//           preToolUse  (kiro)
//           (antigravity has no pre_tool registration — agy's hook output is
//            allow/deny/ask only, so the test-filter rewrite cannot apply)
//
// stop    : Stop        (claude, codex, commandcode, grok, qwen, antigravity)
//           stop        (kiro — lowercase, per kiro.json)
//           AfterAgent  (gemini)
//
// session-start (routed through the prompt pipeline so serena-primer /
// state-boundary — both guarded on kind==="prompt", both no-op on an empty
// prompt — inject once-per-session context):
//           SessionStart (claude, commandcode)
//           sessionStart (cursor)
//   claude's SessionStart fires on startup|resume|clear|compact and supports
//   hookSpecificOutput.additionalContext + reloadSkills (code.claude.com/docs/
//   en/hooks), so it re-primes serena + re-injects the OMA state snapshot when
//   a session begins. (PostCompact is NOT adopted: the docs list it as "no
//   decision control", with no additionalContext support — the documented
//   post-compaction context path is SessionStart's `compact` matcher.)
//   Other vendors register SessionStart for HUD/status-line only (e.g. gemini),
//   so the mapping is vendor-scoped and stays null for them.
// ---------------------------------------------------------------------------

export function nativeEventToKind(
  vendor: Vendor,
  nativeEvent: string,
): HookInput["kind"] | null {
  switch (nativeEvent) {
    // prompt events
    case "UserPromptSubmit":
    case "BeforeAgent":
    case "beforeSubmitPrompt":
    case "PreInvocation":
    case "userPromptSubmit":
      return "prompt";

    // session-start context injection — only for vendors that wire it as a
    // handler event (claude / commandcode / cursor). HUD-only SessionStart
    // (gemini) → null.
    case "SessionStart":
    case "sessionStart":
      return vendor === "claude" ||
        vendor === "commandcode" ||
        vendor === "cursor"
        ? "prompt"
        : null;

    // pre_tool events
    case "PreToolUse":
    case "BeforeTool":
    case "preToolUse":
      return "pre_tool";

    // post_tool events — refactor-guard (claude PostToolUse; other vendors
    // opt in by registering the event in their variant JSON). gemini's
    // AfterTool stays null: it is HUD-only (see adapters.test NULL_ALLOWLIST).
    // "postToolUse" is kiro's lowercase-camel spelling (mirrors preToolUse).
    case "PostToolUse":
    case "postToolUse":
      return "post_tool";

    // cursor's file-edit event — preferred over its generic postToolUse for
    // the refactor-guard recorder because the payload carries a documented
    // top-level `file_path` (postToolUse tool_input shape is tool-specific).
    case "afterFileEdit":
      return vendor === "cursor" ? "post_tool" : null;

    // stop events — "stop" (lowercase) is kiro's native event name (kiro.json)
    case "Stop":
    case "stop":
    case "AfterAgent":
      return "stop";

    default:
      return null;
  }
}

// ---------------------------------------------------------------------------
// normalizeInput — parse raw stdin JSON from the vendor hook invocation and
// produce a canonical HookInput, or null if the event is unrecognised /
// the payload is malformed.
//
// Per-vendor field mapping:
//
//   claude  : prompt → .prompt; cwd → .cwd; tool → .tool_name/.tool_input;
//             session → .sessionId
//   codex   : prompt → .prompt; cwd → .cwd; tool → .tool_name/.tool_input;
//             session → .session_id (snake_case, no camelCase sessionId)
//   cursor  : prompt → .prompt; cwd → .cwd; tool → .tool_name/.tool_input
//   gemini  : prompt → .prompt; cwd → env GEMINI_PROJECT_DIR / .workspace_roots[0];
//             tool → .tool_name/.tool_input
//   grok    : prompt → .prompt; cwd → env GROK_WORKSPACE_ROOT / .cwd
//   kiro    : prompt → .prompt; cwd → env KIRO_PROJECT_DIR / .cwd;
//             hook event in .hook_event_name or .hookEventName
//   qwen    : prompt → .prompt; cwd → env QWEN_PROJECT_DIR / .cwd
//   antigravity: prompt recovered via readAgyPrompt(.transcriptPath);
//             cwd → agyProjectDir (first of .workspacePaths) or env
// ---------------------------------------------------------------------------

export function normalizeInput(
  vendor: Vendor,
  nativeEvent: string,
  raw: string,
): HookInput | null {
  const kind = nativeEventToKind(vendor, nativeEvent);
  if (!kind) return null;

  let payload: Record<string, unknown> = {};
  if (raw.trim()) {
    try {
      payload = JSON.parse(raw) as Record<string, unknown>;
    } catch {
      return null;
    }
  }

  // ── cwd resolution — vendor-specific field precedence ──────────────────
  const cwd = resolveCwd(vendor, payload);

  switch (kind) {
    case "prompt": {
      const prompt = resolvePrompt(vendor, payload);
      // SessionStart carries `source` (startup|resume|clear|compact); thread
      // it through so session-once handlers can force re-injection on compact
      // (compaction keeps the session id, defeating their normal dedup).
      const source =
        typeof payload.source === "string" ? payload.source : undefined;
      return source
        ? { kind: "prompt", prompt, cwd, source }
        : { kind: "prompt", prompt, cwd };
    }
    case "pre_tool": {
      const toolName = resolveToolName(vendor, payload);
      const toolInput = resolveToolInput(vendor, payload);
      return { kind: "pre_tool", toolName, toolInput, cwd };
    }
    case "post_tool": {
      // cursor afterFileEdit carries no tool_name and a TOP-LEVEL file_path
      // (cursor.com/docs/hooks); synthesize the canonical edit-tool shape so
      // handlers stay payload-agnostic.
      if (nativeEvent === "afterFileEdit") {
        const filePath =
          typeof payload.file_path === "string" ? payload.file_path : "";
        return {
          kind: "post_tool",
          toolName: "Edit",
          toolInput: filePath ? { file_path: filePath } : {},
          cwd,
        };
      }
      // antigravity nests the tool call: {toolCall: {name, args}} (camelCase,
      // verified against the agy 1.1.13 binary's embedded hook docs).
      const toolCall = payload.toolCall as
        | { name?: unknown; args?: unknown }
        | undefined;
      if (toolCall && typeof toolCall.name === "string") {
        return {
          kind: "post_tool",
          toolName: toolCall.name,
          toolInput:
            (toolCall.args as Record<string, unknown> | undefined) ?? {},
          cwd,
        };
      }
      const toolName = resolveToolName(vendor, payload);
      const toolInput = resolveToolInput(vendor, payload);
      const toolResponse =
        (payload.tool_response as Record<string, unknown> | undefined) ??
        (payload.toolResponse as Record<string, unknown> | undefined);
      return toolResponse
        ? { kind: "post_tool", toolName, toolInput, toolResponse, cwd }
        : { kind: "post_tool", toolName, toolInput, cwd };
    }
    case "stop": {
      // Gather assistant/response/transcript text so persistent-mode can honor
      // "workflow done" deactivation through the central dispatch path.
      const responseText = [
        payload.prompt_response,
        payload.response,
        payload.content,
        payload.message,
        payload.transcript,
      ]
        .filter((v): v is string => typeof v === "string")
        .join(" ");
      return {
        kind: "stop",
        cwd,
        responseText: responseText || undefined,
      };
    }
  }
}

/**
 * Extract a stable session id from the vendor payload so handlers can isolate
 * per-session state (persistent-mode, skill injection, state-boundary). Without
 * this every invocation defaults to "unknown" and shares state across sessions.
 *
 * Field precedence: agy conversationId → `sessionId` → `session_id` →
 * `conversationId` / `conversation_id`.
 */
export function extractSessionId(
  vendor: Vendor,
  raw: string,
): string | undefined {
  if (!raw.trim()) return undefined;
  let payload: Record<string, unknown>;
  try {
    payload = JSON.parse(raw) as Record<string, unknown>;
  } catch {
    return undefined;
  }
  if (vendor === "antigravity" && isAgyInput(payload)) {
    const conv = agyConversationId(payload);
    if (conv) return conv;
  }
  const cand =
    payload.sessionId ??
    payload.session_id ??
    payload.conversationId ??
    payload.conversation_id;
  return typeof cand === "string" && cand.length > 0 ? cand : undefined;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Resolve the project working directory from the vendor payload.
 *
 * Priority per vendor:
 *   antigravity : agyProjectDir (workspacePaths[0]) → env → ""
 *   gemini      : workspace_roots[0] → env GEMINI_PROJECT_DIR → ""
 *   grok        : env GROK_WORKSPACE_ROOT → payload.cwd → ""
 *   kiro        : env KIRO_PROJECT_DIR → payload.cwd → ""
 *   qwen        : env QWEN_PROJECT_DIR → payload.cwd → ""
 *   others      : payload.cwd → ""
 */
function resolveCwd(vendor: Vendor, payload: Record<string, unknown>): string {
  switch (vendor) {
    case "antigravity": {
      // isAgyInput guard: if the raw payload looks like an agy envelope, use it.
      if (isAgyInput(payload)) {
        return (
          agyProjectDir(payload) ||
          (payload.cwd as string | undefined) ||
          process.env.ANTIGRAVITY_PROJECT_DIR ||
          process.env.AGY_PROJECT_DIR ||
          process.env.GEMINI_PROJECT_DIR ||
          ""
        );
      }
      return (
        (payload.cwd as string | undefined) ||
        process.env.ANTIGRAVITY_PROJECT_DIR ||
        process.env.AGY_PROJECT_DIR ||
        process.env.GEMINI_PROJECT_DIR ||
        ""
      );
    }
    case "grok": {
      return (
        process.env.GROK_WORKSPACE_ROOT ||
        (payload.cwd as string | undefined) ||
        ""
      );
    }
    case "kiro": {
      return (
        process.env.KIRO_PROJECT_DIR ||
        (payload.cwd as string | undefined) ||
        ""
      );
    }
    case "qwen": {
      return (
        process.env.QWEN_PROJECT_DIR ||
        (payload.cwd as string | undefined) ||
        ""
      );
    }
    default: {
      // claude, codex, cursor, pi
      return (payload.cwd as string | undefined) || "";
    }
  }
}

/**
 * Resolve the user prompt text from the vendor payload.
 *
 * antigravity: recover from transcript via readAgyPrompt(.transcriptPath).
 *              Skip if invocationNum > 1 (mid-turn re-invocation).
 * all others : payload.prompt — a string, or a ContentPart[] array (Kimi
 *              delivers [{type:"text",text}] parts), normalized to text.
 */
function resolvePrompt(
  vendor: Vendor,
  payload: Record<string, unknown>,
): string {
  if (vendor === "antigravity") {
    // agy's PreInvocation fires before every model call; only act on the first
    // invocation of a user turn to avoid re-running keyword detection mid-turn.
    const invocationNum = payload.invocationNum;
    if (typeof invocationNum === "number" && invocationNum > 1) {
      return "";
    }
    // agy carries no `prompt` field — recover from transcript
    if (isAgyInput(payload)) {
      return readAgyPrompt(payload.transcriptPath) || "";
    }
    // Fallback: some agy PreInvocation payloads may include prompt directly
    return normalizePromptInput(payload.prompt);
  }

  return normalizePromptInput(payload.prompt);
}

/**
 * Resolve the tool name from the vendor payload.
 *
 * claude/codex/qwen/antigravity/grok/kiro : .tool_name (snake_case)
 * gemini                                  : .tool_name
 * cursor                                  : .tool_name or .toolName
 * kiro                                    : .tool_name or .toolName (kiro uses camelCase variants)
 */
function resolveToolName(
  _vendor: Vendor,
  payload: Record<string, unknown>,
): string {
  return (
    (payload.tool_name as string | undefined) ??
    (payload.toolName as string | undefined) ??
    ""
  );
}

/**
 * Resolve the tool input object from the vendor payload.
 *
 * Most vendors: .tool_input (snake_case object)
 * kiro/cursor: may use .toolInput (camelCase)
 */
function resolveToolInput(
  _vendor: Vendor,
  payload: Record<string, unknown>,
): Record<string, unknown> {
  return (
    (payload.tool_input as Record<string, unknown> | undefined) ??
    (payload.toolInput as Record<string, unknown> | undefined) ??
    {}
  );
}

// Re-export agy helpers so callers that need them can import from one place.
export { agyConversationId, agyProjectDir, isAgyInput, readAgyPrompt };
