import { type Dirent, readdirSync } from "node:fs";
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
  TrajectoryTokens,
  TranscriptLoadResult,
  TranscriptRecord,
  TranscriptRoots,
} from "./types.js";

interface CodexContent {
  type?: string;
  text?: string;
}

interface CodexUsage {
  input_tokens?: number;
  cached_input_tokens?: number;
  cache_write_input_tokens?: number;
  output_tokens?: number;
  reasoning_output_tokens?: number;
}

interface CodexRow {
  type?: string;
  timestamp?: string | number;
  payload?: {
    type?: string;
    role?: string;
    id?: string;
    name?: string;
    call_id?: string;
    arguments?: unknown;
    input?: unknown;
    output?: unknown;
    message?: string;
    time_to_first_token_ms?: number;
    content?: CodexContent[];
    summary?: CodexContent[];
    info?: { last_token_usage?: CodexUsage } | null;
    internal_chat_message_metadata_passthrough?: {
      content_item_kinds?: string[];
    };
  };
}

// Harness-authored user-role messages in rollouts that predate item kinds.
const CONTEXT_PREFIXES = [
  "<environment_context>",
  "<user_instructions>",
  "<turn_aborted>",
  "<recommended_plugins>",
  "<codex_internal_context",
  "# AGENTS.md instructions",
];

function contentText(content: unknown): string {
  if (typeof content === "string") return content;
  if (!Array.isArray(content)) return stringifyDetail(content);
  return content
    .map((item: CodexContent) =>
      typeof item?.text === "string" ? item.text : `[${item?.type ?? "item"}]`,
    )
    .join("\n");
}

function isUserPrompt(text: string, kinds: string[] | undefined): boolean {
  if (kinds && kinds.length > 0) {
    return kinds.some((kind) => kind.startsWith("user."));
  }
  const head = text.trimStart();
  return !CONTEXT_PREFIXES.some((prefix) => head.startsWith(prefix));
}

function tokensFrom(usage: CodexUsage): TrajectoryTokens {
  const cached = usage.cached_input_tokens ?? 0;
  return {
    // Codex reports cached tokens inside input_tokens.
    input: Math.max(0, (usage.input_tokens ?? 0) - cached),
    cacheRead: cached,
    cacheWrite: usage.cache_write_input_tokens ?? 0,
    output: usage.output_tokens ?? 0,
    think: usage.reasoning_output_tokens ?? 0,
  };
}

function append(current: string | undefined, next: string): string {
  return current ? `${current}\n\n${next}` : next;
}

