import { spawn, spawnSync } from "node:child_process";
import {
  cpSync,
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  renameSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { homedir } from "node:os";
import { dirname, isAbsolute, join, relative } from "node:path";
import * as p from "@clack/prompts";
import pc from "picocolors";
import { ensureMemorySchema } from "../../io/memory.js";
import {
  DEFAULT_AGENTMEMORY_PORT,
  defaultServiceCommandRunner,
  getAgentMemoryServicePresence,
  installAgentMemoryService,
  parsePositivePort,
  uninstallAgentMemoryService,
} from "../../platform/agentmemory-service.js";
import { type OmaEvent, retryObservePath } from "../../state/events.js";
import {
  createAgentMemoryProvider,
  resolveAgentMemoryEndpoint,
} from "../../state/memory-provider.js";
import type {
  AgentMemoryEndpointConfig,
  MemoryCommandStatus,
  MemoryDaemonResult,
  MemoryMaintainAction,
  MemoryMaintainCommandResult,
  MemoryMaintainOptions,
  MemoryMaintainResult,
  MemoryProvider,
  MemoryProviderStatus,
  MemoryRetryDrainResult,
  MemoryServiceCommandRunner,
  MemoryServiceResult,
  MemorySetupOptions,
  MemorySetupResult,
  MemoryUpgradeOptions,
  MemoryUpgradeResult,
} from "../../types/memory.js";

// Service-file generation lives in `platform/agentmemory-service.ts` (D43);
// re-export the public surface so existing import sites stay stable.
export {
  getAgentMemoryServicePresence,
  installAgentMemoryService,
  uninstallAgentMemoryService,
};

const AGENTMEMORY_INSTALL_COMMAND = "bun install -g @agentmemory/agentmemory";
const AGENTMEMORY_UPGRADE_COMMAND = "bun update -g @agentmemory/agentmemory";
const AGENTMEMORY_START_COMMAND = "agentmemory";
const DEFAULT_BACKUP_KEEP = 5;
const OMA_AGENTMEMORY_PID_FILE = "oma-agentmemory.pid";
const OMA_AGENTMEMORY_BACKUPS_DIR = "backups";
const OMA_AGENTMEMORY_BACKUP_PREFIX = "oma-agentmemory-";

function defaultAgentMemoryInstaller(): Promise<MemoryCommandStatus> {
  const result = spawnSync(
    "bun",
    ["install", "-g", "@agentmemory/agentmemory"],
    {
      encoding: "utf-8",
      stdio: "inherit",
    },
  );
  return Promise.resolve({
    status: result.status,
    error: result.error?.message,
  });
}

function agentMemoryConfigDir(homeDir: string): string {
  return join(homeDir, ".agentmemory");
}

function agentMemoryEndpointPath(homeDir: string): string {
  return join(agentMemoryConfigDir(homeDir), "endpoint.json");
}

function agentMemoryPidPath(homeDir: string): string {
  return join(agentMemoryConfigDir(homeDir), OMA_AGENTMEMORY_PID_FILE);
}

function agentMemoryBackupDir(homeDir: string): string {
  return join(agentMemoryConfigDir(homeDir), OMA_AGENTMEMORY_BACKUPS_DIR);
}

function endpointFromConfig(config: AgentMemoryEndpointConfig): string | null {
  if (typeof config.port === "number") return `http://127.0.0.1:${config.port}`;
  if (typeof config.url === "string" && config.url.trim()) return config.url;
  return null;
}

function portFromEndpointConfig(
  config: AgentMemoryEndpointConfig | null,
): number | null {
  if (typeof config?.port === "number") return config.port;
  if (typeof config?.url !== "string") return null;
  try {
    const url = new URL(config.url);
    if (
      (url.hostname === "127.0.0.1" || url.hostname === "localhost") &&
      url.port
    ) {
      return Number(url.port);
    }
  } catch {
    return null;
  }
  return null;
}

function readEndpointConfig(homeDir: string): AgentMemoryEndpointConfig | null {
  const endpointPath = agentMemoryEndpointPath(homeDir);
  if (!existsSync(endpointPath)) return null;
  try {
    return JSON.parse(readFileSync(endpointPath, "utf-8"));
  } catch {
    return null;
  }
}

function writeEndpointConfig(
  homeDir: string,
  config: AgentMemoryEndpointConfig,
): void {
  const endpointPath = agentMemoryEndpointPath(homeDir);
  mkdirSync(dirname(endpointPath), { recursive: true, mode: 0o700 });
  writeFileSync(endpointPath, `${JSON.stringify(config, null, 2)}\n`, {
    encoding: "utf-8",
    mode: 0o600,
  });
}

function parseNonNegativeInteger(
  value: number | string | undefined,
  fallback: number,
): number {
  if (value === undefined) return fallback;
  const parsed = typeof value === "number" ? value : Number(value);
  if (!Number.isInteger(parsed) || parsed < 0) {
    throw new Error(`invalid keep count: ${value}`);
  }
  return parsed;
}

function timestampSlug(now = new Date()): string {
  return now.toISOString().replace(/[:.]/g, "-");
}

function readOwnedPid(homeDir: string): number | undefined {
  const pidPath = agentMemoryPidPath(homeDir);
  if (!existsSync(pidPath)) return undefined;
  const pid = Number(readFileSync(pidPath, "utf-8").trim());
  if (!Number.isInteger(pid) || pid <= 0) return undefined;
  return pid;
}

function isProcessRunning(pid: number | undefined): boolean {
  if (!pid) return false;
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

function writeOwnedPid(homeDir: string, pid: number): void {
  const pidPath = agentMemoryPidPath(homeDir);
  mkdirSync(dirname(pidPath), { recursive: true, mode: 0o700 });
  writeFileSync(pidPath, `${pid}\n`, { encoding: "utf-8", mode: 0o600 });
}

function isInsidePath(path: string, parent: string): boolean {
  const child = relative(parent, path);
  return child === "" || (!child.startsWith("..") && !isAbsolute(child));
}

function isBackupSourcePath(path: string, configDir: string): boolean {
  const backupDir = join(configDir, OMA_AGENTMEMORY_BACKUPS_DIR);
  if (isInsidePath(path, backupDir)) return false;
  if (path === join(configDir, OMA_AGENTMEMORY_PID_FILE)) return false;
  return true;
}

function countBackupFiles(configDir: string): number {
  if (!existsSync(configDir)) return 0;
  let count = 0;
  for (const entry of readdirSync(configDir, { withFileTypes: true })) {
    const path = join(configDir, entry.name);
    if (!isBackupSourcePath(path, configDir)) continue;
    if (entry.isDirectory()) {
      count += countBackupFiles(path);
    } else if (entry.isFile()) {
      count += 1;
    }
  }
  return count;
}

function copyBackupSource(configDir: string, backupPath: string): void {
  mkdirSync(backupPath, { recursive: true, mode: 0o700 });
  for (const entry of readdirSync(configDir, { withFileTypes: true })) {
    const source = join(configDir, entry.name);
    if (!isBackupSourcePath(source, configDir)) continue;
    cpSync(source, join(backupPath, entry.name), { recursive: true });
  }
}

function listBackups(
  backupDir: string,
): Array<{ path: string; mtimeMs: number }> {
  if (!existsSync(backupDir)) return [];
  return readdirSync(backupDir)
    .filter((name) => name.startsWith(OMA_AGENTMEMORY_BACKUP_PREFIX))
    .map((name) => {
      const path = join(backupDir, name);
      return { path, mtimeMs: statSync(path).mtimeMs };
    })
    .sort((a, b) => b.mtimeMs - a.mtimeMs || b.path.localeCompare(a.path));
}

function findSqliteTargets(configDir: string): string[] {
  if (!existsSync(configDir)) return [];
  const backupDir = join(configDir, OMA_AGENTMEMORY_BACKUPS_DIR);
  const targets: string[] = [];
  const visit = (dir: string) => {
    if (isInsidePath(dir, backupDir)) return;
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const path = join(dir, entry.name);
      if (entry.isDirectory()) {
        visit(path);
        continue;
      }
      if (!entry.isFile()) continue;
      if (/\.(db|sqlite|sqlite3)$/i.test(entry.name)) {
        targets.push(path);
      }
    }
  };
  visit(configDir);
  return targets.sort();
}

function runCommand(
  runner: MemoryServiceCommandRunner,
  bin: string,
  args: string[],
): MemoryMaintainCommandResult {
  const result = runner({ bin, args });
  return {
    command: [bin, ...args].join(" "),
    status: result.status,
    error: result.error,
  };
}

export function maintainAgentMemory(
  args: MemoryMaintainOptions,
): MemoryMaintainResult {
  const homeDir = args.homeDir ?? homedir();
  const configDir = agentMemoryConfigDir(homeDir);
  const backupDir = agentMemoryBackupDir(homeDir);
  const keep = parseNonNegativeInteger(args.keep, DEFAULT_BACKUP_KEEP);
  const dryRun = args.dryRun === true;
  const runner = args.runner ?? defaultServiceCommandRunner;
  let backupPath: string | undefined;
  let copiedFiles = 0;
  let prunedBackups: string[] = [];
  let vacuumTargets: string[] = [];
  let vacuumResults: MemoryMaintainCommandResult[] = [];
  let message: string;

  if (args.action === "backup") {
    copiedFiles = countBackupFiles(configDir);
    backupPath = join(
      backupDir,
      `${OMA_AGENTMEMORY_BACKUP_PREFIX}${timestampSlug()}`,
    );
    if (!existsSync(configDir)) {
      message =
        "AgentMemory config directory does not exist; nothing to backup";
    } else if (dryRun) {
      message = "AgentMemory backup would be created";
    } else {
      mkdirSync(backupDir, { recursive: true, mode: 0o700 });
      copyBackupSource(configDir, backupPath);
      message = "AgentMemory backup created";
    }
  } else if (args.action === "prune") {
    const backups = listBackups(backupDir);
    prunedBackups = backups.slice(keep).map((backup) => backup.path);
    if (!dryRun) {
      for (const path of prunedBackups)
        rmSync(path, { recursive: true, force: true });
    }
    message =
      prunedBackups.length === 0
        ? "No AgentMemory backups to prune"
        : dryRun
          ? "AgentMemory backups would be pruned"
          : "AgentMemory backups pruned";
  } else if (args.action === "vacuum") {
    vacuumTargets = findSqliteTargets(configDir);
    if (!dryRun) {
      vacuumResults = vacuumTargets.map((target) =>
        runCommand(runner, "sqlite3", [target, "VACUUM;"]),
      );
    }
    message =
      vacuumTargets.length === 0
        ? "No AgentMemory SQLite files found"
        : dryRun
          ? "AgentMemory SQLite files would be vacuumed"
          : "AgentMemory SQLite vacuum completed";
  } else {
    throw new Error(`invalid AgentMemory maintain action: ${args.action}`);
  }

  return {
    action: args.action,
    homeDir,
    configDir,
    backupDir,
    backupPath,
    copiedFiles,
    prunedBackups,
    vacuumTargets,
    vacuumResults,
    keep,
    dryRun,
    message,
  };
}

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

export async function getAgentMemoryStatus(
  provider: MemoryProvider = createAgentMemoryProvider(),
): Promise<MemoryProviderStatus> {
  return provider.status();
}

export async function setupAgentMemory(
  args: MemorySetupOptions = {},
): Promise<MemorySetupResult> {
  const homeDir = args.homeDir ?? homedir();
  const configDir = agentMemoryConfigDir(homeDir);
  const endpointPath = agentMemoryEndpointPath(homeDir);
  const port = parsePositivePort(args.port);
  let wroteEndpoint = false;
  let installExitCode: number | null | undefined;
  let installSkipped: boolean | undefined;
  let installError: string | undefined;
  let service: MemoryServiceResult | undefined;
  let daemon: MemoryDaemonResult | undefined;

  const nextConfig: AgentMemoryEndpointConfig | null = args.endpoint
    ? { url: args.endpoint, source: "oma", updatedAt: new Date().toISOString() }
    : port
      ? { port, source: "oma", updatedAt: new Date().toISOString() }
      : null;

  if (!args.dryRun) {
    mkdirSync(configDir, { recursive: true, mode: 0o700 });
    if (nextConfig) {
      writeEndpointConfig(homeDir, nextConfig);
      wroteEndpoint = true;
    }
  }

  if (args.install) {
    if (args.dryRun) {
      installSkipped = true;
    } else {
      const installResult = await (
        args.installer ?? defaultAgentMemoryInstaller
      )();
      installExitCode = installResult.status;
      installError = installResult.error;
      if (installExitCode !== 0) {
        throw new Error(
          installError ??
            `AgentMemory install failed with exit code ${installExitCode}`,
        );
      }
    }
    if (args.dryRun || installExitCode === 0) {
      service = installAgentMemoryService({
        homeDir,
        platform: args.platform ?? process.platform,
        dryRun: args.dryRun,
        port: port ?? DEFAULT_AGENTMEMORY_PORT,
        runner: args.serviceRunner,
      });
    }
  }

  if (args.start) {
    daemon = await controlAgentMemoryDaemon({
      action: "start",
      homeDir,
      env: args.env,
      port: port ?? DEFAULT_AGENTMEMORY_PORT,
      dryRun: args.dryRun,
    });
  }

  const endpoint =
    endpointFromConfig(nextConfig ?? readEndpointConfig(homeDir) ?? {}) ??
    resolveAgentMemoryEndpoint({ env: args.env, homeDir });
  const provider = createAgentMemoryProvider({
    env: args.env,
    homeDir,
  });
  const status = await provider.status();

  return {
    homeDir,
    configDir,
    endpointPath,
    endpoint,
    endpointConfigured: endpoint !== null,
    wroteEndpoint,
    dryRun: args.dryRun === true,
    installRequested: args.install === true,
    installExitCode,
    installSkipped,
    installError,
    service,
    startRequested: args.start === true,
    daemon,
    installCommand: AGENTMEMORY_INSTALL_COMMAND,
    startCommand: AGENTMEMORY_START_COMMAND,
    status,
  };
}

async function daemonStatus(args: {
  homeDir: string;
  env?: NodeJS.ProcessEnv;
  action?: MemoryDaemonResult["action"];
  dryRun?: boolean;
  message?: string;
}): Promise<MemoryDaemonResult> {
  const ownedPid = readOwnedPid(args.homeDir);
  const provider = createAgentMemoryProvider({
    env: args.env,
    homeDir: args.homeDir,
  });
  const status = await provider.status();
  return {
    action: args.action ?? "status",
    homeDir: args.homeDir,
    pidPath: agentMemoryPidPath(args.homeDir),
    ownedPid,
    ownedProcessRunning: isProcessRunning(ownedPid),
    endpoint: resolveAgentMemoryEndpoint({
      env: args.env,
      homeDir: args.homeDir,
    }),
    status,
    dryRun: args.dryRun === true,
    message: args.message,
  };
}

export async function controlAgentMemoryDaemon(args: {
  action: "status" | "start" | "stop" | "restart";
  homeDir?: string;
  env?: NodeJS.ProcessEnv;
  bin?: string;
  port?: number | string;
  dryRun?: boolean;
}): Promise<MemoryDaemonResult> {
  const homeDir = args.homeDir ?? homedir();
  const env = args.env ?? process.env;
  const bin = args.bin ?? env.AGENTMEMORY_BIN ?? "agentmemory";
  const port = parsePositivePort(args.port) ?? DEFAULT_AGENTMEMORY_PORT;

  if (args.action === "status") {
    return daemonStatus({
      homeDir,
      env,
      action: "status",
      dryRun: args.dryRun,
    });
  }

  if (args.action === "stop" || args.action === "restart") {
    const ownedPid = readOwnedPid(homeDir);
    let stoppedPid: number | undefined;
    let attemptedFallbackStop = false;
    let fallbackStopCode: number | null | undefined;

    if (!args.dryRun) {
      // `agentmemory stop` shuts down the iii engine, which owns the REST port
      // and the on-disk store and runs in its OWN process group — signalling
      // only the recorded wrapper pid would orphan it (accumulating stale
      // engines that keep the port and write to ./data). Always invoke it, then
      // also reap the wrapper launcher we recorded.
      attemptedFallbackStop = true;
      const result = spawnSync(bin, ["stop"], {
        env,
        timeout: 10000,
        encoding: "utf-8",
      });
      fallbackStopCode = result.status;

      if (ownedPid && isProcessRunning(ownedPid)) {
        try {
          process.kill(ownedPid, "SIGTERM");
        } catch {
          // wrapper already exited
        }
        stoppedPid = ownedPid;
      }
    }

    if (args.action === "stop") {
      return {
        ...(await daemonStatus({
          homeDir,
          env,
          action: "stop",
          dryRun: args.dryRun,
        })),
        stoppedPid,
        attemptedFallbackStop,
        fallbackStopCode,
      };
    }
  }

  if (args.action === "start" || args.action === "restart") {
    if (args.dryRun) {
      return daemonStatus({
        homeDir,
        env,
        action: args.action,
        dryRun: true,
        message: `${bin} would be started on port ${port}`,
      });
    }

    // Race guard (start only): if a healthy daemon already serves the port,
    // reuse it instead of spawning a competitor — overlapping iii engines fight
    // over port 3111 and can leave a half-initialised engine answering 404.
    if (args.action === "start") {
      const existing = await daemonStatus({ homeDir, env, action: "start" });
      if (existing.status.reachable) {
        return {
          ...existing,
          message: `AgentMemory already running on ${existing.endpoint ?? `port ${port}`}; reusing`,
        };
      }
      // Not reachable but a stale engine may still hold the port; clear it so
      // the fresh engine can bind cleanly.
      spawnSync(bin, ["stop"], { env, timeout: 10000, encoding: "utf-8" });
    }

    mkdirSync(agentMemoryConfigDir(homeDir), { recursive: true, mode: 0o700 });
    writeEndpointConfig(homeDir, {
      port,
      source: "oma",
      updatedAt: new Date().toISOString(),
    });

    const child = spawn(bin, [], {
      detached: true,
      // AgentMemory's iii-engine writes its store to a cwd-relative `./data/`.
      // Pin the daemon's cwd to the config home so it lands in
      // ~/.agentmemory/data instead of polluting the project it was started in.
      cwd: agentMemoryConfigDir(homeDir),
      env: { ...env, III_REST_PORT: String(port) },
      stdio: "ignore",
    });

    const startedPid = await new Promise<number>((resolve, reject) => {
      let settled = false;
      const settle = (fn: () => void) => {
        if (settled) return;
        settled = true;
        fn();
      };
      child.once("error", (error) => {
        settle(() => reject(error));
      });
      child.once("exit", (code) => {
        settle(() =>
          reject(
            new Error(`agentmemory exited during startup with code ${code}`),
          ),
        );
      });
      setTimeout(() => {
        settle(() => resolve(child.pid ?? 0));
      }, 250);
    });

    if (startedPid > 0) {
      child.unref();
      writeOwnedPid(homeDir, startedPid);
    }

    return {
      ...(await daemonStatus({
        homeDir,
        env,
        action: args.action,
        dryRun: false,
      })),
      startedPid,
    };
  }

  return daemonStatus({
    homeDir,
    env,
    action: args.action,
    dryRun: args.dryRun,
  });
}

function parseRetryLine(line: string): OmaEvent | null {
  try {
    const parsed = JSON.parse(line) as Partial<OmaEvent>;
    if (
      typeof parsed.sid === "string" &&
      typeof parsed.kind === "string" &&
      typeof parsed.eventId === "string" &&
      typeof parsed.ts === "string"
    ) {
      return parsed as OmaEvent;
    }
    return null;
  } catch {
    return null;
  }
}

export async function drainMemoryRetryQueue(
  args: {
    projectDir?: string;
    provider?: MemoryProvider;
    dryRun?: boolean;
  } = {},
): Promise<MemoryRetryDrainResult> {
  const projectDir = args.projectDir ?? process.cwd();
  const provider = args.provider ?? createAgentMemoryProvider();
  const retryPath = retryObservePath(projectDir);
  if (!existsSync(retryPath)) {
    return {
      retryPath,
      total: 0,
      drained: 0,
      retained: 0,
      invalid: 0,
      dryRun: args.dryRun === true,
    };
  }

  const lines = readFileSync(retryPath, "utf-8")
    .split("\n")
    .filter((line) => line.trim());
  const retainedLines: string[] = [];
  let drained = 0;
  let invalid = 0;

  for (const line of lines) {
    const event = parseRetryLine(line);
    if (!event) {
      invalid += 1;
      retainedLines.push(line);
      continue;
    }

    if (args.dryRun) {
      retainedLines.push(line);
      continue;
    }

    const observed = await provider.observe({
      sessionId: event.sid,
      content: `${JSON.stringify(event)}\n`,
      source: "oma-workflow",
    });
    if (observed) {
      drained += 1;
    } else {
      retainedLines.push(line);
    }
  }

  if (!args.dryRun) {
    const tmp = `${retryPath}.${process.pid}.${Date.now()}.tmp`;
    const content =
      retainedLines.length > 0 ? `${retainedLines.join("\n")}\n` : "";
    writeFileSync(tmp, content, "utf-8");
    renameSync(tmp, retryPath);
  }

  return {
    retryPath,
    total: lines.length,
    drained,
    retained: retainedLines.length,
    invalid,
    dryRun: args.dryRun === true,
  };
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
