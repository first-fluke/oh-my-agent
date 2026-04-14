import * as fs from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { parse as parseYaml } from "yaml";
import {
  ALL_CLI_VENDORS,
  CLI_SKILLS_DIR,
  INSTALLED_SKILLS_DIR,
  REPO,
  SKILLS,
} from "../constants/index.js";
import type { CliTool, CliVendor, SkillInfo } from "../types/index.js";
import { clearNonDirectory } from "../utils/fs-utils.js";

export * from "../constants/index.js";
export type { CliTool, CliVendor, SkillInfo } from "../types/index.js";
export * from "../utils/fs-utils.js";
export * from "./agent-composer.js";
export * from "./hooks-composer.js";
export * from "./vendor-adapter.js";

/** Read selected vendors from oma-config.yaml. Falls back to all vendors. */
export function readVendorsFromConfig(targetDir: string): CliVendor[] {
  const configPath = join(targetDir, ".agents", "oma-config.yaml");
  if (!fs.existsSync(configPath)) return [...ALL_CLI_VENDORS];

  const content = fs.readFileSync(configPath, "utf-8");

  try {
    const parsed = parseYaml(content) as {
      vendors?: string[];
      default_cli?: string;
      agent_cli_mapping?: Record<string, string>;
    } | null;

    const configured = new Set<CliVendor>();

    if (Array.isArray(parsed?.vendors)) {
      for (const vendor of parsed.vendors) {
        if (ALL_CLI_VENDORS.includes(vendor as CliVendor)) {
          configured.add(vendor as CliVendor);
        }
      }
    }

    if (typeof parsed?.default_cli === "string") {
      const vendor = parsed.default_cli.toLowerCase() as CliVendor;
      if (ALL_CLI_VENDORS.includes(vendor)) {
        configured.add(vendor);
      }
    }

    if (parsed?.agent_cli_mapping && typeof parsed.agent_cli_mapping === "object") {
      for (const value of Object.values(parsed.agent_cli_mapping)) {
        const vendor = String(value).toLowerCase() as CliVendor;
        if (ALL_CLI_VENDORS.includes(vendor)) {
          configured.add(vendor);
        }
      }
    }

    return configured.size > 0 ? [...configured] : [...ALL_CLI_VENDORS];
  } catch {
    return [...ALL_CLI_VENDORS];
  }
}

/** Write selected vendors to oma-config.yaml. */
export function writeVendorsToConfig(
  targetDir: string,
  vendors: CliVendor[],
): void {
  const configPath = join(targetDir, ".agents", "oma-config.yaml");
  if (!fs.existsSync(configPath)) return;

  let content = fs.readFileSync(configPath, "utf-8");
  const vendorsBlock = `vendors:\n${vendors.map((v) => `  - ${v}`).join("\n")}`;

  if (/^vendors:/m.test(content)) {
    content = content.replace(
      /^vendors:\s*\n(?:\s+-\s+\S+\n?)*/m,
      `${vendorsBlock}\n`,
    );
  } else {
    content = `${content.trimEnd()}\n${vendorsBlock}\n`;
  }

  fs.writeFileSync(configPath, content);
}

export function installSkill(
  sourceDir: string,
  skillName: string,
  targetDir: string,
  variant?: string,
): boolean {
  const src = join(sourceDir, ".agents", "skills", skillName);
  if (!fs.existsSync(src)) return false;

  const dest = join(targetDir, INSTALLED_SKILLS_DIR, skillName);
  clearNonDirectory(dest);
  fs.mkdirSync(dest, { recursive: true });
  fs.cpSync(src, dest, { recursive: true, force: true });

  const variantSrcDir = join(src, "variants");
  const stackDir = join(dest, "stack");

  if (variant && fs.existsSync(join(variantSrcDir, variant))) {
    fs.mkdirSync(stackDir, { recursive: true });
    fs.cpSync(join(variantSrcDir, variant), stackDir, {
      recursive: true,
      force: true,
    });
    fs.writeFileSync(
      join(stackDir, "stack.yaml"),
      `language: ${variant}\nsource: preset\n`,
    );
  }

  const destVariantsDir = join(dest, "variants");
  if (fs.existsSync(destVariantsDir)) {
    fs.rmSync(destVariantsDir, { recursive: true, force: true });
  }

  return true;
}

