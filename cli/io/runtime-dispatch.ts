import type { VendorConfig } from "../platform/agent-config.js";
import { persistCodexEffortToToml } from "./runtime-dispatch/codex-effort.js";
import { ConfigError } from "./runtime-dispatch/config-error.js";
import { detectRuntimeVendor } from "./runtime-dispatch/detect.js";
import {
  buildExternalInvocation,
  type ExternalInvocationOptions,
} from "./runtime-dispatch/invocations/external.js";
import {
  buildAntigravityNativeInvocation,
  buildClaudeNativeInvocation,
  buildCodexNativeInvocation,
  buildCursorAgentPrintInvocation,
  buildGeminiNativeInvocation,
  buildKiroNativeInvocation,
  type NativeInvocationOptions,
} from "./runtime-dispatch/invocations/native.js";
import { buildAgentPlanArgs } from "./runtime-dispatch/plan-args.js";
import { resolveAgentPlan } from "./runtime-dispatch/resolve-plan.js";
import type {
  AgentPlan,
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
  geminiThinkingBudgetFlag,
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
  if (!plan) return invocation;
  if (targetVendor === "cursor") {
    return injectModelBeforeTrailingPrompt(
      invocation,
      "--model",
      plan.cliModel,
    );
  }
  if (targetVendor === "opencode") {
    // opencode's prompt is a trailing positional and `-m` is its model flag.
    return injectModelBeforeTrailingPrompt(invocation, "-m", plan.cliModel);
  }
  return applyPlanArgs(invocation, plan);
}

export interface PlanDispatchOptions {
  /** When true, constrains the spawned agent to non-destructive tools.
   * Suppresses auto_approve_flag and appends the vendor's read_only_flag.
   * Emits console.warn when the vendor has no read_only_flag defined. */
  readOnly?: boolean;
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
  const { readOnly = false } = options;
  const invOptions: NativeInvocationOptions & ExternalInvocationOptions = {
    readOnly,
  };

  const runtimeVendor = detectRuntimeVendor(env);

  // Resolve per-agent plan from oma-config.yaml + defaults.yaml.
  // Falls back to legacy VendorConfig path on ConfigError (missing config) so
  // existing installs without oma-config.yaml continue to work unchanged.
  let plan: AgentPlan | null = null;
  try {
    // Thread the pi override into plan resolution only when pi is the target (or
    // runtime), so pi resolves `plan.cli = "pi"` with a per-agent provider model.
    // All other vendors keep the prior behavior (no override → OMA_RUNTIME_VENDOR
    // env fallback inside resolveAgentPlan), avoiding any regression.
    const planOverride =
      targetVendor === "pi" || runtimeVendor === "pi" ? "pi" : undefined;
    plan = resolveAgentPlan(agentId, planOverride);
  } catch (err) {
    if (err instanceof ConfigError) {
      console.warn(
        `[runtime-dispatch] ${agentId}: ${err.message} — falling back to vendor config defaults`,
      );
    } else {
      throw err;
    }
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
  const effectiveVendorConfig = activePlan
    ? vendorConfigWithoutModel(vendorConfig)
    : vendorConfig;

  if (activePlan?.cli === "codex" && activePlan.effort !== undefined) {
    persistCodexEffortToToml(process.cwd(), activePlan.effort);
  }

  // Qwen has no native parallel subagent dispatch → force external
  if (runtimeVendor === "qwen") {
    console.warn(
      `[runtime-dispatch] ${runtimeVendor} runtime: all agents dispatched as external subprocess`,
    );
    const inv = buildExternalInvocation(
      targetVendor,
      effectiveVendorConfig,
      promptFlag,
      promptContent,
      targetVendor === "opencode" ? agentId : undefined,
      invOptions,
    );
    if (activePlan) applyResolvedPlan(inv, activePlan, targetVendor);
    return {
      mode: "external",
      runtimeVendor,
      targetVendor,
      reason: `${runtimeVendor} runtime has no native parallel dispatch`,
      invocation: inv,
    };
  }

  if (runtimeVendor === "antigravity" && targetVendor === "antigravity") {
    const inv = buildAntigravityNativeInvocation(
      agentId,
      promptContent,
      effectiveVendorConfig,
      invOptions,
    );
    if (activePlan) applyResolvedPlan(inv, activePlan, targetVendor);
    return {
      mode: "native",
      runtimeVendor,
      targetVendor,
      reason: "same-vendor Antigravity (agy) runtime detected",
      invocation: inv,
    };
  }

  if (runtimeVendor === "claude" && targetVendor === "claude") {
    const inv = buildClaudeNativeInvocation(
      agentId,
      promptContent,
      effectiveVendorConfig,
      invOptions,
    );
    if (activePlan) applyResolvedPlan(inv, activePlan, targetVendor);
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
      invOptions,
    );
    if (activePlan) applyResolvedPlan(inv, activePlan, targetVendor);
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
      invOptions,
    );
    if (activePlan) applyResolvedPlan(inv, activePlan, targetVendor);
    return {
      mode: "native",
      runtimeVendor,
      targetVendor,
      reason: "same-vendor Gemini runtime detected",
      invocation: inv,
    };
  }

  if (runtimeVendor === "cursor" && targetVendor === "cursor") {
    const inv = buildCursorAgentPrintInvocation(
      agentId,
      promptContent,
      effectiveVendorConfig,
      invOptions,
    );
    if (activePlan) applyResolvedPlan(inv, activePlan, targetVendor);
    return {
      mode: "native",
      runtimeVendor,
      targetVendor,
      reason: "same-vendor Cursor agent CLI (--print)",
      invocation: inv,
    };
  }

  if (runtimeVendor === "kiro" && targetVendor === "kiro") {
    const inv = buildKiroNativeInvocation(
      agentId,
      promptContent,
      effectiveVendorConfig,
      invOptions,
    );
    if (activePlan) applyResolvedPlan(inv, activePlan, targetVendor);
    return {
      mode: "native",
      runtimeVendor,
      targetVendor,
      reason: "same-vendor Kiro CLI (--no-interactive)",
      invocation: inv,
    };
  }

  // opencode resolves the per-agent persona from the generated
  // `.opencode/agents/<id>.md` via `--agent <id>`; other external vendors keep
  // the historical plain-prompt form (agentId stays undefined → no regression).
  const externalAgentId = targetVendor === "opencode" ? agentId : undefined;
  const inv = buildExternalInvocation(
    targetVendor,
    effectiveVendorConfig,
    promptFlag,
    promptContent,
    externalAgentId,
    invOptions,
  );
  if (activePlan) applyResolvedPlan(inv, activePlan, targetVendor);
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
