import {
  splitArgs,
  type VendorConfig,
} from "../../../platform/agent-config.js";
import type { Invocation } from "../types.js";

export interface NativeInvocationOptions {
  /** When true, constrains the spawned agent to non-destructive tools.
   * Suppresses `auto_approve_flag` and appends the vendor's `read_only_flag`.
   * Emits a console.warn when the vendor has no `read_only_flag` defined. */
  readOnly?: boolean;
}

export function buildMentionPrompt(
  agentId: string,
  promptContent: string,
): string {
  return `@${agentId}\n\n${promptContent}`;
}

export function buildClaudeNativeInvocation(
  agentId: string,
  promptContent: string,
  vendorConfig: VendorConfig,
  options: NativeInvocationOptions = {},
): Invocation {
  const { readOnly = false } = options;
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

  if (readOnly) {
    const readOnlyFlag =
      vendorConfig.read_only_flag ?? "--permission-mode plan";
    args.push(...splitArgs(readOnlyFlag));
  } else if (vendorConfig.auto_approve_flag) {
    args.push(vendorConfig.auto_approve_flag);
  }

  args.push("-p", promptContent);

  return { command, args, env: { ...process.env } };
}

export function buildCodexNativeInvocation(
  agentId: string,
  promptContent: string,
  vendorConfig: VendorConfig,
  options: NativeInvocationOptions = {},
): Invocation {
  const { readOnly = false } = options;
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

  if (readOnly) {
    const readOnlyFlag = vendorConfig.read_only_flag ?? "--sandbox read-only";
    args.push(...splitArgs(readOnlyFlag));
  } else if (vendorConfig.auto_approve_flag) {
    args.push(vendorConfig.auto_approve_flag);
  }

  args.push(buildMentionPrompt(agentId, promptContent));

  return { command, args, env: { ...process.env } };
}

export function buildGeminiNativeInvocation(
  agentId: string,
  promptContent: string,
  vendorConfig: VendorConfig,
  options: NativeInvocationOptions = {},
): Invocation {
  const { readOnly = false } = options;
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

  if (readOnly) {
    if (vendorConfig.read_only_flag) {
      args.push(...splitArgs(vendorConfig.read_only_flag));
    } else {
      console.warn(
        "[agent-spawn] read-only mode requested but vendor 'gemini' has no read_only_flag defined; spawning without auto-approve (permissive flags suppressed)",
      );
    }
  } else if (vendorConfig.auto_approve_flag) {
    args.push(vendorConfig.auto_approve_flag);
  }

  args.push("-p", buildMentionPrompt(agentId, promptContent));

  return { command, args, env: { ...process.env } };
}

/**
 * Antigravity CLI (agy) headless mode: `agy [--dangerously-skip-permissions] -p "<prompt>"`.
 *
 * Notes on the real binary (verified against agy 1.0):
 * - `-p` is a *value* flag — the prompt is its argument, not a trailing positional.
 * - There is no `--model` / `-m` flag (model selection is config-driven), and
 *   no `--thinking-budget`. We deliberately do not forward those even if the
 *   resolved vendorConfig carries them.
 * - Auto-approve defaults to `--dangerously-skip-permissions`.
 *
 * https://antigravity.google/docs/cli-overview
 */
export function buildAntigravityNativeInvocation(
  agentId: string,
  promptContent: string,
  vendorConfig: VendorConfig,
  options: NativeInvocationOptions = {},
): Invocation {
  const { readOnly = false } = options;
  const command = vendorConfig.command || "agy";
  const args: string[] = [];

  if (readOnly) {
    if (vendorConfig.read_only_flag) {
      args.push(...splitArgs(vendorConfig.read_only_flag));
    } else {
      console.warn(
        "[agent-spawn] read-only mode requested but vendor 'antigravity' has no read_only_flag defined; spawning without auto-approve (permissive flags suppressed)",
      );
    }
  } else if (vendorConfig.auto_approve_flag) {
    args.push(vendorConfig.auto_approve_flag);
  } else {
    args.push("--dangerously-skip-permissions");
  }

  args.push("-p", buildMentionPrompt(agentId, promptContent));

  return { command, args, env: { ...process.env } };
}

/**
 * Kiro CLI headless mode: `kiro-cli chat --no-interactive --trust-all-tools [--model …] "<prompt>"`.
 *
 * Notes:
 * - `--no-interactive` is required for headless/subagent use.
 * - `--trust-all-tools` bypasses all tool approval prompts (equivalent to --dangerously-skip-permissions).
 * - `--model` accepts AWS Bedrock model IDs (e.g. anthropic.claude-sonnet-4-5-20251001-v1:0).
 *   Omit to use the default model configured in Kiro settings.
 */
export function buildKiroNativeInvocation(
  agentId: string,
  promptContent: string,
  vendorConfig: VendorConfig,
  options: NativeInvocationOptions = {},
): Invocation {
  const { readOnly = false } = options;
  const command = vendorConfig.command || "kiro-cli";
  const args: string[] = ["chat", "--no-interactive"];

  if (readOnly) {
    if (vendorConfig.read_only_flag) {
      args.push(...splitArgs(vendorConfig.read_only_flag));
    } else {
      console.warn(
        "[agent-spawn] read-only mode requested but vendor 'kiro' has no read_only_flag defined; spawning without auto-approve (permissive flags suppressed)",
      );
    }
  } else if (vendorConfig.auto_approve_flag) {
    args.push(vendorConfig.auto_approve_flag);
  } else {
    args.push("--trust-all-tools");
  }

  if (agentId) {
    args.push("--agent", agentId);
  }

  if (vendorConfig.model_flag && vendorConfig.default_model) {
    args.push(vendorConfig.model_flag, vendorConfig.default_model);
  }

  args.push(promptContent);

  return { command, args, env: { ...process.env } };
}

/**
 * Cursor Agent headless CLI: `cursor agent -p [--output-format …] [--yolo|--force]
 * [--trust] [--model …] … <prompt>`. The `-p` flag is boolean; prompt is positional.
 *
 * https://cursor.com/docs/cli/using
 */
export function buildCursorAgentPrintInvocation(
  agentId: string,
  promptContent: string,
  vendorConfig: VendorConfig,
  options: NativeInvocationOptions = {},
): Invocation {
  const { readOnly = false } = options;
  const command = vendorConfig.command || "cursor";
  const args: string[] = ["agent", "-p"];

  if (vendorConfig.output_format_flag && vendorConfig.output_format) {
    args.push(vendorConfig.output_format_flag, vendorConfig.output_format);
  } else if (vendorConfig.output_format_flag) {
    args.push(vendorConfig.output_format_flag);
  }

  if (readOnly) {
    if (vendorConfig.read_only_flag) {
      args.push(...splitArgs(vendorConfig.read_only_flag));
    } else {
      console.warn(
        "[agent-spawn] read-only mode requested but vendor 'cursor' has no read_only_flag defined; spawning without auto-approve (permissive flags suppressed)",
      );
    }
  } else if (vendorConfig.auto_approve_flag) {
    args.push(vendorConfig.auto_approve_flag);
  } else {
    args.push("--yolo");
  }
  args.push("--trust");

  if (vendorConfig.model_flag && vendorConfig.default_model) {
    args.push(vendorConfig.model_flag, vendorConfig.default_model);
  }

  args.push(buildMentionPrompt(agentId, promptContent));

  return { command, args, env: { ...process.env } };
}
