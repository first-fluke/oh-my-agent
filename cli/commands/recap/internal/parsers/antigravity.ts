import { existsSync, readdirSync, readFileSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import { readJsonlSync } from "../../../../io/conversation-log.js";
import { registerParser } from "../registry.js";
import type { NormalizedEntry } from "../schema.js";
import {
  findResponse,
  inWindow,
  type PairMessage,
  pathToProjectName,
  preview,
  streamJsonl,
} from "../utils/history-parser.js";

// Antigravity CLI stores per-conversation transcripts under brain/{conversationId}.
// Prompts live in history.jsonl too, but only transcripts carry model responses,
// so transcripts are the source of truth and history/cache only supply the workspace.
const ANTIGRAVITY_BASE = join(homedir(), ".gemini", "antigravity-cli");
const BRAIN_DIR = join(ANTIGRAVITY_BASE, "brain");
const TRANSCRIPT_REL = join(".system_generated", "logs", "transcript.jsonl");

interface TranscriptRow {
  step: number;
  source: string;
  type: string;
  content: string;
  ts: number;
}

// USER_INPUT content is wrapped as <USER_REQUEST>…</USER_REQUEST> plus metadata
// blocks. Pull the request body; fall back to stripping known metadata blocks.
function extractUserRequest(content: string): string {
  const match = content.match(/<USER_REQUEST>\s*([\s\S]*?)\s*<\/USER_REQUEST>/);
  if (match?.[1]) return match[1].trim();
  return content
    .replace(/<ADDITIONAL_METADATA>[\s\S]*?<\/ADDITIONAL_METADATA>/g, "")
    .replace(/<USER_SETTINGS_CHANGE>[\s\S]*$/g, "")
    .trim();
}

// conversationId → workspace path. history.jsonl maps it per line; the cache
// keeps only the last conversation per workspace, so it fills remaining gaps.
function buildWorkspaceMap(): Map<string, string> {
  const map = new Map<string, string>();

  const history = readJsonlSync<{
    conversationId?: string;
    workspace?: string;
  }>(join(ANTIGRAVITY_BASE, "history.jsonl"));
  for (const row of history) {
    if (row.conversationId && row.workspace) {
      map.set(row.conversationId, row.workspace);
    }
  }

  const cachePath = join(ANTIGRAVITY_BASE, "cache", "last_conversations.json");
  if (existsSync(cachePath)) {
    try {
      const cache = JSON.parse(readFileSync(cachePath, "utf-8")) as Record<
        string,
        string
      >;
      for (const [workspace, conversationId] of Object.entries(cache)) {
        if (!map.has(conversationId)) map.set(conversationId, workspace);
      }
    } catch {
      // ignore malformed cache
    }
  }

  return map;
}

export async function readTranscript(file: string): Promise<TranscriptRow[]> {
  const rows: TranscriptRow[] = [];
  let fullByStep: Map<number, string> | undefined;

  const resolveFullContent = (
    stepIndex: number | undefined,
    lineIndex: number,
  ): string | undefined => {
    if (!fullByStep) {
      fullByStep = new Map<number, string>();
      const fullPath = join(dirname(file), "transcript_full.jsonl");
      if (existsSync(fullPath)) {
        const fullRows = readJsonlSync<{
          step_index?: number;
          content?: string;
        }>(fullPath);
        for (let idx = 0; idx < fullRows.length; idx++) {
          const item = fullRows[idx];
          if (!item || typeof item.content !== "string") continue;
          const key =
            typeof item.step_index === "number" ? item.step_index : idx;
          fullByStep.set(key, item.content);
        }
      }
    }
    const key = typeof stepIndex === "number" ? stepIndex : lineIndex;
    return fullByStep.get(key);
  };

  let lineIndex = 0;
  for await (const row of streamJsonl<{
    step_index?: number;
    source?: string;
    type?: string;
    content?: string;
    truncated_fields?: unknown;
    created_at?: string;
  }>(file)) {
    const step =
      typeof row.step_index === "number" ? row.step_index : rows.length;
    const isContentTruncated =
      Array.isArray(row.truncated_fields) &&
      row.truncated_fields.includes("content");
    const fullContent = isContentTruncated
      ? resolveFullContent(row.step_index, lineIndex)
      : undefined;
    rows.push({
      step,
      source: row.source ?? "",
      type: row.type ?? "",
      content:
        fullContent ?? (typeof row.content === "string" ? row.content : ""),
      ts: row.created_at ? new Date(row.created_at).getTime() : 0,
    });
    lineIndex++;
  }
  rows.sort((a, b) => a.step - b.step);
  return rows;
}

function toPairMessage(row: TranscriptRow): PairMessage {
  if (row.source === "USER_EXPLICIT" && row.type === "USER_INPUT") {
    return { role: "user", text: row.content };
  }
  if (row.source === "MODEL" && row.type === "PLANNER_RESPONSE") {
    return { role: "assistant", text: row.content };
  }
  return { role: "other", text: row.content };
}

registerParser({
  name: "antigravity",

  async detect() {
    return existsSync(BRAIN_DIR);
  },

  async parse(start, end) {
    if (!existsSync(BRAIN_DIR)) return [];

    const workspaceMap = buildWorkspaceMap();
    const entries: NormalizedEntry[] = [];

    let conversationIds: string[];
    try {
      conversationIds = readdirSync(BRAIN_DIR);
    } catch {
      return [];
    }

    for (const conversationId of conversationIds) {
      const file = join(BRAIN_DIR, conversationId, TRANSCRIPT_REL);
      if (!existsSync(file)) continue;

      let rows: TranscriptRow[];
      try {
        rows = await readTranscript(file);
      } catch {
        continue; // skip unreadable transcript
      }

      const project = pathToProjectName(workspaceMap.get(conversationId));
      const pairs = rows.map(toPairMessage);

      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        if (!row) continue;
        if (row.source !== "USER_EXPLICIT" || row.type !== "USER_INPUT") {
          continue;
        }
        if (!inWindow(row.ts, start, end)) continue;

        const prompt = extractUserRequest(row.content);
        if (!prompt) continue;

        // Last non-empty model response before the next user turn is the answer.
        const response = findResponse(pairs, i, "last");

        entries.push({
          tool: "antigravity",
          timestamp: row.ts,
          project,
          prompt,
          response: response ? preview(response) : undefined,
          sessionId: conversationId,
        });
      }
    }

    return entries;
  },
});
