import type { Command } from "commander";
import { runAction } from "../../utils/cli-framework.js";
import { batchRun } from "./batch.js";
import { runQwenBoard } from "./board.js";
import { showAgentContext } from "./context.js";
import { parallelRun, runParallelSupervisor } from "./parallel.js";
import { beginResult, finishResult, verifyResult } from "./results.js";
import { resumeAgents } from "./resume.js";
import { reviewAgent } from "./review.js";
import { checkStatus, spawnAgent } from "./spawn-status.js";

export function registerAgentCommands(program: Command): void {
  program
    .command("agent:board <action> [values...]")
    .description("Use an available Qwen Agent Board alongside OMA run receipts")
    .requiredOption("--board <name>", "Native Qwen board name")
    .option("--actor <label>", "Actor label (required for mutations)")
    .option("--owner <label>", "Suggested owner when creating a task")
    .option("--note <text>", "Completion note for done")
    .option("--json", "Print native board JSON")
    .action(runAction(runQwenBoard));
  program
    .command("agent:parallel-supervisor <manifest>", { hidden: true })
    .action(runAction(runParallelSupervisor));
  program
    .command("agent:context <agent-id>")
    .description("Load graph-selected context for a native dispatch prompt")
    .option("--root <path>", "Project definitions to load")
    .option("--difficulty <level>", "Simple, Medium, or Complex", "Medium")
    .action(runAction(showAgentContext));
  program
    .command("agent:resume <session-id>")
    .option(
      "--timeout-seconds <seconds>",
      "Whole-session time limit, including setup and retries",
    )
    .option(
      "--deadline <timestamp>",
      "Absolute session deadline (ISO timestamp with timezone)",
    )
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
    .option(
      "--timeout-seconds <seconds>",
      "Whole-session time limit, including setup and retries",
    )
    .option(
      "--deadline <timestamp>",
      "Absolute session deadline (ISO timestamp with timezone)",
    )
    .description("Start an evidence-backed native agent run")
    .option("--root <path>", "Project storing the run")
    .option("-w, --workspace <path>", "Workspace being verified")
    .action(runAction(beginResult));
  program
    .command("agent:verify <run-id> [command...]")
    .option(
      "--timeout-seconds <seconds>",
      "Whole-session time limit, including setup and retries",
    )
    .option(
      "--deadline <timestamp>",
      "Absolute session deadline (ISO timestamp with timezone)",
    )
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
      "--timeout-seconds <seconds>",
      "Whole-session time limit, including setup and retries",
    )
    .option(
      "--deadline <timestamp>",
      "Absolute session deadline (ISO timestamp with timezone)",
    )
    .option(
      "--fallback-vendors <vendors>",
      "Ordered, comma-separated explicit fallback vendor chain",
    )
    .option(
      "--task-id <id>",
      "Task ID from the session plan (default: agent ID)",
    )
    .option(
      "-m, --model <vendor>",
      "CLI vendor override (antigravity/claude/codex/cursor/opencode/kilo/qwen/grok/pi)",
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
    .option(
      "--edit-only",
      "Approve file edits and nothing else (suppresses auto-approve flags; refuses a vendor without such a mode)",
    )
    .option(
      "--model-id <id>",
      "Run on this model, spelled as the target CLI expects it (replaces the configured plan)",
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
          options.fallbackVendors,
          0,
          undefined,
          [],
          {
            timeoutSeconds: options.timeoutSeconds,
            deadline: options.deadline,
          },
          undefined,
          { editOnly: options.editOnly, model: options.modelId },
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
      "--timeout-seconds <seconds>",
      "Whole-session time limit, including setup and retries",
    )
    .option(
      "--deadline <timestamp>",
      "Absolute session deadline (ISO timestamp with timezone)",
    )
    .option(
      "--session <id>",
      "Bind results to an existing session and task IDs from YAML",
    )
    .option(
      "-m, --model <vendor>",
      "CLI vendor override (antigravity/claude/codex/cursor/opencode/kilo/qwen/grok/pi)",
    )
    .option(
      "-i, --inline",
      "Inline mode: specify tasks as agent:task arguments",
    )
    .option(
      "--edit-only",
      "Approve file edits and nothing else for every task (refuses a vendor without such a mode)",
    )
    .option(
      "--model-id <id>",
      "Run every task on this model, spelled as the target CLI expects it",
    )
    .option("--no-wait", "Don't wait for completion (background mode)")
    .action(
      runAction(async (tasks, options) => {
        await parallelRun(tasks, {
          vendor: options.model,
          inline: options.inline,
          noWait: !options.wait,
          session: options.session,
          editOnly: options.editOnly,
          model: options.modelId,
          timeoutSeconds: options.timeoutSeconds,
          deadline: options.deadline,
        });
      }),
    );

  program
    .command("agent:batch <agent-id> <prompt-template>")
    .description(
      "Run one bounded agent session per worklist item until each item's check passes",
    )
    .requiredOption(
      "--items <file>",
      "Worklist: one item per line (- reads stdin; # starts a comment)",
    )
    .requiredOption(
      "--check <command>",
      "Command that exits 0 when an item is done; {item} is replaced by the item",
    )
    .option("--vendor <vendor>", "CLI vendor override for every item")
    .option(
      "--fallback-vendors <vendors>",
      "Ordered, comma-separated vendors to switch to when the current one keeps failing",
    )
    .option(
      "--model-id <id>",
      "Run on this model, spelled as the primary vendor's CLI expects it",
    )
    .option(
      "--edit-only",
      "Approve file edits and nothing else (refuses a vendor without such a mode)",
    )
    .option("--concurrency <count>", "Agent sessions running at once", "3")
    .option(
      "--max-attempts <count>",
      "Agent sessions per item before it is reported as failed",
      "2",
    )
    .option("--session-id <id>", "Bind every run to this session")
    .option("-w, --workspace <path>", "Working directory for checks and agents")
    .option("--dry-run", "Run the checks and report what would be dispatched")
    .option(
      "--timeout-seconds <seconds>",
      "Whole-batch time limit, including checks and retries",
    )
    .option(
      "--deadline <timestamp>",
      "Absolute batch deadline (ISO timestamp with timezone)",
    )
    .action(
      runAction(async (agentId, promptTemplate, options) => {
        await batchRun(agentId, promptTemplate, options);
      }),
    );

  program
    .command("agent:review")
    .description("Run code review using external CLI (codex/claude/qwen/grok)")
    .option("--session <id>", "Use the existing session execution budget")
    .option(
      "--timeout-seconds <seconds>",
      "Whole-session time limit, including setup and retries",
    )
    .option(
      "--deadline <timestamp>",
      "Absolute session deadline (ISO timestamp with timezone)",
    )
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
          session: options.session,
          timeoutSeconds: options.timeoutSeconds,
          deadline: options.deadline,
        });
      }),
    );
}
