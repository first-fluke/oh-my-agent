import { readdirSync, readFileSync, statSync } from "node:fs";
import { basename, join } from "node:path";

export type DashboardSession = {
  id: string;
  status: string;
};

export type DashboardAgent = {
  agent: string;
  status: string;
  task: string;
  turn: number | null;
};

export type DashboardActivity = {
  agent: string;
  message: string;
  file: string;
};

export type DashboardState = {
  session: DashboardSession;
  agents: DashboardAgent[];
  activity: DashboardActivity[];
  memoriesDir: string;
  updatedAt: string;
};

const EMPTY_SESSION: DashboardSession = { id: "N/A", status: "UNKNOWN" };

export function resolveMemoriesDir(): string {
  if (process.env.MEMORIES_DIR) {
    return process.env.MEMORIES_DIR;
  }

  const cliArg = process.argv[3];
  if (cliArg) {
    return join(cliArg, ".serena", "memories");
  }

  return join(process.cwd(), ".serena", "memories");
}

function readFileSafe(filePath: string): string {
  try {
    return readFileSync(filePath, "utf-8");
  } catch {
    return "";
  }
}

function listSortedFiles(
  memoriesDir: string,
  predicate: (filename: string) => boolean,
): { name: string; mtime: number }[] {
  try {
    return readdirSync(memoriesDir)
      .filter(predicate)
      .map((name) => ({
        name,
        mtime: statSync(join(memoriesDir, name)).mtimeMs,
      }))
      .sort((a, b) => b.mtime - a.mtime);
  } catch {
    return [];
  }
}

function findSessionFile(memoriesDir: string): string | null {
  const files = listSortedFiles(memoriesDir, () => true);
  if (files.some((file) => file.name === "orchestrator-session.md")) {
    return join(memoriesDir, "orchestrator-session.md");
  }

  const latestSession = files.find((file) =>
    /^session-.*\.md$/.test(file.name),
  );
  return latestSession ? join(memoriesDir, latestSession.name) : null;
}

