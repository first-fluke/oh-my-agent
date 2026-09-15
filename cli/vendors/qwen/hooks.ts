import type {
  HookEvent,
  HookVariant,
} from "../../platform/hooks-composer/variant-types.js";

export const QWEN_CODE_INTELLIGENCE_HOOK = "qwen-code-intelligence.ts";

/** Qwen's current hook contract, shared by settings generation and dispatch.
 * https://qwenlm.github.io/qwen-code-docs/en/users/features/hooks/
 * Keep compatibility additions in CLI source, without rewriting installed .agents definitions.
 */
export function withQwenHookEvents<T extends HookVariant>(variant: T): T {
  if (variant.vendor !== "qwen") return variant;
  const events = { ...variant.events };
  const entry: HookEvent = { hook: QWEN_CODE_INTELLIGENCE_HOOK, timeout: 3 };
  for (const event of [
    "UserPromptSubmit",
    "SessionStart",
    "SubagentStart",
    "PreToolUse",
    "PostToolUse",
    "PostToolUseFailure",
  ]) {
    const original = events[event];
    const configs = original
      ? Array.isArray(original)
        ? original
        : [original]
      : [];
    const existing = configs.filter(
      (c) =>
        ![
          QWEN_CODE_INTELLIGENCE_HOOK,
          "code-intelligence-primer.ts",
          "serena-primer.ts",
        ].includes(c.hook),
    );
    // The composer emits one matcher for the whole handler chain. Set it on
    // every entry so the original shell/edit matcher cannot hide new events.
    const matcher =
      event === "PreToolUse"
        ? "^(?:run_shell_command|grep_search|glob)$"
        : event === "PostToolUse"
          ? "^(?:write_file|edit|replace|mcp__serena__.+)$"
          : event === "PostToolUseFailure"
            ? "^mcp__serena__.+$"
            : undefined;
    events[event] = [...existing, entry].map((c) => ({ ...c, matcher }));
  }
  return { ...variant, events };
}
