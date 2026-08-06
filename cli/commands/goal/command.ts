import fs from "node:fs";
import path from "node:path";
import type { Command } from "commander";
import {
  addOutputOptions,
  resolveJsonMode,
  runAction,
} from "../../utils/cli-framework.js";
import { resolveProjectRoot } from "../../utils/fs-utils.js";

/**
 * Gate keywords the persistent-mode Stop hook is allowed to execute
 * (mirrors GATE_KEYWORDS in `.agents/hooks/core/persistent-mode.ts`).
 * The hook re-validates on every run — this CLI check only fails fast.
 */
const GATE_KEYWORDS = new Set(["typecheck", "test", "lint"]);

interface PersistentModeState {
  workflow: string;
  sessionId: string;
  activatedAt: string;
  reinforcementCount: number;
  omaSid?: string;
  goal?: {
    description?: string;
    budget?: { wallClockMinutes?: number };
    completion?: { gate?: string };
  };
}

function findStateFiles(projectDir: string, workflow?: string): string[] {
  const stateDir = path.join(projectDir, ".agents", "state");
  if (!fs.existsSync(stateDir)) return [];
  return fs
    .readdirSync(stateDir)
    .filter(
      (f) =>
        /-state-.+\.json$/.test(f) &&
        (!workflow || f.startsWith(`${workflow}-state-`)),
    )
    .map((f) => path.join(stateDir, f));
}

export function registerGoal(program: Command): void {
  addOutputOptions(
    program
      .command("goal:set")
      .description(
        "Attach a goal contract (deterministic stop gate / wall-clock budget) to an active persistent workflow",
      )
      .option(
        "--workflow <name>",
        "Persistent workflow to target (required when several are active)",
      )
      .option("--session <id>", "Vendor session id suffix of the state file")
      .option(
        "--gate <keyword>",
        "Stop gate keyword: typecheck | test | lint (maps to the package.json script of that name; free-form commands are rejected)",
      )
      .option(
        "--budget-minutes <n>",
        "Wall-clock budget in minutes from activation; exceeding it allows an honest partial stop",
      )
      .option("--description <text>", "Human description of the objective"),
  ).action(
    runAction(
      async (options) => {
        const jsonMode = resolveJsonMode(options);
        const projectDir = resolveProjectRoot();

        const gate = options.gate as string | undefined;
        if (gate && !GATE_KEYWORDS.has(gate)) {
          throw new Error(
            `--gate must be one of: ${[...GATE_KEYWORDS].join(", ")} (got ${JSON.stringify(gate)}). ` +
              "Free-form commands are intentionally not supported: the gate value lives in an agent-writable state file and is executed by the Stop hook.",
          );
        }
        const budgetRaw = options.budgetMinutes as string | undefined;
        const budgetMinutes = budgetRaw ? Number(budgetRaw) : undefined;
        if (
          budgetRaw !== undefined &&
          (!Number.isFinite(budgetMinutes) || (budgetMinutes as number) <= 0)
        ) {
          throw new Error(`--budget-minutes must be a positive number`);
        }
        if (!gate && budgetMinutes === undefined && !options.description) {
          throw new Error(
            "Nothing to set: pass at least one of --gate, --budget-minutes, --description",
          );
        }

        let candidates = findStateFiles(
          projectDir,
          options.workflow as string | undefined,
        );
        if (options.session) {
          candidates = candidates.filter((f) =>
            f.endsWith(`-state-${options.session}.json`),
          );
        }
        if (candidates.length === 0) {
          throw new Error(
            "No active persistent-workflow state file found. Start a persistent workflow (orchestrate/ultrawork/work/ralph) first, or check --workflow/--session.",
          );
        }
        if (candidates.length > 1) {
          throw new Error(
            `Multiple active state files match — disambiguate with --workflow/--session:\n${candidates
              .map((f) => `  ${path.basename(f)}`)
              .join("\n")}`,
          );
        }

        const stateFile = candidates[0] as string;
        const state = JSON.parse(
          fs.readFileSync(stateFile, "utf-8"),
        ) as PersistentModeState;
        state.goal = {
          ...state.goal,
          ...(options.description
            ? { description: options.description as string }
            : {}),
          ...(budgetMinutes !== undefined
            ? {
                budget: {
                  ...state.goal?.budget,
                  wallClockMinutes: budgetMinutes,
                },
              }
            : {}),
          ...(gate ? { completion: { ...state.goal?.completion, gate } } : {}),
        };
        fs.writeFileSync(stateFile, JSON.stringify(state, null, 2));

        if (jsonMode) {
          console.log(
            JSON.stringify(
              { file: path.basename(stateFile), goal: state.goal },
              null,
              2,
            ),
          );
        } else {
          console.log(`Goal contract written to ${path.basename(stateFile)}:`);
          if (state.goal?.description)
            console.log(`  description: ${state.goal.description}`);
          if (state.goal?.completion?.gate)
            console.log(
              `  stop gate: ${state.goal.completion.gate} (stop is allowed only when this package script passes)`,
            );
          if (state.goal?.budget?.wallClockMinutes)
            console.log(
              `  budget: ${state.goal.budget.wallClockMinutes} minutes wall-clock (exceeding it allows an honest partial stop)`,
            );
        }
      },
      { supportsJsonOutput: true },
    ),
  );
}
