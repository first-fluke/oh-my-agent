import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import {
  type InstallMode,
  safeGetInstallMode,
} from "../../platform/install-context.js";
import {
  loadDevToolsBrowsers,
  serenaTransportMode,
} from "../../utils/config.js";
import { safeReadJson } from "../../utils/safe-json.js";
import { isRecord } from "../../utils/type-guards.js";
import {
  hasSerenaDashboardOpenDisabled,
  hasStaleSerenaTransport,
  isLegacyUvxSerena,
  RECOMMENDED_CHROME_DEVTOOLS_MCP,
  type SerenaMcpEntry,
  serenaMcpEntry,
  withSerenaDashboardOpenDisabled,
} from "../serena.js";
import { KIMI_HOME_MISSING_REASON, kimiHome } from "./auth.js";

/**
 * Recommended MCP servers for Kimi Code CLI, managed by oh-my-agent.
 *
 * Kimi reads MCP servers from a Claude-style `mcp.json` (`{ "mcpServers": … }`)
 * at the user level (`~/.kimi-code/mcp.json`) or project level
 * (`<cwd>/.kimi-code/mcp.json`). Unlike Kimi's hooks (global-only), MCP supports
 * both scopes, so oma writes it mode-aware: project installs keep it in-project,
 * global installs use HOME (see `installKimiMcp`).
 *
 * Serena uses the generic `ide` context (matching kiro/cursor/qwen/gemini) since
 * Kimi has no dedicated serena context.
 */
export const RECOMMENDED_KIMI_MCP = {
  "chrome-devtools": RECOMMENDED_CHROME_DEVTOOLS_MCP,
  get serena(): SerenaMcpEntry {
    return serenaMcpEntry("ide", serenaTransportMode());
  },
};

interface KimiMcpServer {
  command?: string;
  args?: string[];
  env?: Record<string, string>;
  url?: string;
  [key: string]: unknown;
}

export interface KimiMcpConfig {
  mcpServers?: Record<string, KimiMcpServer>;
  [key: string]: unknown;
}

function hasKimiMcpTransport(
  server: KimiMcpServer | undefined,
): server is KimiMcpServer {
  if (!server) return false;
  return typeof server.command === "string" || typeof server.url === "string";
}

/**
 * @param withChromeDevtools — whether chrome-devtools belongs in the config.
 *   Browser tooling is opt-in (`mcp.devtools_browsers` in oma-config.yaml); it
 *   costs processes in every concurrent agent session, so Kimi must not
 *   re-add it behind the user's back.
 */
export function needsKimiMcpUpdate(
  raw: unknown,
  withChromeDevtools = false,
): boolean {
  if (!isRecord(raw)) return true;
  const mcp = raw.mcpServers;
  if (!isRecord(mcp)) return true;
  const serena = mcp.serena as KimiMcpServer | undefined;
  if (!hasKimiMcpTransport(serena)) return true;
  if (isLegacyUvxSerena(serena)) return true;
  if (hasStaleSerenaTransport(serena, serenaTransportMode())) return true;
  if (!hasSerenaDashboardOpenDisabled(serena)) return true;
  if (withChromeDevtools) {
    const chromeDevtools = mcp["chrome-devtools"] as KimiMcpServer | undefined;
    if (!hasKimiMcpTransport(chromeDevtools)) return true;
  }
  return false;
}

export function applyKimiMcp(
  raw: unknown,
  withChromeDevtools = false,
): KimiMcpConfig {
  const base: KimiMcpConfig = isRecord(raw) ? (raw as KimiMcpConfig) : {};
  const currentMcp = isRecord(base.mcpServers) ? base.mcpServers : {};
  const next: Record<string, KimiMcpServer> = {
    ...currentMcp,
    serena: withSerenaDashboardOpenDisabled({ ...RECOMMENDED_KIMI_MCP.serena }),
  };
  if (withChromeDevtools) {
    next["chrome-devtools"] =
      (currentMcp["chrome-devtools"] as KimiMcpServer | undefined) ??
      RECOMMENDED_KIMI_MCP["chrome-devtools"];
  }
  base.mcpServers = next;
  return base;
}

export interface KimiMcpInstallResult {
  installed: boolean;
  /** Absolute path written (on success). */
  path?: string;
  reason?: string;
}

/**
 * Resolve where Kimi reads its `mcp.json`.
 *
 * Kimi supports BOTH a user-level (`~/.kimi-code/mcp.json`) and a project-level
 * (`<cwd>/.kimi-code/mcp.json`) MCP config (unlike its hooks, which are
 * global-only). oma follows its install mode: project installs keep the MCP
 * config in-project (committable, no HOME write); global installs use HOME.
 *
 * @param cwd — project root (project mode); ignored in global mode.
 */
export function kimiMcpConfigPath(cwd: string, mode: InstallMode): string {
  if (mode === "global") {
    return join(kimiHome(), "mcp.json");
  }
  return join(cwd, ".kimi-code", "mcp.json");
}

/**
 * Write the recommended serena + chrome-devtools MCP servers into Kimi's
 * `mcp.json`, preserving any user-configured servers.
 *
 * Mode-aware: project installs write `<cwd>/.kimi-code/mcp.json` (created
 * freely, like other project vendor dirs); global installs write
 * `~/.kimi-code/mcp.json`. Idempotent: skips the write when the existing config
 * already satisfies the recommended shape. In global mode, skips silently
 * (returns a reason) when `~/.kimi-code/` does not exist yet — Kimi creates it
 * on first `kimi login`, and oma must not pre-create HOME config dirs.
 */
export function installKimiMcp(cwd: string): KimiMcpInstallResult {
  const mode = safeGetInstallMode();

  // Global mode targets HOME: don't pre-create ~/.kimi-code (parity with hooks).
  if (mode === "global" && !existsSync(kimiHome())) {
    return { installed: false, reason: KIMI_HOME_MISSING_REASON };
  }

  const withChromeDevtools = (loadDevToolsBrowsers(cwd) ?? []).includes(
    "chrome",
  );

  const mcpPath = kimiMcpConfigPath(cwd, mode);
  const current = safeReadJson<KimiMcpConfig>(mcpPath);
  if (!needsKimiMcpUpdate(current, withChromeDevtools)) {
    return { installed: true, path: mcpPath };
  }

  mkdirSync(dirname(mcpPath), { recursive: true });
  const next = applyKimiMcp(current ?? {}, withChromeDevtools);
  writeFileSync(mcpPath, `${JSON.stringify(next, null, 2)}\n`);
  return { installed: true, path: mcpPath };
}
