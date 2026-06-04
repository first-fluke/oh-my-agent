import type { Command } from "commander";
import {
  addOutputOptions,
  resolveJsonMode,
  runAction,
} from "../../utils/cli-framework.js";
import { runSkillsAudit } from "./audit.js";
import { runSkillsEval } from "./eval.js";
import {
  OPT_EDITS_PER_EPOCH,
  OPT_LR_MAX_CHARS,
  OPT_MAX_EPOCHS,
  runSkillsOpt,
  type SkillsOptOptions,
} from "./opt.js";

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

  addOutputOptions(
    skills
      .command("opt")
      .description(
        "Optimize a skill's SKILL.md to maximize measured held-out utility lift",
      )
      .option("--skill <id>", "Skill ID to optimize")
      .option(
        "--dry-run",
        "Propose edits only; do not write anything (default)",
      )
      .option("--apply", "Apply accepted edits (backs up original first)")
      .option(
        "--mock",
        "Replay recorded edits/eval verdicts (default; deterministic)",
      )
      .option(
        "--live",
        "Live LLM optimizer dispatch — incurs model calls per epoch",
      )
      .option(
        "--max-epochs <n>",
        "Maximum optimization epochs",
        parseInt,
        OPT_MAX_EPOCHS,
      )
      .option(
        "--edits-per-epoch <k>",
        "Candidate edits proposed per epoch",
        parseInt,
        OPT_EDITS_PER_EPOCH,
      )
      .option(
        "--lr <chars>",
        "Textual learning-rate budget: max chars changed per edit",
        parseInt,
        OPT_LR_MAX_CHARS,
      )
      .option("--yes", "Skip cost-preview confirmation (only with --live)"),
    "Output as JSON for CI/CD",
  ).action(
    runAction(
      async (options) => {
        const opts = options as {
          json?: boolean;
          output?: string;
          skill?: string;
          dryRun?: boolean;
          apply?: boolean;
          mock?: boolean;
          live?: boolean;
          maxEpochs?: number;
          editsPerEpoch?: number;
          lr?: number;
          yes?: boolean;
        };
        const optOptions: SkillsOptOptions = {
          skill: opts.skill,
          dryRun: opts.dryRun,
          apply: opts.apply,
          mock: opts.mock,
          live: opts.live,
          maxEpochs: opts.maxEpochs,
          editsPerEpoch: opts.editsPerEpoch,
          lr: opts.lr,
          yes: opts.yes,
        };
        await runSkillsOpt(resolveJsonMode(opts), optOptions);
      },
      { supportsJsonOutput: true },
    ),
  );
}
