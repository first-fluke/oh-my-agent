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
import {
  isLlmProviderName,
  resolveLlmProvider,
  resolveProviderVendor,
} from "../../utils/free-provider.js";
import { ConfigError } from "./config-error.js";
import { loadUserConfig } from "./config-loader.js";
import { resolveAutoVendor } from "./detect.js";
import { toPiModel } from "./pi-model-map.js";
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

type AgentDefaults = Pick<AgentSpec, "effort" | "thinking" | "memory">;

/** `agents.default`: effort / thinking / memory used when a role sets none. */
function agentDefaults(config: Partial<OmaConfig>): AgentDefaults {
  const entry = (config.agents as Record<string, unknown> | undefined)?.default;
  return entry && typeof entry === "object" && !Array.isArray(entry)
    ? (entry as AgentDefaults)
    : {};
}

/** Fill effort / thinking / memory from `agents.default` where the plan has none. */
function withAgentDefaults(
  plan: AgentPlan,
  config: Partial<OmaConfig>,
): AgentPlan {
  const defaults = agentDefaults(config);
  if (plan.effort === undefined && defaults.effort !== undefined)
    plan.effort = defaults.effort as EffortLevel;
  if (plan.thinking === undefined && defaults.thinking !== undefined)
    plan.thinking = defaults.thinking;
  if (plan.memory === undefined && defaults.memory !== undefined)
    plan.memory = defaults.memory;
  return plan;
}

/** The per-role fields (`agents.<id>`) that apply to a provider-routed plan. */
function roleTuning(
  agentId: string,
  config: Partial<OmaConfig>,
): AgentDefaults {
  const bare = agentId.replace(/-agent$/i, "");
  const agents = (config.agents ?? {}) as Record<string, AgentSpec | undefined>;
  const spec =
    agents[normalizeAgentId(agentId) ?? bare] ??
    agents[bare] ??
    agents[agentId];
  return spec
    ? { effort: spec.effort, thinking: spec.thinking, memory: spec.memory }
    : {};
}

function providerPlan(
  providerName: string,
  cliModel: string,
  tuning: AgentDefaults,
  fromPreset: boolean,
  config: Partial<OmaConfig>,
  vendorOverride: string | undefined,
  env: NodeJS.ProcessEnv,
): AgentPlan {
  const provider = resolveLlmProvider(providerName, config, env);
  const plan: AgentPlan = {
    cli: resolveProviderVendor(provider, config, vendorOverride, env),
    cliModel,
    provider,
    providerFromPreset: fromPreset,
  };
  if (tuning.effort !== undefined) plan.effort = tuning.effort as EffortLevel;
  if (tuning.thinking !== undefined) plan.thinking = tuning.thinking;
  if (tuning.memory !== undefined) plan.memory = tuning.memory;
  return withAgentDefaults(plan, config);
}

/**
 * Pure implementation — separated from file I/O so tests can inject config.
 *
 * 4-step resolver:
 * 1. Resolve preset (built-in, alias, custom with optional extends merge, or
 *    a `providers.<name>` entry / `free`, which routes every role)
 * 2. Spec selection — override (agents map) shallow-merged over preset entry;
 *    a `<provider>/<model>` slug routes that role through the provider
 * 3. Registry lookup — built-in models + user inline models
 * 4. Feature filter — drop effort for cli-session, apply vendorOverride, then
 *    fill effort / thinking / memory from `agents.default`
 */
