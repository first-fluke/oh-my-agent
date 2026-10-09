import { createHash, randomUUID } from "node:crypto";
import {
  closeSync,
  constants,
  existsSync,
  fstatSync,
  fsyncSync,
  ftruncateSync,
  linkSync,
  lstatSync,
  mkdirSync,
  openSync,
  readFileSync,
  readSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
import { createRequire } from "node:module";
import { dirname, isAbsolute, join, relative, resolve, sep } from "node:path";
import { validateEventEnvelope } from "../../.agents/hooks/core/event-contract.ts";
import {
  profileSlot,
  projectIdentity,
} from "../../.agents/hooks/core/session-storage.ts";
import { profileStateHome } from "../utils/oma-home.js";
import { memoryDeliveryTargetKey } from "./memory-delivery-target.js";
import {
  acquireMemoryRetryDrainLock,
  type MemoryRetryDimension,
  parseMemoryRetryLine,
  readMemoryRetryEntries,
  retryObservePath,
} from "./memory-retry-queue.js";
import type {
  RuntimeMigrationEntry,
  RuntimeMigrationOptions,
} from "./runtime-migration-types.js";

type Snapshot = {
  path: string;
  bytes: Buffer;
  stamp: string;
  identity: string;
};
type Imported = {
  line: string;
  key: string;
  delivered: Set<MemoryRetryDimension>;
};

function digest(bytes: Buffer | string): string {
  return createHash("sha256").update(bytes).digest("hex");
}

function stamp(path: string): string {
  const stat = lstatSync(path, { bigint: true });
  if (!stat.isFile() || stat.isSymbolicLink())
    throw new Error("Expected a regular file");
  return [
    stat.dev,
    stat.ino,
    stat.size,
    stat.mtimeNs,
    stat.ctimeNs,
    stat.birthtimeNs,
  ].join(":");
}

/** Existing components below the selected root must never redirect migration. */
function safePath(anchor: string, path: string): void {
  const base = resolve(anchor);
  const child = relative(base, resolve(path));
  if (isAbsolute(child) || child === ".." || child.startsWith(`..${sep}`))
    throw new Error("Migration path escapes its storage root");
  let current = base;
  for (const part of ["", ...child.split(sep).filter(Boolean)]) {
    if (part) current = join(current, part);
    try {
      if (lstatSync(current).isSymbolicLink())
        throw new Error("Migration rejects symbolic links");
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
    }
  }
}

function snapshot(path: string): Snapshot | undefined {
  let before: string;
  try {
    before = stamp(path);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return undefined;
    throw error;
  }
  let fd: number;
  try {
    fd = openSync(path, constants.O_RDONLY | constants.O_NOFOLLOW);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT")
      throw new Error("Source changed before snapshot open");
    throw error;
  }
  try {
    const stat = fstatSync(fd);
    const bytes = readFileSync(fd);
    if (
      before !== stamp(path) ||
      `${stat.dev}:${stat.ino}` !==
        `${lstatSync(path).dev}:${lstatSync(path).ino}`
    )
      throw new Error("Source changed while its snapshot was read");
    return {
      path,
      bytes,
      stamp: before,
      identity: `${stat.dev}:${stat.ino}:${stat.birthtimeMs}`,
    };
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT")
      throw new Error("Source changed while reading snapshot");
    throw error;
  } finally {
    closeSync(fd);
  }
}

function unchanged(files: Map<string, Snapshot | undefined>): boolean {
  try {
    return [...files].every(([path, file]) =>
      file
        ? stamp(path) === file.stamp && readFileSync(path).equals(file.bytes)
        : !existsSync(path),
    );
  } catch {
    return false;
  }
}

function rows(
  bytes: Buffer,
): Array<{ line: string; offset: number; hash: string; complete: boolean }> {
  const result = [];
  let offset = 0;
  while (offset < bytes.length) {
    const newline = bytes.indexOf(10, offset);
    const end = newline < 0 ? bytes.length : newline;
    const content = bytes.subarray(offset, end);
    const line = content.toString("utf-8");
    if (line.trim())
      result.push({
        line,
        offset,
        hash: digest(content),
        complete: newline >= 0,
      });
    offset = end + 1;
  }
  return result;
}

function sourceAcknowledgements(file?: Snapshot): {
  receipts: Map<string, Set<MemoryRetryDimension>>;
  malformed: number;
} {
  const receipts = new Map<string, Set<MemoryRetryDimension>>();
  let malformed = 0;
  for (const row of rows(file?.bytes ?? Buffer.alloc(0))) {
    try {
      if (!row.complete) throw new Error("Interrupted ACK tail");
      const entry = JSON.parse(row.line);
      const key =
        typeof entry?.deliveryId === "string"
          ? entry.deliveryId
          : typeof entry?.file === "string" &&
              Number.isSafeInteger(entry.offset) &&
              entry.offset >= 0 &&
              typeof entry.hash === "string"
            ? `${entry.file}:${entry.offset}:${entry.hash}`
            : undefined;
      if (
        !key ||
        (entry.dimension !== undefined &&
          entry.dimension !== "observe" &&
          entry.dimension !== "remember")
      )
        throw new Error("Malformed ACK");
      const delivered = receipts.get(key) ?? new Set<MemoryRetryDimension>();
      if (entry.dimension === undefined) {
        delivered.add("observe");
        delivered.add("remember");
      } else delivered.add(entry.dimension);
      receipts.set(key, delivered);
    } catch {
      malformed += 1;
    }
  }
  return { receipts, malformed };
}

function canonical(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  if (value && typeof value === "object")
    return `{${Object.entries(value)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, item]) => `${JSON.stringify(key)}:${canonical(item)}`)
      .join(",")}}`;
  return JSON.stringify(value);
}

/** Immutable raw snapshots also preserve rows that cannot enter the active schema. */
function archiveFiles(
  anchor: string,
  directory: string,
  files: Array<Pick<Snapshot, "path" | "bytes">>,
  dryRun: boolean,
): boolean {
  let changed = false;
  safePath(anchor, directory);
  for (const file of files) {
    const path = join(
      directory,
      file.path.slice(file.path.lastIndexOf(sep) + 1),
    );
    safePath(anchor, path);
    if (existsSync(path)) {
      if (!readFileSync(path).equals(file.bytes))
        throw new Error("Conflicting immutable migration snapshot");
      continue;
    }
    changed = true;
    if (dryRun) continue;
    mkdirSync(directory, { recursive: true, mode: 0o700 });
    const temporary = `${path}.${randomUUID()}.tmp`;
    const fd = openSync(temporary, "wx", 0o600);
    try {
      writeFileSync(fd, file.bytes);
      fsyncSync(fd);
    } finally {
      closeSync(fd);
    }
    try {
      try {
        linkSync(temporary, path);
      } catch (error) {
        if (
          (error as NodeJS.ErrnoException).code !== "EEXIST" ||
          !readFileSync(path).equals(file.bytes)
        )
          throw error;
      }
    } finally {
      unlinkSync(temporary);
    }
  }
  if (changed && !dryRun) {
    const fd = openSync(directory, "r");
    try {
      fsyncSync(fd);
    } finally {
      closeSync(fd);
    }
  }
  return changed;
}

type SourceLease = { exec(statement: string): unknown; close(): void };
function sourceLease(path: string): () => void {
  const require = createRequire(import.meta.url);
  const Database = (
    typeof process.versions.bun === "string"
      ? require("bun:sqlite").Database
      : require("better-sqlite3")
  ) as new (
    path: string,
  ) => SourceLease;
  const db = new Database(path);
  try {
    db.exec("PRAGMA busy_timeout = 0");
    db.exec("BEGIN IMMEDIATE");
  } catch (error) {
    db.close();
    throw error;
  }
  return () => {
    try {
      db.exec("ROLLBACK");
    } finally {
      db.close();
    }
  };
}

/** Writes can roll back only their own exact append while the HOME lease is held. */
function appendTransaction(files: Array<{ path: string; append: string }>): {
  rollback(): void;
  close(): void;
} {
  const opened: Array<{
    path: string;
    fd: number;
    before: Buffer;
    expected: Buffer;
    identity: string;
    created: boolean;
  }> = [];
  function rollback() {
    for (const file of opened) {
      const stat = fstatSync(file.fd);
      const named = lstatSync(file.path);
      const current = Buffer.alloc(stat.size);
      let position = 0;
      while (position < current.length) {
        const count = readSync(
          file.fd,
          current,
          position,
          current.length - position,
          position,
        );
        if (!count)
          throw new Error("HOME file changed during rollback verification");
        position += count;
      }
      if (
        `${stat.dev}:${stat.ino}` !== file.identity ||
        `${named.dev}:${named.ino}` !== file.identity ||
        current.length < file.before.length ||
        current.length > file.expected.length ||
        !current.equals(file.expected.subarray(0, current.length))
      )
        throw new Error(
          "Unexpected HOME writer; migration will not remove another writer's data",
        );
    }
    for (const file of [...opened].reverse()) {
      ftruncateSync(file.fd, file.before.length);
      fsyncSync(file.fd);
      if (file.created && file.before.length === 0) unlinkSync(file.path);
    }
  }
  try {
    for (const file of files) {
      if (!file.append) continue;
      const created = !existsSync(file.path);
      const fd = openSync(
        file.path,
        constants.O_RDWR |
          constants.O_APPEND |
          constants.O_CREAT |
          constants.O_NOFOLLOW,
        0o600,
      );
      const stat = fstatSync(fd);
      const before = readFileSync(fd);
      const expected = Buffer.concat([before, Buffer.from(file.append)]);
      opened.push({
        path: file.path,
        fd,
        before,
        expected,
        created,
        identity: `${stat.dev}:${stat.ino}`,
      });
      writeFileSync(fd, file.append);
      fsyncSync(fd);
    }
  } catch (error) {
    try {
      rollback();
    } finally {
      for (const file of opened) closeSync(file.fd);
    }
    throw error;
  }
  return {
    rollback,
    close: () => {
      for (const file of opened) closeSync(file.fd);
    },
  };
}

/** Explicit offline migration only; normal queue readers never inspect legacy state. */
export async function migrateMemoryRetry(
  options: RuntimeMigrationOptions,
): Promise<RuntimeMigrationEntry[]> {
  const root = projectIdentity(options.projectDir).projectDir;
  const source = join(root, ".agents/state/retry/observe.jsonl");
  const result = (
    status: RuntimeMigrationEntry["status"],
    reason: string,
    destination?: string,
  ): RuntimeMigrationEntry[] => [
    { area: "retry", source, destination, status, reason },
  ];
  const anchor = profileStateHome();
  const destination = retryObservePath(root);
  const sourcePaths = [
    source,
    `${source}.ack.jsonl`,
    `${source}.targets.jsonl`,
  ];
  let releaseSource: (() => void) | undefined;
  let releaseHome: (() => void) | undefined;
  let transaction: ReturnType<typeof appendTransaction> | undefined;
  try {
    for (const path of sourcePaths) safePath(root, path);
    if (!sourcePaths.some(existsSync)) return [];
    if (profileSlot() !== "0")
      return result(
        "deferred",
        "Unscoped retry data can only be migrated into profile 0",
      );
    safePath(anchor, destination);
    safePath(anchor, `${destination}.ack.jsonl`);
    if (!options.dryRun) {
      const lock = `${source}.drain-lock.sqlite`;
      for (const suffix of ["", "-wal", "-shm", "-journal"]) {
        safePath(root, `${lock}${suffix}`);
        safePath(anchor, `${destination}.drain-lock.sqlite${suffix}`);
      }
      releaseSource = sourceLease(lock);
      releaseHome = await acquireMemoryRetryDrainLock(root, 1000);
    }
    const snapshots = new Map(
      sourcePaths.map((path) => [path, snapshot(path)]),
    );
    const files = [...snapshots.values()].filter(
      (file): file is Snapshot => file !== undefined,
    );
    const owner = projectIdentity(root);
    const manifest = Buffer.from(
      `${JSON.stringify(
        {
          version: 1,
          projectId: owner.projectId,
          profile: owner.profile,
          files: files.map((file) => ({
            name: file.path.slice(file.path.lastIndexOf(sep) + 1),
            source: file.path,
            identity: file.identity,
            bytes: file.bytes.length,
            sha256: digest(file.bytes),
          })),
        },
        null,
        2,
      )}\n`,
    );
    const hash = digest(manifest);
    const archive = join(dirname(destination), "migration-unbound", hash);
    const queue = snapshots.get(source);
    const acknowledgements = sourceAcknowledgements(
      snapshots.get(`${source}.ack.jsonl`),
    );
    let unbound = 0;
    let malformed = acknowledgements.malformed;
    let foreign = 0;
    let conflicts = 0;
    const imports = new Map<string, Imported>();
    const conflictingKeys = new Set<string>();
    for (const row of rows(queue?.bytes ?? Buffer.alloc(0))) {
      if (!row.complete) {
        malformed += 1;
        continue;
      }
      let value: Record<string, unknown>;
      try {
        value = JSON.parse(row.line);
      } catch {
        malformed += 1;
        continue;
      }
      const { memoryTarget, memoryDelivery, ...event } = value ?? {};
      if (validateEventEnvelope(event).length) {
        malformed += 1;
        continue;
      }
      if (memoryTarget === undefined) {
        unbound += 1;
        continue;
      }
      const parsed = parseMemoryRetryLine(row.line);
      if (!parsed) {
        malformed += 1;
        continue;
      }
      if (
        parsed.target.profile !== owner.profile ||
        parsed.target.projectId !== owner.projectId ||
        parsed.target.projectDir !== owner.projectDir
      ) {
        foreign += 1;
        continue;
      }
      const key = `${memoryDeliveryTargetKey(parsed.target)}:${parsed.event.sid}:${parsed.event.eventId}`;
      const physical = `${queue?.identity}:${row.offset}:${row.hash}`;
      const delivered = new Set([
        ...(acknowledgements.receipts.get(physical) ?? []),
        ...(acknowledgements.receipts.get(key) ?? []),
      ]);
      const prior = imports.get(key);
      if (prior && canonical(JSON.parse(prior.line)) !== canonical(value)) {
        conflictingKeys.add(key);
        conflicts += 1;
        continue;
      }
      if (prior)
        for (const dimension of delivered) prior.delivered.add(dimension);
      else imports.set(key, { line: row.line, key, delivered });
    }
    const existing = new Map(
      readMemoryRetryEntries(root)
        .filter((entry) => entry.deliveryId)
        .map((entry) => [entry.deliveryId, entry]),
    );
    const newRows: string[] = [];
    const newAcks: string[] = [];
    for (const item of imports.values()) {
      if (conflictingKeys.has(item.key)) continue;
      const prior = existing.get(item.key);
      if (
        prior &&
        canonical(JSON.parse(prior.line)) !== canonical(JSON.parse(item.line))
      ) {
        conflicts += 1;
        continue;
      }
      if (!prior) newRows.push(item.line);
      for (const dimension of item.delivered)
        if (!prior?.delivered?.includes(dimension))
          newAcks.push(JSON.stringify({ deliveryId: item.key, dimension }));
    }
    if (!unchanged(snapshots))
      return result(
        "deferred",
        "Source changed; active queue left unchanged",
        archive,
      );
    const archiveChanged = archiveFiles(
      anchor,
      archive,
      [
        ...files,
        { path: join(dirname(source), "snapshot.json"), bytes: manifest },
      ],
      options.dryRun === true,
    );
    if (!unchanged(snapshots))
      return result(
        "deferred",
        "Source changed while archiving; active queue left unchanged",
        archive,
      );
    if (!options.dryRun && (newRows.length || newAcks.length)) {
      safePath(anchor, destination);
      safePath(anchor, `${destination}.ack.jsonl`);
      transaction = appendTransaction([
        // Completed operations must be checkpointed before rows become deliverable.
        {
          path: `${destination}.ack.jsonl`,
          append: newAcks.length ? `\n${newAcks.join("\n")}\n` : "",
        },
        {
          path: destination,
          append: newRows.length ? `\n${newRows.join("\n")}\n` : "",
        },
      ]);
      if (!unchanged(snapshots)) {
        transaction.rollback();
        return result(
          "deferred",
          "Source changed during publication; migration append rolled back",
          archive,
        );
      }
    }
    const reason = `${options.dryRun ? "Dry run; " : ""}${newRows.length} frozen rows, ${newAcks.length} operation ACKs; raw snapshot preserves ${unbound} unbound, ${malformed} malformed/tail, ${foreign} foreign, ${conflicts} conflicting rows`;
    const status = conflicts
      ? "conflict"
      : newRows.length || newAcks.length
        ? "copied"
        : archiveChanged
          ? "quarantined"
          : "unchanged";
    return result(status, reason, archive);
  } catch (error) {
    return result(
      (error as { code?: string }).code === "SQLITE_BUSY" ||
        String(error).includes("Source changed")
        ? "deferred"
        : "conflict",
      error instanceof Error ? error.message : String(error),
    );
  } finally {
    transaction?.close();
    releaseHome?.();
    releaseSource?.();
  }
}
