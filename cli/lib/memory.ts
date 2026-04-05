import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { join } from "node:path";

export interface AgentActivity {
  agent: string;
  type: "progress" | "result";
  content: string;
  timestamp?: string;
}

export interface SessionSummary {
  sessionId?: string;
  agents: string[];
  activities: AgentActivity[];
  completedTasks: string[];
  inProgressTasks: string[];
}

export interface SessionMeta {
  id?: string;
  status?: string;
  startedAt?: string;
}

export interface MemoryInitResult {
  memoriesDir: string;
  sessionId: string;
  created: string[];
  updated: string[];
  skipped: string[];
}

export function getMemoriesPath(cwd: string): string {
  return join(cwd, ".serena", "memories");
}

function readFileSafe(filePath: string): string {
  try {
    return readFileSync(filePath, "utf-8");
  } catch {
    return "";
  }
}

function extractSessionId(content: string): string | undefined {
  return (
    (content.match(/##\s*ID:\s*(.+)/i) || [])[1] ||
    (content.match(/session-id:\s*(.+)/i) || [])[1] ||
    content.match(/(session-\d{8}-\d{6})/)?.[1]
  );
}

function isTrivialContent(content: string): boolean {
  const trimmed = content.trim();
  return trimmed === "" || trimmed === "---";
}

export function formatSessionId(date: Date): string {
  const pad = (value: number) => String(value).padStart(2, "0");
  const yyyy = date.getFullYear();
  const mm = pad(date.getMonth() + 1);
  const dd = pad(date.getDate());
  const hh = pad(date.getHours());
  const mi = pad(date.getMinutes());
  const ss = pad(date.getSeconds());
  return `session-${yyyy}${mm}${dd}-${hh}${mi}${ss}`;
}

function buildOrchestratorTemplate(
  sessionId: string,
  startedAt: string,
): string {
  return [
    "# Orchestrator Session",
    `## ID: ${sessionId}`,
    `## Started: ${startedAt}`,
    "## Status: idle",
    "",
    "## Agents",
    "| Agent ID | CLI | PID | Status | Task |",
    "|----------|-----|-----|--------|------|",
    "",
    "## Summary (filled on completion)",
    "- Total Tasks: 0",
    "- Completed: 0",
    "- Failed: 0",
    "- Files Created: []",
    "- Issues: []",
    "",
  ].join("\n");
}

function buildTaskBoardTemplate(sessionId: string): string {
  return [
    "# Task Board",
    `## Session: ${sessionId}`,
    "",
    "| Agent | Status | Task |",
    "|-------|--------|------|",
    "",
  ].join("\n");
}

export function listMemoryFiles(cwd: string): string[] {
  const memoriesDir = getMemoriesPath(cwd);
  if (!existsSync(memoriesDir)) return [];

  try {
    return readdirSync(memoriesDir).filter(
      (f) => f.endsWith(".md") && f !== ".gitkeep",
    );
  } catch {
    return [];
  }
}

export function parseAgentActivity(
  filename: string,
  content: string,
): AgentActivity | null {
  const progressMatch = filename.match(/^progress-(\w+)(?:-[\w-]+)?\.md$/);
  const resultMatch = filename.match(/^result-(\w+)(?:-[\w-]+)?\.md$/);

  if (progressMatch?.[1]) {
    return {
      agent: progressMatch[1],
      type: "progress",
      content: content.slice(0, 500),
    };
  }

  if (resultMatch?.[1]) {
    return {
      agent: resultMatch[1],
      type: "result",
      content: content.slice(0, 500),
    };
  }

  return null;
}

export function getSessionSummary(cwd: string): SessionSummary {
  const memoriesDir = getMemoriesPath(cwd);
  const summary: SessionSummary = {
    agents: [],
    activities: [],
    completedTasks: [],
    inProgressTasks: [],
  };

  if (!existsSync(memoriesDir)) return summary;

  const files = listMemoryFiles(cwd);

  for (const file of files) {
    if (file === "orchestrator-session.md") {
      try {
        const content = readFileSync(join(memoriesDir, file), "utf-8");
        const sessionMatch = content.match(/session[:\s]+(\S+)/i);
        if (sessionMatch) {
          summary.sessionId = sessionMatch[1];
        }
      } catch {}
      continue;
    }

    try {
      const content = readFileSync(join(memoriesDir, file), "utf-8");
      const activity = parseAgentActivity(file, content);

      if (activity) {
        summary.activities.push(activity);

        if (!summary.agents.includes(activity.agent)) {
          summary.agents.push(activity.agent);
        }

        if (activity.type === "result") {
          const taskMatch =
            content.match(/task[:\s]+(.+)/i) || content.match(/##\s*(.+)/);
          if (taskMatch?.[1]) {
            summary.completedTasks.push(taskMatch[1].trim());
          }
        } else if (activity.type === "progress") {
          const taskMatch =
            content.match(/current[:\s]+(.+)/i) ||
            content.match(/working on[:\s]+(.+)/i);
          if (
            taskMatch?.[1] &&
            !summary.completedTasks.includes(taskMatch[1].trim())
          ) {
            summary.inProgressTasks.push(taskMatch[1].trim());
          }
        }
      }
    } catch {}
  }

  return summary;
}

export function getSessionMeta(cwd: string): SessionMeta {
  const memoriesDir = getMemoriesPath(cwd);
  const sessionFile = join(memoriesDir, "orchestrator-session.md");
  if (!existsSync(sessionFile)) return {};

  const content = readFileSafe(sessionFile);
  if (!content) return {};

  const id = extractSessionId(content)?.trim();
  const status =
    (content.match(/##\s*Status:\s*(.+)/i) || [])[1] ||
    (content.match(/status:\s*(running|completed|failed|aborted)/i) || [])[1];
  const startedAt =
    (content.match(/##\s*Started:\s*(.+)/i) || [])[1] ||
    (content.match(/started:\s*(.+)/i) || [])[1];

  return {
    id,
    status: status?.trim().toLowerCase(),
    startedAt: startedAt?.trim(),
  };
}

export function getCompletedTasksCount(cwd: string): number {
  const memoriesDir = getMemoriesPath(cwd);
  if (!existsSync(memoriesDir)) return 0;

  let completed = 0;

  const files = listMemoryFiles(cwd);
  for (const file of files) {
    if (!file.startsWith("result-")) continue;
    const content = readFileSafe(join(memoriesDir, file));
    if (!content) continue;

    const statusLine = content
      .split("\n")
      .map((l) => l.trim())
      .find((l) => /^##\s*Status:/i.test(l) || /^Status:/i.test(l));

    if (statusLine) {
      const match = statusLine.match(/status[^:]*:\s*([a-z_]+)/i);
      if (match?.[1]?.toLowerCase() === "completed") {
        completed += 1;
      }
    }
  }

  const taskBoard = readFileSafe(join(memoriesDir, "task-board.md"));
  if (taskBoard) {
    const taskBoardCompleted = taskBoard
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => /status/i.test(line))
      .reduce((count, line) => {
        const match = line.match(/status[^:]*:\s*([a-z_]+)/i);
        if (match?.[1]?.toLowerCase() === "completed") return count + 1;
        return count;
      }, 0);
    completed = Math.max(completed, taskBoardCompleted);
  }

  const sessionFile = readFileSafe(
    join(memoriesDir, "orchestrator-session.md"),
  );
  if (sessionFile) {
    const summaryCompleted = sessionFile.match(/Completed:\s*(\d+)/i);
    if (summaryCompleted?.[1]) {
      const summaryCount = parseInt(summaryCompleted[1], 10);
      if (!Number.isNaN(summaryCount)) {
        completed = Math.max(completed, summaryCount);
      }
    }
  }

  return completed;
}

export function getRecentAgentActivities(
  cwd: string,
  sinceDate?: string,
): AgentActivity[] {
  const allActivities: AgentActivity[] = [];
  const memoriesDir = getMemoriesPath(cwd);

  if (!existsSync(memoriesDir)) return allActivities;

  const _cutoffTime = sinceDate ? new Date(sinceDate).getTime() : 0;
  const files = listMemoryFiles(cwd);

  for (const file of files) {
    if (file === "orchestrator-session.md") continue;

    try {
      const filePath = join(memoriesDir, file);
      const content = readFileSync(filePath, "utf-8");

      const activity = parseAgentActivity(file, content);
      if (activity) {
        allActivities.push(activity);
      }
    } catch {}
  }

  return allActivities;
}

export function extractKeyLearningsFromActivities(
  activities: AgentActivity[],
): string[] {
  const learnings: string[] = [];

  for (const activity of activities) {
    const content = activity.content.toLowerCase();

    if (content.includes("error") || content.includes("fail")) {
      learnings.push(`${activity.agent}: Error handling improved`);
    }
    if (content.includes("refactor")) {
      learnings.push(`${activity.agent}: Code structure refactored`);
    }
    if (content.includes("test")) {
      learnings.push(`${activity.agent}: Test coverage added`);
    }
    if (content.includes("performance") || content.includes("optimize")) {
      learnings.push(`${activity.agent}: Performance optimized`);
    }
  }

  return [...new Set(learnings)].slice(0, 5);
}

export function ensureMemorySchema(
  cwd: string,
  options: { force?: boolean } = {},
): MemoryInitResult {
  const memoriesDir = getMemoriesPath(cwd);
  if (!existsSync(memoriesDir)) {
    mkdirSync(memoriesDir, { recursive: true });
  }

  const existingSession = readFileSafe(
    join(memoriesDir, "orchestrator-session.md"),
  );
  const existingTaskBoard = readFileSafe(join(memoriesDir, "task-board.md"));
  const detectedSessionId =
    extractSessionId(existingSession) ||
    extractSessionId(existingTaskBoard) ||
    formatSessionId(new Date());

  const nowIso = new Date().toISOString();
  const orchestratorTemplate = buildOrchestratorTemplate(
    detectedSessionId,
    nowIso,
  );
  const taskBoardTemplate = buildTaskBoardTemplate(detectedSessionId);

  const created: string[] = [];
  const updated: string[] = [];
  const skipped: string[] = [];

  const ensureFile = (filename: string, content: string) => {
    const targetPath = join(memoriesDir, filename);
    if (!existsSync(targetPath)) {
      writeFileSync(targetPath, content, "utf-8");
      created.push(filename);
      return;
    }

    const current = readFileSafe(targetPath);
    if (options.force || isTrivialContent(current)) {
      writeFileSync(targetPath, content, "utf-8");
      updated.push(filename);
      return;
    }

    skipped.push(filename);
  };

  ensureFile("orchestrator-session.md", orchestratorTemplate);
  ensureFile("task-board.md", taskBoardTemplate);
  ensureFile(".gitkeep", "");

  return {
    memoriesDir,
    sessionId: detectedSessionId,
    created,
    updated,
    skipped,
  };
}
