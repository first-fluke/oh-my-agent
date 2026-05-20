import type { Command } from "commander";
import {
  addOutputOptions,
  resolveJsonMode,
  runAction,
} from "../../utils/cli-framework.js";
import { runSkillsAudit } from "./audit.js";

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
}
