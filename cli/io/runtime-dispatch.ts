import fs from "node:fs";
import path from "node:path";
import { parse as parseYaml } from "yaml";
import {
  type AgentId,
  type AgentSpec,
  type BuiltInPresetKey,
  type ModelPreset,
  normalizeAgentId,
  type OmaConfig,
  splitArgs,
  type VendorConfig,
} from "../platform/agent-config.js";
import {
  BUILT_IN_PRESET_ALIASES,
  BUILT_IN_PRESETS,
} from "../platform/built-in-presets.js";
import {
  buildUnknownSlugError,
  type EffortLevel,
  getModelSpec,
  type ModelSpec,
  type RuntimeId,
} from "../platform/model-registry.js";
import {
  parseCodexConfig,
  serializeCodexConfig,
  setCodexReasoningEffort,
} from "../vendors/codex/settings.js";

export type RuntimeVendor =
  | "claude"
  | "codex"
  | "gemini"
  | "antigravity"
  | "qwen"
  | "unknown";

export type DispatchMode = "native" | "external";

export type Invocation = {
  command: string;
  args: string[];
  env: NodeJS.ProcessEnv;
};

export type DispatchPlan = {
  mode: DispatchMode;
  runtimeVendor: RuntimeVendor;
  targetVendor: string;
  reason: string;
  invocation: Invocation;
};

const SUPPORTED_RUNTIME_VENDORS = new Set<RuntimeVendor>([
  "claude",
  "codex",
  "gemini",
  "antigravity",
  "qwen",
]);

export function detectRuntimeVendor(
  env: NodeJS.ProcessEnv = process.env,
): RuntimeVendor {
  const explicit = env.OMA_RUNTIME_VENDOR?.trim().toLowerCase();
  if (explicit && SUPPORTED_RUNTIME_VENDORS.has(explicit as RuntimeVendor)) {
    return explicit as RuntimeVendor;
  }

  if (Object.keys(env).some((key) => key.startsWith("CLAUDE_CODE_"))) {
    return "claude";
  }
  if (env.CLAUDECODE === "1") {
    return "claude";
  }
  if (env.CODEX_THREAD_ID || env.CODEX_CI) {
    return "codex";
  }
  if (
    Object.keys(env).some((key) => key.startsWith("GEMINI_CLI_")) ||
    env.GEMINI_CLI === "1"
  ) {
    return "gemini";
  }
  if (
    Object.keys(env).some((key) => key.startsWith("ANTIGRAVITY_")) ||
    env.ANTIGRAVITY_IDE === "1"
  ) {
    return "antigravity";
  }
  if (
    Object.keys(env).some((key) => key.startsWith("QWEN_CODE_")) ||
    env.QWEN_CODE === "1"
  ) {
    return "qwen";
  }

  return "unknown";
}

function buildClaudeNativeInvocation(
  agentId: string,
  promptContent: string,
  vendorConfig: VendorConfig,
): Invocation {
  const command = vendorConfig.command || "claude";
  const args = ["--agent", agentId];

  if (vendorConfig.output_format_flag && vendorConfig.output_format) {
    args.push(vendorConfig.output_format_flag, vendorConfig.output_format);
  } else if (vendorConfig.output_format_flag) {
    args.push(vendorConfig.output_format_flag);
  }

  if (vendorConfig.model_flag && vendorConfig.default_model) {
    args.push(vendorConfig.model_flag, vendorConfig.default_model);
  }
  if (vendorConfig.auto_approve_flag) {
    args.push(vendorConfig.auto_approve_flag);
  }

  args.push("-p", promptContent);

  return { command, args, env: { ...process.env } };
}

function buildMentionPrompt(agentId: string, promptContent: string): string {
  return `@${agentId}\n\n${promptContent}`;
}

