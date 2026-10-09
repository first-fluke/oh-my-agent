/**
 * schedule/runner.ts
 *
 * `oma schedule run <id>` wrapper.
 *
 * Responsibility chain per contract §3:
 * 1. Manifest lookup (missing → exit≠0 + stderr)
 * 1b. maxAgeDays expiry: a recurring job past its window self-removes instead of firing
 * 2. Load capturedEnvRef env if present
 * 3. Run: oma agent spawn <agentId> <prompt|@promptPath> <sessionId> -m <vendor> -w <workspace>
 * 4. Write result to <OMA_HOME>/schedule/runs/<id>/<ISO-ts>.md
 * 5. Update lastFiredAt; if recurring=false self-remove (port.remove + manifest delete)
 * 6. On spawn auth-expiry failure: LOUD-FAIL (exit≠0, stderr "re-auth required: <vendor>")
 *    Never silent-success.
 */

import { spawnSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import * as fs from "node:fs";
import { hostname } from "node:os";
import * as path from "node:path";
import { omaHome } from "../../utils/oma-home.js";
import { resolveOmaInvocation } from "../../utils/oma-invocation.js";
import {
  getEnvFilePath,
  getJobById,
  getRunsDir,
  getScheduleDir,
  removeJob,
  type ScheduleJob,
  updateJob,
} from "./manifest.js";
import { selectAdapter } from "./port.js";

const MS_PER_DAY = 24 * 60 * 60 * 1000;

/**
 * Remove a job from both the OS scheduler and the manifest (best-effort OS
 * cleanup), and delete its captured env file if present. Shared by the
 * one-shot (recurring=false) path and the maxAgeDays expiry path.
 */
async function selfRemove(job: ScheduleJob): Promise<void> {
  try {
    const port = await selectAdapter();
    await port.remove(job.osJobLabel);
  } catch {
    // Best-effort OS cleanup; manifest cleanup proceeds regardless.
  }
  if (job.capturedEnvRef) {
    const envFile = getEnvFilePath(job.id);
    if (fs.existsSync(envFile)) fs.rmSync(envFile);
  }
  removeJob(job.id);
}

/** True when a recurring job has outlived its maxAgeDays window. */
function isExpired(job: ScheduleJob): boolean {
  if (!job.recurring || job.maxAgeDays <= 0) return false;
  const ageMs = Date.now() - new Date(job.createdAt).getTime();
  return ageMs >= job.maxAgeDays * MS_PER_DAY;
}

// ---------------------------------------------------------------------------
// Auth-expiry signal detection
// ---------------------------------------------------------------------------

/** Patterns in stdout/stderr that indicate an expired vendor credential. */
const AUTH_EXPIRY_PATTERNS = [
  /401/,
  /unauthorized/i,
  /authentication.*failed/i,
  /token.*expired/i,
  /credential.*expired/i,
  /re.?auth/i,
  /login.*required/i,
  /not logged in/i,
  /please.*sign in/i,
  /session.*expired/i,
];

function looksLikeAuthFailure(output: string): boolean {
  return AUTH_EXPIRY_PATTERNS.some((p) => p.test(output));
}

// ---------------------------------------------------------------------------
// Env file loading
// ---------------------------------------------------------------------------

function loadCapturedEnv(
  capturedEnvRef: string,
): Record<string, string> | null {
  const fullPath = path.join(getScheduleDir(), capturedEnvRef);
  if (!fs.existsSync(fullPath)) return null;
  try {
    const raw = fs.readFileSync(fullPath, "utf-8");
    return JSON.parse(raw) as Record<string, string>;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Run result logging
// ---------------------------------------------------------------------------

function writeRunResult(
  jobId: string,
  sessionId: string,
  exitCode: number,
  output: string,
): string {
  const runsDir = getRunsDir(jobId);
  if (!fs.existsSync(runsDir)) {
    fs.mkdirSync(runsDir, { recursive: true });
  }

  const ts = new Date().toISOString().replace(/[:.]/g, "-");
  const resultPath = path.join(runsDir, `${ts}.md`);

  const content = [
    `# Schedule Run: ${jobId}`,
    ``,
    `- **Session**: ${sessionId}`,
    `- **Timestamp**: ${new Date().toISOString()}`,
    `- **Exit code**: ${exitCode}`,
    ``,
    `## Output`,
    ``,
    "```",
    output.trim(),
    "```",
  ].join("\n");

  fs.writeFileSync(resultPath, content, { mode: 0o600 });
  return resultPath;
}

// ---------------------------------------------------------------------------
// Main runner
// ---------------------------------------------------------------------------

export interface ScheduledRunOptions {
  omaHome?: string;
  omaStateHome?: string;
}

export async function runScheduledJob(
  id: string,
  options: ScheduledRunOptions = {},
): Promise<void> {
  const previousHome = process.env.OMA_HOME;
  const previousState = process.env.OMA_STATE_HOME;
  process.env.OMA_HOME = omaHome(
    options.omaHome ? { OMA_HOME: options.omaHome } : process.env,
  );
  if (options.omaHome) {
    if (options.omaStateHome) process.env.OMA_STATE_HOME = options.omaStateHome;
    else delete process.env.OMA_STATE_HOME;
  }
  let lease: string | undefined;
  try {
    const leases = path.join(getScheduleDir(), "running");
    fs.mkdirSync(leases, { recursive: true, mode: 0o700 });
    lease = path.join(leases, `${process.pid}-${randomUUID()}.json`);
    fs.writeFileSync(
      lease,
      JSON.stringify({ pid: process.pid, hostname: hostname(), jobId: id }),
      { flag: "wx", mode: 0o600 },
    );
    await runBoundScheduledJob(id);
  } finally {
    if (lease) {
      try {
        fs.unlinkSync(lease);
      } catch {}
    }
    if (previousHome === undefined) delete process.env.OMA_HOME;
    else process.env.OMA_HOME = previousHome;
    if (previousState === undefined) delete process.env.OMA_STATE_HOME;
    else process.env.OMA_STATE_HOME = previousState;
  }
}

async function runBoundScheduledJob(id: string): Promise<void> {
  // 1. Manifest lookup
  const job = getJobById(id);
  if (!job) {
    process.stderr.write(`schedule:run: job "${id}" not found in manifest\n`);
    process.exitCode = 1;
    return;
  }

  // 1b. maxAgeDays expiry: a recurring job past its window self-removes on its
  // next fire instead of running (mirrors a cron scheduler's recurringMaxAge).
  if (isExpired(job)) {
    await selfRemove(job);
    console.log(
      `schedule:run: job "${id}" expired after ${job.maxAgeDays} days; removed.`,
    );
    return;
  }

  if (job.builtin === "harness-evolution") {
    const invocation = resolveOmaInvocation();
    const result = spawnSync(
      invocation.command,
      [...invocation.prefixArgs, "harness", "evolution", "run", "--scheduled"],
      {
        cwd: job.workspace,
        encoding: "utf-8",
        timeout: 60 * 60 * 1000,
      },
    );
    const output = [
      result.stdout ?? "",
      result.stderr ?? "",
      result.error?.message ?? "",
    ]
      .filter(Boolean)
      .join("\n");
    const exitCode = result.status ?? 1;
    writeRunResult(id, `schedule-${id}-${Date.now()}`, exitCode, output);
    updateJob(id, { lastFiredAt: new Date().toISOString() });
    if (exitCode !== 0) process.exitCode = 1;
    return;
  }

  // 2. Load capturedEnvRef env if present
  const extraEnv: Record<string, string> = {};
  if (job.capturedEnvRef) {
    const loaded = loadCapturedEnv(job.capturedEnvRef);
    if (loaded) {
      // Registry selection belongs to the OS registration, not captured job data.
      delete loaded.OMA_HOME;
      delete loaded.OMA_STATE_HOME;
      Object.assign(extraEnv, loaded);
    }
  }

  // 3. Build oma agent spawn invocation
  const sessionId = `schedule-${id}-${Date.now()}`;

  // prompt or @promptPath
  let promptArg: string;
  if (job.promptPath) {
    promptArg = `@${job.promptPath}`;
  } else {
    promptArg = job.prompt ?? "";
  }

  const spawnArgs = ["agent", "spawn", job.agentId, promptArg, sessionId];
  if (job.vendor) {
    spawnArgs.push("--vendor", job.vendor);
  }
  spawnArgs.push("--workspace", job.workspace);

  const mergedEnv: NodeJS.ProcessEnv = { ...process.env, ...extraEnv };

  const invocation = resolveOmaInvocation();
  const result = spawnSync(
    invocation.command,
    [...invocation.prefixArgs, ...spawnArgs],
    {
      env: mergedEnv,
      encoding: "utf-8",
      // Allow up to 1 hour for a single scheduled run
      timeout: 60 * 60 * 1000,
    },
  );

  const combinedOutput = [
    result.stdout ?? "",
    result.stderr ?? "",
    result.error ? result.error.message : "",
  ]
    .filter(Boolean)
    .join("\n");

  const exitCode = result.status ?? 1;

  // 4. Write run result to <OMA_HOME>/schedule/runs/<id>/<ts>.md
  writeRunResult(id, sessionId, exitCode, combinedOutput);

  // 5. Update lastFiredAt
  updateJob(id, { lastFiredAt: new Date().toISOString() });

  // 6. Auth-expiry loud-fail check
  if (exitCode !== 0 && looksLikeAuthFailure(combinedOutput)) {
    const vendor = job.vendor ?? "unknown";
    process.stderr.write(`re-auth required: ${vendor}\n`);
    process.exitCode = 1;
    return;
  }

  // Non-zero exit for non-auth reasons — still propagate failure
  if (exitCode !== 0) {
    process.stderr.write(
      `schedule:run: job "${id}" (agent:spawn) exited with code ${exitCode}\n`,
    );
    process.exitCode = 1;
    return;
  }

  // recurring=false → self-remove after successful fire
  if (!job.recurring) {
    await selfRemove(job);
  }
}
