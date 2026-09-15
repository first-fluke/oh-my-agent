import {
  closeSync,
  existsSync,
  mkdirSync,
  openSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { AGENTS_DIR } from "../constants/paths.js";
import type { AgentRun } from "./agent-results.js";

export type EvolutionMode = "apply" | "propose";

export interface HarnessEvolutionConfig {
  schemaVersion: 1;
  enabled: boolean;
  cron: string;
  mode: EvolutionMode;
  maxDispatches: number;
  scheduleId?: string;
  updatedAt: string;
}

export interface HarnessEvolutionEvidence {
  schemaVersion: 1;
  runId: string;
  agentId: string;
  taskId: string;
  sessionId: string;
  status: AgentRun["status"];
  finishedAt?: string;
  checks: Array<{ checkId?: string; exitCode: number | null }>;
  output?: AgentRun["output"];
}

export interface EvolutionRetry {
  key: string;
  kind: "capture" | "optimize";
  incidentId?: string;
  skill?: string;
  attemptCount: number;
  nextAttemptAt: string;
  lastError?: string;
  completedAt?: string;
  evidenceHash?: string;
}

export interface HarnessEvolutionState {
  schemaVersion: 1;
  retries: EvolutionRetry[];
  lastTick?: {
    at: string;
    dispatchesUsed: number;
    maxDispatches: number;
    status: "completed" | "partial" | "failed" | "disabled";
    reportPath?: string;
    error?: string;
  };
}

const CONFIG_FILE = "harness-evolution.json";
const DEFAULT_CRON = "0 3 * * *";

function evolutionDir(root: string): string {
  return join(root, AGENTS_DIR, "evolution");
}

function stateDir(root: string): string {
  return join(root, AGENTS_DIR, "state", "harness-evolution");
}

export function harnessEvolutionConfigPath(root: string): string {
  return join(evolutionDir(root), CONFIG_FILE);
}

export function harnessEvolutionStatePath(root: string): string {
  return join(stateDir(root), "state.json");
}

export function harnessEvolutionEvidencePath(
  root: string,
  runId: string,
): string {
  return join(stateDir(root), "evidence", `${runId}.json`);
}

export function harnessEvolutionLockPath(root: string): string {
  return join(stateDir(root), "tick.sqlite");
}

export function defaultHarnessEvolutionConfig(): HarnessEvolutionConfig {
  return {
    schemaVersion: 1,
    enabled: false,
    cron: DEFAULT_CRON,
    mode: "apply",
    maxDispatches: 0,
    updatedAt: new Date().toISOString(),
  };
}

export function readHarnessEvolutionConfig(
  root: string,
): HarnessEvolutionConfig {
  const path = harnessEvolutionConfigPath(root);
  if (!existsSync(path)) return defaultHarnessEvolutionConfig();
  const raw = JSON.parse(
    readFileSync(path, "utf8"),
  ) as Partial<HarnessEvolutionConfig>;
  if (
    raw.schemaVersion !== 1 ||
    typeof raw.enabled !== "boolean" ||
    typeof raw.cron !== "string" ||
    (raw.mode !== "apply" && raw.mode !== "propose") ||
    !Number.isSafeInteger(raw.maxDispatches) ||
    (raw.maxDispatches ?? -1) < 0
  ) {
    throw new Error(`Invalid harness evolution config: ${path}`);
  }
  return raw as HarnessEvolutionConfig;
}

export function writeHarnessEvolutionConfig(
  root: string,
  config: HarnessEvolutionConfig,
): void {
  const path = harnessEvolutionConfigPath(root);
  mkdirSync(dirname(path), { recursive: true, mode: 0o700 });
  writeFileSync(path, `${JSON.stringify(config, null, 2)}\n`, { mode: 0o600 });
}

export function readHarnessEvolutionState(root: string): HarnessEvolutionState {
  const path = harnessEvolutionStatePath(root);
  if (!existsSync(path)) return { schemaVersion: 1, retries: [] };
  const state = JSON.parse(readFileSync(path, "utf8")) as HarnessEvolutionState;
  if (state.schemaVersion !== 1 || !Array.isArray(state.retries))
    throw new Error(`Invalid harness evolution state: ${path}`);
  return state;
}

export function writeHarnessEvolutionState(
  root: string,
  state: HarnessEvolutionState,
): void {
  const path = harnessEvolutionStatePath(root);
  mkdirSync(dirname(path), { recursive: true, mode: 0o700 });
  writeFileSync(path, `${JSON.stringify(state, null, 2)}\n`, { mode: 0o600 });
}

/** Records references only. It never copies captured output or invokes a model. */
export function recordHarnessEvolutionEvidence(
  root: string,
  run: AgentRun,
): void {
  if (run.status === "running") return;
  const path = harnessEvolutionEvidencePath(root, run.runId);
  if (existsSync(path)) return;
  mkdirSync(dirname(path), { recursive: true, mode: 0o700 });
  const evidence: HarnessEvolutionEvidence = {
    schemaVersion: 1,
    runId: run.runId,
    agentId: run.agentId,
    taskId: run.taskId,
    sessionId: run.sessionId,
    status: run.status,
    finishedAt: run.finishedAt,
    checks: run.checks.map(({ checkId, exitCode }) => ({ checkId, exitCode })),
    output: run.output,
  };
  try {
    const fd = openSync(path, "wx", 0o600);
    try {
      writeFileSync(fd, `${JSON.stringify(evidence, null, 2)}\n`);
    } finally {
      // writeFileSync does not own an fd supplied by the caller.
      try {
        closeSync(fd);
      } catch {
        /* best effort */
      }
    }
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "EEXIST") throw error;
  }
}

