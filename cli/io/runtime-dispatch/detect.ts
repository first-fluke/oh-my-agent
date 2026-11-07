import { ConfigError } from "./config-error.js";
import type { RuntimeVendor } from "./types.js";

const SUPPORTED_RUNTIME_VENDORS = new Set<RuntimeVendor>([
  "claude",
  "codex",
  "cursor",
  "antigravity",
  "qwen",
  "grok",
  "kimi",
  "kiro",
  "opencode",
  "kilo",
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

  // Kilo Code exports KILO=1 plus KILO_RUN_ID / KILOCODE_VERSION to its tool
  // subprocesses (verified on kilo 7.8.27). It also inherits opencode's
  // OPENCODE=1, so it must be matched before any opencode env detection.
  if (env.KILO === "1" || env.KILO_RUN_ID || env.KILOCODE_VERSION) {
    return "kilo";
  }

  // TODO(oma-deferred): add env-based opencode session detection when opencode
  // sets a confirmed session env var. The only OPENCODE_* vars found in the
  // binary at detection time are OPENCODE_SERVER_PASSWORD / OPENCODE_SERVER_USERNAME
  // (server auth), which must NOT be used for runtime detection. Use explicit
  // `OMA_RUNTIME_VENDOR=opencode` or `-m opencode` to select this runtime.

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

/** Select only the transport; auto never chooses a model preset. */
export function resolveAutoVendor(
  defaultCli?: string,
  vendorOverride?: string,
  env: NodeJS.ProcessEnv = process.env,
): Exclude<RuntimeVendor, "unknown"> {
  const runtime = detectRuntimeVendor(env);
  const vendor = (
    vendorOverride ??
    (runtime === "unknown" ? (defaultCli ?? "claude") : runtime)
  )
    .trim()
    .toLowerCase();
  if (!SUPPORTED_RUNTIME_VENDORS.has(vendor as RuntimeVendor)) {
    throw new ConfigError(
      `Unsupported auto dispatch vendor "${vendor}". Set default_cli to a supported CLI vendor.`,
    );
  }
  return vendor as Exclude<RuntimeVendor, "unknown">;
}
