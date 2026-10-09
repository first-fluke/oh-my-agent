/**
 * serena-reaper-runtime.ts
 *
 * Filesystem + process side-effects glue for the `oma serena reap` command.
 * Kept separate from the pure core module (cli/io/serena-reaper.ts) so side
 * effects are isolated and testable via injection.
 *
 * Responsibilities:
 *   - Run `ps` and collect output
 *   - Scan ~/.serena/logs/<date>/mcp_*_<PID>.txt for activity signals
 *   - Load oma-config.yaml from the agents config directory
 *   - Write per-reap log entries to ~/.serena/logs/oma-reaper.log (T1-4)
 *   - Build the real KillAdapter (process.kill)
 */

import { spawnSync } from "node:child_process";
import {
  appendFileSync,
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  statSync,
} from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { loadConfigLayers } from "../utils/config-layers.js";
import type {
  ActivitySignal,
  KillAdapter,
  ReapTarget,
  SerenaRoot,
} from "./serena-reaper.js";
import { resolveActivitySignal } from "./serena-reaper.js";

// ---------------------------------------------------------------------------
// ps invocation
// ---------------------------------------------------------------------------

/**
 * Run `ps -axo pid,ppid,rss,command` and return the raw output string.
 * Returns empty string on error (reaper is best-effort; errors should not crash).
 */
export function runPs(): string {
  try {
    const result = spawnSync("ps", ["-axo", "pid,ppid,rss,command"], {
      encoding: "utf-8",
      timeout: 5000,
    });
    return result.stdout ?? "";
  } catch {
    return "";
  }
}

// ---------------------------------------------------------------------------
// Serena log scanning
// ---------------------------------------------------------------------------

const SERENA_LOGS_DIR = join(homedir(), ".serena", "logs");
const REAPER_LOG_PATH = join(SERENA_LOGS_DIR, "oma-reaper.log");

/**
 * Get today's Serena log directory: ~/.serena/logs/<YYYY-MM-DD>/
 */
function todayLogDir(): string {
  const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
  return join(SERENA_LOGS_DIR, today);
}

/**
 * Scan Serena log files in today's log directory and return a map from
 * root PID to the log file content + mtime.
 *
 * Log files are named: mcp_*_<PID>.txt
 * The PID in the filename is the Serena root process PID.
 */
export interface SerenaLogEntry {
  content: string;
  mtimeMs: number;
}

export function scanSerenaLogs(): Map<number, SerenaLogEntry> {
  const result = new Map<number, SerenaLogEntry>();
  const logDir = todayLogDir();
  if (!existsSync(logDir)) return result;

  let files: string[];
  try {
    files = readdirSync(logDir);
  } catch {
    return result;
  }

  for (const file of files) {
    // Pattern: mcp_*_<PID>.txt
    const match = file.match(/^mcp_.*_(\d+)\.txt$/);
    if (!match?.[1]) continue;
    const pid = Number(match[1]);
    if (!Number.isFinite(pid)) continue;

    const filePath = join(logDir, file);
    try {
      const stat = statSync(filePath);
      const content = readFileSync(filePath, "utf-8");
      result.set(pid, { content, mtimeMs: stat.mtimeMs });
    } catch {
      // best-effort: skip unreadable log files
    }
  }

  return result;
}

/**
 * Build an activity resolver function using the Serena log scan results.
 * Falls back through the 3-tier chain (log → mtime → cpu → now).
 */
export function buildActivityResolver(
  logEntries: Map<number, SerenaLogEntry>,
): (rootPid: number) => ActivitySignal {
  return (rootPid: number): ActivitySignal => {
    const entry = logEntries.get(rootPid);
    return resolveActivitySignal(
      entry?.content,
      entry?.mtimeMs,
      undefined,
      Date.now(),
    );
  };
}

// ---------------------------------------------------------------------------
// Config loading
// ---------------------------------------------------------------------------

/**
 * Resolve the oma-config.yaml path for the current install context.
 * Checks project-local first (.agents/oma-config.yaml in cwd), then global
 * (~/.agents/oma-config.yaml).
 */
export function resolveOmaConfigPath(): string | undefined {
  try {
    const { sources } = loadConfigLayers();
    return (
      sources.local ?? sources.shared ?? sources.globalLocal ?? sources.global
    );
  } catch {
    return undefined;
  }
}

/**
 * Load the raw YAML/JSON content of oma-config (CUE or YAML).
 * Returns empty string if not found.
 */
