import { homedir } from "node:os";
import { join } from "node:path";
import { CLI_SKILLS_DIR, EXTENSION_VENDORS } from "../../constants/index.js";
import type { CliTool, CliVendor, VendorType } from "../../types/index.js";
import { getInstallMode } from "../install-context.js";

/**
 * Vendors with a hook bridge (settings, prompt hooks, agent variants).
 * Vendors NOT in this set (e.g., copilot, hermes) are skill-symlink-only
 * and must NOT be passed to `installVendorAdaptations`.
 */
const HOOK_VENDORS: ReadonlySet<VendorType> = new Set([
  "antigravity",
  "claude",
  "codex",
  "commandcode",
  "cursor",
  "gemini",
  "grok",
  "kiro",
  "qwen",
]);

/**
 * Type guard: narrows a `CliVendor` to `VendorType` if it supports
 * hook-based vendor adaptation. Use as a `.filter()` predicate to safely
 * derive `hookVendors` from a free-form vendor list.
 */
export function isHookVendor(v: CliVendor): v is VendorType {
  return HOOK_VENDORS.has(v as VendorType);
}

/**
 * True for vendors whose hooks install as in-process extensions (e.g. `pi`)
 * rather than settings-file registrations. Such vendors are NOT `VendorType`
 * and must be routed to their dedicated composer (`installPiExtension`), never
 * to `installVendorAdaptations`. Accepts a raw string because these vendors do
 * not appear in the `CliVendor` union.
 */
export function isExtensionVendor(v: string): boolean {
  return (EXTENSION_VENDORS as readonly string[]).includes(v);
}

/**
 * Resolve the absolute directory where vendor skill symlinks should live.
 *
 * Mode-aware: when the active install context is "global", uses `spec.homePath`
 * under `installRoot` (= homedir() for global mode). Otherwise uses
 * `spec.projectPath`. Vendors with `requiresHomeConsent` always resolve under
 * the user's HOME regardless of mode (matches hermes legacy semantics).
 *
 * This is the canonical mode-aware resolver. `resolveCliSkillsDir` is a
 * compat shim retained for callers that pass `targetDir` explicitly.
 */
export function vendorSkillsDir(cli: CliTool, installRoot: string): string {
  const spec = CLI_SKILLS_DIR[cli];

  if (spec.requiresHomeConsent === true) {
    return join(homedir(), spec.homePath);
  }

  let mode: "project" | "global" = "project";
  try {
    mode = getInstallMode();
  } catch {
    // Context not set yet (early bootstrap or unit tests that don't init).
    mode = "project";
  }

  if (mode === "global") {
    return join(installRoot, spec.homePath);
  }

  return join(installRoot, spec.projectPath);
}

/**
 * Resolve the absolute directory where vendor skill symlinks should live.
 *
 * Project-base vendors live under `targetDir`; vendors that require home
 * consent (e.g. hermes) live under the user's HOME directory. This is the
 * only path that produces HOME paths and is the trust boundary for HOME
 * writes.
 *
 * @deprecated Use `vendorSkillsDir(cli, installRoot)` directly. This shim is
 * retained for callers that pass `installRoot` explicitly and will be removed
 * once all call sites are migrated.
 */
export function resolveCliSkillsDir(installRoot: string, cli: CliTool): string {
  return vendorSkillsDir(cli, installRoot);
}

/**
 * Whether installing this vendor's skills writes outside the project
 * directory (i.e., into the user's HOME). Callers MUST obtain explicit
 * user consent before proceeding when this returns true.
 */
export function vendorRequiresHomeConsent(cli: CliTool): boolean {
  return Boolean(CLI_SKILLS_DIR[cli].requiresHomeConsent);
}

/**
 * User-facing display path for a vendor's skill directory.
 * Vendors that require home consent get a `~/...` prefix; project-base
 * vendors return the project-relative path verbatim.
 */
export function getVendorDisplayPath(cli: CliTool): string {
  const spec = CLI_SKILLS_DIR[cli];
  return spec.requiresHomeConsent ? `~/${spec.homePath}` : spec.projectPath;
}
