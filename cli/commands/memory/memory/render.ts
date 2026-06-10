import * as p from "@clack/prompts";
import pc from "picocolors";
import { ensureMemorySchema } from "../../../io/memory.js";
import {
  installAgentMemoryService,
  uninstallAgentMemoryService,
} from "../../../platform/agentmemory-service.js";
import type {
  MemoryMaintainAction,
  MemoryMaintainOptions,
  MemoryUpgradeOptions,
} from "../../../types/memory.js";
import { controlAgentMemoryDaemon } from "./daemon.js";
import { maintainAgentMemory } from "./maintain.js";
import { drainMemoryRetryQueue } from "./retry-drain.js";
import { getAgentMemoryStatus, setupAgentMemory } from "./setup.js";
import { upgradeAgentMemory } from "./upgrade.js";

export async function initMemory(
  jsonMode = false,
  forceMode = false,
): Promise<void> {
  const cwd = process.cwd();
  const result = ensureMemorySchema(cwd, { force: forceMode });

  if (jsonMode) {
    console.log(JSON.stringify(result, null, 2));
    return;
  }

  console.clear();
  p.intro(pc.bgMagenta(pc.white(" 🧠 oh-my-agent memory:init ")));

  const summaryLines = [
    `Memories dir: ${pc.cyan(result.memoriesDir)}`,
    `Session ID: ${pc.cyan(result.sessionId)}`,
    "",
    pc.bold("Created:"),
    result.created.length > 0
      ? result.created.map((f) => `  + ${f}`).join("\n")
      : "  (none)",
    "",
    pc.bold("Updated:"),
    result.updated.length > 0
      ? result.updated.map((f) => `  ~ ${f}`).join("\n")
      : "  (none)",
    "",
    pc.bold("Skipped:"),
    result.skipped.length > 0
      ? result.skipped.map((f) => `  - ${f}`).join("\n")
      : "  (none)",
  ].join("\n");

  p.note(summaryLines, "Memory Schema");
  p.outro(pc.green("Memory schema ready!"));
}

export async function printAgentMemoryStatus(jsonMode = false): Promise<void> {
  const status = await getAgentMemoryStatus();
  if (jsonMode) {
    console.log(JSON.stringify(status, null, 2));
    return;
  }

  const reachable = status.reachable
    ? pc.green("reachable")
    : pc.red("offline");
  p.note(
    [
      `Status: ${reachable}`,
      status.endpoint ? `Endpoint: ${pc.cyan(status.endpoint)}` : null,
      status.version ? `Version: ${pc.cyan(status.version)}` : null,
      status.reason ? `Reason: ${status.reason}` : null,
    ]
      .filter((line): line is string => line !== null)
      .join("\n"),
    "AgentMemory",
  );
}

export async function printAgentMemorySetup(
  jsonMode = false,
  args: {
    endpoint?: string;
    port?: number | string;
    dryRun?: boolean;
    install?: boolean;
    start?: boolean;
  } = {},
): Promise<void> {
  const result = await setupAgentMemory(args);
  if (jsonMode) {
    console.log(JSON.stringify(result, null, 2));
    return;
  }

  const lines = [
    `Config dir: ${pc.cyan(result.configDir)}`,
    `Endpoint file: ${pc.cyan(result.endpointPath)}`,
    `Endpoint: ${result.endpoint ? pc.cyan(result.endpoint) : pc.yellow("(not configured)")}`,
    `Wrote endpoint: ${result.wroteEndpoint ? pc.green("yes") : "no"}`,
    result.dryRun ? pc.dim("Dry run: files unchanged") : null,
    `Install: ${pc.cyan(result.installCommand)}`,
  ];
  if (result.installRequested) {
    const installState = result.installSkipped
      ? pc.yellow("skipped")
      : result.installExitCode === 0
        ? pc.green("ok")
        : pc.red(String(result.installExitCode ?? "unknown"));
    lines.push(`Install result: ${installState}`);
  }
  if (result.service?.servicePath) {
    lines.push(`Service: ${pc.cyan(result.service.servicePath)}`);
    lines.push(
      `Service file: ${result.service.wroteFile ? pc.green("installed") : pc.yellow(result.service.dryRun ? "preview" : "not written")}`,
    );
  }
  lines.push(`Start: ${pc.cyan(result.startCommand)}`);
  if (result.daemon?.startedPid)
    lines.push(`Started PID: ${result.daemon.startedPid}`);
  if (result.daemon?.message) lines.push(result.daemon.message);
  if (result.status.reason) lines.push(`Status: ${result.status.reason}`);
  p.note(
    lines.filter((line): line is string => line !== null).join("\n"),
    "AgentMemory setup",
  );
}

