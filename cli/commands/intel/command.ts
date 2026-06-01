import type { Command } from "commander";
import {
  addOutputOptions,
  resolveJsonMode,
  runAction,
} from "../../utils/cli-framework.js";
import { runIntelSuggest } from "./intel.js";

type SuggestOptions = {
  config?: string;
  topic?: string;
  target?: string;
  repos?: string;
  since?: string;
  lastCommits?: string;
  outputDir?: string;
  dryRun?: boolean;
  fixture?: string;
  json?: boolean;
  output?: string;
};

function printText(result: Awaited<ReturnType<typeof runIntelSuggest>>): void {
  console.log(result.markdown);
  const paths = Object.values(result.outputPaths).filter(Boolean);
  if (paths.length > 0) {
    console.log("\nWritten:");
    for (const filePath of paths) {
      console.log(`- ${filePath}`);
    }
  }
}

async function runSuggest(options: SuggestOptions): Promise<void> {
  const result = await runIntelSuggest({
    config: options.config,
    topic: options.topic,
    target: options.target,
    repos: options.repos,
    since: options.since,
    lastCommits: options.lastCommits
      ? Number.parseInt(options.lastCommits, 10)
      : undefined,
    outputDir: options.outputDir,
    dryRun: options.dryRun,
    fixture: options.fixture,
  });

  if (resolveJsonMode(options)) {
    console.log(
      JSON.stringify(
        {
          config: result.config,
          candidates: result.candidates,
          coverage: result.coverage,
          outputPaths: result.outputPaths,
        },
        null,
        2,
      ),
    );
  } else {
    printText(result);
  }
}

function addSuggestOptions(command: Command): Command {
  return addOutputOptions(
    command
      .option("--config <path>", "Path to oma intel YAML config")
      .option("--topic <topic>", "Market/product research topic")
      .option("--target <target>", "Target product or repository")
      .option(
        "--repos <repos>",
        "Comma-separated GitHub repos for one-off source input",
      )
      .option("--since <window>", "Time window such as 7d, 30d, 2w")
      .option("--last-commits <n>", "Analyze latest N commits per repo")
      .option("--output-dir <path>", "Local output directory")
      .option("--dry-run", "Print result without writing report files")
      .option(
        "--fixture <path>",
        "Load source signals from a local JSON fixture",
      ),
  );
}

export function registerIntelCommand(program: Command): void {
  const intel = program
    .command("intel")
    .description(
      "Product intelligence pipeline: research, gaps, PRD, issue proposal",
    );

  addSuggestOptions(
    intel
      .command("suggest")
      .description(
        "Suggest high-value product work from market/code intelligence",
      ),
  ).action(
    runAction(
      async (_options, command) => {
        await runSuggest(command.opts() as SuggestOptions);
      },
      { supportsJsonOutput: true },
    ),
  );

  addSuggestOptions(
    intel
      .command("run")
      .description("Alias for suggest (kept for workflow-style usage)"),
  ).action(
    runAction(
      async (_options, command) => {
        await runSuggest(command.opts() as SuggestOptions);
      },
      { supportsJsonOutput: true },
    ),
  );
}
