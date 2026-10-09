import { execFileSync } from "node:child_process";
import { createHash, randomUUID } from "node:crypto";
import {
  chmodSync,
  existsSync,
  linkSync,
  lstatSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  realpathSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
import { hostname } from "node:os";
import { dirname, isAbsolute, join, relative, resolve, sep } from "node:path";
import { acquireOwnedDirectoryLock } from "../utils/owned-directory-lock.js";
import { writeVaultIndex } from "./vault.js";

export interface GlobalServiceMigrationResult {
  copied: string[];
  conflicts: string[];
  deferred: string[];
}

export interface GlobalServiceMigrationOptions {
  homeDir: string;
  destinationHome: string;
  dryRun?: boolean;
  /** Test seams: inspection never signals or mutates a running process. */
  isProcessAlive?: (pid: number) => boolean;
  listProcesses?: () => string;
}

function alive(pid: number): boolean {
  if (!Number.isSafeInteger(pid) || pid <= 0) return false;
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    return (error as NodeJS.ErrnoException).code !== "ESRCH";
  }
}

function processes(): string {
  if (process.platform === "win32")
    return execFileSync(
      "powershell.exe",
      [
        "-NoProfile",
        "-NonInteractive",
        "-Command",
        'Get-CimInstance Win32_Process | ForEach-Object { "{0} {1}" -f $_.ProcessId, $_.CommandLine }',
      ],
      { encoding: "utf8", timeout: 5000 },
    );
  return execFileSync("ps", ["-axo", "pid=,command="], {
    encoding: "utf8",
    timeout: 5000,
  });
}

function within(root: string, file: string): boolean {
  const rel = relative(root, file);
  return (
    rel === "" ||
    (!isAbsolute(rel) && rel !== ".." && !rel.startsWith(`..${sep}`))
  );
}

function canonical(path: string): string {
  try {
    return realpathSync(path);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
    const parent = dirname(path);
    if (parent === path) throw error;
    return join(canonical(parent), relative(parent, path));
  }
}

