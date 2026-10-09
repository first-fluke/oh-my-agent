// Dependency-free storage paths shared by installed hooks and the CLI.
import { createHash, randomBytes, randomUUID } from "node:crypto";
import {
  existsSync,
  linkSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  realpathSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
import { basename, dirname, join, resolve } from "node:path";
import { profileStateHome } from "./oma-home.ts";

export const STATE_ROOT = ".agents/state/sessions";

export interface LocalProfile {
  schemaVersion: 1;
  slot: string;
  profileId: string;
  createdAt: string;
  // Future login links a stable server subject; no credentials or Git identity.
  account: { issuer: string; subject: string } | null;
}

export interface SessionContext {
  schemaVersion: 1;
  projectId: string;
  projectDir: string;
  profile: string;
}

export function profileSlot(): string {
  const slot = process.env.OMA_PROFILE ?? "0";
  if (!/^(0|[1-9][0-9]{0,9})$/.test(slot)) {
    throw new Error("OMA_PROFILE must be a non-negative profile number");
  }
  return slot;
}

export function profileDir(): string {
  return join(profileStateHome(), "u", profileSlot());
}

export function projectIdentity(projectDir: string): SessionContext {
  let ancestor = resolve(projectDir);
  const missing: string[] = [];
  let canonical = ancestor;
  while (true) {
    try {
      canonical = join(realpathSync(ancestor), ...missing);
      break;
    } catch {
      // Resolve existing ancestors too (e.g. macOS /var -> /private/var),
      // keeping the same identity after a worktree directory is removed.
      const parent = dirname(ancestor);
      if (parent === ancestor) break;
      missing.unshift(basename(ancestor));
      ancestor = parent;
    }
  }
  return {
    schemaVersion: 1,
    projectId: createHash("sha256").update(canonical).digest("hex"),
    projectDir: canonical,
    profile: profileSlot(),
  };
}

export function projectStateDir(projectDir: string): string {
  return join(profileDir(), "projects", projectIdentity(projectDir).projectId);
}

export function legacySessionsDir(projectDir: string): string {
  return join(projectDir, STATE_ROOT);
}

export function sessionsDir(_projectDir?: string): string {
  return join(profileDir(), "sessions");
}

export function indexPath(projectDir: string): string {
  return join(projectStateDir(projectDir), "_index.json");
}

export function sessionArchiveRoot(projectDir: string): string {
  return join(projectStateDir(projectDir), "archive");
}

export function sessionArchiveRoots(projectDir: string): string[] {
  return [
    sessionArchiveRoot(projectDir),
    ...(profileSlot() === "0"
      ? [join(projectDir, ".agents", "state", "archive")]
      : []),
  ];
}

export function readableIndexPath(projectDir: string): string {
  const current = indexPath(projectDir);
  if (existsSync(current) || profileSlot() !== "0") return current;
  const legacy = join(legacySessionsDir(projectDir), "_index.json");
  return existsSync(legacy) ? legacy : current;
}

export function isValidSid(sid: string): boolean {
  return (
    sid.length > 0 &&
    sid.length <= 128 &&
    !sid.includes("..") &&
    /^[A-Za-z0-9._-]+$/.test(sid)
  );
}

function assertSid(sid: string): void {
  if (!isValidSid(sid)) throw new Error(`Invalid session id: ${sid}`);
}

export function createSessionId(now = new Date()): string {
  return `${now.toISOString().slice(0, 10)}_${randomBytes(12).toString("base64url")}`;
}

function readContext(dir: string): SessionContext | null {
  try {
    return JSON.parse(readFileSync(join(dir, "context.json"), "utf-8"));
  } catch {
    return null;
  }
}

export function sessionDir(projectDir: string, sid: string): string {
  assertSid(sid);
  // Existing local sessions remain writable in place, only in profile 0.
  const legacy = join(legacySessionsDir(projectDir), sid);
  if (profileSlot() === "0" && existsSync(legacy)) return legacy;
  const current = join(sessionsDir(), sid);
  const context = readContext(current);
  if (!context && existsSync(join(current, "events.jsonl"))) {
    throw new Error(`Session ${sid} has missing or invalid project ownership`);
  }
  if (
    context &&
    (context.projectId !== projectIdentity(projectDir).projectId ||
      context.profile !== profileSlot())
  ) {
    throw new Error(`Session ${sid} belongs to another project`);
  }
  return current;
}

// Publish fully-written immutable JSON without replacing another writer's file.
function publishJson(path: string, value: unknown): void {
  mkdirSync(dirname(path), { recursive: true, mode: 0o700 });
  const tmp = `${path}.${randomUUID()}.tmp`;
  try {
    writeFileSync(tmp, `${JSON.stringify(value, null, 2)}\n`, { mode: 0o600 });
    try {
      linkSync(tmp, path);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "EEXIST") throw error;
    }
  } finally {
    if (existsSync(tmp)) unlinkSync(tmp);
  }
}

export function ensureProfile(): LocalProfile {
  const path = join(profileDir(), "profile.json");
  if (!existsSync(path)) {
    publishJson(path, {
      schemaVersion: 1,
      slot: profileSlot(),
      profileId: randomUUID(),
      createdAt: new Date().toISOString(),
      account: null,
    } satisfies LocalProfile);
  }
  const profile = JSON.parse(readFileSync(path, "utf-8")) as LocalProfile;
  if (
    profile.schemaVersion !== 1 ||
    profile.slot !== profileSlot() ||
    typeof profile.profileId !== "string" ||
    !profile.profileId
  ) {
    throw new Error(`Invalid local profile: ${path}`);
  }
  return profile;
}

export function ensureSessionStorage(projectDir: string, sid: string): void {
  const dir = sessionDir(projectDir, sid);
  if (dir === join(legacySessionsDir(projectDir), sid)) return;
  ensureProfile();
  const identity = projectIdentity(projectDir);
  if (!existsSync(join(dir, "context.json"))) {
    publishJson(join(dir, "context.json"), identity);
  }
  const context = readContext(dir);
  if (
    context?.projectId !== identity.projectId ||
    context.profile !== identity.profile
  ) {
    throw new Error(
      `Session ${sid} has invalid or conflicting project ownership`,
    );
  }
}

export function listSessionIds(projectDir: string): string[] {
  const ids = new Set<string>();
  const current = sessionsDir();
  const identity = projectIdentity(projectDir);
  if (existsSync(current)) {
    for (const entry of readdirSync(current, { withFileTypes: true })) {
      if (!entry.isDirectory() || !isValidSid(entry.name)) continue;
      const context = readContext(join(current, entry.name));
      if (
        context?.projectId === identity.projectId &&
        context.profile === identity.profile
      ) {
        ids.add(entry.name);
      }
    }
  }
  const legacy = legacySessionsDir(projectDir);
  if (profileSlot() === "0" && existsSync(legacy)) {
    for (const entry of readdirSync(legacy, { withFileTypes: true })) {
      if (entry.isDirectory() && isValidSid(entry.name)) ids.add(entry.name);
    }
  }
  return [...ids];
}
