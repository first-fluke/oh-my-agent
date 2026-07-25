/**
 * Shared helpers for the gemini-family JSON settings dialect (gemini, qwen):
 * mcpServers records with command/url/httpUrl/tcp transports, recommended
 * serena + chrome-devtools entries, and the `privacy.usageStatisticsEnabled`
 * telemetry opt-out. Vendor modules keep their own allowed-key sets, extra
 * sections (e.g. gemini `general`/`experimental`), and legacy migrations.
 */

import { serenaTransportMode } from "../utils/config.js";
import { isRecord } from "../utils/type-guards.js";
import {
  hasSerenaDashboardOpenDisabled,
  hasStaleSerenaTransport,
  isLegacyUvxSerena,
  withSerenaDashboardOpenDisabled,
} from "./serena.js";

/** Minimal MCP server entry shape shared across the dialect. */
export interface McpServerEntry {
  command?: string;
  args?: string[];
  url?: string;
  httpUrl?: string;
  tcp?: string;
  [key: string]: unknown;
}

/** True when the server entry defines a usable transport. */
export function hasMcpTransport<T extends McpServerEntry>(
  server: T | undefined,
): server is T {
  if (!server) return false;
  return (
    typeof server.command === "string" ||
    typeof server.url === "string" ||
    typeof server.httpUrl === "string" ||
    typeof server.tcp === "string"
  );
}

/** Drop keys that aren't in the vendor's allowed MCP-server key set. */
export function filterMcpServerKeys<T extends McpServerEntry>(
  server: T,
  allowedKeys: ReadonlySet<string>,
): T {
  const next = {} as T;
  for (const [key, value] of Object.entries(server)) {
    if (!allowedKeys.has(key)) continue;
    (next as Record<string, unknown>)[key] = value;
  }
  return next;
}

/**
 * True when the serena / chrome-devtools MCP entries need (re)writing:
 * missing transport, legacy uvx-based serena, or missing dashboard opt-out.
 */
export function needsRecommendedMcpUpdate(
  mcpServers: Record<string, McpServerEntry> | undefined,
): boolean {
  const serena = mcpServers?.serena;
  if (!hasMcpTransport(serena)) return true;
  if (isLegacyUvxSerena(serena)) return true;
  // Without this an install whose serena already works is judged current, so
  // the transport switch would only ever reach fresh installs.
  if (hasStaleSerenaTransport(serena, serenaTransportMode())) return true;
  if (!hasSerenaDashboardOpenDisabled(serena)) return true;
  return !hasMcpTransport(mcpServers?.["chrome-devtools"]);
}

/**
 * Merge the recommended serena / chrome-devtools entries into mcpServers,
 * preserving an existing serena transport but enforcing the dashboard
 * opt-out flag.
 */
export function applyRecommendedMcpServers<T extends McpServerEntry>(
  mcpServers: Record<string, T> | undefined,
  recommended: { serena: T; "chrome-devtools": T },
): Record<string, T> {
  const currentSerena = mcpServers?.serena;
  const keepCurrent =
    hasMcpTransport(currentSerena) &&
    !hasStaleSerenaTransport(currentSerena, serenaTransportMode());
  const nextSerena = withSerenaDashboardOpenDisabled(
    keepCurrent
      ? currentSerena
      : ({ ...(currentSerena || {}), ...recommended.serena } as T),
  );

  return {
    ...(mcpServers || {}),
    "chrome-devtools":
      mcpServers?.["chrome-devtools"] ?? recommended["chrome-devtools"],
    serena: nextSerena,
  };
}

/**
 * True when `privacy.usageStatisticsEnabled` disagrees with the telemetry
 * preference: opt-in requires the override removed, opt-out requires it
 * pinned to false.
 */
export function needsPrivacyTelemetryUpdate(
  settings: Record<string, unknown>,
  telemetry: boolean | undefined,
): boolean {
  const privacy = isRecord(settings.privacy) ? settings.privacy : undefined;
  if (telemetry === true) {
    return !!privacy && "usageStatisticsEnabled" in privacy;
  }
  return privacy?.usageStatisticsEnabled !== false;
}

/**
 * Write the telemetry preference into `settings.privacy`, dropping the
 * whole `privacy` block when it would otherwise be empty.
 */
export function applyPrivacyTelemetry(
  settings: Record<string, unknown>,
  telemetry: boolean | undefined,
): void {
  const currentPrivacy = isRecord(settings.privacy)
    ? { ...settings.privacy }
    : {};
  if (telemetry === true) {
    delete currentPrivacy.usageStatisticsEnabled;
  } else {
    currentPrivacy.usageStatisticsEnabled = false;
  }
  if (Object.keys(currentPrivacy).length > 0) {
    settings.privacy = currentPrivacy;
  } else if ("privacy" in settings) {
    delete settings.privacy;
  }
}
