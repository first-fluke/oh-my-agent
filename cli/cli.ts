#!/usr/bin/env node
import { Command } from "commander";
import {
  checkStatus,
  parallelRun,
  reviewAgent,
  spawnAgent,
} from "./commands/agent.js";
import { checkAuthStatus } from "./commands/auth.js";
import { bridge } from "./commands/bridge.js";
import { cleanup } from "./commands/cleanup.js";
import { doctor } from "./commands/doctor.js";
import { exportRules } from "./commands/export.js";
import { install } from "./commands/install.js";
import { link } from "./commands/link.js";
import { initMemory } from "./commands/memory.js";
import { recap } from "./commands/recap.js";
import { retro } from "./commands/retro.js";
import { registerSearchCommand } from "./commands/search/index.js";
import { star } from "./commands/star.js";
import { stats } from "./commands/stats.js";
import { update } from "./commands/update.js";
import { verify } from "./commands/verify.js";
import { visualize } from "./commands/visualize.js";
import { startDashboard } from "./dashboard.js";
import {
  addOutputOptions,
  printDescribe,
  resolveJsonMode,
  runAction,
} from "./cli-kit/cli-framework.js";
import pkg from "./package.json";
import { startTerminalDashboard } from "./terminal-dashboard.js";

const VERSION = pkg.version;

const program = new Command();

program
  .name("oh-my-agent")
  .description("Multi-Agent Orchestrator for AI IDEs")
  .version(VERSION)
  .showSuggestionAfterError()
  .showHelpAfterError()
  .addHelpText(
    "after",
    "\nAliases:\n  oma  Alias for oh-my-agent after global installation.\n",
  )
  .action(
    runAction(async () => {
      await install();
    }),
  );

program
  .command("install")
  .description("Install oh-my-agent skills and configurations")
  .action(
    runAction(async () => {
      await install();
    }),
  );

program
  .command("describe [command-path]")
  .description("Describe CLI commands as JSON for runtime introspection")
  .action(
    runAction(
      (commandPath) => {
        printDescribe(program, commandPath);
      },
      { supportsJsonOutput: true },
    ),
  );

program
  .command("dashboard")
  .description("Start terminal dashboard (real-time agent monitoring)")
  .action(
    runAction(async () => {
      await startTerminalDashboard();
    }),
  );

program
  .command("dashboard:web")
  .description("Start web dashboard on http://localhost:9847")
  .action(
    runAction(() => {
      startDashboard();
    }),
  );

addOutputOptions(
  program
    .command("auth:status")
    .description("Check authentication status of all supported CLIs"),
).action(
  runAction(
    async (options) => {
      await checkAuthStatus(resolveJsonMode(options));
    },
    { supportsJsonOutput: true },
  ),
);

program
  .command("update")
  .description("Update skills to latest version from registry")
  .option("-f, --force", "Overwrite user-customized config files")
  .option("--ci", "Run in non-interactive CI mode (skip prompts)")
  .action(
    runAction(async (options: { force?: boolean; ci?: boolean }) => {
      await update(options.force ?? false, options.ci ?? false);
    }),
  );

program
  .command("link [vendors...]")
  .description(
    "Regenerate vendor files (.claude/, .cursor/, etc.) from .agents/ SSOT",
  )
  .action(
    runAction((vendors: string[]) => {
      link(vendors.length > 0 ? vendors : undefined);
    }),
  );

addOutputOptions(
  program
    .command("doctor")
    .description("Check CLI installations, MCP configs, and skill status"),
  "Output as JSON for CI/CD",
).action(
  runAction(
    async (options) => {
      await doctor(resolveJsonMode(options));
    },
    { supportsJsonOutput: true },
  ),
);

addOutputOptions(
  program
    .command("stats")
    .description("View productivity metrics")
    .option("--reset", "Reset metrics data"),
).action(
  runAction(
    async (options) => {
      await stats(resolveJsonMode(options), options.reset);
    },
    { supportsJsonOutput: true },
  ),
);

