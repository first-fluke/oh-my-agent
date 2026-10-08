/** CLI-owned entry points installed beside extension bridges. */
export const STANDALONE_HOOK_VENDORS = [
  "pi",
  "opencode",
  "antigravity",
] as const;

export type StandaloneHookVendor = (typeof STANDALONE_HOOK_VENDORS)[number];

export const STANDALONE_HOOK_SCRIPTS = {
  "keyword-detector.ts": ["prompt"],
  "skill-injector.ts": ["prompt"],
  "code-intelligence-primer.ts": ["prompt"],
  "serena-primer.ts": ["prompt"],
  "state-boundary.ts": ["prompt"],
  "scm-guard.ts": ["pre_tool"],
  "code-intelligence-guard.ts": ["pre_tool"],
  "test-filter.ts": ["pre_tool"],
  "refactor-guard.ts": ["post_tool", "stop"],
  "persistent-mode.ts": ["stop"],
} as const;

export type StandaloneHookScript = keyof typeof STANDALONE_HOOK_SCRIPTS;

export function isStandaloneHookScript(
  script: string,
): script is StandaloneHookScript {
  return Object.hasOwn(STANDALONE_HOOK_SCRIPTS, script);
}
