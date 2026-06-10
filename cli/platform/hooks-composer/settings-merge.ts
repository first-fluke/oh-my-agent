import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";

/** True for non-null, non-array plain objects (used for shallow settings merges). */
export function isPlainObject(
  value: unknown,
): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * Known OMA-managed core hook script basenames (without extension).
 *
 * Used by `isOmaManagedHookGroup` to identify legacy `bun …/<script>.ts`
 * entries written by pre-019 installs so they can be replaced on re-install.
 */
const OMA_CORE_SCRIPT_NAMES = new Set([
  "keyword-detector",
  "skill-injector",
  "serena-primer",
  "state-boundary",
  "test-filter",
  "persistent-mode",
  "hud",
]);

/**
 * Return true if a hook group object (one element of an event's array in
 * `settings.hooks`) was written by oma and should be replaced on re-install.
 *
 * Two generations are matched:
 *
 * **New (design 019)** — the group contains a hook whose `name` starts with
 * `"oma-hook-"` or whose `command` contains `"oma-hook.sh"`.
 *
 * **Legacy (pre-019)** — the group contains a hook whose `command` matches
 * the old `bun "<hookDir>/<script>.{ts,js}"` or `bun <hookDir>/<script>.{ts,js}`
 * pattern for any of the known OMA core scripts.
 *
 * User-added hook groups are never matched by either pattern, so they are
 * preserved verbatim.
 */
export function isOmaManagedHookGroup(
  // biome-ignore lint/suspicious/noExplicitAny: hook group shape varies by vendor
  group: any,
): boolean {
  if (!isPlainObject(group)) return false;

  // Flat-entry form (flatHookEntries vendors, e.g. Cursor): the event array
  // element IS the hook object — `{command, timeout[, matcher]}` with no
  // nested `hooks` array.
  const hooks = group.hooks;
  if (!Array.isArray(hooks)) {
    return isOmaManagedHookCommand(group);
  }

  return hooks.some(
    (h: unknown) => isPlainObject(h) && isOmaManagedHookCommand(h),
  );
}

/**
 * True when a single hook object (nested-group member or flat entry) was
 * written by oma: either the new oma-hook.sh wrapper command / `oma-hook-*`
 * name, or a legacy `bun …/<core-script>.{ts,js}` command.
 */
function isOmaManagedHookCommand(h: Record<string, unknown>): boolean {
  const name = typeof h.name === "string" ? h.name : "";
  const cmd = typeof h.command === "string" ? h.command : "";

  // New-style: oma-hook.sh wrapper (design 019+)
  if (name.startsWith("oma-hook-") || cmd.includes("oma-hook.sh")) {
    return true;
  }

  // Legacy-style: `bun "<path>/<script>.ts"` or `bun <path>/<script>.ts`
  // e.g. bun "$CLAUDE_PROJECT_DIR/.claude/hooks/keyword-detector.ts"
  //      bun .codex/hooks/persistent-mode.ts
  const legacyMatch = cmd.match(/\bbun\b.*?[/\\]([\w-]+)\.(ts|js)["']?\s*$/);
  if (legacyMatch) {
    const scriptName = legacyMatch[1];
    if (scriptName && OMA_CORE_SCRIPT_NAMES.has(scriptName)) return true;
  }

  return false;
}

/**
 * Strip OMA-managed hook groups from an existing event array and append the
 * new OMA groups, preserving user-added hook groups in their original order.
 *
 * @param existing - Current array from `settings.hooks[eventName]` (may be
 *   undefined, null, or not an array — treated as empty in those cases).
 * @param newOmaGroups - Array of hook group objects to write for this event.
 * @returns Merged array: [user-preserved groups …, …newOmaGroups].
 */
export function mergeHookGroups(
  // biome-ignore lint/suspicious/noExplicitAny: hook group shape is dynamic
  existing: any,
  // biome-ignore lint/suspicious/noExplicitAny: hook group shape is dynamic
  newOmaGroups: any[],
  // biome-ignore lint/suspicious/noExplicitAny: merged result
): any[] {
  const existingArray = Array.isArray(existing) ? existing : [];
  const userGroups = existingArray.filter(
    (g: unknown) => !isOmaManagedHookGroup(g),
  );
  return [...userGroups, ...newOmaGroups];
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

  // Merge hook entries with replace semantics for OMA-managed groups.
  // For each event key OMA is writing: strip existing OMA-managed groups
  // (old bun-script or new oma-hook.sh) then append the new OMA groups.
  // User-added groups on the same event are preserved in their original order.
  // Event keys not touched by OMA are left verbatim.
  const existingHooks = settings.hooks || {};
  const mergedHooks: Record<string, unknown> = { ...existingHooks };
  for (const [eventName, newGroups] of Object.entries(hookEntries)) {
    mergedHooks[eventName] = mergeHookGroups(
      existingHooks[eventName],
      Array.isArray(newGroups) ? newGroups : [newGroups],
    );
  }
  settings.hooks = mergedHooks;
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
