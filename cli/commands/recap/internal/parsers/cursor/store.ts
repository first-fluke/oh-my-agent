import { spawnSync } from "node:child_process";
import { existsSync, readdirSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { type CursorMessage, extractMessageContent } from "./messages.js";

const CURSOR_CHATS = join(homedir(), ".cursor", "chats");

export type CursorMeta = {
  name?: string;
  createdAt?: number;
  lastUsedModel?: string;
};

export type CursorStoreSnapshot = {
  meta: CursorMeta;
  messages: CursorMessage[];
  workspacePath?: string;
  chatHash?: string;
};

export function findStoreDBs(): string[] {
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

function decodeBlobData(data: unknown): string | null {
  if (data == null) return null;
  if (typeof data === "string") return data;
  if (Buffer.isBuffer(data)) return data.toString("utf-8");
  if (data instanceof Uint8Array) return Buffer.from(data).toString("utf-8");
  return null;
}

function parseJsonBlob(text: string): CursorMessage | null {
  if (!text.startsWith("{")) return null;
  try {
    const msg = JSON.parse(text) as { role?: string; content?: unknown };
    const content = extractMessageContent(msg.content);
    if (msg.role && content) {
      return { role: msg.role, content };
    }
  } catch {
    // skip non-JSON blobs
  }
  return null;
}

function decodeMetaValue(raw: string): CursorMeta | null {
  try {
    const decoded = Buffer.from(raw.trim(), "hex").toString("utf-8");
    return JSON.parse(decoded) as CursorMeta;
  } catch {
    return null;
  }
}

function workspacePathFromBlobText(text: string): string | null {
  const match = text.match(/Workspace Path:\s*((?:\/[^\s\n<\\]+)+)/);
  return match?.[1]?.trim() || null;
}

function workspacePathFromBlobRows(
  rows: Array<{ data_hex?: string }>,
): string | null {
  for (const row of rows) {
    if (typeof row.data_hex !== "string") continue;
    const text = decodeBlobData(Buffer.from(row.data_hex, "hex"));
    if (!text) continue;
    const workspacePath = workspacePathFromBlobText(text);
    if (workspacePath) return workspacePath;
  }
  return null;
}

function chatHashFromDbPath(dbPath: string): string | undefined {
  const parts = dbPath.split(/[/\\]/);
  const chatsIndex = parts.lastIndexOf("chats");
  if (chatsIndex >= 0 && parts[chatsIndex + 1]) {
    return parts[chatsIndex + 1];
  }
  return undefined;
}

function messagesFromBlobRows(
  rows: Array<{ data_hex?: string }>,
): CursorMessage[] {
  const messages: CursorMessage[] = [];
  for (const row of rows) {
    if (typeof row.data_hex !== "string") continue;
    const text = decodeBlobData(Buffer.from(row.data_hex, "hex"));
    if (!text) continue;
    const message = parseJsonBlob(text);
    if (message) messages.push(message);
  }
  return messages;
}

export function hasSqlite3Cli(): boolean {
  const result = spawnSync("sqlite3", ["-version"], {
    encoding: "utf-8",
    stdio: ["ignore", "pipe", "ignore"],
  });
  return result.status === 0;
}

const SQLITE_BUSY_TIMEOUT_MS = 5000;

function isLockError(stderr: string): boolean {
  return /database is locked|database is busy|is locked|SQLITE_BUSY|SQLITE_LOCKED/i.test(
    stderr,
  );
}

// D68: open Cursor's store.db read-only with a busy timeout so a running Cursor
// never blocks or corrupts the read, and a held lock is surfaced (not silently
// treated as empty).
function runSqliteReadonly(
  dbPath: string,
  sql: string,
  json = false,
): { ok: boolean; stdout: string; locked: boolean } {
  const args = [
    ...(json ? ["-json"] : []),
    "-readonly",
    "-cmd",
    `.timeout ${SQLITE_BUSY_TIMEOUT_MS}`,
    dbPath,
    sql,
  ];
  const result = spawnSync("sqlite3", args, {
    encoding: "utf-8",
    stdio: ["ignore", "pipe", "pipe"],
  });
  const stderr = typeof result.stderr === "string" ? result.stderr : "";
  return {
    ok: result.status === 0,
    stdout: result.stdout ?? "",
    locked: isLockError(stderr),
  };
}

type CursorStoreReadResult =
  | { status: "ok"; store: CursorStoreSnapshot }
  | { status: "locked" }
  | { status: "error" };

function readStore(dbPath: string): CursorStoreReadResult {
  const metaRun = runSqliteReadonly(
    dbPath,
    "SELECT value FROM meta WHERE key = '0';",
  );
  if (metaRun.locked) return { status: "locked" };
  if (!metaRun.ok || !metaRun.stdout.trim()) return { status: "error" };

  const meta = decodeMetaValue(metaRun.stdout);
  if (!meta) return { status: "error" };

  const blobRun = runSqliteReadonly(
    dbPath,
    "SELECT hex(data) AS data_hex FROM blobs;",
    true,
  );
  if (blobRun.locked) return { status: "locked" };
  if (!blobRun.ok) {
    return {
      status: "ok",
      store: { meta, messages: [], chatHash: chatHashFromDbPath(dbPath) },
    };
  }

  const rows = blobRun.stdout.trim()
    ? (JSON.parse(blobRun.stdout) as Array<{ data_hex?: string }>)
    : [];

  return {
    status: "ok",
    store: {
      meta,
      messages: messagesFromBlobRows(rows),
      workspacePath: workspacePathFromBlobRows(rows) ?? undefined,
      chatHash: chatHashFromDbPath(dbPath),
    },
  };
}

export function readStoreViaSqlite3Cli(
  dbPath: string,
): CursorStoreSnapshot | null {
  const result = readStore(dbPath);
  return result.status === "ok" ? result.store : null;
}

export interface CursorStoreReadSummary {
  stores: CursorStoreSnapshot[];
  total: number;
  locked: number;
}

export function readCursorStores(): CursorStoreReadSummary {
  const dbs = findStoreDBs();
  const stores: CursorStoreSnapshot[] = [];
  let locked = 0;
  if (dbs.length === 0 || !hasSqlite3Cli()) {
    return { stores, total: dbs.length, locked };
  }
  for (const dbPath of dbs) {
    const result = readStore(dbPath);
    if (result.status === "ok") stores.push(result.store);
    else if (result.status === "locked") locked += 1;
  }
  return { stores, total: dbs.length, locked };
}

// Cheap lock probe for the raw-import path (only the meta query is run).
export function probeCursorStoreLocks(): { total: number; locked: number } {
  const dbs = findStoreDBs();
  if (dbs.length === 0 || !hasSqlite3Cli()) {
    return { total: dbs.length, locked: 0 };
  }
  let locked = 0;
  for (const dbPath of dbs) {
    const run = runSqliteReadonly(
      dbPath,
      "SELECT value FROM meta WHERE key = '0';",
    );
    if (run.locked) locked += 1;
  }
  return { total: dbs.length, locked };
}

export function canReadCursorStores(): boolean {
  const [firstDb] = findStoreDBs();
  if (!firstDb || !hasSqlite3Cli()) return false;
  return readStore(firstDb).status === "ok";
}

export { CURSOR_CHATS };
