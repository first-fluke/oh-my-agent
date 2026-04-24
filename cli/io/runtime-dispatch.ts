import fs from "node:fs";
import path from "node:path";
import { parse as parseYaml } from "yaml";
import {
  type AgentSpec,
  splitArgs,
  type VendorConfig,
} from "../platform/agent-config.js";
import {
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
  // Resolve per-agent plan from user-preferences + defaults (T10 integration).
  // Falls back to legacy VendorConfig path on ConfigError (missing config) so
  // existing installs without user-preferences.yaml continue to work unchanged.
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
// Internal config loaders — file I/O isolated here so resolveAgentPlan is pure
// ---------------------------------------------------------------------------

type RawAgentDefault = {
  model?: string;
  effort?: string;
  thinking?: boolean;
  memory?: string;
};

type RuntimeProfile = {
  description?: string;
  agent_defaults?: Record<string, RawAgentDefault>;
};

type DefaultsConfig = {
  agent_defaults?: Record<string, RawAgentDefault>;
  runtime_profiles?: Record<string, RuntimeProfile>;
};

/**
 * Map a legacy vendor name ("claude", "codex", "gemini", "qwen", "antigravity")
 * to the corresponding runtime_profiles key in defaults.yaml.
 * Returns null if the vendor name is not recognized.
 */
function legacyVendorToProfileKey(vendor: string): string | null {
  const normalized = vendor.trim().toLowerCase();
  switch (normalized) {
    case "claude":
      return "claude-only";
    case "codex":
      return "codex-only";
    case "gemini":
      return "gemini-only";
    case "qwen":
      return "qwen-only";
    case "antigravity":
      return "antigravity";
    default:
      return null;
  }
}

type UserPreferencesRaw = {
  agent_cli_mapping?: Record<string, string | RawAgentDefault>;
};

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

function loadDefaultsConfig(cwd: string): DefaultsConfig {
  const filePath = findFileUp(
    cwd,
    path.join(".agents", "config", "defaults.yaml"),
  );
  if (!filePath) return {};
  try {
    const content = fs.readFileSync(filePath, "utf-8");
    const parsed = parseYaml(content);
    if (
      parsed &&
      typeof parsed === "object" &&
      !Array.isArray(parsed) &&
      "agent_defaults" in parsed
    ) {
      return parsed as DefaultsConfig;
    }
    return {};
  } catch {
    return {};
  }
}

function readYamlObject(filePath: string): UserPreferencesRaw | null {
  try {
    const content = fs.readFileSync(filePath, "utf-8");
    const parsed = parseYaml(content);
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      return parsed as UserPreferencesRaw;
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Load and merge user preferences from both canonical and legacy locations.
 *
 * Precedence (later wins on conflict, matching cli/platform/agent-config.ts
 * readUserPreferences semantics):
 *   1. .agents/config/user-preferences.yaml   — legacy path, loaded first
 *   2. .agents/oma-config.yaml                — canonical path, overrides
 *
 * Historical note: user-preferences.yaml was moved to oma-config.yaml in
 * commit c702a4b. Both are still read for backward compatibility with
 * installs that have not yet migrated. New users should put their
 * agent_cli_mapping / session.quota_cap etc. in oma-config.yaml.
 */
function loadUserPreferencesRaw(cwd: string): UserPreferencesRaw {
  const legacyPath = findFileUp(
    cwd,
    path.join(".agents", "config", "user-preferences.yaml"),
  );
  const canonicalPath = findFileUp(
    cwd,
    path.join(".agents", "oma-config.yaml"),
  );

  let merged: UserPreferencesRaw = {};
  for (const filePath of [legacyPath, canonicalPath]) {
    if (!filePath) continue;
    const parsed = readYamlObject(filePath);
    if (!parsed) continue;
    merged = {
      ...merged,
      ...parsed,
      agent_cli_mapping: {
        ...(merged.agent_cli_mapping ?? {}),
        ...(parsed.agent_cli_mapping ?? {}),
      },
    };
  }
  return merged;
}

// ---------------------------------------------------------------------------
// resolveAgentPlan — pure after config injection; exported overloads handle cwd
// ---------------------------------------------------------------------------

type ResolvedConfig = {
  userPrefs: UserPreferencesRaw;
  defaults: DefaultsConfig;
};

/**
 * Pure implementation — separated from file I/O so tests can inject config.
 * Not exported; public surface is resolveAgentPlan.
 */
export function resolveAgentPlanFromConfig(
  agentId: string,
  { userPrefs, defaults }: ResolvedConfig,
  vendorOverride?: string,
): AgentPlan {
  const mapping = userPrefs.agent_cli_mapping ?? {};
  const rawUserEntry = mapping[agentId];

  // Step 1: Resolve AgentSpec from user-preferences or defaults.
  let modelSlug: string | undefined;
  let effort: EffortLevel | undefined;
  let thinking: boolean | undefined;
  let memory: "user" | "project" | "local" | undefined;

  if (rawUserEntry !== undefined) {
    if (typeof rawUserEntry === "string") {
      // Legacy string format: vendor name = "use this vendor for this agent".
      // Resolve via defaults.runtime_profiles.{vendor}-only.agent_defaults[agentId]
      // so the user's vendor intent is honored. Falls through to top-level
      // agent_defaults only when the vendor profile doesn't define the role.
      const profileKey = legacyVendorToProfileKey(rawUserEntry);
      const vendorProfileDefault = profileKey
        ? defaults.runtime_profiles?.[profileKey]?.agent_defaults?.[agentId]
        : undefined;
      if (profileKey && !vendorProfileDefault) {
        console.warn(
          `[resolve-agent-plan] ${agentId} agent: legacy override '${rawUserEntry}' but runtime_profiles.${profileKey}.agent_defaults.${agentId} is missing — falling back to top-level agent_defaults.`,
        );
      } else if (!profileKey) {
        console.warn(
          `[resolve-agent-plan] ${agentId} agent: legacy vendor '${rawUserEntry}' is not a known runtime — falling back to top-level agent_defaults.`,
        );
      }
      const agentDefault =
        vendorProfileDefault ??
        defaults.agent_defaults?.[agentId] ??
        defaults.agent_defaults?.orchestrator;
      modelSlug = agentDefault?.model;
      effort = agentDefault?.effort as EffortLevel | undefined;
      thinking = agentDefault?.thinking;
      memory = agentDefault?.memory as "user" | "project" | "local" | undefined;
    } else {
      // AgentSpec object format
      const spec = rawUserEntry as AgentSpec;
      modelSlug = spec.model;
      effort = spec.effort as EffortLevel | undefined;
      thinking = spec.thinking;
      memory = spec.memory as "user" | "project" | "local" | undefined;
    }
  } else {
    // Step 2: Fall back to defaults.yaml for this agentId, then orchestrator
    const agentDefault =
      defaults.agent_defaults?.[agentId] ??
      defaults.agent_defaults?.orchestrator;
    modelSlug = agentDefault?.model;
    effort = agentDefault?.effort as EffortLevel | undefined;
    thinking = agentDefault?.thinking;
    memory = agentDefault?.memory as "user" | "project" | "local" | undefined;
  }

  if (!modelSlug) {
    throw new ConfigError(
      `No model configured for agent '${agentId}' and no orchestrator fallback found in defaults.yaml.`,
    );
  }

  // Step 3: Registry lookup
  const spec = getModelSpec(modelSlug);
  if (!spec) {
    throw new ConfigError(
      `Unknown model slug '${modelSlug}'. Add it to .agents/config/models.yaml or use a Registry slug.`,
    );
  }

  // Defensive: api_only should be filtered by T1, but guard here as well (R13)
  if (spec.supports.api_only) {
    throw new ConfigError(
      `Model '${modelSlug}' has api_only: true. CLI dispatch is not supported. Use a supported model.`,
    );
  }

  // Step 4: vendorOverride — fall back to env var if not provided
  const effectiveOverride =
    vendorOverride ?? process.env.OMA_RUNTIME_VENDOR?.trim().toLowerCase();

  let cli: RuntimeId = spec.cli;
  if (effectiveOverride) {
    if (
      spec.supports.native_dispatch_from.includes(
        effectiveOverride as RuntimeId,
      )
    ) {
      cli = effectiveOverride as RuntimeId;
    } else {
      console.warn(
        `[resolve-agent-plan] ${agentId} agent: "${effectiveOverride}" is not in native_dispatch_from [${spec.supports.native_dispatch_from.join(", ")}]. Falling back to external subprocess.`,
      );
    }
  }

  // Step 5: Feature filter — drop effort for cli-session (Claude) models (R14)
  let finalEffort: EffortLevel | undefined = effort;
  if (spec.supports.effort?.type === "cli-session" && effort !== undefined) {
    console.warn(
      `[resolve-agent-plan] effort field is ignored for Claude CLI (cli-session model). Remove 'effort' from .agents/oma-config.yaml for '${agentId}'.`,
    );
    finalEffort = undefined;
  }

  // Step 6: Build and return AgentPlan
  const plan: AgentPlan = {
    cli,
    cliModel: spec.cli_model,
    spec,
  };

  if (finalEffort !== undefined) plan.effort = finalEffort;
  if (thinking !== undefined) plan.thinking = thinking;
  if (memory !== undefined) plan.memory = memory;

  return plan;
}

/**
 * Resolve the per-agent dispatch plan from user config, defaulting to cwd.
 *
 * Flow:
 * 1. Check agent_cli_mapping[agentId] from merged user config
 *    (oma-config.yaml canonical, user-preferences.yaml legacy fallback).
 *    - string (legacy) → vendor name only; model/effort from defaults.yaml,
 *      or from runtime_profiles.{vendor}-only.agent_defaults[agentId] when set
 *    - AgentSpec object → use its fields directly
 * 2. Fall back to defaults.yaml agent_defaults[agentId], then agent_defaults.orchestrator
 * 3. Registry lookup via getModelSpec — throws ConfigError if unknown slug (R13)
 * 4. Throws ConfigError if api_only:true (R13 defensive)
 * 5. Apply vendorOverride: check native_dispatch_from; WARN + fallback if not supported
 * 6. Drop effort for cli-session (Claude) models + WARN (R14)
 */
export function resolveAgentPlan(
  agentId: string,
  vendorOverride?: string,
): AgentPlan {
  const cwd = process.cwd();
  const userPrefs = loadUserPreferencesRaw(cwd);
  const defaults = loadDefaultsConfig(cwd);
  return resolveAgentPlanFromConfig(
    agentId,
    { userPrefs, defaults },
    vendorOverride,
  );
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