export async function printAgentMemoryDaemon(
  action: "status" | "start" | "stop" | "restart",
  jsonMode = false,
  args: {
    port?: number | string;
    dryRun?: boolean;
  } = {},
): Promise<void> {
  const result = await controlAgentMemoryDaemon({ action, ...args });
  if (jsonMode) {
    console.log(JSON.stringify(result, null, 2));
    return;
  }

  const lines = [
    `Endpoint: ${result.endpoint ? pc.cyan(result.endpoint) : pc.yellow("(not configured)")}`,
    `Reachable: ${result.status.reachable ? pc.green("yes") : pc.red("no")}`,
  ];
  if (result.startedPid) lines.push(`Started PID: ${result.startedPid}`);
  if (result.stoppedPid) lines.push(`Stopped PID: ${result.stoppedPid}`);
  if (result.ownedPid) {
    lines.push(
      `OMA-owned PID: ${result.ownedPid} (${result.ownedProcessRunning ? "running" : "not running"})`,
    );
  }
  if (result.attemptedFallbackStop) {
    lines.push(`Fallback stop exit: ${result.fallbackStopCode ?? "unknown"}`);
  }
  if (result.message) lines.push(result.message);
  if (result.status.reason) lines.push(`Reason: ${result.status.reason}`);
  p.note(lines.join("\n"), `AgentMemory daemon: ${action}`);
}

export function printAgentMemoryServiceInstall(
  jsonMode = false,
  dryRun = false,
  port?: number | string,
): void {
  const result = installAgentMemoryService({ dryRun, port });
  if (jsonMode) {
    console.log(JSON.stringify(result, null, 2));
    return;
  }

  p.note(
    [
      `Platform: ${result.platform}`,
      result.servicePath ? `Path: ${pc.cyan(result.servicePath)}` : null,
      `Wrote file: ${result.wroteFile ? pc.green("yes") : "no"}`,
      `Activated: ${result.activated ? pc.green("yes") : "no"}`,
      result.commands.length > 0
        ? `Commands:\n${result.commands.map((line) => `  ${line}`).join("\n")}`
        : null,
      result.commandError ? `Error: ${pc.red(result.commandError)}` : null,
      result.supported ? pc.yellow(result.message) : pc.red(result.message),
      result.content ? `\n${result.content.trimEnd()}` : null,
    ]
      .filter((line): line is string => line !== null)
      .join("\n"),
    "AgentMemory service: install",
  );
}

export function printAgentMemoryServiceUninstall(
  jsonMode = false,
  dryRun = false,
): void {
  const result = uninstallAgentMemoryService({ dryRun });
  if (jsonMode) {
    console.log(JSON.stringify(result, null, 2));
    return;
  }

  p.note(
    [
      `Platform: ${result.platform}`,
      result.servicePath ? `Path: ${pc.cyan(result.servicePath)}` : null,
      `Removed file: ${result.removedFile ? pc.green("yes") : "no"}`,
      result.commands.length > 0
        ? `Commands:\n${result.commands.map((line) => `  ${line}`).join("\n")}`
        : null,
      result.commandError ? `Error: ${pc.red(result.commandError)}` : null,
      result.supported ? pc.yellow(result.message) : pc.red(result.message),
    ]
      .filter((line): line is string => line !== null)
      .join("\n"),
    "AgentMemory service: uninstall",
  );
}

