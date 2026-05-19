import type { VendorConfig } from "../platform/agent-config.js";
import { persistCodexEffortToToml } from "./runtime-dispatch/codex-effort.js";
import { ConfigError } from "./runtime-dispatch/config-error.js";
import { detectRuntimeVendor } from "./runtime-dispatch/detect.js";
import { buildExternalInvocation } from "./runtime-dispatch/invocations/external.js";
import {
  buildClaudeNativeInvocation,
  buildCodexNativeInvocation,
  buildCursorAgentPrintInvocation,
  buildGeminiNativeInvocation,
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
export { buildExternalInvocation } from "./runtime-dispatch/invocations/external.js";
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
 * Inject `--model {cliModel}` immediately before the trailing positional prompt argument.
 */
function injectCursorModelBeforeTrailingPrompt(
  invocation: Invocation,
  cliModel: string,
): Invocation {
  const prompt = invocation.args.pop();
  if (prompt === undefined) return invocation;
  invocation.args.push("--model", cliModel);
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
    return injectCursorModelBeforeTrailingPrompt(invocation, plan.cliModel);
  }
  return applyPlanArgs(invocation, plan);
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

  // Resolve per-agent plan from oma-config.yaml + defaults.yaml.
  // Falls back to legacy VendorConfig path on ConfigError (missing config) so
  // existing installs without oma-config.yaml continue to work unchanged.
  let plan: AgentPlan | null = null;
  try {
    plan = resolveAgentPlan(agentId);
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
    if (activePlan) applyResolvedPlan(inv, activePlan, targetVendor);
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

  const inv = buildExternalInvocation(
    targetVendor,
    effectiveVendorConfig,
    promptFlag,
    promptContent,
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
