import type { EffortLevel } from "../../platform/model-registry/types.js";
import { toPiThinking } from "./pi-model-map.js";
import type { AgentPlan } from "./types.js";

/**
 * Translate AgentPlan.effort to Qwen thinking flag.
 * binary-thinking: --thinking (high/xhigh) or --no-thinking (low/medium/none)
 * thinking:boolean override applied first.
 */
export function qwenThinkingFlag(plan: AgentPlan): string | null {
  const effortSpec = plan.spec?.supports.effort;
  if (effortSpec?.type !== "binary-thinking") return null;

  // Explicit thinking boolean takes priority
  if (plan.thinking === true) return "--thinking";
  if (plan.thinking === false) return "--no-thinking";

  if (!plan.effort) return null;
  if (plan.effort === "high" || plan.effort === "xhigh") return "--thinking";
  return "--no-thinking";
}

/**
 * agy publishes its effort dial as a parenthesised tier on the model name.
 * Each effort lists its tiers in preference order: `xhigh` uses "XHigh" where
 * agy publishes it (Gemini 4 Hydrogen) and collapses onto "High" elsewhere.
 */
const AGY_EFFORT_TIERS: Record<string, ReadonlyArray<[EffortLevel, string]>> = {
  low: [["low", "Low"]],
  medium: [["medium", "Medium"]],
  high: [["high", "High"]],
  xhigh: [
    ["xhigh", "XHigh"],
    ["high", "High"],
  ],
};

/**
 * Resolve the exact `--model` value for an agy invocation.
 *
 * `plan.cliModel` already holds a valid display ID with its default tier
 * (e.g. "Gemini 3.1 Pro (High)"). When the agent pins an effort, swap the tier
 * suffix — but only for a tier agy actually publishes for that model, since an
 * unknown tier is rejected (the ACP driver exits with `unknown model`)
 * instead of falling back. Anything unmapped keeps the registry default.
 */
export function agyModelForEffort(
  plan: AgentPlan & { cliModel: string },
): string {
  const effortSpec = plan.spec?.supports.effort;
  if (!plan.effort || effortSpec?.type !== "granular") return plan.cliModel;

  // Match on the resolved tier, not the raw effort: `xhigh` falls back to
  // "High" on a model that publishes no "XHigh" tier.
  const tier = AGY_EFFORT_TIERS[plan.effort]?.find(([level]) =>
    effortSpec.levels.includes(level),
  )?.[1];
  if (!tier) return plan.cliModel;
  const base = plan.cliModel.match(/^(.*?)\s*\([^()]*\)$/)?.[1];
  if (!base) return plan.cliModel;
  return `${base} (${tier})`;
}

/**
 * Build the CLI args fragment for invoking an agent with its AgentPlan.
 * Returns args to splice into a subprocess invocation after the subcommand.
 *
 * Vendor translation:
 * - codex:  -m {cliModel}  (effort → project TOML, not CLI args)
 * - claude: --model {cliModel}
 * - qwen:   -m {cliModel}  + optional --thinking / --no-thinking flag
 * - cursor: [] (model flag injected before trailing prompt by injectCursorModelBeforeTrailingPrompt)
 * - antigravity: --model {display ID}; the ACP driver maps it to the session
 *                model id. Effort rides on the model's parenthesised tier —
 *                see agyModelForEffort.
 */
export function buildAgentPlanArgs(plan: AgentPlan): string[] {
  if (!plan.cliModel) return [];
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
    case "qwen": {
      args.push("-m", plan.cliModel);
      const thinkingFlag = qwenThinkingFlag(plan);
      if (thinkingFlag) args.push(thinkingFlag);
      break;
    }
    case "cursor": {
      // Model flag is injected before the trailing prompt positional argument
      // by injectCursorModelBeforeTrailingPrompt in runtime-dispatch.ts.
      // buildAgentPlanArgs must return [] here to avoid duplicating --model.
      break;
    }
    case "antigravity": {
      args.push(
        "--model",
        agyModelForEffort({ ...plan, cliModel: plan.cliModel }),
      );
      break;
    }
    case "pi": {
      // pi addresses models by their provider/id slug (cliModel already holds
      // the pi form, set in resolve-plan via toPiModel). Effort is translated to
      // pi's `--thinking` level. pi tolerates options after the positional
      // prompt, so these append cleanly via applyResolvedPlan.
      args.push("--model", plan.cliModel);
      const thinkingLevel = toPiThinking(plan);
      if (thinkingLevel) args.push("--thinking", thinkingLevel);
      break;
    }
    case "opencode":
    case "kilo": {
      // Model flag (`-m`) is injected before the trailing prompt positional by
      // injectModelBeforeTrailingPrompt in runtime-dispatch.ts (opencode's
      // prompt is a variadic positional; `-m` appended after it would be
      // swallowed). Return [] here to avoid duplicating the model flag.
      break;
    }
    default: {
      // Unknown vendor — no args added
      break;
    }
  }

  return args;
}