export function loadOmaConfigContent(): string {
  try {
    return JSON.stringify(loadConfigLayers().config);
  } catch {
    return "";
  }
}

// ---------------------------------------------------------------------------
// Reaper log writer (T1-4)
// ---------------------------------------------------------------------------

/**
 * Append a reap event to ~/.serena/logs/oma-reaper.log.
 * Format: ISO timestamp  reaped <project> LSPs (idle <N>m, freed <M>MB)
 */
export function appendReaperLog(entries: ReaperLogEntry[]): void {
  if (entries.length === 0) return;

  try {
    mkdirSync(SERENA_LOGS_DIR, { recursive: true });
    const timestamp = new Date().toISOString();
    const lines = entries
      .map(
        (e) =>
          `${timestamp}  reaped ${e.project} LSPs (idle ${e.idleMinutes}m, freed ${e.freedMb.toFixed(0)}MB)`,
      )
      .join("\n");
    appendFileSync(REAPER_LOG_PATH, `${lines}\n`, "utf-8");
  } catch {
    // best-effort: log write failure must not abort the reap
  }
}

export interface ReaperLogEntry {
  project: string;
  idleMinutes: number;
  freedMb: number;
}

/**
 * Build reaper log entries from reap targets and the current time.
 */
export function buildReaperLogEntries(
  targets: ReapTarget[],
  nowMs: number = Date.now(),
): ReaperLogEntry[] {
  return targets.map((t) => ({
    project: t.root.project,
    idleMinutes: Math.floor((nowMs - t.root.lastActivityMs) / 60_000),
    freedMb: t.projectedFreedRssMb,
  }));
}

// ---------------------------------------------------------------------------
// Real KillAdapter
// ---------------------------------------------------------------------------

/**
 * Build the real KillAdapter using process.kill.
 * Injectable for tests via the mock in serena-reaper.ts.
 */
export function buildRealKillAdapter(): KillAdapter {
  return {
    kill(pid: number, signal: NodeJS.Signals): boolean {
      try {
        process.kill(pid, signal);
        return true;
      } catch {
        return false;
      }
    },
    isAlive(pid: number): boolean {
      try {
        process.kill(pid, 0);
        return true;
      } catch {
        return false;
      }
    },
    sleep(ms: number): Promise<void> {
      return new Promise((resolve) => setTimeout(resolve, ms));
    },
    readCommand(pid: number): string | undefined {
      try {
        const result = spawnSync("ps", ["-p", String(pid), "-o", "command="], {
          encoding: "utf-8",
          timeout: 2000,
        });
        const out = result.stdout?.trim();
        return out ? out : undefined;
      } catch {
        return undefined;
      }
    },
  };
}

// ---------------------------------------------------------------------------
// Human-readable output helpers
// ---------------------------------------------------------------------------

/**
 * Format reap targets as a summary table for dry-run or pre-kill display.
 * Returns lines ready for console output.
 */
export function formatReapSummary(
  roots: SerenaRoot[],
  targets: ReapTarget[],
  nowMs: number = Date.now(),
): string[] {
  const lines: string[] = [];

  if (roots.length === 0) {
    lines.push("No active Serena roots found.");
    return lines;
  }

  lines.push(
    `Found ${roots.length} Serena root(s), ${targets.length} reap target(s):\n`,
  );

  for (const root of roots) {
    const isTarget = targets.some((t) => t.root.pid === root.pid);
    const idleMs = nowMs - root.lastActivityMs;
    const idleMin = Math.floor(idleMs / 60_000);
    const lspRssMb = root.lspChildren.reduce((s, l) => s + l.rssMb, 0);
    const marker = isTarget ? "[REAP]" : "[KEEP]";
    const lspNames = root.lspChildren.map((l) => l.name).join(", ") || "none";

    lines.push(`  ${marker} ${root.project} (PID ${root.pid})`);
    lines.push(`    Signal source: ${root.signalSource}`);
    lines.push(`    Idle: ${idleMin}m  LSP RSS: ${lspRssMb.toFixed(1)} MB`);
    lines.push(`    LSPs: ${lspNames}`);

    if (isTarget) {
      const t = targets.find((t) => t.root.pid === root.pid);
      if (t) lines.push(`    Reason: ${t.reason}`);
    }
    lines.push("");
  }

  const totalFreed = targets.reduce((s, t) => s + t.projectedFreedRssMb, 0);
  if (targets.length > 0) {
    lines.push(`Projected freed: ${totalFreed.toFixed(1)} MB`);
  } else {
    lines.push("Nothing to reap.");
  }

  return lines;
}
