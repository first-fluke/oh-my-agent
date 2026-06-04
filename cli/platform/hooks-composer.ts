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

// --- Hook self-dedup preamble ---
//
// When both a project install (<cwd>/.agents/) and a global install (~/.agents/)
// exist, the same hook event fires from both registrations — causing double-fire.
// Strategy: write a 2-second lock file at /tmp/oma-hook-${UID}-${OMA_SESSION_ID}.lock.
// The second invocation within that window sees the lock and exits silently.
//
// Two `stat` forms cover macOS (-f %m) and Linux (-c %Y).

/** The shell dedup preamble snippet prepended to every generated hook shell script. */
export const HOOK_DEDUP_PREAMBLE = `# oma-hook self-dedup — suppresses double-fire when both project and global installs exist
__oma_dedup_lock="/tmp/oma-hook-\${UID:-\${EUID:-0}}-\${OMA_SESSION_ID:-default}.lock"
if [ -f "$__oma_dedup_lock" ]; then
  __oma_age=$(( $(date +%s) - $(stat -f %m "$__oma_dedup_lock" 2>/dev/null || stat -c %Y "$__oma_dedup_lock" 2>/dev/null || echo 0) ))
  if [ "$__oma_age" -lt 2 ]; then
    exit 0
  fi
fi
echo "$$" > "$__oma_dedup_lock"`;

/**
 * Wrap a shell script body with the self-dedup preamble.
 *
 * The preamble writes a 2-second lock at /tmp/oma-hook-${UID}-${OMA_SESSION_ID}.lock
 * so a second hook registration (from a parallel project/global install) exits
 * silently within that window.
 *
 * @param scriptBody - Shell script content (without shebang) to wrap.
 * @returns Full shell script string with dedup preamble prepended.
 */
export function withDedup(scriptBody: string): string {
  return `${HOOK_DEDUP_PREAMBLE}\n${scriptBody}`;
}

/**
 * Generate a complete self-contained bash wrapper script for a hook command.
 *
 * The generated script:
 *  1. Applies the 2-second self-dedup lock so double-fire is suppressed when
 *     both a project and a global oma install register the same event.
 *  2. Delegates to `hookCommand` (typically `bun <path/to/hook.ts>`).
 *
 * @param hookCommand - The shell command to run (e.g. `bun .claude/hooks/keyword-detector.ts`).
 * @returns A complete bash script string, ready to write to disk.
 */
export function generateHookShellWrapper(hookCommand: string): string {
  return `#!/usr/bin/env bash\n${withDedup(`exec ${hookCommand} "$@"`)}\n`;
}

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
  events: Record<string, HookEvent | HookEvent[]>;
  statusLine?: { hook: string };
  /**
   * Parent settings key to nest the statusLine under. Omit for top-level
   * (Claude / agy use root `statusLine`). Qwen requires `ui.statusLine` — a
   * root-level statusLine is silently ignored by the Qwen Code renderer.
   */
  statusLineKey?: string;
  // biome-ignore lint/suspicious/noExplicitAny: extra settings vary by vendor
  extra?: Record<string, any>;
  featureFlags?: {
    file: string;
    section: string;
    flags: Record<string, boolean>;
  };
}

/** Build hook command string from variant config.
 *
 * Uses the bare runtime name (e.g. `bun`) so the written settings are
 * machine-independent. Resolving to an absolute path at install time caused
 * churn: every machine's `oma update` rewrote vendor settings with its own
 * `which bun` result.
 */
function buildHookCmd(variant: HookVariant, script: string): string {
  if (variant.projectDirEnv) {
    return `${variant.runtime} "$${variant.projectDirEnv}/${variant.hookDir}/${script}"`;
  }
  return `${variant.runtime} ${variant.hookDir}/${script}`;
}

function deriveHookName(script: string): string {
  return script.replace(/\.[^.]+$/, "");
}

