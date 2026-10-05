import { existsSync, readdirSync } from "node:fs";
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

type Payload = Record<string, unknown>;

interface KimiRow {
  /** Unix seconds. */
  timestamp?: number;
  message?: { type?: string; payload?: Payload };
}

interface AgentState {
  agent?: string;
  parentCallId?: string;
  step: TranscriptRecord | null;
  stepTools: string[];
  calls: Map<string, TranscriptRecord>;
  lastCall: TranscriptRecord | null;
  previousTs: number | null;
  compactionAt: number | null;
}

function text(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function inputText(value: unknown): string {
  if (typeof value === "string") return value;
  if (!Array.isArray(value)) return "";
  return value
    .map((part: Payload) => text(part?.text))
    .filter(Boolean)
    .join("\n");
}

/**
 * Fold a Kimi CLI wire log into ledger records. The wire log is the event
 * stream the CLI replays its UI from (`kimi_cli/wire/types.py`): turns, steps,
 * streamed content parts, tool calls and results, and per-step token usage.
 * Exported for tests.
 */
export function parseKimiRows(rows: KimiRow[]): TranscriptRecord[] {
  const records: TranscriptRecord[] = [];
  const turns = createTurnTracker();
  const agents = new Map<string, AgentState>();
  let serial = 0;

  const stateFor = (agent?: string, parentCallId?: string): AgentState => {
    const key = agent ?? "";
    let state = agents.get(key);
    if (!state) {
      state = {
        agent,
        parentCallId,
        step: null,
        stepTools: [],
        calls: new Map(),
        lastCall: null,
        previousTs: null,
        compactionAt: null,
      };
      agents.set(key, state);
    }
    return state;
  };

  const push = (
    state: AgentState,
    record: TranscriptRecord,
  ): TranscriptRecord => {
    if (state.agent === undefined) {
      turns.mark(record);
    } else {
      record.agent = state.agent;
      record.parentCallId = state.parentCallId;
    }
    records.push(record);
    return record;
  };

  const closeStep = (state: AgentState) => {
    const step = state.step;
    if (!step) return;
    step.text = step.output
      ? summarize(step.output)
      : state.stepTools.length > 0
        ? summarize(`→ ${state.stepTools.join(", ")}`)
        : step.thinking
          ? "(thinking)"
          : "(no visible output)";
    state.step = null;
    state.stepTools = [];
  };

  const openStep = (state: AgentState, ts: number | null): TranscriptRecord => {
    if (!state.step) {
      state.step = push(state, {
        id: `kimi:step:${serial++}`,
        kind: "assistant",
        text: "",
        startedAt: state.previousTs ?? ts,
        durationMs: null,
      });
    }
    return state.step;
  };

  const consume = (
    state: AgentState,
    type: string,
    payload: Payload,
    ts: number | null,
  ): void => {
    const touch = (record: TranscriptRecord) => {
      if (ts !== null && record.startedAt !== null) {
        record.durationMs = Math.max(0, ts - record.startedAt);
      }
    };

    if (type === "SubagentEvent") {
      const event = (payload.event ?? {}) as {
        type?: string;
        payload?: Payload;
      };
      const agent =
        text(payload.agent_id) || text(payload.task_tool_call_id) || "subagent";
      const parent =
        text(payload.parent_tool_call_id) || text(payload.task_tool_call_id);
      if (event.type) {
        consume(
          stateFor(agent, parent || undefined),
          event.type,
          event.payload ?? {},
          ts,
        );
      }
      return;
    }

    if (type === "TurnBegin" || type === "SteerInput") {
      closeStep(state);
      const prompt = inputText(payload.user_input);
      if (prompt) {
        push(state, {
          id: `kimi:prompt:${serial++}`,
          kind: state.agent === undefined ? "user" : "context",
          text: summarize(prompt),
          startedAt: ts,
          durationMs: null,
          input: capDetail(prompt),
        });
      }
    } else if (type === "TurnEnd") {
      closeStep(state);
      if (state.agent === undefined) turns.begin();
    } else if (type === "StepBegin") {
      closeStep(state);
      openStep(state, ts);
    } else if (
      type === "ContentPart" ||
      type === "TextPart" ||
      type === "ThinkPart"
    ) {
      const step = openStep(state, ts);
      if (payload.type === "think" || type === "ThinkPart") {
        step.thinking = capDetail(
          `${step.thinking ?? ""}${text(payload.think) || text(payload.text)}`,
        );
      } else {
        step.output = capDetail(`${step.output ?? ""}${text(payload.text)}`);
      }
      touch(step);
    } else if (type === "ToolCall") {
      touch(openStep(state, ts));
      const fn = (payload.function ?? {}) as Payload;
      const name = text(fn.name) || "tool";
      const callId = text(payload.id) || `kimi:${serial}`;
      state.stepTools.push(name);
      state.lastCall = push(state, {
        id: `kimi:call:${callId}:${serial++}`,
        kind: state.agent === undefined ? "tool" : "subtool",
        text: summarizeToolCall(name, fn.arguments),
        startedAt: ts,
        durationMs: null,
        toolName: name,
        callId,
        input: capDetail(stringifyDetail(fn.arguments ?? "")),
      });
      state.calls.set(callId, state.lastCall);
    } else if (type === "ToolCallPart") {
      // Streamed argument fragments extend the call that is being assembled.
      const call = state.lastCall;
      if (call) {
        call.input = capDetail(
          `${call.input ?? ""}${text(payload.arguments_part)}`,
        );
        call.text = summarizeToolCall(call.toolName ?? "tool", call.input);
      }
    } else if (type === "ToolResult") {
      const call = state.calls.get(text(payload.tool_call_id));
      if (call) {
        const value = (payload.return_value ?? payload) as Payload;
        call.output = capDetail(
          [
            typeof value.output === "string"
              ? value.output
              : inputText(value.output),
            text(value.message),
          ]
            .filter(Boolean)
            .join("\n"),
        );
        if (value.is_error === true) call.isError = true;
        touch(call);
      }
    } else if (type === "StatusUpdate") {
      const usage = payload.token_usage as
        | Record<string, number>
        | null
        | undefined;
      const step = state.step;
      if (usage && step) {
        step.tokens = {
          input: usage.input_other ?? 0,
          cacheRead: usage.input_cache_read ?? 0,
          cacheWrite: usage.input_cache_creation ?? 0,
          output: usage.output ?? 0,
          think: 0,
        };
      }
      return;
    } else if (type === "CompactionBegin") {
      closeStep(state);
      state.compactionAt = ts;
    } else if (type === "CompactionEnd") {
      push(state, {
        id: `kimi:compacted:${serial++}`,
        kind: "compacted",
        text: "Conversation compacted",
        startedAt: state.compactionAt ?? ts,
        durationMs:
          ts !== null && state.compactionAt !== null
            ? Math.max(0, ts - state.compactionAt)
            : null,
      });
      state.compactionAt = null;
    } else {
      return;
    }
    state.previousTs = ts ?? state.previousTs;
  };

  for (const row of rows) {
    const type = row.message?.type;
    if (!type) continue;
    const ts = typeof row.timestamp === "number" ? row.timestamp * 1000 : null;
    consume(stateFor(), type, row.message?.payload ?? {}, ts);
  }
  for (const state of agents.values()) closeStep(state);
  return records;
}

export function loadKimiTranscript(
  vendorSid: string,
  roots: TranscriptRoots,
): TranscriptLoadResult | null {
  if (!isSafeVendorSid(vendorSid)) return null;
  // ~/.kimi/sessions/<md5 of the work dir>/<session id>/wire.jsonl
  const sessions = join(
    roots.env.KIMI_SHARE_DIR?.trim() || join(roots.home, ".kimi"),
    "sessions",
  );
  let workDirs: string[];
  try {
    workDirs = readdirSync(sessions);
  } catch {
    return null;
  }
  for (const workDir of workDirs) {
    const sourcePath = join(sessions, workDir, vendorSid, "wire.jsonl");
    if (!existsSync(sourcePath)) continue;
    return {
      sourcePath,
      records: parseKimiRows(readJsonlSync<KimiRow>(sourcePath)),
    };
  }
  return null;
}
