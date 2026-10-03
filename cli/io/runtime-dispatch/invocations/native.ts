import {
  splitArgs,
  type VendorConfig,
} from "../../../platform/agent-config.js";
import { agyPrintTimeoutArgs, detectAgyCaps } from "../agy-caps.js";
import { resolveCodexAutoApproveArgs } from "../codex-flags.js";
import type { Invocation } from "../types.js";

export interface NativeInvocationOptions {
  /** When true, constrains the spawned agent to non-destructive tools.
   * Suppresses `auto_approve_flag` and appends the vendor's `read_only_flag`.
   * Emits a console.warn when the vendor has no `read_only_flag` defined. */
  readOnly?: boolean;
  /** Absolute workspace path the agent must be able to write. Used by vendors
   * whose CLI confines writes to a trusted root unless granted explicitly
   * (antigravity/agy → `--add-dir`; codex derives its extra sandbox roots
   * from it). Mirrors ExternalInvocationOptions. */
  workspace?: string;
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
  const { readOnly = false, workspace } = options;
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
  } else {
    args.push(
      ...resolveCodexAutoApproveArgs(vendorConfig.auto_approve_flag, {
        workspace,
      }),
    );
  }

  // Codex gates every non-managed command hook behind a per-invocation trust
  // (TOFU) check: oma-installed .codex/hooks.json stays untrusted until the user
  // runs `/hooks`, and re-installs that change the command string silently
  // revert trust. oma-spawned subprocesses vet their own hook source, so pass
  // `--dangerously-bypass-hook-trust` to run enabled-but-untrusted hooks without
  // the manual re-trust step. Verified against codex 0.144.1: the flag runs an
  // enabled hook whose trusted_hash is stale; the BYPASS_HOOK_TRUST env var is
  // NOT honored. Never written to user config; hooks never enabled at all
  // (fresh project, no /hooks visit) still require one manual review.
  args.push("--dangerously-bypass-hook-trust");

  args.push(buildMentionPrompt(agentId, promptContent));

  return { command, args, env: { ...process.env } };
}

/**
 * Antigravity CLI (agy) headless mode: `agy [--dangerously-skip-permissions] -p "<prompt>"`.
 *
 * Notes on the real binary:
 * - `-p` is a *value* flag — the prompt is its argument, not a trailing positional.
 * - agy 1.0 had no `--model`, `--add-dir`, or `--print-timeout`; 1.1 added all
 *   three. Each is gated on an `agy --help` probe (see agy-caps) so a 1.0 binary
 *   silently keeps the old config-driven behavior. There is still no
 *   `--thinking-budget`, so effort rides on the model's tier suffix.
 * - `--model` accepts only `agy models` display IDs ("Gemini 3.1 Pro (High)").
 * - Auto-approve defaults to `--dangerously-skip-permissions`.
 *
 * Flag coverage is deliberately kept at parity with the external agy path in
 * invocations/external.ts — the two builders spawn the same binary, and a gap in
 * one shows up as an agy subagent that behaves differently depending on which
 * runtime happened to launch it.
 *
 * https://antigravity.google/docs/cli-overview
 */
export function buildAntigravityNativeInvocation(
  agentId: string,
  promptContent: string,
  vendorConfig: VendorConfig,
  options: NativeInvocationOptions = {},
): Invocation {
  const { readOnly = false, workspace } = options;
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

  // model_flag/default_model are checked FIRST so the caps probe only runs when
  // a model flag would actually be emitted. When a per-agent plan is resolved,
  // planDispatch strips default_model and appends the plan's own `--model`.
  if (
    vendorConfig.model_flag &&
    vendorConfig.default_model &&
    detectAgyCaps().modelFlag
  ) {
    args.push(vendorConfig.model_flag, vendorConfig.default_model);
  }

  // agy confines file writes to its own trusted root unless the workspace is
  // granted explicitly, so a subagent can exit 0 with its artifacts outside the
  // repo — and the orchestrator then finds no result file.
  if (workspace && detectAgyCaps().addDir) {
    args.push("--add-dir", workspace);
  }

  // Lift agy's 5m print-mode ceiling before the prompt (see agyPrintTimeoutArgs).
  args.push(...agyPrintTimeoutArgs());
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
