import type { Command } from "commander";
import {
  addOutputOptions,
  resolveJsonMode,
  runAction,
} from "../../utils/cli-framework.js";
import { integerOption } from "../../utils/option-parsers.js";
import { runSkillsAudit } from "./audit.js";
import { runSkillsEval } from "./eval.js";
import { runSkillsLint } from "./lint.js";
import { estimateLiveDispatchCalls } from "./opt/cost-preview.js";
import { readSkillPromotions, rollbackSkillPromotion } from "./opt/lineage.js";
import {
  buildLlmMetaProposer,
  renderMetaReport,
  runMetaOptimization,
} from "./opt/meta.js";
import { buildLiveInnerRunner } from "./opt/meta-runner.js";
import {
  exportEvolutionProcedure,
  loadEvolutionProcedure,
} from "./opt/procedure.js";
import { computeEvolutionStats, renderEvolutionStats } from "./opt/stats.js";
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
      .command("lint")
      .description(
        "Detect per-skill authoring smells (frontmatter, structure, broken refs)",
      )
      .option("--skill <id>", "Lint a single skill"),
    "Output as JSON for CI/CD",
  ).action(
    runAction(
      (options) => {
        const opts = options as {
          json?: boolean;
          output?: string;
          skill?: string;
        };
        runSkillsLint(resolveJsonMode(opts), { skill: opts.skill });
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
      .option("--max-tasks <n>", "Cap number of tasks evaluated", integerOption)
      .option(
        "--trials <n>",
        "Repeat every arm n times with alternating order (only with --live; 1-10)",
        integerOption,
      )
      .option(
        "--require-coverage",
        "Exit non-zero when task coverage is insufficient",
      )
      .option(
        "--neg-transfer",
        "Sample same-domain neighbor tasks to detect negative transfer (off by default)",
      )
      .option(
        "--routing",
        "Measure activation: which installed skill the model would load per task (live measures, mock replays)",
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
          trials?: number;
          routing?: boolean;
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
          trials: opts.trials,
          routing: opts.routing,
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
        "Propose edits without modifying SKILL.md; evolution evidence is still recorded (default)",
      )
      .option("--apply", "Apply accepted edits (backs up original first)")
      .option(
        "--mock",
        "Offline scoring mode; CLI proposal replay is unavailable (use skill eval --mock)",
      )
      .option(
        "--live",
        "Live LLM optimizer dispatch — incurs model calls per epoch",
      )
      .option(
        "--max-epochs <n>",
        "Maximum optimization epochs",
        integerOption,
        OPT_MAX_EPOCHS,
      )
      .option(
        "--edits-per-epoch <k>",
        "Candidate edits proposed per epoch",
        integerOption,
        OPT_EDITS_PER_EPOCH,
      )
      .option(
        "--lr <chars>",
        "Textual learning-rate budget: max chars changed per edit",
        integerOption,
        OPT_LR_MAX_CHARS,
      )
      .option("--yes", "Skip cost-preview confirmation (only with --live)")
      .option(
        "--memory <mode>",
        "recall (default) reuses persistent evolution knowledge; none starts from an empty memory for a same-budget comparison",
        "recall",
      ),
    "Output as JSON for CI/CD",
  ).action(
    runAction(
      async (options) => {
        const opts = options as {
          json?: boolean;
          output?: string;
          skill?: string;
          memory?: string;
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
          memory: opts.memory === "none" ? "none" : "recall",
        };
        if (opts.memory && opts.memory !== "none" && opts.memory !== "recall")
          throw new Error("--memory must be recall or none");
        await runSkillsOpt(resolveJsonMode(opts), optOptions);
      },
      { supportsJsonOutput: true },
    ),
  );

  addOutputOptions(
    skills
      .command("meta-optimize")
      .description(
        "Propose and score changes to the evolution procedure itself on held-out skills; promote only with a paired bootstrap interval above zero",
      )
      .option(
        "--target <part>",
        "Procedure part to optimize: optimizer or maintainer",
        "optimizer",
      )
      .requiredOption(
        "--skill <ids...>",
        "Held-out skills the candidate procedure is scored on (space separated)",
      )
      .option(
        "--anchor <ids...>",
        "Skills never used for selection; reported before and after for drift",
      )
      .option(
        "--repeats <n>",
        "Inner runs per skill and procedure",
        integerOption,
        3,
      )
      .option(
        "--candidates <n>",
        "Procedure candidates to propose",
        integerOption,
        2,
      )
      .option(
        "--max-epochs <n>",
        "Inner-run epochs (same for every arm)",
        integerOption,
        1,
      )
      .option(
        "--edits-per-epoch <k>",
        "Inner-run edits per epoch (same for every arm)",
        integerOption,
        OPT_EDITS_PER_EPOCH,
      )
      .option("--live", "Required: inner runs call real models")
      .option("--apply", "Write the winning procedure file with lineage")
      .option(
        "--memory <mode>",
        "Inner-run memory mode: recall or none",
        "none",
      )
      .option("--yes", "Skip the cost confirmation"),
    "Output the meta report as JSON",
  ).action(
    runAction(
      async (options) => {
        const opts = options as {
          json?: boolean;
          output?: string;
          target?: string;
          skill: string[];
          anchor?: string[];
          repeats?: number;
          candidates?: number;
          maxEpochs?: number;
          editsPerEpoch?: number;
          live?: boolean;
          apply?: boolean;
          memory?: string;
          yes?: boolean;
        };
        if (opts.target !== "optimizer" && opts.target !== "maintainer")
          throw new Error("--target must be optimizer or maintainer");
        if (!opts.live)
          throw new Error(
            "[oma skill meta-optimize] requires --live; there is no recorded inner-run source",
          );
        const workspace = process.cwd();
        const procedure = loadEvolutionProcedure(workspace);
        const budget = {
          maxEpochs: opts.maxEpochs ?? 1,
          editsPerEpoch: opts.editsPerEpoch ?? OPT_EDITS_PER_EPOCH,
        };
        const repeats = opts.repeats ?? 3;
        const candidates = opts.candidates ?? 2;
        const anchors = opts.anchor ?? procedure.constitution.anchors;
        const innerRuns =
          opts.skill.length * repeats * (1 + candidates) + anchors.length * 2;
        const perRun = estimateLiveDispatchCalls(
          budget.maxEpochs,
          budget.editsPerEpoch,
        );
        const json = resolveJsonMode(opts);
        const info = (message: string): void => {
          if (json) console.error(message);
          else console.log(message);
        };
        info(
          `[oma skill meta-optimize] up to ${innerRuns} inner optimization runs × ~${perRun} model calls each (${innerRuns * perRun} calls upper bound). Final-test partitions and evaluator code stay frozen; only ${opts.target}.md may change${opts.apply ? " (--apply)" : " (dry-run)"}.`,
        );
        if (!opts.yes) {
          const { promptConfirm } = await import("./eval.js");
          if (!(await promptConfirm("Proceed? [y/N] "))) {
            info("Aborted by user. No runs issued.");
            return;
          }
        }
        const report = await runMetaOptimization({
          workspace,
          procedure,
          target: opts.target,
          skills: opts.skill,
          anchors,
          repeats,
          candidateCount: candidates,
          budget,
          proposer: buildLlmMetaProposer(),
          innerRunner: buildLiveInnerRunner({
            workspace,
            memory: opts.memory === "recall" ? "recall" : "none",
          }),
          apply: opts.apply === true,
          onProgress: (message) => info(`  ${message}`),
        });
        if (json) console.log(JSON.stringify(report, null, 2));
        else renderMetaReport(report);
      },
      { supportsJsonOutput: true },
    ),
  );

  addOutputOptions(
    skills
      .command("procedure")
      .description(
        "Show the evolution procedure (optimizer/maintainer prompts, constitution) and its hashes; --export writes editable defaults",
      )
      .option(
        "--export",
        "Write default procedure files under .agents/eval/_evolution/ (existing files are kept)",
      ),
    "Output as JSON",
  ).action(
    runAction(
      async (options) => {
        const opts = options as {
          json?: boolean;
          output?: string;
          export?: boolean;
        };
        const workspace = process.cwd();
        const exported = opts.export
          ? exportEvolutionProcedure(workspace)
          : undefined;
        const procedure = loadEvolutionProcedure(workspace);
        const summary = {
          procedureHash: procedure.procedureHash,
          optimizer: {
            source: procedure.optimizer.source,
            hash: procedure.optimizer.hash,
          },
          maintainer: {
            source: procedure.maintainer.source,
            hash: procedure.maintainer.hash,
          },
          constitution: {
            source: procedure.constitution.source,
            hash: procedure.constitution.hash,
            immutable: procedure.constitution.immutable,
            metaTargets: procedure.constitution.meta_targets,
            budget: procedure.constitution.budget,
          },
          ...(exported ? { exported } : {}),
        };
        if (resolveJsonMode(opts)) {
          console.log(JSON.stringify(summary, null, 2));
          return;
        }
        console.log(`procedure: ${summary.procedureHash}`);
        console.log(
          `  optimizer: ${summary.optimizer.source} (${summary.optimizer.hash})`,
        );
        console.log(
          `  maintainer: ${summary.maintainer.source} (${summary.maintainer.hash})`,
        );
        console.log(
          `  constitution: ${summary.constitution.source} (${summary.constitution.hash})`,
        );
        for (const path of summary.constitution.immutable)
          console.log(`    immutable: ${path}`);
        console.log(
          `    meta targets: ${summary.constitution.metaTargets.join(", ")}`,
        );
        if (exported) {
          for (const path of exported.written) console.log(`  wrote ${path}`);
          for (const path of exported.kept) console.log(`  kept ${path}`);
        }
      },
      { supportsJsonOutput: true },
    ),
  );

  addOutputOptions(
    skills
      .command("evolution-stats")
      .description(
        "Aggregate recorded optimization runs: proposals, acceptance, verified improvements, rollbacks, by memory mode and procedure",
      )
      .requiredOption("--skill <id>", "Skill ID"),
    "Output as JSON",
  ).action(
    runAction(
      async (options) => {
        const opts = options as {
          json?: boolean;
          output?: string;
          skill: string;
        };
        const stats = computeEvolutionStats(process.cwd(), opts.skill);
        if (resolveJsonMode(opts)) {
          console.log(JSON.stringify(stats, null, 2));
          return;
        }
        renderEvolutionStats(stats);
      },
      { supportsJsonOutput: true },
    ),
  );

  addOutputOptions(
    skills
      .command("promotions")
      .description(
        "List recorded SKILL.md promotions and rollbacks for a skill",
      )
      .requiredOption("--skill <id>", "Skill ID"),
    "Output as JSON",
  ).action(
    runAction(
      async (options) => {
        const opts = options as {
          json?: boolean;
          output?: string;
          skill: string;
        };
        const records = readSkillPromotions(process.cwd(), opts.skill);
        if (resolveJsonMode(opts)) {
          console.log(JSON.stringify({ skill: opts.skill, records }, null, 2));
          return;
        }
        if (records.length === 0) {
          console.log(`No recorded promotions for ${opts.skill}.`);
          return;
        }
        for (const record of records) {
          console.log(
            `${record.ts}  ${record.action.padEnd(8)}  ${record.parentHash} → ${record.candidateHash}` +
              `  lift ${record.evidence.baselineLift.toFixed(3)}→${record.evidence.finalLift.toFixed(3)}` +
              `${record.patchPath ? `  patch ${record.patchPath}` : ""}`,
          );
        }
      },
      { supportsJsonOutput: true },
    ),
  );

  addOutputOptions(
    skills
      .command("rollback")
      .description(
        "Restore the SKILL.md body replaced by the most recent recorded promotion",
      )
      .requiredOption("--skill <id>", "Skill ID"),
    "Output as JSON",
  ).action(
    runAction(
      async (options) => {
        const opts = options as {
          json?: boolean;
          output?: string;
          skill: string;
        };
        const result = rollbackSkillPromotion(process.cwd(), opts.skill);
        if (resolveJsonMode(opts)) {
          console.log(JSON.stringify(result, null, 2));
          return;
        }
        console.log(
          `[oma skill rollback] restored ${result.record.skillMdPath} from ${result.restoredFrom} (reverses ${result.record.reverses}).`,
        );
      },
      { supportsJsonOutput: true },
    ),
  );
}
