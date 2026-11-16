import { isOpencodeFamily } from "../constants/opencode-family.js";
import type { VendorConfig } from "../platform/agent-config.js";
import { detectAgyCaps } from "./runtime-dispatch/agy-caps.js";
import { persistCodexEffortToToml } from "./runtime-dispatch/codex-effort.js";
import { ConfigError } from "./runtime-dispatch/config-error.js";
import {
  detectRuntimeVendor,
  resolveAutoVendor,
} from "./runtime-dispatch/detect.js";
import { resolveRestrictionArgs } from "./runtime-dispatch/edit-only.js";
import { applyLlmProvider } from "./runtime-dispatch/free-invocation.js";
import {
  buildExternalInvocation,
  type ExternalInvocationOptions,
} from "./runtime-dispatch/invocations/external.js";
import {
  buildAntigravityNativeInvocation,
  buildClaudeNativeInvocation,
  buildCodexNativeInvocation,
  buildCursorAgentPrintInvocation,
  buildKiroNativeInvocation,
  type NativeInvocationOptions,
} from "./runtime-dispatch/invocations/native.js";
import { buildAgentPlanArgs } from "./runtime-dispatch/plan-args.js";
import { resolveAgentPlan } from "./runtime-dispatch/resolve-plan.js";
import type {
  AgentPlan,
  DispatchMode,
  DispatchPlan,
  Invocation,
} from "./runtime-dispatch/types.js";

export { ConfigError } from "./runtime-dispatch/config-error.js";
export { detectRuntimeVendor } from "./runtime-dispatch/detect.js";
export {
  buildExternalInvocation,
  type ExternalInvocationOptions,
} from "./runtime-dispatch/invocations/external.js";
export type { NativeInvocationOptions } from "./runtime-dispatch/invocations/native.js";
export {
  buildAgentPlanArgs,
  qwenThinkingFlag,
} from "./runtime-dispatch/plan-args.js";
export {
  resolveAgentPlan,
  resolveAgentPlanFromConfig,
} from "./runtime-dispatch/resolve-plan.js";
export type {
  AgentPlan,
  DispatchMode,
  DispatchPlan,
  Invocation,
  RuntimeVendor,
} from "./runtime-dispatch/types.js";

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

/**
 * Inject `{modelFlag} {cliModel}` immediately before the trailing positional
 * prompt argument. Used by vendors whose prompt is a trailing positional
 * (cursor: `--model`; opencode: `-m`), where appending the model flag after the
 * prompt would let a variadic positional swallow it.
 */
function injectModelBeforeTrailingPrompt(
  invocation: Invocation,
  modelFlag: string,
  cliModel: string,
): Invocation {
  const prompt = invocation.args.pop();
  if (prompt === undefined) return invocation;
  invocation.args.push(modelFlag, cliModel);
  invocation.args.push(prompt);
  return invocation;
}

/** Model flag of each dispatch target, used when the vendor config names none. */
const BUILT_IN_MODEL_FLAG: Record<string, string> = {
  antigravity: "--model",
  claude: "--model",
  codex: "-m",
  cursor: "--model",
  grok: "-m",
  kilo: "-m",
  kimi: "-m",
  kiro: "--model",
  opencode: "-m",
  pi: "--model",
  qwen: "-m",
};

/**
 * Vendor config that launches with an explicitly requested model. The value is
 * passed verbatim: the caller names the model the way the target CLI spells it.
 */
function vendorConfigWithModel(
  vendorConfig: VendorConfig,
  targetVendor: string,
  model: string,
): VendorConfig {
  const modelFlag =
    vendorConfig.model_flag ?? BUILT_IN_MODEL_FLAG[targetVendor];
  if (!modelFlag) {
    throw new ConfigError(
      `explicit model for vendor '${targetVendor}': no model flag is known; set vendors.${targetVendor}.model_flag.`,
    );
  }
  // agy 1.0 has no `--model`; its builders drop the flag, which would run the
  // task on a model the caller did not ask for.
  if (targetVendor === "antigravity" && !detectAgyCaps().modelFlag) {
    throw new ConfigError(
      "explicit model for vendor 'antigravity': the installed agy has no --model flag.",
    );
  }
  return { ...vendorConfig, model_flag: modelFlag, default_model: model };
}

function planMatchesTargetVendor(
  plan: AgentPlan | null,
  targetVendor: string,
): plan is AgentPlan {
  return plan?.cli === targetVendor;
}

