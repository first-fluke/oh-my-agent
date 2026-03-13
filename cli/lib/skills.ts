import { execSync } from "node:child_process";
import {
  existsSync,
  lstatSync,
  mkdirSync,
  readlinkSync,
  symlinkSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import type { SkillInfo, SkillsRegistry } from "../types/index.js";

export const REPO = "first-fluke/oh-my-agent";
export const GITHUB_RAW = `https://raw.githubusercontent.com/${REPO}/main/.agents/skills`;
export const GITHUB_AGENT_ROOT = `https://raw.githubusercontent.com/${REPO}/main/.agents`;
export const INSTALLED_SKILLS_DIR = ".agents/skills";

function ghCliAvailable(): boolean {
  try {
    execSync("gh --version", { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}

async function fetchDirectoryContentsGh(
  skillName: string,
  dir: string,
): Promise<string[]> {
  try {
    const output = execSync(
      `gh api repos/${REPO}/contents/.agents/skills/${skillName}/${dir} --jq '.[] | select(.type == "file") | .name'`,
      { encoding: "utf-8", stdio: ["pipe", "pipe", "ignore"] },
    );
    const files = output.trim().split("\n").filter(Boolean);
    return files.map((f) => `${dir}/${f}`);
  } catch {
    return [];
  }
}

async function fetchDirectoryContentsApi(
  skillName: string,
  dir: string,
): Promise<string[]> {
  const url = `https://api.github.com/repos/${REPO}/contents/.agents/skills/${skillName}/${dir}`;
  const res = await fetch(url);
  if (!res.ok) return [];

  const items = (await res.json()) as Array<{ type: string; name: string }>;
  return items
    .filter((item) => item.type === "file")
    .map((item) => `${dir}/${item.name}`);
}

async function fetchDirectoryContents(
  skillName: string,
  dir: string,
): Promise<string[]> {
  if (ghCliAvailable()) {
    return fetchDirectoryContentsGh(skillName, dir);
  }
  return fetchDirectoryContentsApi(skillName, dir);
}

export const SKILLS: SkillsRegistry = {
  domain: [
    { name: "frontend-agent", desc: "React/Next.js UI specialist" },
    { name: "backend-agent", desc: "FastAPI/SQLAlchemy API specialist" },
    { name: "mobile-agent", desc: "Flutter/Dart mobile specialist" },
  ],
  coordination: [
    { name: "brainstorm", desc: "Design-first ideation before planning" },
    { name: "pm-agent", desc: "Product manager - task decomposition" },
    { name: "qa-agent", desc: "QA - OWASP, Lighthouse, WCAG" },
    { name: "workflow-guide", desc: "Manual multi-agent orchestration" },
    { name: "orchestrator", desc: "Automated parallel CLI execution" },
  ],
  utility: [
    { name: "debug-agent", desc: "Bug fixing specialist" },
    { name: "commit", desc: "Conventional Commits helper" },
  ],
  infrastructure: [
    {
      name: "tf-infra-agent",
      desc: "Multi-cloud infrastructure with Terraform - AWS, GCP, Azure, OCI support",
    },
    {
      name: "developer-workflow",
      desc: "Monorepo developer workflows - mise tasks, git hooks, CI/CD, release automation",
    },
  ],
};

export const PRESETS: Record<string, string[]> = {
  fullstack: [
    "brainstorm",
    "frontend-agent",
    "backend-agent",
    "pm-agent",
    "qa-agent",
    "debug-agent",
    "commit",
    "tf-infra-agent",
    "developer-workflow",
  ],
  frontend: [
    "brainstorm",
    "frontend-agent",
    "pm-agent",
    "qa-agent",
    "debug-agent",
    "commit",
  ],
  backend: [
    "brainstorm",
    "backend-agent",
    "pm-agent",
    "qa-agent",
    "debug-agent",
    "commit",
    "developer-workflow",
  ],
  mobile: [
    "brainstorm",
    "mobile-agent",
    "pm-agent",
    "qa-agent",
    "debug-agent",
    "commit",
  ],
  infrastructure: [
    "brainstorm",
    "tf-infra-agent",
    "developer-workflow",
    "pm-agent",
    "qa-agent",
    "debug-agent",
    "commit",
  ],
  all: [
    ...SKILLS.domain,
    ...SKILLS.coordination,
    ...SKILLS.utility,
    ...SKILLS.infrastructure,
  ].map((s) => s.name),
};

const SKILL_DIRECTORIES = ["resources", "config", "scripts", "templates"];

export async function fetchSkillFiles(skillName: string): Promise<string[]> {
  const files = ["SKILL.md"];

  for (const dir of SKILL_DIRECTORIES) {
    const dirFiles = await fetchDirectoryContents(skillName, dir);
    files.push(...dirFiles);
  }

  return files;
}

export async function installSkill(
  skillName: string,
  targetDir: string,
): Promise<boolean> {
  const skillDir = join(targetDir, INSTALLED_SKILLS_DIR, skillName);
  const files = await fetchSkillFiles(skillName);

  for (const file of files) {
    const url = `${GITHUB_RAW}/${skillName}/${file}`;
    const res = await fetch(url);
    if (!res.ok) continue;

    const content = await res.text();
    const filePath = join(skillDir, file);
    const fileDir = dirname(filePath);

    if (!existsSync(fileDir)) {
      mkdirSync(fileDir, { recursive: true });
    }
    writeFileSync(filePath, content, "utf-8");
  }

  return true;
}

export async function installShared(targetDir: string): Promise<void> {
  const sharedDir = join(targetDir, INSTALLED_SKILLS_DIR, "_shared");
  const files = [
    "reasoning-templates.md",
    "clarification-protocol.md",
    "context-loading.md",
    "skill-routing.md",
  ];

  if (!existsSync(sharedDir)) {
    mkdirSync(sharedDir, { recursive: true });
  }

  for (const file of files) {
    const url = `${GITHUB_RAW}/_shared/${file}`;
    const res = await fetch(url);
    if (!res.ok) continue;

    const content = await res.text();
    writeFileSync(join(sharedDir, file), content, "utf-8");
  }
}

export async function installWorkflows(targetDir: string): Promise<void> {
  const workflowsDir = join(targetDir, ".agents", "workflows");
  const files = [
    "brainstorm.md",
    "coordinate.md",
    "coordinate-pro.md",
    "debug.md",
    "orchestrate.md",
    "plan.md",
    "review.md",
    "setup.md",
    "tools.md",
  ];

  if (!existsSync(workflowsDir)) {
    mkdirSync(workflowsDir, { recursive: true });
  }

  for (const file of files) {
    const url = `${GITHUB_AGENT_ROOT}/workflows/${file}`;
    const res = await fetch(url);
    if (!res.ok) continue;

    const content = await res.text();
    writeFileSync(join(workflowsDir, file), content, "utf-8");
  }
}

export async function installConfigs(targetDir: string): Promise<void> {
  const configDir = join(targetDir, ".agents", "config");
  const agentDir = join(targetDir, ".agents");

  // Install config/user-preferences.yaml
  if (!existsSync(configDir)) {
    mkdirSync(configDir, { recursive: true });
  }

  const configFile = "user-preferences.yaml";
  const configUrl = `${GITHUB_AGENT_ROOT}/config/${configFile}`;
  const configRes = await fetch(configUrl);
  if (configRes.ok) {
    const content = await configRes.text();
    writeFileSync(join(configDir, configFile), content, "utf-8");
  }

  // Install mcp.json
  const mcpFile = "mcp.json";
  const mcpUrl = `${GITHUB_AGENT_ROOT}/${mcpFile}`;
  const mcpRes = await fetch(mcpUrl);
  if (mcpRes.ok) {
    const content = await mcpRes.text();
    writeFileSync(join(agentDir, mcpFile), content, "utf-8");
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

export async function installGlobalWorkflows(): Promise<void> {
  const homeDir = process.env.HOME || process.env.USERPROFILE || "";
  const globalWorkflowsDir = join(
    homeDir,
    ".gemini",
    "antigravity",
    "global_workflows",
  );

  if (!existsSync(globalWorkflowsDir)) {
    mkdirSync(globalWorkflowsDir, { recursive: true });
  }

  const files = [
    "brainstorm.md",
    "coordinate.md",
    "coordinate-pro.md",
    "debug.md",
    "orchestrate.md",
    "plan.md",
    "review.md",
    "setup.md",
    "tools.md",
  ];

  for (const file of files) {
    const url = `${GITHUB_AGENT_ROOT}/workflows/${file}`;
    const res = await fetch(url);
    if (!res.ok) continue;

    const content = await res.text();
    writeFileSync(join(globalWorkflowsDir, file), content, "utf-8");
  }
}