function parseSessionInfo(memoriesDir: string): DashboardSession {
  const sessionFile = findSessionFile(memoriesDir);
  if (!sessionFile) {
    return EMPTY_SESSION;
  }

  const content = readFileSafe(sessionFile);
  if (!content) {
    return EMPTY_SESSION;
  }

  const id =
    (content.match(/session-id:\s*(.+)/i) || [])[1] ||
    (content.match(/# Session:\s*(.+)/i) || [])[1] ||
    content.match(/(session-\d{8}-\d{6})/)?.[1] ||
    basename(sessionFile, ".md") ||
    "N/A";

  let status = "UNKNOWN";
  if (/IN PROGRESS|RUNNING|## Active|\[IN PROGRESS\]/i.test(content)) {
    status = "RUNNING";
  } else if (/COMPLETED|DONE|## Completed|\[COMPLETED\]/i.test(content)) {
    status = "COMPLETED";
  } else if (/FAILED|ERROR|## Failed|\[FAILED\]/i.test(content)) {
    status = "FAILED";
  } else if (/Step \d+:.*\[/i.test(content)) {
    status = "RUNNING";
  }

  return { id: id.trim(), status };
}

function parseTaskBoard(memoriesDir: string): Omit<DashboardAgent, "turn">[] {
  const content = readFileSafe(join(memoriesDir, "task-board.md"));
  if (!content) {
    return [];
  }

  const agents: Omit<DashboardAgent, "turn">[] = [];
  for (const line of content.split("\n")) {
    if (!line.startsWith("|") || /^\|\s*-+/.test(line)) {
      continue;
    }

    const columns = line
      .split("|")
      .map((column) => column.trim())
      .filter(Boolean);
    const agentName = columns[0];
    if (columns.length < 2 || !agentName || /^agent$/i.test(agentName)) {
      continue;
    }

    agents.push({
      agent: columns[0] || "",
      status: columns[1] || "pending",
      task: columns[2] || "",
    });
  }

  return agents;
}

function getAgentTurn(memoriesDir: string, agent: string): number | null {
  try {
    const files = readdirSync(memoriesDir)
      .filter(
        (file) => file.startsWith(`progress-${agent}`) && file.endsWith(".md"),
      )
      .sort()
      .reverse();
    if (files.length === 0 || !files[0]) {
      return null;
    }

    const content = readFileSafe(join(memoriesDir, files[0]));
    const match = content.match(/turn[:\s]*(\d+)/i);
    return match?.[1] ? Number.parseInt(match[1], 10) : null;
  } catch {
    return null;
  }
}

function normalizeActivityName(filename: string): string {
  return (
    filename
      .replace(/^(progress|result|session|debug|task)-?/, "")
      .replace(/[-_]agent/, "")
      .replace(/[-_]completion/, "")
      .replace(/\.md$/, "")
      .replace(/[-_]/g, " ")
      .trim() || filename.replace(/\.md$/, "")
  );
}

function extractLatestMessage(content: string): string {
  const lines = content
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith("---") && line.length > 3);

  for (let index = lines.length - 1; index >= 0; index -= 1) {
    const line = lines[index];
    if (!line) {
      continue;
    }

    if (/^\*\*|^#+|^-|^\d+\.|Status|Result|Action|Step/i.test(line)) {
      const message = line
        .replace(/^[#*\-\d.]+\s*/, "")
        .replace(/\*\*/g, "")
        .trim();
      if (message.length > 5) {
        return message.length > 80 ? `${message.substring(0, 77)}...` : message;
      }
    }
  }

  return "";
}

function getLatestActivity(memoriesDir: string): DashboardActivity[] {
  return listSortedFiles(
    memoriesDir,
    (file) => file.endsWith(".md") && file !== ".gitkeep",
  )
    .slice(0, 5)
    .map((file) => {
      const message = extractLatestMessage(
        readFileSafe(join(memoriesDir, file.name)),
      );
      return {
        agent: normalizeActivityName(file.name),
        message,
        file: file.name,
      };
    })
    .filter((activity) => activity.message);
}

function detectAgentStatus(content: string): string {
  if (/\[COMPLETED\]|## Completed|## Results/i.test(content)) {
    return "completed";
  }
  if (/\[IN PROGRESS\]|## Progress|IN PROGRESS/i.test(content)) {
    return "running";
  }
  if (/\[FAILED\]|## Failed|ERROR/i.test(content)) {
    return "failed";
  }
  return "unknown";
}

function discoverAgentsFromFiles(memoriesDir: string): DashboardAgent[] {
  const agents: DashboardAgent[] = [];
  const seen = new Set<string>();

  for (const file of listSortedFiles(
    memoriesDir,
    (name) => name.endsWith(".md") && name !== ".gitkeep",
  )) {
    const content = readFileSafe(join(memoriesDir, file.name));
    const agentMatch =
      content.match(/\*\*Agent\*\*:\s*(.+)/i) ||
      content.match(/Agent:\s*(.+)/i) ||
      content.match(/^#+\s*(.+?)\s*Agent/im);

    let agentName: string | null = null;
    if (agentMatch?.[1]) {
      agentName = agentMatch[1].trim();
    } else if (/_agent|agent_|-agent/i.test(file.name)) {
      agentName = file.name
        .replace(/\.md$/, "")
        .replace(/[-_]completion|[-_]progress|[-_]result/gi, "")
        .replace(/[-_]/g, " ")
        .trim();
    }

    if (!agentName || seen.has(agentName.toLowerCase())) {
      continue;
    }

    seen.add(agentName.toLowerCase());
    const taskMatch =
      content.match(/## Task\s*\n+(.+)/i) ||
      content.match(/\*\*Task\*\*:\s*(.+)/i);

    agents.push({
      agent: agentName,
      status: detectAgentStatus(content),
      task: taskMatch?.[1] ? taskMatch[1].trim().substring(0, 60) : "",
      turn: getAgentTurn(memoriesDir, agentName),
    });
  }

  return agents;
}

export function buildFullState(memoriesDir: string): DashboardState {
  const session = parseSessionInfo(memoriesDir);
  let agents = parseTaskBoard(memoriesDir).map((agent) => ({
    ...agent,
    turn: getAgentTurn(memoriesDir, agent.agent),
  }));

  if (agents.length === 0) {
    agents = discoverAgentsFromFiles(memoriesDir);
  }

  if (agents.length === 0) {
    agents = listSortedFiles(
      memoriesDir,
      (file) => file.startsWith("progress-") && file.endsWith(".md"),
    ).map((file) => {
      const agent = file.name.replace(/^progress-/, "").replace(/\.md$/, "");
      return {
        agent,
        status: "running",
        task: "",
        turn: getAgentTurn(memoriesDir, agent),
      };
    });
  }

  return {
    session,
    agents,
    activity: getLatestActivity(memoriesDir),
    memoriesDir,
    updatedAt: new Date().toISOString(),
  };
}
