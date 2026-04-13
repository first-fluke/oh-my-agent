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

/**
 * Build session_id → project map from session files (sessions/ + archived_sessions/).
 * Reads the first line (session_meta) of each .jsonl to extract cwd.
 */
function loadSessionProjectMap(): Map<string, string> {
  const map = new Map<string, string>();

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

function scanDir(dir: string, map: Map<string, string>): void {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      scanDir(full, map);
    } else if (entry.name.endsWith(".jsonl")) {
      try {
        const firstLine = readFileSync(full, "utf-8").split("\n")[0];
        const d = JSON.parse(firstLine);
        if (d?.type === "session_meta") {
          const sid = d.payload?.id;
          const cwd = d.payload?.cwd;
          if (sid && cwd) {
            map.set(sid, cwd.split("/").pop() || cwd);
          }
        }
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

    const sessionIndex = loadSessionProjectMap();
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
        const project = sessionId ? sessionIndex.get(sessionId) : undefined;

        entries.push({
          tool: "codex",
          timestamp: ts,
          project,
          prompt,
          sessionId,
        });
      } catch {
        // skip malformed lines
      }
    }

    return entries;
  },
});
