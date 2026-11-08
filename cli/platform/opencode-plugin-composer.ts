import { cpSync, existsSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import {
  OPENCODE_FAMILY_HOSTS,
  type OpencodeFamilyVendor,
} from "../constants/opencode-family.js";
import { readJsonForMerge, warnUnmergeable } from "../utils/merge-read.js";
import { standaloneHookSources } from "./hooks-composer/standalone-wrapper.js";
import { copyHookScripts } from "./hooks-composer.js";
import { safeGetInstallMode } from "./install-context.js";

/**
 * Install path for the opencode-family plugin bridge (Sst opencode and its
 * forks such as Kilo Code — see `OPENCODE_FAMILY_HOSTS`).
 *
 * Unlike the other vendors, opencode does not register settings-file hooks; it
 * loads in-process TypeScript plugins from `.opencode/plugins/`. So opencode is
 * NOT handled by `installHooksFromVariant`. Instead it gets this forked path,
 * invoked from `link()` whenever `opencode` is in the configured vendor set.
 * Kilo keeps the same plugin model under `.kilo/plugins/` and `kilo.json`.
 *
 * NOTE: opencode's auto-discovery is flat — it only loads `.opencode/plugins/*`
 * files, not subdirectories. The bridge lives in a nested `oma/` subdir (it
 * spawns handler entries installed alongside it), so it is invisible to
 * auto-discovery and must be registered explicitly via `registerOpencodePlugin`.
 *
 * See `.agents/hooks/variants/opencode/oma.ts` for the bridge source (shared
 * unchanged by every opencode-family host).
 */

/** Directory (relative to the install root) of the opencode plugin. */
export const OPENCODE_PLUGIN_DIR = join(".opencode", "plugins", "oma");

/**
 * SSOT bridge source, relative to the oma source dir. Shared by the
 * per-project install below and by `oma emit --target opencode-package`,
 * which ships the same file as the npm package entry point.
 */
export const OPENCODE_BRIDGE_SOURCE = join(
  ".agents",
  "hooks",
  "variants",
  "opencode",
  "oma.ts",
);

/**
 * npm package entry emitted beside the bridge: the OpenCode 2.x definition
 * (`{ id, setup }`) plus the legacy function export for Kilo / OpenCode 1.x.
 * Not installed per project — the per-project path registers the bridge.
 */
export const OPENCODE_PACKAGE_ENTRY_SOURCE = join(
  ".agents",
  "hooks",
  "variants",
  "opencode",
  "index.ts",
);

/**
 * Native config dir of an opencode-family host: `<root>/.opencode` in project
 * mode, `<home>/.config/opencode` in global mode (`.kilo` / `.config/kilo` for
 * Kilo). `nativeRoot` is the project root or HOME respectively.
 */
export function opencodeFamilyConfigDir(
  nativeRoot: string,
  host: OpencodeFamilyVendor = "opencode",
  global = safeGetInstallMode() === "global",
): string {
  const spec = OPENCODE_FAMILY_HOSTS[host];
  return global
    ? join(nativeRoot, ".config", spec.configDirName)
    : join(nativeRoot, spec.projectDir);
}

/**
 * The config file `registerOpencodePlugin` writes: an existing
 * `<basename>.json` is rewritten in place, otherwise `<basename>.jsonc`.
 */
export function opencodeFamilyConfigPath(
  configDir: string,
  host: OpencodeFamilyVendor = "opencode",
): string {
  const basename = OPENCODE_FAMILY_HOSTS[host].configBasename;
  const jsonPath = join(configDir, `${basename}.json`);
  return existsSync(jsonPath) ? jsonPath : join(configDir, `${basename}.jsonc`);
}

/**
 * Materialize the opencode bridge into `<targetDir>/.opencode/plugins/oma/`
 * (`<targetDir>/.kilo/plugins/oma/` for Kilo):
 *  1. Install generated Bun handler entries that dispatch through the CLI,
 *     with supporting files such as `filter-test-output.sh`.
 *  2. Copy the bridge `oma.ts` as the plugin entry point.
 *
 * Idempotent: tracked handler entries are reconciled by their fingerprints;
 * modified entries are preserved. The managed bridge is re-written.
 */
export function installOpencodePlugin(
  sourceDir: string,
  targetDir: string,
  host: OpencodeFamilyVendor = "opencode",
): void {
  const global = safeGetInstallMode() === "global";
  const pluginDir = join(
    opencodeFamilyConfigDir(targetDir, host, global),
    "plugins",
    "oma",
  );

  copyHookScripts(sourceDir, pluginDir, undefined, {
    ownedNamespace: true,
    generatedSources: standaloneHookSources(
      host,
      global ? sourceDir : undefined,
    ),
  });

  // 2. The bridge entry point.
  const shimSrc = join(sourceDir, OPENCODE_BRIDGE_SOURCE);
  if (existsSync(shimSrc)) {
    cpSync(shimSrc, join(pluginDir, "oma.ts"), {
      force: true,
      dereference: true,
    });
  }
}

/**
 * Config-relative path to the bridge entry point, as registered under the
 * `plugin` key of `.opencode/opencode.jsonc` (`.kilo/kilo.jsonc` for Kilo).
 *
 * The bridge lives in a nested `oma/` subdirectory (alongside the core hook
 * scripts it spawns), but opencode only auto-discovers plugin files placed
 * directly in `.opencode/plugins/`. It does NOT recurse into subdirectories, so
 * the nested bridge is invisible to auto-discovery and must be registered by an
 * explicit relative path instead.
 */
export const OPENCODE_PLUGIN_ENTRY = "./plugins/oma/oma.ts";

/**
 * Register the OMA bridge in `.opencode/opencode.jsonc` so opencode loads it
 * (`.kilo/kilo.jsonc` for Kilo).
 *
 * `installOpencodePlugin` only materializes the bridge files; opencode will not
 * pick the nested `plugins/oma/oma.ts` up via auto-discovery (which is flat,
 * `.opencode/plugins/*.ts` only). Without an explicit `plugin` entry,
 * `opencode debug info` reports `plugins: none` and bootstrap can fail with
 * `ConfigInvalidError`. This adds `OPENCODE_PLUGIN_ENTRY` to the config's
 * `plugin` array, preserving any existing keys/entries.
 *
 * Idempotent: re-running leaves an already-registered config byte-identical.
 * An existing `opencode.json` is preferred over `opencode.jsonc` when present;
 * otherwise a fresh `opencode.jsonc` is created. Comments in an existing config
 * are dropped on rewrite (same tradeoff as the competitors uninstall path); a
 * config that does not parse is left untouched with a warning.
 */
export function registerOpencodePlugin(
  targetDir: string,
  host: OpencodeFamilyVendor = "opencode",
): void {
  const dir = opencodeFamilyConfigDir(targetDir, host);
  const configPath = opencodeFamilyConfigPath(dir, host);

  // JSONC (comments, trailing commas) parses; anything still invalid is left
  // untouched — rewriting it from `{}` would erase the user's host config.
  const read = readJsonForMerge(configPath);
  if (read.status === "invalid") {
    warnUnmergeable(configPath, read.reason);
    return;
  }
  const config: Record<string, unknown> =
    read.status === "ok" ? read.value : {};

  if (typeof config.$schema !== "string") {
    config.$schema = OPENCODE_FAMILY_HOSTS[host].schema;
  }

  const plugins = Array.isArray(config.plugin)
    ? config.plugin.filter((p): p is string => typeof p === "string")
    : [];
  if (!plugins.includes(OPENCODE_PLUGIN_ENTRY)) {
    plugins.push(OPENCODE_PLUGIN_ENTRY);
  }
  config.plugin = plugins;

  mkdirSync(dir, { recursive: true });
  writeFileSync(configPath, `${JSON.stringify(config, null, 2)}\n`);
}
