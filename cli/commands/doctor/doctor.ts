import { execSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import {
  getAllSkills,
  INSTALLED_SKILLS_DIR,
  installShared,
  installSkill,
} from "../../platform/skills-installer.js";
import type { CLICheck, SkillCheck } from "../../types/index.js";
import {
  isClaudeAuthenticated,
  isCodexAuthenticated,
  isGeminiAuthenticated,
  isQwenAuthenticated,
} from "../../vendors/index.js";

const CLI_DEFINITIONS: Array<[string, string, string]> = [
  ["gemini", "gemini", "bun install --global @google/gemini-cli"],
  ["claude", "claude", "bun install --global @anthropic-ai/claude-code"],
  ["codex", "codex", "bun install --global @openai/codex"],
  ["qwen", "qwen", "bun install --global @qwen-code/qwen-code"],
];

export const AUTH_CHECKERS: Record<string, () => boolean> = {
  gemini: isGeminiAuthenticated,
  claude: isClaudeAuthenticated,
  codex: isCodexAuthenticated,
  qwen: isQwenAuthenticated,
};

export interface McpCheck extends CLICheck {
  mcp: { configured: boolean; path?: string };
}

export interface DoctorReport {
  cwd: string;
  clis: CLICheck[];
  mcpChecks: McpCheck[];
  skillChecks: SkillCheck[];
  missingCLIs: CLICheck[];
  missingSkills: SkillCheck[];
  hasClaude: boolean;
  claudeMdOk: boolean;
  hasSerena: boolean;
  serenaFileCount: number;
  totalIssues: number;
}

function checkCLI(name: string, command: string, installCmd: string): CLICheck {
  try {
    const version = execSync(`${command} --version`, {
      encoding: "utf-8",
      stdio: ["pipe", "pipe", "ignore"],
    }).trim();
    return { name, installed: true, version, installCmd };
  } catch {
    return { name, installed: false, installCmd };
  }
}

function checkMCPConfig(cliName: string): {
  configured: boolean;
  path?: string;
} {
  const homeDir = process.env.HOME || process.env.USERPROFILE || "";
  const configs: Record<
    string,
    { path: string; type: "json" | "yaml" | "toml" }
  > = {
    gemini: { path: `${homeDir}/.gemini/settings.json`, type: "json" },
    claude: { path: `${homeDir}/.claude.json`, type: "json" },
    codex: { path: `${homeDir}/.codex/config.toml`, type: "toml" },
  };

  const config = configs[cliName];
  if (!config) return { configured: false };
  if (!existsSync(config.path)) return { configured: false };

  try {
    const content = readFileSync(config.path, "utf-8");
    if (config.type === "json") {
      const json = JSON.parse(content);
      const hasMCP = json.mcpServers || json.mcp;
      return { configured: !!hasMCP, path: config.path };
    }
    return { configured: true, path: config.path };
  } catch {
    return { configured: false };
  }
}

function checkSkills(): SkillCheck[] {
  const skillsDir = join(process.cwd(), INSTALLED_SKILLS_DIR);
  if (!existsSync(skillsDir)) return [];

  return getAllSkills().map((skill) => {
    const skillPath = join(skillsDir, skill.name);
    return {
      name: skill.name,
      installed: existsSync(skillPath),
      hasSkillMd: existsSync(join(skillPath, "SKILL.md")),
    };
  });
}

export async function collectDoctorReport(): Promise<DoctorReport> {
  const cwd = process.cwd();
  const clis = CLI_DEFINITIONS.map(([name, cmd, installCmd]) =>
    checkCLI(name, cmd, installCmd),
  );

  const mcpChecks: McpCheck[] = clis
    .filter((c) => c.installed)
    .map((cli) => ({ ...cli, mcp: checkMCPConfig(cli.name) }));

  const skillChecks = checkSkills();

  const hasClaude = clis.some((c) => c.name === "claude" && c.installed);
  let claudeMdOk = false;
  try {
    const claudeMdPath = join(cwd, "CLAUDE.md");
    if (existsSync(claudeMdPath)) {
      claudeMdOk = readFileSync(claudeMdPath, "utf-8").includes(
        "<!-- OMA:START",
      );
    }
  } catch {}

  const serenaDir = join(cwd, ".serena", "memories");
  const hasSerena = existsSync(serenaDir);
  let serenaFileCount = 0;
  if (hasSerena) {
    try {
      serenaFileCount = readdirSync(serenaDir).length;
    } catch {}
  }

  const missingCLIs = clis.filter((c) => !c.installed);
  const missingSkills: SkillCheck[] =
    skillChecks.length > 0
      ? skillChecks.filter((s) => !s.installed || !s.hasSkillMd)
      : getAllSkills().map((s) => ({
          name: s.name,
          installed: false,
          hasSkillMd: false,
        }));

  const totalIssues =
    missingCLIs.length +
    missingSkills.length +
    (hasClaude && !claudeMdOk ? 1 : 0);

  return {
    cwd,
    clis,
    mcpChecks,
    skillChecks,
    missingCLIs,
    missingSkills,
    hasClaude,
    claudeMdOk,
    hasSerena,
    serenaFileCount,
    totalIssues,
  };
}

export function serializeReportAsJson(report: DoctorReport): string {
  const payload = {
    ok: report.totalIssues === 0,
    issues: report.totalIssues,
    clis: report.clis.map((c) => ({
      name: c.name,
      installed: c.installed,
      version: c.version || null,
      authenticated: c.installed ? (AUTH_CHECKERS[c.name]?.() ?? false) : false,
    })),
    mcp: report.mcpChecks.map((c) => ({
      name: c.name,
      configured: c.mcp.configured,
      path: c.mcp.path || null,
    })),
    skills:
      report.skillChecks.length > 0
        ? report.skillChecks.map((s) => ({
            name: s.name,
            installed: s.installed,
            complete: s.hasSkillMd,
          }))
        : [],
    missingSkills: report.missingSkills.map((s) => s.name),
    serena: { exists: report.hasSerena, fileCount: report.serenaFileCount },
    claudeMd: { hasOmaBlock: report.claudeMdOk },
  };
  return JSON.stringify(payload, null, 2);
}

export function installMissingSkills(
  cwd: string,
  skillNames: string[],
  onProgress?: (name: string) => void,
): void {
  installShared(cwd, cwd);
  for (const name of skillNames) {
    onProgress?.(name);
    installSkill(cwd, name, cwd);
  }
}