export function installShared(sourceDir: string, targetDir: string): void {
  const src = join(sourceDir, ".agents", "skills", "_shared");
  if (!fs.existsSync(src)) return;

  const dest = join(targetDir, INSTALLED_SKILLS_DIR, "_shared");
  clearNonDirectory(dest);
  fs.mkdirSync(dest, { recursive: true });
  fs.cpSync(src, dest, { recursive: true, force: true });
}

export function installWorkflows(sourceDir: string, targetDir: string): void {
  const src = join(sourceDir, ".agents", "workflows");
  if (!fs.existsSync(src)) return;

  const dest = join(targetDir, ".agents", "workflows");
  clearNonDirectory(dest);
  fs.mkdirSync(dest, { recursive: true });
  fs.cpSync(src, dest, { recursive: true, force: true });
}

export function installRules(sourceDir: string, targetDir: string): void {
  const src = join(sourceDir, ".agents", "rules");
  if (!fs.existsSync(src)) return;

  const dest = join(targetDir, ".agents", "rules");
  clearNonDirectory(dest);
  fs.mkdirSync(dest, { recursive: true });
  fs.cpSync(src, dest, { recursive: true, force: true });
}

export function installConfigs(
  sourceDir: string,
  targetDir: string,
  force = false,
): void {
  const configSrc = join(sourceDir, ".agents", "config");
  if (fs.existsSync(configSrc)) {
    const configDest = join(targetDir, ".agents", "config");
    fs.mkdirSync(configDest, { recursive: true });

    if (force) {
      fs.cpSync(configSrc, configDest, { recursive: true, force: true });
    } else {
      for (const entry of fs.readdirSync(configSrc, { withFileTypes: true })) {
        const destPath = join(configDest, entry.name);
        if (!fs.existsSync(destPath)) {
          fs.cpSync(
            join(configSrc, entry.name),
            destPath,
            entry.isDirectory() ? { recursive: true } : {},
          );
        }
      }
    }
  }

  const mcpSrc = join(sourceDir, ".agents", "mcp.json");
  if (fs.existsSync(mcpSrc)) {
    const agentDir = join(targetDir, ".agents");
    fs.mkdirSync(agentDir, { recursive: true });
    const mcpDest = join(agentDir, "mcp.json");
    if (force || !fs.existsSync(mcpDest)) {
      fs.cpSync(mcpSrc, mcpDest);
    }
  }
}

export function installGlobalWorkflows(sourceDir: string): void {
  const homeDir = process.env.HOME || process.env.USERPROFILE || "";
  const dest = join(homeDir, ".gemini", "antigravity", "global_workflows");
  const src = join(sourceDir, ".agents", "workflows");
  if (!fs.existsSync(src)) return;

  fs.mkdirSync(dest, { recursive: true });
  fs.cpSync(src, dest, { recursive: true, force: true });
}

export function getAllSkills(): SkillInfo[] {
  return [
    ...SKILLS.domain,
    ...SKILLS.design,
    ...SKILLS.coordination,
    ...SKILLS.utility,
    ...SKILLS.infrastructure,
  ];
}

/**
 * Point Cursor's MCP config at the SSOT `.agents/mcp.json` via symlink.
 * Skips if `.agents/mcp.json` is missing, or `.cursor/mcp.json` is a real file.
 */
