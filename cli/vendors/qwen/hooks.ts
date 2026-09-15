import type {
  HookEvent,
  HookVariant,
} from "../../platform/hooks-composer/variant-types.js";

/** Use the same SessionStart primer/state chain as Claude Code.
 * Keep Qwen compatibility additions in CLI source without rewriting .agents.
 */
export function withQwenHookEvents<T extends HookVariant>(variant: T): T {
  if (variant.vendor !== "qwen") return variant;
  const events = { ...variant.events };
  const original = events.SessionStart;
  const sessionStart: HookEvent[] = original
    ? Array.isArray(original)
      ? [...original]
      : [original]
    : [];
  for (const entry of [
    { hook: "code-intelligence-primer.ts", timeout: 3 },
    { hook: "state-boundary.ts", timeout: 5 },
  ]) {
    if (!sessionStart.some((existing) => existing.hook === entry.hook))
      sessionStart.push(entry);
  }
  events.SessionStart = sessionStart;

  // Qwen renamed replace to edit; retain the old name for older versions.
  const postTool = events.PostToolUse;
  if (postTool) {
    events.PostToolUse = (Array.isArray(postTool) ? postTool : [postTool]).map(
      (entry) =>
        entry.matcher === "write_file|replace"
          ? { ...entry, matcher: "write_file|edit|replace" }
          : entry,
    );
  }
  return { ...variant, events };
}
