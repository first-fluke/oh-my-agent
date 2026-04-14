import {
  createReadStream,
  existsSync,
  readdirSync,
  readFileSync,
} from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { createInterface } from "node:readline";
import { registerParser } from "../registry.js";
import type { NormalizedEntry } from "../schema.js";

const CODEX_DIR = join(homedir(), ".codex");
const HISTORY_PATH = join(CODEX_DIR, "history.jsonl");

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

  for (const dir of ["sessions", "archived_sessions"]) {
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

function scanDir(dir: string, map: Map<string, SessionData>): void {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      scanDir(full, map);
    } else if (entry.name.endsWith(".jsonl")) {
      try {
        const lines = readFileSync(full, "utf-8").split("\n").filter(Boolean);
        if (lines.length === 0) continue;

        const firstLine = lines[0];
        if (!firstLine) continue;
        const first = JSON.parse(firstLine);
        if (first?.type !== "session_meta") continue;

        const sid = first.payload?.id;
        const cwd = first.payload?.cwd;
        if (!sid || !cwd) continue;

        const responses = new Map<string, string>();

        // Collect response_items with user/assistant roles
        type ContentItem = { type?: string; text?: string };
        const items: Array<{ role: string; text: string }> = [];
        for (const line of lines) {
          const d = JSON.parse(line);
          if (d.type !== "response_item") continue;
          const p = d.payload;
          if (!p?.role || !p.content) continue;
          if (p.role === "user") {
            const text = (p.content as ContentItem[])
              .filter((c) => c.type === "input_text")
              .map((c) => c.text || "")
              .join(" ")
              .trim();
            if (text && !text.startsWith("<environment_context>")) {
              items.push({ role: "user", text });
            }
          } else if (p.role === "assistant") {
            const text = (p.content as ContentItem[])
              .filter((c) => c.type === "output_text")
              .map((c) => c.text || "")
              .join(" ")
              .trim();
            if (text) items.push({ role: "assistant", text });
          }
        }
        for (let i = 0; i < items.length; i++) {
          const item = items[i];
          if (!item) continue;
          if (item.role !== "user") continue;
          for (let j = i + 1; j < items.length; j++) {
            const next = items[j];
            if (!next) continue;
            if (next.role === "assistant") {
              responses.set(item.text.slice(0, 100), next.text.slice(0, 200));
              break;
            }
          }
        }

        map.set(sid, {
          project: cwd.split("/").pop() || cwd,
          responses,
        });
      } catch {
        // skip unreadable
      }
    }
  }
}

registerParser({
  name: "codex",

  async detect() {
    return existsSync(HISTORY_PATH);
  },

  async parse(start, end) {
    if (!existsSync(HISTORY_PATH)) return [];

    const sessionData = loadSessionData();
    const entries: NormalizedEntry[] = [];
    const rl = createInterface({
      input: createReadStream(HISTORY_PATH),
      crlfDelay: Number.POSITIVE_INFINITY,
    });

    for await (const line of rl) {
      if (!line.trim()) continue;
      try {
        const row = JSON.parse(line);
        // Codex uses Unix seconds — convert to ms
        const ts = (row.ts ?? 0) * 1000;
        if (ts < start || ts >= end) continue;

        const prompt = row.text;
        if (!prompt) continue;

        const sessionId = row.session_id || undefined;
        const data = sessionId ? sessionData.get(sessionId) : undefined;

        // Match response by prompt text prefix
        let response: string | undefined;
        if (data?.responses) {
          const key = prompt.slice(0, 100);
          response = data.responses.get(key);
        }

        entries.push({
          tool: "codex",
          timestamp: ts,
          project: data?.project,
          prompt,
          response,
          sessionId,
        });
      } catch {
        // skip malformed lines
      }
    }

    return entries;
  },
});