export function ensureCursorMcpSymlink(targetDir: string): void {
  const agentsMcp = join(targetDir, ".agents", "mcp.json");
  if (!fs.existsSync(agentsMcp)) return;

  const cursorDir = join(targetDir, ".cursor");
  const linkPath = join(cursorDir, "mcp.json");
  const relTarget = relative(cursorDir, agentsMcp);

  try {
    const stat = fs.lstatSync(linkPath);
    if (stat.isSymbolicLink()) {
      const existing = resolve(dirname(linkPath), fs.readlinkSync(linkPath));
      if (existing === resolve(agentsMcp)) return;
      fs.unlinkSync(linkPath);
    } else {
      return;
    }
  } catch {
    // link missing
  }

  fs.mkdirSync(cursorDir, { recursive: true });
  fs.symlinkSync(relTarget, linkPath, "file");
}

/**
 * Deprecated compatibility wrapper. Prefer installVendorAdaptations().
 */
export function installClaudeSkills(
  sourceDir: string,
  targetDir: string,
): void {
  const srcSkills = join(sourceDir, ".claude", "skills");
  const srcAgents = join(sourceDir, ".claude", "agents");
  const destSkills = join(targetDir, ".claude", "skills");
  const destAgents = join(targetDir, ".claude", "agents");

  if (fs.existsSync(srcSkills)) {
    clearNonDirectory(destSkills);
    fs.mkdirSync(destSkills, { recursive: true });
    fs.cpSync(srcSkills, destSkills, { recursive: true, force: true });
  }

  if (fs.existsSync(srcAgents)) {
    clearNonDirectory(destAgents);
    fs.mkdirSync(destAgents, { recursive: true });
    fs.cpSync(srcAgents, destAgents, { recursive: true, force: true });
  }
}

export function createCliSymlinks(
  targetDir: string,
  cliTools: CliTool[],
  skillNames: string[],
): { created: string[]; skipped: string[] } {
  const created: string[] = [];
  const skipped: string[] = [];
  const ssotSkillsDir = resolve(targetDir, INSTALLED_SKILLS_DIR);

  for (const cli of cliTools) {
    const skillsDir = CLI_SKILLS_DIR[cli];
    const linkRootDir = join(targetDir, skillsDir);

    if (!fs.existsSync(linkRootDir)) {
      fs.mkdirSync(linkRootDir, { recursive: true });
    }

    for (const skillName of skillNames) {
      const source = join(ssotSkillsDir, skillName);
      const link = join(linkRootDir, skillName);

      if (!fs.existsSync(source)) {
        skipped.push(`${skillsDir}/${skillName} (source missing)`);
        continue;
      }

      try {
        const stat = fs.lstatSync(link);
        if (stat.isSymbolicLink()) {
          const existing = resolve(dirname(link), fs.readlinkSync(link));
          if (existing === resolve(source)) {
            skipped.push(`${skillsDir}/${skillName} (already linked)`);
            continue;
          }
          fs.unlinkSync(link);
        } else {
          skipped.push(`${skillsDir}/${skillName} (real dir exists)`);
          continue;
        }
      } catch {
        // link missing
      }

      const relativePath = relative(linkRootDir, source);
      fs.symlinkSync(relativePath, link, "dir");
      created.push(`${skillsDir}/${skillName}`);
    }
  }

  return { created, skipped };
}

export function getInstalledSkillNames(targetDir: string): string[] {
  const skillsDir = join(targetDir, INSTALLED_SKILLS_DIR);
  if (!fs.existsSync(skillsDir)) return [];

  return fs
    .readdirSync(skillsDir, { withFileTypes: true })
    .filter((d) => d.isDirectory() && !d.name.startsWith("_"))
    .map((d) => d.name);
}

export function detectExistingCliSymlinkDirs(targetDir: string): CliTool[] {
  const tools: CliTool[] = [];
  for (const [cli, dir] of Object.entries(CLI_SKILLS_DIR)) {
    if (fs.existsSync(join(targetDir, dir))) {
      tools.push(cli as CliTool);
    }
  }
  return tools;
}
