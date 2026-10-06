import { existsSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { readJsonlSync } from "../../../io/conversation-log.js";
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

interface GrokContent {
  type?: string;
  text?: string;
  content?: GrokContent;
}

interface GrokUpdate {
  sessionUpdate?: string;
  toolCallId?: string;
  title?: string;
  status?: string;
  rawInput?: unknown;
  rawOutput?: unknown;
  content?: GrokContent | GrokContent[];
  usage?: {
    inputTokens?: number;
    outputTokens?: number;
    cachedReadTokens?: number;
    cacheCreationTokens?: number;
    reasoningTokens?: number;
  };
  tokens_before?: number;
  tokens_after?: number;
  elapsed_ms?: number;
  _meta?: { "x.ai/tool"?: { name?: string } };
}

interface GrokRow {
  timestamp?: number;
  params?: {
    update?: GrokUpdate;
    _meta?: { agentTimestampMs?: number; streamStartMs?: number };
  };
}

function chunkText(content: GrokUpdate["content"]): string {
  if (!content) return "";
  const items = Array.isArray(content) ? content : [content];
  return items
    .map((item) => item.text ?? item.content?.text ?? "")
    .filter(Boolean)
    .join("\n");
}

/** Fold a Grok session update stream into ledger records. Exported for tests. */
export function parseGrokRows(rows: GrokRow[]): TranscriptRecord[] {
  const records: TranscriptRecord[] = [];
  const turns = createTurnTracker();
  const calls = new Map<string, TranscriptRecord>();
  // One model response: streamed thought/message chunks, then its tool calls.
  let step = null as TranscriptRecord | null;
  let stepTools: string[] = [];
  let prompt = null as TranscriptRecord | null;
  let lastAssistant = null as TranscriptRecord | null;
  let previousTs: number | null = null;
  let serial = 0;

  const push = (record: TranscriptRecord): TranscriptRecord => {
    turns.mark(record);
    records.push(record);
    return record;
  };

  const closeStep = () => {
    if (!step) return;
    step.text = step.output
      ? summarize(step.output)
      : stepTools.length > 0
        ? summarize(`→ ${stepTools.join(", ")}`)
        : step.thinking
          ? "(thinking)"
          : "(no visible output)";
    lastAssistant = step;
    step = null;
    stepTools = [];
  };

  const openStep = (
    ts: number | null,
    streamStart?: number,
  ): TranscriptRecord => {
    if (step) return step;
    step = push({
      id: `grok:step:${serial++}`,
      kind: "assistant",
      text: "",
      startedAt: streamStart ?? previousTs ?? ts,
      durationMs: null,
    });
    return step;
  };

  for (const row of rows) {
    const update = row.params?.update;
    if (!update) continue;
    const meta = row.params?._meta;
    const ts =
      meta?.agentTimestampMs ?? (row.timestamp ? row.timestamp * 1000 : null);
    const kind = update.sessionUpdate;

    if (kind === "user_message_chunk") {
      closeStep();
      const text = chunkText(update.content);
      if (prompt) {
        prompt.input = capDetail(`${prompt.input ?? ""}${text}`);
        prompt.text = summarize(prompt.input);
      } else if (text) {
        prompt = push({
          id: `grok:prompt:${serial++}`,
          kind: "user",
          text: summarize(text),
          startedAt: ts,
          durationMs: null,
          input: capDetail(text),
        });
      }
      previousTs = ts ?? previousTs;
      continue;
    }
    prompt = null;

    if (kind === "agent_thought_chunk" || kind === "agent_message_chunk") {
      // Chunks after a tool call belong to the next model response.
      if (step && stepTools.length > 0) closeStep();
      const opening = step === null;
      const current = openStep(ts, meta?.streamStartMs);
      if (opening && ts !== null && meta?.streamStartMs !== undefined) {
        current.ttftMs = Math.max(0, ts - meta.streamStartMs);
      }
      const text = chunkText(update.content);
      if (kind === "agent_thought_chunk") {
        current.thinking = capDetail(`${current.thinking ?? ""}${text}`);
      } else {
        current.output = capDetail(`${current.output ?? ""}${text}`);
      }
      if (ts !== null && current.startedAt !== null) {
        current.durationMs = Math.max(0, ts - current.startedAt);
      }
    } else if (kind === "tool_call" && update.toolCallId) {
      openStep(ts);
      const name = update._meta?.["x.ai/tool"]?.name ?? update.title ?? "tool";
      stepTools.push(name);
      calls.set(
        update.toolCallId,
        push({
          id: `grok:call:${update.toolCallId}`,
          kind: "tool",
          text: summarizeToolCall(name, update.rawInput),
          startedAt: ts,
          durationMs: null,
          toolName: name,
          callId: update.toolCallId,
          input: capDetail(stringifyDetail(update.rawInput)),
        }),
      );
    } else if (kind === "tool_call_update" && update.toolCallId) {
      const call = calls.get(update.toolCallId);
      if (
        call &&
        (update.status === "completed" || update.status === "failed")
      ) {
        call.output = capDetail(
          chunkText(update.content) || stringifyDetail(update.rawOutput),
        );
        if (update.status === "failed") call.isError = true;
        if (ts !== null && call.startedAt !== null) {
          call.durationMs = Math.max(0, ts - call.startedAt);
        }
      }
    } else if (kind === "turn_completed") {
      closeStep();
      // Usage is reported once per turn; it lands on the turn's last response.
      const usage = update.usage;
      if (usage && lastAssistant) {
        const cached = usage.cachedReadTokens ?? 0;
        lastAssistant.tokens = {
          input: Math.max(0, (usage.inputTokens ?? 0) - cached),
          cacheRead: cached,
          cacheWrite: usage.cacheCreationTokens ?? 0,
          output: usage.outputTokens ?? 0,
          think: usage.reasoningTokens ?? 0,
        };
      }
      lastAssistant = null;
      turns.begin();
    } else if (kind === "auto_compact_completed") {
      closeStep();
      const elapsed = update.elapsed_ms ?? null;
      push({
        id: `grok:compacted:${serial++}`,
        kind: "compacted",
        text: `Conversation compacted (${update.tokens_before ?? "?"} → ${update.tokens_after ?? "?"} tokens)`,
        startedAt: ts !== null && elapsed !== null ? ts - elapsed : ts,
        durationMs: elapsed,
      });
    } else {
      continue;
    }
    previousTs = ts ?? previousTs;
  }
  closeStep();
  return records;
}

export function loadGrokTranscript(
  vendorSid: string,
  roots: TranscriptRoots,
): TranscriptLoadResult | null {
  if (!isSafeVendorSid(vendorSid)) return null;
  // ~/.grok/sessions/<url-encoded workspace>/<session id>/updates.jsonl
  const sessions = join(roots.home, ".grok", "sessions");
  let workspaces: string[];
  try {
    workspaces = readdirSync(sessions);
  } catch {
    return null;
  }
  for (const workspace of workspaces) {
    const sourcePath = join(sessions, workspace, vendorSid, "updates.jsonl");
    if (!existsSync(sourcePath)) continue;
    return {
      sourcePath,
      records: parseGrokRows(readJsonlSync<GrokRow>(sourcePath)),
    };
  }
  return null;
}