/** Copy/merge OMA-owned service data while preserving every legacy source. */
export async function migrateGlobalServices(
  options: GlobalServiceMigrationOptions,
): Promise<GlobalServiceMigrationResult> {
  const result: GlobalServiceMigrationResult = {
    copied: [],
    conflicts: [],
    deferred: [],
  };
  const home = resolve(options.homeDir);
  const destination = resolve(options.destinationHome);
  const config = join(home, ".config", "oma");
  const schedule = join(home, ".agents", "schedule");
  const backup = join(home, ".agents", "backup");
  const receipts = join(destination, "state", "migrations");
  const isAlive = options.isProcessAlive ?? alive;
  const sourceKey = createHash("sha256")
    .update(home)
    .digest("hex")
    .slice(0, 16);
  let release: (() => void) | undefined;
  let processTable: string | undefined;
  function hasProcess(pattern: RegExp): boolean {
    processTable ??= (options.listProcesses ?? processes)();
    return processTable.split("\n").some((line) => {
      const match = /^\s*(\d+)\s+(.+)$/.exec(line);
      return (
        !!match &&
        Number(match[1]) !== process.pid &&
        pattern.test(match[2] ?? "")
      );
    });
  }

  function destinationSafe(path: string): boolean {
    let current = path;
    while (within(destination, current)) {
      try {
        if (lstatSync(current).isSymbolicLink()) return false;
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code !== "ENOENT") return false;
      }
      if (current === destination) return true;
      current = dirname(current);
    }
    return within(destination, path);
  }

  function sourceSafe(path: string): boolean {
    try {
      if (
        lstatSync(path).isSymbolicLink() ||
        !within(canonical(home), canonical(path))
      ) {
        result.conflicts.push(`Unsafe legacy source root: ${path}`);
        return false;
      }
      return true;
    } catch (error) {
      result.conflicts.push(`${path}: ${String(error)}`);
      return false;
    }
  }

  function privateDirectory(directory: string): void {
    if (!destinationSafe(directory))
      throw new Error(`Unsafe destination: ${directory}`);
    mkdirSync(directory, { recursive: true, mode: 0o700 });
    chmodSync(directory, 0o700);
  }

  function publish(path: string, bytes: Buffer, mode: number): void {
    privateDirectory(dirname(path));
    const temporary = join(
      dirname(path),
      `.migration-${process.pid}-${randomUUID()}.tmp`,
    );
    try {
      writeFileSync(temporary, bytes, { mode, flag: "wx" });
      // Linking publishes the complete file exclusively; rename would overwrite.
      linkSync(temporary, path);
    } finally {
      try {
        unlinkSync(temporary);
      } catch {}
    }
  }

  function copyTree(
    sourceRoot: string,
    targetRoot: string,
    excluded: (name: string) => boolean = () => false,
    secret = false,
  ): void {
    if (!existsSync(sourceRoot)) return;
    let boundary: string;
    try {
      if (lstatSync(sourceRoot).isSymbolicLink()) {
        result.conflicts.push(`Source root is a symlink: ${sourceRoot}`);
        return;
      }
      boundary = realpathSync(sourceRoot);
    } catch (error) {
      result.conflicts.push(`${sourceRoot}: ${String(error)}`);
      return;
    }
    const visited = new Set<string>();
    function copy(source: string, target: string): void {
      try {
        const real = realpathSync(source);
        if (!within(boundary, real)) {
          result.conflicts.push(`Escaping source symlink: ${source}`);
          return;
        }
        const stat = lstatSync(real);
        if (!destinationSafe(target)) {
          result.conflicts.push(`Unsafe destination: ${target}`);
          return;
        }
        if (stat.isDirectory()) {
          if (visited.has(real)) {
            result.conflicts.push(`Cyclic source symlink: ${source}`);
            return;
          }
          visited.add(real);
          if (existsSync(target) && !lstatSync(target).isDirectory()) {
            result.conflicts.push(`Destination is not a directory: ${target}`);
            return;
          }
          for (const name of readdirSync(real)) {
            if (!excluded(name)) copy(join(source, name), join(target, name));
          }
          visited.delete(real);
        } else if (stat.isFile()) {
          const bytes = readFileSync(real);
          if (existsSync(target)) {
            if (
              !lstatSync(target).isFile() ||
              !readFileSync(target).equals(bytes)
            )
              result.conflicts.push(`Differing destination: ${target}`);
            else if (secret && !options.dryRun) {
              privateDirectory(dirname(target));
              chmodSync(target, 0o600);
            }
            return;
          }
          if (!options.dryRun)
            publish(target, bytes, secret ? 0o600 : stat.mode & 0o777);
          result.copied.push(target);
        } else result.conflicts.push(`Unsupported source file: ${source}`);
      } catch (error) {
        result.conflicts.push(
          `${source}: ${error instanceof Error ? error.message : String(error)}`,
        );
      }
    }
    copy(sourceRoot, targetRoot);
  }

  function lockActive(lock: string): boolean {
    if (!existsSync(lock)) return false;
    try {
      if (lstatSync(lock).isFile()) {
        const pid = Number(readFileSync(lock, "utf8"));
        return !Number.isSafeInteger(pid) || pid <= 0 || isAlive(pid);
      }
      const owners = readdirSync(lock);
      if (!owners.length) return true;
      return owners.some((owner) => {
        const metadata = JSON.parse(readFileSync(join(lock, owner), "utf8"));
        return (
          metadata.hostname !== hostname() ||
          !Number.isSafeInteger(metadata.pid) ||
          metadata.pid <= 0 ||
          isAlive(metadata.pid)
        );
      });
    } catch {
      return true;
    }
  }

  function completed(area: string): boolean {
    try {
      const path = join(receipts, `services-${sourceKey}-${area}.json`);
      if (!destinationSafe(path) || !lstatSync(path).isFile()) return false;
      const receipt = JSON.parse(readFileSync(path, "utf8"));
      return (
        receipt.version === 1 &&
        receipt.sourceHome === home &&
        receipt.destinationHome === destination &&
        receipt.area === area
      );
    } catch {
      return false;
    }
  }

  function finish(
    area: string,
    start: { conflicts: number; deferred: number },
  ): void {
    if (
      options.dryRun ||
      result.conflicts.length !== start.conflicts ||
      result.deferred.length !== start.deferred
    )
      return;
    const path = join(receipts, `services-${sourceKey}-${area}.json`);
    const bytes = Buffer.from(
      `${JSON.stringify({ version: 1, sourceHome: home, destinationHome: destination, area, completedAt: new Date().toISOString() })}\n`,
    );
    try {
      publish(path, bytes, 0o600);
    } catch (error) {
      result.conflicts.push(
        `Could not record completed ${area}: ${String(error)}`,
      );
    }
  }

  function counts() {
    return {
      conflicts: result.conflicts.length,
      deferred: result.deferred.length,
    };
  }

  try {
    const canonicalDestination = canonical(destination);
    for (const source of [config, schedule, backup]) {
      const canonicalSource = canonical(source);
      if (
        within(canonicalSource, canonicalDestination) ||
        within(canonicalDestination, canonicalSource)
      ) {
        result.conflicts.push(
          `Source and destination overlap: ${source} -> ${destination}`,
        );
        return result;
      }
    }
    if (!options.dryRun) {
      privateDirectory(receipts);
      const lock = acquireOwnedDirectoryLock(
        join(receipts, "service-migration.lock"),
      );
      if (!lock.ok) {
        result.deferred.push("Another global service migration is running");
        return result;
      }
      release = lock.release;
    }
    const safeConfig = existsSync(config) && sourceSafe(config);
    if (safeConfig && !completed("serena")) {
      const before = counts();
      let busy = lockActive(join(config, "serena-daemons.lock"));
      try {
        // An old daemon may be writing its log before registering its PID.
        // Process command lines do not expose OMA_HOME, so ambiguous matches defer.
        busy ||= hasProcess(
          /(?:serena\S*\s+start-mcp-server\b.*--transport(?:\s+|=)streamable-http\b|(?:oma|cli\.[cm]?[jt]s)\b.*\bbridge\b)/,
        );
      } catch (error) {
        busy = true;
        result.deferred.push(
          `Cannot inspect legacy Serena processes: ${String(error)}`,
        );
      }
      const registry = join(config, "serena-daemons.json");
      if (existsSync(registry)) {
        try {
          const records = JSON.parse(readFileSync(registry, "utf8"));
          if (!records || typeof records !== "object" || Array.isArray(records))
            throw new Error("Invalid registry");
          busy ||= Object.values(records).some((record) => {
            const owner = record as { pid?: number; clients?: number[] };
            return (
              (typeof owner?.pid === "number" && isAlive(owner.pid)) ||
              (Array.isArray(owner?.clients) && owner.clients.some(isAlive))
            );
          });
        } catch {
          result.deferred.push(
            `Unreadable legacy Serena registry: ${registry}`,
          );
          busy = true;
        }
      }
      if (busy)
        result.deferred.push(
          `Legacy Serena daemon or bridge is active: ${config}`,
        );
      else {
        const allowed = /^(serena-daemons\.json|serena-daemon-\d+\.log)$/;
        for (const name of readdirSync(config)) {
          if (allowed.test(name))
            copyTree(
              join(config, name),
              join(destination, "state", "serena", name),
              undefined,
              true,
            );
        }
        finish("serena", before);
      }
    }

    const vault = join(config, "vault-index.json");
    if (safeConfig && existsSync(vault) && !completed("vault")) {
      const before = counts();
      const target = join(destination, "state", "vault-index.json");
      let releaseVault: (() => void) | undefined;
      try {
        if (
          !within(realpathSync(config), realpathSync(vault)) ||
          !destinationSafe(target)
        )
          throw new Error("Unsafe vault index path");
        if (!options.dryRun) {
          privateDirectory(dirname(target));
          const lock = acquireOwnedDirectoryLock(`${target}.lock`);
          if (!lock.ok) {
            result.deferred.push(`Vault index is being updated: ${target}`);
          } else releaseVault = lock.release;
        }
        if (options.dryRun || releaseVault) {
          const parse = (path: string) => {
            const value = JSON.parse(readFileSync(path, "utf8"));
            if (
              value?.version !== 1 ||
              !Array.isArray(value.entries) ||
              value.entries.some(
                (entry: { name?: unknown; createdAt?: unknown }) =>
                  typeof entry?.name !== "string" ||
                  typeof entry.createdAt !== "string",
              )
            )
              throw new Error(`Invalid vault index: ${path}`);
            return value as {
              version: 1;
              entries: Array<{ name: string; createdAt: string }>;
            };
          };
          const incoming = parse(vault);
          const existing = existsSync(target)
            ? parse(target)
            : { version: 1 as const, entries: [] };
          const names = new Set(existing.entries.map((entry) => entry.name));
          for (const entry of incoming.entries)
            if (!names.has(entry.name)) {
              names.add(entry.name);
              existing.entries.push(entry);
            }
          if (!existsSync(target)) {
            if (!options.dryRun)
              publish(
                target,
                Buffer.from(`${JSON.stringify(existing, null, 2)}\n`),
                0o600,
              );
            result.copied.push(target);
          } else {
            if (!options.dryRun) chmodSync(target, 0o600);
            const current = parse(target);
            if (current.entries.length !== existing.entries.length) {
              if (!options.dryRun) {
                writeVaultIndex(target, existing);
              }
              result.copied.push(target);
            }
          }
          finish("vault", before);
        }
      } catch (error) {
        result.conflicts.push(`${vault}: ${String(error)}`);
      } finally {
        releaseVault?.();
      }
    }

    if (
      existsSync(schedule) &&
      sourceSafe(schedule) &&
      !completed("schedule")
    ) {
      const before = counts();
      let busy = lockActive(join(schedule, "manifest.lock"));
      try {
        busy ||= hasProcess(
          /(?:oma|cli\.[cm]?[jt]s)\b.*\bschedule(?::run|\s+run)\b/,
        );
        const running = join(schedule, "running");
        if (existsSync(running))
          for (const name of readdirSync(running)) {
            const lease = JSON.parse(readFileSync(join(running, name), "utf8"));
            if (
              lease.hostname !== hostname() ||
              !Number.isSafeInteger(lease.pid) ||
              isAlive(lease.pid)
            )
              busy = true;
          }
      } catch (error) {
        busy = true;
        result.deferred.push(
          `Cannot inspect legacy schedule runners: ${String(error)}`,
        );
      }
      if (busy)
        result.deferred.push(
          `Legacy schedule runner or manifest lock is active: ${schedule}`,
        );
      else {
        copyTree(
          schedule,
          join(destination, "schedule"),
          (name) =>
            name === "manifest.lock" ||
            name === "running" ||
            /^owner-|\.tmp$/.test(name),
          true,
        );
        finish("schedule", before);
      }
    }

    if (existsSync(backup) && sourceSafe(backup) && !completed("backup")) {
      const before = counts();
      copyTree(backup, join(destination, "backup"));
      finish("backup", before);
    }
  } catch (error) {
    result.conflicts.push(String(error));
  } finally {
    release?.();
  }
  return result;
}
