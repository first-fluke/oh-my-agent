/**
 * Migration 008: Migrate legacy agent_cli_mapping + defaults.yaml + models.yaml
 * to the unified single-file model_preset config in oma-config.yaml.
 *
 * Idempotent: skips if model_preset key already present in oma-config.yaml.
 *
 * After this migration:
 * - .agents/oma-config.yaml has model_preset + optional agents + optional models
 * - .agents/config/defaults.yaml is deleted
 * - .agents/config/models.yaml is deleted
 * - .agents/config/ is removed if empty
 */
import {
  cpSync,
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { join } from "node:path";
import { parse as parseYaml, stringify as stringifyYaml } from "yaml";
import type {
  AgentId,
  AgentSpec,
  BuiltInPresetKey,
} from "../../platform/agent-config.js";
import { BUILT_IN_PRESETS } from "../../platform/built-in-presets.js";
import type { Migration } from "./index.js";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type RawAgentDefault = {
  model?: string;
  effort?: string;
  thinking?: boolean;
  memory?: string;
};

type LegacyDefaultsYaml = {
  version?: string;
  agent_defaults?: Record<string, RawAgentDefault>;
  runtime_profiles?: Record<
    string,
    { description?: string; agent_defaults?: Record<string, RawAgentDefault> }
  >;
};

// ---------------------------------------------------------------------------
// Vendor detection helpers
// ---------------------------------------------------------------------------

const OWNER_TO_VENDOR: Record<string, BuiltInPresetKey> = {
  anthropic: "claude-only",
  openai: "codex-only",
  google: "gemini-only",
  qwen: "qwen-only",
};

/** Derive a vendor preset key from a model slug or legacy vendor string. */
function vendorToPresetKey(vendor: string): BuiltInPresetKey | null {
  const normalized = vendor.trim().toLowerCase();
  switch (normalized) {
    case "claude":
    case "claude-only":
      return "claude-only";
    case "codex":
    case "codex-only":
      return "codex-only";
    case "gemini":
    case "gemini-only":
      return "gemini-only";
    case "qwen":
    case "qwen-only":
      return "qwen-only";
    case "antigravity":
      return "antigravity";
    default:
      return null;
  }
}

function modelSlugToPresetKey(slug: string): BuiltInPresetKey | null {
  const owner = slug.split("/")[0] ?? "";
  return OWNER_TO_VENDOR[owner] ?? null;
}

// ---------------------------------------------------------------------------
// Bundled defaults comparison — detect user customizations
// ---------------------------------------------------------------------------

/** The canonical 11 agent IDs in deterministic order */
const ALL_AGENT_IDS: AgentId[] = [
  "orchestrator",
  "architecture",
  "qa",
  "pm",
  "backend",
  "frontend",
  "mobile",
  "db",
  "debug",
  "tf-infra",
  "retrieval",
];

/**
 * Compare a runtime_profiles section from the user's defaults.yaml against
 * the built-in BUILT_IN_PRESETS to determine if the user has customized it.
 * Returns true if the user's content differs from any built-in preset.
 */
function isDefaultsCustomized(userDefaults: LegacyDefaultsYaml): boolean {
  const userRuntimeProfiles = userDefaults.runtime_profiles ?? {};

  for (const [presetKey, builtIn] of Object.entries(BUILT_IN_PRESETS) as [
    BuiltInPresetKey,
    (typeof BUILT_IN_PRESETS)[BuiltInPresetKey],
  ][]) {
    const userProfile = userRuntimeProfiles[presetKey];
    if (!userProfile) continue; // Not customized if missing

    for (const agentId of ALL_AGENT_IDS) {
      const userEntry = userProfile.agent_defaults?.[agentId];
      const builtInEntry = builtIn.agent_defaults[agentId];
      if (!userEntry || !builtInEntry) continue;

      if (
        userEntry.model !== builtInEntry.model ||
        (userEntry.effort ?? undefined) !==
          (builtInEntry.effort ?? undefined) ||
        (userEntry.thinking ?? undefined) !==
          (builtInEntry.thinking ?? undefined)
      ) {
        return true;
      }
    }
  }

  // Also check top-level agent_defaults vs antigravity (which is the "default profile")
  const topLevel = userDefaults.agent_defaults ?? {};
  const antigravity = BUILT_IN_PRESETS.antigravity.agent_defaults;
  for (const agentId of ALL_AGENT_IDS) {
    const userEntry = topLevel[agentId];
    const builtInEntry = antigravity[agentId];
    if (!userEntry || !builtInEntry) continue;
    if (
      userEntry.model !== builtInEntry.model ||
      (userEntry.effort ?? undefined) !== (builtInEntry.effort ?? undefined) ||
      (userEntry.thinking ?? undefined) !== (builtInEntry.thinking ?? undefined)
    ) {
      return true;
    }
  }

  return false;
}

/**
 * Convert a legacy agent_defaults block into an AgentSpec-compatible object.
 */
function rawEntryToAgentSpec(raw: RawAgentDefault): AgentSpec | null {
  if (!raw.model) return null;
  const spec: AgentSpec = { model: raw.model };
  if (raw.effort) spec.effort = raw.effort as AgentSpec["effort"];
  if (raw.thinking !== undefined) spec.thinking = raw.thinking;
  if (raw.memory) spec.memory = raw.memory as AgentSpec["memory"];
  return spec;
}

// ---------------------------------------------------------------------------
// Most-frequent vendor helper
// ---------------------------------------------------------------------------

function mostFrequentPresetKey(
  counts: Map<BuiltInPresetKey, number>,
): BuiltInPresetKey {
  let max = 0;
  let winner: BuiltInPresetKey = "claude-only";
  for (const [key, count] of counts) {
    if (count > max) {
      max = count;
      winner = key;
    }
  }
  return winner;
}

// ---------------------------------------------------------------------------
// Backup helpers
// ---------------------------------------------------------------------------

function writeFailureMarker(cwd: string): void {
  const markerPath = join(cwd, ".agents", ".backup-pre-008-FAILED");
  try {
    writeFileSync(
      markerPath,
      `Migration 008 failed at ${new Date().toISOString()}\n`,
    );
  } catch {
    // best-effort
  }
}

function backupFile(
  srcPath: string,
  backupDir: string,
  relativeName: string,
): void {
  const destPath = join(backupDir, relativeName);
  mkdirSync(join(backupDir, "..").replace(/\.\.$/, ""), { recursive: true });
  mkdirSync(backupDir, { recursive: true });
  try {
    cpSync(srcPath, destPath);
  } catch {
    // best-effort
  }
}

// ---------------------------------------------------------------------------
// Main migration
// ---------------------------------------------------------------------------

export const migrateModelPreset: Migration = {
  name: "008-model-preset",
  up(cwd: string): string[] {
    const actions: string[] = [];

    const omaConfigPath = join(cwd, ".agents", "oma-config.yaml");
    const defaultsPath = join(cwd, ".agents", "config", "defaults.yaml");
    const modelsPath = join(cwd, ".agents", "config", "models.yaml");
    const failureMarkerPath = join(cwd, ".agents", ".backup-pre-008-FAILED");

    // Check for stale failure marker — block re-run until manual removal
    if (existsSync(failureMarkerPath)) {
      console.error(
        `[migration 008] A previous migration 008 run failed. ` +
          `Remove "${failureMarkerPath}" after verifying your config, then retry.`,
      );
      return actions;
    }

    // Idempotency check — skip if model_preset already present
    if (existsSync(omaConfigPath)) {
      try {
        const raw = readFileSync(omaConfigPath, "utf-8");
        if (/^model_preset:/m.test(raw)) {
          // Already migrated
          return actions;
        }
      } catch {
        // If we can't read the file, fall through and try the migration
      }
    }

    // If no oma-config.yaml at all, nothing to migrate
    if (!existsSync(omaConfigPath)) {
      return actions;
    }

    // Create backup directory with timestamp+pid for uniqueness
    const timestamp = Date.now();
    const pid = process.pid;
    const backupDir = join(
      cwd,
      ".agents",
      `.backup-pre-008-${timestamp}-${pid}`,
    );

    try {
      // Parse current oma-config.yaml
      let omaConfigRaw = "";
      let omaConfig: Record<string, unknown> = {};
      try {
        omaConfigRaw = readFileSync(omaConfigPath, "utf-8");
        const parsed = parseYaml(omaConfigRaw);
        if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
          omaConfig = parsed as Record<string, unknown>;
        }
      } catch (err) {
        const isReadError =
          err instanceof Error && "code" in err && err.code === "ENOENT";
        if (!isReadError) {
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
            ? `${omaConfigPath}:${pos.line}:${pos.col}`
            : omaConfigPath;
          console.warn(
            `[migration-008] Failed to parse YAML at ${location}: ${err instanceof Error ? err.message : String(err)} — treating as empty`,
          );
        }
        omaConfigRaw = "";
        omaConfig = {};
      }

      // Parse defaults.yaml (may not exist)
      let defaultsConfig: LegacyDefaultsYaml = {};
      if (existsSync(defaultsPath)) {
        try {
          const raw = readFileSync(defaultsPath, "utf-8");
          const parsed = parseYaml(raw);
          if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
            defaultsConfig = parsed as LegacyDefaultsYaml;
          }
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
            ? `${defaultsPath}:${pos.line}:${pos.col}`
            : defaultsPath;
          console.warn(
            `[migration-008] Failed to parse YAML at ${location}: ${err instanceof Error ? err.message : String(err)} — treating as empty`,
          );
        }
      }

      // Parse models.yaml (may not exist)
      let userModels: Record<string, unknown> = {};
      if (existsSync(modelsPath)) {
        try {
          const raw = readFileSync(modelsPath, "utf-8");
          const parsed = parseYaml(raw);
          if (
            parsed &&
            typeof parsed === "object" &&
            !Array.isArray(parsed) &&
            "models" in (parsed as Record<string, unknown>)
          ) {
            const m = (parsed as Record<string, unknown>).models;
            if (m && typeof m === "object" && !Array.isArray(m)) {
              userModels = m as Record<string, unknown>;
            }
          }
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
            ? `${modelsPath}:${pos.line}:${pos.col}`
            : modelsPath;
          console.warn(
            `[migration-008] Failed to parse YAML at ${location}: ${err instanceof Error ? err.message : String(err)} — treating as empty`,
          );
        }
      }

      // Backup originals before any writes
      backupFile(omaConfigPath, backupDir, "oma-config.yaml");
      if (existsSync(defaultsPath)) {
        backupFile(defaultsPath, backupDir, "config/defaults.yaml");
      }
      if (existsSync(modelsPath)) {
        backupFile(modelsPath, backupDir, "config/models.yaml");
      }
      actions.push(`Backed up originals to ${backupDir}`);

      // Resolve agent_cli_mapping → model_preset + agents
      const legacyMapping = omaConfig.agent_cli_mapping as
        | Record<
            string,
            | string
            | {
                model: string;
                effort?: string;
                thinking?: boolean;
                memory?: string;
              }
          >
        | undefined;

      let modelPreset: BuiltInPresetKey = "gemini-only"; // sensible default
      const agentsOverride: Partial<Record<AgentId, AgentSpec>> = {};

      if (legacyMapping && Object.keys(legacyMapping).length > 0) {
        // Count vendor frequency for preset resolution
        const vendorCounts = new Map<BuiltInPresetKey, number>();
        const objectSpecAgents: Array<{ agentId: AgentId; spec: AgentSpec }> =
          [];

        for (const [rawAgentId, value] of Object.entries(legacyMapping)) {
          const agentId = rawAgentId as AgentId;

          if (typeof value === "string") {
            // Legacy string vendor value
            const presetKey = vendorToPresetKey(value);
            if (presetKey) {
              vendorCounts.set(
                presetKey,
                (vendorCounts.get(presetKey) ?? 0) + 1,
              );
            }
          } else if (value && typeof value === "object" && value.model) {
            // AgentSpec object value
            const spec = rawEntryToAgentSpec(value as RawAgentDefault);
            if (spec) {
              objectSpecAgents.push({ agentId, spec });
              // Count the vendor for preset frequency analysis
              const presetKey = modelSlugToPresetKey(spec.model);
              if (presetKey) {
                vendorCounts.set(
                  presetKey,
                  (vendorCounts.get(presetKey) ?? 0) + 1,
                );
              }
            }
          }
        }

        if (vendorCounts.size > 0) {
          const dominant = mostFrequentPresetKey(vendorCounts);

          if (vendorCounts.size === 1) {
            // Single-vendor: model_preset only, no agents override needed
            modelPreset = dominant;
            // AgentSpec objects still go into agents (they're per-agent overrides)
            for (const { agentId, spec } of objectSpecAgents) {
              agentsOverride[agentId] = spec;
            }
          } else {
            // Mixed-vendor: dominant → preset, others → agents overrides
            modelPreset = dominant;

            for (const [rawAgentId, value] of Object.entries(legacyMapping)) {
              const agentId = rawAgentId as AgentId;

              if (typeof value === "string") {
                const presetKey = vendorToPresetKey(value);
                if (presetKey && presetKey !== dominant) {
                  // Non-dominant vendor string → resolve from built-in preset
                  const agentSpecFromPreset =
                    BUILT_IN_PRESETS[presetKey]?.agent_defaults[agentId];
                  if (agentSpecFromPreset) {
                    agentsOverride[agentId] = agentSpecFromPreset;
                  }
                }
                // Dominant vendor string entries are covered by model_preset
              } else if (value && typeof value === "object" && value.model) {
                const spec = rawEntryToAgentSpec(value as RawAgentDefault);
                if (spec) {
                  agentsOverride[agentId] = spec;
                }
              }
            }
          }
        } else if (objectSpecAgents.length > 0) {
          // Only AgentSpec objects, no string vendor values
          for (const { agentId, spec } of objectSpecAgents) {
            agentsOverride[agentId] = spec;
          }
          // Try to infer preset from the first spec's model slug
          const firstSpec = objectSpecAgents[0];
          if (firstSpec) {
            const inferred = modelSlugToPresetKey(firstSpec.spec.model);
            if (inferred) modelPreset = inferred;
          }
        }
      } else {
        // No agent_cli_mapping — infer from default_cli if present
        const defaultCli = omaConfig.default_cli as string | undefined;
        if (defaultCli) {
          const presetKey = vendorToPresetKey(defaultCli);
          if (presetKey) modelPreset = presetKey;
        }
      }

      // Build the new oma-config.yaml content
      const newConfig: Record<string, unknown> = {};

      // Preserve existing fields (language, timezone, date_format, etc.)
      for (const [key, value] of Object.entries(omaConfig)) {
        if (key !== "agent_cli_mapping" && key !== "default_cli") {
          newConfig[key] = value;
        }
      }

      // Set the new model_preset
      newConfig.model_preset = modelPreset;

      // Add agents overrides if any
      if (Object.keys(agentsOverride).length > 0) {
        newConfig.agents = agentsOverride;
      }

      // Inline models.yaml content if non-empty
      if (Object.keys(userModels).length > 0) {
        newConfig.models = userModels;
        actions.push(
          "Inlined .agents/config/models.yaml → oma-config.yaml.models",
        );
      }

      // Detect user-customized defaults.yaml and preserve as custom_presets.user-customized
      if (existsSync(defaultsPath) && isDefaultsCustomized(defaultsConfig)) {
        console.warn(
          `[migration 008] .agents/config/defaults.yaml appears to have been customized. ` +
            `Preserving as custom_presets.user-customized in oma-config.yaml. ` +
            `Review and update to use model_preset + agents overrides instead.`,
        );

        // Convert the runtime_profiles from defaults.yaml into a custom preset
        const customPresetAgentDefaults: Partial<Record<AgentId, AgentSpec>> =
          {};
        const runtimeProfiles = defaultsConfig.runtime_profiles ?? {};

        // Find the profile that matches the dominant preset and extract differences
        const dominantProfile = runtimeProfiles[modelPreset];
        if (dominantProfile?.agent_defaults) {
          for (const agentId of ALL_AGENT_IDS) {
            const userEntry = dominantProfile.agent_defaults[agentId];
            const builtInEntry =
              BUILT_IN_PRESETS[modelPreset]?.agent_defaults[agentId];
            if (userEntry && builtInEntry) {
              if (
                userEntry.model !== builtInEntry.model ||
                (userEntry.effort ?? undefined) !==
                  (builtInEntry.effort ?? undefined) ||
                (userEntry.thinking ?? undefined) !==
                  (builtInEntry.thinking ?? undefined)
              ) {
                const spec = rawEntryToAgentSpec(userEntry);
                if (spec) customPresetAgentDefaults[agentId] = spec;
              }
            }
          }
        }

        if (Object.keys(customPresetAgentDefaults).length > 0) {
          newConfig.custom_presets = {
            "user-customized": {
              extends: modelPreset,
              description:
                "Migrated from customized .agents/config/defaults.yaml",
              agent_defaults: customPresetAgentDefaults,
            },
          };
          newConfig.model_preset = "user-customized";
          actions.push(
            "Preserved customized defaults.yaml as custom_presets.user-customized (WARN: review and update)",
          );
        }
      }

      // Write new oma-config.yaml
      const newConfigYaml = `# Migrated by oma migration 008 — model_preset single-file config\n${stringifyYaml(newConfig)}`;
      writeFileSync(omaConfigPath, newConfigYaml);
      actions.push(
        `.agents/oma-config.yaml updated (model_preset: ${String(newConfig.model_preset)})`,
      );

      // Delete .agents/config/defaults.yaml
      if (existsSync(defaultsPath)) {
        rmSync(defaultsPath);
        actions.push(".agents/config/defaults.yaml (deleted)");
      }

      // Delete .agents/config/models.yaml
      if (existsSync(modelsPath)) {
        rmSync(modelsPath);
        actions.push(".agents/config/models.yaml (deleted)");
      }

      // Remove .agents/config/ if empty
      const configDir = join(cwd, ".agents", "config");
      if (existsSync(configDir)) {
        try {
          const remaining = readdirSync(configDir);
          if (remaining.length === 0) {
            rmSync(configDir, { recursive: true });
            actions.push(".agents/config/ (removed empty dir)");
          }
        } catch {
          // best-effort
        }
      }

      return actions;
    } catch (err) {
      // Write failure marker to prevent infinite retry
      writeFailureMarker(cwd);
      throw new Error(
        `[migration 008] Migration failed: ${err instanceof Error ? err.message : String(err)}. ` +
          `Originals backed up to ${backupDir}. ` +
          `Remove ".agents/.backup-pre-008-FAILED" after fixing the issue, then retry.`,
      );
    }
  },
};
