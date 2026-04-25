import * as p from "@clack/prompts";
import pc from "picocolors";
import { checkStarred } from "../../io/github.js";
import { getAllSkills } from "../../platform/skills-installer.js";
import { printMigrationGuide } from "../../vendors/qwen/auth.js";
import {
  AUTH_CHECKERS,
  type DoctorReport,
  installMissingSkills,
} from "./doctor.js";
import type { ProfileReport } from "./profile.js";

function renderCliTable(report: DoctorReport): void {
  const rows = report.clis.map((cli) => {
    const status = cli.installed ? pc.green("✅") : pc.red("❌");
    const version = cli.version || "-";
    const auth = cli.installed
      ? AUTH_CHECKERS[cli.name]?.()
        ? pc.green("✅")
        : pc.red("❌")
      : pc.dim("-");
    return `${status} ${cli.name.padEnd(8)} ${version.padEnd(12)} ${auth}`;
  });

  p.note(
    [`${"CLI".padEnd(11)} ${"Version".padEnd(12)} Auth`, ...rows].join("\n"),
    "CLI Status",
  );

  if (report.missingCLIs.length > 0) {
    p.note(
      report.missingCLIs
        .map(
          (cli) => `${pc.yellow("→")} ${cli.name}: ${pc.dim(cli.installCmd)}`,
        )
        .join("\n"),
      "Install missing CLIs",
    );
  }
}

function renderMcpTable(report: DoctorReport): void {
  if (report.mcpChecks.length === 0) return;
  const lines = [
    pc.bold("🔗 MCP Connection Status"),
    "┌─────────┬──────────┬─────────────────────┐",
    `│ ${pc.bold("CLI")}     │ ${pc.bold("MCP Config")} │ ${pc.bold("Path")}                │`,
    "├─────────┼──────────┼─────────────────────┤",
    ...report.mcpChecks.map((cli) => {
      const status = cli.mcp.configured
        ? pc.green("✅ Configured")
        : pc.yellow("⚠️  Not configured");
      const path = cli.mcp.path ? cli.mcp.path.split("/").pop() || "" : "-";
      return `│ ${cli.name.padEnd(7)} │ ${status.padEnd(8)} │ ${path.padEnd(19)} │`;
    }),
    "└─────────┴──────────┴─────────────────────┘",
  ].join("\n");
  p.note(lines, "MCP Status");
}

function renderSkillsTable(report: DoctorReport): void {
  if (report.skillChecks.length === 0) {
    p.note(pc.yellow("No skills installed."), "Skills Status");
    return;
  }
  const installedCount = report.skillChecks.filter((s) => s.installed).length;
  const completeCount = report.skillChecks.filter((s) => s.hasSkillMd).length;
  const lines = [
    pc.bold(
      `📦 Skills (${installedCount}/${report.skillChecks.length} installed, ${completeCount} complete)`,
    ),
    "┌────────────────────┬──────────┬─────────────┐",
    `│ ${pc.bold("Skill")}                │ ${pc.bold("Installed")} │ ${pc.bold("SKILL.md")}    │`,
    "├────────────────────┼──────────┼─────────────┤",
    ...report.skillChecks.map((skill) => {
      const installed = skill.installed ? pc.green("✅") : pc.red("❌");
      const hasMd = skill.hasSkillMd ? pc.green("✅") : pc.red("❌");
      return `│ ${skill.name.padEnd(18)} │ ${installed.padEnd(8)} │ ${hasMd.padEnd(11)} │`;
    }),
    "└────────────────────┴──────────┴─────────────┘",
  ].join("\n");
  p.note(lines, "Skills Status");
}

