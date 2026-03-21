import {
  cpSync,
  existsSync,
  lstatSync,
  mkdirSync,
  readdirSync,
  readlinkSync,
  symlinkSync,
  unlinkSync,
} from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import type { SkillInfo, SkillsRegistry } from "../types/index.js";

export const REPO = "first-fluke/oh-my-agent";
export const INSTALLED_SKILLS_DIR = ".agents/skills";

export const SKILLS: SkillsRegistry = {
  domain: [
    { name: "oma-frontend", desc: "React/Next.js UI specialist" },
    { name: "oma-backend", desc: "FastAPI/SQLAlchemy API specialist" },
    {
      name: "oma-db",
      desc: "SQL/NoSQL data modeling, normalization, integrity, and capacity specialist",
    },
    { name: "oma-mobile", desc: "Flutter/Dart mobile specialist" },
  ],
  coordination: [
    { name: "oma-brainstorm", desc: "Design-first ideation before planning" },
    { name: "oma-pm", desc: "Product manager - task decomposition" },
    { name: "oma-qa", desc: "QA - OWASP, Lighthouse, WCAG" },
    { name: "oma-coordination", desc: "Manual multi-agent orchestration" },
    { name: "oma-orchestrator", desc: "Automated parallel CLI execution" },
  ],
  utility: [
    { name: "oma-debug", desc: "Bug fixing specialist" },
    { name: "oma-commit", desc: "Conventional Commits helper" },
    { name: "oma-translator", desc: "Context-aware multilingual translation" },
  ],
  infrastructure: [
    {
      name: "oma-tf-infra",
      desc: "Multi-cloud infrastructure with Terraform - AWS, GCP, Azure, OCI support",
    },
    {
      name: "oma-dev-workflow",
      desc: "Monorepo developer workflows - mise tasks, git hooks, CI/CD, release automation",
    },
  ],
};

export const PRESETS: Record<string, string[]> = {
  fullstack: [
    "oma-brainstorm",
    "oma-frontend",
    "oma-backend",
    "oma-db",
    "oma-pm",
    "oma-qa",
    "oma-debug",
    "oma-commit",
    "oma-tf-infra",
    "oma-dev-workflow",
  ],
  frontend: [
    "oma-brainstorm",
    "oma-frontend",
    "oma-pm",
    "oma-qa",
    "oma-debug",
    "oma-commit",
  ],
  backend: [
    "oma-brainstorm",
    "oma-backend",
    "oma-db",
    "oma-pm",
    "oma-qa",
    "oma-debug",
    "oma-commit",
    "oma-dev-workflow",
  ],
  mobile: [
    "oma-brainstorm",
    "oma-mobile",
    "oma-pm",
    "oma-qa",
    "oma-debug",
    "oma-commit",
  ],
  devops: [
    "oma-brainstorm",
    "oma-tf-infra",
    "oma-dev-workflow",
    "oma-pm",
    "oma-qa",
    "oma-debug",
    "oma-commit",
  ],
  all: [
    ...SKILLS.domain,
    ...SKILLS.coordination,
    ...SKILLS.utility,
    ...SKILLS.infrastructure,
  ].map((s) => s.name),
};

/**
 * Remove path if it exists as a symlink or file (not a real directory).
 * Handles re-installation where symlinks from a previous install
 * conflict with directory copies.
 */
function clearNonDirectory(path: string): void {
  try {
    if (!lstatSync(path).isDirectory()) {
      unlinkSync(path);
    }
  } catch {
    // Path doesn't exist
  }
}

export function installSkill(
  sourceDir: string,
  skillName: string,
  targetDir: string,
): boolean {
  const src = join(sourceDir, ".agents", "skills", skillName);
  if (!existsSync(src)) return false;

  const dest = join(targetDir, INSTALLED_SKILLS_DIR, skillName);
  clearNonDirectory(dest);
  mkdirSync(dest, { recursive: true });
  cpSync(src, dest, { recursive: true, force: true });
  return true;
}

export function installShared(sourceDir: string, targetDir: string): void {
  const src = join(sourceDir, ".agents", "skills", "_shared");
  if (!existsSync(src)) return;

  const dest = join(targetDir, INSTALLED_SKILLS_DIR, "_shared");
  clearNonDirectory(dest);
  mkdirSync(dest, { recursive: true });
  cpSync(src, dest, { recursive: true, force: true });
}

export function installWorkflows(sourceDir: string, targetDir: string): void {
  const src = join(sourceDir, ".agents", "workflows");
  if (!existsSync(src)) return;

  const dest = join(targetDir, ".agents", "workflows");
  clearNonDirectory(dest);
  mkdirSync(dest, { recursive: true });
  cpSync(src, dest, { recursive: true, force: true });
}

