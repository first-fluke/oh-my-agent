import * as p from "@clack/prompts";
import pc from "picocolors";

// ── Visual-width helpers (ANSI + emoji aware) ────────────────────────

/** Strip ANSI escape sequences so we measure only visible characters. */
function stripAnsi(s: string): string {
  // biome-ignore lint: the regex is intentionally broad to cover all ANSI sequences
  return s.replace(/\x1b\[[0-9;]*m/g, "");
}

/**
 * Approximate the visual (terminal column) width of a string.
 * - strips ANSI first
 * - treats common wide emoji / symbols as width 2
 * - everything else as width 1
 */
function visualWidth(s: string): number {
  const plain = stripAnsi(s);
  let w = 0;
  for (const ch of plain) {
    const cp = ch.codePointAt(0) ?? 0;
    // Variation Selector-16 (U+FE0F) adds no extra column
    if (cp === 0xfe0f) continue;
    // Common wide emoji ranges (Miscellaneous Symbols, Dingbats, Emoticons,
    // Supplemental Symbols, etc.)  — conservatively flag anything above
    // U+2600 that's likely rendered full-width in most terminals.
    if (cp >= 0x2600) {
      w += 2;
    } else {
      w += 1;
    }
  }
  return w;
}

/** Right-pad a (possibly ANSI-colored) string to `targetWidth` visual columns. */
function visualPadEnd(s: string, targetWidth: number): string {
  const diff = targetWidth - visualWidth(s);
  return diff > 0 ? s + " ".repeat(diff) : s;
}

import { checkStarred } from "../../io/github.js";
import { getAllSkills } from "../../platform/skills-installer.js";
import { printMigrationGuide } from "../../vendors/qwen/auth.js";
import {
  AUTH_CHECKERS,
  type DoctorReport,
  installSkillsFromRemote,
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
    return `${visualPadEnd(status, 2)} ${cli.name.padEnd(8)} ${version.padEnd(12)} ${visualPadEnd(auth, 2)}`;
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

  // Dynamic column widths
  const cliCol = Math.max(3, ...report.mcpChecks.map((c) => c.name.length));
  const cfgCol = 16; // "⚠️  Not configured" visual width
  const paths = report.mcpChecks.map((c) =>
    c.mcp.path ? c.mcp.path.split("/").pop() || "" : "-",
  );
  const pathCol = Math.max(4, ...paths.map((p) => p.length));

  const lines = [
    pc.bold("🔗 MCP Connection Status"),
    `┌${"─".repeat(cliCol + 2)}┬${"─".repeat(cfgCol + 2)}┬${"─".repeat(pathCol + 2)}┐`,
    `│ ${pc.bold("CLI").padEnd(cliCol)} │ ${visualPadEnd(pc.bold("MCP Config"), cfgCol)} │ ${pc.bold("Path").padEnd(pathCol)} │`,
    `├${"─".repeat(cliCol + 2)}┼${"─".repeat(cfgCol + 2)}┼${"─".repeat(pathCol + 2)}┤`,
    ...report.mcpChecks.map((cli, i) => {
      const status = cli.mcp.configured
        ? pc.green("✅ Configured")
        : pc.yellow("⚠️  Not configured");
      const pathCell = paths[i] ?? "-";
      return `│ ${cli.name.padEnd(cliCol)} │ ${visualPadEnd(status, cfgCol)} │ ${pathCell.padEnd(pathCol)} │`;
    }),
    `└${"─".repeat(cliCol + 2)}┴${"─".repeat(cfgCol + 2)}┴${"─".repeat(pathCol + 2)}┘`,
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

  // Dynamic column width: fit the longest skill name (minimum 5 for header)
  const nameCol = Math.max(5, ...report.skillChecks.map((s) => s.name.length));
  const instCol = 9; // "Installed"
  const mdCol = 8; // "SKILL.md"

  const lines = [
    pc.bold(
      `📦 Skills (${installedCount}/${report.skillChecks.length} installed, ${completeCount} complete)`,
    ),
    `┌${"─".repeat(nameCol + 2)}┬${"─".repeat(instCol + 2)}┬${"─".repeat(mdCol + 2)}┐`,
    `│ ${pc.bold("Skill").padEnd(nameCol)} │ ${pc.bold("Installed").padEnd(instCol)} │ ${pc.bold("SKILL.md").padEnd(mdCol)} │`,
    `├${"─".repeat(nameCol + 2)}┼${"─".repeat(instCol + 2)}┼${"─".repeat(mdCol + 2)}┤`,
    ...report.skillChecks.map((skill) => {
      const installed = skill.installed ? pc.green("✅") : pc.red("❌");
      const hasMd = skill.hasSkillMd ? pc.green("✅") : pc.red("❌");
      return `│ ${skill.name.padEnd(nameCol)} │ ${visualPadEnd(installed, instCol)} │ ${visualPadEnd(hasMd, mdCol)} │`;
    }),
    `└${"─".repeat(nameCol + 2)}┴${"─".repeat(instCol + 2)}┴${"─".repeat(mdCol + 2)}┘`,
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
  spinner.start("Downloading source...");
  try {
    await installSkillsFromRemote(report.cwd, skillsToInstall, (name) => {
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

function renderDualInstall(report: DoctorReport): void {
  const { project, global, warnings } = report.dualInstall;

  function formatLine(label: string, probe: typeof project): string {
    if (!probe.installed) return `${pc.dim("—")} ${label}: not installed`;
    const mode = probe.mode ?? pc.dim("legacy");
    const version = probe.version ?? "unknown";
    return `${pc.green("✅")} ${label}: ${version} (${mode})`;
  }

  const projectLine = formatLine("Project", project);
  const globalLine = formatLine("Global ", global);

  const lines: string[] = [projectLine, globalLine];

  if (warnings.length > 0) {
    lines.push("");
    lines.push(pc.bold("Warnings:"));
    for (const w of warnings) {
      lines.push(`  ${pc.yellow("⚠️")}  ${w}`);
    }
  }

  p.note(lines.join("\n"), "Install Presence");
}

function renderSkillBoundaries(report: DoctorReport): void {
  const audit = report.skillAudit;
  if (audit.skillCount < 2) return;
  if (audit.findings.length === 0) {
    const worst = audit.worstPair;
    const worstLine = worst
      ? `\n${pc.dim(`closest pair: ${worst.a} ↔ ${worst.b} (${(worst.similarity * 100).toFixed(1)}%)`)}`
      : "";
    p.note(
      `${pc.green("✅")} No skill description collisions${worstLine}`,
      "Skill Boundaries",
    );
    return;
  }
  const lines = audit.findings.map((f) => {
    const tag = f.severity === "fail" ? pc.red("FAIL") : pc.yellow("WARN");
    const pct = `${(f.pair.similarity * 100).toFixed(1)}%`;
    return `${tag} ${f.pair.a} ↔ ${f.pair.b}  ${pc.dim(pct)}`;
  });
  p.note(
    [
      ...lines,
      "",
      pc.dim(
        "Rewrite frontmatter `description:` to differentiate triggers, domains, or boundaries.",
      ),
      pc.dim("Run: oma skills audit --json"),
    ].join("\n"),
    "Skill Boundaries",
  );
}

function renderAgentMemory(report: DoctorReport): void {
  const memory = report.agentMemory;
  const status = memory.status.reachable
    ? pc.green("✅ reachable")
    : memory.status.endpoint
      ? pc.red("❌ unreachable")
      : pc.yellow("⚠️  not configured");
  const service = memory.service.supported
    ? memory.service.installed
      ? pc.green("installed")
      : pc.dim("not installed")
    : pc.dim(`unsupported on ${memory.service.platform}`);
  const binary = memory.binary.available
    ? pc.green(memory.binary.path ?? memory.binary.command)
    : pc.yellow(`not found (${memory.binary.command})`);
  const daemon = memory.daemon.ownedProcessRunning
    ? pc.green(`running (${memory.daemon.ownedPid})`)
    : pc.dim("not running");
  const retry =
    memory.retryQueue.total > 0
      ? pc.yellow(
          `${memory.retryQueue.total} queued (${memory.retryQueue.invalid} invalid)`,
        )
      : pc.green("empty");

  const lines = [
    `Status: ${status}`,
    `Endpoint: ${pc.cyan(memory.status.endpoint ?? memory.daemon.endpoint ?? "not configured")}`,
    `Version: ${memory.status.version ?? "-"}`,
    memory.status.reason ? `Reason: ${pc.yellow(memory.status.reason)}` : null,
    `Binary: ${binary}`,
    `Retry queue: ${retry}`,
    `Service: ${service}`,
    memory.service.servicePath
      ? `Service path: ${pc.dim(memory.service.servicePath)}`
      : null,
    `OMA daemon pid: ${daemon}`,
    `PID path: ${pc.dim(memory.daemon.pidPath)}`,
    memory.issues.length > 0 ? "" : null,
    ...memory.issues.map((issue) => `${pc.yellow("⚠️")} ${issue}`),
  ].filter((line): line is string => line !== null);

  p.note(lines.join("\n"), "AgentMemory");
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

  for (const doc of report.vendorDocs) {
    if (!doc.required) continue;
    const label = `./${doc.fileName}`;
    if (doc.hasOmaBlock) {
      p.note(`${pc.green("✅")} OMA block found in ${label}`, doc.fileName);
    } else {
      p.note(
        `${pc.yellow("⚠️")} OMA block missing in ${label}\n${pc.dim("Run 'oh-my-agent' to install or reinstall")}`,
        doc.fileName,
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
    p.note(`${pc.green("⭐")} Thank you for starring oh-my-agent!`, "Support");
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
        pc.dim("Example: model_preset: claude"),
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
  if (report.isAntigravity && report.antigravityFallbackRoles.length > 0) {
    const fallbackList = report.antigravityFallbackRoles.join(", ");
    p.log.warn(
      [
        pc.yellow(
          `${report.profileName} impl agents (${fallbackList}) will fall back to external subprocess.`,
        ),
        pc.dim(
          "These roles resolve to a non-agy CLI; switch to the `antigravity` preset for native dispatch.",
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
    renderDualInstall(report);
    renderCliTable(report);
    renderMcpTable(report);
    renderSkillsTable(report);
    renderSkillBoundaries(report);
    renderAgentMemory(report);
    await promptRepair(report);
    renderFooter(report);
  } catch (error) {
    p.log.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}