export function resolveAgentPlanFromConfig(
  agentId: string,
  config: Partial<OmaConfig>,
  vendorOverride?: string,
  env: NodeJS.ProcessEnv = process.env,
): AgentPlan {
  const modelPreset = config.model_preset;
  if (isLlmProviderName(modelPreset, config)) {
    // Every role goes to the provider's default model; per-role model pins are
    // ignored (they would escape the route), per-role tuning still applies.
    const provider = resolveLlmProvider(modelPreset, config, env);
    if (!provider.model) {
      throw new ConfigError(
        `model_preset "${modelPreset}" needs providers.${modelPreset}.default_model, or pin roles with agents.<id>.model: ${modelPreset}/<model-id>.`,
      );
    }
    return providerPlan(
      modelPreset,
      provider.model,
      roleTuning(agentId, config),
      true,
      config,
      vendorOverride,
      env,
    );
  }
  if (!modelPreset) {
    throw new ConfigError(
      `'model_preset' is missing from .agents/oma-config.yaml (or .agents/oma-config.cue). Run 'oma install --preset <name>' to set one.`,
    );
  }

  // Step 1: Resolve preset (built-in → alias → custom with extends chain)
  const resolvedKey = BUILT_IN_PRESET_ALIASES[modelPreset] ?? modelPreset;
  const builtIn = BUILT_IN_PRESETS[resolvedKey as BuiltInPresetKey];
  const customPreset = config.custom_presets?.[resolvedKey];

  let preset: ModelPreset;
  if (modelPreset === "auto") {
    preset = {
      description: "Use the current vendor's agent configuration",
      agent_defaults: {},
    };
  } else if (builtIn) {
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
    const validBuiltIns = [
      "auto",
      "free",
      ...Object.keys(BUILT_IN_PRESETS),
    ].join(", ");
    throw new ConfigError(
      `Unknown model_preset "${modelPreset}". Built-in presets: ${validBuiltIns}. ` +
        `Custom presets defined: ${Object.keys(config.custom_presets ?? {}).join(", ") || "(none)"}.`,
    );
  }

  // Step 2: Spec selection with shallow merge (override over preset).
  // Normalize semantic aliases ("backend-engineer" → "backend") so callers
  // using subagent file names still resolve to the correct preset entry.
  // Dispatch ids such as "eval-agent" / "opt-agent" are configured under their
  // bare key ("eval", "opt"), matching resolveVendor's lookup.
  const bareAgentId = agentId.replace(/-agent$/i, "");
  const typedAgentId = (normalizeAgentId(agentId) ??
    (config.agents?.[bareAgentId as AgentId]
      ? bareAgentId
      : agentId)) as AgentId;
  const presetSpec =
    preset.agent_defaults[typedAgentId] ?? preset.agent_defaults.orchestrator;
  const override = config.agents?.[typedAgentId];

  if (modelPreset === "auto" && !override) {
    return withAgentDefaults(
      { cli: resolveAutoVendor(config.default_cli, vendorOverride, env) },
      config,
    );
  }

  const spec = override ? { ...presetSpec, ...override } : presetSpec;
  if (!spec || (!presetSpec && modelPreset !== "auto")) {
    throw new ConfigError(
      `Preset "${resolvedKey}" has no agent_defaults for "${agentId}" and no orchestrator fallback. ` +
        `Custom presets without 'extends' must define every canonical agent role.`,
    );
  }

  if (override && JSON.stringify(override) === JSON.stringify(presetSpec)) {
    console.debug(
      `[resolve-agent-plan] ${agentId}: override is identical to preset entry (no-op).`,
    );
  }

  // Step 2b: a `<provider>/<model-id>` slug routes this role through that
  // `providers.<name>` endpoint; the model id is passed to the CLI as-is.
  const slashIdx = spec.model.indexOf("/");
  const owner = slashIdx === -1 ? undefined : spec.model.slice(0, slashIdx);
  if (isLlmProviderName(owner, config)) {
    return providerPlan(
      owner,
      spec.model.slice(slashIdx + 1),
      { effort: spec.effort, thinking: spec.thinking, memory: spec.memory },
      false,
      config,
      vendorOverride,
      env,
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
    vendorOverride ?? env.OMA_RUNTIME_VENDOR?.trim().toLowerCase();

  let cli: RuntimeId = modelSpec.cli;
  // pi-specific cli_model override: pi addresses models by their `provider/id`
  // slug (the registry key), not the native CLI's bare `cli_model` form.
  let piCliModel: string | undefined;
  if (effectiveOverride === "pi") {
    // pi is a universal multi-provider proxy: it can dispatch any real-provider
    // model regardless of which native CLI owns it, so bypass the
    // native_dispatch_from gate. toPiModel throws ConfigError for
    // CLI-proprietary owners that pi cannot run.
    cli = "pi";
    piCliModel = toPiModel(spec.model);
  } else if (effectiveOverride) {
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
  // Drop cli-session effort only for the native CLI (e.g. Claude Code, which
  // has no CLI effort flag). When dispatching via pi, effort is preserved and
  // translated to pi's `--thinking` level by plan-args, so keep it.
  if (
    cli !== "pi" &&
    modelSpec.supports.effort?.type === "cli-session" &&
    finalEffort !== undefined
  ) {
    console.warn(
      `[resolve-agent-plan] effort field is ignored for Claude CLI (cli-session model). Remove 'effort' from agents.${agentId} in .agents/oma-config.yaml (or .agents/oma-config.cue).`,
    );
    finalEffort = undefined;
  }

  const plan: AgentPlan = {
    cli,
    cliModel: piCliModel ?? modelSpec.cli_model,
    spec: modelSpec,
  };

  if (finalEffort !== undefined) plan.effort = finalEffort;
  if (spec.thinking !== undefined) plan.thinking = spec.thinking;
  withAgentDefaults(plan, config);
  // A cli-session model (Claude Code) has no effort flag: a default is dropped
  // silently here, since the role never asked for one.
  if (
    cli !== "pi" &&
    modelSpec.supports.effort?.type === "cli-session" &&
    spec.effort === undefined
  )
    delete plan.effort;
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
  env: NodeJS.ProcessEnv = process.env,
): AgentPlan {
  const cwd = process.cwd();
  const config = loadUserConfig(cwd, env);
  return resolveAgentPlanFromConfig(agentId, config, vendorOverride, env);
}
