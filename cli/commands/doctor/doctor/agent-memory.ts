import {
  accessSync,
  existsSync,
  constants as fsConstants,
  readFileSync,
} from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { retryObservePath } from "../../../state/events.js";
import type {
  MemoryDaemonResult,
  MemoryProviderStatus,
  MemoryServicePresence,
} from "../../../types/memory.js";
import {
  controlAgentMemoryDaemon,
  getAgentMemoryServicePresence,
} from "../../memory/memory.js";
import type {
  AgentMemoryBinaryCheck,
  AgentMemoryDaemonCheck,
  AgentMemoryDoctorCheck,
  AgentMemoryRetryQueueCheck,
} from "../types.js";

function isValidRetryLine(line: string): boolean {
  try {
    const parsed = JSON.parse(line) as Record<string, unknown>;
    return (
      typeof parsed.sid === "string" &&
      typeof parsed.kind === "string" &&
      typeof parsed.eventId === "string" &&
      typeof parsed.ts === "string"
    );
  } catch {
    return false;
  }
}

function collectRetryQueue(cwd: string): AgentMemoryRetryQueueCheck {
  const path = retryObservePath(cwd);
  if (!existsSync(path)) return { path, total: 0, invalid: 0 };
  const lines = readFileSync(path, "utf-8")
    .split("\n")
    .filter((line) => line.trim());
  return {
    path,
    total: lines.length,
    invalid: lines.filter((line) => !isValidRetryLine(line)).length,
  };
}

function summarizeDaemon(daemon: MemoryDaemonResult): AgentMemoryDaemonCheck {
  return {
    pidPath: daemon.pidPath,
    ownedPid: daemon.ownedPid,
    ownedProcessRunning: daemon.ownedProcessRunning,
    endpoint: daemon.endpoint,
  };
}

function canExecute(path: string): boolean {
  try {
    accessSync(path, fsConstants.X_OK);
    return true;
  } catch {
    return false;
  }
}

function executableSearchPaths(env: NodeJS.ProcessEnv): string[] {
  const home = homedir();
  return [
    ...(env.PATH ?? "").split(":"),
    join(home, ".bun", "bin"),
    join(home, ".local", "bin"),
    "/opt/homebrew/bin",
    "/usr/local/bin",
    "/usr/bin",
    "/bin",
    "/usr/sbin",
    "/sbin",
  ].filter((path, index, paths) => path && paths.indexOf(path) === index);
}

function findExecutable(
  command: string,
  env: NodeJS.ProcessEnv,
): string | undefined {
  if (command.includes("/")) {
    return existsSync(command) && canExecute(command) ? command : undefined;
  }
  for (const dir of executableSearchPaths(env)) {
    const candidate = join(dir, command);
    if (existsSync(candidate) && canExecute(candidate)) return candidate;
  }
  return undefined;
}

function collectAgentMemoryBinary(
  env: NodeJS.ProcessEnv,
): AgentMemoryBinaryCheck {
  const command = env.AGENTMEMORY_BIN || "agentmemory";
  const path = findExecutable(command, env);
  return {
    command,
    available: path !== undefined,
    path,
  };
}

function agentMemoryIssues(args: {
  status: MemoryProviderStatus;
  binary: AgentMemoryBinaryCheck;
  retryQueue: AgentMemoryRetryQueueCheck;
  service: MemoryServicePresence;
}): string[] {
  const issues: string[] = [];
  if (args.status.endpoint && !args.status.reachable) {
    issues.push(args.status.reason ?? "AgentMemory endpoint is not reachable");
  }
  if (!args.binary.available && args.service.installed) {
    issues.push(`AgentMemory binary not found: ${args.binary.command}`);
  }
  if (args.retryQueue.total > 0) {
    issues.push(`${args.retryQueue.total} queued AgentMemory observe retries`);
  }
  if (args.retryQueue.invalid > 0) {
    issues.push(`${args.retryQueue.invalid} invalid AgentMemory retry rows`);
  }
  return issues;
}

export async function collectAgentMemoryCheck(
  cwd: string,
): Promise<AgentMemoryDoctorCheck> {
  const retryQueue = collectRetryQueue(cwd);
  const daemon = await controlAgentMemoryDaemon({ action: "status" });
  const status = daemon.status;
  const binary = collectAgentMemoryBinary(process.env);
  const service = getAgentMemoryServicePresence();
  return {
    status,
    binary,
    retryQueue,
    service,
    daemon: summarizeDaemon(daemon),
    issues: agentMemoryIssues({ status, binary, retryQueue, service }),
  };
}
