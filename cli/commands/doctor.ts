import { execSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import * as p from "@clack/prompts";
import pc from "picocolors";
import { checkStarred } from "../lib/github.js";
import {
  getAllSkills,
  INSTALLED_SKILLS_DIR,
  installShared,
  installSkill,
} from "../platform/skills-installer.js";
import type { CLICheck, SkillCheck } from "../types/index.js";
import {
  isClaudeAuthenticated,
  isCodexAuthenticated,
  isGeminiAuthenticated,
  isQwenAuthenticated,
} from "../vendors/index.js";

async function checkCLI(
  name: string,
  command: string,
  installCmd: string,
): Promise<CLICheck> {
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

async function checkMCPConfig(
  cliName: string,
): Promise<{ configured: boolean; path?: string }> {
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

  if (existsSync(config.path)) {
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

  return { configured: false };
}

async function checkSkills(): Promise<SkillCheck[]> {
  const skillsDir = join(process.cwd(), INSTALLED_SKILLS_DIR);
  if (!existsSync(skillsDir)) return [];

  const allSkills = getAllSkills();
  const checks: SkillCheck[] = [];

  for (const skill of allSkills) {
    const skillPath = join(skillsDir, skill.name);
    const skillMdPath = join(skillPath, "SKILL.md");

    checks.push({
      name: skill.name,
      installed: existsSync(skillPath),
      hasSkillMd: existsSync(skillMdPath),
    });
  }

  return checks;
}

export async function doctor(jsonMode = false): Promise<void> {
  const cwd = process.cwd();

  const clis = await Promise.all([
    checkCLI("gemini", "gemini", "bun install --global @google/gemini-cli"),
    checkCLI(
      "claude",
      "claude",
      "bun install --global @anthropic-ai/claude-code",
    ),
    checkCLI("codex", "codex", "bun install --global @openai/codex"),
    checkCLI("qwen", "qwen", "bun install --global @qwen-code/qwen-code"),
  ]);

  const authCheckers: Record<string, () => boolean> = {
    gemini: isGeminiAuthenticated,
    claude: isClaudeAuthenticated,
    codex: isCodexAuthenticated,
    qwen: isQwenAuthenticated,
  };

  const mcpChecks = await Promise.all(
    clis
      .filter((c) => c.installed)
      .map(async (cli) => {
        const mcp = await checkMCPConfig(cli.name);
        return { ...cli, mcp };
      }),
  );

  const skillChecks = await checkSkills();

  const hasClaude = clis.some((c) => c.name === "claude" && c.installed);
  let claudeMdOk = false;
  const claudeMdPath = join(cwd, "CLAUDE.md");
  try {
    if (existsSync(claudeMdPath)) {
      const content = readFileSync(claudeMdPath, "utf-8");
      claudeMdOk = content.includes("<!-- OMA:START");
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
  const missingSkills =
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

  if (jsonMode) {
    const result = {
      ok: totalIssues === 0,
      issues: totalIssues,
      clis: clis.map((c) => ({
        name: c.name,
        installed: c.installed,
        version: c.version || null,
        authenticated: c.installed
          ? (authCheckers[c.name]?.() ?? false)
          : false,
      })),
      mcp: mcpChecks.map((c) => ({
        name: c.name,
        configured: c.mcp.configured,
        path: c.mcp.path || null,
      })),
      skills:
        skillChecks.length > 0
          ? skillChecks.map((s) => ({
              name: s.name,
              installed: s.installed,
              complete: s.hasSkillMd,
            }))
          : [],
      missingSkills: missingSkills.map((s) => s.name),
      serena: { exists: hasSerena, fileCount: serenaFileCount },
      claudeMd: { hasOmaBlock: claudeMdOk },
    };
    console.log(JSON.stringify(result, null, 2));
    process.exit(totalIssues === 0 ? 0 : 1);
  }

  console.clear();
  p.intro(pc.bgMagenta(pc.white(" 🩺 oh-my-agent doctor ")));

  const spinner = p.spinner();

  try {
    const cliRows = clis.map((cli) => {
      const status = cli.installed ? pc.green("✅") : pc.red("❌");
      const version = cli.version || "-";
      const auth = cli.installed
        ? authCheckers[cli.name]?.()
          ? pc.green("✅")
          : pc.red("❌")
        : pc.dim("-");
      return `${status} ${cli.name.padEnd(8)} ${version.padEnd(12)} ${auth}`;
    });

    p.note(
      [`${"CLI".padEnd(11)} ${"Version".padEnd(12)} Auth`, ...cliRows].join(
        "\n",
      ),
      "CLI Status",
    );

    if (missingCLIs.length > 0) {
      p.note(
        missingCLIs
          .map(
            (cli) => `${pc.yellow("→")} ${cli.name}: ${pc.dim(cli.installCmd)}`,
          )
          .join("\n"),
        "Install missing CLIs",
      );
    }

    if (mcpChecks.length > 0) {
      const mcpTable = [
        pc.bold("🔗 MCP Connection Status"),
        "┌─────────┬──────────┬─────────────────────┐",
        `│ ${pc.bold("CLI")}     │ ${pc.bold("MCP Config")} │ ${pc.bold("Path")}                │`,
        "├─────────┼──────────┼─────────────────────┤",
        ...mcpChecks.map((cli) => {
          const status = cli.mcp.configured
            ? pc.green("✅ Configured")
            : pc.yellow("⚠️  Not configured");
          const path = cli.mcp.path ? cli.mcp.path.split("/").pop() || "" : "-";
          return `│ ${cli.name.padEnd(7)} │ ${status.padEnd(8)} │ ${path.padEnd(19)} │`;
        }),
        "└─────────┴──────────┴─────────────────────┘",
      ].join("\n");

      p.note(mcpTable, "MCP Status");
    }

    const installedCount = skillChecks.filter((s) => s.installed).length;
    const completeCount = skillChecks.filter((s) => s.hasSkillMd).length;

    if (skillChecks.length > 0) {
      const skillTable = [
        pc.bold(
          `📦 Skills (${installedCount}/${skillChecks.length} installed, ${completeCount} complete)`,
        ),
        "┌────────────────────┬──────────┬─────────────┐",
        `│ ${pc.bold("Skill")}                │ ${pc.bold("Installed")} │ ${pc.bold("SKILL.md")}    │`,
        "├────────────────────┼──────────┼─────────────┤",
        ...skillChecks.map((skill) => {
          const installed = skill.installed ? pc.green("✅") : pc.red("❌");
          const hasMd = skill.hasSkillMd ? pc.green("✅") : pc.red("❌");
          return `│ ${skill.name.padEnd(18)} │ ${installed.padEnd(8)} │ ${hasMd.padEnd(11)} │`;
        }),
        "└────────────────────┴──────────┴─────────────┘",
      ].join("\n");

      p.note(skillTable, "Skills Status");
    } else {
      p.note(pc.yellow("No skills installed."), "Skills Status");
    }

    if (missingSkills.length > 0) {
      const shouldRepair = await p.confirm({
        message: `Found ${missingSkills.length} missing/incomplete skill(s). Install them?`,
        initialValue: true,
      });

      if (p.isCancel(shouldRepair)) {
        p.cancel("Cancelled.");
        process.exit(0);
      }

      if (shouldRepair) {
        const allSkillNames = missingSkills.map((s) => s.name);

        const selectMode = await p.select({
          message: "Which skills to install?",
          options: [
            {
              value: "all",
              label: `✨ All (${allSkillNames.length} skills)`,
              hint: "Recommended",
            },
            { value: "select", label: "🔧 Select individually" },
          ],
        });

        if (p.isCancel(selectMode)) {
          p.cancel("Cancelled.");
          process.exit(0);
        }

        let skillsToInstall: string[];

        if (selectMode === "select") {
          const allSkills = getAllSkills();
          const selected = await p.multiselect({
            message: "Select skills to install:",
            options: missingSkills.map((s) => {
              const skillInfo = allSkills.find((sk) => sk.name === s.name);
              return {
                value: s.name,
                label: s.name,
                hint: skillInfo?.desc || "",
              };
            }),
            required: true,
          });

          if (p.isCancel(selected)) {
            p.cancel("Cancelled.");
            process.exit(0);
          }
          skillsToInstall = selected as string[];
        } else {
          skillsToInstall = allSkillNames;
        }

        spinner.start("Installing skills...");

        try {
          installShared(cwd, cwd);

          for (const skillName of skillsToInstall) {
            spinner.message(`Installing ${pc.cyan(skillName)}...`);
            installSkill(cwd, skillName, cwd);
          }

          spinner.stop(`Installed ${skillsToInstall.length} skill(s)!`);
          p.note(
            skillsToInstall.map((s) => `${pc.green("✓")} ${s}`).join("\n"),
            "Installed Skills",
          );
        } catch (error) {
          spinner.stop("Installation failed");
          p.log.error(error instanceof Error ? error.message : String(error));
        }
      }
    }

    if (hasSerena) {
      p.note(
        `${pc.green("✅")} Serena memory directory exists\n${pc.dim(`${serenaFileCount} memory files found`)}`,
        "Serena Memory",
      );
    } else {
      p.note(
        `${pc.yellow("⚠️")} Serena memory directory not found\n${pc.dim("Dashboard will show 'No agents detected'")}`,
        "Serena Memory",
      );
    }

    if (hasClaude) {
      if (claudeMdOk) {
        p.note(`${pc.green("✅")} OMA block found in ./CLAUDE.md`, "CLAUDE.md");
      } else {
        p.note(
          `${pc.yellow("⚠️")} OMA block missing in ./CLAUDE.md\n${pc.dim("Run 'oh-my-agent' to install or reinstall")}`,
          "CLAUDE.md",
        );
      }
    }

    if (totalIssues === 0) {
      p.outro(pc.green("✅ All checks passed! Ready to use."));
    } else {
      p.outro(
        pc.yellow(`⚠️  Found ${totalIssues} issue(s). See details above.`),
      );
    }

    if (checkStarred()) {
      p.note(
        `${pc.green("⭐")} Thank you for starring oh-my-agent!\n${pc.dim("https://github.com/sponsors/first-fluke")}`,
        "Support",
      );
    } else {
      p.note(
        `${pc.yellow("❤️")} Enjoying oh-my-agent? Give it a star or sponsor!\n${pc.dim("gh api --method PUT /user/starred/first-fluke/oh-my-agent")}\n${pc.dim("https://github.com/sponsors/first-fluke")}`,
        "Support",
      );
    }
  } catch (error) {
    if (spinner) spinner.stop("Check failed");
    p.log.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}
