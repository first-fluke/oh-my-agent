import { spawn } from "node:child_process";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { downloadAndExtract } from "../../io/tarball.js";
import {
  getAllSkills,
  INSTALLED_SKILLS_DIR,
  installShared,
  installSkill,
} from "../../platform/skills-installer.js";
import type { CLICheck, SkillCheck } from "../../types/index.js";
import {
  isAntigravityAuthenticated,
  isClaudeAuthenticated,
  isCodexAuthenticated,
  isGeminiAuthenticated,
  isGrokAuthenticated,
  isQwenAuthenticated,
} from "../../vendors/index.js";
import { auditSkills, type SkillAuditReport } from "../skills/audit.js";
import { checkDualInstall, type DualInstallReport } from "./dual-install.js";

const OMA_DOCTOR_PROBE_TIMEOUT_MS = Number(
  process.env.OMA_DOCTOR_PROBE_TIMEOUT_MS ?? 5000,
);
const OMA_DOCTOR_PROBE_SIGKILL_GRACE_MS = 200;

const CLI_DEFINITIONS: Array<[string, string, string]> = [
  ["gemini", "gemini", "bun install --global @google/gemini-cli"],
  ["claude", "claude", "bun install --global @anthropic-ai/claude-code"],
  ["codex", "codex", "bun install --global @openai/codex"],
  ["qwen", "qwen", "bun install --global @qwen-code/qwen-code"],
  [
    "antigravity",
    "agy",
    "curl -fsSL https://antigravity.google/cli/install.sh | bash",
  ],
  ["grok", "grok", "Follow instructions at https://grok.x.ai"],
];

export const AUTH_CHECKERS: Record<string, () => boolean> = {
  gemini: isGeminiAuthenticated,
  claude: isClaudeAuthenticated,
  codex: isCodexAuthenticated,
  qwen: isQwenAuthenticated,
  antigravity: () => isAntigravityAuthenticated(),
  grok: isGrokAuthenticated,
};

export interface McpCheck extends CLICheck {
  mcp: { configured: boolean; path?: string };
}

export interface VendorDocCheck {
  fileName: string;
  required: boolean;
  hasOmaBlock: boolean;
}

/** Vendor context files checked when their CLI is installed. */
const VENDOR_DOC_SPECS: Array<{
  fileName: string;
  cliNames: readonly string[];
}> = [
  { fileName: "CLAUDE.md", cliNames: ["claude"] },
  { fileName: "AGENTS.md", cliNames: ["codex", "qwen"] },
  { fileName: "GEMINI.md", cliNames: ["gemini"] },
];

const OMA_START_MARKER = "<!-- OMA:START";

export interface DoctorReport {
  cwd: string;
  clis: CLICheck[];
  mcpChecks: McpCheck[];
  skillChecks: SkillCheck[];
  missingCLIs: CLICheck[];
  missingSkills: SkillCheck[];
  vendorDocs: VendorDocCheck[];
  hasSerena: boolean;
  serenaFileCount: number;
  totalIssues: number;
  skillAudit: SkillAuditReport;
  dualInstall: DualInstallReport;
}