/** True for non-null, non-array plain objects (used for shallow settings merges). */
function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function patchVendorHookTypes(hooksDest: string, vendor: string): void {
  if (vendor !== "codex" && vendor !== "qwen") {
    return;
  }

  // Output builders moved from types.ts to hook-output.ts; fall back to
  // the legacy location if a previous install left only types.ts on disk.
  const outputPath = join(hooksDest, "hook-output.ts");
  const legacyTypesPath = join(hooksDest, "types.ts");
  const targetPath = existsSync(outputPath) ? outputPath : legacyTypesPath;
  if (!existsSync(targetPath)) {
    return;
  }

  const content = readFileSync(targetPath, "utf-8");
  const legacyPreToolBranch = `    case "claude":
    case "codex":
    case "qwen":
      return JSON.stringify({
        hookSpecificOutput: {
          hookEventName: "PreToolUse",
          updatedInput,
        },
      });`;
  const patchedPreToolBranch = `    case "claude":
      return JSON.stringify({
        hookSpecificOutput: {
          hookEventName: "PreToolUse",
          updatedInput,
        },
      });
    case "codex":
    case "qwen":
      return JSON.stringify({
        updated_input: updatedInput,
      });`;

  if (!content.includes(legacyPreToolBranch)) {
    return;
  }

  writeFileSync(
    targetPath,
    content.replace(legacyPreToolBranch, patchedPreToolBranch),
    "utf-8",
  );
}

function patchCopiedHookFile(
  hooksDest: string,
  filename: string,
  needle: string,
  replacement: string,
): void {
  const filePath = join(hooksDest, filename);
  if (!existsSync(filePath)) {
    return;
  }

  const content = readFileSync(filePath, "utf-8");
  if (!content.includes(needle)) {
    return;
  }

  writeFileSync(filePath, content.replace(needle, replacement), "utf-8");
}

