import {
  loadBoundNativeTranscript,
  nativeSessionId,
} from "./native-transcript/identity.js";
import type { TranscriptRecord } from "./native-transcript/types.js";
import type { UsageRecord } from "./session-cost.js";

type PendingUsage = Omit<UsageRecord, "sessionId" | "recordedAt">;
type TokenBreakdown = NonNullable<UsageRecord["tokenBreakdown"]>;

/** One final counter per model response, including cached input exactly once. */
export function usageFromTranscript(
  records: readonly TranscriptRecord[],
): TokenBreakdown | undefined {
  const messages = new Map<string, TranscriptRecord>();
  for (const record of records) {
    if (record.kind === "assistant") messages.set(record.id, record);
  }
  if (messages.size === 0) return undefined;
  const total: TokenBreakdown = {
    input: 0,
    cacheRead: 0,
    cacheWrite: 0,
    output: 0,
  };
  for (const record of messages.values()) {
    const tokens = record.tokens;
    if (!tokens) return undefined;
    for (const key of ["input", "cacheRead", "cacheWrite", "output"] as const) {
      const value = tokens[key];
      if (!Number.isFinite(value) || value < 0) return undefined;
      total[key] += value;
    }
  }
  return total;
}

/** Missing, incomplete or unbound transcripts retain the labeled estimate. */
export function finalizeNativeUsage(
  reservation: PendingUsage,
  options: {
    stdout: string;
    workspace: string;
    startedAt: number;
    expectedSessionId?: string;
    env?: NodeJS.ProcessEnv;
    interrupted?: boolean;
    exitCode?: number | null;
  },
): PendingUsage {
  const fallback = (reason: string): PendingUsage => ({
    ...reservation,
    state: "final",
    usageSource: "prompt-estimate",
    usageUnavailableReason: reason,
  });
  if (options.interrupted)
    return fallback("agent interrupted before final usage was captured");
  const vendorSid =
    options.expectedSessionId ??
    nativeSessionId(reservation.vendor, options.stdout);
  if (!vendorSid) return fallback("native session identity unavailable");
  try {
    const transcript = loadBoundNativeTranscript({
      vendor: reservation.vendor,
      vendorSid,
      workspace: options.workspace,
      startedAt: options.startedAt,
      expectedSessionId: options.expectedSessionId,
      env: options.env,
    });
    if (transcript.status !== "loaded")
      return fallback(transcript.reason ?? "native transcript unavailable");
    if (!transcript.complete)
      return fallback("native transcript is incomplete");
    const tokenBreakdown = usageFromTranscript(transcript.records ?? []);
    if (!tokenBreakdown)
      return fallback("native transcript has incomplete usage counters");
    const nested = transcript.records.some(
      (record) =>
        record.kind === "tool" &&
        /(?:^|[._])(?:Agent|Task|spawn_agent)$/i.test(record.toolName ?? ""),
    );
    const partialReason = nested
      ? "native subagent usage is not fully covered"
      : options.exitCode !== undefined && options.exitCode !== 0
        ? "agent exited without complete final usage"
        : undefined;
    return {
      ...reservation,
      tokens: Object.values(tokenBreakdown).reduce(
        (sum, value) => sum + value,
        0,
      ),
      state: "final",
      usageSource: "native-transcript",
      usageCoverage: partialReason ? "partial" : "complete",
      usageUnavailableReason: partialReason,
      tokenBreakdown,
      vendorSid,
      sourcePath: transcript.sourcePath,
    };
  } catch {
    return fallback("native transcript could not be read");
  }
}
