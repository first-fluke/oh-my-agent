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

const CLAUDE_DIR = join(homedir(), ".claude");
const HISTORY_PATH = join(CLAUDE_DIR, "history.jsonl");
const PROJECTS_DIR = join(CLAUDE_DIR, "projects");

/**
 * Extract assistant response text from a content field.
 * Claude content can be string or array of {type:"text", text:""} blocks.
 */
function extractText(
  content: string | Array<{ type?: string; text?: string }>,
): string {
  if (typeof content === "string") return content;
  if (!Array.isArray(content)) return "";
  for (const block of content) {
    if (block?.type === "text" && block.text) return block.text;
  }
  return "";
}

interface SessionPair {
  prefix: string; // first 80 chars of user prompt in session file
  response: string; // response preview
}

interface ClaudeSessionRow {
  type?: string;
  timestamp?: string | number;
  message?: {
    content?: string | Array<{ type?: string; text?: string }>;
  };
}

/**
 * Build sessionId → SessionPair[] (ordered user→assistant pairs).
 * Primary match by prompt prefix (Map-like), fallback by index order.
 */
function loadSessionResponses(
  sessionIds: Set<string>,
): Map<string, SessionPair[]> {
  const result = new Map<string, SessionPair[]>();
  if (!existsSync(PROJECTS_DIR)) return result;

  try {
    for (const projDir of readdirSync(PROJECTS_DIR)) {
      const projPath = join(PROJECTS_DIR, projDir);
      let files: string[];
      try {
        files = readdirSync(projPath).filter(
          (f) =>
            f.endsWith(".jsonl") && sessionIds.has(f.replace(".jsonl", "")),
        );
      } catch {
        continue;
      }

      for (const file of files) {
        const sessionId = file.replace(".jsonl", "");
        const rows = readJsonlSync<{
          type?: string;
          message?: {
            content?: string | Array<{ type?: string; text?: string }>;
          };
        }>(join(projPath, file));

        const msgs: PairMessage[] = [];
        for (const row of rows) {
          if (row.type === "user" || row.type === "assistant") {
            msgs.push({
              role: row.type,
              text: extractText(row.message?.content || ""),
            });
          }
        }

        const pairs: SessionPair[] = [];
        for (let i = 0; i < msgs.length; i++) {
          const msg = msgs[i];
          if (msg?.role !== "user") continue;
          const resp = findResponse(msgs, i, "first");
          pairs.push({
            prefix: msg.text.slice(0, 80),
            response: resp ? preview(resp) : "",
          });
        }

        if (pairs.length > 0) {
          result.set(sessionId, pairs);
        }
      }
    }
  } catch {
    // ignore
  }
  return result;
}

function findSessionFiles(): Array<{
  path: string;
  sessionId: string;
  project: string;
}> {
  if (!existsSync(PROJECTS_DIR)) return [];

  const files: Array<{ path: string; sessionId: string; project: string }> = [];
  try {
    for (const projDir of readdirSync(PROJECTS_DIR)) {
      const projPath = join(PROJECTS_DIR, projDir);
      let names: string[];
      try {
        names = readdirSync(projPath);
      } catch {
        continue;
      }
      for (const name of names) {
        if (!name.endsWith(".jsonl")) continue;
        files.push({
          path: join(projPath, name),
          sessionId: name.replace(".jsonl", ""),
          project: pathToProjectName(projDir) ?? projDir,
        });
      }
    }
  } catch {
    // ignore
  }
  return files;
}

function loadRawTurns(start: number, end: number): MemoryRawTurn[] {
  const turns: MemoryRawTurn[] = [];
  for (const file of findSessionFiles()) {
    for (const row of readJsonlSync<ClaudeSessionRow>(file.path)) {
      const role =
        row.type === "user" || row.type === "assistant" ? row.type : null;
      if (!role) continue;

      const timestamp = parseTimestampMs(row.timestamp);
      if (!inWindow(timestamp, start, end)) continue;

      const text = extractText(row.message?.content ?? "").trim();
      if (!text) continue;

      turns.push(
        createRawTurn({
          vendor: "claude",
          role,
          text,
          timestamp,
          sourcePath: file.path,
          vendorSessionId: file.sessionId,
          project: file.project,
        }),
      );
    }
  }
  return sortRawTurns(turns);
}

registerParser({
  name: "claude",

  async detect() {
    return existsSync(HISTORY_PATH) || existsSync(PROJECTS_DIR);
  },

  async parseRaw(start, end) {
    return loadRawTurns(start, end);
  },

  async parse(start, end) {
    if (!existsSync(HISTORY_PATH)) return [];

    // First pass: collect entries and session IDs.
    const rawEntries: Array<{
      ts: number;
      project?: string;
      prompt: string;
      sessionId?: string;
    }> = [];
    const sessionIds = new Set<string>();

    for await (const row of streamJsonl<{
      timestamp?: number;
      display?: string;
      project?: string;
      sessionId?: string;
    }>(HISTORY_PATH)) {
      const ts = row.timestamp;
      if (typeof ts !== "number" || !inWindow(ts, start, end)) continue;

      const prompt = row.display;
      if (!prompt) continue;

      const sessionId = row.sessionId || undefined;
      if (sessionId) sessionIds.add(sessionId);

      rawEntries.push({
        ts,
        project: pathToProjectName(row.project),
        prompt,
        sessionId,
      });
    }

    // Second pass: load responses for matching sessions.
    const sessionResponses = loadSessionResponses(sessionIds);

    // Track per-session index for fallback matching.
    const sessionIndexCounters = new Map<string, number>();

    // Build normalized entries: prefix match first, index fallback.
    const entries: NormalizedEntry[] = rawEntries.map((raw) => {
      let response: string | undefined;
      if (raw.sessionId) {
        const pairs = sessionResponses.get(raw.sessionId);
        if (pairs) {
          // Primary: match by prompt prefix.
          const key = raw.prompt.slice(0, 80);
          const prefixMatch = pairs.find((p) => p.prefix === key);
          if (prefixMatch) {
            response = prefixMatch.response || undefined;
          } else {
            // Fallback: match by sequential index within the session.
            const idx = sessionIndexCounters.get(raw.sessionId) ?? 0;
            const pair = pairs[idx];
            if (pair) {
              response = pair.response || undefined;
            }
          }
          sessionIndexCounters.set(
            raw.sessionId,
            (sessionIndexCounters.get(raw.sessionId) ?? 0) + 1,
          );
        }
      }

      return {
        tool: "claude" as const,
        timestamp: raw.ts,
        project: raw.project,
        prompt: raw.prompt,
        response,
        sessionId: raw.sessionId,
      };
    });

    return entries;
  },
});
