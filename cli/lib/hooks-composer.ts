import { execFileSync } from "node:child_process";
import {
  cpSync,
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { dirname, join } from "node:path";
import { clearNonDirectory } from "../utils/fs-utils.js";

// --- Variant-driven hook installation ---

export interface HookEvent {
  hook: string;
  matcher?: string;
  timeout: number;
}

export interface HookVariant {
  vendor: string;
  hookDir: string;
  settingsFile: string;
  projectDirEnv: string | null;
  runtime: string;
  events: Record<string, HookEvent>;
  statusLine?: { hook: string };
  // biome-ignore lint/suspicious/noExplicitAny: extra settings vary by vendor
  extra?: Record<string, any>;
  featureFlags?: {
    file: string;
    section: string;
    flags: Record<string, boolean>;
  };
}

function quoteShellWord(value: string): string {
  return `"${value.replaceAll('"', '\\"')}"`;
}

function resolveRuntimeCmd(runtime: string): string {
  if (runtime === "bun") {
    try {
      const runtimePath = execFileSync("which", [runtime], {
        encoding: "utf-8",
      }).trim();
      if (runtimePath) return quoteShellWord(runtimePath);
    } catch {
      // Fall back to the bare runtime name when shell lookup is unavailable.
    }
  }

  return runtime;
}

/** Build hook command string from variant config. */
function buildHookCmd(variant: HookVariant, script: string): string {
  const runtimeCmd = resolveRuntimeCmd(variant.runtime);
  if (variant.projectDirEnv) {
    return `${runtimeCmd} "$${variant.projectDirEnv}/${variant.hookDir}/${script}"`;
  }
  return `${runtimeCmd} ${variant.hookDir}/${script}`;
}

function deriveHookName(script: string): string {
  return script.replace(/\.[^.]+$/, "");
}

/**
 * Copy core hook scripts from .agents/hooks/core/ to a vendor's hooks directory.
 * Clears stale symlinks/files first, then copies with dereference to ensure
 * real file copies (never symlinks that break when the temp dir is deleted).
 */
export function copyHookScripts(sourceDir: string, hooksDest: string): void {
  const hooksSrc = join(sourceDir, ".agents", "hooks", "core");
  if (!existsSync(hooksSrc)) return;

  mkdirSync(hooksDest, { recursive: true });

  // Remove ALL existing non-directory entries (files, symlinks, broken symlinks)
  // before cpSync — Bun's cpSync fails with ENOENT on broken symlinks even with force.
  for (const entry of readdirSync(hooksDest, { withFileTypes: true })) {
    clearNonDirectory(join(hooksDest, entry.name));
  }

  cpSync(hooksSrc, hooksDest, {
    recursive: true,
    force: true,
    dereference: true,
  });
}

/**
 * Merge hook entries (and optional extra fields) into a JSON settings file.
 * Preserves existing settings outside the hooks/extra keys.
 */
export function mergeIntoSettings(
  settingsPath: string,
  // biome-ignore lint/suspicious/noExplicitAny: hook config varies by vendor
  hookEntries: Record<string, any>,
  // biome-ignore lint/suspicious/noExplicitAny: extra fields like statusLine
  extra?: Record<string, any>,
): void {
  // biome-ignore lint/suspicious/noExplicitAny: settings.json schema is dynamic
  let settings: any = {};

  if (existsSync(settingsPath)) {
    try {
      settings = JSON.parse(readFileSync(settingsPath, "utf-8"));
    } catch {
      // Corrupted — start fresh
    }
  }

  settings.hooks = { ...(settings.hooks || {}), ...hookEntries };
  if (extra) Object.assign(settings, extra);
  writeFileSync(settingsPath, `${JSON.stringify(settings, null, 2)}\n`);
}

/**
 * Ensure feature flags are enabled in a TOML config file.
 * Creates file if missing, appends section if not present.
 */
export function ensureFeatureFlags(
  configPath: string,
  section: string,
  flags: Record<string, boolean>,
): void {
  mkdirSync(dirname(configPath), { recursive: true });

  let content = "";
  if (existsSync(configPath)) {
    content = readFileSync(configPath, "utf-8");
  }

  for (const [key, value] of Object.entries(flags)) {
    const enabledRe = new RegExp(`${key}\\s*=\\s*${value}`, "i");
    if (enabledRe.test(content)) continue;

    const disabledRe = new RegExp(`${key}\\s*=\\s*${!value}`, "i");
    if (disabledRe.test(content)) {
      content = content.replace(disabledRe, `${key} = ${value}`);
      writeFileSync(configPath, content);
      continue;
    }

    const sectionRe = new RegExp(`\\[${section}\\]`, "i");
    if (sectionRe.test(content)) {
      content = content.replace(
        new RegExp(`(\\[${section}\\][^[]*)`, "i"),
        `$1${key} = ${value}\n`,
      );
      writeFileSync(configPath, content);
    } else {
      content = `${content.trimEnd()}\n\n[${section}]\n${key} = ${value}\n`;
      writeFileSync(configPath, content);
    }
  }
}

/**
 * Install hooks for any vendor using its variant config from .agents/hooks/variants/.
 * Reads the variant JSON, copies core hooks, generates settings entries.
 */
export function installHooksFromVariant(
  sourceDir: string,
  targetDir: string,
  variant: HookVariant,
): void {
  // 1. Copy core hook files to vendor hooks directory
  copyHookScripts(sourceDir, join(targetDir, variant.hookDir));

  // 2. Build hook entries from events
  // biome-ignore lint/suspicious/noExplicitAny: hook config varies by vendor
  const hookEntries: Record<string, any> = {};
  for (const [eventName, config] of Object.entries(variant.events)) {
    // biome-ignore lint/suspicious/noExplicitAny: hook entry shape varies
    const entry: any = {
      hooks: [
        {
          name: deriveHookName(config.hook),
          type: "command",
          command: buildHookCmd(variant, config.hook),
          timeout: config.timeout,
        },
      ],
    };
    if (config.matcher) entry.matcher = config.matcher;
    hookEntries[eventName] = [entry];
  }

  // 3. Build extra settings (statusLine, permissions, etc.)
  // biome-ignore lint/suspicious/noExplicitAny: extra settings are dynamic
  const extra: Record<string, any> = {};
  if (variant.statusLine) {
    extra.statusLine = {
      type: "command",
      command: buildHookCmd(variant, variant.statusLine.hook),
    };
  }
  if (variant.extra) Object.assign(extra, variant.extra);

  // 4. Merge into settings file
  mergeIntoSettings(
    join(targetDir, variant.settingsFile),
    hookEntries,
    Object.keys(extra).length > 0 ? extra : undefined,
  );

  // 5. Vendor-specific feature flags (e.g., Codex config.toml)
  if (variant.featureFlags) {
    ensureFeatureFlags(
      join(targetDir, variant.featureFlags.file),
      variant.featureFlags.section,
      variant.featureFlags.flags,
    );
  }
}
