import * as fs from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import {
  ALL_CLI_VENDORS,
  CLI_SKILLS_DIR,
  INSTALLED_SKILLS_DIR,
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
  const match = content.match(/^vendors:\s*\n((?:\s+-\s+\S+\n?)*)/m);
  if (!match?.[1]) return [...ALL_CLI_VENDORS];

  const vendors = [...match[1].matchAll(/-\s+(\S+)/g)].map(
    (m) => m[1] as CliVendor,
  );
  return vendors.length > 0 ? vendors : [...ALL_CLI_VENDORS];
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

const CODEX_WRAPPER_MARKER = "<!-- oma:generated -->";

function extractWorkflowDescription(filePath: string): string | null {
  let content: string;
  try {
    content = fs.readFileSync(filePath, "utf-8");
  } catch {
    return null;
  }
  const match = content.match(/^---\s*\n([\s\S]*?)\n---/);
  if (!match?.[1]) return null;
  const descMatch = match[1].match(/^description:\s*(.+?)\s*$/m);
  return descMatch?.[1]?.trim() ?? null;
}

function listWorkflowNames(workflowsDir: string): string[] {
  if (!fs.existsSync(workflowsDir)) return [];
  return fs
    .readdirSync(workflowsDir, { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith(".md"))
    .map((entry) => entry.name.slice(0, -".md".length));
}

/**
 * Mirror `.agents/workflows/*.md` into `.codex/skills/<name>/SKILL.md` wrappers so
 * Codex CLI can invoke workflows via `$<name>`. Prunes stale oma-generated
 * wrappers whose workflow no longer exists in SSOT; never touches
 * user-authored skills (those lack the oma:generated marker).
 */
export function installCodexWorkflowSkills(
  sourceDir: string,
  targetDir: string,
): void {
  const workflowsDir = join(sourceDir, ".agents", "workflows");
  const skillsRoot = join(targetDir, ".codex", "skills");
  const names = listWorkflowNames(workflowsDir);

  if (fs.existsSync(skillsRoot)) {
    for (const entry of fs.readdirSync(skillsRoot, { withFileTypes: true })) {
      if (!entry.isDirectory()) continue;
      const skillDir = join(skillsRoot, entry.name);
      const skillFile = join(skillDir, "SKILL.md");
      if (!fs.existsSync(skillFile)) continue;
      let existing: string;
      try {
        existing = fs.readFileSync(skillFile, "utf-8");
      } catch {
        continue;
      }
      if (!existing.includes(CODEX_WRAPPER_MARKER)) continue;
      if (!names.includes(entry.name)) {
        fs.rmSync(skillDir, { recursive: true, force: true });
      }
    }
  }

  if (names.length === 0) return;

  fs.mkdirSync(skillsRoot, { recursive: true });
  for (const name of names) {
    const description =
      extractWorkflowDescription(join(workflowsDir, `${name}.md`)) ??
      `Workflow: ${name}`;
    const skillDir = join(skillsRoot, name);
    const skillFile = join(skillDir, "SKILL.md");
    clearNonDirectory(skillDir);
    fs.mkdirSync(skillDir, { recursive: true });
    const body = `---\nname: ${name}\ndescription: ${description}\n---\n${CODEX_WRAPPER_MARKER}\n\nRead and follow \`.agents/workflows/${name}.md\` step by step.\n`;
    fs.writeFileSync(skillFile, body);
  }
}

export function installRules(sourceDir: string, targetDir: string): void {
  const src = join(sourceDir, ".agents", "rules");
  if (!fs.existsSync(src)) return;

  const dest = join(targetDir, ".agents", "rules");
  clearNonDirectory(dest);
  fs.mkdirSync(dest, { recursive: true });
  fs.cpSync(src, dest, { recursive: true, force: true });
}

/**
 * Extract the top-level `version:` field from a defaults.yaml.
 * Returns null if the file is missing, unreadable, or has no version field.
 * Uses a plain regex so we don't pull a full YAML parser in here.
 */
export function readDefaultsVersion(filePath: string): string | null {
  try {
    if (!fs.existsSync(filePath)) return null;
    const content = fs.readFileSync(filePath, "utf-8");
    const match = content.match(/^version:\s*["']?([^"'\s]+)["']?\s*$/m);
    return match?.[1] ?? null;
  } catch {
    return null;
  }
}

export function installConfigs(
  sourceDir: string,
  targetDir: string,
  force = false,
  options: { updateDefaults?: boolean } = {},
): void {
  const configSrc = join(sourceDir, ".agents", "config");
  const defaultsFile = "defaults.yaml";
  if (fs.existsSync(configSrc)) {
    const configDest = join(targetDir, ".agents", "config");
    fs.mkdirSync(configDest, { recursive: true });

    if (force) {
      fs.cpSync(configSrc, configDest, { recursive: true, force: true });
    } else {
      for (const entry of fs.readdirSync(configSrc, { withFileTypes: true })) {
        const destPath = join(configDest, entry.name);
        const srcPath = join(configSrc, entry.name);

        // defaults.yaml has special handling — it's an SSOT that ships with OMA.
        // User-editable files (models.yaml) are never overwritten; the user owns them.
        if (entry.name === defaultsFile && fs.existsSync(destPath)) {
          const installedVersion = readDefaultsVersion(destPath);
          const bundledVersion = readDefaultsVersion(srcPath);
          if (options.updateDefaults) {
            fs.cpSync(srcPath, destPath);
            console.log(
              `[install] Updated .agents/config/defaults.yaml (${installedVersion ?? "unknown"} → ${bundledVersion ?? "unknown"})`,
            );
          } else if (
            bundledVersion &&
            installedVersion &&
            bundledVersion !== installedVersion
          ) {
            console.warn(
              `[install] .agents/config/defaults.yaml is ${installedVersion}; bundled is ${bundledVersion}. Run 'oma install --update-defaults' to upgrade.`,
            );
          }
          continue;
        }

        if (!fs.existsSync(destPath)) {
          fs.cpSync(
            srcPath,
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
