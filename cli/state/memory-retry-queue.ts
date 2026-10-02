import { createHash } from "node:crypto";
import {
  closeSync,
  existsSync,
  fstatSync,
  fsyncSync,
  mkdirSync,
  openSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { createRequire } from "node:module";
import { dirname } from "node:path";
import { setTimeout } from "node:timers/promises";
import { retryObservePath } from "./events.js";

export interface MemoryRetryLine {
  line: string;
  file: string;
  offset: number;
  hash: string;
}

function acknowledgementPath(projectDir: string): string {
  return `${retryObservePath(projectDir)}.ack.jsonl`;
}

function lineKey(
  line: Pick<MemoryRetryLine, "file" | "offset" | "hash">,
): string {
  return `${line.file}:${line.offset}:${line.hash}`;
}

function readAcknowledgements(projectDir: string): Set<string> {
  const path = acknowledgementPath(projectDir);
  if (!existsSync(path)) return new Set();
  const acknowledged = new Set<string>();
  for (const line of readFileSync(path, "utf-8").split("\n")) {
    try {
      const entry = JSON.parse(line) as Partial<MemoryRetryLine> | null;
      if (
        entry &&
        typeof entry.file === "string" &&
        typeof entry.offset === "number" &&
        Number.isSafeInteger(entry.offset) &&
        entry.offset >= 0 &&
        typeof entry.hash === "string"
      ) {
        acknowledged.add(lineKey(entry as MemoryRetryLine));
      }
    } catch {
      // An interrupted checkpoint write can cause a retry, never data loss.
    }
  }
  return acknowledged;
}

export function readMemoryRetryQueue(projectDir: string): MemoryRetryLine[] {
  const path = retryObservePath(projectDir);
  if (!existsSync(path)) return [];
  let fd: number;
  try {
    fd = openSync(path, "r");
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return [];
    throw error;
  }
  let content: Buffer;
  let file: string;
  try {
    const stat = fstatSync(fd);
    file = `${stat.dev}:${stat.ino}:${stat.birthtimeMs}`;
    content = readFileSync(fd);
  } finally {
    closeSync(fd);
  }

  const acknowledged = readAcknowledgements(projectDir);
  const pending: MemoryRetryLine[] = [];
  let offset = 0;
  while (offset < content.length) {
    const newline = content.indexOf(10, offset);
    const end = newline < 0 ? content.length : newline;
    const bytes = content.subarray(offset, end);
    const line = bytes.toString("utf-8");
    if (line.trim()) {
      const entry = {
        line,
        file,
        offset,
        hash: createHash("sha256").update(bytes).digest("hex"),
      };
      if (!acknowledged.has(lineKey(entry))) pending.push(entry);
    }
    offset = end + 1;
  }
  return pending;
}

export function acknowledgeMemoryRetryLine(
  projectDir: string,
  { file, offset, hash }: MemoryRetryLine,
): void {
  const fd = openSync(acknowledgementPath(projectDir), "a", 0o600);
  try {
    // The leading newline separates this entry from an interrupted write.
    writeFileSync(fd, `\n${JSON.stringify({ file, offset, hash })}\n`, "utf-8");
    fsyncSync(fd);
  } finally {
    closeSync(fd);
  }
}

interface DrainLockDatabase {
  exec(statement: string): unknown;
  close(): void;
}

export async function acquireMemoryRetryDrainLock(
  projectDir: string,
): Promise<() => void> {
  const retryPath = retryObservePath(projectDir);
  mkdirSync(dirname(retryPath), { recursive: true, mode: 0o700 });
  const require = createRequire(import.meta.url);
  const Database = (
    typeof process.versions.bun === "string"
      ? require("bun:sqlite").Database
      : require("better-sqlite3")
  ) as new (
    path: string,
  ) => DrainLockDatabase;
  const database = new Database(`${retryPath}.drain-lock.sqlite`);
  try {
    database.exec("PRAGMA busy_timeout = 0");
    const deadline = Date.now() + 30_000;
    for (;;) {
      try {
        database.exec("BEGIN IMMEDIATE");
        return () => {
          try {
            database.exec("ROLLBACK");
          } finally {
            database.close();
          }
        };
      } catch (error) {
        if (
          (error as { code?: string }).code !== "SQLITE_BUSY" ||
          Date.now() >= deadline
        ) {
          throw error;
        }
        await setTimeout(25);
      }
    }
  } catch (error) {
    database.close();
    throw error;
  }
}
