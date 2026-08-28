import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { dirname, join } from "node:path";
import * as p from "@clack/prompts";
import pc from "picocolors";
import { AGENTS_STATE_DIR, agentsPathFromRoot } from "../../constants/paths.js";
import { getGitStats } from "../../io/git.js";
import {
  getCompletedTasksCount,
  getCoordinationStoreDirs,
  getSessionMeta,
} from "../../io/memory.js";
import { estimateUsd, listAllSessionUsage } from "../../io/session-cost.js";
import type { Metrics } from "../../types/index.js";
import { resolveProjectRoot } from "../../utils/fs-utils.js";

interface CostSummary {
  totalTokens: number;
  totalSpawns: number;
  estimatedUsd: number;
  byVendor: Record<string, { tokens: number; spawns: number; usd: number }>;
}

function aggregateCost(cwd: string): CostSummary {
  const records = listAllSessionUsage(cwd);
  const byVendor: CostSummary["byVendor"] = {};
  let totalTokens = 0;
  let estimatedUsd = 0;

  for (const r of records) {
    totalTokens += r.tokens;
    const usd = estimateUsd(r.tokens, r.vendor);
    estimatedUsd += usd;
    const entry = byVendor[r.vendor] ?? { tokens: 0, spawns: 0, usd: 0 };
    entry.tokens += r.tokens;
    entry.spawns += 1;
    entry.usd += usd;
    byVendor[r.vendor] = entry;
  }

  return {
    totalTokens,
    totalSpawns: records.length,
    estimatedUsd,
    byVendor,
  };
}

function formatNumber(n: number): string {
  return n.toLocaleString("en-US");
}

function formatUsd(n: number): string {
  if (n === 0) return "$0.00";
  if (n < 0.01) return "<$0.01";
  return `$${n.toFixed(2)}`;
}

function getMetricsPath(cwd: string): string {
  return join(agentsPathFromRoot(cwd, AGENTS_STATE_DIR), "metrics.json");
}

function getLegacyMetricsPath(cwd: string): string {
  return join(cwd, ".serena", "metrics.json");
}

function createEmptyMetrics(): Metrics {
  return {
    sessions: 0,
    skillsUsed: {},
    tasksCompleted: 0,
    totalSessionTime: 0,
    filesChanged: 0,
    linesAdded: 0,
    linesRemoved: 0,
    lastUpdated: new Date().toISOString(),
    startDate: new Date().toISOString(),
  };
}

function loadMetrics(cwd: string): Metrics {
  const metricsPath = getMetricsPath(cwd);
  if (existsSync(metricsPath)) {
    try {
      return JSON.parse(readFileSync(metricsPath, "utf-8"));
    } catch {
      return createEmptyMetrics();
    }
  }
  const legacyPath = getLegacyMetricsPath(cwd);
  if (existsSync(legacyPath)) {
    try {
      return JSON.parse(readFileSync(legacyPath, "utf-8"));
    } catch {
      return createEmptyMetrics();
    }
  }
  return createEmptyMetrics();
}

function saveMetrics(cwd: string, metrics: Metrics): void {
  const metricsPath = getMetricsPath(cwd);
  const metricsDir = dirname(metricsPath);
  if (!existsSync(metricsDir)) {
    mkdirSync(metricsDir, { recursive: true });
  }
  metrics.lastUpdated = new Date().toISOString();
  writeFileSync(metricsPath, JSON.stringify(metrics, null, 2), "utf-8");
}

function detectSkillsFromMemories(cwd: string): Record<string, number> {
  const skillsUsed: Record<string, number> = {};
  const seen = new Set<string>();

  for (const coordinationDir of getCoordinationStoreDirs(cwd)) {
    if (!existsSync(coordinationDir)) continue;

    try {
      const files = readdirSync(coordinationDir);
      for (const file of files) {
        if (seen.has(file)) continue;
        seen.add(file);
        const match = file.match(/(?:progress|result)-(\w+)/);
        if (match?.[1]) {
          const skill = match[1];
          skillsUsed[skill] = (skillsUsed[skill] || 0) + 1;
        }
      }
    } catch {}
  }

  return skillsUsed;
}

