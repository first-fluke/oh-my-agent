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

/** Tokens and cost of one dispatch. `unknown` means the vendor reported nothing. */
export interface DispatchUsage {
  status: "actual" | "unknown";
  inputTokens: number;
  outputTokens: number;
  costUsd: number | null;
  durationMs: number | null;
  /** Model that produced most output tokens, when the vendor reports per-model usage. */
  model: string | null;
}

export const UNKNOWN_USAGE: DispatchUsage = Object.freeze({
  status: "unknown",
  inputTokens: 0,
  outputTokens: 0,
  costUsd: null,
  durationMs: null,
  model: null,
});

function asNumber(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

/** Read usage from a Claude CLI result envelope; anything else is unknown. */
export function parseVendorUsage(text: string): DispatchUsage {
  const trimmed = text.trim();
  if (!trimmed.startsWith("{")) return UNKNOWN_USAGE;
  try {
    const parsed = JSON.parse(trimmed) as {
      type?: unknown;
      usage?: Record<string, unknown>;
      total_cost_usd?: unknown;
      duration_ms?: unknown;
      modelUsage?: Record<string, { outputTokens?: unknown }>;
    };
    if (parsed.type !== "result" || !parsed.usage) return UNKNOWN_USAGE;
    const usage = parsed.usage;
    const inputTokens =
      asNumber(usage.input_tokens) +
      asNumber(usage.cache_creation_input_tokens) +
      asNumber(usage.cache_read_input_tokens);
    const outputTokens = asNumber(usage.output_tokens);
    let model: string | null = null;
    let best = -1;
    for (const [name, entry] of Object.entries(parsed.modelUsage ?? {})) {
      const out = asNumber(entry?.outputTokens);
      if (out > best) {
        best = out;
        model = name;
      }
    }
    return {
      status: "actual",
      inputTokens,
      outputTokens,
      costUsd:
        typeof parsed.total_cost_usd === "number"
          ? parsed.total_cost_usd
          : null,
      durationMs:
        typeof parsed.duration_ms === "number" ? parsed.duration_ms : null,
      model,
    };
  } catch {
    return UNKNOWN_USAGE;
  }
}

/** A dispatch may return plain text or text with its usage. */
export type DispatchResult = string | { output: string; usage?: DispatchUsage };

export function resolveDispatchResult(value: DispatchResult): {
  output: string;
  usage: DispatchUsage;
} {
  if (typeof value === "string") return { output: value, usage: UNKNOWN_USAGE };
  return { output: value.output, usage: value.usage ?? UNKNOWN_USAGE };
}

/** Like resolveDispatchResult for a dispatch that may run asynchronously. */
export async function awaitDispatchResult(
  value: DispatchResult | Promise<DispatchResult>,
): Promise<{ output: string; usage: DispatchUsage }> {
  return resolveDispatchResult(await value);
}

export function sumUsage(entries: DispatchUsage[]): {
  status: "actual" | "partial" | "unknown";
  dispatches: number;
  inputTokens: number;
  outputTokens: number;
  costUsd: number;
} {
  const total = {
    status: "unknown" as "actual" | "partial" | "unknown",
    dispatches: entries.length,
    inputTokens: 0,
    outputTokens: 0,
    costUsd: 0,
  };
  let actual = 0;
  for (const usage of entries) {
    if (usage.status !== "actual") continue;
    actual += 1;
    total.inputTokens += usage.inputTokens;
    total.outputTokens += usage.outputTokens;
    total.costUsd += usage.costUsd ?? 0;
  }
  total.status =
    entries.length === 0 || actual === 0
      ? "unknown"
      : actual === entries.length
        ? "actual"
        : "partial";
  return total;
}
