/**
 * schedule/command.ts
 *
 * CLI surface for `oma schedule <action>` commands.
 *
 * Commands: schedule:add, schedule:list, schedule:remove, schedule:run, schedule:sync
 * No --global flag — schedule is always user-global by design.
 *
 * Per docs/plans/contracts/schedule-scheduler-port.md §4
 */

import * as fs from "node:fs";
import * as path from "node:path";
import type { Command } from "commander";
import {
  findStaleLabels,
  type SyncSchedulesResult,
  syncSchedules,
} from "../../io/schedule/sync.js";
import {
  addOutputOptions,
  resolveJsonMode,
  runAction,
} from "../../utils/cli-framework.js";
import { resolveOmaInvocation } from "../../utils/oma-invocation.js";
import { parseIntervalToCron } from "./cron-nl.js";
import {
  addJob,
  deriveProjectLabel,
  generateJobId,
  getEnvFilePath,
  getJobById,
  readManifest,
  removeJob,
  updateJob,
  validateCronExpression,
} from "./manifest.js";
import { type SchedulerPort, selectAdapter } from "./port.js";
import { runScheduledJob } from "./runner.js";

export { type SyncSchedulesResult, syncSchedules };

// ---------------------------------------------------------------------------
// schedule:add
// ---------------------------------------------------------------------------

/**
 * Capture ONLY the explicitly named env vars into ~/.agents/schedule/env/<id>
 * (file 0600, dir 0700). Never dumps the whole environment. Returns the
 * relative capturedEnvRef ("env/<id>") or null when nothing was captured.
 */
function captureEnv(id: string, keysCsv: string): string | null {
  const keys = keysCsv
    .split(",")
    .map((k) => k.trim())
    .filter(Boolean);
  if (keys.length === 0) return null;

  const captured: Record<string, string> = {};
  for (const key of keys) {
    const value = process.env[key];
    if (value === undefined) {
      process.stderr.write(
        `Warning: --env "${key}" is not set in the current environment; skipping.\n`,
      );
      continue;
    }
    captured[key] = value;
  }
  if (Object.keys(captured).length === 0) return null;

  const envFile = getEnvFilePath(id);
  const envDir = path.dirname(envFile);
  if (!fs.existsSync(envDir)) {
    fs.mkdirSync(envDir, { recursive: true, mode: 0o700 });
  }
  fs.writeFileSync(envFile, JSON.stringify(captured, null, 2), { mode: 0o600 });
  fs.chmodSync(envFile, 0o600);

  return path.join("env", id);
}

/** Vendors accepted by `--model`; mirrors the `oma agent spawn -m` surface. */
const SCHEDULE_VENDORS = [
  "antigravity",
  "claude",
  "codex",
  "cursor",
  "grok",
  "opencode",
  "pi",
  "qwen",
] as const;

