/**
 * Antigravity CLI (agy) wiring. Two surfaces, two locations (per the official
 * contract at antigravity.google/docs/hooks, cross-checked against the binary):
 *
 *   1. HOOKS → a `hooks.json` in any of agy's customization directories. agy
 *      auto-loads it from the workspace root `.agents/`, `~/.gemini/config/`,
 *      AND its app-data dir `~/.gemini/antigravity-cli/` (all three verified
 *      via agy load logs, 2026-06-11; the /hooks UI registers into the last
 *      one). We write the project's `<workspace>/.agents/hooks.json`. The
 *      schema is a top-level map of hook NAME → event config:
 *        - lifecycle events (PreInvocation / PostInvocation / Stop): an array of
 *          handler objects directly (matcher ignored)
 *        - tool events (PreToolUse / PostToolUse): an array of
 *          `{ matcher, hooks: [handler] }` (matcher is a tool-name regex,
 *          e.g. `run_command`)
 *        - handler = `{ type:"command", command, timeout }` (timeout in SECONDS)
 *      Hooks inject context via PreInvocation `injectSteps` and gate Stop via
 *      `decision:"continue"` — see hook-output.ts.
 *
 *   2. STATUS LINE → a native `statusLine` field in agy's HOME settings.json
 *      (`~/.gemini/antigravity-cli/settings.json`). agy persists only its own
 *      settings allowlist there and STRIPS unknown keys on launch — verified
 *      that `hooks` and `defaultHooksPath` are both dropped, so we never write
 *      them. The HUD command runs from a HOME copy of the core hooks. We also
 *      manage the allowlisted `enableTelemetry` and `showFeedbackSurvey`
 *      booleans here (telemetry + feedback-survey opt-out by default; see
 *      installAntigravityHud).
 *
 * NOTE: agy hooks fire on the interactive execution loop; headless `agy --print`
 * does not run them, so live firing must be confirmed in an interactive session.
 */

import {
  cpSync,
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  unlinkSync,
} from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { standaloneHookSources } from "../../platform/hooks-composer/standalone-wrapper.js";
import { clearNonDirectory } from "../../utils/fs-utils.js";
import { readJsonMergeBaseOrWarn } from "../../utils/merge-read.js";
import { safeWriteFile, safeWriteJson } from "../../utils/safe-write.js";

/**
 * agy `settings.json` allowlist — the ONLY top-level keys agy persists in
 * `~/.gemini/antigravity-cli/settings.json`. agy STRIPS every unknown key on
 * launch, so this is the full surface oma may write. Reverse-engineered from
 * the `agy` Go binary's struct tags (`json:"…"`); recorded here so nobody has
 * to crack open the ~140 MB binary again. Verified against agy build 2026-06.
 *
 *   | key                  | type     | tag         | notes                          |
 *   |----------------------|----------|-------------|--------------------------------|
 *   | colorScheme          | string   | (required)  | e.g. "light" | "dark" | "system" |
 *   | theme                | string   | omitempty   | named theme (e.g. "solarized dark") |
 *   | model                | string   | (required)  | e.g. "Gemini 3.1 Pro (High)"   |
 *   | modelPreferences     | object   | omitempty   | per-model prefs                |
 *   | statusLine           | object   | (required)  | { type:"command", command }    |
 *   | toolPermission       | string   | omitempty   | tool-confirm mode (e.g. "always proceeds" / "asks for review") |
 *   | enableTelemetry      | bool     | (required)  | usage-stats opt-out lever      |
 *   | showFeedbackSurvey   | bool     | omitempty   | the "How's the CLI experience so far?" prompt |
 *   | showTips             | bool     | omitempty   | startup tips banner            |
 *   | vimMode              | bool     | omitempty   | vim keybindings                |
 *   | sandbox              | object   | omitempty   | sandbox/bypass config          |
 *   | trustedWorkspaces    | string[] | omitempty   | workspace trust allowlist      |
 *
 * oma only ever writes/manages: `statusLine` (HUD), `enableTelemetry`, and
 * `showFeedbackSurvey`. All other keys are user/agy-owned and preserved as-is.
 */
const AGY_HOME_DIR = ".gemini/antigravity-cli";
const ANTIGRAVITY_VARIANT = ".agents/hooks/variants/antigravity.json";
// agy's customization directory in the workspace is `.agents/`; hooks.json
// sits at its root and is auto-loaded.
const PROJECT_HOOKS_JSON = join(".agents", "hooks.json");
const PROJECT_CORE_HOOKS = join(".agents", "hooks", "core");
// Lifecycle events take handler arrays directly; tool events wrap handlers in
// `{ matcher, hooks: [...] }`.
const TOOL_EVENTS = new Set(["PreToolUse", "PostToolUse"]);

interface HookRef {
  hook: string;
  matcher?: string;
  timeout: number;
}

interface AntigravityVariant {
  events: Record<string, HookRef | HookRef[]>;
  statusLine?: { hook: string };
}

interface AgySettings {
  // biome-ignore lint/suspicious/noExplicitAny: settings.json schema is dynamic
  [key: string]: any;
}

