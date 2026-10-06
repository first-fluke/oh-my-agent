import { existsSync, readdirSync } from "node:fs";
import { join } from "node:path";
import {
  extractUserPrompt,
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

interface CursorBlock {
  type?: string;
  text?: string;
  name?: string;
  input?: unknown;
}

interface CursorRow {
  type?: string;
  status?: string;
  error?: string;
  role?: string;
  message?: { content?: string | CursorBlock[] };
}

function blocksOf(row: CursorRow): CursorBlock[] {
  const content = row.message?.content;
  if (typeof content === "string") return [{ type: "text", text: content }];
  return content ?? [];
}

/**
 * Fold a Cursor agent transcript into ledger records. Cursor records neither
 * timestamps nor tool results, so every record is untimed and tool calls have
 * no output. Exported for tests.
 */
export function parseCursorRows(rows: CursorRow[]): TranscriptRecord[] {
  const records: TranscriptRecord[] = [];
  const turns = createTurnTracker();

  const push = (record: TranscriptRecord): void => {
    turns.mark(record);
    records.push(record);
  };

  rows.forEach((row, position) => {
    const blocks = blocksOf(row);
    const text = blocks
      .filter((block) => block.type === "text" && block.text)
      .map((block) => block.text as string)
      .join("\n")
      .trim();
    const id = `cursor:${position}`;

    if (row.type === "turn_ended") {
      // A failed turn leaves only its error behind.
      if (row.status === "error" && row.error) {
        push({
          id,
          kind: "context",
          text: summarize(`Turn ended with an error: ${row.error}`),
          startedAt: null,
          durationMs: null,
          isError: true,
          input: capDetail(row.error),
        });
      }
      turns.begin();
      return;
    }

    if (row.role === "user") {
      if (!text) return;
      // The prompt sits in <user_query>; anything else is injected context.
      const prompt = extractUserPrompt(text);
      const wrapped = /<user_query>/i.test(text);
      push({
        id,
        kind: prompt && (wrapped || !text.startsWith("<")) ? "user" : "context",
        text: summarize(prompt ?? text),
        startedAt: null,
        durationMs: null,
        input: capDetail(text),
      });
    } else if (row.role === "assistant") {
      const toolUses = blocks.filter((block) => block.type === "tool_use");
      push({
        id,
        kind: "assistant",
        text: text
          ? summarize(text)
          : toolUses.length > 0
            ? summarize(
                `→ ${toolUses.map((use) => use.name ?? "tool").join(", ")}`,
              )
            : "(no visible output)",
        startedAt: null,
        durationMs: null,
        output: text ? capDetail(text) : undefined,
      });
      toolUses.forEach((use, index) => {
        const name = use.name ?? "tool";
        push({
          id: `${id}:call:${index}`,
          kind: "tool",
          text: summarizeToolCall(name, use.input),
          startedAt: null,
          durationMs: null,
          toolName: name,
          callId: `${position}:${index}`,
          input: capDetail(stringifyDetail(use.input)),
        });
      });
    }
  });
  return records;
}

export function loadCursorTranscript(
  vendorSid: string,
  roots: TranscriptRoots,
): TranscriptLoadResult | null {
  if (!isSafeVendorSid(vendorSid)) return null;
  // ~/.cursor/projects/<slug>/agent-transcripts/<id>/<id>.jsonl, or the older
  // flat <id>.jsonl beside it.
  const projects = join(roots.home, ".cursor", "projects");
  let slugs: string[];
  try {
    slugs = readdirSync(projects);
  } catch {
    return null;
  }
  for (const slug of slugs) {
    const dir = join(projects, slug, "agent-transcripts");
    const sourcePath = [
      join(dir, vendorSid, `${vendorSid}.jsonl`),
      join(dir, `${vendorSid}.jsonl`),
    ].find((path) => existsSync(path));
    if (!sourcePath) continue;
    return {
      sourcePath,
      records: parseCursorRows(readJsonlSync<CursorRow>(sourcePath)),
    };
  }
  return null;
}
