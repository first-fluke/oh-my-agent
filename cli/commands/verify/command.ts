import { existsSync } from "node:fs";
import type { Command } from "commander";
import {
  addOutputOptions,
  resolveJsonMode,
  runAction,
} from "../../utils/cli-framework.js";
import { collectVerifyReport, isValidAgent, VALID_AGENTS } from "./report.js";
import type { VerifySelection } from "./run-selection.js";
import {
  DEFAULT_MAX_FALSE_FIRE_PCT,
  DEFAULT_MAX_MISSED_FIRE_PCT,
  runVerifyTriggers,
} from "./triggers-command.js";
import { renderTriggersReport } from "./triggers-ui.js";
import { printVerifyError, renderVerifyReport } from "./ui.js";

export async function verify(
  agentType: string,
  workspace: string,
  jsonMode = false,
  selection: VerifySelection = {},
): Promise<void> {
  const normalized = agentType.toLowerCase();
  if (!isValidAgent(normalized)) {
    const error = `Invalid agent type: ${agentType}. Valid types: ${VALID_AGENTS.join(", ")}`;
    if (jsonMode) console.log(JSON.stringify({ ok: false, error }));
    else printVerifyError(error);
    process.exit(2);
  }

  const resolvedWorkspace = workspace || process.cwd();
  if (!existsSync(resolvedWorkspace)) {
    const error = `Workspace not found: ${resolvedWorkspace}`;
    if (jsonMode) console.log(JSON.stringify({ ok: false, error }));
    else printVerifyError(error);
    process.exit(2);
  }

  const report = collectVerifyReport(normalized, resolvedWorkspace, selection);

  if (jsonMode) {
    console.log(JSON.stringify(report, null, 2));
    process.exit(report.summary.failed > 0 ? 1 : 0);
  }

  renderVerifyReport(report);
  process.exit(report.summary.failed > 0 ? 1 : 0);
}

export interface VerifyTriggersOptions {
  json?: boolean;
  output?: string;
  corpus?: string;
  maxFalseFire?: string;
  maxMissedFire?: string;
}

export async function verifyTriggers(
  options: VerifyTriggersOptions,
): Promise<void> {
  const jsonMode = resolveJsonMode(options);
  const maxFalseFire = options.maxFalseFire
    ? Number(options.maxFalseFire)
    : DEFAULT_MAX_FALSE_FIRE_PCT;
  const maxMissedFire = options.maxMissedFire
    ? Number(options.maxMissedFire)
    : DEFAULT_MAX_MISSED_FIRE_PCT;

  const { report, thresholds, passed } = await runVerifyTriggers({
    corpusPath: options.corpus,
    maxFalseFire,
    maxMissedFire,
  });

  if (jsonMode) {
    console.log(JSON.stringify({ ok: passed, thresholds, report }, null, 2));
  } else {
    renderTriggersReport(report, thresholds, passed);
  }
  process.exit(passed ? 0 : 1);
}

/**
 * `verify` is a parent command with two faces, kept backward compatible:
 *   - `oma verify <agent-type>` (default subcommand — original behavior,
 *     unchanged) verifies a subagent's output against acceptance checks.
 *   - `oma verify triggers` (sibling subcommand) measures the keyword
 *     detector's trigger accuracy against a labeled prompt corpus.
 * Commander resolves an argument that doesn't match a known subcommand name
 * (e.g. "backend") to the `isDefault` subcommand below, so `verify backend`
 * keeps working exactly as before.
 */
export function registerVerify(program: Command): void {
  const verifyCmd = program
    .command("verify")
    .description(
      "Verify subagent output (backend/frontend/mobile/qa/debug/pm), or measure keyword-detector trigger accuracy",
    );

  addOutputOptions(
    verifyCmd
      .command("agent <agent-type>", { isDefault: true, hidden: true })
      .option("-w, --workspace <path>", "Workspace path", process.cwd())
      .option(
        "--session-id <id>",
        "Verify the specified session plan and reports",
      )
      .option(
        "--task-id <id>",
        "Select one task's scope and report in the session",
      )
      .option(
        "--run-id <id>",
        "Verify one exact run; infer session/task from its receipt",
      ),
  ).action(
    runAction(
      async (agentType, options) => {
        await verify(agentType, options.workspace, resolveJsonMode(options), {
          sessionId: options.sessionId,
          taskId: options.taskId,
          runId: options.runId,
        });
      },
      { supportsJsonOutput: true },
    ),
  );

  addOutputOptions(
    verifyCmd
      .command("triggers")
      .description(
        "Measure keyword-detector trigger accuracy against a labeled prompt corpus",
      )
      .option("--corpus <path>", "Override the trigger corpus JSON path")
      .option(
        "--max-false-fire <pct>",
        `Fail if false-fire rate exceeds this percent (default ${DEFAULT_MAX_FALSE_FIRE_PCT})`,
      )
      .option(
        "--max-missed-fire <pct>",
        `Fail if missed-fire rate exceeds this percent (default ${DEFAULT_MAX_MISSED_FIRE_PCT})`,
      ),
  ).action(
    runAction(
      async (options) => {
        await verifyTriggers(options);
      },
      { supportsJsonOutput: true },
    ),
  );
}
