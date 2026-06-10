import { spawnSync } from "node:child_process";
import { mkdirSync } from "node:fs";
import { homedir } from "node:os";
import {
  DEFAULT_AGENTMEMORY_PORT,
  installAgentMemoryService,
  parsePositivePort,
} from "../../../platform/agentmemory-service.js";
import {
  createAgentMemoryProvider,
  resolveAgentMemoryEndpoint,
} from "../../../state/memory-provider.js";
import type {
  AgentMemoryEndpointConfig,
  MemoryCommandStatus,
  MemoryDaemonResult,
  MemoryProvider,
  MemoryProviderStatus,
  MemoryServiceResult,
  MemorySetupOptions,
  MemorySetupResult,
} from "../../../types/memory.js";
import { controlAgentMemoryDaemon } from "./daemon.js";
import {
  agentMemoryConfigDir,
  agentMemoryEndpointPath,
  endpointFromConfig,
  readEndpointConfig,
  writeEndpointConfig,
} from "./endpoint-config.js";

export const AGENTMEMORY_INSTALL_COMMAND =
  "bun install -g @agentmemory/agentmemory";
export const AGENTMEMORY_START_COMMAND = "agentmemory";

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
