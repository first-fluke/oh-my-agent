import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import {
  applyRecommendedGeminiSettings,
  type GeminiSettings,
  sanitizeGeminiSettings,
} from "../../lib/gemini/settings.js";
import type { Migration } from "./index.js";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function normalizeGeminiProjectHooks(settings: GeminiSettings): boolean {
  let changed = false;
  const hooks = settings.hooks;
  if (!isRecord(hooks)) return false;

  const beforeTool = hooks.BeforeTool;
  if (!Array.isArray(beforeTool)) return false;

  for (const entry of beforeTool) {
    if (!isRecord(entry)) continue;

    if (entry.matcher === "Bash") {
      entry.matcher = "run_shell_command";
      changed = true;
    }

    const hookList = entry.hooks;
    if (!Array.isArray(hookList)) continue;

    for (const hook of hookList) {
      if (!isRecord(hook)) continue;
      if (hook.name === undefined && typeof hook.command === "string") {
        if (hook.command.includes("test-filter.ts")) {
          hook.name = "test-filter";
          changed = true;
        }
      }

      if (
        typeof hook.timeout === "number" &&
        hook.timeout > 0 &&
        hook.timeout < 1000
      ) {
        hook.timeout = hook.timeout * 1000;
        changed = true;
      }
    }
  }

  for (const eventName of ["BeforeAgent", "AfterAgent"] as const) {
    const entries = hooks[eventName];
    if (!Array.isArray(entries)) continue;

    for (const entry of entries) {
      if (!isRecord(entry)) continue;
      const hookList = entry.hooks;
      if (!Array.isArray(hookList)) continue;

      for (const hook of hookList) {
        if (!isRecord(hook)) continue;

        if (hook.name === undefined && typeof hook.command === "string") {
          if (hook.command.includes("keyword-detector.ts")) {
            hook.name = "keyword-detector";
            changed = true;
          }
          if (hook.command.includes("persistent-mode.ts")) {
            hook.name = "persistent-mode";
            changed = true;
          }
        }

        if (
          typeof hook.timeout === "number" &&
          hook.timeout > 0 &&
          hook.timeout < 1000
        ) {
          hook.timeout = hook.timeout * 1000;
          changed = true;
        }
      }
    }
  }

  return changed;
}

export const migrateGeminiCliCompat: Migration = {
  name: "006-gemini-cli-compat",
  up(cwd: string): string[] {
    const actions: string[] = [];
    const settingsPath = join(cwd, ".gemini", "settings.json");
    if (!existsSync(settingsPath)) return actions;

    let parsed: GeminiSettings;
    try {
      parsed = JSON.parse(
        readFileSync(settingsPath, "utf-8"),
      ) as GeminiSettings;
    } catch {
      return actions;
    }

    const sanitized = sanitizeGeminiSettings(parsed);
    const normalizedHooksChanged = normalizeGeminiProjectHooks(sanitized);
    const beforeRecommended = JSON.stringify(sanitized);
    const nextSettings = applyRecommendedGeminiSettings(sanitized);
    const compatibilityChanged =
      beforeRecommended !== JSON.stringify(nextSettings);

    if (!compatibilityChanged && !normalizedHooksChanged) {
      return actions;
    }

    writeFileSync(settingsPath, `${JSON.stringify(nextSettings, null, 2)}\n`);

    if (compatibilityChanged) {
      actions.push(".gemini/settings.json (Gemini CLI compatibility updated)");
    }
    if (normalizedHooksChanged) {
      actions.push(
        ".gemini/settings.json hooks (Gemini matcher/timeout normalized)",
      );
    }

    return actions;
  },
};