export async function stats(
  jsonMode = false,
  resetMode = false,
): Promise<void> {
  const cwd = resolveProjectRoot(process.cwd());
  const metricsPath = getMetricsPath(cwd);

  if (resetMode) {
    if (existsSync(metricsPath)) {
      writeFileSync(
        metricsPath,
        JSON.stringify(createEmptyMetrics(), null, 2),
        "utf-8",
      );
    }
    if (jsonMode) {
      console.log(JSON.stringify({ reset: true }));
    } else {
      console.log(pc.green("✅ Metrics reset successfully."));
    }
    return;
  }

  const metrics = loadMetrics(cwd);
  const gitStats = getGitStats(cwd);
  const detectedSkills = detectSkillsFromMemories(cwd);
  const completedTasks = getCompletedTasksCount(cwd);
  const sessionMeta = getSessionMeta(cwd);
  const sessionStartedAt = sessionMeta.startedAt
    ? new Date(sessionMeta.startedAt)
    : null;
  const sessionDurationSeconds =
    sessionStartedAt && !Number.isNaN(sessionStartedAt.getTime())
      ? Math.max(
          0,
          Math.floor((Date.now() - sessionStartedAt.getTime()) / 1000),
        )
      : 0;

  for (const [skill, count] of Object.entries(detectedSkills)) {
    metrics.skillsUsed[skill] = (metrics.skillsUsed[skill] || 0) + count;
  }

  if (completedTasks > metrics.tasksCompleted) {
    metrics.tasksCompleted = completedTasks;
  }

  if (sessionMeta.id) {
    const isTerminalStatus = ["completed", "failed", "aborted"].includes(
      sessionMeta.status || "",
    );
    const isNewTerminal =
      isTerminalStatus &&
      (metrics.lastSessionId !== sessionMeta.id ||
        metrics.lastSessionStatus !== sessionMeta.status);

    if (isNewTerminal && sessionDurationSeconds > 0) {
      metrics.totalSessionTime += sessionDurationSeconds;
    }

    metrics.lastSessionId = sessionMeta.id;
    metrics.lastSessionStatus = sessionMeta.status;
    metrics.lastSessionStarted = sessionMeta.startedAt;
    metrics.lastSessionDuration = sessionDurationSeconds;
  }

  metrics.filesChanged += gitStats.filesChanged;
  metrics.linesAdded += gitStats.linesAdded;
  metrics.linesRemoved += gitStats.linesRemoved;
  metrics.sessions += 1;

  saveMetrics(cwd, metrics);

  const daysSinceStart = Math.max(
    1,
    Math.ceil(
      (Date.now() - new Date(metrics.startDate).getTime()) /
        (1000 * 60 * 60 * 24),
    ),
  );
  const avgSessionTime =
    metrics.sessions > 0
      ? Math.round(metrics.totalSessionTime / metrics.sessions)
      : 0;

  const cost = aggregateCost(cwd);

  if (jsonMode) {
    console.log(
      JSON.stringify(
        {
          ...metrics,
          gitStats,
          daysSinceStart,
          avgSessionTime,
          cost,
        },
        null,
        2,
      ),
    );
    return;
  }

  console.clear();
  p.intro(pc.bgMagenta(pc.white(" 📊 oh-my-agent stats ")));

  const statsTable = [
    pc.bold(`📈 Productivity Metrics (${daysSinceStart} days)`),
    "┌─────────────────────┬──────────────┐",
    `│ ${pc.bold("Metric")}              │ ${pc.bold("Value")}        │`,
    "├─────────────────────┼──────────────┤",
    `│ Sessions            │ ${String(metrics.sessions).padEnd(12)} │`,
    `│ Tasks Completed     │ ${String(metrics.tasksCompleted).padEnd(12)} │`,
    `│ Files Changed       │ ${String(metrics.filesChanged).padEnd(12)} │`,
    `│ Lines Added         │ ${pc.green(`+${metrics.linesAdded}`.padEnd(12))} │`,
    `│ Lines Removed       │ ${pc.red(`-${metrics.linesRemoved}`.padEnd(12))} │`,
    "└─────────────────────┴──────────────┘",
  ].join("\n");

  p.note(statsTable, "Overview");

  if (cost.totalSpawns > 0) {
    const vendorLines = Object.entries(cost.byVendor)
      .sort(([, a], [, b]) => b.tokens - a.tokens)
      .map(
        ([vendor, v]) =>
          `  ${vendor.padEnd(12)} ${formatNumber(v.tokens).padStart(12)} tokens · ${String(v.spawns).padStart(3)} spawns · ${formatUsd(v.usd).padStart(7)}`,
      );

    const costTable = [
      pc.bold("💰 Cost Telemetry (all sessions)"),
      "┌─────────────────────┬──────────────┐",
      `│ ${pc.bold("Metric")}              │ ${pc.bold("Value")}        │`,
      "├─────────────────────┼──────────────┤",
      `│ Total tokens (est.) │ ${formatNumber(cost.totalTokens).padEnd(12)} │`,
      `│ Total spawns        │ ${String(cost.totalSpawns).padEnd(12)} │`,
      `│ Estimated USD       │ ${formatUsd(cost.estimatedUsd).padEnd(12)} │`,
      "└─────────────────────┴──────────────┘",
      pc.dim("By vendor (sorted by tokens):"),
      ...vendorLines,
      pc.dim(
        "Estimate is input-only (prompt char approximation); output tokens not yet tracked.",
      ),
      pc.dim(
        "Configure session.quota_cap in .agents/oma-config.yaml to enforce budgets.",
      ),
    ].join("\n");

    p.note(costTable, "Cost");
  }

  const sortedSkills = Object.entries(metrics.skillsUsed)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5);

  if (sortedSkills.length > 0) {
    const skillsTable = [
      pc.bold("🏆 Top Skills Used"),
      ...sortedSkills.map(
        ([skill, count], i) => `  ${i + 1}. ${skill} (${count})`,
      ),
    ].join("\n");

    p.note(skillsTable, "Skills");
  }

  p.outro(pc.dim(`Data stored in: ${metricsPath}`));
}