/** Merge resolved AgentPlan flags into subprocess args (vendor-aware). */
function applyResolvedPlan(
  invocation: Invocation,
  plan: AgentPlan | null,
  targetVendor: string,
): Invocation {
  if (!plan?.cliModel) return invocation;
  if (targetVendor === "cursor") {
    return injectModelBeforeTrailingPrompt(
      invocation,
      "--model",
      plan.cliModel,
    );
  }
  if (isOpencodeFamily(targetVendor)) {
    // The opencode family's prompt is a trailing positional and `-m` is its
    // model flag.
    return injectModelBeforeTrailingPrompt(invocation, "-m", plan.cliModel);
  }
  return applyPlanArgs(invocation, plan);
}

/** A vendor's native-invocation builder; all share one signature. */
type NativeInvocationBuilder = (
  agentId: string,
  promptContent: string,
  vendorConfig: VendorConfig,
  options: NativeInvocationOptions,
) => Invocation;

/**
 * Same-vendor native dispatch table: when runtimeVendor === targetVendor and the
 * vendor appears here, dispatch natively using its builder and reason. Vendors
 * absent from this table (pi, unknown, …) fall through to external dispatch.
 * qwen is intentionally excluded — it is forced external before this lookup.
 */
const NATIVE_DISPATCH: Record<
  string,
  { build: NativeInvocationBuilder; reason: string }
> = {
  antigravity: {
    build: buildAntigravityNativeInvocation,
    reason: "same-vendor Antigravity (agy) runtime detected",
  },
  claude: {
    build: buildClaudeNativeInvocation,
    reason: "same-vendor Claude runtime detected",
  },
  codex: {
    build: buildCodexNativeInvocation,
    reason: "same-vendor Codex runtime detected",
  },
  cursor: {
    build: buildCursorAgentPrintInvocation,
    reason: "same-vendor Cursor agent CLI (--print)",
  },
  kiro: {
    build: buildKiroNativeInvocation,
    reason: "same-vendor Kiro CLI (--no-interactive)",
  },
};

/**
 * Resolve the per-agent plan from oma-config and the built-in presets. Returns
 * null on ConfigError (missing config) so existing installs without
 * oma-config.yaml keep the legacy VendorConfig path.
 */
function resolveConfiguredPlan(
  agentId: string,
  targetVendor: string,
  runtimeVendor: string,
  env: NodeJS.ProcessEnv,
): AgentPlan | null {
  try {
    // Thread the pi override into plan resolution only when pi is the target (or
    // runtime), so pi resolves `plan.cli = "pi"` with a per-agent provider model.
    // All other vendors keep the prior behavior (no override → OMA_RUNTIME_VENDOR
    // env fallback inside resolveAgentPlan), avoiding any regression.
    const planOverride =
      targetVendor === "pi" || runtimeVendor === "pi" ? "pi" : undefined;
    let plan = resolveAgentPlan(agentId, planOverride, env);
    if (plan.provider) {
      // A provider route follows the dispatch target (codex / claude / qwen by
      // transport), not the pi/runtime override used for registry models.
      plan = resolveAgentPlan(agentId, targetVendor, env);
    }
    // An inherited plan follows the already resolved dispatch target, including
    // an explicit --vendor choice. It never injects an OMA default model.
    if (!plan.cliModel)
      plan = { ...plan, cli: resolveAutoVendor(undefined, targetVendor, env) };
    return plan;
  } catch (err) {
    if (err instanceof ConfigError) {
      console.warn(
        `[runtime-dispatch] ${agentId}: ${err.message} — falling back to vendor config defaults`,
      );
      return null;
    }
    throw err;
  }
}

export interface PlanDispatchOptions {
  /** Requires a built-in restriction or an explicit read_only_flag.
   * Suppresses auto_approve_flag; rejects missing or conflicting restrictions
   * before launching the vendor CLI. */
  readOnly?: boolean;
  /** Approves file edits and nothing else. Requires a built-in edit-only mode
   * or an explicit edit_only_flag; mutually exclusive with readOnly. */
  editOnly?: boolean;
  /** Launch with this model, spelled as the target CLI expects it. Replaces the
   * configured per-agent plan, so its effort and provider route do not apply. */
  model?: string;
  /** Absolute workspace path the spawned agent must be able to write.
   * Threaded to native and external builders for vendors that confine writes
   * to a trusted root (antigravity/agy → `--add-dir`; codex sandbox roots). */
  workspace?: string;
}

