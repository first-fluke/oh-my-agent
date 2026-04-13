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
      // Collect all messages first for user→assistant pairing
      const allMsgs: Array<{ type: string; row: Record<string, unknown> }> = [];
      const rl = createInterface({
        input: createReadStream(file),
        crlfDelay: Number.POSITIVE_INFINITY,
      });

      for await (const line of rl) {
        if (!line.trim()) continue;
        try {
          const row = JSON.parse(line);
          if (row.type === "user" || row.type === "assistant") {
            allMsgs.push({ type: row.type, row });
          }
        } catch {
          // skip
        }
      }

      for (let i = 0; i < allMsgs.length; i++) {
        const { type, row } = allMsgs[i];
        if (type !== "user") continue;

        const ts = (row as { timestamp?: string }).timestamp
          ? new Date((row as { timestamp: string }).timestamp).getTime()
          : 0;
        if (Number.isNaN(ts) || ts < start || ts >= end) continue;

        const parts =
          (row as { message?: { parts?: Array<{ text?: string }> } }).message
            ?.parts || [];
        const text = parts
          .map((p) => p.text || "")
          .filter(Boolean)
          .join(" ");
        if (!text) continue;

        const project =
          (row as { cwd?: string }).cwd?.split("/").pop() || undefined;

        // Grab next assistant response
        let response: string | undefined;
        const next = allMsgs[i + 1];
        if (next?.type === "assistant") {
          const rParts =
            (
              next.row as {
                message?: { parts?: Array<{ text?: string }> };
              }
            ).message?.parts || [];
          const rText = rParts
            .map((p) => p.text || "")
            .filter(Boolean)
            .join(" ");
          if (rText) response = rText.slice(0, 200);
        }

        entries.push({
          tool: "qwen",
          timestamp: ts,
          project,
          prompt: text,
          response,
          sessionId: (row as { sessionId?: string }).sessionId || undefined,
          metadata: {
            gitBranch: (row as { gitBranch?: string }).gitBranch || undefined,
          },
        });
      }
    }

    return entries;
  },
});
