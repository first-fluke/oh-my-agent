import type { Command } from "commander";
import {
  addOutputOptions,
  resolveJsonMode,
  runAction,
} from "../../cli-kit/cli-framework.js";
import { collectDoctorReport, serializeReportAsJson } from "./doctor.js";
import { renderDoctorReport } from "./ui.js";

export async function doctor(jsonMode = false): Promise<void> {
  const report = await collectDoctorReport();
  if (jsonMode) {
    console.log(serializeReportAsJson(report));
    process.exit(report.totalIssues === 0 ? 0 : 1);
  }
  await renderDoctorReport(report);
}

export function registerDoctor(program: Command): void {
  addOutputOptions(
    program
      .command("doctor")
      .description("Check CLI installations, MCP configs, and skill status"),
    "Output as JSON for CI/CD",
  ).action(
    runAction(
      async (options) => {
        await doctor(resolveJsonMode(options));
      },
      { supportsJsonOutput: true },
    ),
  );
}
