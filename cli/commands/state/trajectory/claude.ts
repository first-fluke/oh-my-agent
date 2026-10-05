import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import {
  parseTimestampMs,
  readJsonlSync,
} from "../../recap/internal/utils/history-parser.js";
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

interface ClaudeBlock {
  type?: string;
  text?: string;
  thinking?: string;
  id?: string;
  name?: string;
  input?: unknown;
  tool_use_id?: string;
  content?: unknown;
  is_error?: boolean;
}

interface ClaudeUsage {
  input_tokens?: number;
  cache_read_input_tokens?: number;
  cache_creation_input_tokens?: number;
  output_tokens?: number;
  output_tokens_details?: { thinking_tokens?: number };
}

interface ClaudeRow {
  type?: string;
  subtype?: string;
  uuid?: string;
  timestamp?: string | number;
  isSidechain?: boolean;
  isMeta?: boolean;
  isCompactSummary?: boolean;
  content?: string;
  compactMetadata?: {
    trigger?: string;
    preTokens?: number;
    postTokens?: number;
    durationMs?: number;
  };
  message?: {
    id?: string;
    model?: string;
    content?: string | ClaudeBlock[];
    usage?: ClaudeUsage;
  };
}

interface ParseOptions {
  /** Set for nested agent transcripts; their prompts never open a turn. */
  agent?: string;
  parentCallId?: string;
}

// Harness-injected user-role text that is context for the model, not a prompt.
const CONTEXT_PREFIXES = [
  "<system-reminder>",
  "<command-name>",
  "<command-message>",
  "<local-command-stdout>",
  "<local-command-caveat>",
  "<task-notification>",
  "Caveat:",
];

function tokensFrom(
  usage: ClaudeUsage | undefined,
): TrajectoryTokens | undefined {
  if (!usage) return undefined;
  return {
    input: usage.input_tokens ?? 0,
    cacheRead: usage.cache_read_input_tokens ?? 0,
    cacheWrite: usage.cache_creation_input_tokens ?? 0,
    output: usage.output_tokens ?? 0,
    think: usage.output_tokens_details?.thinking_tokens ?? 0,
  };
}

function resultText(content: unknown): string {
  if (typeof content === "string") return content;
  if (!Array.isArray(content)) return stringifyDetail(content);
  return content
    .map((block: ClaudeBlock) =>
      block?.type === "text" && typeof block.text === "string"
        ? block.text
        : `[${block?.type ?? "block"}]`,
    )
    .join("\n");
}

function append(current: string | undefined, next: string): string {
  return current ? `${current}\n\n${next}` : next;
}

