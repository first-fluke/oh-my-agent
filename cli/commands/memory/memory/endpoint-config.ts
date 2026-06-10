import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import type { AgentMemoryEndpointConfig } from "../../../types/memory.js";

export const OMA_AGENTMEMORY_PID_FILE = "oma-agentmemory.pid";
export const OMA_AGENTMEMORY_BACKUPS_DIR = "backups";

export function agentMemoryConfigDir(homeDir: string): string {
  return join(homeDir, ".agentmemory");
}

export function agentMemoryEndpointPath(homeDir: string): string {
  return join(agentMemoryConfigDir(homeDir), "endpoint.json");
}

export function agentMemoryPidPath(homeDir: string): string {
  return join(agentMemoryConfigDir(homeDir), OMA_AGENTMEMORY_PID_FILE);
}

export function agentMemoryBackupDir(homeDir: string): string {
  return join(agentMemoryConfigDir(homeDir), OMA_AGENTMEMORY_BACKUPS_DIR);
}

export function endpointFromConfig(
  config: AgentMemoryEndpointConfig,
): string | null {
  if (typeof config.port === "number") return `http://127.0.0.1:${config.port}`;
  if (typeof config.url === "string" && config.url.trim()) return config.url;
  return null;
}

export function portFromEndpointConfig(
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

export function readEndpointConfig(
  homeDir: string,
): AgentMemoryEndpointConfig | null {
  const endpointPath = agentMemoryEndpointPath(homeDir);
  if (!existsSync(endpointPath)) return null;
  try {
    return JSON.parse(readFileSync(endpointPath, "utf-8"));
  } catch {
    return null;
  }
}

export function writeEndpointConfig(
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
