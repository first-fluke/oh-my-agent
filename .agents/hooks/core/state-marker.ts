#!/usr/bin/env bun
import {
  closeSync,
  existsSync,
  fsyncSync,
  mkdirSync,
  openSync,
  readFileSync,
  renameSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { dirname, join } from "node:path";

export interface LastSessionMarker {
  vendor: string;
  vendorSid: string;
  ts: string;
}

export interface StateIndex {
  schemaVersion: 1;
  lastSession?: LastSessionMarker;
  active: Record<string, string>;
}

// Mirror cli/constants/paths.ts → AGENTS_STATE_SESSIONS_DIR (hooks cannot import cli/).
export const STATE_ROOT = join(".agents", "state", "sessions");

export function sessionsDir(projectDir: string): string {
  return join(projectDir, STATE_ROOT);
}

export function indexPath(projectDir: string): string {
  return join(sessionsDir(projectDir), "_index.json");
}

export function sessionDir(projectDir: string, sid: string): string {
  return join(sessionsDir(projectDir), sid);
}

export function defaultIndex(): StateIndex {
  return { schemaVersion: 1, active: {} };
}

function ensureParent(path: string): void {
  mkdirSync(dirname(path), { recursive: true });
}

function fsyncParent(path: string): void {
  try {
    const fd = openSync(dirname(path), "r");
    try {
      fsyncSync(fd);
    } finally {
      closeSync(fd);
    }
  } catch {
    // Directory fsync is not universally supported.
  }
}

export function atomicWriteJson(path: string, value: unknown): void {
  ensureParent(path);
  const tmp = `${path}.${process.pid}.${Date.now()}.tmp`;
  writeFileSync(tmp, `${JSON.stringify(value, null, 2)}\n`, "utf-8");
  // Open read-write ("r+"): fsyncSync on a read-only handle fails with EPERM
  // on Windows, aborting the metadata write. See issue #613.
  const fd = openSync(tmp, "r+");
  try {
    fsyncSync(fd);
  } finally {
    closeSync(fd);
  }
  renameSync(tmp, path);
  fsyncParent(path);
}

export function readIndex(projectDir: string): StateIndex {
  const path = indexPath(projectDir);
  if (!existsSync(path)) return defaultIndex();
  try {
    const parsed = JSON.parse(
      readFileSync(path, "utf-8"),
    ) as Partial<StateIndex>;
    return {
      schemaVersion: 1,
      active: parsed.active ?? {},
      lastSession: parsed.lastSession,
    };
  } catch {
    return defaultIndex();
  }
}

export function updateIndex(
  projectDir: string,
  mutate: (index: StateIndex) => void,
  maxRetries = 3,
): StateIndex {
  const path = indexPath(projectDir);
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    const before = existsSync(path) ? statSync(path).mtimeMs : null;
    const next = readIndex(projectDir);
    mutate(next);
    const after = existsSync(path) ? statSync(path).mtimeMs : null;
    if (before !== after) continue;
    atomicWriteJson(path, next);
    return next;
  }
  // D69: CAS retries exhausted. Do NOT throw or corrupt _index.json — leave it
  // stale and emit a diagnostic. The next hook fire or `oma state repair`
  // re-derives active pointers from events.jsonl.
  process.stderr.write(
    `[oma] _index.json CAS retries exhausted (${maxRetries}); leaving it stale.\n`,
  );
  process.stderr.write(
    "[oma]   hint: run 'oma state repair' to re-derive active pointers\n",
  );
  return readIndex(projectDir);
}

export function getActiveSid(
  index: StateIndex,
  category = "main",
): string | null {
  return index.active[category] ?? index.active.main ?? null;
}

export function setActiveSession(
  projectDir: string,
  category: string,
  sid: string,
): StateIndex {
  return updateIndex(projectDir, (index) => {
    index.active[category] = sid;
  });
}

export function setLastSession(
  projectDir: string,
  vendor: string,
  vendorSid: string,
): StateIndex {
  return updateIndex(projectDir, (index) => {
    index.lastSession = { vendor, vendorSid, ts: new Date().toISOString() };
  });
}
