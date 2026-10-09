import {
  accessSync,
  constants,
  existsSync,
  mkdirSync,
  statSync,
} from "node:fs";
import { homedir } from "node:os";
import { dirname, join, resolve } from "node:path";
import {
  DEFAULT_AGENTMEMORY_PORT,
  getAgentMemoryServicePresence,
  installAgentMemoryService,
  parsePositivePort,
} from "../../platform/agentmemory-service.js";
import { createAgentMemoryProvider } from "../../state/memory-provider.js";
import type {
  AgentMemoryEndpointConfig,
  MemoryProviderStatus,
} from "../../types/memory.js";
import { acquireOwnedDirectoryLock } from "../../utils/owned-directory-lock.js";
import { controlAgentMemoryDaemon } from "./daemon.js";
import {
  agentMemoryConfigDir,
  agentMemoryEndpointPath,
  endpointFromConfig,
  readEndpointConfig,
  writeEndpointConfig,
} from "./endpoint-config.js";
import { defaultAgentMemoryInstaller } from "./setup.js";

export interface EnsureAgentMemoryOptions {
  homeDir?: string;
  env?: NodeJS.ProcessEnv;
  platform?: NodeJS.Platform;
  healthTimeoutMs?: number;
  lockTimeoutMs?: number;
  onProgress?(message: string): void;
}

export interface EnsureAgentMemoryResult {
  state: "ready" | "disabled";
  endpoint?: string;
  installed: boolean;
  started: boolean;
  reused: boolean;
}

interface EnsureContext {
  homeDir: string;
  env: NodeJS.ProcessEnv;
  platform: NodeJS.Platform;
}

interface EnsureAgentMemoryDependencies {
  status(context: EnsureContext): Promise<MemoryProviderStatus>;
  findBinary(context: EnsureContext): string | undefined;
  installPackage: typeof defaultAgentMemoryInstaller;
  servicePresence: typeof getAgentMemoryServicePresence;
  installService: typeof installAgentMemoryService;
  startDaemon: typeof controlAgentMemoryDaemon;
  now(): number;
  sleep(milliseconds: number): Promise<void>;
}

function runtimeSearchPath(
  env: NodeJS.ProcessEnv,
  platform: NodeJS.Platform,
): string {
  const key =
    platform === "win32"
      ? Object.keys(env).find((name) => name.toLowerCase() === "path")
      : "PATH";
  return env.PATH ?? (key ? env[key] : undefined) ?? "";
}

function findAgentMemoryBinary(context: EnsureContext): string | undefined {
  const command = context.env.AGENTMEMORY_BIN || "agentmemory";
  const separator = context.platform === "win32" ? ";" : ":";
  const paths =
    command.includes("/") || command.includes("\\")
      ? [command]
      : [
          ...runtimeSearchPath(context.env, context.platform).split(separator),
          join(context.homeDir, ".bun", "bin"),
          join(context.homeDir, ".local", "bin"),
        ]
          .filter(Boolean)
          .flatMap((directory) =>
            (context.platform === "win32"
              ? ["", ".exe", ".cmd", ".bat"]
              : [""]
            ).map((extension) => join(directory, `${command}${extension}`)),
          );
  return paths
    .map((path) => resolve(path))
    .find((path) => {
      try {
        accessSync(path, constants.X_OK);
        return statSync(path).isFile();
      } catch {
        return false;
      }
    });
}

const DEFAULT_DEPENDENCIES: EnsureAgentMemoryDependencies = {
  // Providers cache status: each readiness probe needs a new instance.
  status: (context) =>
    createAgentMemoryProvider({
      homeDir: context.homeDir,
      env: context.env,
      healthTimeoutMs: 500,
    }).status(),
  findBinary: findAgentMemoryBinary,
  installPackage: defaultAgentMemoryInstaller,
  servicePresence: getAgentMemoryServicePresence,
  installService: installAgentMemoryService,
  startDaemon: controlAgentMemoryDaemon,
  now: Date.now,
  sleep: (milliseconds) =>
    new Promise((resolve) => setTimeout(resolve, milliseconds)),
};

function isManagedEndpoint(
  homeDir: string,
  env: NodeJS.ProcessEnv,
  config: AgentMemoryEndpointConfig | null,
): boolean {
  return (
    !env.AGENTMEMORY_URL &&
    ((!config && !existsSync(agentMemoryEndpointPath(homeDir))) ||
      (config?.source === "oma" &&
        typeof config.port === "number" &&
        !config.url &&
        !config.socket))
  );
}