function patchVendorDetection(hooksDest: string): void {
  const legacyTestFilterDetectVendor = `function detectVendor(input: Record<string, unknown>): Vendor {
  const event = input.hook_event_name as string | undefined;
  if (event === "BeforeTool") return "gemini";
  if (event === "PreToolUse") {
    if ("session_id" in input && !("sessionId" in input)) return "codex";
  }
  if (process.env.QWEN_PROJECT_DIR) return "qwen";
  return "claude";
}`;
  const patchedTestFilterDetectVendor = `function inferVendorFromScriptPath(): Vendor | null {
  const path = import.meta.filename;
  if (path.includes(\`\${join(".cursor", "hooks")}\`)) return "cursor";
  if (path.includes(\`\${join(".qwen", "hooks")}\`)) return "qwen";
  if (path.includes(\`\${join(".claude", "hooks")}\`)) return "claude";
  if (path.includes(\`\${join(".gemini", "hooks")}\`)) return "gemini";
  if (path.includes(\`\${join(".codex", "hooks")}\`)) return "codex";
  if (path.includes(\`\${join(".grok", "hooks")}\`)) return "grok";
  return null;
}

function detectVendor(input: Record<string, unknown>): Vendor {
  const event = input.hook_event_name as string | undefined;
  const hookEventName = input.hookEventName as string | undefined;
  const byScriptPath = inferVendorFromScriptPath();
  if (byScriptPath) return byScriptPath;
  if (process.env.GROK_WORKSPACE_ROOT) return "grok";
  if (event === "BeforeTool") return "gemini";
  if (event === "PreToolUse" && "session_id" in input) return "codex";
  if (process.env.QWEN_PROJECT_DIR) return "qwen";
  return "claude";
}`;
  patchCopiedHookFile(
    hooksDest,
    "test-filter.ts",
    legacyTestFilterDetectVendor,
    patchedTestFilterDetectVendor,
  );

  const legacyPersistentModeDetectVendor = `function detectVendor(input: Record<string, unknown>): Vendor {
  const event = input.hook_event_name as string | undefined;
  if (event === "AfterAgent") return "gemini";
  if (event === "Stop") {
    if ("session_id" in input && !("sessionId" in input)) return "codex";
  }
  if (process.env.QWEN_PROJECT_DIR) return "qwen";
  return "claude";
}`;
  const patchedPersistentModeDetectVendor = `function inferVendorFromScriptPath(): Vendor | null {
  const path = import.meta.filename;
  if (path.includes(\`\${join(".cursor", "hooks")}\`)) return "cursor";
  if (path.includes(\`\${join(".qwen", "hooks")}\`)) return "qwen";
  if (path.includes(\`\${join(".claude", "hooks")}\`)) return "claude";
  if (path.includes(\`\${join(".gemini", "hooks")}\`)) return "gemini";
  if (path.includes(\`\${join(".codex", "hooks")}\`)) return "codex";
  if (path.includes(\`\${join(".grok", "hooks")}\`)) return "grok";
  return null;
}

function detectVendor(input: Record<string, unknown>): Vendor {
  const event = input.hook_event_name as string | undefined;
  const hookEventName = input.hookEventName as string | undefined;
  const byScriptPath = inferVendorFromScriptPath();
  if (byScriptPath) return byScriptPath;
  if (process.env.GROK_WORKSPACE_ROOT || hookEventName?.includes("stop")) return "grok";
  if (event === "AfterAgent") return "gemini";
  if (event === "Stop" && "session_id" in input) return "codex";
  if (process.env.QWEN_PROJECT_DIR) return "qwen";
  return "claude";
}`;
  patchCopiedHookFile(
    hooksDest,
    "persistent-mode.ts",
    legacyPersistentModeDetectVendor,
    patchedPersistentModeDetectVendor,
  );
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
  mkdirSync(dirname(settingsPath), { recursive: true });

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
  if (extra) {
    // Shallow-merge one level deep so nested keys like `ui` (Qwen statusLine)
    // or `permissions` augment — rather than clobber — existing vendor settings.
    for (const [key, value] of Object.entries(extra)) {
      const existing = settings[key];
      if (isPlainObject(value) && isPlainObject(existing)) {
        settings[key] = { ...existing, ...value };
      } else {
        settings[key] = value;
      }
    }
  }
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
  const hooksDest = join(targetDir, variant.hookDir);
  copyHookScripts(sourceDir, hooksDest);
  patchVendorHookTypes(hooksDest, variant.vendor);
  patchVendorDetection(hooksDest);

  // 2. Build hook entries from events (single or chained)
  // biome-ignore lint/suspicious/noExplicitAny: hook config varies by vendor
  const hookEntries: Record<string, any> = {};
  for (const [eventName, rawConfig] of Object.entries(variant.events)) {
    const configs = Array.isArray(rawConfig) ? rawConfig : [rawConfig];
    if (configs.length === 0) continue;

    const hooks = configs.map((c) => ({
      name: deriveHookName(c.hook),
      type: "command",
      command: buildHookCmd(variant, c.hook),
      timeout: c.timeout,
    }));

    // biome-ignore lint/suspicious/noExplicitAny: hook entry shape varies
    const entry: any = { hooks };
    const matcher = configs.find((c) => c.matcher)?.matcher;
    if (matcher) entry.matcher = matcher;
    hookEntries[eventName] = [entry];
  }

  // 3. Build extra settings (statusLine, permissions, etc.)
  // biome-ignore lint/suspicious/noExplicitAny: extra settings are dynamic
  const extra: Record<string, any> = {};
  if (variant.statusLine) {
    const statusLineEntry = {
      type: "command",
      command: buildHookCmd(variant, variant.statusLine.hook),
    };
    if (variant.statusLineKey) {
      // Qwen Code reads `ui.statusLine`; a root-level entry is ignored.
      extra[variant.statusLineKey] = { statusLine: statusLineEntry };
    } else {
      extra.statusLine = statusLineEntry;
    }
  }
  if (variant.extra) Object.assign(extra, variant.extra);

  // 4. Merge into settings file (or write Grok-native hook file)
  if (variant.vendor === "grok") {
    // Grok discovers hooks from .grok/hooks/*.json files (directory-based).
    // Write a single well-named file with the double-nested shape Grok expects.
    const grokHookFile = join(targetDir, variant.settingsFile);
    mkdirSync(dirname(grokHookFile), { recursive: true });
    const grokPayload = { hooks: hookEntries };
    writeFileSync(grokHookFile, `${JSON.stringify(grokPayload, null, 2)}\n`);
  } else {
    mergeIntoSettings(
      join(targetDir, variant.settingsFile),
      hookEntries,
      Object.keys(extra).length > 0 ? extra : undefined,
    );
  }

  // 5. Vendor-specific feature flags (e.g., Codex config.toml)
  if (variant.featureFlags) {
    ensureFeatureFlags(
      join(targetDir, variant.featureFlags.file),
      variant.featureFlags.section,
      variant.featureFlags.flags,
    );
  }
}
