import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import { parse as parseToml, stringify as stringifyToml } from "smol-toml";

export const GROK_GLOBAL_CONFIG_PATH = join(homedir(), ".grok", "config.toml");
export const GROK_PROJECT_CONFIG_PATH = ".grok/config.toml";

export interface GrokConfigOptions {
  /** When true, leave telemetry enabled in Grok config. When false/undefined, set telemetry = false under [features]. */
  telemetry?: boolean;
}

/** Recommended MCP servers for Grok (especially Serena). */
export const RECOMMENDED_GROK_MCP = {
  serena: {
    command: "serena",
    args: ["start-mcp-server", "--context", "ide", "--project", "."],
  },
};

type TomlValue = Record<string, unknown>;

function isRecord(value: unknown): value is TomlValue {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

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

  let content = "";
  if (existsSync(GROK_GLOBAL_CONFIG_PATH)) {
    content = readFileSync(GROK_GLOBAL_CONFIG_PATH, "utf-8");
  }

  let parsed: TomlValue = {};
  try {
    if (content.trim()) {
      parsed = parseToml(content) as TomlValue;
    }
  } catch {
    // Corrupt or unparsable — start fresh but preserve other sections if possible.
    parsed = {};
  }

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

  mkdirSync(dirname(GROK_GLOBAL_CONFIG_PATH), { recursive: true });
  writeFileSync(GROK_GLOBAL_CONFIG_PATH, newContent);
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

  try {
    const content = readFileSync(GROK_GLOBAL_CONFIG_PATH, "utf-8");
    const parsed = parseToml(content) as TomlValue;

    const current = isRecord(parsed.features)
      ? parsed.features.telemetry
      : undefined;

    if (wantTelemetry) {
      // We want telemetry → only update if we previously forced it off.
      return current === false;
    } else {
      // We want it off → update unless it's already explicitly false.
      return current !== false;
    }
  } catch {
    return true; // Unparsable file → treat as needing update.
  }
}

/**
 * Ensures the project's `.grok/config.toml` has the recommended MCP servers
 * (primarily Serena) registered under [mcp_servers].
 *
 * This is analogous to how Codex registers MCPs in `.codex/config.toml`.
 */
export function applyGrokProjectMcp(cwd: string): void {
  const projectConfigPath = join(cwd, GROK_PROJECT_CONFIG_PATH);

  let content = "";
  if (existsSync(projectConfigPath)) {
    content = readFileSync(projectConfigPath, "utf-8");
  }

  let parsed: TomlValue = {};
  try {
    if (content.trim()) {
      parsed = parseToml(content) as TomlValue;
    }
  } catch {
    parsed = {};
  }

  const currentMcp = isRecord(parsed.mcp_servers) ? parsed.mcp_servers : {};
  const currentSerena = isRecord(currentMcp.serena) ? currentMcp.serena : {};

  // Only set if it doesn't have a proper transport yet
  const hasTransport =
    typeof currentSerena.command === "string" ||
    typeof currentSerena.url === "string";

  if (!hasTransport) {
    parsed.mcp_servers = {
      ...currentMcp,
      serena: {
        ...currentSerena,
        ...RECOMMENDED_GROK_MCP.serena,
      },
    };
  }

  const newContent = `${stringifyToml(parsed)}\n`;

  if (newContent.trim() === content.trim()) {
    return;
  }

  mkdirSync(dirname(projectConfigPath), { recursive: true });
  writeFileSync(projectConfigPath, newContent);
}

export function needsGrokProjectMcpUpdate(cwd: string): boolean {
  const projectConfigPath = join(cwd, GROK_PROJECT_CONFIG_PATH);

  if (!existsSync(projectConfigPath)) {
    return true;
  }

  try {
    const content = readFileSync(projectConfigPath, "utf-8");
    const parsed = parseToml(content) as TomlValue;
    const mcp = isRecord(parsed.mcp_servers) ? parsed.mcp_servers : {};
    const serena = isRecord(mcp.serena) ? mcp.serena : {};

    return !(
      typeof serena.command === "string" || typeof serena.url === "string"
    );
  } catch {
    return true;
  }
}
