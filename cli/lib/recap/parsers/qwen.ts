import { createReadStream, existsSync, readdirSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { createInterface } from "node:readline";
import { registerParser } from "../registry.js";
import type { NormalizedEntry } from "../schema.js";

const QWEN_BASE = join(homedir(), ".qwen", "projects");

function findChatFiles(): string[] {
  if (!existsSync(QWEN_BASE)) return [];

  const files: string[] = [];
  try {
    for (const projectDir of readdirSync(QWEN_BASE)) {
      const chatsDir = join(QWEN_BASE, projectDir, "chats");
      if (!existsSync(chatsDir)) continue;
      for (const file of readdirSync(chatsDir)) {
        if (file.endsWith(".jsonl")) {
          files.push(join(chatsDir, file));
        }
      }
    }
  } catch {
    // ignore permission errors
  }
  return files;
}

registerParser({
  name: "qwen",

  async detect() {
    return existsSync(QWEN_BASE);
  },

  async parse(start, end) {
    const files = findChatFiles();
    if (files.length === 0) return [];

    const entries: NormalizedEntry[] = [];

    for (const file of files) {
      const rl = createInterface({
        input: createReadStream(file),
        crlfDelay: Number.POSITIVE_INFINITY,
      });

      for await (const line of rl) {
        if (!line.trim()) continue;
        try {
          const row = JSON.parse(line);
          if (row.type !== "user") continue;

          const ts = row.timestamp ? new Date(row.timestamp).getTime() : 0;
          if (Number.isNaN(ts) || ts < start || ts >= end) continue;

          const parts = row.message?.parts || [];
          const text = parts
            .map((p: { text?: string }) => p.text || "")
            .filter(Boolean)
            .join(" ");
          if (!text) continue;

          const project = row.cwd?.split("/").pop() || undefined;

          entries.push({
            tool: "qwen",
            timestamp: ts,
            project,
            prompt: text,
            sessionId: row.sessionId || undefined,
            metadata: {
              gitBranch: row.gitBranch || undefined,
              model: row.message?.model || undefined,
            },
          });
        } catch {
          // skip malformed lines
        }
      }
    }

    return entries;
  },
});
