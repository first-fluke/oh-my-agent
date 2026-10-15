import { splitArgs, type VendorConfig } from "../../platform/agent-config.js";
import { ConfigError } from "./config-error.js";

const PERMISSIVE_FLAGS = new Set([
  "--yolo",
  "--trust-all-tools",
  "--force",
  "--dangerously-skip-permissions",
  "--dangerously-bypass-approvals-and-sandbox",
  "--full-auto",
  "--no-sandbox",
  "--auto",
]);

function refuse(vendor: string, reason: string): never {
  throw new ConfigError(
    `read-only mode for vendor '${vendor}': ${reason}; refusing to launch.`,
  );
}

function builtInReadOnlyFlag(vendor: string): string | undefined {
  switch (vendor) {
    case "codex":
      return "--sandbox read-only";
    case "claude":
      return "--permission-mode plan";
    case "pi":
      return "--exclude-tools edit,write,bash,powershell";
    default:
      return undefined;
  }
}

function assertNoPermissionBypass(vendor: string, args: string[]): void {
  for (let index = 0; index < args.length; index++) {
    const arg = args[index] ?? "";
    const equals = arg.indexOf("=");
    const flag = equals === -1 ? arg : arg.slice(0, equals);
    const value = equals === -1 ? args[index + 1] : arg.slice(equals + 1);
    if (PERMISSIVE_FLAGS.has(flag) || flag === "--") {
      refuse(vendor, "configured flags permit writes or bypass restrictions");
    }
    if ((flag === "--sandbox" || flag === "-s") && value !== "read-only") {
      refuse(vendor, "configured sandbox is not read-only");
    }
    if (
      (flag === "--permission-mode" || flag === "--approval-mode") &&
      value !== "plan"
    ) {
      refuse(vendor, "configured permission mode permits mutations");
    }
  }

  // splitArgs separates adjacent quoted segments (sandbox_mode="...").
  // Normalize quotes for validation without changing the emitted argv.
  const config = args.join(" ").replace(/["']/g, "");
  for (const match of config.matchAll(
    /(?:^|[\s=]|-c)sandbox_mode\s*=\s*([^\s]+)/g,
  )) {
    if (match[1] !== "read-only") {
      refuse(vendor, "configured sandbox override permits writes");
    }
  }
}

/**
 * Resolve a required vendor restriction before dispatch has side effects.
 * Custom read_only_flag values declare support in the user's CLI or wrapper;
 * OMA rejects missing, empty, and known conflicting flags, but does not probe
 * arbitrary executables or provide an operating-system sandbox itself.
 */
export function resolveReadOnlyArgs(
  vendor: string,
  vendorConfig: VendorConfig,
): string[] {
  const configured = vendorConfig.read_only_flag;
  const flag = configured ?? builtInReadOnlyFlag(vendor);
  if (flag === undefined) {
    refuse(vendor, "no built-in restriction or read_only_flag is available");
  }
  const args = splitArgs(flag);
  if (args.length === 0 || args.some((arg) => !arg.trim())) {
    refuse(vendor, "read_only_flag must contain a non-empty restriction");
  }
  assertNoPermissionBypass(vendor, args);
  assertNoPermissionBypass(
    vendor,
    splitArgs(vendorConfig.isolation_flags ?? ""),
  );

  if (vendor === "pi") {
    // Pi's shells can mutate files even when edit/write are unavailable.
    // Validate every explicit exclusion, so a later occurrence cannot undo it.
    for (let index = 0; index < args.length; index++) {
      const arg = args[index] ?? "";
      const flag = arg.split("=", 1)[0];
      if (flag !== "--exclude-tools" && flag !== "-xt") {
        continue;
      }
      const value = arg.includes("=")
        ? arg.slice(arg.indexOf("=") + 1)
        : args[index + 1];
      const excluded = new Set(value?.split(","));
      if (
        !["edit", "write", "bash", "powershell"].every(
          (tool) => excluded.has(tool) || excluded.has("*"),
        )
      ) {
        refuse(
          vendor,
          "Pi must exclude edit, write, bash, and powershell tools",
        );
      }
    }
  }
  return args;
}
