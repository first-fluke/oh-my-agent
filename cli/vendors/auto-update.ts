/**
 * `vendor_auto_update` in oma-config: one switch for the self-updater of every
 * selected vendor CLI.
 *
 *   false  — write each vendor's documented update opt-out
 *   true   — remove an opt-out that still holds the value oma writes
 *   absent — callers do not call this module; vendor settings stay untouched
 *
 * Only opt-outs a vendor documents as a config-file key are written. Each one
 * goes to the file that vendor honors it from: Claude, Codex and Qwen read it
 * from the project config, the rest from their user config only (`home`
 * targets), which is skipped while the vendor's config directory does not
 * exist yet (the CLI was never run).
 *
 *   claude   env.DISABLE_AUTOUPDATER = "1"         .claude/settings.json
 *   codex    check_for_update_on_startup = false   .codex/config.toml
 *   qwen     general.enableAutoUpdate = false      .qwen/settings.json
 *   grok     [cli] auto_update = false             ~/.grok/config.toml
 *   kiro     "app.disableAutoupdates" = true       ~/.kiro/settings/cli.json
 *   opencode update = "disable"                    ~/.config/opencode/opencode.json(c)
 *   kilo     autoupdate = false                    ~/.config/kilo/kilo.json(c)
 *   kimi     [upgrade] auto_install = false        ~/.kimi-code/tui.toml
 *   copilot  autoUpdate = false                    ~/.copilot/settings.json
 *
 * No config-file opt-out exists for antigravity (`AGY_CLI_DISABLE_AUTO_UPDATE`),
 * pi (`PI_SKIP_VERSION_CHECK`) and commandcode (`COMMANDCODE_SKIP_UPDATES`) —
 * environment variables only — nor a documented one for cursor, zcode and
 * hermes.
 */

import { existsSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import {
  OPENCODE_FAMILY_HOSTS,
  type OpencodeFamilyVendor,
} from "../constants/opencode-family.js";
import type { CliVendor } from "../types/index.js";
import { warnUnmergeable } from "../utils/merge-read.js";
import { safeWriteFile } from "../utils/safe-write.js";
import { isRecord } from "../utils/type-guards.js";
import { browserMcpDocument } from "./browser-mcp-document.js";
import { kiroHome } from "./kiro/trust.js";

export type VendorAutoUpdateOptions = {
  global?: boolean;
  dryRun?: boolean;
  home?: string;
};

export type VendorAutoUpdateTarget = {
  path: string;
  format: "jsonc" | "toml";
  /** Path of the opt-out key; one segment may itself contain a dot (kiro). */
  keys: string[];
  /** The value that turns the vendor's self-updater off. */
  off: string | boolean;
  /** Lives in the vendor's HOME config rather than under the project. */
  home: boolean;
};

/** Native files and keys of each vendor's update opt-out. */
export function vendorAutoUpdateTargets(
  root: string,
  vendors: readonly string[],
  options: VendorAutoUpdateOptions = {},
): VendorAutoUpdateTarget[] {
  const home = options.home ?? homedir();
  const global = options.global === true;
  const envDir = (name: string, fallback: string): string =>
    process.env[name]?.trim() || join(home, fallback);
  const target = (
    path: string,
    keys: string[],
    off: string | boolean,
    inHome: boolean,
  ): VendorAutoUpdateTarget => ({
    path,
    format: path.endsWith(".toml") ? "toml" : "jsonc",
    keys,
    off,
    home: inHome,
  });
  // Honored from the project config: the project file for a project install.
  const scoped = (
    local: string,
    globalPath: string,
    keys: string[],
    off: string | boolean,
  ): VendorAutoUpdateTarget[] => [
    target(global ? globalPath : join(root, local), keys, off, global),
  ];
  // Read from the vendor's user config only, whatever the install mode.
  const user = (
    path: string,
    keys: string[],
    off: string | boolean,
  ): VendorAutoUpdateTarget[] => [target(path, keys, off, true)];
  // opencode-family hosts take update settings from the global config alone
  // ("project-level values are ignored"). opencode replaced `autoupdate` with
  // the `update` enum; Kilo's updater still reads `autoupdate`.
  const opencodeFamily =
    (host: OpencodeFamilyVendor, keys: string[], off: string | boolean) =>
    (): VendorAutoUpdateTarget[] => {
      const spec = OPENCODE_FAMILY_HOSTS[host];
      const base = join(
        process.env.XDG_CONFIG_HOME?.trim() || join(home, ".config"),
        spec.configDirName,
      );
      const candidates = [
        join(base, `${spec.configBasename}.json`),
        join(base, `${spec.configBasename}.jsonc`),
      ];
      const existing = candidates.filter(existsSync);
      return (
        existing.length
          ? existing
          : [join(base, `${spec.configBasename}.jsonc`)]
      ).flatMap((path) => user(path, keys, off));
    };
  // Exhaustive by design: a new OMA vendor must state its opt-out (or none).
  const targets: Record<CliVendor, () => VendorAutoUpdateTarget[]> = {
    claude: () =>
      scoped(
        ".claude/settings.json",
        join(envDir("CLAUDE_CONFIG_DIR", ".claude"), "settings.json"),
        ["env", "DISABLE_AUTOUPDATER"],
        "1",
      ),
    codex: () =>
      scoped(
        ".codex/config.toml",
        join(envDir("CODEX_HOME", ".codex"), "config.toml"),
        ["check_for_update_on_startup"],
        false,
      ),
    qwen: () =>
      scoped(
        ".qwen/settings.json",
        join(home, ".qwen", "settings.json"),
        ["general", "enableAutoUpdate"],
        false,
      ),
    grok: () =>
      user(
        join(envDir("GROK_HOME", ".grok"), "config.toml"),
        ["cli", "auto_update"],
        false,
      ),
    // kiro-cli stores settings as flat dotted keys, not nested objects.
    kiro: () =>
      user(
        join(kiroHome(process.env, home), "settings", "cli.json"),
        ["app.disableAutoupdates"],
        true,
      ),
    opencode: opencodeFamily("opencode", ["update"], "disable"),
    kilo: opencodeFamily("kilo", ["autoupdate"], false),
    kimi: () =>
      user(
        join(envDir("KIMI_CODE_HOME", ".kimi-code"), "tui.toml"),
        ["upgrade", "auto_install"],
        false,
      ),
    copilot: () =>
      user(
        join(envDir("COPILOT_HOME", ".copilot"), "settings.json"),
        ["autoUpdate"],
        false,
      ),
    // Environment-variable opt-outs only; nothing oma can persist.
    antigravity: () => [],
    pi: () => [],
    commandcode: () => [],
    // No documented opt-out.
    cursor: () => [],
    zcode: () => [],
    hermes: () => [],
  };
  const result: VendorAutoUpdateTarget[] = [];
  for (const vendor of new Set(vendors)) {
    if (!Object.hasOwn(targets, vendor)) continue;
    result.push(...targets[vendor as CliVendor]());
  }
  return result;
}

/**
 * Apply the `vendor_auto_update` preference to every selected vendor and
 * return the files that changed (or would change, under `dryRun`).
 *
 * A file that does not parse is reported and skipped, never rewritten, and
 * one vendor's failure does not stop the others.
 */
export function syncVendorAutoUpdate(
  root: string,
  autoUpdate: boolean,
  vendors: readonly string[],
  options: VendorAutoUpdateOptions = {},
): string[] {
  const changed: string[] = [];
  for (const target of vendorAutoUpdateTargets(root, vendors, options)) {
    if (target.home && !existsSync(dirname(target.path))) continue;
    // Re-enabling only ever removes a key, so a missing file has nothing to do.
    if (autoUpdate && !existsSync(target.path)) continue;
    try {
      const doc = browserMcpDocument(target);
      if (!autoUpdate) {
        doc.set(target.keys, target.off);
      } else if (doc.get(target.keys) === target.off) {
        // Only the value oma writes is removed; any other value is the
        // user's own choice.
        doc.set(target.keys, undefined);
        const parentKeys = target.keys.slice(0, -1);
        const parent = parentKeys.length ? doc.get(parentKeys) : undefined;
        if (isRecord(parent) && Object.keys(parent).length === 0) {
          doc.set(parentKeys, undefined);
        }
      }
      const change = doc.result();
      if (!change) continue;
      if (!options.dryRun) safeWriteFile(change.path, change.content);
      changed.push(change.path);
    } catch (error) {
      warnUnmergeable(
        target.path,
        error instanceof Error ? error.message : String(error),
      );
    }
  }
  return changed;
}
