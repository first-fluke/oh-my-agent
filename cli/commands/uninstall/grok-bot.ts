import * as p from "@clack/prompts";
import { uninstallGrokBotSkills } from "../../platform/grok-bot-skills.js";

export async function uninstallGrokBot(options: {
  workflowsDir?: string;
  dryRun?: boolean;
  yes?: boolean;
}): Promise<void> {
  const preview = uninstallGrokBotSkills({ ...options, dryRun: true });
  p.note(
    [
      `Library: ${preview.directory}`,
      `Owned files to remove: ${preview.removed.length}`,
      `Modified or user-authored files to preserve: ${preview.preserved.length}`,
    ].join("\n"),
    "Grok Bot uninstall",
  );
  if (options.dryRun) {
    p.outro("Dry-run — no files were changed.");
    return;
  }
  if (preview.removed.length === 0 && preview.preserved.length === 0) {
    p.outro("Nothing to remove.");
    return;
  }
  const yes = options.yes === true || process.env.OMA_YES === "1";
  if (!yes) {
    if (process.env.CI === "true" || process.env.CI === "1") {
      throw new Error("Refusing to uninstall in CI without --yes.");
    }
    const confirmed = await p.confirm({
      message: `Remove Oh My Agent's owned skill files from ${preview.directory}?`,
      initialValue: false,
    });
    if (p.isCancel(confirmed) || !confirmed) {
      p.cancel("Uninstall cancelled.");
      return;
    }
  }
  const result = uninstallGrokBotSkills(options);
  p.outro(
    `Removed ${result.removed.length} owned files. Preserved ${result.preserved.length} modified or user-authored files and all unrelated skills.`,
  );
}
