/**
 * schedule/manifest.ts
 *
 * SSOT manifest for oma schedule jobs.
 * Storage: ~/.agents/schedule/schedules.json (global-only, 0600)
 * Directory: ~/.agents/schedule/ (0700)
 *
 * Schema per docs/plans/contracts/schedule-scheduler-port.md §1
 */

import { execSync } from "node:child_process";
import * as fs from "node:fs";
import { homedir } from "node:os";
import * as path from "node:path";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ScheduleJob {
  /** oma-assigned stable id: sch_<base32-12> */
  id: string;
  /** Standard 5-field cron expression, local time */
  cron: string;
  /** agent:spawn <agent-id> */
  agentId: string;
  /** Inline prompt text. XOR with promptPath. */
  prompt: string | null;
  /** File path to prompt. XOR with prompt. */
  promptPath: string | null;
  /** agent:spawn -m <vendor>. null = auto-detect. */
  vendor: string | null;
  /** Absolute path used as -w for agent:spawn. Captured at registration time. */
  workspace: string;
  /** git root basename of workspace, else dir basename. Display only. */
  projectLabel: string;
  /** true = repeat on schedule; false = fire once then self-remove */
  recurring: boolean;
  /** Auto-expire after N days (0 = indefinite). */
  maxAgeDays: number;
  /** Relative path to env file under ~/.agents/schedule/ (e.g. "env/sch_x"). null if none. */
  capturedEnvRef: string | null;
  /** ISO-8601 creation timestamp */
  createdAt: string;
  /** ISO-8601 last-fired timestamp, null if never fired */
  lastFiredAt: string | null;
  /** OS backend that owns the OS job: "launchd" | "systemd" | "crontab" | "schtasks" */
  osBackend: string;
  /** OS-side job label, e.g. "dev.oma.sch_xxxxx" */
  osJobLabel: string;
  /** Fixed internal job. Absent means the legacy agent:spawn job shape. */
  builtin?: "harness-evolution";
}

export interface ScheduleManifest {
  version: 1;
  jobs: ScheduleJob[];
}

// ---------------------------------------------------------------------------
// Paths
// ---------------------------------------------------------------------------

export function getScheduleDir(): string {
  return path.join(homedir(), ".agents", "schedule");
}

export function getManifestPath(): string {
  return path.join(getScheduleDir(), "schedules.json");
}

export function getEnvFilePath(id: string): string {
  return path.join(getScheduleDir(), "env", id);
}

export function getRunsDir(id: string): string {
  return path.join(getScheduleDir(), "runs", id);
}

// ---------------------------------------------------------------------------
// Directory + file initialisation
// ---------------------------------------------------------------------------

function ensureScheduleDir(): void {
  const dir = getScheduleDir();
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true, mode: 0o700 });
  }
}

function ensureManifestFile(): void {
  ensureScheduleDir();
  const manifestPath = getManifestPath();
  if (!fs.existsSync(manifestPath)) {
    const empty: ScheduleManifest = { version: 1, jobs: [] };
    fs.writeFileSync(manifestPath, JSON.stringify(empty, null, 2), {
      mode: 0o600,
    });
  }
}

// ---------------------------------------------------------------------------
// Read / Write
// ---------------------------------------------------------------------------

export function readManifest(): ScheduleManifest {
  ensureManifestFile();
  const raw = fs.readFileSync(getManifestPath(), "utf-8");
  return JSON.parse(raw) as ScheduleManifest;
}

export function writeManifest(manifest: ScheduleManifest): void {
  ensureScheduleDir();
  const manifestPath = getManifestPath();
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2), {
    mode: 0o600,
  });
  // Force 0600 even if file already existed with different perms.
  fs.chmodSync(manifestPath, 0o600);
}

export function getJobById(id: string): ScheduleJob | undefined {
  const manifest = readManifest();
  return manifest.jobs.find((j) => j.id === id);
}

export function addJob(job: ScheduleJob): void {
  const manifest = readManifest();
  manifest.jobs.push(job);
  writeManifest(manifest);
}

