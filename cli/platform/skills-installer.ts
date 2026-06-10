import { SKILLS } from "../constants/index.js";
import type { SkillInfo } from "../types/index.js";

export * from "../constants/index.js";
export type { CliTool, CliVendor, SkillInfo } from "../types/index.js";
export * from "../utils/fs-utils.js";
export * from "./agent-composer.js";
export * from "./fs-link.js";
export * from "./hooks-composer.js";
export {
  applyCursorMcpConfig,
  applyCursorMcpSymlink,
} from "./skills-installer/cursor-mcp.js";
export {
  createCliSymlinks,
  createVendorSymlinks,
  detectExistingCliSymlinkDirs,
  getInstalledSkillNames,
} from "./skills-installer/skill-symlinks.js";
export {
  installAgents,
  installClaudeSkills,
  installConfigs,
  installGlobalWorkflows,
  installHooks,
  installRules,
  installShared,
  installSkill,
  installWorkflows,
} from "./skills-installer/ssot-install.js";
export {
  readVendorsFromConfig,
  writeVendorsToConfig,
} from "./skills-installer/vendor-config.js";
export {
  getVendorDisplayPath,
  isExtensionVendor,
  isHookVendor,
  vendorRequiresHomeConsent,
  vendorSkillsDir,
} from "./skills-installer/vendor-dirs.js";
export {
  createVendorWorkflowSymlinks,
  getInstalledWorkflowNames,
  installCopilotWorkflowPrompts,
} from "./skills-installer/workflow-links.js";
export * from "./vendor-adapter.js";

export function getAllSkills(): SkillInfo[] {
  return [
    ...SKILLS.domain,
    ...SKILLS.design,
    ...SKILLS.coordination,
    ...SKILLS.utility,
    ...SKILLS.infrastructure,
  ];
}
