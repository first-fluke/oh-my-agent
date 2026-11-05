import type { HookEvent, HookVariant } from "./variant-types.js";

const LIFECYCLE_EVENTS: Readonly<Record<string, readonly string[]>> = {
  claude: ["SubagentStart", "SubagentStop"],
  codex: ["SubagentStart", "SubagentStop"],
  copilot: ["subagentStart", "subagentStop"],
};

export function isLifecycleHookEvent(vendor: string, event: string): boolean {
  return LIFECYCLE_EVENTS[vendor]?.includes(event) ?? false;
}

/** Register observation separately from parent-turn completion checks. */
export function withLifecycleHookEvents<T extends HookVariant>(variant: T): T {
  const names = LIFECYCLE_EVENTS[variant.vendor];
  if (!names) return variant;
  const events = { ...variant.events };
  for (const name of names) {
    const original = events[name];
    const entries: HookEvent[] = original
      ? Array.isArray(original)
        ? [...original]
        : [original]
      : [];
    if (!entries.some((entry) => entry.hook === "lifecycle.ts")) {
      entries.push({ hook: "lifecycle.ts", timeout: 3 });
    }
    events[name] = entries;
  }
  return { ...variant, events };
}
