import { existsSync, readdirSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import type { MemoryRawTurn } from "../../../../types/memory.js";
import { registerParser } from "../registry.js";
import type { NormalizedEntry } from "../schema.js";
import {
  createRawTurn,
  findResponse,
  inWindow,
  type PairMessage,
  parseTimestampMs,
  pathToProjectName,
  preview,
  readJsonlSync,
  sortRawTurns,
  streamJsonl,
} from "../utils/history-parser.js";

const CODEX_DIR = join(homedir(), ".codex");
const HISTORY_PATH = join(CODEX_DIR, "history.jsonl");
const SESSION_DIRS = ["sessions", "archived_sessions"] as const;

interface SessionData {
  project: string;
  responses: Map<string, string>; // promptText → responseSnippet
}

/**
 * Build session_id → { project, responses } from session files.
 * Reads session_meta for cwd and event_msg/response_item for responses.
 */
function loadSessionData(): Map<string, SessionData> {
  const map = new Map<string, SessionData>();

  for (const dir of SESSION_DIRS) {
    const base = join(CODEX_DIR, dir);
    if (!existsSync(base)) continue;
    try {
      scanDir(base, map);
    } catch {
      // ignore
    }
  }

  return map;
}

interface CodexRow {
  timestamp?: string;
  type?: string;
  payload?: {
    id?: string;
    timestamp?: string;
    cwd?: string;
    role?: string;
    content?: Array<{ type?: string; text?: string }>;
  };
}

function codexRowTimestamp(row: CodexRow): number {
  return parseTimestampMs(row.timestamp ?? row.payload?.timestamp);
}

function codexRowText(
  row: CodexRow,
  role: "user" | "assistant",
): string | null {
  const content = row.payload?.content ?? [];
  const type = role === "user" ? "input_text" : "output_text";
  const text = content
    .filter((item) => item.type === type)
    .map((item) => item.text ?? "")
    .join(" ")
    .trim();
  if (!text) return null;
  if (role === "user" && text.startsWith("<environment_context>")) return null;
  if (role === "user" && text.startsWith("<user_instructions>")) return null;
  return text;
}

function scanDir(dir: string, map: Map<string, SessionData>): void {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      scanDir(full, map);
    } else if (entry.name.endsWith(".jsonl")) {
      const rows = readJsonlSync<CodexRow>(full);
      const first = rows[0];
      if (first?.type !== "session_meta") continue;

      const sid = first.payload?.id;
      const cwd = first.payload?.cwd;
      if (!sid || !cwd) continue;

      // Collect response_items with user/assistant roles.
      const items: PairMessage[] = [];
      for (const row of rows) {
        if (row.type !== "response_item") continue;
        const p = row.payload;
        if (!p?.role || !p.content) continue;
        if (p.role === "user") {
          const text = p.content
            .filter((c) => c.type === "input_text")
            .map((c) => c.text || "")
            .join(" ")
            .trim();
          if (text && !text.startsWith("<environment_context>")) {
            items.push({ role: "user", text });
          }
        } else if (p.role === "assistant") {
          const text = p.content
            .filter((c) => c.type === "output_text")
            .map((c) => c.text || "")
            .join(" ")
            .trim();
          if (text) items.push({ role: "assistant", text });
        }
      }

      const responses = new Map<string, string>();
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (item?.role !== "user") continue;
        const resp = findResponse(items, i, "first");
        if (resp) responses.set(item.text.slice(0, 100), preview(resp));
      }

      map.set(sid, {
        project: pathToProjectName(cwd) ?? cwd,
        responses,
      });
    }
  }
}

function scanRawDir(
  dir: string,
  start: number,
  end: number,
  turns: MemoryRawTurn[],
): void {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      scanRawDir(full, start, end, turns);
      continue;
    }
    if (!entry.name.endsWith(".jsonl")) continue;

    const rows = readJsonlSync<CodexRow>(full);
    const first = rows[0];
    if (first?.type !== "session_meta") continue;

    const sessionId = first.payload?.id;
    if (!sessionId) continue;
    const project = pathToProjectName(first.payload?.cwd);

    for (const row of rows) {
      if (row.type !== "response_item") continue;
      const role =
        row.payload?.role === "user" || row.payload?.role === "assistant"
          ? row.payload.role
          : null;
      if (!role) continue;

      const timestamp = codexRowTimestamp(row);
      if (!inWindow(timestamp, start, end)) continue;

      const text = codexRowText(row, role);
      if (!text) continue;

      turns.push(
        createRawTurn({
          vendor: "codex",
          role,
          text,
          timestamp,
          sourcePath: full,
          vendorSessionId: sessionId,
          project,
        }),
      );
    }
  }
}

function loadRawTurns(start: number, end: number): MemoryRawTurn[] {
  const turns: MemoryRawTurn[] = [];
  for (const dir of SESSION_DIRS) {
    const base = join(CODEX_DIR, dir);
    if (!existsSync(base)) continue;
    try {
      scanRawDir(base, start, end, turns);
    } catch {
      // ignore unreadable session trees
    }
  }
  return sortRawTurns(turns);
}

registerParser({
  name: "codex",

  async detect() {
    return (
      existsSync(HISTORY_PATH) ||
      existsSync(join(CODEX_DIR, "sessions")) ||
      existsSync(join(CODEX_DIR, "archived_sessions"))
    );
  },

  async parseRaw(start, end) {
    return loadRawTurns(start, end);
  },

  async parse(start, end) {
    if (!existsSync(HISTORY_PATH)) return [];

    const sessionData = loadSessionData();
    const entries: NormalizedEntry[] = [];

    for await (const row of streamJsonl<{
      ts?: number;
      text?: string;
      session_id?: string;
    }>(HISTORY_PATH)) {
      // Codex uses Unix seconds — convert to ms.
      const ts = (row.ts ?? 0) * 1000;
      if (!inWindow(ts, start, end)) continue;

      const prompt = row.text;
      if (!prompt) continue;

      const sessionId = row.session_id || undefined;
      const data = sessionId ? sessionData.get(sessionId) : undefined;

      // Match response by prompt text prefix.
      const response = data?.responses.get(prompt.slice(0, 100));

      entries.push({
        tool: "codex",
        timestamp: ts,
        project: data?.project,
        prompt,
        response,
        sessionId,
      });
    }

    return entries;
  },
});
