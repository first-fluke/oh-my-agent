import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { zstdDecompressSync } from "node:zlib";
import {
  capDetail,
  isSafeVendorSid,
  summarize,
  summarizeToolCall,
} from "./text.js";
import { createTurnTracker } from "./turns.js";
import type {
  TranscriptLoadResult,
  TranscriptRecord,
  TranscriptRoots,
} from "./types.js";

interface DshBlock {
  type?: string;
  text?: string;
  name?: string;
  toolName?: string;
  toolCallId?: string;
  isError?: boolean;
  content?: DshBlock[];
}

interface DshMessage {
  role?: string;
  content?: DshBlock[];
  source?: { kind?: string; model?: string; callId?: string };
  toolCallId?: string;
  isError?: boolean;
}

interface DshStreamEntry {
  time?: number;
  chunk?: { type?: string };
}

interface DshEvent {
  type?: string;
  /** Unix epoch milliseconds the event was appended. */
  time?: number;
  version?: number;
  data?: {
    turn?: number;
    step?: number;
    callId?: string;
    name?: string;
    arguments?: string;
    content?: DshBlock[];
    source?: { kind?: string };
    message?: DshMessage;
    summary?: DshBlock[];
    error?: { name?: string; code?: string };
    usage?: {
      inputTokens?: number;
      outputTokens?: number;
      cacheReadTokens?: number;
      cacheWriteTokens?: number;
      reasoningTokens?: number;
    };
    stream?: DshStreamEntry[];
  };
}

/** Formats older than this pack assistant deltas in a shape not read here. */
const OLDEST_READABLE_FORMAT = 2;

function blocksText(blocks: DshBlock[] | undefined, type = "text"): string {
  return (blocks ?? [])
    .filter((block) => block.type === type && typeof block.text === "string")
    .map((block) => block.text as string)
    .join("\n")
    .trim();
}

/** Non-text blocks (tool registry changes, attachments) named by their type. */
function describeBlocks(blocks: DshBlock[] | undefined): string {
  const text = blocksText(blocks);
  if (text) return text;
  return (blocks ?? [])
    .map(
      (block) => `[${[block.type, block.toolName].filter(Boolean).join(" ")}]`,
    )
    .join(" ");
}

/**
 * Fold a DeepSeek Harness session log into ledger records. The log is an
 * append-only event stream (`turn/start`, `step/start`, `assistant/message`,
 * `tool/call`, `tool/result`, …); each event carries the time it was appended
 * and an assistant message keeps the timed stream it was assembled from.
 * Exported for tests.
 */
