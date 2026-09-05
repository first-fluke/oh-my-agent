import type { Command } from "commander";
import { runAction } from "../../utils/cli-framework.js";
import { showAgentContext } from "./context.js";
import { parallelRun } from "./parallel.js";
import { beginResult, finishResult, verifyResult } from "./results.js";
import { resumeAgents } from "./resume.js";
import { reviewAgent } from "./review.js";
import { checkStatus, spawnAgent } from "./spawn-status.js";

export function registerAgentCommands(program: Command): void {
  program
    .command("agent:context <agent-id>")
    .description("Load graph-selected context for a native dispatch prompt")
    .option("--root <path>", "Project definitions to load")
    .option("--difficulty <level>", "Simple, Medium, or Complex", "Medium")
    .action(runAction(showAgentContext));
  program
    .command("agent:resume <session-id>")
    .description(
      "Resume safe incomplete tasks, reusing current acceptance evidence",
    )
    .option("--root <path>", "Project storing the session")
    .option(
      "--dry-run",
      "Show reuse, retry and blocking decisions without execution",
    )
    .option(
      "--max-attempts <count>",
      "Maximum attempts per task including the original",
      "3",
    )
    .action(runAction(resumeAgents));
  program
    .command("agent:begin <agent-id> <task-id> <session-id>")
    .description("Start an evidence-backed native agent run")
    .option("--root <path>", "Project storing the run")
    .option("-w, --workspace <path>", "Workspace being verified")
    .action(runAction(beginResult));
  program
    .command("agent:verify <run-id> [command...]")
    .description(
      "Execute verification argv after -- and record its real exit code",
    )
    .option("--root <path>", "Project storing the run")
    .option(
      "--required",
      "Execute all checks pinned to the task acceptance criteria",
    )
    .option(
      "--affected <paths...>",
      "Execute graph-selected tests for changed definitions",
    )
    .action(runAction(verifyResult));
  program
    .command("agent:finish <run-id> <result-file>")
    .description(
      "Validate a native agent result against its verification receipts",
    )
    .option("--root <path>", "Project storing the run")
    .action(runAction(finishResult));
  program
    .command("agent:spawn <agent-id> <prompt> <session-id>")
    .description("Spawn a subagent (prompt can be inline text or a file path)")
    .option("--resumed-from <run-id>", "Link a retry to its preceding run")
    .option(
      "--task-id <id>",
      "Task ID from the session plan (default: agent ID)",
    )
    .option(
      "-m, --model <vendor>",
      "CLI vendor override (antigravity/claude/codex/cursor/opencode/qwen/grok/pi)",
    )
    .option(
      "-w, --workspace <path>",
      "Working directory for the agent (auto-detected if omitted)",
    )
    .option(
      "--isolation <mode>",
      "Isolation mode: 'worktree' creates a git worktree per spawn (default: none)",
    )
    .option(
      "--read-only",
      "Restrict the spawned agent to non-destructive tools (suppresses auto-approve flags)",
    )
    .action(
      runAction(async (agentId, prompt, sessionId, options) => {
        await spawnAgent(
          agentId,
          prompt,
          sessionId,
          options.workspace || ".",
          options.model,
          undefined,
          options.isolation,
          options.readOnly,
          options.taskId,
          options.resumedFrom,
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
      "--session <id>",
      "Bind results to an existing session and task IDs from YAML",
    )
    .option(
      "-m, --model <vendor>",
      "CLI vendor override (antigravity/claude/codex/cursor/opencode/qwen/grok/pi)",
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
          session: options.session,
        });
      }),
    );

  program
    .command("agent:review")
    .description("Run code review using external CLI (codex/claude/qwen/grok)")
    .option("-m, --model <vendor>", "CLI vendor (codex/claude/qwen/grok)")
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
