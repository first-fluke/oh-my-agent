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
  sortRawTurns,
  streamJsonl,
} from "../utils/history-parser.js";

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

interface QwenRow {
  type?: string;
  timestamp?: string;
  message?: { parts?: Array<{ text?: string }> };
  cwd?: string;
  sessionId?: string;
  gitBranch?: string;
}

function rowText(row: QwenRow): string {
  return (row.message?.parts || [])
    .map((p) => p.text || "")
    .filter(Boolean)
    .join(" ");
}

registerParser({
  name: "qwen",

  async detect() {
    return existsSync(QWEN_BASE);
  },

  async parseRaw(start, end) {
    const turns: MemoryRawTurn[] = [];
    for (const file of findChatFiles()) {
      for await (const row of streamJsonl<QwenRow>(file)) {
        const role =
          row.type === "user" || row.type === "assistant" ? row.type : null;
        if (!role) continue;

        const timestamp = parseTimestampMs(row.timestamp);
        if (!inWindow(timestamp, start, end)) continue;

        const text = rowText(row).trim();
        if (!text) continue;

        const sessionId = row.sessionId || file;
        turns.push(
          createRawTurn({
            vendor: "qwen",
            role,
            text,
            timestamp,
            sourcePath: file,
            vendorSessionId: sessionId,
            project: pathToProjectName(row.cwd),
          }),
        );
      }
    }
    return sortRawTurns(turns);
  },

  async parse(start, end) {
    const files = findChatFiles();
    if (files.length === 0) return [];

    const entries: NormalizedEntry[] = [];

    for (const file of files) {
      // Collect user/assistant messages first for user→assistant pairing.
      const msgs: QwenRow[] = [];
      for await (const row of streamJsonl<QwenRow>(file)) {
        if (row.type === "user" || row.type === "assistant") msgs.push(row);
      }

      const pairs: PairMessage[] = msgs.map((row) => ({
        role: row.type === "user" ? "user" : "assistant",
        text: rowText(row),
      }));

      for (let i = 0; i < msgs.length; i++) {
        const row = msgs[i];
        if (!row || row.type !== "user") continue;

        const ts = row.timestamp ? new Date(row.timestamp).getTime() : 0;
        if (!inWindow(ts, start, end)) continue;

        const text = rowText(row);
        if (!text) continue;

        const response = findResponse(pairs, i, "immediate");

        entries.push({
          tool: "qwen",
          timestamp: ts,
          project: pathToProjectName(row.cwd),
          prompt: text,
          response: response ? preview(response) : undefined,
          sessionId: row.sessionId || undefined,
          metadata: {
            gitBranch: row.gitBranch || undefined,
          },
        });
      }
    }

    return entries;
  },
});