export function installConfigs(
  sourceDir: string,
  targetDir: string,
  force = false,
): void {
  const configSrc = join(sourceDir, ".agents", "config");
  if (existsSync(configSrc)) {
    const configDest = join(targetDir, ".agents", "config");
    mkdirSync(configDest, { recursive: true });

    if (force) {
      cpSync(configSrc, configDest, { recursive: true, force: true });
    } else {
      // Only copy config files that don't already exist (preserve user customizations)
      for (const entry of readdirSync(configSrc, { withFileTypes: true })) {
        const destPath = join(configDest, entry.name);
        if (!existsSync(destPath)) {
          cpSync(
            join(configSrc, entry.name),
            destPath,
            entry.isDirectory() ? { recursive: true } : {},
          );
        }
      }
    }
  }

  const mcpSrc = join(sourceDir, ".agents", "mcp.json");
  if (existsSync(mcpSrc)) {
    const agentDir = join(targetDir, ".agents");
    mkdirSync(agentDir, { recursive: true });
    const mcpDest = join(agentDir, "mcp.json");
    if (force || !existsSync(mcpDest)) {
      cpSync(mcpSrc, mcpDest);
    }
  }
}

export function installGlobalWorkflows(sourceDir: string): void {
  const homeDir = process.env.HOME || process.env.USERPROFILE || "";
  const dest = join(homeDir, ".gemini", "antigravity", "global_workflows");
  const src = join(sourceDir, ".agents", "workflows");
  if (!existsSync(src)) return;

  mkdirSync(dest, { recursive: true });
  cpSync(src, dest, { recursive: true, force: true });
}

export function installClaudeSkills(
  sourceDir: string,
  targetDir: string,
): void {
  const srcSkills = join(sourceDir, ".claude", "skills");
  const srcAgents = join(sourceDir, ".claude", "agents");
  const destSkills = join(targetDir, ".claude", "skills");
  const destAgents = join(targetDir, ".claude", "agents");

  if (existsSync(srcSkills)) {
    clearNonDirectory(destSkills);
    // Clear symlinks inside destination that conflict with source directories
    clearConflictingEntries(srcSkills, destSkills);
    mkdirSync(destSkills, { recursive: true });
    cpSync(srcSkills, destSkills, { recursive: true, force: true });
  }

  if (existsSync(srcAgents)) {
    clearNonDirectory(destAgents);
    clearConflictingEntries(srcAgents, destAgents);
    mkdirSync(destAgents, { recursive: true });
    cpSync(srcAgents, destAgents, { recursive: true, force: true });
  }
}

/**
 * For each entry in sourceDir that is a directory, remove the corresponding
 * entry in destDir if it exists as a non-directory (symlink or file).
 * Prevents cpSync from failing when overwriting symlinks with directories.
 */
function clearConflictingEntries(sourceDir: string, destDir: string): void {
  if (!existsSync(destDir)) return;

  try {
    for (const entry of readdirSync(sourceDir, { withFileTypes: true })) {
      if (entry.isDirectory()) {
        clearNonDirectory(join(destDir, entry.name));
      }
    }
  } catch {
    // Best-effort cleanup
  }
}

export function getAllSkills(): SkillInfo[] {
  return [
    ...SKILLS.domain,
    ...SKILLS.coordination,
    ...SKILLS.utility,
    ...SKILLS.infrastructure,
  ];
}

export type CliTool = "claude" | "copilot";

export const CLI_SKILLS_DIR: Record<CliTool, string> = {
  claude: ".claude/skills",
  copilot: ".github/skills",
};

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

    if (!existsSync(linkRootDir)) {
      mkdirSync(linkRootDir, { recursive: true });
    }

    for (const skillName of skillNames) {
      const source = join(ssotSkillsDir, skillName);
      const link = join(linkRootDir, skillName);

      if (!existsSync(source)) {
        skipped.push(`${skillsDir}/${skillName} (source missing)`);
        continue;
      }

      try {
        const stat = lstatSync(link);
        if (stat.isSymbolicLink()) {
          const existing = resolve(dirname(link), readlinkSync(link));
          if (existing === resolve(source)) {
            skipped.push(`${skillsDir}/${skillName} (already linked)`);
            continue;
          }
          unlinkSync(link);
        } else {
          skipped.push(`${skillsDir}/${skillName} (real dir exists)`);
          continue;
        }
      } catch (_e) {
        // Link doesn't exist yet — will create below
      }

      const relativePath = relative(linkRootDir, source);
      symlinkSync(relativePath, link, "dir");
      created.push(`${skillsDir}/${skillName}`);
    }
  }

  return { created, skipped };
}

export function getInstalledSkillNames(targetDir: string): string[] {
  const skillsDir = join(targetDir, INSTALLED_SKILLS_DIR);
  if (!existsSync(skillsDir)) return [];

  return readdirSync(skillsDir, { withFileTypes: true })
    .filter((d) => d.isDirectory() && !d.name.startsWith("_"))
    .map((d) => d.name);
}

export function detectExistingCliSymlinkDirs(targetDir: string): CliTool[] {
  const tools: CliTool[] = [];
  for (const [cli, dir] of Object.entries(CLI_SKILLS_DIR)) {
    if (existsSync(join(targetDir, dir))) {
      tools.push(cli as CliTool);
    }
  }
  return tools;
}
