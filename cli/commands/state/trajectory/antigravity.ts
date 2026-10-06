import { existsSync } from "node:fs";
import { join } from "node:path";
import {
  parseTimestampMs,
  readJsonlSync,
} from "../../../io/conversation-log.js";
import {
  capDetail,
  isSafeVendorSid,
  stringifyDetail,
  summarize,
  summarizeToolCall,
} from "./text.js";
import { createTurnTracker } from "./turns.js";
import type {
  TranscriptLoadResult,
  TranscriptRecord,
  TranscriptRoots,
} from "./types.js";

interface AntigravityToolCall {
  name?: string;
  args?: Record<string, unknown>;
}

interface AntigravityRow {
  step_index?: number;
  source?: string;
  type?: string;
  status?: string;
  created_at?: string;
  content?: string;
  thinking?: string;
  error?: string;
  tool_calls?: AntigravityToolCall[];
  input_tokens?: number;
  cache_read_tokens?: number;
  output_tokens?: number;
}

// USER_INPUT wraps the prompt in <USER_REQUEST> next to metadata blocks.
function userRequest(content: string): string {
  const match = content.match(/<USER_REQUEST>\s*([\s\S]*?)\s*<\/USER_REQUEST>/);
  return match?.[1]?.trim() || content.trim();
}

function toolSummary(call: AntigravityToolCall): string {
  const name = call.name ?? "tool";
  // The model labels each call with a short human-readable action.
  const label = call.args?.toolAction ?? call.args?.toolSummary;
  return typeof label === "string" && label.trim()
    ? summarize(`${name} ${label}`)
    : summarizeToolCall(name, call.args);
}

/** Fold Antigravity transcript steps into ledger records. Exported for tests. */
export function parseAntigravityRows(
  rows: AntigravityRow[],
): TranscriptRecord[] {
  const records: TranscriptRecord[] = [];
  const turns = createTurnTracker();
  // Tool results carry no call id; they arrive in call order.
  const pending: TranscriptRecord[] = [];
  let previousTs: number | null = null;

  const push = (record: TranscriptRecord): TranscriptRecord => {
    turns.mark(record);
    records.push(record);
    return record;
  };

  for (const row of rows) {
    const parsed = parseTimestampMs(row.created_at);
    const ts = parsed > 0 ? parsed : null;
    const step = row.step_index ?? records.length;
    const content = row.content ?? "";

    if (row.type === "USER_INPUT") {
      push({
        id: `antigravity:${step}`,
        kind: "user",
        text: summarize(userRequest(content)),
        startedAt: ts,
        durationMs: null,
        input: capDetail(content),
      });
    } else if (row.type === "PLANNER_RESPONSE") {
      const calls = row.tool_calls ?? [];
      // Steps are logged on completion; the previous step marks the start.
      const startedAt = previousTs ?? ts;
      push({
        id: `antigravity:${step}`,
        kind: "assistant",
        text: content.trim()
          ? summarize(content)
          : calls.length > 0
            ? summarize(
                `→ ${calls.map((call) => call.name ?? "tool").join(", ")}`,
              )
            : row.thinking
              ? "(thinking)"
              : "(no visible output)",
        startedAt,
        durationMs:
          ts !== null && startedAt !== null
            ? Math.max(0, ts - startedAt)
            : null,
        output: content.trim() ? capDetail(content) : undefined,
        thinking: row.thinking ? capDetail(row.thinking) : undefined,
        tokens:
          row.input_tokens === undefined && row.output_tokens === undefined
            ? undefined
            : {
                input: row.input_tokens ?? 0,
                cacheRead: row.cache_read_tokens ?? 0,
                cacheWrite: 0,
                output: row.output_tokens ?? 0,
                think: 0,
              },
      });
      calls.forEach((call, index) => {
        pending.push(
          push({
            id: `antigravity:${step}:call:${index}`,
            kind: "tool",
            text: toolSummary(call),
            startedAt: ts,
            durationMs: null,
            toolName: call.name ?? "tool",
            callId: `${step}:${index}`,
            input: capDetail(stringifyDetail(call.args)),
          }),
        );
      });
    } else if (row.source === "MODEL" && pending.length > 0) {
      const call = pending.shift() as TranscriptRecord;
      call.output = capDetail(
        row.error ? `${row.error}\n\n${content}` : content,
      );
      if (row.status === "ERROR") call.isError = true;
      // A RUNNING result means the tool moved to the background.
      if (row.status !== "RUNNING" && ts !== null && call.startedAt !== null) {
        call.durationMs = Math.max(0, ts - call.startedAt);
      }
    } else if (content.trim()) {
      push({
        id: `antigravity:${step}`,
        kind: "context",
        text: summarize(content),
        startedAt: ts,
        durationMs: null,
        input: capDetail(content),
      });
    }
    previousTs = ts ?? previousTs;
  }
  return records;
}

export function loadAntigravityTranscript(
  vendorSid: string,
  roots: TranscriptRoots,
): TranscriptLoadResult | null {
  if (!isSafeVendorSid(vendorSid)) return null;
  const logs = join(
    roots.home,
    ".gemini",
    "antigravity-cli",
    "brain",
    vendorSid,
    ".system_generated",
    "logs",
  );
  // transcript.jsonl truncates long fields; the full log keeps them.
  const sourcePath = ["transcript_full.jsonl", "transcript.jsonl"]
    .map((name) => join(logs, name))
    .find((path) => existsSync(path));
  if (!sourcePath) return null;
  return {
    sourcePath,
    records: parseAntigravityRows(readJsonlSync<AntigravityRow>(sourcePath)),
  };
}
