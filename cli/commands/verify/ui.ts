import * as p from "@clack/prompts";
import pc from "picocolors";
import type { VerifyResult } from "../../types/index.js";

export function printVerifyError(message: string): void {
  p.log.error(message);
}

export function renderVerifyReport(result: VerifyResult): void {
  console.clear();
  p.intro(pc.bgCyan(pc.white(` 🔍 Verify: ${result.agent} agent `)));
  p.note(pc.dim(result.workspace), "Workspace");

  const rows = result.checks.map((check) => {
    let statusIcon: string;
    switch (check.status) {
      case "pass":
        statusIcon = pc.green("PASS");
        break;
      case "fail":
        statusIcon = pc.red("FAIL");
        break;
      case "warn":
        statusIcon = pc.yellow("WARN");
        break;
      default:
        statusIcon = pc.dim("SKIP");
    }
    const name = check.name.padEnd(26);
    const status = statusIcon.padEnd(6);
    const message = (check.message || "-").slice(0, 27).padEnd(27);
    return `│ ${name} │ ${status} │ ${message} │`;
  });

  const table = [
    "┌────────────────────────────┬────────┬─────────────────────────────┐",
    `│ ${pc.bold("Check")}                        │ ${pc.bold("Status")} │ ${pc.bold("Details")}                     │`,
    "├────────────────────────────┼────────┼─────────────────────────────┤",
    ...rows,
    "└────────────────────────────┴────────┴─────────────────────────────┘",
  ].join("\n");

  console.log(table);
  console.log();

  const { passed, failed, warned } = result.summary;
  const summaryText = `${pc.green(`${passed} passed`)}, ${pc.red(`${failed} failed`)}, ${pc.yellow(`${warned} warnings`)}`;
  if (failed > 0) {
    p.outro(pc.red(`❌ Verification failed: ${summaryText}`));
  } else {
    p.outro(pc.green(`✅ Verification passed: ${summaryText}`));
  }
}
