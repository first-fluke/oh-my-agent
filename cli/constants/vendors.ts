import type { CliTool, CliVendor } from "../types/index.js";

export const REPO = "first-fluke/oh-my-agent";
export const INSTALLED_SKILLS_DIR = ".agents/skills";

export const ALL_CLI_VENDORS: CliVendor[] = [
  "claude",
  "codex",
  "copilot",
  "cursor",
  "gemini",
  "hermes",
  "qwen",
];

export type SkillTargetBase = "project" | "home";

export interface SkillTargetSpec {
  base: SkillTargetBase;
  path: string;
}

export const CLI_SKILLS_DIR: Record<CliTool, SkillTargetSpec> = {
  claude: { base: "project", path: ".claude/skills" },
  copilot: { base: "project", path: ".github/skills" },
  hermes: { base: "home", path: ".hermes/skills/oma" },
};
