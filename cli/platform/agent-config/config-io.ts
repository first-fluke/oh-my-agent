import fs from "node:fs";
import path from "node:path";
import { parse as parseYaml } from "yaml";
import { CliConfigSchema, OmaConfigSchema } from "./schemas.js";
import type { CliConfig, OmaConfig, VendorConfig } from "./types.js";

/**
 * Extract a human-readable "line:col" string from a yaml library parse error.
 * Returns undefined if position information is not available on the error.
 */
function yamlErrorPosition(
  err: unknown,
): { line: number; col: number } | undefined {
  if (
    err &&
    typeof err === "object" &&
    "linePos" in err &&
    Array.isArray((err as { linePos: unknown[] }).linePos) &&
    (err as { linePos: unknown[] }).linePos.length > 0
  ) {
    const first = (err as { linePos: Array<{ line: number; col: number }> })
      .linePos[0];
    if (
      first &&
      typeof first.line === "number" &&
      typeof first.col === "number"
    ) {
      return first;
    }
  }
  return undefined;
}

function parseYamlValue(content: string, filePath?: string): unknown {
  try {
    return parseYaml(content);
  } catch (err) {
    const pos = yamlErrorPosition(err);
    const location = filePath
      ? pos
        ? `${filePath}:${pos.line}:${pos.col}`
        : filePath
      : pos
        ? `<input>:${pos.line}:${pos.col}`
        : "<input>";
    console.warn(
      `[agent-config] YAML parse error at ${location}: ${err instanceof Error ? err.message : String(err)}`,
    );
    return null;
  }
}

/**
 * Parse oma-config.yaml content into OmaConfig.
 * Returns null on parse failure or missing required fields.
 */
export function parseOmaConfig(
  content: string,
  filePath?: string,
): OmaConfig | null {
  const parsed = parseYamlValue(content, filePath);
  const result = OmaConfigSchema.safeParse(parsed);
  if (!result.success) return null;
  return result.data as OmaConfig;
}

function parseCliConfig(content: string, filePath?: string): CliConfig {
  const parsed = parseYamlValue(content, filePath);
  const result = CliConfigSchema.safeParse(parsed);
  if (!result.success) return { vendors: {} };

  return {
    active_vendor: result.data.active_vendor,
    vendors: result.data.vendors as Record<string, VendorConfig>,
  };
}

export function findConfigFileUp(
  startDir: string,
  relativePath: string,
): string | null {
  let current = path.resolve(startDir);
  const root = path.parse(current).root;

  while (current !== root) {
    const configPath = path.join(current, relativePath);
    if (fs.existsSync(configPath)) return configPath;
    current = path.dirname(current);
  }
  return null;
}

export function readCliConfig(cwd: string): CliConfig | null {
  const configPath = findConfigFileUp(
    cwd,
    path.join(
      ".agents",
      "skills",
      "oma-orchestrator",
      "config",
      "cli-config.yaml",
    ),
  );
  if (!configPath) return null;
  try {
    const content = fs.readFileSync(configPath, "utf-8");
    return parseCliConfig(content, configPath);
  } catch {
    return null;
  }
}
