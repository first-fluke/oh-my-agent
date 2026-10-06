import { existsSync, readdirSync } from "node:fs";
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

interface QwenPart {
  text?: string;
  thought?: boolean;
  functionCall?: { id?: string; name?: string; args?: unknown };
  functionResponse?: { id?: string; name?: string; response?: unknown };
}

interface QwenRow {
  uuid?: string;
  type?: string;
  subtype?: string;
  provenance?: string;
  timestamp?: string;
  model?: string;
  message?: { role?: string; parts?: QwenPart[] };
  usageMetadata?: {
    promptTokenCount?: number;
    candidatesTokenCount?: number;
    thoughtsTokenCount?: number;
    cachedContentTokenCount?: number;
  };
  toolCallResult?: {
    callId?: string;
    status?: string;
    resultDisplay?: unknown;
  };
}

function partsText(parts: QwenPart[], thought: boolean): string {
  return parts
    .filter(
      (part) => typeof part.text === "string" && !!part.thought === thought,
    )
    .map((part) => part.text as string)
    .join("\n")
    .trim();
}

/** Fold Qwen Code chat rows into ledger records. Exported for tests. */
export function parseQwenRows(rows: QwenRow[]): TranscriptRecord[] {
  const records: TranscriptRecord[] = [];
  const turns = createTurnTracker();
  const calls = new Map<string, TranscriptRecord>();
  // Results without a call id arrive in call order.
  const pending: TranscriptRecord[] = [];
  let previousTs: number | null = null;

  const push = (record: TranscriptRecord): TranscriptRecord => {
    turns.mark(record);
    records.push(record);
    return record;
  };

  rows.forEach((row, position) => {
    // Telemetry and snapshot rows carry no conversation content.
    if (row.type === "system") return;
    const parsed = parseTimestampMs(row.timestamp);
    const ts = parsed > 0 ? parsed : null;
    const parts = row.message?.parts ?? [];
    const id = `qwen:${row.uuid ?? position}`;

    if (row.type === "user") {
      const text = partsText(parts, false);
      if (text) {
        push({
          id,
          // Notifications are injected by the harness, not typed by the user.
          kind: row.provenance === "real_user" ? "user" : "context",
          text: summarize(text),
          startedAt: ts,
          durationMs: null,
          input: capDetail(text),
        });
      }
    } else if (row.type === "assistant") {
      const output = partsText(parts, false);
      const thinking = partsText(parts, true);
      const toolCalls = parts.flatMap((part) =>
        part.functionCall ? [part.functionCall] : [],
      );
      const usage = row.usageMetadata;
      const cached = usage?.cachedContentTokenCount ?? 0;
      // Rows are written on completion; the previous row marks the start.
      const startedAt = previousTs ?? ts;
      push({
        id,
        kind: "assistant",
        text: output
          ? summarize(output)
          : toolCalls.length > 0
            ? summarize(
                `→ ${toolCalls.map((call) => call.name ?? "tool").join(", ")}`,
              )
            : thinking
              ? "(thinking)"
              : "(no visible output)",
        startedAt,
        durationMs:
          ts !== null && startedAt !== null
            ? Math.max(0, ts - startedAt)
            : null,
        model: row.model,
        output: output ? capDetail(output) : undefined,
        thinking: thinking ? capDetail(thinking) : undefined,
        tokens: usage
          ? {
              // promptTokenCount includes the cached tokens.
              input: Math.max(0, (usage.promptTokenCount ?? 0) - cached),
              cacheRead: cached,
              cacheWrite: 0,
              output: usage.candidatesTokenCount ?? 0,
              think: usage.thoughtsTokenCount ?? 0,
            }
          : undefined,
      });
      toolCalls.forEach((call, index) => {
        const name = call.name ?? "tool";
        const record = push({
          id: `${id}:call:${index}`,
          kind: "tool",
          text: summarizeToolCall(name, call.args),
          startedAt: ts,
          durationMs: null,
          toolName: name,
          callId: call.id ?? `${row.uuid ?? position}:${index}`,
          input: capDetail(stringifyDetail(call.args)),
        });
        if (call.id) calls.set(call.id, record);
        pending.push(record);
      });
    } else if (row.type === "tool_result") {
      for (const part of parts) {
        const response = part.functionResponse;
        if (!response) continue;
        const callId = response.id ?? row.toolCallResult?.callId;
        const call = (callId ? calls.get(callId) : undefined) ?? pending[0];
        if (!call) continue;
        const index = pending.indexOf(call);
        if (index !== -1) pending.splice(index, 1);
        const display = row.toolCallResult?.resultDisplay;
        call.output = capDetail(
          typeof display === "string" && display
            ? display
            : stringifyDetail(response.response),
        );
        if (row.toolCallResult?.status === "error") call.isError = true;
        if (ts !== null && call.startedAt !== null) {
          call.durationMs = Math.max(0, ts - call.startedAt);
        }
      }
    } else {
      return;
    }
    previousTs = ts ?? previousTs;
  });
  return records;
}

export function loadQwenTranscript(
  vendorSid: string,
  roots: TranscriptRoots,
): TranscriptLoadResult | null {
  if (!isSafeVendorSid(vendorSid)) return null;
  // ~/.qwen/projects/<project slug>/chats/<session id>.jsonl
  const projects = join(roots.home, ".qwen", "projects");
  let slugs: string[];
  try {
    slugs = readdirSync(projects);
  } catch {
    return null;
  }
  for (const slug of slugs) {
    const sourcePath = join(projects, slug, "chats", `${vendorSid}.jsonl`);
    if (!existsSync(sourcePath)) continue;
    return {
      sourcePath,
      records: parseQwenRows(readJsonlSync<QwenRow>(sourcePath)),
    };
  }
  return null;
}
