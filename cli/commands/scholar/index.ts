import type { Command } from "commander";
import color from "picocolors";
import { runAction } from "../../cli-kit/cli-framework.js";
import { runGet } from "./get.js";
import { formatReport, lintFile } from "./lint.js";
import { runResolve } from "./resolve.js";
import { runSearch } from "./search.js";

export function registerScholarCommand(program: Command): void {
  const scholar = program
    .command("scholar")
    .description(
      "Knows.academy paper sidecars (with OpenAlex fallback for older papers)",
    );

  scholar
    .command("search <query...>")
    .description("Search papers (knows.academy first, OpenAlex fallback)")
    .option("--max <n>", "max results per source", "10")
    .option("--year-min <year>", "OpenAlex: only papers from this year onward")
    .option(
      "--always-fallback",
      "always include OpenAlex even if knows has hits",
    )
    .action(
      runAction(async (queryParts: string[], opts: Record<string, unknown>) => {
        const result = await runSearch({
          query: queryParts.join(" "),
          max: Number.parseInt((opts.max as string) ?? "10", 10),
          yearMin: opts.yearMin
            ? Number.parseInt(opts.yearMin as string, 10)
            : undefined,
          alwaysFallback: Boolean(opts.alwaysFallback),
        });
        console.log(JSON.stringify(result, null, 2));
      }),
    );

  scholar
    .command("resolve <query...>")
    .description("Find best paper match across knows.academy and OpenAlex")
    .action(
      runAction(async (queryParts: string[]) => {
        const result = await runResolve(queryParts.join(" "));
        console.log(JSON.stringify(result, null, 2));
      }),
    );

  scholar
    .command("get <id>")
    .description(
      "Fetch a sidecar (knows record_id) or work metadata (OpenAlex W-id, DOI)",
    )
    .option(
      "--section <name>",
      "knows partial fetch: statements|evidence|relations|artifacts|citation",
    )
    .action(
      runAction(async (id: string, opts: Record<string, unknown>) => {
        const result = await runGet({
          id,
          section: opts.section as string | undefined,
        });
        console.log(JSON.stringify(result, null, 2));
      }),
    );

  scholar
    .command("lint <file>")
    .description("Validate a .knows.yaml or .knows.json sidecar (v0.9.0)")
    .option(
      "--lenient",
      "demote dangling cross-reference checks to warnings (third-party sidecars)",
    )
    .option(
      "--fail-on-warning",
      "exit non-zero on warnings (default: errors only)",
    )
    .action(
      runAction(async (file: string, opts: Record<string, unknown>) => {
        const report = lintFile(file, {
          lenient: Boolean(opts.lenient),
          failOnWarning: Boolean(opts.failOnWarning),
        });
        console.log(formatReport(report, file));
        if (report.errors > 0) {
          process.exitCode = 1;
        } else if (opts.failOnWarning && report.warnings > 0) {
          process.exitCode = 1;
        }
      }),
    );

  scholar.addHelpText(
    "after",
    `\n${color.dim("Examples:")}\n` +
      `  ${color.cyan("oma scholar search")} "vision language action"\n` +
      `  ${color.cyan("oma scholar resolve")} "Attention Is All You Need"\n` +
      `  ${color.cyan("oma scholar get")} --section statements knows:generated/reconvla/1.0.0\n` +
      `  ${color.cyan("oma scholar get")} 10.48550/arXiv.1706.03762\n` +
      `  ${color.cyan("oma scholar lint")} --lenient paper.knows.yaml\n`,
  );
}