function homePaths() {
  const home = homedir();
  const settingsPath = join(home, AGY_HOME_DIR, "settings.json");
  const hooksDir = join(home, AGY_HOME_DIR, "hooks");
  const staleHooksJson = join(home, AGY_HOME_DIR, "hooks.json");
  return { home, settingsPath, hooksDir, staleHooksJson };
}

function copyCoreHooks(sourceDir: string, hooksDir: string): void {
  const src = join(sourceDir, PROJECT_CORE_HOOKS);
  if (!existsSync(src)) return;

  mkdirSync(hooksDir, { recursive: true });
  for (const entry of readdirSync(hooksDir, { withFileTypes: true })) {
    clearNonDirectory(join(hooksDir, entry.name));
  }
  cpSync(src, hooksDir, { recursive: true, force: true, dereference: true });
  for (const [script, content] of standaloneHookSources("antigravity")) {
    if (existsSync(join(src, script))) {
      safeWriteFile(join(hooksDir, script), content);
    }
  }
}

function readAntigravityVariant(sourceDir: string): AntigravityVariant {
  const path = join(sourceDir, ANTIGRAVITY_VARIANT);
  try {
    return JSON.parse(readFileSync(path, "utf-8")) as AntigravityVariant;
  } catch {
    return {
      events: {
        PreInvocation: [
          { hook: "keyword-detector.ts", timeout: 5 },
          { hook: "state-boundary.ts", timeout: 5 },
          { hook: "skill-injector.ts", timeout: 3 },
        ],
        // No PreToolUse: agy's hook output contract is allow/deny/ask only —
        // it cannot rewrite tool args, so test-filter (a command rewriter)
        // has no effect there. Registering it would be dead config.
        Stop: { hook: "persistent-mode.ts", timeout: 5 },
      },
      statusLine: { hook: "hud.ts" },
    };
  }
}

function hookName(hook: string): string {
  return hook.replace(/\.[^.]+$/, "");
}

type AgyHooksDoc = Record<string, Record<string, unknown[]>>;

/** oma-managed entries in an agy hooks.json are namespaced `oma-*`. */
function isOmaHookName(name: string): boolean {
  return name.startsWith("oma-");
}

