import { existsSync, readdirSync, readFileSync } from "node:fs";
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
  preview,
  sortRawTurns,
} from "../utils/history-parser.js";

const GEMINI_BASE = join(homedir(), ".gemini", "tmp");

function findSessionFiles(): Array<{ path: string; project: string }> {
  if (!existsSync(GEMINI_BASE)) return [];

  const files: Array<{ path: string; project: string }> = [];
  try {
    for (const projectDir of readdirSync(GEMINI_BASE)) {
      const chatsDir = join(GEMINI_BASE, projectDir, "chats");
      if (!existsSync(chatsDir)) continue;
      for (const file of readdirSync(chatsDir)) {
        if (file.startsWith("session-") && file.endsWith(".json")) {
          files.push({ path: join(chatsDir, file), project: projectDir });
        }
      }
    }
  } catch {
    // ignore permission errors
  }
  return files;
}

function rawRole(msg: GeminiMessage): "user" | "assistant" | null {
  if (msg.type === "user") return "user";
  if (msg.type === "gemini") return "assistant";
  return null;
}

interface GeminiMessage {
  type?: string;
  timestamp?: string;
  content?: Array<{ text?: string }>;
  model?: string;
}

function messageText(msg: GeminiMessage): string {
  return (msg.content || [])
    .map((p) => p.text || "")
    .filter(Boolean)
    .join(" ");
}

function toPairMessage(msg: GeminiMessage): PairMessage {
  if (msg.type === "user") return { role: "user", text: messageText(msg) };
  if (msg.type === "gemini") {
    return { role: "assistant", text: messageText(msg) };
  }
  return { role: "other", text: "" };
}

registerParser({
  name: "gemini",

  async detect() {
    return existsSync(GEMINI_BASE);
  },

  async parseRaw(start, end) {
    const turns: MemoryRawTurn[] = [];
    for (const { path: file, project } of findSessionFiles()) {
      try {
        const data = JSON.parse(readFileSync(file, "utf-8"));
        const sessionId = data.sessionId || file;
        const messages: GeminiMessage[] = data.messages || [];
        for (const msg of messages) {
          const role = rawRole(msg);
          if (!role) continue;

          const timestamp = parseTimestampMs(msg.timestamp);
          if (!inWindow(timestamp, start, end)) continue;

          const text = messageText(msg).trim();
          if (!text) continue;

          turns.push(
            createRawTurn({
              vendor: "gemini",
              role,
              text,
              timestamp,
              sourcePath: file,
              vendorSessionId: sessionId,
              project,
            }),
          );
        }
      } catch {
        // skip unreadable sessions
      }
    }
    return sortRawTurns(turns);
  },

  async parse(start, end) {
    const files = findSessionFiles();
    if (files.length === 0) return [];

    const entries: NormalizedEntry[] = [];

    for (const { path: file, project } of files) {
      try {
        const data = JSON.parse(readFileSync(file, "utf-8"));
        const sessionId = data.sessionId || undefined;
        const messages: GeminiMessage[] = data.messages || [];
        const pairs = messages.map(toPairMessage);

        for (let i = 0; i < messages.length; i++) {
          const msg = messages[i];
          if (msg?.type !== "user") continue;

          const ts = msg.timestamp ? new Date(msg.timestamp).getTime() : 0;
          if (!inWindow(ts, start, end)) continue;

          const text = messageText(msg);
          if (!text) continue;

          const response = findResponse(pairs, i, "immediate");

          entries.push({
            tool: "gemini",
            timestamp: ts,
            project,
            prompt: text,
            response: response ? preview(response) : undefined,
            sessionId,
            metadata: msg.model ? { model: msg.model } : undefined,
          });
        }
      } catch {
        // skip unreadable sessions
      }
    }

    return entries;
  },
});
