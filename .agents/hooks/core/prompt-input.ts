// Shared normalizer for the raw `prompt` field delivered on hook stdin.
//
// Most host CLIs deliver `prompt` as a plain string, but some (e.g. Kimi Code
// CLI's UserPromptSubmit payload) deliver it as a ContentPart[] array such as
// `[{ "type": "text", "text": "hello" }]`. The standalone hook scripts cast it
// with `(input.prompt as string) ?? ""`, so on those vendors the downstream
// string methods throw and the top-level catch swallows the error — the entire
// prompt chain silently no-ops. Route every raw read through this helper so the
// array shape collapses to the equivalent string.

// Relayed inter-agent messages (teammate reports, task notifications, idle
// notifications) are transported through the prompt channel but are not user
// intent: their content routinely carries workflow keywords and skill trigger
// words, producing false activations. Detect the transport envelopes
// conservatively so prompt-driven handlers can skip them.
const RELAY_ENVELOPE_PREFIXES = [
  "<agent-message",
  "<teammate-message",
  "<task-notification",
];

/** True when the prompt is a relayed inter-agent envelope, not user intent. */
export function isRelayedAgentMessage(prompt: string): boolean {
  const trimmed = prompt.trimStart();
  if (RELAY_ENVELOPE_PREFIXES.some((p) => trimmed.startsWith(p))) return true;
  return trimmed.slice(0, 200).includes('"type":"idle_notification"');
}

/** Coerce a raw stdin `prompt` field to a string across vendor payload shapes. */
export function normalizePromptInput(prompt: unknown): string {
  if (typeof prompt === "string") return prompt;
  if (Array.isArray(prompt)) {
    return prompt
      .filter(
        (p): p is { type: string; text: string } =>
          !!p &&
          typeof p === "object" &&
          (p as { type?: unknown }).type === "text" &&
          typeof (p as { text?: unknown }).text === "string",
      )
      .map((p) => p.text)
      .join(" ");
  }
  return "";
}
