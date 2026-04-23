import type { Command } from "commander";
import {
  addOutputOptions,
  resolveJsonMode,
  runAction,
} from "../../cli-kit/cli-framework.js";
import { collectDoctorReport, serializeReportAsJson } from "./doctor.js";
import { collectProfileReport } from "./profile.js";
import { renderDoctorReport, renderProfileReport } from "./ui.js";

export async function doctor(
  jsonMode = false,
  profileMode = false,
): Promise<void> {
  if (profileMode) {
    const report = await collectProfileReport(process.cwd());
    await renderProfileReport(report);
    return;
  }

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
      .description("Check CLI installations, MCP configs, and skill status")
      .option("--profile", "Show profile health matrix (auth status per role)"),
    "Output as JSON for CI/CD",
  ).action(
    runAction(
      async (options) => {
        const profileMode = Boolean(
          (options as Record<string, unknown>).profile,
        );
        await doctor(resolveJsonMode(options), profileMode);
      },
      { supportsJsonOutput: true },
    ),
  );
}
