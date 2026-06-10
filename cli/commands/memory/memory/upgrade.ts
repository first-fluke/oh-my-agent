import { homedir } from "node:os";
import {
  DEFAULT_AGENTMEMORY_PORT,
  defaultServiceCommandRunner,
  parsePositivePort,
} from "../../../platform/agentmemory-service.js";
import type {
  MemoryDaemonResult,
  MemoryUpgradeOptions,
  MemoryUpgradeResult,
} from "../../../types/memory.js";
import { controlAgentMemoryDaemon } from "./daemon.js";
import {
  portFromEndpointConfig,
  readEndpointConfig,
} from "./endpoint-config.js";
import { maintainAgentMemory } from "./maintain.js";

export const AGENTMEMORY_UPGRADE_COMMAND =
  "bun update -g @agentmemory/agentmemory";

export async function upgradeAgentMemory(
  args: MemoryUpgradeOptions = {},
): Promise<MemoryUpgradeResult> {
  const homeDir = args.homeDir ?? homedir();
  const env = args.env ?? process.env;
  const runner = args.runner ?? defaultServiceCommandRunner;
  const configuredPort =
    parsePositivePort(args.port) ??
    portFromEndpointConfig(readEndpointConfig(homeDir)) ??
    DEFAULT_AGENTMEMORY_PORT;
  const dryRun = args.dryRun === true;

  const stop = await controlAgentMemoryDaemon({
    action: "stop",
    homeDir,
    env,
    bin: args.bin,
    dryRun,
  });
  const backup = maintainAgentMemory({
    action: "backup",
    homeDir,
    dryRun,
  });

  let upgradeExitCode: number | null | undefined;
  let upgradeError: string | undefined;
  let start: MemoryDaemonResult | undefined;
  let status = stop.status;
  let message = dryRun
    ? "AgentMemory upgrade would stop, backup, update, start, and health-check"
    : "AgentMemory upgrade completed";

  if (!dryRun) {
    const upgrade = runner({
      bin: "bun",
      args: ["update", "-g", "@agentmemory/agentmemory"],
    });
    upgradeExitCode = upgrade.status;
    upgradeError = upgrade.error;

    start = await controlAgentMemoryDaemon({
      action: "start",
      homeDir,
      env,
      bin: args.bin,
      port: configuredPort,
    });
    status = start.status;

    if (upgrade.status === 0) {
      message = status.reachable
        ? "AgentMemory upgrade completed"
        : "AgentMemory upgraded but health check failed";
    } else {
      message = status.reachable
        ? "AgentMemory upgrade failed; restarted existing installation"
        : "AgentMemory upgrade failed and restart health check failed";
    }
  }

  return {
    homeDir,
    dryRun,
    stop,
    backup,
    upgradeCommand: AGENTMEMORY_UPGRADE_COMMAND,
    upgradeExitCode,
    upgradeError,
    start,
    status,
    message,
  };
}
