import { existsSync, readdirSync, statSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { registerParser } from "../registry.js";
import type { NormalizedEntry } from "../schema.js";
import {
  inWindow,
  pathToProjectName,
  preview,
  readJsonlSync,
  streamJsonl,
} from "../utils/history-parser.js";

const GROK_SESSIONS = join(homedir(), ".grok", "sessions");

/** Decode a percent-encoded workspace path (e.g. %2FUsers%2Ffoo%2Fbar) */
function decodeWorkspacePath(encoded: string): string {
  try {
    return decodeURIComponent(encoded);
  } catch {
    return encoded;
  }
}

/**
 * Grok stores per-workspace prompt history in:
 *   ~/.grok/sessions/<url-encoded-workspace>/prompt_history.jsonl
 *
 * Each line: { timestamp, session_id, prompt, is_bash? }
 *
 * Responses are best-effort from chat_history.jsonl inside per-session
 * subdirectories when available.
 */
registerParser({
  name: "grok",

  async detect() {
    return existsSync(GROK_SESSIONS);
  },

  async parse(start, end) {
    if (!existsSync(GROK_SESSIONS)) return [];

    const entries: NormalizedEntry[] = [];

    let workspaceDirs: string[];
    try {
      workspaceDirs = readdirSync(GROK_SESSIONS).filter((d) => {
        const full = join(GROK_SESSIONS, d);
        try {
          const st = statSync(full);
          if (!st.isDirectory()) return false;
        } catch {
          return false;
        }
        // Each workspace dir contains prompt_history.jsonl or session subdirs
        if (existsSync(join(full, "prompt_history.jsonl"))) return true;
        try {
          return readdirSync(full).some((f) => f.endsWith(".jsonl"));
        } catch {
          return false;
        }
      });
    } catch {
      return [];
    }

    for (const encodedDir of workspaceDirs) {
      const workspacePath = decodeWorkspacePath(encodedDir);
      const project = pathToProjectName(workspacePath) || workspacePath;

      const workspaceDir = join(GROK_SESSIONS, encodedDir);
      const promptHistory = join(workspaceDir, "prompt_history.jsonl");

      if (!existsSync(promptHistory)) continue;

      // Primary source: clean prompt_history.jsonl
      for await (const row of streamJsonl<{
        timestamp?: string;
        session_id?: string;
        prompt?: string;
        is_bash?: boolean;
      }>(promptHistory)) {
        if (!row.prompt || row.is_bash) continue;

        const ts = row.timestamp ? Date.parse(row.timestamp) : NaN;
        if (!Number.isFinite(ts) || !inWindow(ts, start, end)) continue;

        entries.push({
          tool: "grok",
          timestamp: ts,
          project,
          prompt: row.prompt,
          sessionId: row.session_id,
        });
      }

      // Best-effort responses from per-session chat_history.jsonl
      try {
        for (const entry of readdirSync(workspaceDir)) {
          const sessionDir = join(workspaceDir, entry);
          const chatHistory = join(sessionDir, "chat_history.jsonl");
          if (!existsSync(chatHistory)) continue;

          // Simple heuristic: collect user messages and immediately following assistant text
          const rows = readJsonlSync<{
            role?: string | null;
            type?: string;
            content?: Array<{ type?: string; text?: string }> | string;
            timestamp?: string;
          }>(chatHistory);

          const messages: Array<{
            role: "user" | "assistant";
            text: string;
            ts?: number;
          }> = [];

          for (const r of rows) {
            const role =
              r.role ||
              (r.type === "user"
                ? "user"
                : r.type === "assistant"
                  ? "assistant"
                  : null);
            if (!role) continue;

            let text = "";
            if (typeof r.content === "string") {
              text = r.content;
            } else if (Array.isArray(r.content)) {
              text = r.content
                .map((c) => (c?.type === "text" ? c.text || "" : ""))
                .join("\n")
                .trim();
            }

            if (text) {
              messages.push({
                role: role as "user" | "assistant",
                text: preview(text),
                ts: r.timestamp ? Date.parse(r.timestamp) : undefined,
              });
            }
          }

          // Pair user → next assistant for entries we already collected in this workspace
          for (let i = 0; i < messages.length - 1; i++) {
            const curr = messages[i];
            if (!curr || curr.role !== "user") continue;
            const next = messages[i + 1];
            if (next && next.role === "assistant") {
              // Find matching entry by prompt prefix (cheap)
              const prefix = curr.text.slice(0, 80);
              const match = entries.find(
                (e) =>
                  e.project === project &&
                  e.prompt.slice(0, 80) === prefix &&
                  !e.response,
              );
              if (match) {
                match.response = next.text;
              }
            }
          }
        }
      } catch {
        // best-effort only
      }
    }

    return entries;
  },
});
