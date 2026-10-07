import type { Command } from "commander";
import {
  addOutputOptions,
  resolveJsonMode,
  runAction,
} from "../../../utils/cli-framework.js";
import { integerOption } from "../../../utils/option-parsers.js";
import { saveMatrixReport, validateMatrixReportDestination } from "./report.js";
import {
  type MatrixOptions,
  matrixReportFailed,
  renderMatrixReport,
  runSkillsMatrix,
} from "./run.js";

export function registerSkillsMatrixCommand(skills: Command): void {
  addOutputOptions(
    skills
      .command("matrix")
      .description(
        "Test native skill discovery, references and output contracts across CLI vendors",
      )
      .option(
        "--suite <path>",
        "Custom JSON compatibility suite (default: three diagnostic skills)",
      )
      .option(
        "--vendors <ids>",
        "Comma-separated vendors: claude,codex",
        "claude,codex",
      )
      .option("--cases <ids>", "Comma-separated suite case IDs to select")
      .option(
        "--live",
        "Run native CLIs; without this flag, show the plan only",
      )
      .option("--yes", "Skip the native CLI execution confirmation")
      .option(
        "--timeout-seconds <n>",
        "Per-call deadline, 1-600 seconds",
        integerOption,
        120,
      )
      .option(
        "--claude-model <model>",
        "Explicit Claude model (default: isolated CLI default)",
      )
      .option(
        "--codex-model <model>",
        "Explicit Codex model (default: isolated CLI default)",
      )
      .option("--report <path>", "Save a structured JSON report to a new file"),
    "Output the plan or measured matrix as JSON",
  ).action(
    runAction(
      async (options) => {
        const opts = options as MatrixOptions & {
          json?: boolean;
          output?: string;
          report?: string;
        };
        const json = resolveJsonMode(opts);
        if (json && opts.live && !opts.yes)
          throw new Error(
            "Use --yes with --json --live to keep stdout machine-readable",
          );
        if (opts.report !== undefined)
          validateMatrixReportDestination(opts.report);
        const report = await runSkillsMatrix(opts);
        if (opts.report) saveMatrixReport(opts.report, report);
        console.log(
          json ? JSON.stringify(report, null, 2) : renderMatrixReport(report),
        );
        if (matrixReportFailed(report)) process.exitCode = 1;
      },
      { supportsJsonOutput: true },
    ),
  );
}