/** Fold Claude Code transcript rows into ledger records. Exported for tests. */
export function parseClaudeRows(
  rows: ClaudeRow[],
  options: ParseOptions = {},
): TranscriptRecord[] {
  const nested = options.agent !== undefined;
  const records: TranscriptRecord[] = [];
  const messages = new Map<string, TranscriptRecord>();
  const messageTools = new Map<string, string[]>();
  const calls = new Map<string, TranscriptRecord>();
  let previousTs: number | null = null;
  // Turns resumed without a prompt (task notifications) still start a turn.
  const turns = createTurnTracker();

  const push = (record: TranscriptRecord): TranscriptRecord => {
    if (nested) {
      record.agent = options.agent;
      record.parentCallId = options.parentCallId;
    } else {
      turns.mark(record);
    }
    records.push(record);
    return record;
  };

  const pushInput = (row: ClaudeRow, ts: number | null, text: string) => {
    if (!text.trim()) return;
    const context =
      nested ||
      row.isMeta === true ||
      row.isCompactSummary === true ||
      CONTEXT_PREFIXES.some((prefix) => text.trimStart().startsWith(prefix));
    push({
      id: `claude:${row.uuid ?? records.length}:${records.length}`,
      kind: context ? "context" : "user",
      text: summarize(text),
      startedAt: ts,
      durationMs: null,
      input: capDetail(text),
    });
  };

  for (const row of rows) {
    // Main transcripts may inline sidechain rows; nested agents are loaded
    // from their own files instead.
    if (!nested && row.isSidechain === true) continue;
    const parsed = parseTimestampMs(row.timestamp);
    const ts = parsed > 0 ? parsed : null;

    if (row.type === "system" && row.subtype === "turn_duration") {
      turns.begin();
      continue;
    }

    if (row.type === "system" && row.subtype === "compact_boundary") {
      const meta = row.compactMetadata ?? {};
      const detail =
        meta.preTokens !== undefined && meta.postTokens !== undefined
          ? ` (${meta.trigger ?? "manual"}, ${meta.preTokens} → ${meta.postTokens} tokens)`
          : "";
      push({
        id: `claude:${row.uuid ?? records.length}`,
        kind: "compacted",
        text: `${row.content ?? "Conversation compacted"}${detail}`,
        startedAt: ts,
        durationMs: meta.durationMs ?? null,
      });
      previousTs = ts ?? previousTs;
      continue;
    }

    if (row.type === "assistant" && row.message) {
      const messageId = row.message.id ?? row.uuid ?? `row-${records.length}`;
      let record = messages.get(messageId);
      if (!record) {
        // The transcript logs blocks as they complete, not the request start;
        // the preceding row (prompt or tool result) is when the request began.
        record = push({
          id: `claude:${messageId}`,
          kind: "assistant",
          text: "",
          startedAt: previousTs ?? ts,
          durationMs: null,
          model: row.message.model,
        });
        messages.set(messageId, record);
        messageTools.set(messageId, []);
      }
      const blocks = Array.isArray(row.message.content)
        ? row.message.content
        : [];
      for (const block of blocks) {
        if (block.type === "text" && block.text) {
          record.output = capDetail(append(record.output, block.text));
        } else if (block.type === "thinking" && block.thinking) {
          record.thinking = capDetail(append(record.thinking, block.thinking));
        } else if (block.type === "tool_use" && block.id) {
          const name = block.name ?? "tool";
          messageTools.get(messageId)?.push(name);
          const call = push({
            id: `claude:call:${block.id}`,
            kind: nested ? "subtool" : "tool",
            text: summarizeToolCall(name, block.input),
            startedAt: ts,
            durationMs: null,
            toolName: name,
            callId: block.id,
            input: capDetail(stringifyDetail(block.input)),
          });
          calls.set(block.id, call);
        }
      }
      // Every row of one message repeats its usage; the last row is final.
      record.tokens = tokensFrom(row.message.usage) ?? record.tokens;
      if (ts !== null && record.startedAt !== null) {
        record.durationMs = Math.max(0, ts - record.startedAt);
      }
      previousTs = ts ?? previousTs;
      continue;
    }

    if (row.type === "user" && row.message) {
      const content = row.message.content;
      if (typeof content === "string") {
        pushInput(row, ts, content);
      } else if (Array.isArray(content)) {
        const texts: string[] = [];
        for (const block of content) {
          if (block.type === "tool_result" && block.tool_use_id) {
            const call = calls.get(block.tool_use_id);
            if (!call) continue;
            call.output = capDetail(resultText(block.content));
            if (block.is_error === true) call.isError = true;
            if (ts !== null && call.startedAt !== null) {
              call.durationMs = Math.max(0, ts - call.startedAt);
            }
          } else if (block.type === "text" && block.text) {
            texts.push(block.text);
          }
        }
        pushInput(row, ts, texts.join("\n\n"));
      }
      previousTs = ts ?? previousTs;
    }
  }

  for (const [messageId, record] of messages) {
    const tools = messageTools.get(messageId) ?? [];
    record.text = record.output
      ? summarize(record.output)
      : tools.length > 0
        ? summarize(`→ ${tools.join(", ")}`)
        : record.thinking
          ? "(thinking)"
          : "(no visible output)";
  }
  return records;
}

function findTranscript(
  vendorSid: string,
  roots: TranscriptRoots,
): string | null {
  const homes = new Set(
    [
      roots.vendorHome,
      roots.env.CLAUDE_CONFIG_DIR?.trim(),
      join(roots.home, ".claude"),
    ].filter((home): home is string => Boolean(home)),
  );
  for (const home of homes) {
    const projects = join(home, "projects");
    let dirs: string[];
    try {
      dirs = readdirSync(projects);
    } catch {
      continue;
    }
    for (const dir of dirs) {
      const candidate = join(projects, dir, `${vendorSid}.jsonl`);
      if (existsSync(candidate)) return candidate;
    }
  }
  return null;
}

interface AgentMeta {
  name?: string;
  description?: string;
  agentType?: string;
  toolUseId?: string;
}

function loadNestedAgents(sourcePath: string): TranscriptRecord[] {
  const dir = join(sourcePath.replace(/\.jsonl$/, ""), "subagents");
  let names: string[];
  try {
    names = readdirSync(dir);
  } catch {
    return [];
  }
  const records: TranscriptRecord[] = [];
  for (const name of names.sort()) {
    if (!name.endsWith(".jsonl")) continue;
    let meta: AgentMeta = {};
    try {
      meta = JSON.parse(
        readFileSync(
          join(dir, name.replace(/\.jsonl$/, ".meta.json")),
          "utf-8",
        ),
      ) as AgentMeta;
    } catch {
      // Agents without metadata still appear, just without a parent link.
    }
    records.push(
      ...parseClaudeRows(readJsonlSync<ClaudeRow>(join(dir, name)), {
        agent:
          meta.name ??
          meta.description ??
          meta.agentType ??
          name.replace(/\.jsonl$/, ""),
        parentCallId: meta.toolUseId,
      }),
    );
  }
  return records;
}

export function loadClaudeTranscript(
  vendorSid: string,
  roots: TranscriptRoots,
): TranscriptLoadResult | null {
  if (!isSafeVendorSid(vendorSid)) return null;
  const sourcePath = findTranscript(vendorSid, roots);
  if (!sourcePath) return null;
  return {
    sourcePath,
    records: [
      ...parseClaudeRows(readJsonlSync<ClaudeRow>(sourcePath)),
      ...loadNestedAgents(sourcePath),
    ],
  };
}