/** Fold Codex rollout rows into ledger records. Exported for tests. */
export function parseCodexRows(rows: CodexRow[]): TranscriptRecord[] {
  const records: TranscriptRecord[] = [];
  const calls = new Map<string, TranscriptRecord>();
  // One model response: reasoning, messages and tool calls up to token_count.
  // Assigned from the closures below, so keep the declared type un-narrowed.
  let step = null as TranscriptRecord | null;
  let stepTools: string[] = [];
  let previousTs: number | null = null;
  let serial = 0;
  // A task can resume without a prompt (goals, inter-agent messages).
  const turns = createTurnTracker();

  const push = (record: TranscriptRecord): TranscriptRecord => {
    turns.mark(record);
    records.push(record);
    return record;
  };

  // Codex reports time-to-first-token once per task, for its first response.
  let taskFirstStep = null as TranscriptRecord | null;
  let awaitingFirstStep = false;

  const closeStep = () => {
    if (!step) return;
    step.text = step.output
      ? summarize(step.output)
      : stepTools.length > 0
        ? summarize(`→ ${stepTools.join(", ")}`)
        : step.thinking
          ? "(thinking)"
          : "(reasoning)";
    step = null;
    stepTools = [];
  };

  const openStep = (ts: number | null): TranscriptRecord => {
    if (step) return step;
    // Response items are logged on completion; the previous row marks when
    // the request was sent.
    step = push({
      id: `codex:step:${serial++}`,
      kind: "assistant",
      text: "",
      startedAt: previousTs ?? ts,
      durationMs: null,
    });
    if (awaitingFirstStep) {
      taskFirstStep = step;
      awaitingFirstStep = false;
    }
    return step;
  };

  const touchStep = (record: TranscriptRecord, ts: number | null) => {
    if (ts !== null && record.startedAt !== null) {
      record.durationMs = Math.max(0, ts - record.startedAt);
    }
  };

  for (const row of rows) {
    const parsed = parseTimestampMs(row.timestamp);
    const ts = parsed > 0 ? parsed : null;
    const payload = row.payload ?? {};

    if (row.type === "compacted") {
      closeStep();
      push({
        id: `codex:compacted:${serial++}`,
        kind: "compacted",
        text: "Conversation compacted",
        startedAt: ts,
        durationMs: null,
        output: payload.message ? capDetail(payload.message) : undefined,
      });
      previousTs = ts ?? previousTs;
      continue;
    }

    if (row.type === "event_msg") {
      if (payload.type === "task_started") {
        closeStep();
        turns.begin();
        previousTs = ts ?? previousTs;
        taskFirstStep = null;
        awaitingFirstStep = true;
      } else if (payload.type === "task_complete") {
        if (
          taskFirstStep &&
          typeof payload.time_to_first_token_ms === "number"
        ) {
          taskFirstStep.ttftMs = payload.time_to_first_token_ms;
        }
        taskFirstStep = null;
        awaitingFirstStep = false;
      } else if (payload.type === "token_count" && step) {
        const usage = payload.info?.last_token_usage;
        if (usage) step.tokens = tokensFrom(usage);
        closeStep();
      }
      continue;
    }

    if (row.type !== "response_item") continue;

    if (payload.type === "message") {
      const text = contentText(payload.content ?? []);
      if (payload.role === "assistant") {
        if (text.trim()) {
          const current = openStep(ts);
          current.output = capDetail(append(current.output, text));
          touchStep(current, ts);
        }
      } else if (text.trim()) {
        closeStep();
        const prompt =
          payload.role === "user" &&
          isUserPrompt(
            text,
            payload.internal_chat_message_metadata_passthrough
              ?.content_item_kinds,
          );
        push({
          id: `codex:${payload.id ?? `message-${serial++}`}`,
          kind: prompt ? "user" : "context",
          text: summarize(text),
          startedAt: ts,
          durationMs: null,
          input: capDetail(text),
        });
      }
      previousTs = ts ?? previousTs;
      continue;
    }

    if (payload.type === "reasoning") {
      const current = openStep(ts);
      const summary = contentText(payload.summary ?? []);
      if (summary.trim()) {
        current.thinking = capDetail(append(current.thinking, summary));
      }
      touchStep(current, ts);
      previousTs = ts ?? previousTs;
      continue;
    }

    if (payload.call_id && payload.type?.endsWith("_output")) {
      const call = calls.get(payload.call_id);
      if (call) {
        call.output = capDetail(contentText(payload.output));
        if (ts !== null && call.startedAt !== null) {
          call.durationMs = Math.max(0, ts - call.startedAt);
        }
      }
      previousTs = ts ?? previousTs;
      continue;
    }

    if (payload.call_id && payload.type?.endsWith("_call")) {
      const current = openStep(ts);
      touchStep(current, ts);
      const name = payload.name ?? payload.type.replace(/_call$/, "");
      const input = payload.arguments ?? payload.input;
      stepTools.push(name);
      const call: TranscriptRecord = {
        id: `codex:call:${payload.call_id}`,
        kind: "tool",
        text: summarizeToolCall(name, input),
        startedAt: ts,
        durationMs: null,
        toolName: name,
        callId: payload.call_id,
        input: capDetail(stringifyDetail(input)),
      };
      calls.set(payload.call_id, call);
      push(call);
      previousTs = ts ?? previousTs;
    }
  }
  closeStep();
  return records;
}

function findRollout(dir: string, suffix: string): string | null {
  let entries: Dirent[];
  try {
    entries = readdirSync(dir, { withFileTypes: true });
  } catch {
    return null;
  }
  for (const entry of entries) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      const found = findRollout(full, suffix);
      if (found) return found;
    } else if (entry.name.endsWith(suffix)) {
      return full;
    }
  }
  return null;
}

export function loadCodexTranscript(
  vendorSid: string,
  roots: TranscriptRoots,
): TranscriptLoadResult | null {
  if (!isSafeVendorSid(vendorSid)) return null;
  const suffix = `-${vendorSid}.jsonl`;
  // Launchers such as Orca point CODEX_HOME at a per-account home.
  const homes = new Set(
    [
      roots.vendorHome,
      roots.env.CODEX_HOME?.trim(),
      join(roots.home, ".codex"),
    ].filter((home): home is string => Boolean(home)),
  );
  let sourcePath: string | null = null;
  for (const home of homes) {
    sourcePath =
      findRollout(join(home, "sessions"), suffix) ??
      findRollout(join(home, "archived_sessions"), suffix);
    if (sourcePath) break;
  }
  if (!sourcePath) return null;
  return {
    sourcePath,
    records: parseCodexRows(readJsonlSync<CodexRow>(sourcePath)),
  };
}