export function printAgentMemoryMaintain(
  action: MemoryMaintainAction,
  jsonMode = false,
  args: Omit<MemoryMaintainOptions, "action"> = {},
): void {
  const result = maintainAgentMemory({ action, ...args });
  if (jsonMode) {
    console.log(JSON.stringify(result, null, 2));
    if (result.vacuumResults.some((item) => item.status !== 0)) {
      process.exitCode = 1;
    }
    return;
  }

  const lines = [
    `Config dir: ${pc.cyan(result.configDir)}`,
    `Backup dir: ${pc.cyan(result.backupDir)}`,
    result.backupPath ? `Backup path: ${pc.cyan(result.backupPath)}` : null,
    result.copiedFiles > 0 ? `Copied files: ${result.copiedFiles}` : null,
    result.prunedBackups.length > 0
      ? `Pruned backups:\n${result.prunedBackups.map((path) => `  ${path}`).join("\n")}`
      : null,
    result.vacuumTargets.length > 0
      ? `SQLite files:\n${result.vacuumTargets.map((path) => `  ${path}`).join("\n")}`
      : null,
    result.vacuumResults.length > 0
      ? `Commands:\n${result.vacuumResults.map((item) => `  ${item.command} -> ${item.status ?? "unknown"}${item.error ? ` (${item.error})` : ""}`).join("\n")}`
      : null,
    result.dryRun ? pc.dim("Dry run: files unchanged") : null,
    result.message,
  ].filter((line): line is string => line !== null);

  p.note(lines.join("\n"), `AgentMemory maintain: ${action}`);
  if (result.vacuumResults.some((item) => item.status !== 0)) {
    process.exitCode = 1;
  }
}

export async function printAgentMemoryUpgrade(
  jsonMode = false,
  args: MemoryUpgradeOptions = {},
): Promise<void> {
  const result = await upgradeAgentMemory(args);
  if (jsonMode) {
    console.log(JSON.stringify(result, null, 2));
    if (
      !result.dryRun &&
      (result.upgradeExitCode !== 0 || !result.status.reachable)
    ) {
      process.exitCode = 1;
    }
    return;
  }

  const lines = [
    `Command: ${pc.cyan(result.upgradeCommand)}`,
    `Backup: ${result.backup.backupPath ? pc.cyan(result.backup.backupPath) : pc.yellow("(none)")}`,
    `Stop reachable: ${result.stop.status.reachable ? pc.green("yes") : pc.yellow("no")}`,
    result.upgradeExitCode !== undefined
      ? `Upgrade exit: ${result.upgradeExitCode === 0 ? pc.green("0") : pc.red(String(result.upgradeExitCode))}`
      : null,
    result.upgradeError
      ? `Upgrade error: ${pc.red(result.upgradeError)}`
      : null,
    result.start?.startedPid ? `Started PID: ${result.start.startedPid}` : null,
    `Health: ${result.status.reachable ? pc.green("reachable") : pc.red("offline")}`,
    result.status.version ? `Version: ${pc.cyan(result.status.version)}` : null,
    result.status.reason ? `Reason: ${result.status.reason}` : null,
    result.dryRun ? pc.dim("Dry run: files unchanged") : null,
    result.message,
  ].filter((line): line is string => line !== null);

  p.note(lines.join("\n"), "AgentMemory upgrade");
  if (
    !result.dryRun &&
    (result.upgradeExitCode !== 0 || !result.status.reachable)
  ) {
    process.exitCode = 1;
  }
}

export async function printMemoryRetryDrain(
  jsonMode = false,
  dryRun = false,
): Promise<void> {
  const result = await drainMemoryRetryQueue({ dryRun });
  if (jsonMode) {
    console.log(JSON.stringify(result, null, 2));
    return;
  }

  const lines = [
    `Path: ${pc.cyan(result.retryPath)}`,
    `Total: ${result.total}`,
    `Drained: ${pc.green(String(result.drained))}`,
    `Retained: ${pc.yellow(String(result.retained))}`,
  ];
  if (result.invalid > 0)
    lines.push(`Invalid: ${pc.red(String(result.invalid))}`);
  if (result.dryRun) lines.push(pc.dim("Dry run: retry file unchanged"));
  p.note(lines.join("\n"), "Retry queue");
}
