import type { OmaConfig } from "../platform/agent-config.js";
import { ConfigLayerError, loadConfigLayers } from "./config-layers.js";
import { isRecord } from "./type-guards.js";

export type { OmaConfig } from "../platform/agent-config.js";

/** Global defaults plus project/local overrides. Invalid local intent is fatal. */
export function loadOmaConfig(cwd?: string): OmaConfig | null {
  try {
    const { config, sources } = loadConfigLayers(cwd);
    return sources.global ||
      sources.globalLocal ||
      sources.shared ||
      sources.local ||
      sources.environment
      ? (config as OmaConfig)
      : null;
  } catch (error) {
    if (error instanceof ConfigLayerError && error.local) throw error;
    console.warn(
      `[config] ${error instanceof Error ? error.message : String(error)}`,
    );
    return null;
  }
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
 * Browsers whose DevTools MCP server should be wired into the MCP configs.
 *
 * Reads `mcp.devtools_browsers` from oma-config.yaml. Returns `undefined` when
 * the key is absent, which callers must treat as "leave the current config
 * alone" — an unset key means the user never expressed a preference, and
 * silently deleting a server they may be using is not oma's call. An explicit
 * empty list (`devtools_browsers: []`) does mean "none".
 *
 * The distinction matters because a browser DevTools server is not free:
 * chrome-devtools-mcp costs three processes per agent session (`npm exec` →
 * server → telemetry watchdog), and every concurrent session pays it whether or
 * not a browser is ever driven.
 */
export function loadDevToolsBrowsers(
  cwd?: string,
): ("aside" | "chrome" | "firefox")[] | undefined {
  const config = loadOmaConfig(cwd) as unknown as {
    mcp?: { devtools_browsers?: unknown };
  } | null;
  const raw = isRecord(config?.mcp) ? config.mcp.devtools_browsers : undefined;
  if (!Array.isArray(raw)) return undefined;
  return raw.filter(
    (entry): entry is "aside" | "chrome" | "firefox" =>
      entry === "aside" || entry === "chrome" || entry === "firefox",
  );
}

/**
 * Serena transport configuration.
 *
 * Default `bridge` — each vendor's MCP entry runs `oma bridge`, a stdio proxy
 * onto one shared serena HTTP server per project, started on first use. Several
 * agent sessions on a repo then share a single language-server stack instead of
 * each spawning its own; the proxy falls back to a session-local stdio serena
 * whenever the shared one cannot be reached, so nothing is lost when it fails.
 *
 * `stdio` opts out, restoring one full serena process per session.
 *
 * `autoUpdate` is opt-out (default true). Unless set to false, `oma update`
 * runs `uv tool upgrade serena-agent --prerelease=allow` so the
 * locally-installed serena binary tracks the latest prerelease.
 */
export interface SerenaConfig {
  mode: "stdio" | "bridge";
  autoUpdate: boolean;
}

export function loadSerenaConfig(cwd?: string): SerenaConfig {
  const config = loadOmaConfig(cwd) as unknown as {
    serena?: { mode?: unknown; auto_update?: unknown };
  } | null;
  const raw = isRecord(config?.serena) ? config.serena : undefined;
  const mode = raw?.mode === "stdio" ? "stdio" : "bridge";
  const autoUpdate = raw?.auto_update !== false;
  return { mode, autoUpdate };
}

/** Convenience accessor for the vendor MCP-entry builders. */
export function serenaTransportMode(cwd?: string): "stdio" | "bridge" {
  return loadSerenaConfig(cwd).mode;
}