export function updateJob(
  id: string,
  patch: Partial<ScheduleJob>,
): ScheduleJob | null {
  const manifest = readManifest();
  const index = manifest.jobs.findIndex((j) => j.id === id);
  if (index === -1) return null;
  const existing = manifest.jobs[index];
  if (!existing) return null;
  const updated = { ...existing, ...patch };
  manifest.jobs[index] = updated;
  writeManifest(manifest);
  return updated;
}

export function removeJob(id: string): boolean {
  const manifest = readManifest();
  const before = manifest.jobs.length;
  manifest.jobs = manifest.jobs.filter((j) => j.id !== id);
  if (manifest.jobs.length === before) return false;
  writeManifest(manifest);
  return true;
}

// ---------------------------------------------------------------------------
// ID generation: sch_<base32-12>
// ---------------------------------------------------------------------------

const BASE32_ALPHABET = "abcdefghijklmnopqrstuvwxyz234567";

export function generateJobId(): string {
  const bytes = new Uint8Array(8);
  crypto.getRandomValues(bytes);
  // Encode 8 bytes → 13 base32 chars, take 12
  let result = "";
  let bits = 0;
  let value = 0;
  for (const byte of bytes) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      bits -= 5;
      result += BASE32_ALPHABET[(value >> bits) & 0x1f];
    }
  }
  // Pad if needed
  if (bits > 0) {
    result += BASE32_ALPHABET[(value << (5 - bits)) & 0x1f];
  }
  return `sch_${result.slice(0, 12)}`;
}

// ---------------------------------------------------------------------------
// projectLabel derivation
// ---------------------------------------------------------------------------

export function deriveProjectLabel(workspace: string): string {
  try {
    const gitRoot = execSync("git rev-parse --show-toplevel", {
      cwd: workspace,
      encoding: "utf-8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
    return path.basename(gitRoot);
  } catch {
    return path.basename(workspace);
  }
}

// ---------------------------------------------------------------------------
// Cron validation (5-field)
// ---------------------------------------------------------------------------

const CRON_FIELD_RANGES = [
  { name: "minute", min: 0, max: 59 },
  { name: "hour", min: 0, max: 23 },
  { name: "day-of-month", min: 1, max: 31 },
  { name: "month", min: 1, max: 12 },
  { name: "day-of-week", min: 0, max: 7 },
] as const;

function validateCronField(
  field: string,
  min: number,
  max: number,
  name: string,
): void {
  if (field === "*") return;
  // Step: */n or m-n/n
  const stepMatch = /^(\*|(\d+)-(\d+))\/(\d+)$/.exec(field);
  if (stepMatch) {
    const step = Number(stepMatch[4]);
    if (step < 1) throw new Error(`cron field ${name}: step must be >= 1`);
    // Bound-check the m-n range part when present
    if (stepMatch[2] !== undefined && stepMatch[3] !== undefined) {
      const lo = Number(stepMatch[2]);
      const hi = Number(stepMatch[3]);
      if (lo < min || hi > max || lo > hi) {
        throw new Error(
          `cron field ${name}: range ${lo}-${hi} in step expression out of bounds [${min},${max}]`,
        );
      }
    }
    return;
  }
  // Range: m-n
  const rangeMatch = /^(\d+)-(\d+)$/.exec(field);
  if (rangeMatch) {
    const lo = Number(rangeMatch[1]);
    const hi = Number(rangeMatch[2]);
    if (lo < min || hi > max || lo > hi)
      throw new Error(`cron field ${name}: range ${lo}-${hi} out of bounds`);
    return;
  }
  // List: a,b,c
  if (field.includes(",")) {
    for (const part of field.split(",")) {
      validateCronField(part, min, max, name);
    }
    return;
  }
  // Single number
  const n = Number(field);
  if (!Number.isInteger(n) || n < min || n > max) {
    throw new Error(
      `cron field ${name}: "${field}" out of bounds [${min},${max}]`,
    );
  }
}

export function validateCronExpression(expr: string): void {
  const fields = expr.trim().split(/\s+/);
  if (fields.length !== 5) {
    throw new Error(
      `cron expression must have exactly 5 fields, got ${fields.length}: "${expr}"`,
    );
  }
  for (let i = 0; i < 5; i++) {
    const range = CRON_FIELD_RANGES[i];
    const field = fields[i];
    if (!range || field === undefined) break;
    validateCronField(field, range.min, range.max, range.name);
  }
}
