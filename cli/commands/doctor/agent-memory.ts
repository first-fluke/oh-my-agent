import { homedir } from "node:os";
import { join } from "node:path";
import { retryObservePath } from "../../state/events.js";
import {
  parseMemoryRetryLine,
  readMemoryRetryQueue,
} from "../../state/memory-retry-queue.js";
import type {
  MemoryDaemonResult,
  MemoryProviderStatus,
  MemoryServicePresence,
} from "../../types/memory.js";
import { findExecutable } from "../../utils/find-executable.js";
import {
  controlAgentMemoryDaemon,
  getAgentMemoryServicePresence,
} from "../memory/command.js";
import type {
  AgentMemoryBinaryCheck,
  AgentMemoryDaemonCheck,
  AgentMemoryDoctorCheck,
  AgentMemoryRetryQueueCheck,
} from "./types.js";

function isValidRetryLine(line: string): boolean {
  return parseMemoryRetryLine(line) !== null;
}

function collectRetryQueue(cwd: string): AgentMemoryRetryQueueCheck {
  const path = retryObservePath(cwd);
  const lines = readMemoryRetryQueue(cwd);
  return {
    path,
    total: lines.length,
    invalid: lines.filter(({ line }) => !isValidRetryLine(line)).length,
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

function agentMemoryExtraDirs(): string[] {
  const home = homedir();
  return [
    join(home, ".bun", "bin"),
    join(home, ".local", "bin"),
    "/opt/homebrew/bin",
    "/usr/local/bin",
    "/usr/bin",
    "/bin",
    "/usr/sbin",
    "/sbin",
  ];
}

export function collectAgentMemoryBinary(
  env: NodeJS.ProcessEnv,
  platform: NodeJS.Platform = process.platform,
): AgentMemoryBinaryCheck {
  const command = env.AGENTMEMORY_BIN || "agentmemory";
  const path = findExecutable(command, {
    env,
    platform,
    extraDirs: agentMemoryExtraDirs(),
  });
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
    issues.push(
      `AgentMemory recall inactive: ${args.status.reason ?? "endpoint is not reachable"} — cross-session facts will not be recalled`,
    );
  }
  // Recall failing silently is the worst mode: the user set the service up
  // (or a binary is present) but no endpoint resolves, so every session
  // starts without memory and nothing ever says so. Surface it here.
  const explicitlyDisabled = args.status.reason?.includes("disabled") ?? false;
  if (
    !args.status.endpoint &&
    !explicitlyDisabled &&
    (args.service.installed || args.binary.available)
  ) {
    issues.push(
      "AgentMemory recall inactive: endpoint not configured " +
        "(~/.agentmemory/endpoint.json missing) — run `oma memory setup`",
    );
  }
  if (!args.binary.available && args.service.installed) {
    issues.push(`AgentMemory binary not found: ${args.binary.command}`);
  }
  if (args.retryQueue.total > 0) {
    issues.push(`${args.retryQueue.total} queued memory delivery retries`);
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