async function promptRepair(report: DoctorReport): Promise<void> {
  if (report.missingSkills.length === 0) return;

  const shouldRepair = await p.confirm({
    message: `Found ${report.missingSkills.length} missing/incomplete skill(s). Install them?`,
    initialValue: true,
  });

  if (p.isCancel(shouldRepair)) {
    p.cancel("Cancelled.");
    process.exit(0);
  }
  if (!shouldRepair) return;

  const allSkillNames = report.missingSkills.map((s) => s.name);
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
      options: report.missingSkills.map((s) => {
        const info = allSkills.find((sk) => sk.name === s.name);
        return { value: s.name, label: s.name, hint: info?.desc || "" };
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

  const spinner = p.spinner();
  spinner.start("Installing skills...");
  try {
    installMissingSkills(report.cwd, skillsToInstall, (name) => {
      spinner.message(`Installing ${pc.cyan(name)}...`);
    });
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

function renderFooter(report: DoctorReport): void {
  if (report.hasSerena) {
    p.note(
      `${pc.green("✅")} Serena memory directory exists\n${pc.dim(`${report.serenaFileCount} memory files found`)}`,
      "Serena Memory",
    );
  } else {
    p.note(
      `${pc.yellow("⚠️")} Serena memory directory not found\n${pc.dim("Dashboard will show 'No agents detected'")}`,
      "Serena Memory",
    );
  }

  if (report.hasClaude) {
    if (report.claudeMdOk) {
      p.note(`${pc.green("✅")} OMA block found in ./CLAUDE.md`, "CLAUDE.md");
    } else {
      p.note(
        `${pc.yellow("⚠️")} OMA block missing in ./CLAUDE.md\n${pc.dim("Run 'oh-my-agent' to install or reinstall")}`,
        "CLAUDE.md",
      );
    }
  }

  if (report.totalIssues === 0) {
    p.outro(pc.green("✅ All checks passed! Ready to use."));
  } else {
    p.outro(
      pc.yellow(`⚠️  Found ${report.totalIssues} issue(s). See details above.`),
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
}

// ---------------------------------------------------------------------------
// Profile Health rendering (--profile flag)
// ---------------------------------------------------------------------------

/**
 * Renders the auth-status matrix for every role-model pairing in the
 * active profile, Qwen OAuth migration warning, and Antigravity fallback
 * warning.
 */
export async function renderProfileReport(
  report: ProfileReport,
): Promise<void> {
  console.clear();
  p.intro(pc.bgMagenta(pc.white(` Profile Health (${report.profileName}) `)));

  if (report.missingPreset) {
    p.log.error(
      [
        pc.red("model_preset not found or unknown in .agents/oma-config.yaml"),
        pc.dim("Run `oma install` to set a model preset."),
        pc.dim("Example: model_preset: claude-only"),
      ].join("\n"),
    );
    // NOTE: Do not exit — matrix still renders with ❌ NO PRESET rows for guidance.
  }

  // ── Summary line when all rows from preset (no overrides) ───────────────
  if (report.allFromPreset && !report.missingPreset) {
    p.note(
      pc.dim(`All agents configured from preset (${report.profileName})`),
      "Preset",
    );
  }

  // ── Auth-status matrix ──────────────────────────────────────────────────
  const COL_ROLE = 14;
  const COL_MODEL = 36;
  const COL_CLI = 14;
  const COL_AUTH = 16;

  function pad(s: string, n: number): string {
    return s.slice(0, n).padEnd(n);
  }

  const borderTop =
    "┌" +
    "─".repeat(COL_ROLE) +
    "┬" +
    "─".repeat(COL_MODEL) +
    "┬" +
    "─".repeat(COL_CLI) +
    "┬" +
    "─".repeat(COL_AUTH) +
    "┐";
  const borderMid =
    "├" +
    "─".repeat(COL_ROLE) +
    "┼" +
    "─".repeat(COL_MODEL) +
    "┼" +
    "─".repeat(COL_CLI) +
    "┼" +
    "─".repeat(COL_AUTH) +
    "┤";
  const borderBot =
    "└" +
    "─".repeat(COL_ROLE) +
    "┴" +
    "─".repeat(COL_MODEL) +
    "┴" +
    "─".repeat(COL_CLI) +
    "┴" +
    "─".repeat(COL_AUTH) +
    "┘";

  function headerRow(): string {
    return (
      "│" +
      pad(" Role", COL_ROLE) +
      "│" +
      pad(" Model", COL_MODEL) +
      "│" +
      pad(" CLI", COL_CLI) +
      "│" +
      pad(" Auth Status", COL_AUTH) +
      "│"
    );
  }

  function dataRow(
    role: string,
    model: string,
    cli: string,
    authStatus: string,
  ): string {
    return (
      "│" +
      pad(` ${role}`, COL_ROLE) +
      "│" +
      pad(` ${model}`, COL_MODEL) +
      "│" +
      pad(` ${cli}`, COL_CLI) +
      "│" +
      pad(` ${authStatus}`, COL_AUTH) +
      "│"
    );
  }

  const matrixLines: string[] = [borderTop, headerRow(), borderMid];

  for (const row of report.rows) {
    let authLabel: string;
    if (row.authStatus === "logged_in") {
      authLabel = pc.green("✓ logged in");
    } else if (row.authStatus === "not_logged_in") {
      const hint = row.authHint ? ` (${row.authHint})` : "";
      authLabel = pc.red(`✗ not logged in${hint}`);
    } else {
      authLabel = pc.yellow("? unknown");
    }
    // Append source annotation to role label
    const sourceTag =
      "source" in row && row.source === "override"
        ? pc.cyan(" (override)")
        : pc.dim(" (preset)");
    matrixLines.push(
      dataRow(`${row.role}${sourceTag}`, row.model, row.cli, authLabel),
    );
  }

  matrixLines.push(borderBot);

  p.note(matrixLines.join("\n"), "Auth Status Matrix");

  // ── Qwen OAuth migration warning (T9) ──────────────────────────────────
  if (report.qwenOAuth.migrationNeeded) {
    p.log.warn(
      [
        pc.yellow("Qwen OAuth sessions were deprecated on 2026-04-15."),
        pc.dim("Run `qwen /auth` to re-authenticate with an API key."),
        report.qwenOAuth.tokenPath
          ? pc.dim(`Legacy token: ${report.qwenOAuth.tokenPath}`)
          : "",
      ]
        .filter(Boolean)
        .join("\n"),
    );
    printMigrationGuide(report.qwenOAuth);
  }

  // ── Antigravity runtime fallback warning ────────────────────────────────
  if (report.isAntigravity) {
    const fallbackList = report.antigravityFallbackRoles.join(", ");
    p.log.warn(
      [
        pc.yellow(
          `${report.profileName} impl agents (${fallbackList}) will fall back to external subprocess.`,
        ),
        pc.dim(
          "Antigravity runtime has no native parallel dispatch for impl agents.",
        ),
      ].join("\n"),
    );
  }

  p.outro(pc.green(`Profile health check complete (${report.profileName})`));
}

export async function renderDoctorReport(report: DoctorReport): Promise<void> {
  console.clear();
  p.intro(pc.bgMagenta(pc.white(" 🩺 oh-my-agent doctor ")));

  try {
    renderCliTable(report);
    renderMcpTable(report);
    renderSkillsTable(report);
    await promptRepair(report);
    renderFooter(report);
  } catch (error) {
    p.log.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}
