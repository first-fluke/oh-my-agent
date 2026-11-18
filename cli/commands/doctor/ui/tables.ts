import * as p from "@clack/prompts";
import pc from "picocolors";
import {
  isSupportedAgyVersion,
  MIN_AGY_ACP_VERSION,
} from "../../../io/runtime-dispatch/agy-acp.js";
import { AUTH_CHECKERS } from "../../../vendors/index.js";
import type { DoctorReport } from "../types.js";
import { visualPadEnd } from "./visual-width.js";

export function renderCliTable(report: DoctorReport): void {
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

  // agy subagents and `oma image` run over `agy acp`, which needs 1.5.10+.
  const agy = report.clis.find((cli) => cli.name === "antigravity");
  if (agy?.installed && !isSupportedAgyVersion(agy.version)) {
    p.note(
      `${pc.yellow("⚠️")} agy ${agy.version} is older than ${MIN_AGY_ACP_VERSION}; oma runs agy subagents over \`agy acp\`, which needs ${MIN_AGY_ACP_VERSION}+\n${pc.dim("Fix: agy update")}`,
      "Antigravity CLI",
    );
  }
}

export function renderMcpTable(report: DoctorReport): void {
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

export function renderSkillsTable(report: DoctorReport): void {
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

export function renderDualInstall(report: DoctorReport): void {
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
