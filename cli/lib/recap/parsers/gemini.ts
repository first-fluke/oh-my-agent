import { existsSync, readdirSync, readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { registerParser } from "../registry.js";
import type { NormalizedEntry } from "../schema.js";

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

registerParser({
  name: "gemini",

  async detect() {
    return existsSync(GEMINI_BASE);
  },

  async parse(start, end) {
    const files = findSessionFiles();
    if (files.length === 0) return [];

    const entries: NormalizedEntry[] = [];

    for (const { path: file, project } of files) {
      try {
        const data = JSON.parse(readFileSync(file, "utf-8"));
        const sessionId = data.sessionId || undefined;
        const messages = data.messages || [];

        for (let i = 0; i < messages.length; i++) {
          const msg = messages[i];
          if (msg.type !== "user") continue;

          const ts = msg.timestamp ? new Date(msg.timestamp).getTime() : 0;
          if (Number.isNaN(ts) || ts < start || ts >= end) continue;

          const parts = msg.content || [];
          const text = parts
            .map((p: { text?: string }) => p.text || "")
            .filter(Boolean)
            .join(" ");
          if (!text) continue;

          // Grab next gemini response
          let response: string | undefined;
          const next = messages[i + 1];
          if (next?.type === "gemini") {
            const rParts = next.content || [];
            const rText = rParts
              .map((p: { text?: string }) => p.text || "")
              .filter(Boolean)
              .join(" ");
            if (rText) response = rText.slice(0, 200);
          }

          entries.push({
            tool: "gemini",
            timestamp: ts,
            project,
            prompt: text,
            response,
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
