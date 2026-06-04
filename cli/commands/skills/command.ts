import type { Command } from "commander";
import {
  addOutputOptions,
  resolveJsonMode,
  runAction,
} from "../../utils/cli-framework.js";
import { runSkillsAudit } from "./audit.js";
import { runSkillsEval } from "./eval.js";

export function registerSkillsCommand(program: Command): void {
  const skills = program
    .command("skills")
    .description("Inspect and audit installed skills");

  addOutputOptions(
    skills
      .command("audit")
      .description(
        "Check frontmatter description similarity between installed skills",
      ),
    "Output as JSON for CI/CD",
  ).action(
    runAction(
      (options) => {
        runSkillsAudit(resolveJsonMode(options));
      },
      { supportsJsonOutput: true },
    ),
  );

  addOutputOptions(
    skills
      .command("eval")
      .description(
        "Measure per-skill utility lift (treatment vs baseline on held-out tasks)",
      )
      .option("--skill <id>", "Skill ID to evaluate")
      .option("--mock", "Replay recorded rollouts (default; deterministic)")
      .option(
        "--live",
        "Live agent dispatch — runs two arms per task via internal dispatch",
      )
      .option(
        "--record",
        "Write captured rollouts to _rollouts/ for later --mock replay (only with --live)",
      )
      .option(
        "--yes",
        "Skip the cost-preview confirmation prompt (only with --live)",
      )
      .option("--task-dir <path>", "Override task fixture directory")
      .option("--max-tasks <n>", "Cap number of tasks evaluated", parseInt)
      .option(
        "--require-coverage",
        "Exit non-zero when task coverage is insufficient",
      )
      .option(
        "--neg-transfer",
        "Sample same-domain neighbor tasks to detect negative transfer (off by default)",
      ),
    "Output as JSON for CI/CD",
  ).action(
    runAction(
      async (options) => {
        const opts = options as {
          json?: boolean;
          output?: string;
          skill?: string;
          mock?: boolean;
          live?: boolean;
          record?: boolean;
          yes?: boolean;
          taskDir?: string;
          maxTasks?: number;
          requireCoverage?: boolean;
          negTransfer?: boolean;
        };
        await runSkillsEval(resolveJsonMode(opts), {
          skill: opts.skill,
          mock: opts.mock,
          live: opts.live,
          record: opts.record,
          yes: opts.yes,
          taskDir: opts.taskDir,
          maxTasks: opts.maxTasks,
          requireCoverage: opts.requireCoverage,
          negTransfer: opts.negTransfer,
        });
      },
      { supportsJsonOutput: true },
    ),
  );
}