function buildCodexNativeInvocation(
  agentId: string,
  promptContent: string,
  vendorConfig: VendorConfig,
): Invocation {
  const command = vendorConfig.command || "codex";
  const args: string[] = [];

  if (vendorConfig.subcommand) {
    args.push(vendorConfig.subcommand);
  }
  if (vendorConfig.output_format_flag) {
    args.push(vendorConfig.output_format_flag);
  }
  if (vendorConfig.model_flag && vendorConfig.default_model) {
    args.push(vendorConfig.model_flag, vendorConfig.default_model);
  }
  if (vendorConfig.auto_approve_flag) {
    args.push(vendorConfig.auto_approve_flag);
  }

  args.push(buildMentionPrompt(agentId, promptContent));

  return { command, args, env: { ...process.env } };
}

function buildGeminiNativeInvocation(
  agentId: string,
  promptContent: string,
  vendorConfig: VendorConfig,
): Invocation {
  const command = vendorConfig.command || "gemini";
  const args: string[] = [];

  if (vendorConfig.output_format_flag && vendorConfig.output_format) {
    args.push(vendorConfig.output_format_flag, vendorConfig.output_format);
  } else if (vendorConfig.output_format_flag) {
    args.push(vendorConfig.output_format_flag);
  }
  if (vendorConfig.model_flag && vendorConfig.default_model) {
    args.push(vendorConfig.model_flag, vendorConfig.default_model);
  }
  if (vendorConfig.auto_approve_flag) {
    args.push(vendorConfig.auto_approve_flag);
  }

  args.push("-p", buildMentionPrompt(agentId, promptContent));

  return { command, args, env: { ...process.env } };
}

export function buildExternalInvocation(
  vendor: string,
  vendorConfig: VendorConfig,
  promptFlag: string | null,
  promptContent: string,
): Invocation {
  const command = vendorConfig.command || vendor;
  const args: string[] = [];
  const optionArgs: string[] = [];

  if (vendorConfig.subcommand) {
    args.push(vendorConfig.subcommand);
  }

  if (vendorConfig.output_format_flag && vendorConfig.output_format) {
    optionArgs.push(
      vendorConfig.output_format_flag,
      vendorConfig.output_format,
    );
  } else if (vendorConfig.output_format_flag) {
    optionArgs.push(vendorConfig.output_format_flag);
  }

  if (vendorConfig.model_flag && vendorConfig.default_model) {
    optionArgs.push(vendorConfig.model_flag, vendorConfig.default_model);
  }

  if (vendorConfig.isolation_flags) {
    optionArgs.push(...splitArgs(vendorConfig.isolation_flags));
  }

  if (vendorConfig.auto_approve_flag) {
    optionArgs.push(vendorConfig.auto_approve_flag);
  } else {
    const defaultAutoApprove: Record<string, string> = {
      gemini: "--approval-mode=yolo",
      codex: "--full-auto",
      qwen: "--yolo",
    };
    const fallbackFlag = defaultAutoApprove[vendor];
    if (fallbackFlag) {
      optionArgs.push(fallbackFlag);
    }
  }

  if (promptFlag) {
    optionArgs.push(promptFlag, promptContent);
  }

  args.push(...optionArgs);
  if (!promptFlag) {
    args.push(promptContent);
  }

  const env = { ...process.env };
  if (vendorConfig.isolation_env) {
    const [key, ...rest] = vendorConfig.isolation_env.split("=");
    const rawValue = rest.join("=");
    if (key && rawValue) {
      env[key] = rawValue.replace("$$", String(process.pid));
    }
  }

  return { command, args, env };
}

// =============================================================================
// ConfigError — thrown by resolveAgentPlan for actionable user-facing errors
// Must be declared before planDispatch (class is not hoisted).
// =============================================================================

export class ConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ConfigError";
  }
}

// =============================================================================
// AgentPlan — per-agent dispatch shape (T10)
// Declared here so planDispatch can reference the type.
// =============================================================================

export type AgentPlan = {
  cli: RuntimeId;
  cliModel: string;
  effort?: EffortLevel;
  thinking?: boolean;
  memory?: "user" | "project" | "local";
  spec: ModelSpec;
};