async function scheduleAdd(
  agentId: string,
  prompt: string,
  options: {
    cron?: string;
    every?: string;
    model?: string;
    workspace?: string;
    once?: boolean;
    maxAgeDays?: string;
    env?: string;
    dryRun?: boolean;
    acceptRounded?: boolean;
  },
): Promise<void> {
  // Mutual exclusivity: exactly one of --cron or --every is required
  if (options.cron !== undefined && options.every !== undefined) {
    throw new Error(
      "--cron and --every are mutually exclusive; provide exactly one.",
    );
  }
  if (options.cron === undefined && options.every === undefined) {
    throw new Error("Either --cron or --every is required.");
  }

  if (
    options.model !== undefined &&
    !(SCHEDULE_VENDORS as readonly string[]).includes(options.model)
  ) {
    throw new Error(
      `Unknown vendor "${options.model}" for --model. ` +
        `Valid vendors: ${SCHEDULE_VENDORS.join(", ")}.`,
    );
  }

  let cronExpr: string;
  let rounded: string | undefined;
  if (options.every !== undefined) {
    const parsed = parseIntervalToCron(options.every);
    cronExpr = parsed.cron;
    rounded = parsed.rounded;
  } else {
    // options.cron is defined here (narrowed above)
    cronExpr = options.cron as string;
    validateCronExpression(cronExpr);
  }

  const maxAgeDays = options.maxAgeDays ? Number(options.maxAgeDays) : 0;
  if (
    options.maxAgeDays !== undefined &&
    (!Number.isInteger(maxAgeDays) || maxAgeDays < 0)
  ) {
    throw new Error("--max-age-days must be a non-negative integer");
  }

  // Resolve before generating IDs, touching the OS scheduler, manifest, or a
  // secret-bearing env file. A preview is intentionally side-effect free.
  if (options.dryRun) {
    console.log(`Preview: requested interval resolves to ${cronExpr}`);
    if (rounded) console.log(`Note: ${rounded}`);
    console.log(
      "Preview only: no OS job, manifest entry, or env file was written.",
    );
    return;
  }
  if (rounded && !options.acceptRounded) {
    console.log(`Note: ${rounded}`);
    throw new Error(
      "Interval was rounded. Review with --dry-run, then re-run with --accept-rounded to register it.",
    );
  }
  if (rounded) console.log(`Note: ${rounded}`);

  const workspace = options.workspace
    ? path.resolve(options.workspace)
    : process.cwd();

  const projectLabel = deriveProjectLabel(workspace);
  const id = generateJobId();
  const osJobLabel = `dev.oma.${id}`;
  const recurring = !options.once;

  const port = await selectAdapter();

  // Capture named env vars (only those) for the headless run, if requested.
  const capturedEnvRef = options.env ? captureEnv(id, options.env) : null;

  const job = {
    id,
    cron: cronExpr,
    agentId,
    prompt,
    promptPath: null,
    vendor: options.model ?? null,
    workspace,
    projectLabel,
    recurring,
    maxAgeDays,
    capturedEnvRef,
    createdAt: new Date().toISOString(),
    lastFiredAt: null,
    osBackend: await getAdapterName(port),
    osJobLabel,
  };

  // Register with OS scheduler first, then write manifest (fail-safe ordering)
  await port.upsert({
    id,
    cron: cronExpr,
    command: [
      resolveOmaInvocation().command,
      ...resolveOmaInvocation().prefixArgs,
      "schedule",
      "run",
      id,
    ],
    label: osJobLabel,
    workspace,
  });

  addJob(job);

  console.log(`Scheduled job registered: ${id}`);
  console.log(`  Agent:   ${agentId}`);
  console.log(`  Cron:    ${cronExpr}`);
  console.log(`  Vendor:  ${options.model ?? "auto"}`);
  console.log(`  Project: ${projectLabel}`);
  console.log(`  Once:    ${!recurring}`);
}

async function scheduleBuiltinEvolutionAdd(
  workspaceArg: string,
  options: { cron: string },
): Promise<void> {
  validateCronExpression(options.cron);
  const workspace = path.resolve(workspaceArg);
  const existing = readManifest().jobs.find(
    (job) => job.builtin === "harness-evolution" && job.workspace === workspace,
  );
  if (existing) {
    const port = await selectAdapter();
    await port.upsert({
      id: existing.id,
      cron: options.cron,
      command: [
        resolveOmaInvocation().command,
        ...resolveOmaInvocation().prefixArgs,
        "schedule",
        "run",
        existing.id,
      ],
      label: existing.osJobLabel,
      workspace,
    });
    updateJob(existing.id, {
      cron: options.cron,
      osBackend: await getAdapterName(port),
    });
    console.log(
      JSON.stringify({ id: existing.id, existing: true, repaired: true }),
    );
    return;
  }
  const id = generateJobId();
  const port = await selectAdapter();
  const job = {
    id,
    cron: options.cron,
    // Legacy fields stay populated so old manifest readers keep working.
    agentId: "__builtin__",
    prompt: null,
    promptPath: null,
    vendor: null,
    workspace,
    projectLabel: deriveProjectLabel(workspace),
    recurring: true,
    maxAgeDays: 0,
    capturedEnvRef: null,
    createdAt: new Date().toISOString(),
    lastFiredAt: null,
    osBackend: await getAdapterName(port),
    osJobLabel: `dev.oma.${id}`,
    builtin: "harness-evolution" as const,
  };
  await port.upsert({
    id,
    cron: job.cron,
    command: [
      resolveOmaInvocation().command,
      ...resolveOmaInvocation().prefixArgs,
      "schedule",
      "run",
      id,
    ],
    label: job.osJobLabel,
    workspace,
  });
  addJob(job);
  console.log(JSON.stringify({ id, existing: false }));
}

