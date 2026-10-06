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

interface PiBlock {
  type?: string;
  text?: string;
  thinking?: string;
  id?: string;
  name?: string;
  arguments?: unknown;
}

interface PiRow {
  type?: string;
  id?: string;
  timestamp?: string;
  summary?: string;
  message?: {
    role?: string;
    content?: string | PiBlock[];
    model?: string;
    timestamp?: number;
    toolCallId?: string;
    toolName?: string;
    isError?: boolean;
    usage?: {
      input?: number;
      output?: number;
      cacheRead?: number;
      cacheWrite?: number;
    };
  };
}

function blockText(
  content: string | PiBlock[] | undefined,
  type: string,
): string {
  if (typeof content === "string") return type === "text" ? content.trim() : "";
  return (content ?? [])
    .filter((block) => block.type === type)
    .map((block) => (type === "thinking" ? block.thinking : block.text) ?? "")
    .join("\n")
    .trim();
}

/**
 * Fold a pi session log into ledger records. Command Code writes the same
 * session format (version 3), so both vendors share this parser. Exported for
 * tests.
 */
export function parsePiRows(rows: PiRow[], vendor: string): TranscriptRecord[] {
  const records: TranscriptRecord[] = [];
  const turns = createTurnTracker();
  const calls = new Map<string, TranscriptRecord>();
  let previousTs: number | null = null;

  const push = (record: TranscriptRecord): TranscriptRecord => {
    turns.mark(record);
    records.push(record);
    return record;
  };

  rows.forEach((row, position) => {
    const parsed = parseTimestampMs(row.timestamp);
    const ts = parsed > 0 ? parsed : null;
    const id = `${vendor}:${row.id ?? position}`;

    if (row.type === "compaction") {
      push({
        id,
        kind: "compacted",
        text: "Conversation compacted",
        startedAt: ts,
        durationMs: null,
        output: row.summary ? capDetail(row.summary) : undefined,
      });
      previousTs = ts ?? previousTs;
      return;
    }
    const message = row.message;
    if (row.type !== "message" || !message) return;

    if (message.role === "user") {
      const text = blockText(message.content, "text");
      if (text) {
        push({
          id,
          // Skill bodies are injected as user-role messages.
          kind: text.startsWith("<skill ") ? "context" : "user",
          text: summarize(text),
          startedAt: ts,
          durationMs: null,
          input: capDetail(text),
        });
      }
    } else if (message.role === "assistant") {
      const output = blockText(message.content, "text");
      const thinking = blockText(message.content, "thinking");
      const toolCalls = Array.isArray(message.content)
        ? message.content.filter((block) => block.type === "toolCall")
        : [];
      // message.timestamp is when the response began; the row is its end.
      const began =
        typeof message.timestamp === "number" &&
        (ts === null || message.timestamp <= ts)
          ? message.timestamp
          : null;
      const startedAt = began ?? previousTs ?? ts;
      const usage = message.usage;
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
        model: message.model,
        output: output ? capDetail(output) : undefined,
        thinking: thinking ? capDetail(thinking) : undefined,
        tokens: usage
          ? {
              input: usage.input ?? 0,
              cacheRead: usage.cacheRead ?? 0,
              cacheWrite: usage.cacheWrite ?? 0,
              output: usage.output ?? 0,
              think: 0,
            }
          : undefined,
      });
      toolCalls.forEach((call, index) => {
        const name = call.name ?? "tool";
        const callId = call.id ?? `${row.id ?? position}:${index}`;
        calls.set(
          callId,
          push({
            id: `${id}:call:${index}`,
            kind: "tool",
            text: summarizeToolCall(name, call.arguments),
            startedAt: ts,
            durationMs: null,
            toolName: name,
            callId,
            input: capDetail(stringifyDetail(call.arguments)),
          }),
        );
      });
    } else if (message.role === "toolResult" && message.toolCallId) {
      const call = calls.get(message.toolCallId);
      if (call) {
        call.output = capDetail(blockText(message.content, "text"));
        if (message.isError === true) call.isError = true;
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

function findSessionFile(
  root: string,
  matches: (name: string) => boolean,
): string | null {
  let slugs: string[];
  try {
    slugs = readdirSync(root);
  } catch {
    return null;
  }
  for (const slug of slugs) {
    let names: string[];
    try {
      names = readdirSync(join(root, slug));
    } catch {
      continue;
    }
    const name = names.find(matches);
    if (name) return join(root, slug, name);
  }
  return null;
}

export function loadPiTranscript(
  vendorSid: string,
  roots: TranscriptRoots,
): TranscriptLoadResult | null {
  if (!isSafeVendorSid(vendorSid)) return null;
  // ~/.pi/agent/sessions/<cwd slug>/<timestamp>_<session id>.jsonl
  const sourcePath = findSessionFile(
    join(roots.home, ".pi", "agent", "sessions"),
    (name) => name.endsWith(`_${vendorSid}.jsonl`),
  );
  if (!sourcePath) return null;
  return {
    sourcePath,
    records: parsePiRows(readJsonlSync<PiRow>(sourcePath), "pi"),
  };
}

export function loadCommandCodeTranscript(
  vendorSid: string,
  roots: TranscriptRoots,
): TranscriptLoadResult | null {
  if (!isSafeVendorSid(vendorSid)) return null;
  // ~/.commandcode/projects/<cwd slug>/<session id>.jsonl
  const sourcePath = findSessionFile(
    join(roots.home, ".commandcode", "projects"),
    (name) => name === `${vendorSid}.jsonl`,
  );
  if (!sourcePath || !existsSync(sourcePath)) return null;
  return {
    sourcePath,
    records: parsePiRows(readJsonlSync<PiRow>(sourcePath), "commandcode"),
  };
}
