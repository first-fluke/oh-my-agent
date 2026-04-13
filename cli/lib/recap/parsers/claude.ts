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

const CLAUDE_DIR = join(homedir(), ".claude");
const HISTORY_PATH = join(CLAUDE_DIR, "history.jsonl");
const PROJECTS_DIR = join(CLAUDE_DIR, "projects");

/**
 * Build a map of sessionId → first assistant response text.
 * Scans project session JSONL files for user→assistant pairs.
 */
function loadSessionResponses(
  sessionIds: Set<string>,
): Map<string, Map<number, string>> {
  // Map<sessionId, Map<userTimestamp, responseSnippet>>
  const result = new Map<string, Map<number, string>>();
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
        const responses = new Map<number, string>();
        try {
          const content = readFileSync(join(projPath, file), "utf-8");
          const lines = content.split("\n").filter(Boolean);
          for (let i = 0; i < lines.length; i++) {
            const msg = JSON.parse(lines[i]);
            if (msg.type === "user" && i + 1 < lines.length) {
              const next = JSON.parse(lines[i + 1]);
              if (next.type === "assistant") {
                const blocks = next.message?.content || [];
                for (const b of blocks) {
                  if (b?.type === "text" && b.text) {
                    const userTs = msg.message?.createdAt
                      ? new Date(msg.message.createdAt).getTime()
                      : 0;
                    responses.set(userTs, b.text.slice(0, 200));
                    break;
                  }
                }
              }
            }
          }
        } catch {
          // skip unreadable
        }
        if (responses.size > 0) {
          result.set(sessionId, responses);
        }
      }
    }
  } catch {
    // ignore
  }
  return result;
}

registerParser({
  name: "claude",

  async detect() {
    return existsSync(HISTORY_PATH);
  },

  async parse(start, end) {
    if (!existsSync(HISTORY_PATH)) return [];

    // First pass: collect entries and session IDs
    const rawEntries: Array<{
      ts: number;
      project?: string;
      prompt: string;
      sessionId?: string;
    }> = [];
    const sessionIds = new Set<string>();

    const rl = createInterface({
      input: createReadStream(HISTORY_PATH),
      crlfDelay: Number.POSITIVE_INFINITY,
    });

    for await (const line of rl) {
      if (!line.trim()) continue;
      try {
        const row = JSON.parse(line);
        const ts = row.timestamp;
        if (typeof ts !== "number" || ts < start || ts >= end) continue;

        const prompt = row.display;
        if (!prompt) continue;

        const sessionId = row.sessionId || undefined;
        if (sessionId) sessionIds.add(sessionId);

        rawEntries.push({
          ts,
          project: row.project?.split("/").pop() || undefined,
          prompt,
          sessionId,
        });
      } catch {
        // skip malformed lines
      }
    }

    // Second pass: load responses for matching sessions
    const sessionResponses = loadSessionResponses(sessionIds);

    // Build normalized entries with responses
    const entries: NormalizedEntry[] = rawEntries.map((raw) => {
      let response: string | undefined;
      if (raw.sessionId) {
        const resMap = sessionResponses.get(raw.sessionId);
        if (resMap) {
          // Find closest response by timestamp (within 60s)
          for (const [userTs, text] of resMap) {
            if (Math.abs(userTs - raw.ts) < 60_000) {
              response = text;
              break;
            }
          }
          // Fallback: if no timestamp match, try first available
          if (!response && resMap.size > 0) {
            response = resMap.values().next().value;
          }
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
