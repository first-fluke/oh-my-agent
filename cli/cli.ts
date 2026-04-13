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
import { star } from "./commands/star.js";
import { stats } from "./commands/stats.js";
import { update } from "./commands/update.js";
import { verify } from "./commands/verify.js";
import { visualize } from "./commands/visualize.js";
import { startDashboard } from "./dashboard.js";
import pkg from "./package.json";
import { startTerminalDashboard } from "./terminal-dashboard.js";

const VERSION = pkg.version;
const JSON_OUTPUT_ENV = "OH_MY_AG_OUTPUT_FORMAT";
const OUTPUT_FORMATS = ["text", "json"] as const;
const VENDORS = ["gemini", "claude", "codex", "qwen"] as const;
const AGENT_TYPES = ["backend", "frontend", "mobile", "qa", "debug", "pm"];

type OutputFormat = (typeof OUTPUT_FORMATS)[number];
type JsonCapableOptions = {
  json?: boolean;
  output?: string;
};

type DescribeArgument = {
  name: string;
  required: boolean;
  variadic: boolean;
};

type DescribeOption = {
  flags: string;
  long?: string;
  short?: string;
  description: string;
  required: boolean;
  optional: boolean;
  defaultValue?: unknown;
};

type DescribeCommand = {
  name: string;
  path: string;
  summary?: string;
  description: string;
  arguments: DescribeArgument[];
  options: DescribeOption[];
  supportsJsonOutput: boolean;
  supportsDryRun: boolean;
  subcommands: DescribeCommand[];
};

function addOutputOptions(command: Command, description = "Output as JSON") {
  return command
    .option("--json", description)
    .option("--output <format>", "Output format (text/json)", (value) => {
      const normalized = value.trim().toLowerCase();
      if (
        !OUTPUT_FORMATS.includes(normalized as (typeof OUTPUT_FORMATS)[number])
      ) {
        throw new Error(
          `Invalid output format: ${value}. Expected one of ${OUTPUT_FORMATS.join(", ")}`,
        );
      }
      return normalized;
    });
}

function resolveOutputFormat(options?: JsonCapableOptions): OutputFormat {
  if (options?.json) {
    return "json";
  }

  const explicitOutput = options?.output?.trim().toLowerCase();
  if (
    explicitOutput &&
    OUTPUT_FORMATS.includes(explicitOutput as OutputFormat)
  ) {
    return explicitOutput as OutputFormat;
  }

  const envOutput = process.env[JSON_OUTPUT_ENV]?.trim().toLowerCase();
  if (envOutput === "json") {
    return "json";
  }

  return "text";
}

function resolveJsonMode(options?: JsonCapableOptions): boolean {
  return resolveOutputFormat(options) === "json";
}

function getActionCommand(args: unknown[]): Command | null {
  const maybeCommand = args.at(-1);
  return maybeCommand instanceof Command ? maybeCommand : null;
}

function getActionOptions(args: unknown[]): Record<string, unknown> {
  const command = getActionCommand(args);
  if (command) {
    return command.opts();
  }

  const maybeOptions = args.at(-1);
  return maybeOptions && typeof maybeOptions === "object"
    ? (maybeOptions as Record<string, unknown>)
    : {};
}

function normalizeErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  return String(error);
}

function failValidation(message: string): never {
  throw new Error(message);
}

function assertNoControlChars(value: string, label: string): void {
  for (const char of value) {
    const code = char.charCodeAt(0);
    if ((code >= 0 && code <= 31) || code === 127) {
      failValidation(`${label} must not contain control characters`);
    }
  }
}

