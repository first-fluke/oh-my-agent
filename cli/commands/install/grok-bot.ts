import { downloadAndExtract } from "../../io/tarball.js";
import { installGrokBotSkills } from "../../platform/grok-bot-skills.js";

/** Bot's shared library is independent of project installs and CLI vendors. */
export async function installGrokBot(options: {
  workflowsDir?: string;
  skills?: readonly string[];
}): Promise<void> {
  const payload = await downloadAndExtract();
  try {
    for (const warning of payload.warnings) console.warn(warning);
    const result = installGrokBotSkills(payload.dir, options);
    console.log(
      `Installed ${result.installed.length} Oh My Agent skills in ${result.directory}`,
    );
    console.log(result.installed.join(", "));
    console.log(
      "In Grok Bot, enable the skills under Connect apps → Private skills if needed, then ask for a skill by name (for example, oma-qa).",
    );
    console.log("Run the same install command again to update these skills.");
  } finally {
    payload.cleanup();
  }
}
