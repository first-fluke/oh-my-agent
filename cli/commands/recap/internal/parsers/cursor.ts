import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { registerParser } from "../registry.js";
import type { NormalizedEntry } from "../schema.js";

const CURSOR_CHATS = join(homedir(), ".cursor", "chats");
const CURSOR_PROJECTS = join(homedir(), ".cursor", "projects");

type CursorMeta = {
  name?: string;
  createdAt?: number;
  lastUsedModel?: string;
};

type CursorMessage = {
  role: string;
  content: string;
};

type CursorStoreSnapshot = {
  meta: CursorMeta;
  messages: CursorMessage[];
  workspacePath?: string;
  chatHash?: string;
};

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

function decodeBlobData(data: unknown): string | null {
  if (data == null) return null;
  if (typeof data === "string") return data;
  if (Buffer.isBuffer(data)) return data.toString("utf-8");
  if (data instanceof Uint8Array) return Buffer.from(data).toString("utf-8");
  return null;
}

export function extractMessageContent(content: unknown): string | null {
  if (typeof content === "string") return content;
  if (!Array.isArray(content)) return null;

  const parts = content
    .map((part) => {
      if (typeof part !== "object" || part == null) return "";
      const record = part as { type?: string; text?: unknown };
      if (record.type === "text" && typeof record.text === "string") {
        return record.text;
      }
      return "";
    })
    .filter(Boolean);

  return parts.length > 0 ? parts.join("\n") : null;
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

function hasSqlite3Cli(): boolean {
  const result = spawnSync("sqlite3", ["-version"], {
    encoding: "utf-8",
    stdio: ["ignore", "pipe", "ignore"],
  });
  return result.status === 0;
}

function readStoreViaSqlite3Cli(dbPath: string): CursorStoreSnapshot | null {
  const metaResult = spawnSync(
    "sqlite3",
    [dbPath, "SELECT value FROM meta WHERE key = '0';"],
    { encoding: "utf-8", stdio: ["ignore", "pipe", "ignore"] },
  );
  if (metaResult.status !== 0 || !metaResult.stdout.trim()) return null;

  const meta = decodeMetaValue(metaResult.stdout);
  if (!meta) return null;

  const blobResult = spawnSync(
    "sqlite3",
    ["-json", dbPath, "SELECT hex(data) AS data_hex FROM blobs;"],
    { encoding: "utf-8", stdio: ["ignore", "pipe", "ignore"] },
  );
  if (blobResult.status !== 0) {
    return {
      meta,
      messages: [],
      chatHash: chatHashFromDbPath(dbPath),
    };
  }

  const rows = blobResult.stdout.trim()
    ? (JSON.parse(blobResult.stdout) as Array<{ data_hex?: string }>)
    : [];

  return {
    meta,
    messages: messagesFromBlobRows(rows),
    workspacePath: workspacePathFromBlobRows(rows) ?? undefined,
    chatHash: chatHashFromDbPath(dbPath),
  };
}

function canReadCursorStores(): boolean {
  const [firstDb] = findStoreDBs();
  if (!firstDb || !hasSqlite3Cli()) return false;
  return readStoreViaSqlite3Cli(firstDb) !== null;
}

type AgentTranscriptFile = {
  filePath: string;
  projectSlug: string;
  sessionId: string;
};

function findAgentTranscriptFiles(): AgentTranscriptFile[] {
  if (!existsSync(CURSOR_PROJECTS)) return [];

  const files: AgentTranscriptFile[] = [];
  try {
    for (const projectSlug of readdirSync(CURSOR_PROJECTS)) {
      const transcriptsDir = join(
        CURSOR_PROJECTS,
        projectSlug,
        "agent-transcripts",
      );
      if (!existsSync(transcriptsDir)) continue;

      try {
        for (const sessionId of readdirSync(transcriptsDir)) {
          const filePath = join(
            transcriptsDir,
            sessionId,
            `${sessionId}.jsonl`,
          );
          if (existsSync(filePath)) {
            files.push({ filePath, projectSlug, sessionId });
          }
        }
      } catch {
        // skip unreadable project dirs
      }
    }
  } catch {
    // ignore permission errors
  }

  return files;
}

export function projectSlugToName(slug: string): string {
  const documentsMatch = slug.match(/^Users-[^-]+-Documents-(.+)$/);
  if (documentsMatch?.[1]) return documentsMatch[1];

  const tmpMatch = slug.match(/^private-tmp-(.+)$/);
  if (tmpMatch?.[1]) return tmpMatch[1];

  const privateMatch = slug.match(/^private-(.+)$/);
  if (privateMatch?.[1]) return privateMatch[1];

  const parts = slug.split("-");
  return parts[parts.length - 1] ?? slug;
}

export function projectSlugToPath(slug: string): string | null {
  const documentsMatch = slug.match(/^Users-([^-]+)-Documents-(.+)$/);
  if (documentsMatch?.[1] && documentsMatch[2]) {
    return `/Users/${documentsMatch[1]}/Documents/${documentsMatch[2]}`;
  }

  const tmpMatch = slug.match(/^private-tmp-(.+)$/);
  if (tmpMatch?.[1]) return `/private/tmp/${tmpMatch[1]}`;

  const privateMatch = slug.match(/^private-(.+)$/);
  if (privateMatch?.[1]) return `/private/${privateMatch[1]}`;

  return null;
}

export function workspacePathToProjectName(workspacePath: string): string {
  const parts = workspacePath.split("/").filter(Boolean);
  return parts[parts.length - 1] ?? workspacePath;
}

function buildChatHashProjectMap(): Map<string, string> {
  const map = new Map<string, string>();
  if (!existsSync(CURSOR_PROJECTS)) return map;

  try {
    for (const slug of readdirSync(CURSOR_PROJECTS)) {
      const path = projectSlugToPath(slug);
      if (!path) continue;
      const hash = createHash("md5").update(path).digest("hex");
      map.set(hash, projectSlugToName(slug));
    }
  } catch {
    // ignore permission errors
  }

  return map;
}

function resolveStoreProject(
  store: CursorStoreSnapshot,
  hashProjectMap: Map<string, string>,
): string | undefined {
  if (store.workspacePath) {
    return workspacePathToProjectName(store.workspacePath);
  }
  if (store.chatHash) {
    return hashProjectMap.get(store.chatHash);
  }
  return store.meta.name || undefined;
}

export function extractUserPrompt(content: string): string | null {
  const match = content.match(/<user_query>\s*([\s\S]*?)\s*<\/user_query>/i);
  const raw = (match?.[1] ?? content).trim();
  if (!raw || raw.startsWith("<user_info>")) return null;
  return raw;
}

function normalizePromptKey(prompt: string): string {
  return prompt.trim().replace(/\s+/g, " ").toLowerCase();
}

function dedupeCursorEntries(entries: NormalizedEntry[]): NormalizedEntry[] {
  const seen = new Map<string, NormalizedEntry>();

  for (const entry of entries) {
    const key = `${entry.project ?? ""}|${normalizePromptKey(entry.prompt)}`;
    const existing = seen.get(key);
    if (!existing) {
      seen.set(key, entry);
      continue;
    }

    const preferNew =
      (!existing.sessionId && entry.sessionId) ||
      (entry.response?.length ?? 0) > (existing.response?.length ?? 0) ||
      entry.timestamp > existing.timestamp;

    if (preferNew) {
      seen.set(key, entry);
    }
  }

  return [...seen.values()].sort((a, b) => a.timestamp - b.timestamp);
}

function entriesFromAgentTranscript(
  file: AgentTranscriptFile,
  start: number,
  end: number,
): NormalizedEntry[] {
  const stat = statSync(file.filePath);
  const birthMs = stat.birthtimeMs > 0 ? stat.birthtimeMs : stat.ctimeMs;
  const endMs = stat.mtimeMs;
  const project = projectSlugToName(file.projectSlug);

  const messages: CursorMessage[] = [];
  for (const line of readFileSync(file.filePath, "utf-8").split("\n")) {
    if (!line.trim()) continue;
    try {
      const row = JSON.parse(line) as {
        role?: string;
        message?: { content?: unknown };
      };
      if (row.role !== "user" && row.role !== "assistant") continue;
      const content = extractMessageContent(row.message?.content);
      if (content) {
        messages.push({ role: row.role, content });
      }
    } catch {
      // skip malformed lines
    }
  }

  const userOrdinals = messages
    .map((msg, index) => (msg.role === "user" ? index : -1))
    .filter((index) => index >= 0);

  const entries: NormalizedEntry[] = [];
  let userIndex = 0;

  for (let i = 0; i < messages.length; i++) {
    const msg = messages[i];
    if (!msg || msg.role !== "user") continue;

    const prompt = extractUserPrompt(msg.content);
    if (!prompt) continue;

    const timestamp =
      userOrdinals.length <= 1
        ? endMs
        : birthMs + ((endMs - birthMs) * userIndex) / (userOrdinals.length - 1);
    userIndex++;

    if (timestamp < start || timestamp >= end) continue;

    let response: string | undefined;
    for (let j = i + 1; j < messages.length; j++) {
      const next = messages[j];
      if (!next) continue;
      if (next.role === "user") break;
      if (next.role === "assistant" && next.content.trim()) {
        response = next.content.slice(0, 200);
        break;
      }
    }

    entries.push({
      tool: "cursor",
      timestamp: Math.round(timestamp),
      project,
      prompt: prompt.length > 500 ? `${prompt.slice(0, 500)}...` : prompt,
      response,
      sessionId: file.sessionId,
    });
  }

  return entries;
}

function entriesFromStore(
  store: CursorStoreSnapshot,
  start: number,
  end: number,
  hashProjectMap: Map<string, string>,
): NormalizedEntry[] {
  const createdAt = store.meta.createdAt ?? 0;
  if (createdAt < start || createdAt >= end) return [];

  const project = resolveStoreProject(store, hashProjectMap);
  const entries: NormalizedEntry[] = [];
  for (let i = 0; i < store.messages.length; i++) {
    const msg = store.messages[i];
    if (!msg || msg.role !== "user") continue;

    const prompt = extractUserPrompt(msg.content);
    if (!prompt) continue;

    let response: string | undefined;
    const next = store.messages[i + 1];
    if (next?.role === "assistant" && next.content) {
      response = next.content.slice(0, 200);
    }

    entries.push({
      tool: "cursor",
      timestamp: createdAt,
      project,
      prompt: prompt.length > 500 ? `${prompt.slice(0, 500)}...` : prompt,
      response,
      metadata: store.meta.lastUsedModel
        ? { model: store.meta.lastUsedModel }
        : undefined,
    });
  }

  return entries;
}

registerParser({
  name: "cursor",

  async detect() {
    if (findAgentTranscriptFiles().length > 0) return true;
    if (!existsSync(CURSOR_CHATS)) return false;
    return canReadCursorStores();
  },

  async parse(start, end) {
    const entries: NormalizedEntry[] = [];
    const hashProjectMap = buildChatHashProjectMap();

    for (const file of findAgentTranscriptFiles()) {
      try {
        entries.push(...entriesFromAgentTranscript(file, start, end));
      } catch {
        // skip unreadable transcripts
      }
    }

    if (hasSqlite3Cli()) {
      for (const dbPath of findStoreDBs()) {
        try {
          const store = readStoreViaSqlite3Cli(dbPath);
          if (!store) continue;
          entries.push(...entriesFromStore(store, start, end, hashProjectMap));
        } catch {
          // skip unreadable databases
        }
      }
    }

    return dedupeCursorEntries(entries);
  },
});

export {
  findAgentTranscriptFiles,
  findStoreDBs,
  hasSqlite3Cli,
  readStoreViaSqlite3Cli,
};
