import type { HookEvent, HookVariant } from "./variant-types.js";

const EDIT_MATCHERS: Readonly<Record<string, string>> = {
  claude: "Edit|Write|MultiEdit",
  codex: "apply_patch|Edit|Write",
  qwen: "write_file|edit|replace|edit_file",
  commandcode: "write|edit",
  kimi: "WriteFile|StrReplaceFile|Edit|Write",
  grok: "hashline_edit|apply_patch|create_file|write_file|edit_file|str_replace",
  kiro: "fs_write",
};

/** Keep installer matchers and the bundled router aligned without rewriting definitions. */
export function withDiagnosticFeedbackHookEvents<T extends HookVariant>(
  variant: T,
): T {
  const matcher = EDIT_MATCHERS[variant.vendor];
  if (!matcher) return variant;
  const events = { ...variant.events };
  for (const name of variant.vendor === "kiro"
    ? ["preToolUse", "postToolUse"]
    : ["PreToolUse", "PostToolUse"]) {
    const original = events[name];
    const entries: HookEvent[] = original
      ? Array.isArray(original)
        ? [...original]
        : [original]
      : [];
    if (!entries.some((entry) => entry.hook === "diagnostic-feedback.ts")) {
      entries.push({ hook: "diagnostic-feedback.ts", matcher, timeout: 11 });
    }
    events[name] = entries;
  }
  return { ...variant, events };
}