/** Provision the default L2 service, or verify an explicitly configured one. */
export async function ensureAgentMemory(
  options: EnsureAgentMemoryOptions = {},
  dependencies: Partial<EnsureAgentMemoryDependencies> = {},
): Promise<EnsureAgentMemoryResult> {
  const env = options.env ?? process.env;
  if (env.OMA_NO_AGENTMEMORY === "1") {
    return {
      state: "disabled",
      installed: false,
      started: false,
      reused: false,
    };
  }
  const deps = { ...DEFAULT_DEPENDENCIES, ...dependencies };
  const homeDir = options.homeDir ?? homedir();
  if (!isManagedEndpoint(homeDir, env, readEndpointConfig(homeDir))) {
    return ensureConfiguredAgentMemory(options, deps);
  }
  // Package, config, and service are shared by every project and vendor in HOME.
  const lock = join(agentMemoryConfigDir(homeDir), "oma-lifecycle.lock");
  mkdirSync(agentMemoryConfigDir(homeDir), { recursive: true, mode: 0o700 });
  const deadline = deps.now() + (options.lockTimeoutMs ?? 90_000);
  for (;;) {
    const lease = acquireOwnedDirectoryLock(lock);
    if (lease.ok) {
      try {
        // Re-read configuration and fresh health after a competing install finishes.
        return await ensureConfiguredAgentMemory(options, deps);
      } finally {
        lease.release();
      }
    }
    const remaining = deadline - deps.now();
    if (remaining <= 0)
      throw new Error(
        "Timed out waiting for the shared AgentMemory lifecycle lock; another install or update is still running.",
      );
    await deps.sleep(Math.min(250, remaining));
  }
}

async function ensureConfiguredAgentMemory(
  options: EnsureAgentMemoryOptions,
  deps: EnsureAgentMemoryDependencies,
): Promise<EnsureAgentMemoryResult> {
  const env = options.env ?? process.env;
  const homeDir = options.homeDir ?? homedir();
  const platform = options.platform ?? process.platform;
  const config = readEndpointConfig(homeDir);
  const configuredEndpoint =
    env.AGENTMEMORY_URL || (config && endpointFromConfig(config));
  const managed = isManagedEndpoint(homeDir, env, config);
  if (!managed && !configuredEndpoint) {
    throw new Error(
      "AgentMemory endpoint configuration is invalid; repair ~/.agentmemory/endpoint.json before installing OMA.",
    );
  }
  const port = managed
    ? (parsePositivePort(config?.port) ?? DEFAULT_AGENTMEMORY_PORT)
    : undefined;
  const endpoint = configuredEndpoint || `http://127.0.0.1:${port}`;
  const context: EnsureContext = {
    homeDir,
    platform,
    env: { ...env, AGENTMEMORY_URL: endpoint },
  };
  const existing = await deps.status(context);
  if (existing.reachable) {
    if (!configuredEndpoint) {
      writeEndpointConfig(homeDir, {
        port,
        source: "oma",
        updatedAt: new Date().toISOString(),
      });
    }
    return {
      state: "ready",
      endpoint,
      installed: false,
      started: false,
      reused: true,
    };
  }
  if (!managed) {
    throw new Error(
      `Configured AgentMemory service is unavailable: ${existing.reason ?? "health check failed"}. Check the configured endpoint; OMA did not change it or start a local daemon.`,
    );
  }

  if (!configuredEndpoint) {
    writeEndpointConfig(homeDir, {
      port,
      source: "oma",
      updatedAt: new Date().toISOString(),
    });
  }
  let binary = deps.findBinary(context);
  let installed = false;
  if (!binary) {
    options.onProgress?.(
      "Installing the default AgentMemory service package...",
    );
    const result = await deps.installPackage();
    if (result.status !== 0) {
      throw new Error(
        `AgentMemory package installation failed: ${result.error ?? `exit code ${result.status}`}. Run oma memory setup --install --start to retry.`,
      );
    }
    installed = true;
    binary = deps.findBinary(context);
    if (!binary) {
      throw new Error(
        "AgentMemory was installed but its executable was not found. Check the Bun global binary path, then run oma memory setup --install --start.",
      );
    }
  }
  const presence = deps.servicePresence({ homeDir, platform });
  if (presence.supported) {
    options.onProgress?.(
      "Installing and starting the AgentMemory background service...",
    );
    const service = deps.installService({
      homeDir,
      platform,
      port,
      executable: binary,
      runtimePath: [
        ...new Set([
          ...runtimeSearchPath(env, platform)
            .split(platform === "win32" ? ";" : ":")
            .filter(Boolean)
            .map((entry) => resolve(entry)),
          dirname(process.execPath),
        ]),
      ].join(platform === "win32" ? ";" : ":"),
    });
    if (!service.activated) {
      throw new Error(
        `AgentMemory service activation failed: ${service.commandError ?? service.message}. Run oma memory setup --install --start to retry.`,
      );
    }
  } else {
    options.onProgress?.("Starting AgentMemory...");
    try {
      await deps.startDaemon({
        action: "start",
        homeDir,
        env: context.env,
        bin: binary,
        port,
      });
    } catch (error) {
      throw new Error(
        `AgentMemory startup failed: ${error instanceof Error ? error.message : String(error)}. Run oma memory setup --start to retry.`,
      );
    }
  }
  const deadline = deps.now() + (options.healthTimeoutMs ?? 15_000);
  let status: MemoryProviderStatus;
  do {
    status = await deps.status(context);
    if (status.reachable) {
      return {
        state: "ready",
        endpoint,
        installed,
        started: true,
        reused: false,
      };
    }
    const remaining = deadline - deps.now();
    if (remaining <= 0) break;
    await deps.sleep(Math.min(250, remaining));
  } while (deps.now() <= deadline);
  throw new Error(
    `AgentMemory did not become ready: ${status.reason ?? "health check timed out"}. Run oma memory status and oma memory setup --start to diagnose and retry.`,
  );
}