function readJsonRecord(path: string): Record<string, unknown> | null {
  try {
    const parsed = JSON.parse(readFileSync(path, "utf-8"));
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      return parsed as Record<string, unknown>;
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Merge the regenerated oma hook entries into an existing agy hooks.json.
 * User-registered hooks (any name without the `oma-` prefix — e.g. ones added
 * by hand or by agy's own /hooks UI) are preserved verbatim; stale `oma-*`
 * entries are swept and replaced by the fresh doc.
 */
function mergeAgyHooksDoc(
  existing: Record<string, unknown> | null,
  fresh: AgyHooksDoc,
): Record<string, unknown> {
  const merged: Record<string, unknown> = {};
  for (const [name, spec] of Object.entries(existing ?? {})) {
    if (!isOmaHookName(name)) merged[name] = spec;
  }
  return { ...merged, ...fresh };
}

/**
 * Build agy's `hooks.json` document: a top-level map of hook name → event
 * config. Each OMA core hook gets its own named entry; commands point at the
 * generated standalone wrappers by absolute path. Each entry dispatches only
 * its named handler, so separate agy registrations cannot repeat a full chain.
 */
function buildAgyHooksDoc(
  coreHooksDir: string,
  variant: AntigravityVariant,
): AgyHooksDoc {
  const doc: AgyHooksDoc = {};
  for (const [eventName, rawConfig] of Object.entries(variant.events)) {
    const configs = Array.isArray(rawConfig) ? rawConfig : [rawConfig];
    for (const config of configs) {
      const handler = {
        type: "command",
        command: `bun "${join(coreHooksDir, config.hook)}"`,
        timeout: config.timeout,
      };
      const entry = TOOL_EVENTS.has(eventName)
        ? [
            {
              ...(config.matcher ? { matcher: config.matcher } : {}),
              hooks: [handler],
            },
          ]
        : [handler];
      const name = `oma-${hookName(config.hook)}`;
      doc[name] = { ...(doc[name] ?? {}), [eventName]: entry };
    }
  }
  return doc;
}

interface AgyInstallResult {
  installed: boolean;
  reason?: string;
  settingsPath?: string;
  hooksJsonPath?: string;
  hooksDir?: string;
}

export interface AntigravityHudOptions {
  /**
   * Vendor telemetry preference (from oma-config.yaml, default `false`). When
   * `false`/unset, oma writes `enableTelemetry: false` AND
   * `showFeedbackSurvey: false` to agy's settings (silencing both usage stats
   * and the "How's the CLI experience so far?" survey). When `true`, oma
   * removes its own opt-outs so agy falls back to its own defaults.
   */
  telemetry?: boolean;
}

/**
 * Wire OMA into agy: write the project `.agents/hooks.json` (hook events) and
 * the HOME `statusLine` (HUD). Idempotent. Preserves unrelated settings keys
 * (colorScheme, toolPermission, trustedWorkspaces, ...).
 *
 * Telemetry + feedback survey: agy honors top-level `enableTelemetry` and
 * `showFeedbackSurvey` booleans in its settings allowlist (both survive agy's
 * key-stripping on launch). `showFeedbackSurvey` gates the recurring
 * "How's the CLI experience so far?" prompt. Mirroring the other vendors, oma
 * disables BOTH by default — survey responses are feedback data, so they ride
 * the same opt-out lever — and only steps aside when the user opts in via
 * `telemetry: true` in oma-config.yaml.
 *
 * Returns `installed: false` with a `reason` when agy's HOME config dir doesn't
 * exist (agy not installed / never run) — we don't bootstrap it ourselves.
 */
export function installAntigravityHud(
  sourceDir: string,
  options: AntigravityHudOptions = {},
): AgyInstallResult {
  const { settingsPath, hooksDir, staleHooksJson } = homePaths();
  const agyConfigDir = join(homedir(), AGY_HOME_DIR);

  if (!existsSync(agyConfigDir)) {
    return {
      installed: false,
      reason: `agy config dir not found at ~/${AGY_HOME_DIR} — run agy once to initialize`,
    };
  }

  // HOME copy backs the HUD; generated handlers route semantic delivery
  // through the CLI without editing the source core definitions.
  copyCoreHooks(sourceDir, hooksDir);

  const variant = readAntigravityVariant(sourceDir);
  const statusLineHook = variant.statusLine?.hook ?? "hud.ts";

  // Project hooks.json — agy auto-loads it from the workspace `.agents/` root.
  // Commands point at the HOME wrappers (absolute, cwd-independent).
  // MERGE, don't overwrite: the file is shared with user-registered hooks
  // (added by hand or via agy's /hooks UI) — only `oma-*` entries are ours.
  const hooksJsonPath = join(sourceDir, PROJECT_HOOKS_JSON);
  const coreHooksDir = join(sourceDir, PROJECT_CORE_HOOKS);
  let writtenHooksJson: string | undefined;
  if (existsSync(coreHooksDir)) {
    // A hooks.json that does not parse may hold user hooks: leave it alone.
    const existingHooks = readJsonMergeBaseOrWarn(hooksJsonPath);
    if (existingHooks) {
      mkdirSync(join(sourceDir, ".agents"), { recursive: true });
      safeWriteJson(
        hooksJsonPath,
        mergeAgyHooksDoc(existingHooks, buildAgyHooksDoc(hooksDir, variant)),
      );
      writtenHooksJson = hooksJsonPath;
    }
  }

  // HOME settings.json: wire the native statusLine; never write hooks/
  // defaultHooksPath (agy strips them). Remove dead keys from earlier installs.
  const parsedSettings = readJsonMergeBaseOrWarn(settingsPath);
  if (!parsedSettings) {
    // Never rewrite agy's settings from `{}`: it holds the user's model,
    // theme, permissions, and trusted workspaces.
    return {
      installed: false,
      reason: `could not parse ${settingsPath}; left it unchanged`,
      hooksJsonPath: writtenHooksJson,
      hooksDir,
    };
  }
  const settings: AgySettings = parsedSettings;
  settings.statusLine = {
    type: "command",
    command: `bun "${join(hooksDir, statusLineHook)}"`,
  };
  if ("hooks" in settings) delete settings.hooks;
  if ("defaultHooksPath" in settings) delete settings.defaultHooksPath;
  // Telemetry + feedback-survey opt-out (default) / opt-in. agy honors both
  // `enableTelemetry` and `showFeedbackSurvey`; oma disables them unless the
  // user opts in, in which case oma removes only the opt-out it would have
  // written so agy keeps its own default. `showFeedbackSurvey: false` silences
  // the recurring "How's the CLI experience so far?" prompt.
  if (options.telemetry === true) {
    if (settings.enableTelemetry === false) delete settings.enableTelemetry;
    if (settings.showFeedbackSurvey === false)
      delete settings.showFeedbackSurvey;
  } else {
    settings.enableTelemetry = false;
    settings.showFeedbackSurvey = false;
  }
  safeWriteJson(settingsPath, settings);

  // The HOME `~/.gemini/antigravity-cli/hooks.json` is NOT oma's to delete:
  // agy's /hooks registration UI writes user hooks there AND the loader reads
  // it (verified empirically 2026-06-11: an agy session in a workspace with no
  // `.agents/hooks.json` logs `loaded 1 named hooks from 1 hooks.json file(s)`
  // and executes the hook from this file). Remove it ONLY when it contains
  // nothing but oma's earlier (incorrect) install artifacts.
  if (existsSync(staleHooksJson)) {
    const parsed = readJsonRecord(staleHooksJson);
    const onlyOmaEntries =
      parsed !== null && Object.keys(parsed).every(isOmaHookName);
    if (onlyOmaEntries) {
      try {
        unlinkSync(staleHooksJson);
      } catch {
        // best-effort cleanup
      }
    }
  }

  return {
    installed: true,
    settingsPath,
    hooksJsonPath: writtenHooksJson,
    hooksDir,
  };
}
