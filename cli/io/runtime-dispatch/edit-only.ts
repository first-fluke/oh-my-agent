import { splitArgs, type VendorConfig } from "../../platform/agent-config.js";
import { ConfigError } from "./config-error.js";
import { resolveReadOnlyArgs } from "./read-only.js";

/** Flags that approve every tool call; an edit-only launch never carries one. */
const BLANKET_APPROVAL_FLAGS = new Set([
  "--yolo",
  "--trust-all-tools",
  "--force",
  "--dangerously-skip-permissions",
  "--dangerously-bypass-approvals-and-sandbox",
  "--full-auto",
  "--no-sandbox",
  "--auto",
]);

/** Values of a mode flag that approve more than file edits. */
const BLANKET_MODE_VALUES = new Set([
  "auto",
  "yolo",
  "dontAsk",
  "bypassPermissions",
  "danger-full-access",
]);

const MODE_FLAGS = new Set([
  "--permission-mode",
  "--approval-mode",
  "--mode",
  "--sandbox",
  "-s",
]);

function refuse(vendor: string, reason: string): never {
  throw new ConfigError(
    `edit-only mode for vendor '${vendor}': ${reason}; refusing to launch.`,
  );
}

/**
 * The narrowest write-capable mode each CLI offers: file edits apply without a
 * prompt and no other tool is approved. Each entry was run against the
 * installed CLI with a prompt that writes one file with the edit tool and one
 * through a shell command (2026-11-16):
 *
 * - claude 2.1.325: the edit applied and the shell step was refused. The deny
 *   rule is required; `acceptEdits` alone ran the shell command.
 * - grok 1.0.77, agy 1.5.9, kiro-cli 3.2.1: the edit applied, shell refused.
 * - qwen 0.27.1: the edit applied, shell refused. Qwen resets the approval mode
 *   to `default` in a folder it does not trust, which removes the edit tools.
 * - codex 0.167.1: Codex has no tool-level rule. Shell commands run inside the
 *   workspace-write sandbox, so writes stay in the workspace and the network is
 *   off; the sandbox is the restriction.
 * - pi has no approval layer. Excluding its shell tools is the same mechanism
 *   as its read-only mode; it was not run here.
 *
 * cursor-agent 2026.11.13 is absent on purpose: with and without
 * `--sandbox enabled` the shell command ran when `--force` was omitted.
 * opencode, kilo, and kimi expose no per-invocation edit-only flag either.
 * Those vendors need an explicit `edit_only_flag`.
 */
function builtInEditOnlyArgs(vendor: string): string[] | undefined {
  switch (vendor) {
    case "claude":
      // `--disallowedTools` is variadic: keep a flag after it so it cannot
      // swallow a positional prompt.
      return ["--disallowedTools", "Bash", "--permission-mode", "acceptEdits"];
    case "codex":
      return ["--sandbox", "workspace-write"];
    case "grok":
      return [
        "--permission-mode",
        "acceptEdits",
        "--allow",
        "Edit",
        "--allow",
        "Write",
      ];
    case "antigravity":
      // Applied to the ACP session (session/set_mode) by the agy driver;
      // the driver denies the shell permission requests that still arrive.
      return ["--mode", "accept-edits"];
    case "qwen":
      return ["--approval-mode", "auto-edit"];
    case "kiro":
      return ["--trust-tools=fs_read,fs_write"];
    case "pi":
      return ["--exclude-tools", "bash,powershell"];
    default:
      return undefined;
  }
}

function assertNoBlanketApproval(vendor: string, args: string[]): void {
  for (let index = 0; index < args.length; index++) {
    const arg = args[index] ?? "";
    const equals = arg.indexOf("=");
    const flag = equals === -1 ? arg : arg.slice(0, equals);
    const value = equals === -1 ? args[index + 1] : arg.slice(equals + 1);
    if (BLANKET_APPROVAL_FLAGS.has(flag) || flag === "--") {
      refuse(vendor, "configured flags approve every tool call");
    }
    if (
      MODE_FLAGS.has(flag) &&
      value !== undefined &&
      BLANKET_MODE_VALUES.has(value)
    ) {
      refuse(vendor, `configured mode '${value}' approves more than edits`);
    }
  }

  // splitArgs separates adjacent quoted segments (sandbox_mode="...").
  const config = args.join(" ").replace(/["']/g, "");
  for (const match of config.matchAll(
    /(?:^|[\s=]|-c)sandbox_mode\s*=\s*([^\s]+)/g,
  )) {
    if (match[1] === "danger-full-access") {
      refuse(vendor, "configured sandbox override removes the sandbox");
    }
  }
}

/**
 * Resolve the argv that restricts a launch to file edits. A configured
 * `edit_only_flag` declares the restriction for a CLI or wrapper OMA does not
 * know; OMA rejects an empty value and flags that approve every tool, but it
 * does not probe the executable. A vendor's own user-level allow rules still
 * apply on top of these flags.
 */
export function resolveEditOnlyArgs(
  vendor: string,
  vendorConfig: VendorConfig,
): string[] {
  const configured = vendorConfig.edit_only_flag;
  const args =
    configured === undefined
      ? builtInEditOnlyArgs(vendor)
      : splitArgs(configured);
  if (args === undefined) {
    refuse(vendor, "no built-in edit-only mode or edit_only_flag is available");
  }
  if (args.length === 0 || args.some((arg) => !arg.trim())) {
    refuse(vendor, "edit_only_flag must contain a non-empty restriction");
  }
  assertNoBlanketApproval(vendor, args);
  assertNoBlanketApproval(
    vendor,
    splitArgs(vendorConfig.isolation_flags ?? ""),
  );
  return args;
}

/** The permission a spawned agent runs with; the two restrictions exclude each other. */
export interface RestrictionOptions {
  /** Requires a built-in restriction or an explicit read_only_flag. */
  readOnly?: boolean;
  /** Requires a built-in edit-only mode or an explicit edit_only_flag. */
  editOnly?: boolean;
}

/**
 * The restriction argv for a read-only or edit-only launch, or null when the
 * launch keeps the vendor's auto-approve flag. Throws before any side effect
 * when the requested restriction cannot be enforced.
 */
export function resolveRestrictionArgs(
  vendor: string,
  vendorConfig: VendorConfig,
  options: RestrictionOptions,
): string[] | null {
  if (options.readOnly && options.editOnly) {
    throw new ConfigError(
      "read-only and edit-only are mutually exclusive; choose one restriction.",
    );
  }
  if (options.readOnly) return resolveReadOnlyArgs(vendor, vendorConfig);
  if (options.editOnly) return resolveEditOnlyArgs(vendor, vendorConfig);
  return null;
}