/** Derive a human-readable adapter name for the manifest osBackend field. */
async function getAdapterName(
  port: Awaited<ReturnType<typeof selectAdapter>>,
): Promise<string> {
  const name = port.constructor.name;
  if (name.includes("Launchd")) return "launchd";
  if (name.includes("Systemd")) return "systemd";
  if (name.includes("Crontab")) return "crontab";
  if (name.includes("Schtasks")) return "schtasks";
  return "unknown";
}

// ---------------------------------------------------------------------------
// schedule:list
// ---------------------------------------------------------------------------

type DriftState = "synced" | "stale" | "missing-in-os" | "orphan-in-os";

interface ListEntry {
  id: string;
  cron: string;
  agentId: string;
  vendor: string;
  projectLabel: string;
  workspace: string;
  recurring: boolean;
  lastFiredAt: string | null;
  osBackend: string;
  drift: DriftState;
}

async function scheduleList(options: {
  json?: boolean;
  output?: string;
}): Promise<void> {
  const jsonMode = resolveJsonMode(options);
  const manifest = readManifest();

  let osLabels: string[] = [];
  let port: SchedulerPort | null = null;
  try {
    port = await selectAdapter();
    osLabels = await port.listLabels();
  } catch {
    // Non-fatal: if no adapter is available, all jobs show as missing-in-os
  }

  const osLabelSet = new Set(osLabels);
  const manifestLabelSet = new Set(manifest.jobs.map((j) => j.osJobLabel));
  const staleLabels = port
    ? await findStaleLabels(port, manifest.jobs, osLabelSet)
    : new Set<string>();

  // Build manifest entries with drift state
  const entries: ListEntry[] = manifest.jobs.map((job) => ({
    id: job.id,
    cron: job.cron,
    agentId: job.agentId,
    vendor: job.vendor ?? "auto",
    projectLabel: job.projectLabel,
    workspace: job.workspace,
    recurring: job.recurring,
    lastFiredAt: job.lastFiredAt,
    osBackend: job.osBackend,
    drift: !osLabelSet.has(job.osJobLabel)
      ? ("missing-in-os" as DriftState)
      : staleLabels.has(job.osJobLabel)
        ? ("stale" as DriftState)
        : ("synced" as DriftState),
  }));

  // Orphan OS labels (in OS but not in manifest)
  const orphanLabels = [...osLabelSet].filter((l) => !manifestLabelSet.has(l));

  if (jsonMode) {
    console.log(
      JSON.stringify(
        {
          jobs: entries,
          orphanOsLabels: orphanLabels,
        },
        null,
        2,
      ),
    );
    return;
  }

  if (entries.length === 0 && orphanLabels.length === 0) {
    console.log("No scheduled jobs found.");
    return;
  }

  // Group by projectLabel
  const byProject = new Map<string, ListEntry[]>();
  for (const entry of entries) {
    const list = byProject.get(entry.projectLabel) ?? [];
    list.push(entry);
    byProject.set(entry.projectLabel, list);
  }

  for (const [project, jobs] of byProject) {
    console.log(`\n[${project}]`);
    console.log(
      `${"ID".padEnd(18)} ${"CRON".padEnd(14)} ${"AGENT".padEnd(18)} ${"VENDOR".padEnd(8)} ${"BACKEND".padEnd(8)} ${"RECUR".padEnd(6)} STATE`,
    );
    console.log("-".repeat(90));
    for (const job of jobs) {
      const row = [
        job.id.padEnd(18),
        job.cron.padEnd(14),
        job.agentId.slice(0, 17).padEnd(18),
        job.vendor.padEnd(8),
        job.osBackend.padEnd(8),
        String(job.recurring).padEnd(6),
        job.drift,
      ].join(" ");
      console.log(row);
    }
  }

  if (orphanLabels.length > 0) {
    console.log("\n[orphan-in-os]");
    for (const label of orphanLabels) {
      console.log(`  ${label} (in OS scheduler but not in manifest)`);
    }
  }
}

// ---------------------------------------------------------------------------
// schedule:remove
// ---------------------------------------------------------------------------

async function scheduleRemove(id: string): Promise<void> {
  const job = getJobById(id);
  if (!job) {
    throw new Error(`Job "${id}" not found in manifest`);
  }

  try {
    const port = await selectAdapter();
    await port.remove(job.osJobLabel);
  } catch (err) {
    // Log but don't block manifest cleanup
    process.stderr.write(
      `Warning: could not remove OS job "${job.osJobLabel}": ${String(err)}\n`,
    );
  }

  // Delete the captured env file, if any.
  if (job.capturedEnvRef) {
    const envFile = getEnvFilePath(id);
    if (fs.existsSync(envFile)) {
      fs.rmSync(envFile);
    }
  }

  removeJob(id);
  console.log(`Removed job ${id}`);
}

