import * as p from "@clack/prompts";
import pc from "picocolors";
import { getAllSkills } from "../../../platform/skills-installer.js";
import { installSkillsFromRemote } from "../doctor.js";
import type { DoctorReport } from "../types.js";

export async function promptRepair(report: DoctorReport): Promise<void> {
  if (report.missingSkills.length === 0) return;

  const shouldRepair = await p.confirm({
    message: `Found ${report.missingSkills.length} missing/incomplete skill(s). Install them?`,
    initialValue: true,
  });

  if (p.isCancel(shouldRepair)) {
    p.cancel("Cancelled.");
    process.exit(0);
  }
  if (!shouldRepair) return;

  const allSkillNames = report.missingSkills.map((s) => s.name);
  const selectMode = await p.select({
    message: "Which skills to install?",
    options: [
      {
        value: "all",
        label: `✨ All (${allSkillNames.length} skills)`,
        hint: "Recommended",
      },
      { value: "select", label: "🔧 Select individually" },
    ],
  });

  if (p.isCancel(selectMode)) {
    p.cancel("Cancelled.");
    process.exit(0);
  }

  let skillsToInstall: string[];

  if (selectMode === "select") {
    const allSkills = getAllSkills();
    const selected = await p.multiselect({
      message: "Select skills to install:",
      options: report.missingSkills.map((s) => {
        const info = allSkills.find((sk) => sk.name === s.name);
        return { value: s.name, label: s.name, hint: info?.desc || "" };
      }),
      required: true,
    });

    if (p.isCancel(selected)) {
      p.cancel("Cancelled.");
      process.exit(0);
    }
    skillsToInstall = selected as string[];
  } else {
    skillsToInstall = allSkillNames;
  }

  const spinner = p.spinner();
  spinner.start("Downloading source...");
  try {
    await installSkillsFromRemote(report.cwd, skillsToInstall, (name) => {
      spinner.message(`Installing ${pc.cyan(name)}...`);
    });
    spinner.stop(`Installed ${skillsToInstall.length} skill(s)!`);
    p.note(
      skillsToInstall.map((s) => `${pc.green("✓")} ${s}`).join("\n"),
      "Installed Skills",
    );
  } catch (error) {
    spinner.stop("Installation failed");
    p.log.error(error instanceof Error ? error.message : String(error));
  }
}
