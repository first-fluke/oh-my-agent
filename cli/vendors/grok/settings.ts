import { existsSync, readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { stringify as stringifyToml } from "smol-toml";
import { serenaTransportMode } from "../../utils/config.js";
import {
  readTomlForMerge,
  readTomlMergeBaseOrWarn,
  warnUnmergeable,
} from "../../utils/merge-read.js";
import { safeWriteFile } from "../../utils/safe-write.js";
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

export const GROK_GLOBAL_CONFIG_PATH = join(homedir(), ".grok", "config.toml");
export const GROK_PROJECT_CONFIG_PATH = ".grok/config.toml";

export interface GrokConfigOptions {
  /** When true, leave telemetry enabled in Grok config. When false/undefined, set telemetry = false under [features]. */
  telemetry?: boolean;
}

/** Recommended MCP servers for Grok (especially Serena). */
export const RECOMMENDED_GROK_MCP = {
  "chrome-devtools": RECOMMENDED_CHROME_DEVTOOLS_MCP,
  get serena(): SerenaMcpEntry {
    return serenaMcpEntry("ide", serenaTransportMode());
  },
};

type TomlValue = Record<string, unknown>;

/**
 * Ensures that Grok's global config has telemetry disabled when the user has
 * opted out of telemetry in oma-config.yaml.
 *
 * Grok stores this under:
 *   [features]
 *   telemetry = false
 */
export function applyGrokTelemetryConfig(
  options: GrokConfigOptions = {},
): void {
  const wantTelemetry = options.telemetry === true;

  const content = existsSync(GROK_GLOBAL_CONFIG_PATH)
    ? readFileSync(GROK_GLOBAL_CONFIG_PATH, "utf-8")
    : "";
  // A config that does not parse is left untouched: rewriting it from `{}`
  // would erase the user's Grok settings.
  const parsed: TomlValue | null = readTomlMergeBaseOrWarn(
    GROK_GLOBAL_CONFIG_PATH,
  );
  if (!parsed) return;

  const features = isRecord(parsed.features) ? { ...parsed.features } : {};

  if (wantTelemetry) {
    // User opted in — remove our opt-out if present.
    delete features.telemetry;
  } else {
    // Opt out (default behavior).
    features.telemetry = false;
  }

  if (Object.keys(features).length > 0) {
    parsed.features = features;
  } else {
    delete parsed.features;
  }

  const newContent = `${stringifyToml(parsed)}\n`;

  if (newContent.trim() === content.trim()) {
    return; // No change needed.
  }

  safeWriteFile(GROK_GLOBAL_CONFIG_PATH, newContent);
}

/**
 * Returns true if the current Grok global config needs to be updated to
 * respect the given telemetry preference.
 */
export function needsGrokTelemetryUpdate(
  options: GrokConfigOptions = {},
): boolean {
  const wantTelemetry = options.telemetry === true;

  if (!existsSync(GROK_GLOBAL_CONFIG_PATH)) {
    return !wantTelemetry; // File missing → we should create it with telemetry=false
  }

  const read = readTomlForMerge(GROK_GLOBAL_CONFIG_PATH);
  if (read.status === "invalid") {
    // Unparsable file → oma cannot update it safely; leave it to the user.
    warnUnmergeable(GROK_GLOBAL_CONFIG_PATH, read.reason);
    return false;
  }
  const parsed: TomlValue = read.status === "ok" ? read.value : {};
  const current = isRecord(parsed.features)
    ? parsed.features.telemetry
    : undefined;

  if (wantTelemetry) {
    // We want telemetry → only update if we previously forced it off.
    return current === false;
  }
  // We want it off → update unless it's already explicitly false.
  return current !== false;
}

/**
 * Ensures the project's `.grok/config.toml` has the recommended MCP servers
 * (primarily Serena) registered under [mcp_servers].
 *
 * This is analogous to how Codex registers MCPs in `.codex/config.toml`.
 */
export function applyGrokProjectMcp(cwd: string): void {
  const projectConfigPath = join(cwd, GROK_PROJECT_CONFIG_PATH);

  const content = existsSync(projectConfigPath)
    ? readFileSync(projectConfigPath, "utf-8")
    : "";
  // Never rewrite an unparsable config from `{}` (user MCP servers live here).
  const parsed: TomlValue | null = readTomlMergeBaseOrWarn(projectConfigPath);
  if (!parsed) return;

  const currentMcp = isRecord(parsed.mcp_servers) ? parsed.mcp_servers : {};
  const currentSerena = isRecord(currentMcp.serena) ? currentMcp.serena : {};

  // Only set if it doesn't have a proper transport yet
  const hasTransport =
    typeof currentSerena.command === "string" ||
    typeof currentSerena.url === "string";

  const nextMcp: TomlValue = { ...currentMcp };

  // Inject chrome-devtools if missing
  if (
    !isRecord(currentMcp["chrome-devtools"]) ||
    (typeof (currentMcp["chrome-devtools"] as TomlValue).command !== "string" &&
      typeof (currentMcp["chrome-devtools"] as TomlValue).url !== "string")
  ) {
    nextMcp["chrome-devtools"] = { ...RECOMMENDED_GROK_MCP["chrome-devtools"] };
  }

  if (
    !hasTransport ||
    hasStaleSerenaTransport(currentSerena, serenaTransportMode())
  ) {
    nextMcp.serena = {
      ...currentSerena,
      ...withSerenaDashboardOpenDisabled(RECOMMENDED_GROK_MCP.serena),
    };
  } else if (!hasSerenaDashboardOpenDisabled(currentSerena)) {
    nextMcp.serena = withSerenaDashboardOpenDisabled(currentSerena);
  }

  parsed.mcp_servers = nextMcp;

  const newContent = `${stringifyToml(parsed)}\n`;

  if (newContent.trim() === content.trim()) {
    return;
  }

  safeWriteFile(projectConfigPath, newContent);
}

export function needsGrokProjectMcpUpdate(cwd: string): boolean {
  const projectConfigPath = join(cwd, GROK_PROJECT_CONFIG_PATH);

  if (!existsSync(projectConfigPath)) {
    return true;
  }

  const read = readTomlForMerge(projectConfigPath);
  if (read.status === "invalid") {
    warnUnmergeable(projectConfigPath, read.reason);
    return false;
  }
  const parsed: TomlValue = read.status === "ok" ? read.value : {};
  const mcp = isRecord(parsed.mcp_servers) ? parsed.mcp_servers : {};
  const serena = isRecord(mcp.serena) ? mcp.serena : {};
  const chromeDevtools = isRecord(mcp["chrome-devtools"])
    ? mcp["chrome-devtools"]
    : {};

  return !(
    (typeof serena.command === "string" || typeof serena.url === "string") &&
    !isLegacyUvxSerena(serena) &&
    hasSerenaDashboardOpenDisabled(serena) &&
    (typeof chromeDevtools.command === "string" ||
      typeof chromeDevtools.url === "string")
  );
}
