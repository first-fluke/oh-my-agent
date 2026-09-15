import { existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { parseDocument } from "yaml";
import type { OmaConfig } from "../platform/agent-config/types.js";
import { evaluateCueFile } from "./cue.js";
import { isRecord } from "./type-guards.js";

export const LOCAL_CONFIG_NAMES = [
  "oma-config.local.cue",
  "oma-config.local.yaml",
] as const;

export class ConfigLayerError extends Error {
  constructor(
    message: string,
    readonly local = false,
  ) {
    super(message);
    this.name = "ConfigLayerError";
  }
}

export interface ConfigLayers {
  config: Partial<OmaConfig>;
  sources: { shared?: string; local?: string; environment?: string };
}

function readConfig(file: string, local: boolean): Record<string, unknown> {
  let value: unknown;
  if (file.endsWith(".cue")) {
    const result = evaluateCueFile(file);
    if (!result.success) {
      throw new ConfigLayerError(
        `Failed to evaluate CUE at ${file}: ${local ? "invalid local CUE" : (result.error ?? "unknown error")}.${result.missingCli ? " Install CUE or use oma-config.yaml (oma-config.local.yaml for local settings)." : ""}`,
        local,
      );
    }
    value = result.data;
  } else {
    let content: string;
    try {
      content = readFileSync(file, "utf8");
    } catch {
      throw new ConfigLayerError(`Cannot read config at ${file}`, local);
    }
    const doc = parseDocument(content, { prettyErrors: false });
    const error = doc.errors[0];
    if (error) {
      const prefix = content.slice(0, error.pos[0]);
      const line = prefix.split("\n").length;
      const col = prefix.length - prefix.lastIndexOf("\n");
      // Never include the YAML source excerpt (it may contain credentials).
      throw new ConfigLayerError(
        `Failed to parse YAML at ${file}:${line}:${col}: ${error.code}`,
        local,
      );
    }
    try {
      value = doc.toJS({ maxAliasCount: 100 });
    } catch {
      throw new ConfigLayerError(
        `Cannot resolve YAML aliases at ${file}`,
        local,
      );
    }
  }
  if (isRecord(value)) return value;
  if (local)
    throw new ConfigLayerError(
      `Local config at ${file} must be an object`,
      true,
    );
  return {};
}

/** Plain objects merge recursively; arrays/scalars replace. Block prototype keys. */
function overlay(
  base: Record<string, unknown>,
  local: Record<string, unknown>,
): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const source of [base, local]) {
    for (const [key, value] of Object.entries(source)) {
      if (["__proto__", "constructor", "prototype"].includes(key)) continue;
      result[key] = isRecord(value)
        ? overlay(isRecord(result[key]) ? result[key] : {}, value)
        : value;
    }
  }
  return result;
}

/** Select the nearest config directory once; never mix separate project roots. */
export function loadConfigLayers(
  cwd = process.cwd(),
  env: NodeJS.ProcessEnv = process.env,
): ConfigLayers {
  const finalize = (layers: ConfigLayers): ConfigLayers => {
    if (env.OMA_MODEL_PRESET !== undefined) {
      if (!env.OMA_MODEL_PRESET.trim())
        throw new ConfigLayerError("OMA_MODEL_PRESET must be non-empty", true);
      layers.config.model_preset = env.OMA_MODEL_PRESET.trim();
      layers.sources.environment = "OMA_MODEL_PRESET";
    }
    return layers;
  };
  let dir = resolve(cwd);
  while (true) {
    const root = join(dir, ".agents");
    const cue = join(root, "oma-config.cue");
    const yaml = join(root, "oma-config.yaml");
    const locals = LOCAL_CONFIG_NAMES.map((name) => join(root, name)).filter(
      (file) => existsSync(file),
    );
    if (existsSync(cue) || existsSync(yaml) || locals.length) {
      if (locals.length > 1) {
        throw new ConfigLayerError(
          `Both local CUE and YAML configs exist in ${root}; keep only one local config.`,
          true,
        );
      }
      const sources: ConfigLayers["sources"] = {};
      let shared: Record<string, unknown> = {};
      const strict = locals.length > 0 || env.OMA_MODEL_PRESET === "free";
      if (existsSync(cue)) {
        try {
          const cueConfig = readConfig(cue, strict);
          let yamlDefaults: Record<string, unknown> = {};
          if (existsSync(yaml)) {
            try {
              yamlDefaults = readConfig(yaml, strict);
            } catch {
              // A valid CUE config remains authoritative over a stale YAML file.
            }
          }
          // Update/install commands still persist some newer preferences in
          // YAML. Retain those fields when the preferred CUE config has no
          // corresponding value, while CUE continues to win on conflicts.
          shared = overlay(yamlDefaults, cueConfig);
          sources.shared = cue;
        } catch (error) {
          if (!existsSync(yaml)) throw error;
          console.warn(
            `[config] CUE evaluation failed at ${cue}. Falling back to oma-config.yaml (${yaml}).`,
          );
        }
      }
      if (!sources.shared && existsSync(yaml)) {
        shared = readConfig(yaml, strict);
        sources.shared = yaml;
      }
      const local = locals[0];
      if (local) sources.local = local;
      return finalize({
        config: overlay(
          shared,
          local ? readConfig(local, true) : {},
        ) as Partial<OmaConfig>,
        sources,
      });
    }
    const parent = dirname(dir);
    if (parent === dir) return finalize({ config: {}, sources: {} });
    dir = parent;
  }
}
