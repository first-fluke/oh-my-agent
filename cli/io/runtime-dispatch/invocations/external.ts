import {
  splitArgs,
  type VendorConfig,
} from "../../../platform/agent-config.js";
import type { Invocation } from "../types.js";

/**
 * Cursor headless prompt with a plain trailing prompt — used by the external-invocation builder
 * (no @{agentId} preamble).
 */
function buildExternalCursorInvocation(
  vendorConfig: VendorConfig,
  promptContent: string,
  options: ExternalInvocationOptions = {},
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
    // In read-only mode: suppress auto-approve/--yolo entirely.
    // Append the vendor's read_only_flag if defined; otherwise warn explicitly.
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

  args.push(promptContent);

  return { command, args, env: { ...process.env } };
}

export interface ExternalInvocationOptions {
  /** When true, constrains the spawned agent to non-destructive tools.
   * Suppresses `auto_approve_flag` and appends the vendor's `read_only_flag`.
   * Emits a console.warn when the vendor has no `read_only_flag` defined. */
  readOnly?: boolean;
}

export function buildExternalInvocation(
  vendor: string,
  vendorConfig: VendorConfig,
  promptFlag: string | null,
  promptContent: string,
  agentId?: string,
  options: ExternalInvocationOptions = {},
): Invocation {
  const { readOnly = false } = options;

  // Cursor Agent: `-p`/`--print` is a boolean flag; prompt must be a trailing positional argv.
  // The generic branch always pairs `promptFlag` with prompt as two args, which is wrong here.
  if (vendor === "cursor") {
    return buildExternalCursorInvocation(vendorConfig, promptContent, options);
  }

  // Kiro: `kiro-cli chat --no-interactive --trust-all-tools [--agent …] [--model …] "<prompt>"`.
  if (vendor === "kiro") {
    const command = vendorConfig.command || "kiro-cli";
    const args: string[] = ["chat", "--no-interactive"];

    if (!readOnly) {
      if (vendorConfig.auto_approve_flag) {
        args.push(vendorConfig.auto_approve_flag);
      } else {
        args.push("--trust-all-tools");
      }
    } else if (vendorConfig.read_only_flag) {
      args.push(...splitArgs(vendorConfig.read_only_flag));
    } else {
      console.warn(
        `[agent-spawn] read-only mode requested but vendor '${vendor}' has no read_only_flag defined; spawning without auto-approve (permissive flags suppressed)`,
      );
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

  // Grok: supports `grok --yolo -p "prompt"` for headless execution.
  if (vendor === "grok") {
    const command = vendorConfig.command || "grok";
    const args: string[] = [];

    if (!readOnly) {
      if (vendorConfig.auto_approve_flag) {
        args.push(vendorConfig.auto_approve_flag);
      } else {
        args.push("--yolo");
      }
    } else if (vendorConfig.read_only_flag) {
      args.push(...splitArgs(vendorConfig.read_only_flag));
    } else {
      console.warn(
        `[agent-spawn] read-only mode requested but vendor '${vendor}' has no read_only_flag defined; spawning without auto-approve (permissive flags suppressed)`,
      );
    }

    if (vendorConfig.model_flag && vendorConfig.default_model) {
      args.push(vendorConfig.model_flag, vendorConfig.default_model);
    }

    // Grok uses -p for the prompt (positional after flags in practice).
    args.push("-p", promptContent);

    return { command, args, env: { ...process.env } };
  }

  // pi (Earendil): `pi -p [--exclude-tools …] [--model …] "<prompt>"`. pi has no
  // permission sandbox or auto-approve flag — tools run without prompting — so
  // read-only is enforced by excluding the mutating tools. The model/thinking
  // flags are appended after the positional prompt by applyResolvedPlan when a
  // per-agent plan is active; pi tolerates options after positionals.
  if (vendor === "pi") {
    const command = vendorConfig.command || "pi";
    const args: string[] = ["-p"];

    if (readOnly) {
      if (vendorConfig.read_only_flag) {
        args.push(...splitArgs(vendorConfig.read_only_flag));
      } else {
        args.push("--exclude-tools", "edit,write");
      }
    }

    // Fallback model path (no resolved plan): emit the vendor default model.
    if (vendorConfig.model_flag && vendorConfig.default_model) {
      args.push(vendorConfig.model_flag, vendorConfig.default_model);
    }

    args.push(promptContent);

    return { command, args, env: { ...process.env } };
  }

  // Vendors whose CLI binary name differs from the vendor identifier.
  const binaryByVendor: Record<string, string> = {
    antigravity: "agy",
    kiro: "kiro-cli",
  };
  const command = vendorConfig.command || binaryByVendor[vendor] || vendor;
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

  // agy 1.0 has no `--model` flag — defensively skip emitting one for the
  // antigravity vendor even when a stale vendorConfig carries it.
  if (
    vendor !== "antigravity" &&
    vendorConfig.model_flag &&
    vendorConfig.default_model
  ) {
    optionArgs.push(vendorConfig.model_flag, vendorConfig.default_model);
  }

  if (vendorConfig.isolation_flags) {
    optionArgs.push(...splitArgs(vendorConfig.isolation_flags));
  }

  if (readOnly) {
    // In read-only mode: suppress all permissive auto-approve flags.
    // Append the vendor's read_only_flag if defined; otherwise warn explicitly.
    if (vendorConfig.read_only_flag) {
      optionArgs.push(...splitArgs(vendorConfig.read_only_flag));
    } else {
      const defaultReadOnly: Record<string, string> = {
        codex: "--sandbox read-only",
        claude: "--permission-mode plan",
      };
      const builtInFlag = defaultReadOnly[vendor];
      if (builtInFlag) {
        optionArgs.push(...splitArgs(builtInFlag));
      } else {
        console.warn(
          `[agent-spawn] read-only mode requested but vendor '${vendor}' has no read_only_flag defined; spawning without auto-approve (permissive flags suppressed)`,
        );
      }
    }
  } else {
    if (vendorConfig.auto_approve_flag) {
      optionArgs.push(vendorConfig.auto_approve_flag);
    } else {
      const defaultAutoApprove: Record<string, string> = {
        gemini: "--approval-mode=yolo",
        codex: "--full-auto",
        qwen: "--yolo",
        antigravity: "--dangerously-skip-permissions",
        grok: "--yolo",
        kiro: "--trust-all-tools",
      };
      const fallbackFlag = defaultAutoApprove[vendor];
      if (fallbackFlag) {
        optionArgs.push(fallbackFlag);
      }
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
    if (key && rawValue && isSafeIsolationEnvKey(key)) {
      env[key] = rawValue.replace("$$", String(process.pid));
    } else if (key && rawValue) {
      console.warn(
        `[agent-spawn] isolation_env key '${key}' can hijack process loading; skipped.`,
      );
    }
  }

  return { command, args, env };
}

// isolation_env comes from user-editable oma-config.yaml. Loader/interpreter
// hijack variables must never be injected into trusted vendor CLI processes.
const DANGEROUS_ENV_KEY_RE =
  /^(PATH|LD_[A-Z_]+|DYLD_[A-Z_]+|PYTHONPATH|PYTHONSTARTUP|NODE_OPTIONS|NODE_PATH|BUN_INSTALL|PERL5LIB|RUBYLIB|IFS|ENV|BASH_ENV|SHELL)$/i;

export function isSafeIsolationEnvKey(key: string): boolean {
  return (
    /^[A-Za-z_][A-Za-z0-9_]*$/.test(key) && !DANGEROUS_ENV_KEY_RE.test(key)
  );
}
