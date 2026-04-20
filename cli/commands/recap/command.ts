import type { Command } from "commander";
import {
  addOutputOptions,
  resolveJsonMode,
  runAction,
} from "../../cli-kit/cli-framework.js";
import { recap } from "./recap.js";

export function registerRecap(program: Command): void {
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
}