export function planDispatch(
  agentId: string,
  targetVendor: string,
  vendorConfig: VendorConfig,
  promptFlag: string | null,
  promptContent: string,
  env: NodeJS.ProcessEnv = process.env,
  options: PlanDispatchOptions = {},
): DispatchPlan {
  const { readOnly = false, editOnly = false, workspace } = options;
  const model = options.model?.trim();
  if (options.model !== undefined && !model) {
    throw new ConfigError("explicit model must not be empty.");
  }
  // Keep required restrictions outside the legacy config-fallback catch and
  // before model-plan persistence or vendor capability probes.
  resolveRestrictionArgs(targetVendor, vendorConfig, { readOnly, editOnly });
  const explicitModelConfig = model
    ? vendorConfigWithModel(vendorConfig, targetVendor, model)
    : null;
  const invOptions: NativeInvocationOptions & ExternalInvocationOptions = {
    readOnly,
    editOnly,
    workspace,
  };

  const runtimeVendor = detectRuntimeVendor(env);

  // An explicit model replaces the configured plan for this launch.
  let plan: AgentPlan | null = null;
  if (!explicitModelConfig) {
    plan = resolveConfiguredPlan(agentId, targetVendor, runtimeVendor, env);
  }

  const activePlan = planMatchesTargetVendor(plan, targetVendor) ? plan : null;
  if (plan && !activePlan) {
    console.warn(
      `[runtime-dispatch] ${agentId}: resolved model targets ${plan.cli}, but dispatch target is ${targetVendor}; using ${targetVendor} vendor defaults.`,
    );
  }

  // When a plan is resolved, strip default_model from vendorConfig so the
  // existing native/external builders do not emit a duplicate model flag.
  // buildAgentPlanArgs(plan) appended below provides the correct model flag.
  const effectiveVendorConfig =
    explicitModelConfig ??
    (activePlan ? vendorConfigWithoutModel(vendorConfig) : vendorConfig);

  if (activePlan?.cli === "codex" && activePlan.effort !== undefined) {
    persistCodexEffortToToml(process.cwd(), activePlan.effort);
  }

  // Shared tail for every dispatch path: apply the resolved per-agent plan flags
  // (vendor-aware) and assemble the DispatchPlan result.
  const finalize = (
    mode: DispatchMode,
    reason: string,
    inv: Invocation,
  ): DispatchPlan => {
    if (activePlan) applyResolvedPlan(inv, activePlan, targetVendor);
    if (activePlan?.provider) {
      applyLlmProvider({
        invocation: inv,
        vendor: targetVendor,
        provider: activePlan.provider,
        env,
        workspace,
        fromPreset: activePlan.providerFromPreset === true,
      });
    }
    return { mode, runtimeVendor, targetVendor, reason, invocation: inv };
  };

  // External subprocess dispatch. The opencode family resolves the per-agent
  // persona from the generated `<host dir>/agents/<id>.md` via `--agent <id>`;
  // other external vendors keep the historical plain-prompt form (agentId stays
  // undefined → no regression).
  const dispatchExternal = (reason: string): DispatchPlan => {
    const externalAgentId = isOpencodeFamily(targetVendor)
      ? agentId
      : undefined;
    const inv = buildExternalInvocation(
      targetVendor,
      effectiveVendorConfig,
      promptFlag,
      promptContent,
      externalAgentId,
      invOptions,
    );
    return finalize("external", reason, inv);
  };

  // Qwen has no native parallel subagent dispatch → force external
  if (runtimeVendor === "qwen") {
    console.warn(
      `[runtime-dispatch] ${runtimeVendor} runtime: all agents dispatched as external subprocess`,
    );
    return dispatchExternal(
      `${runtimeVendor} runtime has no native parallel dispatch`,
    );
  }

  // Same-vendor native dispatch: one table lookup replaces a per-vendor if-chain.
  const native =
    runtimeVendor === targetVendor ? NATIVE_DISPATCH[targetVendor] : undefined;
  if (native) {
    const inv = native.build(
      agentId,
      promptContent,
      effectiveVendorConfig,
      invOptions,
    );
    return finalize("native", native.reason, inv);
  }

  return dispatchExternal(
    runtimeVendor === "unknown"
      ? "runtime vendor not detected"
      : "cross-vendor or unsupported native path",
  );
}