// =============================================================================
// Codex TOML effort persistence — called by planDispatch before subprocess
// =============================================================================

/**
 * Write plan.effort to the project-local .codex/config.toml.
 * Idempotent: no-op when effort already matches or no effort is set.
 * Silently skips on I/O errors (non-fatal).
 */
function persistCodexEffortToToml(cwd: string, effort: EffortLevel): void {
  const codexConfigPath = path.join(cwd, ".codex", "config.toml");
  try {
    const rawToml = fs.existsSync(codexConfigPath)
      ? fs.readFileSync(codexConfigPath, "utf-8")
      : "";
    const current = parseCodexConfig(rawToml);
    // Idempotent: skip write if effort already matches
    if (current.model_reasoning_effort === effort) return;
    const next = setCodexReasoningEffort(current, effort);
    fs.mkdirSync(path.dirname(codexConfigPath), { recursive: true });
    fs.writeFileSync(codexConfigPath, `${serializeCodexConfig(next)}\n`);
  } catch {
    // Non-fatal: log and continue
    console.warn(
      `[runtime-dispatch] Failed to write .codex/config.toml — effort '${effort}' not persisted`,
    );
  }
}

// =============================================================================
// Plan-aware invocation arg injection
// =============================================================================

/**
 * Build a version of vendorConfig with default_model cleared.
 * Used when plan.cliModel overrides the vendor default — the model flag is
 * then provided by buildAgentPlanArgs(plan) instead, avoiding duplication.
 */
function vendorConfigWithoutModel(vendorConfig: VendorConfig): VendorConfig {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { default_model: _dropped, ...rest } = vendorConfig;
  return rest as VendorConfig;
}

/**
 * Append plan-derived args (model + effort/thinking flags) to an invocation.
 * Mutates and returns the invocation for convenience.
 */
function applyPlanArgs(invocation: Invocation, plan: AgentPlan): Invocation {
  const planArgs = buildAgentPlanArgs(plan);
  invocation.args.push(...planArgs);
  return invocation;
}

