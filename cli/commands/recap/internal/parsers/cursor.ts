import { existsSync, readdirSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { registerParser } from "../registry.js";
import type { NormalizedEntry } from "../schema.js";

const CURSOR_CHATS = join(homedir(), ".cursor", "chats");

function findStoreDBs(): string[] {
  if (!existsSync(CURSOR_CHATS)) return [];

  const files: string[] = [];
  try {
    for (const hashDir of readdirSync(CURSOR_CHATS)) {
      const hashPath = join(CURSOR_CHATS, hashDir);
      try {
        for (const sessionDir of readdirSync(hashPath)) {
          const dbPath = join(hashPath, sessionDir, "store.db");
          if (existsSync(dbPath)) {
            files.push(dbPath);
          }
        }
      } catch {
        // skip non-directories
      }
    }
  } catch {
    // ignore permission errors
  }
  return files;
}

let Database: typeof import("better-sqlite3") | null = null;

async function loadSqlite() {
  if (Database) return Database;
  try {
    Database = (await import("better-sqlite3")).default;
    return Database;
  } catch {
    return null;
  }
}

registerParser({
  name: "cursor",

  async detect() {
    if (!existsSync(CURSOR_CHATS)) return false;
    const sqlite = await loadSqlite();
    return sqlite !== null;
  },

  async parse(start, end) {
    const sqlite = await loadSqlite();
    if (!sqlite) return [];

    const dbFiles = findStoreDBs();
    if (dbFiles.length === 0) return [];

    const entries: NormalizedEntry[] = [];

    for (const dbPath of dbFiles) {
      try {
        const db = new sqlite(dbPath, { readonly: true });

        // Read session metadata from meta table
        const metaRow = db
          .prepare("SELECT value FROM meta WHERE key = ?")
          .get("0") as { value: string } | undefined;

        if (!metaRow) {
          db.close();
          continue;
        }

        let meta: { name?: string; createdAt?: number; lastUsedModel?: string };
        try {
          const decoded = Buffer.from(metaRow.value, "hex").toString("utf-8");
          meta = JSON.parse(decoded);
        } catch {
          db.close();
          continue;
        }

        const createdAt = meta.createdAt ?? 0;
        if (createdAt < start || createdAt >= end) {
          db.close();
          continue;
        }

        // Extract all messages from blobs, preserving order
        const blobs = db.prepare("SELECT id, data FROM blobs").all() as Array<{
          id: string;
          data: Buffer;
        }>;

        const messages: Array<{ role: string; content: string }> = [];
        for (const blob of blobs) {
          try {
            const text =
              typeof blob.data === "string"
                ? blob.data
                : Buffer.from(blob.data).toString("utf-8");
            const msg = JSON.parse(text);
            if (msg.role && typeof msg.content === "string") {
              messages.push({ role: msg.role, content: msg.content });
            }
          } catch {
            // skip
          }
        }

        for (let i = 0; i < messages.length; i++) {
          const msg = messages[i];
          if (!msg) continue;
          if (msg.role !== "user") continue;

          const content = msg.content;
          if (!content) continue;

          // Skip system-injected content
          if (content.startsWith("<user_info>")) continue;

          // Grab next assistant response
          let response: string | undefined;
          const next = messages[i + 1];
          if (next?.role === "assistant" && next.content) {
            response = next.content.slice(0, 200);
          }

          entries.push({
            tool: "cursor",
            timestamp: createdAt,
            project: meta.name || undefined,
            prompt:
              content.length > 500 ? `${content.slice(0, 500)}...` : content,
            response,
            metadata: meta.lastUsedModel
              ? { model: meta.lastUsedModel }
              : undefined,
          });
        }

        db.close();
      } catch {
        // skip unreadable databases
      }
    }

    return entries;
  },
});
