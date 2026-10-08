import { createHash } from "node:crypto";
import {
  cpSync,
  existsSync,
  lstatSync,
  mkdirSync,
  readdirSync,
  readFileSync,
} from "node:fs";
import { join } from "node:path";
import { clearNonDirectory } from "../../utils/fs-utils.js";
import { atomicWriteFileSync } from "../../utils/safe-write.js";
import type { HookVariant } from "./variant-types.js";

/**
 * Compute the set of core scripts that must be materialized in a vendor's
 * hookDir/oma for a given variant. Everything else runs in-process via
 * `oma hook run` (design 019).
 *
 * A script is required only when something executes or reads it from the
 * hookDir/oma at runtime:
 *  - Hud-only events use `bun <hookDir>/oma/<script>` (T1-c), so
 *    those scripts are materialized (gemini registers hud via events).
 *  - The statusLine entry runs `bun <hookDir>/oma/<hook>` directly.
 *  - The in-process test-filter handler rewrites Bash commands to pipe through
 *    `<hookDir>/oma/filter-test-output.sh` (see test-filter.ts vendorHooksDir),
 *    so that shell script must exist wherever test-filter.ts is registered.
 *
 * triggers.json is statically inlined into the oma binary and handler chains
 * run inside `oma hook run`, so neither it nor the handler .ts files are needed.
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
 * Records hashes of copied scripts. Only unchanged, recorded copies may be
 * replaced or removed; untracked files and user modifications are preserved.
 *
 * @param only - When provided, copy ONLY these basenames (the variant's
 *   runtime-required scripts — see requiredVariantScripts). Omit to copy the
 *   full core set (pi bridge, which spawns the scripts as subprocesses).
 *   A whitelist removes stale copies from recorded installs. Legacy files
 *   without ownership evidence are preserved.
 * @param options.ownedNamespace - Set only for an OMA-exclusive directory.
 *   Shipped filenames there can be adopted from pre-manifest installations.
 * @param options.generatedSources - Installed file contents for CLI-owned
 *   entry points; fingerprinting and customization protection apply equally.
 */
export function copyHookScripts(
  sourceDir: string,
  hooksDest: string,
  only?: ReadonlySet<string>,
  options: {
    ownedNamespace?: boolean;
    /** Generated entry points replace copied handlers without editing SSOT. */
    generatedSources?: ReadonlyMap<string, string>;
  } = {},
): void {
  const hooksSrc = join(sourceDir, ".agents", "hooks", "core");
  if (!existsSync(hooksSrc)) return;

  mkdirSync(hooksDest, { recursive: true });

  const manifestPath = join(hooksDest, ".oma-hook-files.json");
  const previous: Record<string, string> = {};
  try {
    const value = JSON.parse(readFileSync(manifestPath, "utf8"));
    if (
      value?.schemaVersion === 1 &&
      value.files &&
      typeof value.files === "object"
    ) {
      for (const [name, hash] of Object.entries(value.files)) {
        if (
          /^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(name) &&
          typeof hash === "string" &&
          /^[a-f0-9]{64}$/.test(hash)
        )
          previous[name] = hash;
      }
    }
  } catch {
    /* No trustworthy ownership record. */
  }
  const digest = (file: string): string | undefined => {
    try {
      if (!lstatSync(file).isFile()) return undefined;
      return createHash("sha256").update(readFileSync(file)).digest("hex");
    } catch {
      return undefined;
    }
  };
  const names = readdirSync(hooksSrc, { withFileTypes: true })
    .filter((entry) => entry.isFile() && (!only || only.has(entry.name)))
    .map((entry) => entry.name);
  const files: Record<string, string> = {};
  for (const [name, hash] of Object.entries(previous)) {
    if (names.includes(name)) continue;
    const dest = join(hooksDest, name);
    if (digest(dest) === hash) {
      clearNonDirectory(dest);
    } else {
      try {
        // Preserve ownership evidence for modified stale files, including
        // replaced symlinks, in case a later release ships the name again.
        lstatSync(dest);
        files[name] = hash;
      } catch {
        /* No remaining file needs an ownership record. */
      }
    }
  }
  for (const name of names) {
    const src = join(hooksSrc, name);
    const dest = join(hooksDest, name);
    const generated = options.generatedSources?.get(name);
    const sourceHash =
      generated === undefined
        ? digest(src)
        : createHash("sha256").update(generated).digest("hex");
    if (!sourceHash) continue;
    let present = false;
    try {
      lstatSync(dest);
      present = true;
    } catch {
      /* Missing destination. */
    }
    const currentHash = digest(dest);
    if (
      present &&
      currentHash !== sourceHash &&
      !(previous[name] && currentHash === previous[name]) &&
      !(options.ownedNamespace && !previous[name])
    ) {
      console.warn(`Preserved user-owned hook script: ${dest}`);
      // Retain the original fingerprint so a subsequent namespace install
      // does not mistake this known customization for an adoptable legacy file.
      if (previous[name]) files[name] = previous[name];
      continue;
    }
    clearNonDirectory(dest);
    if (generated === undefined) {
      cpSync(src, dest, { force: true, dereference: true });
    } else {
      atomicWriteFileSync(dest, generated);
    }
    files[name] = sourceHash;
  }
  atomicWriteFileSync(
    manifestPath,
    `${JSON.stringify({ schemaVersion: 1, files }, null, 2)}\n`,
  );
}