export function planDispatch(
  agentId: string,
  targetVendor: string,
  vendorConfig: VendorConfig,
  promptFlag: string | null,
  promptContent: string,
  env: NodeJS.ProcessEnv = process.env,
): DispatchPlan {
  const runtimeVendor = detectRuntimeVendor(env);

  // ---------------------------------------------------------------------------
  // Resolve per-agent plan from oma-config.yaml + defaults.yaml (T10 integration).
  // Falls back to legacy VendorConfig path on ConfigError (missing config) so
  // existing installs without oma-config.yaml continue to work unchanged.
  // ---------------------------------------------------------------------------
  let plan: AgentPlan | null = null;
  try {
    plan = resolveAgentPlan(agentId);
  } catch (err) {
    if (err instanceof ConfigError) {
      console.warn(
        `[runtime-dispatch] ${agentId}: ${err.message} — falling back to vendor config defaults`,
      );
    } else {
      // Unexpected error: re-throw to avoid silent failure
      throw err;
    }
  }

  // When a plan is resolved, strip default_model from vendorConfig so the
  // existing native/external builders do not emit a duplicate model flag.
  // buildAgentPlanArgs(plan) appended below provides the correct model flag.
  const effectiveVendorConfig = plan
    ? vendorConfigWithoutModel(vendorConfig)
    : vendorConfig;

  // Codex TOML: persist plan.effort before the subprocess starts (idempotent).
  if (plan?.cli === "codex" && plan.effort !== undefined) {
    persistCodexEffortToToml(process.cwd(), plan.effort);
  }

  // Runtimes without parallel native subagent support → force external
  if (runtimeVendor === "antigravity" || runtimeVendor === "qwen") {
    console.warn(
      `[runtime-dispatch] ${runtimeVendor} runtime: all agents dispatched as external subprocess`,
    );
    const inv = buildExternalInvocation(
      targetVendor,
      effectiveVendorConfig,
      promptFlag,
      promptContent,
    );
    if (plan) applyPlanArgs(inv, plan);
    return {
      mode: "external",
      runtimeVendor,
      targetVendor,
      reason: `${runtimeVendor} runtime has no native parallel dispatch`,
      invocation: inv,
    };
  }

  if (runtimeVendor === "claude" && targetVendor === "claude") {
    const inv = buildClaudeNativeInvocation(
      agentId,
      promptContent,
      effectiveVendorConfig,
    );
    if (plan) applyPlanArgs(inv, plan);
    return {
      mode: "native",
      runtimeVendor,
      targetVendor,
      reason: "same-vendor Claude runtime detected",
      invocation: inv,
    };
  }

  if (runtimeVendor === "codex" && targetVendor === "codex") {
    const inv = buildCodexNativeInvocation(
      agentId,
      promptContent,
      effectiveVendorConfig,
    );
    if (plan) applyPlanArgs(inv, plan);
    return {
      mode: "native",
      runtimeVendor,
      targetVendor,
      reason: "same-vendor Codex runtime detected",
      invocation: inv,
    };
  }

  if (runtimeVendor === "gemini" && targetVendor === "gemini") {
    const inv = buildGeminiNativeInvocation(
      agentId,
      promptContent,
      effectiveVendorConfig,
    );
    if (plan) applyPlanArgs(inv, plan);
    return {
      mode: "native",
      runtimeVendor,
      targetVendor,
      reason: "same-vendor Gemini runtime detected",
      invocation: inv,
    };
  }

  const inv = buildExternalInvocation(
    targetVendor,
    effectiveVendorConfig,
    promptFlag,
    promptContent,
  );
  if (plan) applyPlanArgs(inv, plan);
  return {
    mode: "external",
    runtimeVendor,
    targetVendor,
    reason:
      runtimeVendor === "unknown"
        ? "runtime vendor not detected"
        : "cross-vendor or unsupported native path",
    invocation: inv,
  };
}

// ---------------------------------------------------------------------------
// Internal config loaders — single file I/O (oma-config.yaml only)
// ---------------------------------------------------------------------------

function findFileUp(startDir: string, relativePath: string): string | null {
  let current = path.resolve(startDir);
  const root = path.parse(current).root;
  while (current !== root) {
    const candidate = path.join(current, relativePath);
    if (fs.existsSync(candidate)) return candidate;
    current = path.dirname(current);
  }
  return null;
}

/**
 * Load user config from the canonical .agents/oma-config.yaml.
 * Returns partial OmaConfig shape — only fields present in the file are set.
 * Migration 003 ensures oma-config.yaml is the only user config file.
 *
 * Throws ConfigError with file:line:col when the file exists but contains
 * invalid YAML, so the user gets an actionable error message.
 */
function loadUserConfig(cwd: string): Partial<OmaConfig> {
  const canonicalPath = findFileUp(
    cwd,
    path.join(".agents", "oma-config.yaml"),
  );
  if (!canonicalPath) return {};
  let content: string;
  try {
    content = fs.readFileSync(canonicalPath, "utf-8");
  } catch {
    return {};
  }
  try {
    const parsed = parseYaml(content);
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      return parsed as Partial<OmaConfig>;
    }
    return {};
  } catch (err) {
    const pos =
      err &&
      typeof err === "object" &&
      "linePos" in err &&
      Array.isArray((err as { linePos: unknown[] }).linePos) &&
      (err as { linePos: Array<{ line: number; col: number }> }).linePos
        .length > 0
        ? (err as { linePos: Array<{ line: number; col: number }> }).linePos[0]
        : null;
    const location = pos
      ? `${canonicalPath}:${pos.line}:${pos.col}`
      : canonicalPath;
    throw new ConfigError(
      `Failed to parse YAML at ${location}: ${err instanceof Error ? err.message : String(err)}`,
    );
  }
}