addOutputOptions(
  program
    .command("retro [window]")
    .description("Engineering retrospective with metrics & trends")
    .option("--interactive", "Interactive mode (manual entry)")
    .option("--compare", "Compare current window vs prior same-length window"),
).action(
  runAction(
    async (window, options) => {
      await retro(window, {
        json: resolveJsonMode(options),
        compare: options.compare,
        interactive: options.interactive,
      });
    },
    { supportsJsonOutput: true },
  ),
);

addOutputOptions(
  program
    .command("recap")
    .description("Recap AI tool conversation history")
    .option("--window <period>", "Time window: 1d, 3d, 7d, 2w, 30d", "1d")
    .option("--date <date>", "Specific date (YYYY-MM-DD)")
    .option(
      "--tool <tools>",
      "Filter by tools (comma-separated: claude,codex,gemini,qwen,cursor)",
    )
    .option("--top <n>", "Show top N projects/topics", Number.parseInt)
    .option("--sort <metric>", "Sort by: count, duration", "count")
    .option("--mermaid", "Output Mermaid gantt chart")
    .option("--graph", "Open interactive graph in browser"),
).action(
  runAction(
    async (options) => {
      await recap(resolveJsonMode(options), {
        window: options.window,
        date: options.date,
        tool: options.tool,
        top: options.top,
        sort: options.sort,
        mermaid: options.mermaid,
        graph: options.graph,
      });
    },
    { supportsJsonOutput: true },
  ),
);

addOutputOptions(
  program
    .command("cleanup")
    .description("Clean up orphaned subagent processes and temp files")
    .option("--dry-run", "Show what would be cleaned without making changes")
    .option("-y, --yes", "Skip confirmation prompts and clean everything"),
).action(
  runAction(
    async (options) => {
      await cleanup(options.dryRun, resolveJsonMode(options), options.yes);
    },
    { supportsJsonOutput: true },
  ),
);

program
  .command("bridge [url]")
  .description("Bridge MCP stdio to Streamable HTTP (for Serena)")
  .action(
    runAction(async (url) => {
      await bridge(url);
    }),
  );

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
  .option("-i, --inline", "Inline mode: specify tasks as agent:task arguments")
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

addOutputOptions(
  program
    .command("memory:init")
    .description("Initialize Serena memory schema in .serena/memories")
    .option("--force", "Overwrite empty or existing schema files"),
).action(
  runAction(
    async (options) => {
      await initMemory(resolveJsonMode(options), options.force);
    },
    { supportsJsonOutput: true },
  ),
);

addOutputOptions(
  program
    .command("verify <agent-type>")
    .description("Verify subagent output (backend/frontend/mobile/qa/debug/pm)")
    .option("-w, --workspace <path>", "Workspace path", process.cwd()),
).action(
  runAction(
    async (agentType, options) => {
      await verify(agentType, options.workspace, resolveJsonMode(options));
    },
    { supportsJsonOutput: true },
  ),
);

program
  .command("star")
  .description("Star oh-my-agent on GitHub")
  .action(
    runAction(async () => {
      await star();
    }),
  );

addOutputOptions(
  program
    .command("export <format>")
    .description("Export skills for external IDEs (cursor)")
    .option("-d, --dir <path>", "Target directory", process.cwd()),
).action(
  runAction(
    async (format, options) => {
      await exportRules(format, options.dir, resolveJsonMode(options));
    },
    { supportsJsonOutput: true },
  ),
);

addOutputOptions(
  program
    .command("visualize")
    .alias("viz")
    .description("Visualize project structure as a dependency graph"),
).action(
  runAction(
    async (options) => {
      await visualize({
        json: resolveJsonMode(options),
      });
    },
    { supportsJsonOutput: true },
  ),
);

program
  .command("help")
  .description("Show help information")
  .action(
    runAction(() => {
      program.help();
    }),
  );

program
  .command("version")
  .description("Show version number")
  .action(
    runAction(() => {
      console.log(VERSION);
    }),
  );

registerSearchCommand(program);

program.parse();
