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
import { getGitStats } from "../io/git.js";
import { getCompletedTasksCount, getSessionMeta } from "../io/memory.js";
import type { Metrics } from "../types/index.js";

function getMetricsPath(cwd: string): string {
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
  const memoriesDir = join(cwd, ".serena", "memories");
  const skillsUsed: Record<string, number> = {};

  if (!existsSync(memoriesDir)) return skillsUsed;

  try {
    const files = readdirSync(memoriesDir);
    for (const file of files) {
      const match = file.match(/(?:progress|result)-(\w+)/);
      if (match?.[1]) {
        const skill = match[1];
        skillsUsed[skill] = (skillsUsed[skill] || 0) + 1;
      }
    }
  } catch {}

  return skillsUsed;
}

export async function stats(
  jsonMode = false,
  resetMode = false,
): Promise<void> {
  const cwd = process.cwd();
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

  if (jsonMode) {
    console.log(
      JSON.stringify(
        {
          ...metrics,
          gitStats,
          daysSinceStart,
          avgSessionTime,
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
    `│ Lines Added         │ ${pc.green(`+${metrics.linesAdded}`).padEnd(12)} │`,
    `│ Lines Removed       │ ${pc.red(`-${metrics.linesRemoved}`).padEnd(12)} │`,
    "└─────────────────────┴──────────────┘",
  ].join("\n");

  p.note(statsTable, "Overview");

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