async function checkCLI(
  name: string,
  command: string,
  installCmd: string,
): Promise<CLICheck> {
  return new Promise<CLICheck>((resolve) => {
    let stdout = "";
    let killGraceTimer: ReturnType<typeof setTimeout> | undefined;
    let settled = false;

    const proc = spawn(command, ["--version"], {
      stdio: ["ignore", "pipe", "ignore"],
    });

    proc.stdout.on("data", (chunk: Buffer) => {
      stdout += chunk.toString("utf-8");
    });

    const settle = (installed: boolean, version?: string) => {
      if (settled) return;
      settled = true;
      clearTimeout(killGraceTimer);
      resolve(
        installed
          ? { name, installed: true, version, installCmd }
          : { name, installed: false, installCmd },
      );
    };

    proc.on("close", (exitCode: number | null) => {
      if (exitCode === 0) {
        settle(true, stdout.trim());
      } else {
        settle(false);
      }
    });

    proc.on("error", () => {
      settle(false);
    });

    const probeTimer = setTimeout(() => {
      try {
        proc.kill("SIGTERM");
      } catch {}
      killGraceTimer = setTimeout(() => {
        try {
          proc.kill("SIGKILL");
        } catch {}
      }, OMA_DOCTOR_PROBE_SIGKILL_GRACE_MS);
      settle(false);
    }, OMA_DOCTOR_PROBE_TIMEOUT_MS);

    proc.on("close", () => {
      clearTimeout(probeTimer);
    });
  });
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

function fileHasOmaBlock(cwd: string, fileName: string): boolean {
  try {
    const filePath = join(cwd, fileName);
    if (!existsSync(filePath)) return false;
    return readFileSync(filePath, "utf-8").includes(OMA_START_MARKER);
  } catch {
    return false;
  }
}

function collectVendorDocChecks(
  cwd: string,
  clis: CLICheck[],
): VendorDocCheck[] {
  const installed = new Set(clis.filter((c) => c.installed).map((c) => c.name));

  return VENDOR_DOC_SPECS.map(({ fileName, cliNames }) => ({
    fileName,
    required: cliNames.some((name) => installed.has(name)),
    hasOmaBlock: fileHasOmaBlock(cwd, fileName),
  }));
}

export async function collectDoctorReport(): Promise<DoctorReport> {
  const cwd = process.cwd();
  const dualInstall = await checkDualInstall(cwd);

  const clis = await Promise.all(
    CLI_DEFINITIONS.map(([name, cmd, installCmd]) =>
      checkCLI(name, cmd, installCmd),
    ),
  );

  const mcpChecks: McpCheck[] = clis
    .filter((c) => c.installed)
    .map((cli) => ({ ...cli, mcp: checkMCPConfig(cli.name) }));

  const skillChecks = checkSkills();

  const vendorDocs = collectVendorDocChecks(cwd, clis);

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

  const skillAudit = auditSkills(cwd);

  const vendorDocIssues = vendorDocs.filter(
    (d) => d.required && !d.hasOmaBlock,
  ).length;

  const totalIssues =
    missingCLIs.length + missingSkills.length + vendorDocIssues;

  return {
    cwd,
    clis,
    mcpChecks,
    skillChecks,
    missingCLIs,
    missingSkills,
    vendorDocs,
    hasSerena,
    serenaFileCount,
    totalIssues,
    skillAudit,
    dualInstall,
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
    vendorDocs: report.vendorDocs.map((d) => ({
      file: d.fileName,
      required: d.required,
      hasOmaBlock: d.hasOmaBlock,
    })),
    claudeMd: {
      hasOmaBlock:
        report.vendorDocs.find((d) => d.fileName === "CLAUDE.md")
          ?.hasOmaBlock ?? false,
    },
    skillAudit: {
      skillCount: report.skillAudit.skillCount,
      worstPair: report.skillAudit.worstPair ?? null,
      findings: report.skillAudit.findings.map((f) => ({
        a: f.pair.a,
        b: f.pair.b,
        similarity: Number(f.pair.similarity.toFixed(4)),
        severity: f.severity,
      })),
    },
    dualInstall: {
      project: report.dualInstall.project.installed
        ? {
            version: report.dualInstall.project.version,
            mode: report.dualInstall.project.mode,
            schemaVersion: report.dualInstall.project.schemaVersion,
          }
        : null,
      global: report.dualInstall.global.installed
        ? {
            version: report.dualInstall.global.version,
            mode: report.dualInstall.global.mode,
            schemaVersion: report.dualInstall.global.schemaVersion,
          }
        : null,
      warnings: report.dualInstall.warnings,
    },
  };
  return JSON.stringify(payload, null, 2);
}

/**
 * Download a fresh source tarball and install the named skills into
 * `targetDir`. Doctor uses this to repair missing/incomplete skills
 * detected during diagnosis. Network is required only on this path —
 * the diagnosis-only flow stays offline.
 *
 * Replaces the prior `installShared(cwd, cwd)` anti-pattern that always
 * threw `src and dest cannot be the same`.
 */
export async function installSkillsFromRemote(
  targetDir: string,
  skillNames: string[],
  onProgress?: (name: string) => void,
): Promise<void> {
  const { dir: repoDir, cleanup } = await downloadAndExtract();
  try {
    installShared(repoDir, targetDir);
    for (const name of skillNames) {
      onProgress?.(name);
      installSkill(repoDir, name, targetDir);
    }
  } finally {
    cleanup();
  }
}
