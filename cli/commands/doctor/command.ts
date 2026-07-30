import type { Command } from "commander";
import { safeGetInstallRoot } from "../../platform/install-context.js";
import {
  addOutputOptions,
  resolveJsonMode,
  runAction,
} from "../../utils/cli-framework.js";
import { collectProfileReport } from "./profile.js";
import { collectDoctorReport, serializeReportAsJson } from "./report.js";
import { renderDoctorReport, renderProfileReport } from "./ui.js";

export async function doctor(
  jsonMode = false,
  profileMode = false,
  healCheckAgent?: string,
): Promise<void> {
  if (profileMode) {
    // Install root, not process.cwd(): `--global` must read ~/.agents/oma-config.yaml.
    // In project mode this resolves to process.cwd(), preserving the walk-up
    // that lets `oma doctor --profile` work from a subdirectory.
    const report = await collectProfileReport(safeGetInstallRoot());
    await renderProfileReport(report);
    return;
  }

  const report = await collectDoctorReport({ healCheckAgent });
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
      .option("--profile", "Show profile health matrix (auth status per role)")
      .option(
        "--heal-check <agentType>",
        "Include self-healing gate check for an agent",
      ),
    "Output as JSON for CI/CD",
  ).action(
    runAction(
      async (options) => {
        const profileMode = Boolean(
          (options as Record<string, unknown>).profile,
        );
        await doctor(
          resolveJsonMode(options),
          profileMode,
          (options as Record<string, unknown>).healCheck as string | undefined,
        );
      },
      { supportsJsonOutput: true },
    ),
  );
}
