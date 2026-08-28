/**
 * markdown-records.ts
 *
 * Shared session-scoped record store used by findings-cache and session-cost.
 * One `.md` file per session under the project coordination store
 * (`.agents/state/memories/`, with a `.serena/memories/` legacy fallback):
 * YAML frontmatter header + one fenced JSON code block per record.
 *
 * Concurrency: append-only via appendFileSync (atomic on POSIX for small
 * writes); partially-written blocks are skipped on parse.
 */

import {
  appendFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  unlinkSync,
} from "node:fs";
import { dirname, join } from "node:path";
import { COORDINATION_STORE_REL, LEGACY_SERENA_MEMORY_REL } from "./memory.js";

/** Resolved store base relative to the working directory (canonical-first). */
export function coordinationBase(): string {
  return COORDINATION_STORE_REL;
}

/** @deprecated Use coordinationBase. */
export const memoriesBase = coordinationBase;

// Session IDs are safe filename components. Reject anything that could
// traverse out of MEMORIES_BASE or embed shell/path metacharacters. The
// orchestrator generates IDs like "session-20260423-141500"; 64-char
// alphanumeric + `_-.` is more than enough. Reject everything else.
export const SESSION_ID_PATTERN = /^[A-Za-z0-9._-]{1,64}$/;

export function assertSafeSessionId(sessionId: string): void {
  if (!SESSION_ID_PATTERN.test(sessionId)) {
    throw new Error(
      `Invalid sessionId ${JSON.stringify(sessionId)}. Must match ${SESSION_ID_PATTERN} (alphanumeric, dot, underscore, hyphen, up to 64 chars).`,
    );
  }
}

/** Read a file, returning "" when absent or unreadable. */
export function readFileContent(filePath: string): string {
  try {
    return readFileSync(filePath, "utf-8");
  } catch {
    return "";
  }
}

export interface MarkdownRecordStore<T> {
  /** Resolved per-session file path; throws on unsafe session ids. */
  filePath(sessionId: string): string;
  /** Append one record, creating the file with frontmatter on first write. */
  append(sessionId: string, record: T): void;
  /** All records for the session, in order of recording. */
  load(sessionId: string): T[];
  /** Parse records out of raw file content (for cross-session scans). */
  parse(content: string): T[];
  /** Delete the session file. Intended for tests. */
  remove(sessionId: string): void;
}

export function createMarkdownRecordStore<T>(options: {
  /** File name prefix, e.g. "findings" → `findings-{sessionId}.md`. */
  filePrefix: string;
  /** Heading written into the frontmatter block, e.g. "Findings". */
  title: string;
  /** Shape check applied to each parsed JSON block. */
  isRecordValid: (value: unknown) => boolean;
}): MarkdownRecordStore<T> {
  // All bases a session file may live in, resolved-base first, so records
  // written before the store moved to `.agents/state/memories` stay readable.
  const candidatePaths = (sessionId: string): string[] => {
    assertSafeSessionId(sessionId);
    const name = `${options.filePrefix}-${sessionId}.md`;
    const bases = [
      coordinationBase(),
      COORDINATION_STORE_REL,
      LEGACY_SERENA_MEMORY_REL,
    ];
    return [...new Set(bases)].map((base) => join(base, name));
  };

  const filePath = (sessionId: string): string => {
    assertSafeSessionId(sessionId);
    const candidates = candidatePaths(sessionId);
    return (
      candidates.find((path) => existsSync(path)) ??
      join(coordinationBase(), `${options.filePrefix}-${sessionId}.md`)
    );
  };

  const buildFrontmatter = (sessionId: string): string =>
    `---\nsession: ${sessionId}\ncreated: ${new Date().toISOString()}\n---\n\n# ${options.title}\n\n`;

  const parse = (content: string): T[] => {
    const records: T[] = [];
    for (const match of content.matchAll(/```json\n([\s\S]*?)\n```/g)) {
      const raw = match[1];
      if (!raw) continue;
      try {
        const record = JSON.parse(raw);
        if (options.isRecordValid(record)) records.push(record as T);
      } catch {
        // skip malformed blocks -- file may be partially written
      }
    }
    return records;
  };

  return {
    filePath,
    append(sessionId: string, record: T): void {
      assertSafeSessionId(sessionId);
      const target = join(
        coordinationBase(),
        `${options.filePrefix}-${sessionId}.md`,
      );
      const targetDir = dirname(target);
      if (!existsSync(targetDir)) {
        mkdirSync(targetDir, { recursive: true });
      }
      const block = `\`\`\`json\n${JSON.stringify(record)}\n\`\`\`\n\n`;
      const legacy = candidatePaths(sessionId).find(
        (candidate) => candidate !== target && existsSync(candidate),
      );
      const initial = legacy
        ? readFileContent(legacy)
        : buildFrontmatter(sessionId);
      appendFileSync(
        target,
        existsSync(target) ? block : initial + block,
        "utf-8",
      );
    },
    load(sessionId: string): T[] {
      const content = readFileContent(filePath(sessionId));
      return content ? parse(content) : [];
    },
    parse,
    remove(sessionId: string): void {
      for (const target of candidatePaths(sessionId)) {
        if (existsSync(target)) unlinkSync(target);
      }
    },
  };
}
