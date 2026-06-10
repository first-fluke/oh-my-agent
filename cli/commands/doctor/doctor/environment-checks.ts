import { spawn } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import {
  getAllSkills,
  INSTALLED_SKILLS_DIR,
} from "../../../platform/skills-installer.js";
import type { CLICheck, SkillCheck } from "../../../types/index.js";
import {
  isAntigravityAuthenticated,
  isClaudeAuthenticated,
  isCodexAuthenticated,
  isGeminiAuthenticated,
  isGrokAuthenticated,
  isKiroAuthenticated,
  isPiAuthenticated,
  isQwenAuthenticated,
} from "../../../vendors/index.js";
import type { VendorDocCheck } from "../types.js";

const OMA_DOCTOR_PROBE_TIMEOUT_MS = Number(
  process.env.OMA_DOCTOR_PROBE_TIMEOUT_MS ?? 5000,
);
const OMA_DOCTOR_PROBE_SIGKILL_GRACE_MS = 200;

export const CLI_DEFINITIONS: Array<[string, string, string]> = [
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
  ["kiro", "kiro-cli", "Follow instructions at https://kiro.dev"],
  ["pi", "pi", "bun install --global @earendil-works/pi-coding-agent"],
];

export const AUTH_CHECKERS: Record<string, () => boolean> = {
  gemini: isGeminiAuthenticated,
  claude: isClaudeAuthenticated,
  codex: isCodexAuthenticated,
  qwen: isQwenAuthenticated,
  antigravity: () => isAntigravityAuthenticated(),
  grok: isGrokAuthenticated,
  kiro: isKiroAuthenticated,
  pi: isPiAuthenticated,
};

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

export async function checkCLI(
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

export function checkMCPConfig(cliName: string): {
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

export function checkSkills(): SkillCheck[] {
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

export function collectVendorDocChecks(
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
