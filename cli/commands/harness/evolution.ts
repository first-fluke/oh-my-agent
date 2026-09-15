import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import type { Command } from "commander";
import { AGENTS_DIR } from "../../constants/paths.js";
import { resolveEffectiveSkill } from "../../platform/skill-overlays.js";
import { getInstalledSkillNames } from "../../platform/skills-installer/skill-symlinks.js";
import {
  acquireHarnessEvolutionLock,
  type EvolutionMode,
  type EvolutionRetry,
  readHarnessEvolutionConfig,
  readHarnessEvolutionState,
  retryBackoff,
  writeHarnessEvolutionConfig,
  writeHarnessEvolutionState,
} from "../../state/harness-evolution.js";
import { addOutputOptions, runAction } from "../../utils/cli-framework.js";
import { resolveOmaInvocation } from "../../utils/oma-invocation.js";
import {
  createDispatchMeter,
  type DispatchMeter,
} from "../skills/opt/budget.js";
import { runHarnessFeedback } from "./feedback.js";
import { listUnpromotedIncidents } from "./incident-promote.js";
import { scanHarnessIncidents } from "./incident-scan.js";

function invokeOma(root: string, args: string[]): string {
  const invocation = resolveOmaInvocation();
  const result = spawnSync(
    invocation.command,
    [...invocation.prefixArgs, ...args],
    {
      cwd: root,
      encoding: "utf8",
      timeout: 30_000,
    },
  );
  if (result.status !== 0) {
    throw new Error(
      [result.stdout, result.stderr, result.error?.message]
        .filter(Boolean)
        .join("\n") || `oma ${args.join(" ")} failed`,
    );
  }
  return result.stdout;
}

function scheduledJob(root: string, cron: string): string {
  const output = invokeOma(root, [
    "schedule:builtin-evolution-add",
    root,
    "--cron",
    cron,
  ]);
  const line = output.trim().split("\n").at(-1) ?? "";
  const parsed = JSON.parse(line) as { id?: unknown };
  if (typeof parsed.id !== "string" || !parsed.id)
    throw new Error("Scheduler returned no job id");
  return parsed.id;
}

function removeScheduledJob(root: string, id: string | undefined): void {
  if (!id) return;
  invokeOma(root, ["schedule:remove", id]);
}

