import pc from "picocolors";
import {
  diffArtifacts,
  hasArtifactChanges,
  readSkillDescription,
  readWorkflowDescription,
  snapshotArtifacts,
} from "../../../platform/manifest.js";
import type { UpdateUI } from "./ui.js";

export type NewSkillNote = {
  name: string;
  desc: ReturnType<typeof readSkillDescription>;
};

/** Render the "What's new" note comparing artifacts before/after the update. */
export function noteArtifactDiff(
  ui: UpdateUI,
  cwd: string,
  beforeArtifacts: ReturnType<typeof snapshotArtifacts>,
): void {
  const artifactDiff = diffArtifacts(beforeArtifacts, snapshotArtifacts(cwd));
  if (hasArtifactChanges(artifactDiff)) {
    const lines: string[] = [];
    if (artifactDiff.addedSkills.length > 0) {
      lines.push(pc.green("+ Skills"));
      for (const name of artifactDiff.addedSkills) {
        const desc = readSkillDescription(cwd, name);
        lines.push(
          desc ? `  ${pc.cyan(name)}: ${pc.dim(desc)}` : `  ${pc.cyan(name)}`,
        );
      }
    }
    if (artifactDiff.addedWorkflows.length > 0) {
      lines.push(pc.green("+ Workflows"));
      for (const name of artifactDiff.addedWorkflows) {
        const desc = readWorkflowDescription(cwd, name);
        lines.push(
          desc ? `  ${pc.cyan(name)}: ${pc.dim(desc)}` : `  ${pc.cyan(name)}`,
        );
      }
    }
    if (artifactDiff.removedSkills.length > 0) {
      lines.push(
        `${pc.red("- Skills")}    ${artifactDiff.removedSkills.join(", ")}`,
      );
    }
    if (artifactDiff.removedWorkflows.length > 0) {
      lines.push(
        `${pc.red("- Workflows")} ${artifactDiff.removedWorkflows.join(", ")}`,
      );
    }
    ui.note(lines.join("\n"), "What's new");
  }
}

/** Render the "New skills available" note for skills pruned during the update. */
export function noteNewSkills(
  ui: UpdateUI,
  newSkillNotes: NewSkillNote[],
): void {
  if (newSkillNotes.length > 0) {
    const plural = newSkillNotes.length === 1 ? "" : "s";
    const lines = [
      pc.dim(
        `${newSkillNotes.length} new skill${plural} shipped in this release but ${newSkillNotes.length === 1 ? "was" : "were"} not installed:`,
      ),
      ...newSkillNotes.map(({ name, desc }) =>
        desc ? `  ${pc.cyan(name)}: ${pc.dim(desc)}` : `  ${pc.cyan(name)}`,
      ),
      pc.dim(
        `Run ${pc.cyan("oma update --with-new-skills")} to add ${newSkillNotes.length === 1 ? "it" : "them"}.`,
      ),
    ];
    ui.note(lines.join("\n"), "New skills available");
  }
}
