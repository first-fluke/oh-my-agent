import { existsSync } from "node:fs";
import { join } from "node:path";
import { readJsonlSync } from "../../recap/internal/utils/history-parser.js";
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

interface KiroContent {
  kind?: string;
  data?: unknown;
}

interface KiroRow {
  kind?: string;
  data?: {
    message_id?: string;
    content?: KiroContent[];
    meta?: { timestamp?: number };
  };
}

interface KiroToolUse {
  toolUseId?: string;
  name?: string;
  input?: unknown;
}

interface KiroToolResult {
  toolUseId?: string;
  content?: KiroContent[];
  status?: string;
}

function textOf(content: KiroContent[] | undefined): string {
  return (content ?? [])
    .filter((item) => item.kind === "text" && typeof item.data === "string")
    .map((item) => item.data as string)
    .join("\n")
    .trim();
}

/**
 * Fold a Kiro CLI session log into ledger records. Kiro timestamps only the
 * prompts, so the responses and tool calls that follow carry no time of their
 * own. Exported for tests.
 */
export function parseKiroRows(rows: KiroRow[]): TranscriptRecord[] {
  const records: TranscriptRecord[] = [];
  const turns = createTurnTracker();
  const calls = new Map<string, TranscriptRecord>();

  const push = (record: TranscriptRecord): TranscriptRecord => {
    turns.mark(record);
    records.push(record);
    return record;
  };

  rows.forEach((row, position) => {
    const data = row.data ?? {};
    const id = `kiro:${data.message_id ?? position}`;

    if (row.kind === "Prompt") {
      const text = textOf(data.content);
      if (!text) return;
      const seconds = data.meta?.timestamp;
      push({
        id,
        kind: "user",
        text: summarize(text),
        startedAt: typeof seconds === "number" ? seconds * 1000 : null,
        durationMs: null,
        input: capDetail(text),
      });
    } else if (row.kind === "AssistantMessage") {
      const output = textOf(data.content);
      const toolUses = (data.content ?? [])
        .filter((item) => item.kind === "toolUse")
        .map((item) => (item.data ?? {}) as KiroToolUse);
      push({
        id,
        kind: "assistant",
        text: output
          ? summarize(output)
          : toolUses.length > 0
            ? summarize(
                `→ ${toolUses.map((use) => use.name ?? "tool").join(", ")}`,
              )
            : "(no visible output)",
        startedAt: null,
        durationMs: null,
        output: output ? capDetail(output) : undefined,
      });
      toolUses.forEach((use, index) => {
        const name = use.name ?? "tool";
        const callId =
          use.toolUseId ?? `${data.message_id ?? position}:${index}`;
        calls.set(
          callId,
          push({
            id: `${id}:call:${index}`,
            kind: "tool",
            text: summarizeToolCall(name, use.input),
            startedAt: null,
            durationMs: null,
            toolName: name,
            callId,
            input: capDetail(stringifyDetail(use.input)),
          }),
        );
      });
    } else if (row.kind === "ToolResults") {
      for (const item of data.content ?? []) {
        if (item.kind !== "toolResult") continue;
        const result = (item.data ?? {}) as KiroToolResult;
        const call = result.toolUseId ? calls.get(result.toolUseId) : undefined;
        if (!call) continue;
        call.output = capDetail(
          (result.content ?? [])
            .map((part) =>
              typeof part.data === "string"
                ? part.data
                : stringifyDetail(part.data),
            )
            .join("\n"),
        );
        if (result.status && result.status !== "success") call.isError = true;
      }
    }
  });
  return records;
}

export function loadKiroTranscript(
  vendorSid: string,
  roots: TranscriptRoots,
): TranscriptLoadResult | null {
  if (!isSafeVendorSid(vendorSid)) return null;
  const sourcePath = join(
    roots.home,
    ".kiro",
    "sessions",
    "cli",
    `${vendorSid}.jsonl`,
  );
  if (!existsSync(sourcePath)) return null;
  return {
    sourcePath,
    records: parseKiroRows(readJsonlSync<KiroRow>(sourcePath)),
  };
}
