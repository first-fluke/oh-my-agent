import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { parse as parseYaml } from "yaml";

interface OmaConfig {
  language?: string;
  timezone?: string;
  date_format?: string;
  default_cli?: string;
  agent_cli_mapping?: Record<string, string>;
  auto_update_cli?: boolean;
}

/**
 * Read .agents/oma-config.yaml, walking up from cwd.
 * Returns null if not found.
 */
export function loadOmaConfig(cwd?: string): OmaConfig | null {
  let dir = cwd || process.cwd();
  for (let i = 0; i < 10; i++) {
    const configPath = join(dir, ".agents", "oma-config.yaml");
    if (existsSync(configPath)) {
      try {
        const content = readFileSync(configPath, "utf-8");
        return parseYaml(content) as OmaConfig;
      } catch {
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
