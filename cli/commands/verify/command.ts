import { existsSync } from "node:fs";
import type { Command } from "commander";
import {
  addOutputOptions,
  resolveJsonMode,
  runAction,
} from "../../cli-kit/cli-framework.js";
import { printVerifyError, renderVerifyReport } from "./ui.js";
import { collectVerifyReport, isValidAgent, VALID_AGENTS } from "./verify.js";

export async function verify(
  agentType: string,
  workspace: string,
  jsonMode = false,
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

  const report = collectVerifyReport(normalized, resolvedWorkspace);

  if (jsonMode) {
    console.log(JSON.stringify(report, null, 2));
    process.exit(report.summary.failed > 0 ? 1 : 0);
  }

  renderVerifyReport(report);
  process.exit(report.summary.failed > 0 ? 1 : 0);
}

export function registerVerify(program: Command): void {
  addOutputOptions(
    program
      .command("verify <agent-type>")
      .description(
        "Verify subagent output (backend/frontend/mobile/qa/debug/pm)",
      )
      .option("-w, --workspace <path>", "Workspace path", process.cwd()),
  ).action(
    runAction(
      async (agentType, options) => {
        await verify(agentType, options.workspace, resolveJsonMode(options));
      },
      { supportsJsonOutput: true },
    ),
  );
}
