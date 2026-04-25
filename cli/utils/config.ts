import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { parse as parseYaml } from "yaml";
import type { OmaConfig } from "../platform/agent-config.js";

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