export function parseDshEvents(events: DshEvent[]): TranscriptRecord[] {
  const records: TranscriptRecord[] = [];
  const turns = createTurnTracker();
  const calls = new Map<string, TranscriptRecord>();
  const stepStarts = new Map<string, number>();
  let compactionAt: number | null = null;
  let compactionSummary = "";
  // A step opens before its prompt and context are appended, so a response
  // cannot have started earlier than the newest input it answers.
  let lastInputAt: number | null = null;

  const push = (record: TranscriptRecord): TranscriptRecord => {
    turns.mark(record);
    records.push(record);
    return record;
  };

  events.forEach((event, position) => {
    const data = event.data ?? {};
    const time = typeof event.time === "number" ? event.time : null;
    const id = `dsh:${position}`;

    if (event.type === "turn/start") {
      turns.begin();
    } else if (event.type === "step/start") {
      if (time !== null) stepStarts.set(`${data.turn}:${data.step}`, time);
    } else if (event.type === "user/message") {
      const text = describeBlocks(data.content);
      if (!text) return;
      push({
        id,
        // Hooks and steering inject user-role messages under their own source.
        kind: data.source?.kind === "user" ? "user" : "context",
        text: summarize(text),
        startedAt: time,
        durationMs: null,
        input: capDetail(text),
      });
      lastInputAt = time ?? lastInputAt;
    } else if (
      event.type === "system/message" ||
      event.type === "developer/message"
    ) {
      const text = describeBlocks(data.message?.content);
      if (!text) return;
      push({
        id,
        kind: "context",
        text: summarize(text),
        startedAt: time,
        durationMs: null,
        input: capDetail(text),
      });
      lastInputAt = time ?? lastInputAt;
    } else if (event.type === "assistant/message") {
      const content = data.message?.content ?? [];
      const output = blocksText(content);
      const thinking = blocksText(content, "reasoning");
      const tools = content
        .filter((block) => block.type === "tool-call")
        .map((block) => block.name ?? "tool");
      const stream = (data.stream ?? []).filter(
        (entry) => typeof entry.time === "number",
      );
      const firstChunk = stream[0]?.time ?? null;
      const lastChunk = stream[stream.length - 1]?.time ?? null;
      const stepStart = stepStarts.get(`${data.turn}:${data.step}`) ?? null;
      const requested =
        stepStart !== null && lastInputAt !== null
          ? Math.max(stepStart, lastInputAt)
          : (stepStart ?? lastInputAt);
      const startedAt = requested ?? firstChunk ?? time;
      const endedAt = lastChunk ?? time;
      const usage = data.usage;
      push({
        id,
        kind: "assistant",
        text: output
          ? summarize(output)
          : tools.length > 0
            ? summarize(`→ ${tools.join(", ")}`)
            : thinking
              ? "(thinking)"
              : "(no visible output)",
        startedAt,
        durationMs:
          startedAt !== null && endedAt !== null
            ? Math.max(0, endedAt - startedAt)
            : null,
        // The step start is the request; the first chunk is the first token.
        ttftMs:
          stepStart !== null && firstChunk !== null
            ? Math.max(0, firstChunk - stepStart)
            : undefined,
        model: data.message?.source?.model,
        output: output ? capDetail(output) : undefined,
        thinking: thinking ? capDetail(thinking) : undefined,
        tokens: usage
          ? {
              input: usage.inputTokens ?? 0,
              cacheRead: usage.cacheReadTokens ?? 0,
              cacheWrite: usage.cacheWriteTokens ?? 0,
              output: usage.outputTokens ?? 0,
              think: usage.reasoningTokens ?? 0,
            }
          : undefined,
      });
    } else if (event.type === "tool/call" && data.callId) {
      const name = data.name ?? "tool";
      calls.set(
        data.callId,
        push({
          id: `dsh:call:${data.callId}`,
          kind: "tool",
          text: summarizeToolCall(name, data.arguments),
          startedAt: time,
          durationMs: null,
          toolName: name,
          callId: data.callId,
          input: capDetail(data.arguments ?? ""),
        }),
      );
    } else if (event.type === "tool/result") {
      const message = data.message ?? {};
      // Format 4 puts the result on the message; format 3 nests it in a block.
      const nested = (message.content ?? []).find(
        (block) => block.type === "tool-result",
      );
      const callId =
        message.toolCallId ?? nested?.toolCallId ?? message.source?.callId;
      const call = callId ? calls.get(callId) : undefined;
      if (!call) return;
      const body = describeBlocks(nested?.content ?? message.content);
      const error = data.error
        ? [data.error.name, data.error.code].filter(Boolean).join(" ")
        : "";
      call.output = capDetail([error, body].filter(Boolean).join("\n"));
      if (message.isError === true || nested?.isError === true || data.error) {
        call.isError = true;
      }
      if (time !== null && call.startedAt !== null) {
        call.durationMs = Math.max(0, time - call.startedAt);
      }
      lastInputAt = time ?? lastInputAt;
    } else if (event.type === "compaction/start") {
      compactionAt = time;
      compactionSummary = "";
    } else if (event.type === "compaction/summary") {
      compactionSummary = blocksText(data.summary);
    } else if (event.type === "compaction/end") {
      push({
        id,
        kind: "compacted",
        text: "Conversation compacted",
        startedAt: compactionAt ?? time,
        durationMs:
          time !== null && compactionAt !== null
            ? Math.max(0, time - compactionAt)
            : null,
        output: compactionSummary ? capDetail(compactionSummary) : undefined,
      });
      compactionAt = null;
    }
  });
  return records;
}

/** Newest log generation in a session directory: `session.vN.jsonl[.zstd]`. */
function newestLog(dir: string): { path: string; version: number } | null {
  let names: string[];
  try {
    names = readdirSync(dir);
  } catch {
    return null;
  }
  let best: { path: string; version: number } | null = null;
  for (const name of names) {
    const match = /^session(?:\.v(\d+))?\.jsonl(?:\.zstd)?$/.exec(name);
    if (!match) continue;
    const version = Number(match[1] ?? 0);
    if (!best || version > best.version) {
      best = { path: join(dir, name), version };
    }
  }
  return best;
}

function readEvents(path: string): DshEvent[] {
  const raw = readFileSync(path);
  // The default artifact is a run of Zstandard frames, one per append batch.
  const text = path.endsWith(".zstd")
    ? zstdDecompressSync(raw).toString("utf-8")
    : raw.toString("utf-8");
  const events: DshEvent[] = [];
  for (const line of text.split("\n")) {
    if (!line.trim()) continue;
    try {
      events.push(JSON.parse(line) as DshEvent);
    } catch {
      // A torn tail from a crashed writer is not part of the log.
    }
  }
  return events;
}

export function loadDshTranscript(
  vendorSid: string,
  roots: TranscriptRoots,
): TranscriptLoadResult | null {
  if (!isSafeVendorSid(vendorSid)) return null;
  // $DSH_HOME/sessions/--<project>--/<session id>/session.vN.jsonl[.zstd]
  const homes = new Set(
    [
      roots.vendorHome,
      roots.env.DSH_HOME?.trim(),
      join(roots.home, ".dsh"),
    ].filter((home): home is string => Boolean(home)),
  );
  for (const home of homes) {
    const sessions = join(home, "sessions");
    let projects: string[];
    try {
      projects = readdirSync(sessions);
    } catch {
      continue;
    }
    for (const project of projects) {
      const log = newestLog(join(sessions, project, vendorSid));
      if (!log || log.version < OLDEST_READABLE_FORMAT) continue;
      try {
        return {
          sourcePath: log.path,
          records: parseDshEvents(readEvents(log.path)),
        };
      } catch {
        // An unreadable or corrupt log is treated as absent.
      }
    }
  }
  return null;
}
