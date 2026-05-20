import {
  type AgentId,
  type AgentSpec,
  type BuiltInPresetKey,
  type ModelPreset,
  normalizeAgentId,
  type OmaConfig,
} from "../../platform/agent-config.js";
import {
  BUILT_IN_PRESET_ALIASES,
  BUILT_IN_PRESETS,
} from "../../platform/built-in-presets.js";
import {
  buildUnknownSlugError,
  type EffortLevel,
  getModelSpec,
  type RuntimeId,
} from "../../platform/model-registry.js";
import { warnGeminiDeprecationOnce } from "../../utils/gemini-deprecation.js";
import { ConfigError } from "./config-error.js";
import { loadUserConfig } from "./config-loader.js";
import type { AgentPlan } from "./types.js";

/**
 * Merge a custom preset with its base, respecting the extends chain.
 * Cycle detection: tracks visited preset keys and throws ConfigError on cycle.
 *
 * The merge is shallow per-agent: custom preset's agent_defaults entries fully
 * override the corresponding base entries (no field-level merge within an agent).
 * Missing agents in the custom preset are inherited from the base.
 */
function mergeWithBase(
  custom: ModelPreset,
  baseKey: string,
  config: Partial<OmaConfig>,
  visited: Set<string>,
): ModelPreset {
  if (visited.has(baseKey)) {
    throw new ConfigError(
      `Circular extends chain detected at preset "${baseKey}". Chain: ${[...visited].join(" → ")} → ${baseKey}`,
    );
  }
  visited.add(baseKey);

  const builtInBase = BUILT_IN_PRESETS[baseKey as BuiltInPresetKey];
  if (builtInBase) {
    return {
      description: custom.description,
      agent_defaults: {
        ...builtInBase.agent_defaults,
        ...custom.agent_defaults,
      } as Record<AgentId, AgentSpec>,
    };
  }

  const customBase = config.custom_presets?.[baseKey];
  if (customBase) {
    // Recursively resolve the base's extends chain first
    let resolvedBase: ModelPreset = customBase;
    if (customBase.extends) {
      resolvedBase = mergeWithBase(
        customBase,
        customBase.extends,
        config,
        visited,
      );
    }
    return {
      description: custom.description,
      agent_defaults: {
        ...resolvedBase.agent_defaults,
        ...custom.agent_defaults,
      } as Record<AgentId, AgentSpec>,
    };
  }

  throw new ConfigError(
    `Preset "${baseKey}" referenced in 'extends' is not a built-in preset and not found in custom_presets.`,
  );
}

/**
 * Pure implementation — separated from file I/O so tests can inject config.
 *
 * 4-step resolver:
 * 1. Resolve preset (built-in, alias, or custom with optional extends merge)
 * 2. Spec selection — override (agents map) shallow-merged over preset entry
 * 3. Registry lookup — built-in models + user inline models
 * 4. Feature filter — drop effort for cli-session, apply vendorOverride
 */