function inspectScheduledJob(root: string, id: string | undefined): unknown {
  if (!id) return { exists: false, reason: "no saved schedule id" };
  try {
    const output = invokeOma(root, ["schedule:inspect", id]);
    return JSON.parse(output.trim().split("\n").at(-1) ?? "{}") as unknown;
  } catch (error) {
    return {
      exists: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

function overlayConflicts(
  root: string,
): Array<{ skill: string; conflict: string }> {
  const conflicts: Array<{ skill: string; conflict: string }> = [];
  for (const skill of getInstalledSkillNames(root)) {
    const resolved = resolveEffectiveSkill(root, skill);
    if (resolved.conflict)
      conflicts.push({ skill, conflict: resolved.conflict });
  }
  return conflicts;
}

function positiveInt(value: string): number {
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed <= 0)
    throw new Error("--max-dispatches must be a positive integer");
  return parsed;
}

interface PromotionBatch {
  skill: string;
  evidenceHash: string;
}

function promotedSkills(root: string): PromotionBatch[] {
  const dir = join(root, AGENTS_DIR, "results", "incidents");
  if (!existsSync(dir)) return [];
  const incidentsBySkill = new Map<string, string[]>();
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const path = join(dir, entry.name, "promotion.json");
    if (!existsSync(path)) continue;
    try {
      const promotion = JSON.parse(readFileSync(path, "utf8")) as {
        skill?: unknown;
        incidentId?: unknown;
      };
      if (typeof promotion.skill === "string" && promotion.skill) {
        const incidentId =
          typeof promotion.incidentId === "string"
            ? promotion.incidentId
            : entry.name;
        incidentsBySkill.set(promotion.skill, [
          ...(incidentsBySkill.get(promotion.skill) ?? []),
          incidentId,
        ]);
      }
    } catch {
      // The incident command remains the diagnostic surface for corrupt data.
    }
  }
  return [...incidentsBySkill.entries()]
    .map(([skill, incidents]) => ({
      skill,
      evidenceHash: createHash("sha256")
        .update(incidents.sort().join("\n"))
        .digest("hex"),
    }))
    .sort((a, b) => a.skill.localeCompare(b.skill));
}

function upsertRetry(
  retries: EvolutionRetry[],
  patch: Omit<EvolutionRetry, "attemptCount" | "nextAttemptAt"> &
    Partial<Pick<EvolutionRetry, "attemptCount" | "nextAttemptAt">>,
): void {
  const index = retries.findIndex((item) => item.key === patch.key);
  const current = index === -1 ? undefined : retries[index];
  const next: EvolutionRetry = {
    key: patch.key,
    kind: patch.kind,
    incidentId: patch.incidentId,
    skill: patch.skill,
    attemptCount: patch.attemptCount ?? current?.attemptCount ?? 0,
    nextAttemptAt:
      patch.nextAttemptAt ?? current?.nextAttemptAt ?? new Date().toISOString(),
    lastError: patch.lastError,
    completedAt: patch.completedAt,
    evidenceHash: patch.evidenceHash,
  };
  if (index === -1) retries.push(next);
  else retries[index] = next;
}

export async function runHarnessEvolutionTick(
  rootArg = process.cwd(),
): Promise<{
  status: "completed" | "partial" | "failed" | "disabled";
  dispatchesUsed: number;
  maxDispatches: number;
}> {
  const root = resolve(rootArg);
  const config = readHarnessEvolutionConfig(root);
  if (!config.enabled)
    return {
      status: "disabled",
      dispatchesUsed: 0,
      maxDispatches: config.maxDispatches,
    };
  const lock = acquireHarnessEvolutionLock(root);
  if (!lock)
    return {
      status: "partial",
      dispatchesUsed: 0,
      maxDispatches: config.maxDispatches,
    };
  let meter: DispatchMeter | undefined;
  try {
    // A late or manually invoked tick must re-check after obtaining the lock.
    const active = readHarnessEvolutionConfig(root);
    if (!active.enabled)
      return {
        status: "disabled",
        dispatchesUsed: 0,
        maxDispatches: active.maxDispatches,
      };
    const state = readHarnessEvolutionState(root);
    const now = new Date().toISOString();
    for (const candidate of scanHarnessIncidents(root).candidates) {
      const key = `capture:${candidate.runId}`;
      const current = state.retries.find((retry) => retry.key === key);
      if (!current?.completedAt) {
        upsertRetry(state.retries, {
          key,
          kind: "capture",
          nextAttemptAt: current?.nextAttemptAt ?? now,
        });
      }
    }
    for (const incident of listUnpromotedIncidents(root)) {
      const key = `fixture:${incident.id}`;
      const current = state.retries.find((retry) => retry.key === key);
      if (!current?.completedAt) {
        upsertRetry(state.retries, {
          key,
          kind: "capture",
          incidentId: incident.id,
          nextAttemptAt: current?.nextAttemptAt ?? now,
        });
      }
    }
    const dueRunIds = state.retries
      .filter(
        (retry) =>
          retry.kind === "capture" &&
          !retry.completedAt &&
          retry.nextAttemptAt <= now,
      )
      .map((retry) => retry.key.slice("capture:".length))
      .filter((runId) => !runId.startsWith("capture-incident:"));
    const dueIncidentIds = state.retries
      .filter(
        (retry) =>
          retry.kind === "capture" &&
          retry.incidentId &&
          !retry.completedAt &&
          retry.nextAttemptAt <= now,
      )
      .map((retry) => retry.incidentId as string);
    const batches = promotedSkills(root);
    const dueBatches = batches.filter((batch) => {
      const key = `optimize:${active.mode}:${batch.skill}:${batch.evidenceHash}`;
      const current = state.retries.find((retry) => retry.key === key);
      if (!current) {
        upsertRetry(state.retries, {
          key,
          kind: "optimize",
          skill: batch.skill,
          evidenceHash: batch.evidenceHash,
          nextAttemptAt: now,
        });
        return true;
      }
      return !current.completedAt && current.nextAttemptAt <= now;
    });
    // The checkpoint survives interruption after fixture creation. The next
    // tick reconstructs the same batch from promotion artifacts without
    // creating a duplicate fixture.
    writeHarnessEvolutionState(root, state);
    if (
      dueRunIds.length === 0 &&
      dueIncidentIds.length === 0 &&
      dueBatches.length === 0
    ) {
      state.lastTick = {
        at: now,
        dispatchesUsed: 0,
        maxDispatches: active.maxDispatches,
        status: "completed",
      };
      writeHarnessEvolutionState(root, state);
      return {
        status: "completed",
        dispatchesUsed: 0,
        maxDispatches: active.maxDispatches,
      };
    }
    meter = createDispatchMeter(active.maxDispatches);
    const report = await runHarnessFeedback({
      root,
      scanRuns: dueRunIds.length > 0,
      runIds: dueRunIds,
      // Undefined means "all pending", which includes an incident captured
      // earlier in this call. An empty array would incorrectly filter it out.
      incidentIds: dueIncidentIds.length > 0 ? dueIncidentIds : undefined,
      optimize: true,
      retrySkills: dueBatches.map((batch) => batch.skill),
      applyTarget: active.mode === "apply" ? "overlay" : "managed",
      meter,
    });
    for (const captured of report.captured) {
      upsertRetry(state.retries, {
        key: `capture:${captured.runId}`,
        kind: "capture",
        completedAt: now,
        evidenceHash: captured.incidentId,
      });
    }
    for (const uncapturable of report.uncapturable) {
      const key = `capture:${uncapturable.runId}`;
      const terminal =
        uncapturable.reason === "no prompt recorded" ||
        uncapturable.reason === "no output preserved";
      if (terminal) {
        upsertRetry(state.retries, {
          key,
          kind: "capture",
          completedAt: now,
          lastError: uncapturable.reason,
        });
      } else {
        const current = state.retries.find((retry) => retry.key === key);
        const attemptCount = (current?.attemptCount ?? 0) + 1;
        upsertRetry(state.retries, {
          key,
          kind: "capture",
          attemptCount,
          nextAttemptAt: retryBackoff(attemptCount),
          lastError: uncapturable.reason,
        });
      }
    }
    for (const skipped of report.skipped) {
      const current = state.retries.find(
        (retry) => retry.incidentId === skipped.incidentId,
      );
      const attemptCount = (current?.attemptCount ?? 0) + 1;
      upsertRetry(state.retries, {
        key: current?.key ?? `fixture:${skipped.incidentId}`,
        kind: current?.kind ?? "capture",
        incidentId: skipped.incidentId,
        attemptCount,
        nextAttemptAt: retryBackoff(attemptCount),
        lastError: skipped.reason,
      });
    }
    for (const promoted of report.promoted) {
      upsertRetry(state.retries, {
        key: `fixture:${promoted.incidentId}`,
        kind: "capture",
        incidentId: promoted.incidentId,
        completedAt: now,
        evidenceHash: promoted.fixturePath,
      });
    }
    const currentBatches = new Map(
      promotedSkills(root).map((batch) => [batch.skill, batch]),
    );
    for (const outcome of report.skills) {
      const batch = currentBatches.get(outcome.skill);
      if (!batch) continue;
      const key = `optimize:${active.mode}:${outcome.skill}:${batch.evidenceHash}`;
      if (outcome.status === "optimized") {
        upsertRetry(state.retries, {
          key,
          kind: "optimize",
          skill: outcome.skill,
          completedAt: now,
        });
      } else if (outcome.status === "failed") {
        const current = state.retries.find((retry) => retry.key === key);
        const attemptCount = (current?.attemptCount ?? 0) + 1;
        upsertRetry(state.retries, {
          key,
          kind: "optimize",
          skill: outcome.skill,
          attemptCount,
          nextAttemptAt: retryBackoff(attemptCount),
          lastError: outcome.error,
        });
      }
    }
    const dispatchesUsed = meter.snapshot().used;
    const hasTransientCaptureFailure = report.uncapturable.some(
      (item) =>
        item.reason !== "no prompt recorded" &&
        item.reason !== "no output preserved",
    );
    const status =
      hasTransientCaptureFailure ||
      report.skipped.length > 0 ||
      report.skills.some((item) => item.status === "failed")
        ? "partial"
        : "completed";
    state.lastTick = {
      at: now,
      dispatchesUsed,
      maxDispatches: active.maxDispatches,
      status,
      reportPath: report.reportPath,
    };
    writeHarnessEvolutionState(root, state);
    return { status, dispatchesUsed, maxDispatches: active.maxDispatches };
  } catch (error) {
    const state = readHarnessEvolutionState(root);
    const message = error instanceof Error ? error.message : String(error);
    const exhausted = message.includes("dispatch budget exhausted");
    state.lastTick = {
      at: new Date().toISOString(),
      dispatchesUsed: meter?.snapshot().used ?? 0,
      maxDispatches: config.maxDispatches,
      status: exhausted ? "partial" : "failed",
      error: message,
    };
    writeHarnessEvolutionState(root, state);
    throw error;
  } finally {
    lock.release();
  }
}

export function registerHarnessEvolutionCommand(harness: Command): void {
  const evolution = harness
    .command("evolution")
    .description("Configure project-local harness evolution");
  addOutputOptions(
    evolution
      .command("enable")
      .requiredOption(
        "--max-dispatches <n>",
        "Finite model dispatch budget per tick",
      )
      .option("--cron <expr>", "5-field cron expression", "0 3 * * *")
      .option("--mode <mode>", "apply or propose", "apply")
      .action(
        runAction(async (options) => {
          const root = resolve(process.cwd());
          const mode = options.mode as EvolutionMode;
          if (mode !== "apply" && mode !== "propose")
            throw new Error("--mode must be apply or propose");
          const maxDispatches = positiveInt(options.maxDispatches);
          // The scheduler lookup is by built-in kind + workspace, so this both
          // repairs a stale config id and updates cron without creating a job.
          const scheduleId = scheduledJob(root, options.cron);
          writeHarnessEvolutionConfig(root, {
            schemaVersion: 1,
            enabled: true,
            cron: options.cron,
            mode,
            maxDispatches,
            scheduleId,
            updatedAt: new Date().toISOString(),
          });
          console.log(
            JSON.stringify(
              { enabled: true, scheduleId, mode, maxDispatches },
              null,
              2,
            ),
          );
        }),
      ),
  );
  addOutputOptions(evolution.command("disable")).action(
    runAction(async () => {
      const root = resolve(process.cwd());
      const config = readHarnessEvolutionConfig(root);
      writeHarnessEvolutionConfig(root, {
        ...config,
        enabled: false,
        scheduleId: undefined,
        updatedAt: new Date().toISOString(),
      });
      removeScheduledJob(root, config.scheduleId);
      console.log(JSON.stringify({ enabled: false }, null, 2));
    }),
  );
  addOutputOptions(evolution.command("status")).action(
    runAction(async () => {
      const root = resolve(process.cwd());
      const config = readHarnessEvolutionConfig(root);
      const state = readHarnessEvolutionState(root);
      console.log(
        JSON.stringify(
          {
            config,
            schedule: inspectScheduledJob(root, config.scheduleId),
            pending: state.retries.filter((retry) => !retry.completedAt).length,
            conflicts: overlayConflicts(root),
            state,
          },
          null,
          2,
        ),
      );
    }),
  );
  addOutputOptions(
    evolution
      .command("run")
      .option("--scheduled", "Internal scheduler invocation"),
  ).action(
    runAction(async () => {
      const result = await runHarnessEvolutionTick();
      console.log(JSON.stringify(result, null, 2));
    }),
  );
}