// ---------------------------------------------------------------------------
// schedule:sync
// ---------------------------------------------------------------------------

async function scheduleSync(options: { prune?: boolean }): Promise<void> {
  const { synced, resynced, pruned } = await syncSchedules({
    prune: options.prune,
    log: (line) => console.log(line),
  });
  console.log(
    `sync complete: ${synced} synced, ${resynced} resynced, ${pruned} pruned${options.prune ? "" : " (run with --prune to remove orphan OS jobs)"}`,
  );
}

// ---------------------------------------------------------------------------
// Commander registration
// ---------------------------------------------------------------------------

export function registerSchedule(program: Command): void {
  // schedule:add
  program
    .command("schedule:add <agent-id> <prompt>")
    .description("Register a scheduled agent job")
    .option(
      "--cron <expr>",
      "5-field cron expression (e.g. '0 9 * * *'); mutually exclusive with --every",
    )
    .option(
      "--every <phrase>",
      "Natural-language interval (e.g. '5m', 'every 2 hours'); mutually exclusive with --cron",
    )
    .option(
      "-m, --model <vendor>",
      "CLI vendor override (antigravity/claude/codex/cursor/opencode/qwen/grok/pi)",
    )
    .option(
      "-w, --workspace <path>",
      "Working directory for the agent (default: cwd)",
    )
    .option("--once", "Run once then self-remove (non-recurring)")
    .option(
      "--max-age-days <n>",
      "Auto-expire recurring job after N days (0=indefinite)",
    )
    .option(
      "--env <keys>",
      "Comma-separated env var NAMES to capture for the run (e.g. OPENAI_API_KEY,FOO)",
    )
    .option(
      "--dry-run",
      "Preview the resolved cron without creating an OS job, manifest entry, or env file",
    )
    .option(
      "--accept-rounded",
      "Register an interval rounded by --every after reviewing the preview",
    )
    .action(
      runAction(async (agentId, prompt, options) => {
        await scheduleAdd(agentId, prompt, options);
      }),
    );

  // Internal fixed job registration. This deliberately accepts no command or
  // prompt: the OS scheduler can only invoke OMA's deterministic evolution
  // tick, never an arbitrary shell command or an LLM shell agent.
  program
    .command("schedule:builtin-evolution-add <workspace>")
    .requiredOption("--cron <expr>", "5-field cron expression")
    .action(
      runAction(async (workspace, options) => {
        await scheduleBuiltinEvolutionAdd(workspace, options);
      }),
    );

  // schedule:list
  addOutputOptions(
    program
      .command("schedule:list")
      .description(
        "List scheduled jobs with OS drift state (synced/stale/missing-in-os/orphan-in-os), grouped by project",
      ),
  ).action(
    runAction(
      async (options) => {
        await scheduleList(options);
      },
      { supportsJsonOutput: true },
    ),
  );

  // schedule:remove
  program
    .command("schedule:remove <id>")
    .description("Remove a scheduled job from manifest and OS scheduler")
    .action(
      runAction(async (id) => {
        await scheduleRemove(id);
      }),
    );

  program
    .command("schedule:inspect <id>")
    .description("Inspect one scheduler manifest entry for internal callers")
    .action(
      runAction(async (id) => {
        const job = getJobById(id);
        console.log(JSON.stringify({ exists: Boolean(job), job: job ?? null }));
      }),
    );

  // schedule:run
  program
    .command("schedule:run <id>")
    .description(
      "Execute a scheduled job by id (invoked by OS scheduler; not normally called directly)",
    )
    .action(
      runAction(async (id) => {
        await runScheduledJob(id);
      }),
    );

  // schedule:sync
  program
    .command("schedule:sync")
    .description(
      "Re-sync manifest → OS scheduler (registers missing jobs, rewrites stale commands). Use --prune to remove orphan OS jobs.",
    )
    .option("--prune", "Remove OS jobs not present in manifest")
    .action(
      runAction(async (options) => {
        await scheduleSync(options);
      }),
    );
}
