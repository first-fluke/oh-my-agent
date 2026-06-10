import type { IntelSignal } from "./types.js";

const CAPABILITY_KEYWORDS: Array<[string, RegExp]> = [
  ["scaffolding", /scaffold|template|starter|bootstrap|setup|install/i],
  ["workflow-loop", /workflow|loop|autopilot|ralph|ultra|orchestrat|team/i],
  ["agent-dispatch", /agent|dispatch|worker|subagent|tmux|parallel/i],
  ["memory-state", /memory|state|ledger|context|continuation|session/i],
  ["verification", /verify|test|qa|eval|review|gate|confidence/i],
  ["security", /security|redact|secret|permission|sandbox|cve|owasp/i],
  ["research", /market|research|search|trend|competitor|intelligence/i],
  ["docs", /docs|readme|reference|guide|documentation/i],
  ["release", /release|ship|deploy|version|changelog/i],
  ["cross-runtime", /codex|claude|gemini|opencode|cursor|kiro|grok|runtime/i],
  ["platform", /windows|linux|macos|shell|path|hook|manifest/i],
];

function tagText(text: string): string[] {
  const tags = CAPABILITY_KEYWORDS.filter(([, pattern]) =>
    pattern.test(text),
  ).map(([tag]) => tag);
  return tags.length > 0 ? [...new Set(tags)] : ["general"];
}

export function signalFromText(
  input: Omit<IntelSignal, "capabilityTags" | "trust"> & {
    trust?: IntelSignal["trust"];
  },
): IntelSignal {
  const text = `${input.title}\n${input.summary}`;
  return {
    ...input,
    capabilityTags: tagText(text),
    trust: input.trust ?? "medium",
  };
}
