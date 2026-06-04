import type { RuntimeVendor } from "./types.js";

const SUPPORTED_RUNTIME_VENDORS = new Set<RuntimeVendor>([
  "claude",
  "codex",
  "gemini",
  "cursor",
  "antigravity",
  "qwen",
  "grok",
  "kiro",
  "pi",
]);

export function detectRuntimeVendor(
  env: NodeJS.ProcessEnv = process.env,
): RuntimeVendor {
  const explicit = env.OMA_RUNTIME_VENDOR?.trim().toLowerCase();
  if (explicit && SUPPORTED_RUNTIME_VENDORS.has(explicit as RuntimeVendor)) {
    return explicit as RuntimeVendor;
  }

  if (Object.keys(env).some((key) => key.startsWith("CLAUDE_CODE_"))) {
    return "claude";
  }
  if (env.CLAUDECODE === "1") {
    return "claude";
  }
  if (env.CODEX_THREAD_ID || env.CODEX_CI) {
    return "codex";
  }
  if (
    Object.keys(env).some((key) => key.startsWith("GEMINI_CLI_")) ||
    env.GEMINI_CLI === "1"
  ) {
    return "gemini";
  }
  if (
    Object.keys(env).some((key) => key.startsWith("ANTIGRAVITY_")) ||
    env.ANTIGRAVITY_IDE === "1"
  ) {
    return "antigravity";
  }
  if (
    Object.keys(env).some((key) => key.startsWith("QWEN_CODE_")) ||
    env.QWEN_CODE === "1"
  ) {
    return "qwen";
  }

  if (env.GROK_WORKSPACE_ROOT || env.GROK_SESSION_ID || env.GROK_BUILD) {
    return "grok";
  }

  if (env.KIRO_SESSION_ID || env.KIRO_CHAT_LOG_FILE || env.KIRO_HOME) {
    return "kiro";
  }

  if (env.PI_CODING_AGENT === "true" || env.PI_CODING_AGENT === "1") {
    return "pi";
  }

  /**
   * Cursor IDE integrated terminal / agent-exec sandbox / explicit CLI shim.
   * Headless invocation is always `cursor agent -p …` — not top-level `cursor -p`.
   */
  if (
    env.CURSOR_AGENT === "1" ||
    env.CURSOR_CLI === "1" ||
    typeof env.CURSOR_TRACE_ID === "string"
  ) {
    return "cursor";
  }

  return "unknown";
}
