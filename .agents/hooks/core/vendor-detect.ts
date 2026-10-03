// Shared vendor-detection helpers for the core hook handlers.
//
// Previously each handler (keyword-detector, state-boundary, skill-injector,
// code-intelligence-primer, persistent-mode, test-filter) carried its own copy
// of these functions, which drifted (different vendor subsets). They live here
// once and every handler imports them. The event-name → vendor mapping is
// hook-kind-specific (prompt/tool/stop), so detectVendorFromInput keeps one
// precedence list per kind.

import { join } from "node:path";
import { agyProjectDir, isAgyInput } from "./agy-input.ts";
import { resolveProjectRoot } from "./fs-utils.ts";
import type { Vendor } from "./types.ts";

/**
 * Infer the vendor from the installed script path (`import.meta.filename` of the
 * running handler). Returns null when the path matches no known vendor hook dir.
 * agy lives under `.gemini/antigravity-cli/hooks/` and must be checked before the
 * bare `.gemini/hooks/` case (which no longer exists post Gemini-CLI removal).
 */
export function inferVendorFromScriptPath(scriptPath: string): Vendor | null {
  if (scriptPath.includes(`${join(".gemini", "antigravity-cli", "hooks")}`))
    return "antigravity";
  if (scriptPath.includes(`${join(".cursor", "hooks")}`)) return "cursor";
  if (scriptPath.includes(`${join(".qwen", "hooks")}`)) return "qwen";
  if (scriptPath.includes(`${join(".claude", "hooks")}`)) return "claude";
  if (scriptPath.includes(`${join(".codex", "hooks")}`)) return "codex";
  if (scriptPath.includes(`${join(".grok", "hooks")}`)) return "grok";
  if (scriptPath.includes(`${join(".kiro", "hooks")}`)) return "kiro";
  if (scriptPath.includes(`${join(".kimi-code", "hooks")}`)) return "kimi";
  // pi auto-loads the bridge from `.pi/extensions/oma/`; core scripts are copied
  // alongside it and spawned as subprocesses from there.
  if (scriptPath.includes(`${join(".pi", "extensions")}`)) return "pi";
  return null;
}

/** Which hook payload a standalone handler parses. */
export type HookPayloadKind = "prompt" | "tool" | "stop";

/**
 * Vendor of a raw hook payload, for standalone runs (`oma hook run` passes
 * --vendor explicitly). Each kind keeps its own precedence because vendors
 * name the same event differently (UserPromptSubmit vs userPromptSubmit vs
 * PreInvocation, ...). `scriptPath` is the calling handler's
 * `import.meta.filename`; prompt hooks trust their install dir first and tool
 * hooks recognize the pi bridge dir.
 */
export function detectVendorFromInput(
  input: Record<string, unknown>,
  kind: HookPayloadKind,
  scriptPath: string,
): Vendor {
  const event = input.hook_event_name as string | undefined;
  const hookEventName = input.hookEventName as string | undefined;
  const env = process.env;
  // Codex sends snake_case session_id; Claude sends camelCase sessionId.
  const codexSessionShape = "session_id" in input && !("sessionId" in input);

  if (kind === "prompt") {
    const byScriptPath = inferVendorFromScriptPath(scriptPath);
    if (byScriptPath) return byScriptPath;
    // agy sends no hook_event_name; detect it by its stdin shape.
    if (isAgyInput(input)) return "antigravity";
    if (env.GROK_WORKSPACE_ROOT) return "grok";
    if (
      env.KIRO_PROJECT_DIR ||
      event === "userPromptSubmit" ||
      hookEventName === "userPromptSubmit"
    ) {
      return "kiro";
    }
    if (event === "PreInvocation") return "antigravity";
    if (event === "beforeSubmitPrompt") return "cursor";
    if (event === "UserPromptSubmit" && codexSessionShape) return "codex";
  } else if (kind === "stop") {
    if (env.GROK_WORKSPACE_ROOT) return "grok";
    if (env.KIRO_PROJECT_DIR || event === "stop" || hookEventName === "stop") {
      return "kiro";
    }
    if (isAgyInput(input)) return "antigravity";
    if (event === "Stop" && env.ANTIGRAVITY_PROJECT_DIR) return "antigravity";
    if (event === "Stop" && codexSessionShape) return "codex";
  } else {
    // pi spawns tool hooks from `.pi/extensions/oma/`; trust that path.
    if (scriptPath.includes(join(".pi", "extensions"))) return "pi";
    if (env.GROK_WORKSPACE_ROOT) return "grok";
    if (env.KIRO_PROJECT_DIR) return "kiro";
    if (event === "preToolUse" || hookEventName === "preToolUse") return "kiro";
    if (event === "PreToolUse" && env.ANTIGRAVITY_PROJECT_DIR) {
      return "antigravity";
    }
    if (event === "PreToolUse" && codexSessionShape) return "codex";
  }
  // Qwen Code sets QWEN_PROJECT_DIR; Claude sets CLAUDE_PROJECT_DIR.
  if (env.QWEN_PROJECT_DIR) return "qwen";
  return "claude";
}

/** Resolve the OMA project root for a vendor + raw hook input. */
export function getProjectDir(
  vendor: Vendor,
  input: Record<string, unknown>,
): string {
  let dir: string;
  switch (vendor) {
    case "codex":
    case "cursor":
      dir = (input.cwd as string) || process.cwd();
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
  return resolveProjectRoot(dir);
}

/**
 * Vendor → hooks directory (relative to the project root) where vendor scripts
 * like `filter-test-output.sh` are materialized by the installer. MUST mirror
 * the `hookDir` field of `.agents/hooks/variants/<vendor>.json`; locked by the
 * contract test `cli/commands/hook/vendor-wiring.test.ts`.
 */
export function getHookDir(vendor: Vendor): string {
  switch (vendor) {
    case "claude":
      return ".claude/hooks";
    case "codex":
      return ".codex/hooks";
    case "commandcode":
      return ".commandcode/hooks";
    case "cursor":
      return ".cursor/hooks";
    case "antigravity":
      // agy has no project hook dir — its `.agents/hooks.json` runs handlers
      // straight from the SSOT core dir, where filter-test-output.sh lives.
      return ".agents/hooks/core";
    case "qwen":
      return ".qwen/hooks";
    case "grok":
      return ".grok/hooks";
    case "kiro":
      return ".kiro/hooks";
    case "kimi":
      // Kimi Code CLI is global-only (homeOnly variant): runtime hooks live in
      // ~/.kimi-code/hooks, so there is no project hook dir. Mirror antigravity
      // and point at the SSOT core dir; otherwise the rewrite no-ops gracefully.
      return ".agents/hooks/core";
    case "pi":
      // pi keeps the core scripts inside the bridge's directory extension.
      return join(".pi", "extensions", "oma");
  }
}
