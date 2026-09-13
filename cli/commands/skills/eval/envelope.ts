/**
 * Vendor result envelopes.
 *
 * The Claude CLI's `--output-format json` wraps the answer in a JSON object
 * whose `result` field carries the text. Scoring, grading, and recording must
 * work on the answer, never on the envelope: envelope fields such as
 * `"subagent_stats":{"failed":0}` contain the literal word FAIL and would be
 * matched by substring checks or the judge verdict parser.
 */
export function unwrapVendorEnvelope(text: string): string {
  const trimmed = text.trim();
  if (!trimmed.startsWith("{")) return text;
  try {
    const parsed = JSON.parse(trimmed) as {
      type?: unknown;
      result?: unknown;
      is_error?: unknown;
    };
    if (typeof parsed.result !== "string") return text;
    if (parsed.type !== "result" && typeof parsed.is_error !== "boolean")
      return text;
    return parsed.result;
  } catch {
    return text;
  }
}
