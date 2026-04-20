import { splitArgs, type VendorConfig } from "../platform/agent-config.js";

export type RuntimeVendor =
  | "claude"
  | "codex"
  | "gemini"
  | "antigravity"
  | "unknown";

export type DispatchMode = "native" | "external";

export type Invocation = {
  command: string;
  args: string[];
  env: NodeJS.ProcessEnv;
};

export type DispatchPlan = {
  mode: DispatchMode;
  runtimeVendor: RuntimeVendor;
  targetVendor: string;
  reason: string;
  invocation: Invocation;
};

const SUPPORTED_RUNTIME_VENDORS = new Set<RuntimeVendor>([
  "claude",
  "codex",
  "gemini",
  "antigravity",
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

  return "unknown";
}

function buildClaudeNativeInvocation(
  agentId: string,
  promptContent: string,
  vendorConfig: VendorConfig,
): Invocation {
  const command = vendorConfig.command || "claude";
  const args = ["--agent", agentId];

  if (vendorConfig.output_format_flag && vendorConfig.output_format) {
    args.push(vendorConfig.output_format_flag, vendorConfig.output_format);
  } else if (vendorConfig.output_format_flag) {
    args.push(vendorConfig.output_format_flag);
  }

  if (vendorConfig.model_flag && vendorConfig.default_model) {
    args.push(vendorConfig.model_flag, vendorConfig.default_model);
  }
  if (vendorConfig.auto_approve_flag) {
    args.push(vendorConfig.auto_approve_flag);
  }

  args.push("-p", promptContent);

  return { command, args, env: { ...process.env } };
}

function buildMentionPrompt(agentId: string, promptContent: string): string {
  return `@${agentId}\n\n${promptContent}`;
}

function buildCodexNativeInvocation(
  agentId: string,
  promptContent: string,
  vendorConfig: VendorConfig,
): Invocation {
  const command = vendorConfig.command || "codex";
  const args: string[] = [];

  if (vendorConfig.subcommand) {
    args.push(vendorConfig.subcommand);
  }
  if (vendorConfig.output_format_flag) {
    args.push(vendorConfig.output_format_flag);
  }
  if (vendorConfig.model_flag && vendorConfig.default_model) {
    args.push(vendorConfig.model_flag, vendorConfig.default_model);
  }
  if (vendorConfig.auto_approve_flag) {
    args.push(vendorConfig.auto_approve_flag);
  }

  args.push(buildMentionPrompt(agentId, promptContent));

  return { command, args, env: { ...process.env } };
}

function buildGeminiNativeInvocation(
  agentId: string,
  promptContent: string,
  vendorConfig: VendorConfig,
): Invocation {
  const command = vendorConfig.command || "gemini";
  const args: string[] = [];

  if (vendorConfig.output_format_flag && vendorConfig.output_format) {
    args.push(vendorConfig.output_format_flag, vendorConfig.output_format);
  } else if (vendorConfig.output_format_flag) {
    args.push(vendorConfig.output_format_flag);
  }
  if (vendorConfig.model_flag && vendorConfig.default_model) {
    args.push(vendorConfig.model_flag, vendorConfig.default_model);
  }
  if (vendorConfig.auto_approve_flag) {
    args.push(vendorConfig.auto_approve_flag);
  }

  args.push("-p", buildMentionPrompt(agentId, promptContent));

  return { command, args, env: { ...process.env } };
}

export function buildExternalInvocation(
  vendor: string,
  vendorConfig: VendorConfig,
  promptFlag: string | null,
  promptContent: string,
): Invocation {
  const command = vendorConfig.command || vendor;
  const args: string[] = [];
  const optionArgs: string[] = [];

  if (vendorConfig.subcommand) {
    args.push(vendorConfig.subcommand);
  }

  if (vendorConfig.output_format_flag && vendorConfig.output_format) {
    optionArgs.push(
      vendorConfig.output_format_flag,
      vendorConfig.output_format,
    );
  } else if (vendorConfig.output_format_flag) {
    optionArgs.push(vendorConfig.output_format_flag);
  }

  if (vendorConfig.model_flag && vendorConfig.default_model) {
    optionArgs.push(vendorConfig.model_flag, vendorConfig.default_model);
  }

  if (vendorConfig.isolation_flags) {
    optionArgs.push(...splitArgs(vendorConfig.isolation_flags));
  }

  if (vendorConfig.auto_approve_flag) {
    optionArgs.push(vendorConfig.auto_approve_flag);
  } else {
    const defaultAutoApprove: Record<string, string> = {
      gemini: "--approval-mode=yolo",
      codex: "--full-auto",
      qwen: "--yolo",
    };
    const fallbackFlag = defaultAutoApprove[vendor];
    if (fallbackFlag) {
      optionArgs.push(fallbackFlag);
    }
  }

  if (promptFlag) {
    optionArgs.push(promptFlag, promptContent);
  }

  args.push(...optionArgs);
  if (!promptFlag) {
    args.push(promptContent);
  }

  const env = { ...process.env };
  if (vendorConfig.isolation_env) {
    const [key, ...rest] = vendorConfig.isolation_env.split("=");
    const rawValue = rest.join("=");
    if (key && rawValue) {
      env[key] = rawValue.replace("$$", String(process.pid));
    }
  }

  return { command, args, env };
}

export function planDispatch(
  agentId: string,
  targetVendor: string,
  vendorConfig: VendorConfig,
  promptFlag: string | null,
  promptContent: string,
  env: NodeJS.ProcessEnv = process.env,
): DispatchPlan {
  const runtimeVendor = detectRuntimeVendor(env);

  if (runtimeVendor === "claude" && targetVendor === "claude") {
    return {
      mode: "native",
      runtimeVendor,
      targetVendor,
      reason: "same-vendor Claude runtime detected",
      invocation: buildClaudeNativeInvocation(
        agentId,
        promptContent,
        vendorConfig,
      ),
    };
  }

  if (runtimeVendor === "codex" && targetVendor === "codex") {
    return {
      mode: "native",
      runtimeVendor,
      targetVendor,
      reason: "same-vendor Codex runtime detected",
      invocation: buildCodexNativeInvocation(
        agentId,
        promptContent,
        vendorConfig,
      ),
    };
  }

  if (runtimeVendor === "gemini" && targetVendor === "gemini") {
    return {
      mode: "native",
      runtimeVendor,
      targetVendor,
      reason: "same-vendor Gemini runtime detected",
      invocation: buildGeminiNativeInvocation(
        agentId,
        promptContent,
        vendorConfig,
      ),
    };
  }

  return {
    mode: "external",
    runtimeVendor,
    targetVendor,
    reason:
      runtimeVendor === "unknown"
        ? "runtime vendor not detected"
        : "cross-vendor or unsupported native path",
    invocation: buildExternalInvocation(
      targetVendor,
      vendorConfig,
      promptFlag,
      promptContent,
    ),
  };
}
