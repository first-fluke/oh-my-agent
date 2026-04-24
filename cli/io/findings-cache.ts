/**
 * findings-cache.ts
 *
 * Session-scoped shared findings cache for multi-agent sessions.
 * Allows agent B to reuse symbols/patterns/files already discovered by agent A,
 * cutting redundant tool calls and token usage.
 *
 * Storage: .serena/memories/findings-{sessionId}.md
 * Format: Markdown with YAML frontmatter + one JSON code block per record
 * Concurrency: append-only via appendFileSync (atomic on POSIX for small writes)
 */

import {
  appendFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  unlinkSync,
} from "node:fs";
import { join } from "node:path";

/** A single cached discovery made by an agent during a session. */
export interface FindingRecord {
  /** Identifier -- e.g. "ModelSpec" or "src/foo.ts:42" */
  symbol: string;
  /** Category of finding */
  kind: "symbol" | "pattern" | "file";
  /** JSON-serializable payload returned by the tool */
  result: unknown;
  /** ISO 8601 timestamp when the record was created */
  recordedAt: string;
  /** Which agent discovered it (optional) */
  agentId?: string;
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

const MEMORIES_BASE = ".serena/memories";

// See cli/io/session-cost.ts for the same pattern. sessionId must be a safe
// filename component so it cannot traverse out of MEMORIES_BASE.
const SESSION_ID_PATTERN = /^[A-Za-z0-9._-]{1,64}$/;

function assertSafeSessionId(sessionId: string): void {
  if (!SESSION_ID_PATTERN.test(sessionId)) {
    throw new Error(
      `Invalid sessionId ${JSON.stringify(sessionId)}. Must match ${SESSION_ID_PATTERN} (alphanumeric, dot, underscore, hyphen, up to 64 chars).`,
    );
  }
}

function findingsFilePath(sessionId: string): string {
  assertSafeSessionId(sessionId);
  return join(MEMORIES_BASE, `findings-${sessionId}.md`);
}

function buildFrontmatter(sessionId: string): string {
  return `---\nsession: ${sessionId}\ncreated: ${new Date().toISOString()}\n---\n\n# Findings\n\n`;
}

function serializeRecord(record: FindingRecord): string {
  let json: string;
  try {
    json = JSON.stringify(record);
  } catch (err) {
    throw new Error(
      `FindingsCache: result for symbol "${record.symbol}" is not JSON-serializable. ` +
        `Wrap the payload in a plain object before recording. Original error: ${String(err)}`,
    );
  }
  return `\`\`\`json\n${json}\n\`\`\`\n\n`;
}

function parseRecords(content: string): FindingRecord[] {
  const records: FindingRecord[] = [];
  const pattern = /```json\n([\s\S]*?)\n```/g;

  for (const match of content.matchAll(pattern)) {
    const raw = match[1];
    if (!raw) continue;
    try {
      const record = JSON.parse(raw) as FindingRecord;
      if (record && typeof record.symbol === "string" && record.kind) {
        records.push(record);
      }
    } catch {
      // skip malformed blocks -- file may be partially written
    }
  }

  return records;
}

function ensureMemoriesDir(): void {
  if (!existsSync(MEMORIES_BASE)) {
    mkdirSync(MEMORIES_BASE, { recursive: true });
  }
}

function readFileContent(filePath: string): string {
  try {
    return readFileSync(filePath, "utf-8");
  } catch {
    return "";
  }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Record a finding to the session's findings file.
 * Creates the file with YAML frontmatter on first write.
 * Uses appendFileSync for concurrent-safe (POSIX atomic) appends.
 *
 * @throws if record.result is not JSON-serializable
 */
export function recordFinding(sessionId: string, record: FindingRecord): void {
  ensureMemoriesDir();

  const filePath = findingsFilePath(sessionId);
  const block = serializeRecord(record);

  if (!existsSync(filePath)) {
    // First write: prepend the frontmatter header
    // appendFileSync creates the file if it does not exist
    appendFileSync(filePath, buildFrontmatter(sessionId) + block, "utf-8");
  } else {
    appendFileSync(filePath, block, "utf-8");
  }
}

/**
 * Look up an existing finding by symbol (and optionally kind).
 * Returns the most recently recorded matching record, or null if not found.
 */
export function lookupFinding(
  sessionId: string,
  symbol: string,
  kind?: FindingRecord["kind"],
): FindingRecord | null {
  const filePath = findingsFilePath(sessionId);
  const content = readFileContent(filePath);
  if (!content) return null;

  const records = parseRecords(content);
  const matches = records.filter(
    (r) => r.symbol === symbol && (kind === undefined || r.kind === kind),
  );

  return matches.length > 0 ? (matches[matches.length - 1] ?? null) : null;
}

/**
 * Return all findings recorded in the session, in order of recording.
 */
export function listFindings(sessionId: string): FindingRecord[] {
  const filePath = findingsFilePath(sessionId);
  const content = readFileContent(filePath);
  if (!content) return [];
  return parseRecords(content);
}

/**
 * Delete the session findings file entirely.
 * Intended for use in tests only -- production sessions should persist for debugging.
 */
export function clearSession(sessionId: string): void {
  const filePath = findingsFilePath(sessionId);
  if (existsSync(filePath)) {
    unlinkSync(filePath);
  }
}