export function resolveAgentPlanFromConfig(
  agentId: string,
  config: Partial<OmaConfig>,
  vendorOverride?: string,
): AgentPlan {
  const modelPreset = config.model_preset;
  if (!modelPreset) {
    throw new ConfigError(
      `'model_preset' is missing from .agents/oma-config.yaml. Run 'oma install --preset <name>' to set one.`,
    );
  }

  // Step 1: Resolve preset (built-in → alias → custom with extends chain)
  const resolvedKey = BUILT_IN_PRESET_ALIASES[modelPreset] ?? modelPreset;
  const builtIn = BUILT_IN_PRESETS[resolvedKey as BuiltInPresetKey];
  const customPreset = config.custom_presets?.[resolvedKey];

  let preset: ModelPreset;
  if (builtIn) {
    if (resolvedKey !== modelPreset) {
      console.warn(
        `[resolve-agent-plan] Preset alias "${modelPreset}" redirected to "${resolvedKey}". Update your config to use the canonical key.`,
      );
    }
    preset = builtIn;
  } else if (customPreset) {
    if (customPreset.extends) {
      preset = mergeWithBase(
        customPreset,
        customPreset.extends,
        config,
        new Set([resolvedKey]),
      );
    } else {
      preset = customPreset;
    }
    // Custom preset collision with built-in name was already resolved above (builtIn wins)
  } else {
    const validBuiltIns = Object.keys(BUILT_IN_PRESETS).join(", ");
    throw new ConfigError(
      `Unknown model_preset "${modelPreset}". Built-in presets: ${validBuiltIns}. ` +
        `Custom presets defined: ${Object.keys(config.custom_presets ?? {}).join(", ") || "(none)"}.`,
    );
  }

  // Step 2: Spec selection with shallow merge (override over preset).
  // Normalize semantic aliases ("backend-engineer" → "backend") so callers
  // using subagent file names still resolve to the correct preset entry.
  const typedAgentId = (normalizeAgentId(agentId) ?? agentId) as AgentId;
  const presetSpec =
    preset.agent_defaults[typedAgentId] ?? preset.agent_defaults.orchestrator;

  if (!presetSpec) {
    throw new ConfigError(
      `Preset "${resolvedKey}" has no agent_defaults for "${agentId}" and no orchestrator fallback. ` +
        `Custom presets without 'extends' must define every canonical agent role.`,
    );
  }

  const override = config.agents?.[typedAgentId];
  const spec: AgentSpec = override
    ? { ...presetSpec, ...override }
    : presetSpec;

  if (override && JSON.stringify(override) === JSON.stringify(presetSpec)) {
    console.debug(
      `[resolve-agent-plan] ${agentId}: override is identical to preset entry (no-op).`,
    );
  }

  // Step 3: Registry lookup (built-in models + user inline models)
  const modelSpec = getModelSpec(
    spec.model,
    config.models as Record<string, unknown> | undefined,
  );
  if (!modelSpec) {
    throw new ConfigError(buildUnknownSlugError(spec.model, agentId));
  }

  // Defensive: api_only guard
  if (modelSpec.supports.api_only) {
    throw new ConfigError(
      `Model "${spec.model}" has api_only: true. CLI dispatch is not supported. Use a supported model.`,
    );
  }

  // Step 4: Feature filter + vendorOverride
  const effectiveOverride =
    vendorOverride ?? process.env.OMA_RUNTIME_VENDOR?.trim().toLowerCase();

  let cli: RuntimeId = modelSpec.cli;
  if (effectiveOverride) {
    if (
      modelSpec.supports.native_dispatch_from.includes(
        effectiveOverride as RuntimeId,
      )
    ) {
      cli = effectiveOverride as RuntimeId;
    } else {
      console.warn(
        `[resolve-agent-plan] ${agentId} agent: "${effectiveOverride}" is not in native_dispatch_from [${modelSpec.supports.native_dispatch_from.join(", ")}]. Falling back to external subprocess.`,
      );
    }
  }

  let finalEffort: EffortLevel | undefined = spec.effort as
    | EffortLevel
    | undefined;
  if (
    modelSpec.supports.effort?.type === "cli-session" &&
    finalEffort !== undefined
  ) {
    console.warn(
      `[resolve-agent-plan] effort field is ignored for Claude CLI (cli-session model). Remove 'effort' from agents.${agentId} in .agents/oma-config.yaml.`,
    );
    finalEffort = undefined;
  }

  if (cli === "gemini") {
    warnGeminiDeprecationOnce("runtime");
  }

  const plan: AgentPlan = {
    cli,
    cliModel: modelSpec.cli_model,
    spec: modelSpec,
  };

  if (finalEffort !== undefined) plan.effort = finalEffort;
  if (spec.thinking !== undefined) plan.thinking = spec.thinking;
  if (spec.memory !== undefined) plan.memory = spec.memory;

  return plan;
}

/**
 * Resolve the per-agent dispatch plan from oma-config.yaml.
 *
 * 4-step resolver flow:
 * 1. Load oma-config.yaml (single file I/O)
 * 2. Resolve model_preset → built-in, alias, or custom with extends merge
 * 3. Shallow merge agents[agentId] override over preset.agent_defaults[agentId]
 * 4. Registry lookup + feature filter (effort, vendorOverride)
 *
 * Throws ConfigError on missing preset, unknown slug, or cycle in extends chain.
 */
export function resolveAgentPlan(
  agentId: string,
  vendorOverride?: string,
): AgentPlan {
  const cwd = process.cwd();
  const config = loadUserConfig(cwd);
  return resolveAgentPlanFromConfig(agentId, config, vendorOverride);
}