// ---------------------------------------------------------------------------
// Preset resolution helpers
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// resolveAgentPlan — 4-step resolver per design doc
// ---------------------------------------------------------------------------

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
        `Custom presets without 'extends' must define all 11 agent roles.`,
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

// =============================================================================
// Per-vendor invocation arg builders using AgentPlan (T10)
// =============================================================================

/**
 * Translate AgentPlan.effort to Gemini thinking-budget flag.
 * Gemini's effort.type === "thinking-budget" with modes: ["none", "dynamic", "fixed"]
 * - effort high/xhigh → "--thinking-budget=dynamic" (highest available without fixed)
 * - effort low/medium → "--thinking-budget=none"
 * - thinking:true override → "--thinking-budget=dynamic"
 * - thinking:false override → "--thinking-budget=none"
 */
export function geminiThinkingBudgetFlag(plan: AgentPlan): string | null {
  const effortSpec = plan.spec.supports.effort;
  if (!effortSpec || effortSpec.type !== "thinking-budget") return null;

  // Explicit thinking boolean takes priority over effort level
  if (plan.thinking === true) return "--thinking-budget=dynamic";
  if (plan.thinking === false) return "--thinking-budget=none";

  if (!plan.effort) return null;

  const modes = effortSpec.modes;
  if (plan.effort === "high" || plan.effort === "xhigh") {
    // Use "dynamic" if available, else "fixed", else null
    if (modes.includes("dynamic")) return "--thinking-budget=dynamic";
    if (modes.includes("fixed")) return "--thinking-budget=fixed";
    return null;
  }
  // low / medium / none → disable thinking
  if (modes.includes("none")) return "--thinking-budget=none";
  return null;
}

/**
 * Translate AgentPlan.effort to Qwen thinking flag.
 * binary-thinking: --thinking (high/xhigh) or --no-thinking (low/medium/none)
 * thinking:boolean override applied first.
 */
export function qwenThinkingFlag(plan: AgentPlan): string | null {
  const effortSpec = plan.spec.supports.effort;
  if (!effortSpec || effortSpec.type !== "binary-thinking") return null;

  // Explicit thinking boolean takes priority
  if (plan.thinking === true) return "--thinking";
  if (plan.thinking === false) return "--no-thinking";

  if (!plan.effort) return null;
  if (plan.effort === "high" || plan.effort === "xhigh") return "--thinking";
  return "--no-thinking";
}

/**
 * Build the CLI args fragment for invoking an agent with its AgentPlan.
 * Returns args to splice into a subprocess invocation after the subcommand.
 *
 * Vendor translation:
 * - codex:  -m {cliModel}  (effort → project TOML, not CLI args)
 * - claude: --model {cliModel}
 * - gemini: --model {cliModel}  + optional --thinking-budget flag
 * - qwen:   -m {cliModel}  + optional --thinking / --no-thinking flag
 * - antigravity: [] (external only; no model flag on top-level CLI)
 */
export function buildAgentPlanArgs(plan: AgentPlan): string[] {
  const args: string[] = [];

  switch (plan.cli) {
    case "codex": {
      args.push("-m", plan.cliModel);
      // effort is written to .codex/config.toml by setCodexProjectReasoningEffort
      break;
    }
    case "claude": {
      args.push("--model", plan.cliModel);
      // effort is dropped (cli-session); memory is handled by Claude Code flags elsewhere
      break;
    }
    case "gemini": {
      args.push("--model", plan.cliModel);
      const thinkingFlag = geminiThinkingBudgetFlag(plan);
      if (thinkingFlag) args.push(thinkingFlag);
      break;
    }
    case "qwen": {
      args.push("-m", plan.cliModel);
      const thinkingFlag = qwenThinkingFlag(plan);
      if (thinkingFlag) args.push(thinkingFlag);
      break;
    }
    case "antigravity": {
      // antigravity has no CLI-level model flag in external subprocess mode
      break;
    }
    default: {
      // Unknown vendor — no args added
      break;
    }
  }

  return args;
}
