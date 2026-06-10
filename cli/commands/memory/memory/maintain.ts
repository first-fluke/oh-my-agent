import {
  cpSync,
  existsSync,
  mkdirSync,
  readdirSync,
  rmSync,
  statSync,
} from "node:fs";
import { homedir } from "node:os";
import { isAbsolute, join, relative } from "node:path";
import { defaultServiceCommandRunner } from "../../../platform/agentmemory-service.js";
import type {
  MemoryMaintainCommandResult,
  MemoryMaintainOptions,
  MemoryMaintainResult,
  MemoryServiceCommandRunner,
} from "../../../types/memory.js";
import {
  agentMemoryBackupDir,
  agentMemoryConfigDir,
  OMA_AGENTMEMORY_BACKUPS_DIR,
  OMA_AGENTMEMORY_PID_FILE,
} from "./endpoint-config.js";

const DEFAULT_BACKUP_KEEP = 5;
const OMA_AGENTMEMORY_BACKUP_PREFIX = "oma-agentmemory-";

function parseNonNegativeInteger(
  value: number | string | undefined,
  fallback: number,
): number {
  if (value === undefined) return fallback;
  const parsed = typeof value === "number" ? value : Number(value);
  if (!Number.isInteger(parsed) || parsed < 0) {
    throw new Error(`invalid keep count: ${value}`);
  }
  return parsed;
}

function timestampSlug(now = new Date()): string {
  return now.toISOString().replace(/[:.]/g, "-");
}

function isInsidePath(path: string, parent: string): boolean {
  const child = relative(parent, path);
  return child === "" || (!child.startsWith("..") && !isAbsolute(child));
}

function isBackupSourcePath(path: string, configDir: string): boolean {
  const backupDir = join(configDir, OMA_AGENTMEMORY_BACKUPS_DIR);
  if (isInsidePath(path, backupDir)) return false;
  if (path === join(configDir, OMA_AGENTMEMORY_PID_FILE)) return false;
  return true;
}

function countBackupFiles(configDir: string): number {
  if (!existsSync(configDir)) return 0;
  let count = 0;
  for (const entry of readdirSync(configDir, { withFileTypes: true })) {
    const path = join(configDir, entry.name);
    if (!isBackupSourcePath(path, configDir)) continue;
    if (entry.isDirectory()) {
      count += countBackupFiles(path);
    } else if (entry.isFile()) {
      count += 1;
    }
  }
  return count;
}

function copyBackupSource(configDir: string, backupPath: string): void {
  mkdirSync(backupPath, { recursive: true, mode: 0o700 });
  for (const entry of readdirSync(configDir, { withFileTypes: true })) {
    const source = join(configDir, entry.name);
    if (!isBackupSourcePath(source, configDir)) continue;
    cpSync(source, join(backupPath, entry.name), { recursive: true });
  }
}

function listBackups(
  backupDir: string,
): Array<{ path: string; mtimeMs: number }> {
  if (!existsSync(backupDir)) return [];
  return readdirSync(backupDir)
    .filter((name) => name.startsWith(OMA_AGENTMEMORY_BACKUP_PREFIX))
    .map((name) => {
      const path = join(backupDir, name);
      return { path, mtimeMs: statSync(path).mtimeMs };
    })
    .sort((a, b) => b.mtimeMs - a.mtimeMs || b.path.localeCompare(a.path));
}

function findSqliteTargets(configDir: string): string[] {
  if (!existsSync(configDir)) return [];
  const backupDir = join(configDir, OMA_AGENTMEMORY_BACKUPS_DIR);
  const targets: string[] = [];
  const visit = (dir: string) => {
    if (isInsidePath(dir, backupDir)) return;
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const path = join(dir, entry.name);
      if (entry.isDirectory()) {
        visit(path);
        continue;
      }
      if (!entry.isFile()) continue;
      if (/\.(db|sqlite|sqlite3)$/i.test(entry.name)) {
        targets.push(path);
      }
    }
  };
  visit(configDir);
  return targets.sort();
}

function runCommand(
  runner: MemoryServiceCommandRunner,
  bin: string,
  args: string[],
): MemoryMaintainCommandResult {
  const result = runner({ bin, args });
  return {
    command: [bin, ...args].join(" "),
    status: result.status,
    error: result.error,
  };
}

export function maintainAgentMemory(
  args: MemoryMaintainOptions,
): MemoryMaintainResult {
  const homeDir = args.homeDir ?? homedir();
  const configDir = agentMemoryConfigDir(homeDir);
  const backupDir = agentMemoryBackupDir(homeDir);
  const keep = parseNonNegativeInteger(args.keep, DEFAULT_BACKUP_KEEP);
  const dryRun = args.dryRun === true;
  const runner = args.runner ?? defaultServiceCommandRunner;
  let backupPath: string | undefined;
  let copiedFiles = 0;
  let prunedBackups: string[] = [];
  let vacuumTargets: string[] = [];
  let vacuumResults: MemoryMaintainCommandResult[] = [];
  let message: string;

  if (args.action === "backup") {
    copiedFiles = countBackupFiles(configDir);
    backupPath = join(
      backupDir,
      `${OMA_AGENTMEMORY_BACKUP_PREFIX}${timestampSlug()}`,
    );
    if (!existsSync(configDir)) {
      message =
        "AgentMemory config directory does not exist; nothing to backup";
    } else if (dryRun) {
      message = "AgentMemory backup would be created";
    } else {
      mkdirSync(backupDir, { recursive: true, mode: 0o700 });
      copyBackupSource(configDir, backupPath);
      message = "AgentMemory backup created";
    }
  } else if (args.action === "prune") {
    const backups = listBackups(backupDir);
    prunedBackups = backups.slice(keep).map((backup) => backup.path);
    if (!dryRun) {
      for (const path of prunedBackups)
        rmSync(path, { recursive: true, force: true });
    }
    message =
      prunedBackups.length === 0
        ? "No AgentMemory backups to prune"
        : dryRun
          ? "AgentMemory backups would be pruned"
          : "AgentMemory backups pruned";
  } else if (args.action === "vacuum") {
    vacuumTargets = findSqliteTargets(configDir);
    if (!dryRun) {
      vacuumResults = vacuumTargets.map((target) =>
        runCommand(runner, "sqlite3", [target, "VACUUM;"]),
      );
    }
    message =
      vacuumTargets.length === 0
        ? "No AgentMemory SQLite files found"
        : dryRun
          ? "AgentMemory SQLite files would be vacuumed"
          : "AgentMemory SQLite vacuum completed";
  } else {
    throw new Error(`invalid AgentMemory maintain action: ${args.action}`);
  }

  return {
    action: args.action,
    homeDir,
    configDir,
    backupDir,
    backupPath,
    copiedFiles,
    prunedBackups,
    vacuumTargets,
    vacuumResults,
    keep,
    dryRun,
    message,
  };
}
