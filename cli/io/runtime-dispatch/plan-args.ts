import { toPiThinking } from "./pi-model-map.js";
import type { AgentPlan } from "./types.js";

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
 * - qwen:   -m {cliModel}  + optional --thinking / --no-thinking flag
 * - cursor: [] (model flag injected before trailing prompt by injectCursorModelBeforeTrailingPrompt)
 * - antigravity: [] (agy 1.0 has no `--model` or `--thinking-budget` flag — model selection
 *                    is config-driven; effort/thinking are dropped silently)
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
      // agy 1.0 exposes no model or thinking-budget flag — model is config-driven.
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
    case "opencode": {
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
