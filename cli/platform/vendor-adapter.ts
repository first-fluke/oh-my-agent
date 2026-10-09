import { existsSync, readdirSync, rmdirSync, rmSync } from "node:fs";
import { homedir } from "node:os";
import { join, resolve } from "node:path";
import type { VendorType } from "../types/index.js";
import { installVendorAgents } from "./agent-composer.js";
import { type HookVariant, installHooksFromVariant } from "./hooks-composer.js";
import { assertContainedRelPath } from "./path-containment.js";
import { generateClaudeRules } from "./rules.js";
import { safeLoadVariant } from "./variant-loader.js";

/** Load a hook variant, rejecting path-bearing fields that escape `installRoot`. */
function safeLoadHookVariant(
  variantPath: string,
  installRoot: string,
): HookVariant | null {
  return safeLoadVariant<HookVariant>({
    variantPath,
    kind: "hook",
    validate: (variant) => {
      assertContainedRelPath(installRoot, variant.hookDir, "hook dir");
      assertContainedRelPath(
        installRoot,
        variant.settingsFile,
        "settings file",
      );
      if (variant.featureFlags?.file) {
        assertContainedRelPath(
          installRoot,
          variant.featureFlags.file,
          "feature-flags file",
        );
      }
    },
  });
}

/**
 * Stale install location of earlier (incorrect) antigravity project installs.
 * agy never reads a project-scoped `.gemini/antigravity-cli/` — its settings
 * live in HOME and its workspace hooks in `.agents/hooks.json` (official
 * contract; see cli/vendors/antigravity/hud.ts).
 */
const STALE_AGY_PROJECT_DIR = join(".gemini", "antigravity-cli");

/**
 * Remove the dead `.gemini/antigravity-cli/` directory that pre-homeOnly
 * installs wrote into the project root. Guarded: when `installRoot` is the
 * user's HOME (global-mode link run from `~`), that path IS agy's real config
 * directory and must be left alone.
 */
function sweepStaleAgyProjectInstall(installRoot: string): void {
  if (resolve(installRoot) === resolve(homedir())) return;
  const staleDir = join(installRoot, STALE_AGY_PROJECT_DIR);
  if (!existsSync(staleDir)) return;
  rmSync(staleDir, { recursive: true, force: true });
  // Drop the parent `.gemini/` too when the sweep leaves it empty (it may
  // legitimately hold the gemini vendor's own files — keep it then).
  const parent = join(installRoot, ".gemini");
  try {
    if (readdirSync(parent).length === 0) rmdirSync(parent);
  } catch {
    // parent missing or non-empty race — nothing to clean.
  }
}

/**
 * Install vendor-specific agent and workflow adaptations.
 * Hooks are installed from variant configs in .agents/hooks/variants/.
 *
 * Workflow exposure is NOT handled here: workflows are symlinked directly at
 * `.agents/workflows/<name>.md` by `createVendorWorkflowSymlinks` during symlink
 * reconciliation, so no per-vendor wrapper is generated.
 */
export function installVendorAdaptations(
  sourceDir: string,
  installRoot: string,
  vendors: VendorType[],
): void {
  const hookVariantsDir = join(sourceDir, ".agents", "hooks", "variants");

  for (const vendor of vendors) {
    // 1. Install agents from variant (composer design)
    installVendorAgents(sourceDir, installRoot, vendor);

    // 2. Install hooks from variant config (parsed + path-validated; a bad
    //    variant is skipped with a warning rather than aborting the install).
    const variantPath = join(hookVariantsDir, `${vendor}.json`);
    if (existsSync(variantPath)) {
      const variant = safeLoadHookVariant(variantPath, installRoot);
      if (variant?.homeOnly) {
        // HOME-scoped vendors (agy, kimi): a dedicated installer (link 4g/4h →
        // installAntigravityHud / installKimiHooks) owns all writes; a
        // project-variant install would only produce dead files the vendor
        // never loads. The stale-dir sweep is agy-specific.
        if (variant.vendor === "antigravity") {
          sweepStaleAgyProjectInstall(installRoot);
        }
      } else if (variant) {
        installHooksFromVariant(sourceDir, installRoot, variant);
      }
    }

    // 3. Claude-specific non-hook adaptations (rules)
    if (vendor === "claude") {
      generateClaudeRules(installRoot, sourceDir);
    }
  }
}
