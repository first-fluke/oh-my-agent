import { cpSync, existsSync, mkdirSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { clearNonDirectory } from "../../utils/fs-utils.js";
import type { HookVariant } from "./variant-types.js";

/**
 * Compute the set of core scripts that must be materialized in a vendor's
 * hookDir for a given variant. Everything else runs in-process via `oma hook`
 * (design 019) and must NOT be copied — stale copies are dead files that make
 * vendor directories look hand-rolled.
 *
 * A script is required only when something executes or reads it from the
 * hookDir at runtime:
 *  - Hud-only events keep their `bun <hookDir>/<script>` command (T1-c), so
 *    those scripts are materialized (gemini registers hud via events).
 *  - The statusLine entry runs `bun <hookDir>/<hook>` directly.
 *  - The in-process test-filter handler rewrites Bash commands to pipe through
 *    `<hookDir>/filter-test-output.sh` (see test-filter.ts vendorHooksDir),
 *    so that shell script must exist wherever test-filter.ts is registered.
 *
 * triggers.json is statically inlined into the oma binary and handler chains
 * run inside `oma hook`, so neither it nor the handler .ts files are needed.
 */
export function requiredVariantScripts(variant: HookVariant): Set<string> {
  const required = new Set<string>();
  for (const rawConfig of Object.values(variant.events)) {
    const configs = Array.isArray(rawConfig) ? rawConfig : [rawConfig];
    if (configs.length === 0) continue;
    // Hud-only events keep the direct bun command; mixed events route through
    // oma-hook.sh and drop hud (mirrors installHooksFromVariant step 3).
    if (configs.every((c) => c.hook === "hud.ts")) {
      for (const c of configs) required.add(c.hook);
    }
    if (configs.some((c) => c.hook === "test-filter.ts")) {
      required.add("filter-test-output.sh");
    }
  }
  if (variant.statusLine) required.add(variant.statusLine.hook);
  return required;
}

/**
 * Copy core hook scripts from .agents/hooks/core/ to a vendor's hooks directory.
 * Clears stale symlinks/files first, then copies with dereference to ensure
 * real file copies (never symlinks that break when the temp dir is deleted).
 *
 * @param only - When provided, copy ONLY these basenames (the variant's
 *   runtime-required scripts — see requiredVariantScripts). Omit to copy the
 *   full core set (pi bridge, which spawns the scripts as subprocesses).
 *   The destination is cleared either way, so a re-install with a whitelist
 *   also removes stale full-copy files from older installs.
 */
export function copyHookScripts(
  sourceDir: string,
  hooksDest: string,
  only?: ReadonlySet<string>,
): void {
  const hooksSrc = join(sourceDir, ".agents", "hooks", "core");
  if (!existsSync(hooksSrc)) return;

  mkdirSync(hooksDest, { recursive: true });

  // Remove ALL existing non-directory entries (files, symlinks, broken symlinks)
  // before cpSync — Bun's cpSync fails with ENOENT on broken symlinks even with force.
  for (const entry of readdirSync(hooksDest, { withFileTypes: true })) {
    clearNonDirectory(join(hooksDest, entry.name));
  }

  if (only) {
    for (const name of only) {
      const src = join(hooksSrc, name);
      if (!existsSync(src)) continue;
      cpSync(src, join(hooksDest, name), { force: true, dereference: true });
    }
    return;
  }

  cpSync(hooksSrc, hooksDest, {
    recursive: true,
    force: true,
    dereference: true,
  });
}
