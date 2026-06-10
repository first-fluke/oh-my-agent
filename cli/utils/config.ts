import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { parse as parseYaml } from "yaml";
import type { OmaConfig } from "../platform/agent-config.js";
import { isRecord } from "./type-guards.js";

export type { OmaConfig } from "../platform/agent-config.js";

/**
 * Read .agents/oma-config.yaml, walking up from cwd.
 * Returns null if not found or if the file cannot be read.
 * Logs a warning with file:line:col when the file exists but contains invalid YAML.
 */
export function loadOmaConfig(cwd?: string): OmaConfig | null {
  let dir = cwd || process.cwd();
  for (let i = 0; i < 10; i++) {
    const configPath = join(dir, ".agents", "oma-config.yaml");
    if (existsSync(configPath)) {
      let content: string;
      try {
        content = readFileSync(configPath, "utf-8");
      } catch {
        return null;
      }
      try {
        return parseYaml(content) as OmaConfig;
      } catch (err) {
        const pos =
          err &&
          typeof err === "object" &&
          "linePos" in err &&
          Array.isArray((err as { linePos: unknown[] }).linePos) &&
          (err as { linePos: Array<{ line: number; col: number }> }).linePos
            .length > 0
            ? (err as { linePos: Array<{ line: number; col: number }> })
                .linePos[0]
            : null;
        const location = pos
          ? `${configPath}:${pos.line}:${pos.col}`
          : configPath;
        console.warn(
          `[config] Failed to parse YAML at ${location}: ${err instanceof Error ? err.message : String(err)}`,
        );
        return null;
      }
    }
    const parent = join(dir, "..");
    if (parent === dir) break;
    dir = parent;
  }
  return null;
}

/**
 * Read auto_update_cli from oma-config.yaml. Defaults to true (opt-out).
 */
export function isAutoUpdateCliEnabled(cwd?: string): boolean {
  const config = loadOmaConfig(cwd);
  return config?.auto_update_cli !== false;
}

/**
 * Read telemetry from oma-config.yaml. Defaults to false (opt-in).
 * When true, oh-my-agent omits `DISABLE_TELEMETRY` from `.claude/settings.json`
 * so features that gate on telemetry (e.g. Remote Control) keep working.
 */
export function isTelemetryEnabled(cwd?: string): boolean {
  const config = loadOmaConfig(cwd);
  return config?.telemetry === true;
}

/**
 * Read timezone from oma-config.yaml.
 * Falls back to system timezone.
 */
export function loadTimezone(cwd?: string): string {
  const config = loadOmaConfig(cwd);
  if (config?.timezone && typeof config.timezone === "string") {
    return config.timezone;
  }
  return Intl.DateTimeFormat().resolvedOptions().timeZone;
}

/**
 * Serena transport configuration. Default `stdio` — each vendor spawns its
 * own `serena start-mcp-server` process via stdio. Opt-in `bridge` mode means
 * a single shared serena instance runs as an HTTP server (started via
 * `oma bridge`), and the vendor named in `bridge_host` receives a `{url}` MCP
 * entry instead of stdio. Other vendors stay on stdio unless explicitly added
 * to a future `bridge_clients` list.
 *
 * `autoUpdate` is opt-in (default false). When true, `oma update` runs
 * `uv tool upgrade serena-agent --prerelease=allow` so the locally-installed
 * serena binary tracks the latest prerelease.
 */
export interface SerenaConfig {
  mode: "stdio" | "bridge";
  bridgeHost?: string;
  bridgeUrl: string;
  autoUpdate: boolean;
}

const DEFAULT_BRIDGE_URL = "http://localhost:12341/mcp";

export function loadSerenaConfig(cwd?: string): SerenaConfig {
  const config = loadOmaConfig(cwd) as unknown as {
    serena?: {
      mode?: unknown;
      bridge_host?: unknown;
      bridge_url?: unknown;
      auto_update?: unknown;
    };
  } | null;
  const raw = isRecord(config?.serena) ? config.serena : undefined;
  const mode = raw?.mode === "bridge" ? "bridge" : "stdio";
  const bridgeHost =
    typeof raw?.bridge_host === "string" ? raw.bridge_host : undefined;
  const bridgeUrl =
    typeof raw?.bridge_url === "string" ? raw.bridge_url : DEFAULT_BRIDGE_URL;
  const autoUpdate = raw?.auto_update === true;
  return { mode, bridgeHost, bridgeUrl, autoUpdate };
}
