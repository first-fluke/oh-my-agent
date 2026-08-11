import { existsSync, mkdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { parse as parseToml, stringify as stringifyToml } from "smol-toml";
import kimiVariant from "../../../.agents/hooks/variants/kimi.json" with {
  type: "json",
};
import {
  buildOmaHookArgs,
  shellQuote,
} from "../../platform/hooks-composer/hook-command.js";
import { generateOmaHookWrapper } from "../../platform/hooks-composer/oma-hook-wrapper.js";
import {
  copyHookScripts,
  requiredVariantScripts,
} from "../../platform/hooks-composer/script-copy.js";
import type { HookVariant } from "../../platform/hooks-composer/variant-types.js";
import { atomicWriteFileSync, safeWriteFile } from "../../utils/safe-write.js";
import { isRecord } from "../../utils/type-guards.js";
import { KIMI_HOME_MISSING_REASON, kimiHome } from "./auth.js";

const VARIANT = kimiVariant as HookVariant;

/** Filename of the generated oma-hook wrapper inside ~/.kimi-code/hooks. */
const OMA_HOOK_WRAPPER = "oma-hook.sh";

export interface KimiHookInstallResult {
  installed: boolean;
  reason?: string;
}

/** One `[[hooks]]` entry in ~/.kimi-code/config.toml. */
interface KimiTomlHook {
  event: string;
  matcher?: string;
  command: string;
  timeout?: number;
  [key: string]: unknown;
}

/**
 * Build the Kimi `[[hooks]]` entries for the oma handler chain.
 *
 * Kimi runs a single shell `command` per (event, matcher); we route the whole
 * handler chain through the oma-hook wrapper (`oma hook --vendor kimi ...`),
 * mirroring `installHooksFromVariant`. The wrapper path is absolute (HOME-local)
 * because Kimi exposes no project-dir env var and runs the command with cwd set
 * to the user's project, not the config dir.
 */
function buildKimiHooks(wrapperPath: string): KimiTomlHook[] {
  const hooks: KimiTomlHook[] = [];
  for (const [eventName, rawConfig] of Object.entries(VARIANT.events)) {
    const configs = Array.isArray(rawConfig) ? rawConfig : [rawConfig];
    if (configs.length === 0) continue;
    // Kimi has no statusLine surface; every event is a handler chain.
    const matcher = configs.find((c) => c.matcher)?.matcher;
    const timeout = configs.reduce((sum, c) => sum + c.timeout, 0) + 5;

    const hook: KimiTomlHook = {
      event: eventName,
      command: `${shellQuote(wrapperPath)} ${buildOmaHookArgs("kimi", eventName, matcher)}`,
      timeout,
    };
    if (matcher) hook.matcher = matcher;
    hooks.push(hook);
  }
  return hooks;
}

/** True for a config hook entry oma owns (its command runs the oma wrapper). */
function isOmaManagedKimiHook(hook: unknown): boolean {
  return (
    isRecord(hook) &&
    typeof hook.command === "string" &&
    hook.command.includes(OMA_HOOK_WRAPPER)
  );
}

/**
 * Install the oma hook chain into Kimi Code CLI's global config.
 *
 * Kimi is global-only — it reads hooks from `~/.kimi-code/config.toml`
 * (`KIMI_CODE_HOME`) and exposes no project-scoped config, so this writes to
 * HOME regardless of install mode. Callers MUST gate on recorded user consent
 * (kimi present in oma-config's vendors), exactly like the Antigravity HOME
 * wiring in `oma link`.
 *
 * Idempotent: re-running replaces oma-managed `[[hooks]]` entries and preserves
 * the user's own hooks and other config. Skips silently (returns a reason) when
 * `~/.kimi-code/` does not exist yet — Kimi creates it on first `kimi login`.
 */
export function installKimiHooks(sourceDir: string): KimiHookInstallResult {
  const base = kimiHome();
  if (!existsSync(base)) {
    return { installed: false, reason: KIMI_HOME_MISSING_REASON };
  }

  const hooksDir = join(base, "hooks");
  mkdirSync(hooksDir, { recursive: true });

  // 1. Materialize only the runtime-required scripts (filter-test-output.sh for
  //    the test-filter handler). Handler .ts files run in-process via `oma hook`.
  copyHookScripts(sourceDir, hooksDir, requiredVariantScripts(VARIANT));

  // 2. Write the oma-hook wrapper that resolves oma and execs `oma hook "$@"`.
  const wrapperPath = join(hooksDir, OMA_HOOK_WRAPPER);
  atomicWriteFileSync(wrapperPath, generateOmaHookWrapper(), { mode: 0o755 });

  // 3. Merge our `[[hooks]]` entries into config.toml, preserving user config.
  const configPath = join(base, "config.toml");
  let parsed: Record<string, unknown> = {};
  if (existsSync(configPath)) {
    try {
      const raw = readFileSync(configPath, "utf-8");
      if (raw.trim()) {
        const t = parseToml(raw);
        if (isRecord(t)) parsed = t as Record<string, unknown>;
      }
    } catch {
      // Malformed existing config — start fresh rather than crash the install.
      parsed = {};
    }
  }

  const existingHooks = Array.isArray(parsed.hooks)
    ? (parsed.hooks as unknown[])
    : [];
  const userHooks = existingHooks.filter((h) => !isOmaManagedKimiHook(h));
  parsed.hooks = [...userHooks, ...buildKimiHooks(wrapperPath)];

  // User-owned config we merge into (not an oma-generated file), so it takes
  // the backup-keeping writer — same treatment as grok/kiro global settings.
  safeWriteFile(configPath, stringifyToml(parsed));

  return { installed: true };
}
