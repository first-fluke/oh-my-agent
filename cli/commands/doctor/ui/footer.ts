import * as p from "@clack/prompts";
import pc from "picocolors";
import { checkStarred } from "../../../io/github.js";
import type { DoctorReport } from "../types.js";

export function renderFooter(report: DoctorReport): void {
  if (report.hasSerena) {
    p.note(
      `${pc.green("✅")} Serena memory directory exists\n${pc.dim(`${report.serenaFileCount} memory files found`)}`,
      "Serena Memory",
    );
  } else {
    p.note(
      `${pc.yellow("⚠️")} Serena memory directory not found\n${pc.dim("Dashboard will show 'No agents detected'")}`,
      "Serena Memory",
    );
  }

  for (const doc of report.vendorDocs) {
    if (!doc.required) continue;
    const label = `./${doc.fileName}`;
    if (doc.hasOmaBlock) {
      p.note(`${pc.green("✅")} OMA block found in ${label}`, doc.fileName);
    } else {
      p.note(
        `${pc.yellow("⚠️")} OMA block missing in ${label}\n${pc.dim("Run 'oh-my-agent' to install or reinstall")}`,
        doc.fileName,
      );
    }
  }

  if (report.totalIssues === 0) {
    p.outro(pc.green("✅ All checks passed! Ready to use."));
  } else {
    p.outro(
      pc.yellow(`⚠️  Found ${report.totalIssues} issue(s). See details above.`),
    );
  }

  if (checkStarred()) {
    p.note(`${pc.green("⭐")} Thank you for starring oh-my-agent!`, "Support");
  } else {
    p.note(
      `${pc.yellow("❤️")} Enjoying oh-my-agent? Give it a star or sponsor!\n${pc.dim("gh api --method PUT /user/starred/first-fluke/oh-my-agent")}\n${pc.dim("https://github.com/sponsors/first-fluke")}`,
      "Support",
    );
  }
}
