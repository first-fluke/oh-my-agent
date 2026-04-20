import type { Command } from "commander";
import { runAction } from "../../cli-kit/cli-framework.js";
import { parallelRun } from "./parallel.js";
import { reviewAgent } from "./review.js";
import { checkStatus, spawnAgent } from "./spawn-status.js";

export function registerAgentCommands(program: Command): void {
  program
    .command("agent:spawn <agent-id> <prompt> <session-id>")
    .description("Spawn a subagent (prompt can be inline text or a file path)")
    .option(
      "-m, --model <vendor>",
      "CLI vendor override (gemini/claude/codex/qwen)",
    )
    .option(
      "-w, --workspace <path>",
      "Working directory for the agent (auto-detected if omitted)",
    )
    .action(
      runAction(async (agentId, prompt, sessionId, options) => {
        await spawnAgent(
          agentId,
          prompt,
          sessionId,
          options.workspace || ".",
          options.model,
        );
      }),
    );

  program
    .command("agent:status <session-id> [agent-ids...]")
    .description("Check status of subagents")
    .option("-r, --root <path>", "Root path for memory checks", process.cwd())
    .action(
      runAction(async (sessionId, agentIds, options) => {
        await checkStatus(sessionId, agentIds, options.root);
      }),
    );

  program
    .command("agent:parallel [tasks...]")
    .description("Run multiple sub-agents in parallel")
    .option(
      "-m, --model <vendor>",
      "CLI vendor override (gemini/claude/codex/qwen)",
    )
    .option(
      "-i, --inline",
      "Inline mode: specify tasks as agent:task arguments",
    )
    .option("--no-wait", "Don't wait for completion (background mode)")
    .action(
      runAction(async (tasks, options) => {
        await parallelRun(tasks, {
          vendor: options.model,
          inline: options.inline,
          noWait: !options.wait,
        });
      }),
    );

  program
    .command("agent:review")
    .description("Run code review using external CLI (codex/claude/gemini)")
    .option("-m, --model <vendor>", "CLI vendor (codex/claude/gemini)")
    .option("-p, --prompt <prompt>", "Custom review prompt")
    .option("-w, --workspace <path>", "Working directory (default: current)")
    .option("--no-uncommitted", "Review committed changes only")
    .action(
      runAction(async (options) => {
        await reviewAgent({
          prompt: options.prompt,
          model: options.model,
          workspace: options.workspace,
          uncommitted: options.uncommitted,
        });
      }),
    );
}