function assertSafeIdentifier(value: string, label: string): void {
  assertNoControlChars(value, label);
  if (/[?#%]/.test(value)) {
    failValidation(`${label} must not contain ?, #, or %`);
  }
  if (value.includes("..")) {
    failValidation(`${label} must not contain '..'`);
  }
}

function assertValidUrl(value: string, label: string): void {
  assertNoControlChars(value, label);
  try {
    // Let the command implementation decide allowed protocols; reject malformed URLs early.
    new URL(value);
  } catch {
    failValidation(`${label} must be a valid absolute URL`);
  }
}

function validateValue(
  value: unknown,
  label: string,
  mode: "text" | "identifier" | "url" = "text",
): void {
  if (typeof value === "string") {
    if (mode === "identifier") {
      assertSafeIdentifier(value, label);
      return;
    }

    if (mode === "url") {
      assertValidUrl(value, label);
      return;
    }

    assertNoControlChars(value, label);
    return;
  }

  if (Array.isArray(value)) {
    for (const [index, entry] of value.entries()) {
      validateValue(entry, `${label}[${index}]`, mode);
    }
  }
}

function validationModeForName(name: string): "text" | "identifier" | "url" {
  const normalized = name.toLowerCase();
  if (normalized === "url" || normalized.endsWith("url")) {
    return "url";
  }
  if (
    normalized.includes("id") ||
    normalized.includes("type") ||
    normalized.includes("vendor") ||
    normalized.includes("session")
  ) {
    return "identifier";
  }
  return "text";
}

function validateKnownOptionValues(options: Record<string, unknown>): void {
  const vendor = options.vendor;
  if (
    typeof vendor === "string" &&
    !VENDORS.includes(vendor as (typeof VENDORS)[number])
  ) {
    failValidation(`vendor must be one of ${VENDORS.join(", ")}`);
  }

  const output = options.output;
  if (
    typeof output === "string" &&
    !OUTPUT_FORMATS.includes(output as OutputFormat)
  ) {
    failValidation(`output must be one of ${OUTPUT_FORMATS.join(", ")}`);
  }
}

function validateCommandInputs(command: Command): void {
  const args = command.processedArgs ?? command.args ?? [];
  const registeredArguments = command.registeredArguments ?? [];

  registeredArguments.forEach((arg, index) => {
    const argName = arg.name?.() || String(index);
    const value = args[index];
    validateValue(value, argName, validationModeForName(argName));

    if (
      argName === "agent-type" &&
      typeof value === "string" &&
      !AGENT_TYPES.includes(value as (typeof AGENT_TYPES)[number])
    ) {
      failValidation(`agent-type must be one of ${AGENT_TYPES.join(", ")}`);
    }
  });

  const options = command.opts();
  validateKnownOptionValues(options);
  for (const [name, value] of Object.entries(options)) {
    validateValue(value, name, validationModeForName(name));
  }
}

function describeArguments(command: Command): DescribeArgument[] {
  return (command.registeredArguments ?? []).map((arg) => ({
    name: arg.name?.() || "",
    required: !!arg.required,
    variadic: !!arg.variadic,
  }));
}

function describeOptions(command: Command): DescribeOption[] {
  return command.options.map((option) => ({
    flags: option.flags,
    long: option.long || undefined,
    short: option.short || undefined,
    description: option.description || "",
    required: !!option.required || !!option.mandatory,
    optional: !!option.optional,
    defaultValue: option.defaultValue,
  }));
}

function getCommandPath(command: Command): string {
  const segments: string[] = [];
  let cursor: Command | null = command;

  while (cursor?.parent) {
    segments.unshift(cursor.name());
    cursor = cursor.parent;
  }

  return segments.join(" ");
}

function commandSupportsJson(command: Command): boolean {
  return command.options.some(
    (option) => option.long === "--json" || option.long === "--output",
  );
}

function commandSupportsDryRun(command: Command): boolean {
  return command.options.some((option) => option.long === "--dry-run");
}

function describeCommand(command: Command): DescribeCommand {
  return {
    name: command.name(),
    path: getCommandPath(command),
    summary: command.summary() || undefined,
    description: command.description(),
    arguments: describeArguments(command),
    options: describeOptions(command),
    supportsJsonOutput: commandSupportsJson(command),
    supportsDryRun: commandSupportsDryRun(command),
    subcommands: command.commands.map((subcommand) =>
      describeCommand(subcommand),
    ),
  };
}

function findCommand(program: Command, commandPath?: string): Command | null {
  if (!commandPath) {
    return program;
  }

  const normalizedTarget = commandPath.trim();
  if (!normalizedTarget) {
    return program;
  }

  const queue = [...program.commands];
  while (queue.length > 0) {
    const current = queue.shift();
    if (!current) {
      continue;
    }

    if (
      current.name() === normalizedTarget ||
      getCommandPath(current) === normalizedTarget
    ) {
      return current;
    }

    queue.push(...current.commands);
  }

  return null;
}

function printDescribe(program: Command, commandPath?: string): void {
  const target = findCommand(program, commandPath);
  if (!target) {
    failValidation(`Unknown command: ${commandPath}`);
  }

  const payload = {
    name: program.name(),
    version: program.version(),
    description: program.description(),
    env: {
      [JSON_OUTPUT_ENV]:
        "Set to json to force machine-readable output on commands that support it.",
    },
    command: describeCommand(target),
  };

  console.log(JSON.stringify(payload, null, 2));
}

function runAction<T extends unknown[]>(
  handler: (...args: T) => Promise<void> | void,
  config: { supportsJsonOutput?: boolean } = {},
) {
  return async (...args: T) => {
    const command = getActionCommand(args);
    const options = getActionOptions(args);

    try {
      if (command) {
        validateCommandInputs(command);
      }
      await handler(...args);
    } catch (error) {
      const message = normalizeErrorMessage(error);
      if (config.supportsJsonOutput && resolveJsonMode(options)) {
        console.log(JSON.stringify({ error: message }, null, 2));
      } else {
        console.error(message);
      }
      process.exitCode = 1;
    }
  };
}

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

program.parse();
