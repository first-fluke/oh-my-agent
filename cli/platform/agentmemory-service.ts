import { existsSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { dirname } from "node:path";
import type {
  MemoryServiceOptions,
  MemoryServicePresence,
  MemoryServiceResult,
  MemoryServiceUninstallOptions,
} from "../types/memory.js";
import {
  defaultServiceCommandRunner,
  formatServiceCommand,
  runServiceCommands,
  serviceCommands,
} from "./agentmemory/service-commands.js";
import {
  agentMemoryServicePath,
  renderLaunchdService,
  renderSystemdService,
  renderWindowsTaskXml,
} from "./agentmemory/service-files.js";

/**
 * AgentMemory daemon service orchestration (D43).
 *
 * Facade over `platform/agentmemory/`: service-file rendering lives in
 * `service-files.ts`, activation command plans in `service-commands.ts`;
 * this module owns presence checks and the install/uninstall flows.
 * Extracted from `commands/memory/memory.ts` so the platform concern lives
 * in one place (design doc 013).
 */

export {
  defaultServiceCommandRunner,
  WINDOWS_TASK_NAME,
} from "./agentmemory/service-commands.js";
export { LAUNCHD_AGENTMEMORY_LABEL } from "./agentmemory/service-files.js";

export const DEFAULT_AGENTMEMORY_PORT = 3111;

export function parsePositivePort(
  value: number | string | undefined,
): number | null {
  if (value === undefined) return null;
  const port = typeof value === "number" ? value : Number(value);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error(`invalid AgentMemory port: ${value}`);
  }
  return port;
}

export function getAgentMemoryServicePresence(
  args: { homeDir?: string; platform?: NodeJS.Platform } = {},
): MemoryServicePresence {
  const homeDir = args.homeDir ?? homedir();
  const platform = args.platform ?? process.platform;
  const servicePath = agentMemoryServicePath(homeDir, platform);
  return {
    platform,
    supported: servicePath !== undefined,
    servicePath,
    installed: servicePath ? existsSync(servicePath) : false,
  };
}

export function installAgentMemoryService(
  args: MemoryServiceOptions = {},
): MemoryServiceResult {
  const homeDir = args.homeDir ?? homedir();
  const platform = args.platform ?? process.platform;
  const port = parsePositivePort(args.port) ?? DEFAULT_AGENTMEMORY_PORT;
  const servicePath = agentMemoryServicePath(homeDir, platform);
  const content =
    platform === "darwin"
      ? renderLaunchdService({
          homeDir,
          port,
          executable: args.executable,
          runtimePath: args.runtimePath,
        })
      : platform === "linux"
        ? renderSystemdService({
            homeDir,
            port,
            executable: args.executable,
            runtimePath: args.runtimePath,
          })
        : platform === "win32"
          ? renderWindowsTaskXml({
              homeDir,
              port,
              executable: args.executable,
              runtimePath: args.runtimePath,
            })
          : undefined;
  const commands =
    servicePath === undefined
      ? []
      : serviceCommands({ action: "install", platform, servicePath });
  const commandLines = commands.map(formatServiceCommand);

  const runner = args.runner ?? defaultServiceCommandRunner;
  let wroteFile = false;
  let activated = false;
  let commandExitCode: number | null | undefined;
  let commandError: string | undefined;
  if (servicePath && content && !args.dryRun) {
    mkdirSync(dirname(servicePath), { recursive: true, mode: 0o700 });
    writeFileSync(servicePath, content, { encoding: "utf-8", mode: 0o600 });
    wroteFile = true;

    const commandResult = runServiceCommands({ commands, runner });
    activated = commandResult.activated;
    commandExitCode = commandResult.commandExitCode;
    commandError = commandResult.commandError;

    // `launchctl bootstrap` returns EIO (5) in some macOS session contexts
    // (background jobs, certain Aqua/login states). The legacy `load -w` API is
    // deprecated but still works there, so fall back to it before giving up.
    if (!activated && platform === "darwin") {
      const legacy = runner({
        bin: "launchctl",
        args: ["load", "-w", servicePath],
      });
      commandLines.push(`launchctl load -w ${servicePath}`);
      if (legacy.status === 0) {
        activated = true;
        commandExitCode = 0;
        commandError = undefined;
      }
    }
  }

  return {
    action: "install",
    platform,
    supported: servicePath !== undefined,
    dryRun: args.dryRun === true,
    servicePath,
    wroteFile,
    removedFile: false,
    activated,
    commands: commandLines,
    commandExitCode,
    commandError,
    content: args.dryRun ? content : undefined,
    message:
      servicePath === undefined
        ? `AgentMemory service install is not supported on ${platform}`
        : args.dryRun
          ? "AgentMemory service file would be written and activated"
          : activated
            ? "AgentMemory service installed and activated"
            : "AgentMemory service file installed but activation failed",
  };
}

export function uninstallAgentMemoryService(
  args: MemoryServiceUninstallOptions = {},
): MemoryServiceResult {
  const homeDir = args.homeDir ?? homedir();
  const platform = args.platform ?? process.platform;
  const servicePath = agentMemoryServicePath(homeDir, platform);
  const commands =
    servicePath === undefined
      ? []
      : serviceCommands({ action: "uninstall", platform, servicePath });
  const commandLines = commands.map(formatServiceCommand);

  let removedFile = false;
  let activated = false;
  let commandExitCode: number | null | undefined;
  let commandError: string | undefined;

  if (servicePath && !args.dryRun) {
    const runner = args.runner ?? defaultServiceCommandRunner;
    const commandResult = runServiceCommands({ commands, runner });
    activated = commandResult.activated;
    commandExitCode = commandResult.commandExitCode;
    commandError = commandResult.commandError;

    // Best-effort legacy unload to match the `load -w` install fallback; the
    // modern `bootout` may EIO in the same contexts (see installer note).
    if (platform === "darwin") {
      runner({ bin: "launchctl", args: ["unload", "-w", servicePath] });
      commandLines.push(`launchctl unload -w ${servicePath}`);
    }

    if (existsSync(servicePath)) {
      rmSync(servicePath, { force: true });
      removedFile = true;
    }
  }

  return {
    action: "uninstall",
    platform,
    supported: servicePath !== undefined,
    dryRun: args.dryRun === true,
    servicePath,
    wroteFile: false,
    removedFile,
    activated,
    commands: commandLines,
    commandExitCode,
    commandError,
    message:
      servicePath === undefined
        ? `AgentMemory service uninstall is not supported on ${platform}`
        : args.dryRun
          ? "AgentMemory service would be disabled and removed"
          : commandError
            ? "AgentMemory service file removed but disable failed"
            : "AgentMemory service disabled and removed",
  };
}
