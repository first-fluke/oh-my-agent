import { createReadStream, existsSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { createInterface } from "node:readline";
import { registerParser } from "../registry.js";
import type { NormalizedEntry } from "../schema.js";

const HISTORY_PATH = join(homedir(), ".claude", "history.jsonl");

registerParser({
  name: "claude",

  async detect() {
    return existsSync(HISTORY_PATH);
  },

  async parse(start, end) {
    if (!existsSync(HISTORY_PATH)) return [];

    const entries: NormalizedEntry[] = [];
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

        entries.push({
          tool: "claude",
          timestamp: ts,
          project: row.project?.split("/").pop() || undefined,
          prompt,
          sessionId: row.sessionId || undefined,
        });
      } catch {
        // skip malformed lines
      }
    }

    return entries;
  },
});
