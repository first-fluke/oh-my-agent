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
 * 4. Write result to ~/.agents/schedule/runs/<id>/<ISO-ts>.md
 * 5. Update lastFiredAt; if recurring=false self-remove (port.remove + manifest delete)
 * 6. On spawn auth-expiry failure: LOUD-FAIL (exit≠0, stderr "re-auth required: <vendor>")
 *    Never silent-success.
 */

import { spawnSync } from "node:child_process";
import * as fs from "node:fs";
import * as path from "node:path";
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

export async function runScheduledJob(id: string): Promise<void> {
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

  // 2. Load capturedEnvRef env if present
  const extraEnv: Record<string, string> = {};
  if (job.capturedEnvRef) {
    const loaded = loadCapturedEnv(job.capturedEnvRef);
    if (loaded) {
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

  // Resolve the oma binary: prefer the same binary that's currently running.
  const omaBin =
    process.argv[0] === process.execPath ? (process.argv[1] ?? "oma") : "oma";

  const result = spawnSync(omaBin, spawnArgs, {
    env: mergedEnv,
    encoding: "utf-8",
    // Allow up to 1 hour for a single scheduled run
    timeout: 60 * 60 * 1000,
  });

  const combinedOutput = [
    result.stdout ?? "",
    result.stderr ?? "",
    result.error ? result.error.message : "",
  ]
    .filter(Boolean)
    .join("\n");

  const exitCode = result.status ?? 1;

  // 4. Write run result to ~/.agents/schedule/runs/<id>/<ts>.md
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