export interface HarnessEvolutionLock {
  release(): void;
}

/**
 * An OS-released SQLite write transaction. Unlike a PID file, `BEGIN
 * IMMEDIATE` cannot strand after a crash and has no stale-owner race.
 */
export function acquireHarnessEvolutionLock(
  root: string,
): HarnessEvolutionLock | undefined {
  const path = harnessEvolutionLockPath(root);
  mkdirSync(dirname(path), { recursive: true, mode: 0o700 });
  if (typeof process.versions.bun === "string") {
    // Do not statically import bun:sqlite: Node's resolver cannot load it.
    const require = createRequire(import.meta.url);
    const { Database } = require("bun:sqlite") as {
      Database: new (
        path: string,
      ) => {
        exec(statement: string): void;
        close(): void;
      };
    };
    const db = new Database(path);
    try {
      db.exec("PRAGMA busy_timeout = 0");
      db.exec("BEGIN IMMEDIATE");
      return {
        release: () => {
          try {
            db.exec("ROLLBACK");
          } finally {
            db.close();
          }
        },
      };
    } catch {
      try {
        db.close();
      } catch {
        // Best effort; this is the busy path.
      }
      return undefined;
    }
  }
  const require = createRequire(import.meta.url);
  const NodeDatabase = require("better-sqlite3") as new (
    path: string,
  ) => {
    pragma(statement: string): void;
    exec(statement: string): void;
    close(): void;
  };
  const db = new NodeDatabase(path);
  try {
    db.pragma("busy_timeout = 0");
    db.exec("BEGIN IMMEDIATE");
    return {
      release: () => {
        try {
          db.exec("ROLLBACK");
        } finally {
          db.close();
        }
      },
    };
  } catch {
    try {
      db.close();
    } catch {
      // Best effort; this is the busy path.
    }
    return undefined;
  }
}

export function retryBackoff(attemptCount: number, now = Date.now()): string {
  const minutes = Math.min(24 * 60, 2 ** Math.min(attemptCount, 10));
  return new Date(now + minutes * 60_000).toISOString();
}
