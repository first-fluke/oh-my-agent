import type {
  AgentPluginEmitReport,
  AgentSkillsEmitReport,
  AgentsMdEmitReport,
  AntigravityEmitReport,
  ClaudePluginEmitReport,
  CliDocsEmitReport,
  CommandcodeModEmitReport,
  GrokPluginEmitReport,
  KimiPluginEmitReport,
  NativeMcpReport,
  OpencodePackageEmitReport,
  PiPackageEmitReport,
  ZcodePluginEmitReport,
} from "../../platform/emit/types.js";

export interface EmitRunReport {
  agentSkills?: AgentSkillsEmitReport;
  agentPlugin?: AgentPluginEmitReport;
  claudePlugin?: ClaudePluginEmitReport;
  agentsMd?: AgentsMdEmitReport;
  cliDocs?: CliDocsEmitReport;
  piPackage?: PiPackageEmitReport;
  antigravityPlugin?: AntigravityEmitReport;
  grokPlugin?: GrokPluginEmitReport;
  zcodePlugin?: ZcodePluginEmitReport;
  kimiPlugin?: KimiPluginEmitReport;
  opencodePackage?: OpencodePackageEmitReport;
  commandcodeMod?: CommandcodeModEmitReport;
}

export function renderJson(report: EmitRunReport): string {
  return JSON.stringify(report, null, 2);
}

function renderAgentSkillsSection(report: AgentSkillsEmitReport): string[] {
  const lines = [
    `agent-skills -> ${report.outDir}`,
    `  ${report.passCount} passed, ${report.failCount} failed (${report.skills.length} total)`,
  ];
  for (const result of report.skills) {
    const status = result.validation.valid ? "PASS" : "FAIL";
    lines.push(`  [${status}] ${result.skill}`);
    for (const err of result.validation.errors) {
      lines.push(`      error: ${err.field}: ${err.message}`);
    }
    for (const warn of result.validation.warnings) {
      lines.push(`      warn:  ${warn.field}: ${warn.message}`);
    }
  }
  return lines;
}

function renderAgentPluginSection(report: AgentPluginEmitReport): string[] {
  const lines = [
    `agent-plugin -> ${report.outDir}`,
    ...(report.codexPluginPath
      ? [`codex-plugin -> ${report.codexPluginPath}`]
      : []),
    `  skills: ${report.passCount} passed, ${report.failCount} failed (${report.skills.length} total)`,
  ];
  if (report.mcp.emitted) {
    lines.push(`  mcp servers: ${report.mcp.servers.join(", ") || "(none)"}`);
    for (const skip of report.mcp.skipped) {
      lines.push(`    skipped: ${skip.server} (${skip.reason})`);
    }
  } else {
    lines.push("  mcp servers: no .agents/mcp.json, mcp.json not emitted");
  }
  lines.push(`  extensions: ${report.extensionEntries.join(", ") || "(none)"}`);
  const copilot = report.copilot;
  lines.push(
    `  com.github.copilot: ${copilot.agents.length} agents, ${copilot.commands.length} commands, ${copilot.rules.length} rules, hooks ${copilot.hooks ? "emitted" : "not emitted"}`,
  );
  return lines;
}

function renderClaudePluginSection(report: ClaudePluginEmitReport): string[] {
  return [
    `claude-plugin -> ${report.outPath}`,
    ...(report.codexMarketplacePath
      ? [`codex-marketplace -> ${report.codexMarketplacePath}`]
      : []),
  ];
}

function renderAgentsMdSection(report: AgentsMdEmitReport): string[] {
  return [
    `agents-md -> ${report.outPath}`,
    `  existing: ${report.existingPath} (${report.existingExists ? "found" : "not found"})`,
    `  differs from existing: ${report.existingDiffers ? "yes" : "no"}`,
  ];
}

function renderMcpLines(mcp: NativeMcpReport): string[] {
  if (!mcp.emitted) return ["  mcp servers: no .agents/mcp.json"];
  return [
    `  mcp servers: ${mcp.servers.join(", ") || "(none)"}`,
    ...mcp.skipped.map(
      (skip) => `    skipped: ${skip.server} (${skip.reason})`,
    ),
  ];
}

function renderAntigravitySection(report: AntigravityEmitReport): string[] {
  return [
    `antigravity-plugin -> ${report.outDir}`,
    `  skills: ${report.passCount} passed, ${report.failCount} failed (${report.skills.length} total)`,
    `  agents: ${report.agents.length}, rules: ${report.rules.length}`,
    ...renderMcpLines(report.mcp),
  ];
}

function renderGrokSection(report: GrokPluginEmitReport): string[] {
  return [
    `grok-plugin -> ${report.manifestPath}`,
    `grok-marketplace -> ${report.marketplacePath}`,
    `  agents: ${report.agents.length}`,
  ];
}

function renderZcodeSection(report: ZcodePluginEmitReport): string[] {
  return [
    `zcode-plugin -> ${report.manifestPath}`,
    `zcode-marketplace -> ${report.marketplacePath}`,
    `  agents: ${report.agents.length}`,
    ...renderMcpLines(report.mcp),
  ];
}

function renderKimiSection(report: KimiPluginEmitReport): string[] {
  return [
    `kimi-plugin -> ${report.manifestPath}`,
    `  agents: ${report.agents.length}`,
    ...renderMcpLines(report.mcp),
  ];
}

function renderCliDocsSection(report: CliDocsEmitReport): string[] {
  const lines = [`cli-docs -> ${report.outDir}`];
  for (const file of report.files) {
    lines.push(
      `  [${file.changed ? "UPDATED" : "unchanged"}] ${file.outPath} (${file.vendor})`,
    );
  }
  return lines;
}

export function renderText(report: EmitRunReport): string {
  const lines: string[] = [];
  if (report.agentSkills)
    lines.push(...renderAgentSkillsSection(report.agentSkills), "");
  if (report.agentPlugin)
    lines.push(...renderAgentPluginSection(report.agentPlugin), "");
  if (report.claudePlugin)
    lines.push(...renderClaudePluginSection(report.claudePlugin), "");
  if (report.piPackage)
    lines.push(
      `pi-package -> ${report.piPackage.outDir}`,
      `  skills: ${report.piPackage.passCount} passed, ${report.piPackage.failCount} failed (${report.piPackage.skills.length} total)`,
      "",
    );
  if (report.antigravityPlugin)
    lines.push(...renderAntigravitySection(report.antigravityPlugin), "");
  if (report.grokPlugin)
    lines.push(...renderGrokSection(report.grokPlugin), "");
  if (report.zcodePlugin)
    lines.push(...renderZcodeSection(report.zcodePlugin), "");
  if (report.kimiPlugin)
    lines.push(...renderKimiSection(report.kimiPlugin), "");
  if (report.opencodePackage)
    lines.push(
      `opencode-package -> ${report.opencodePackage.outDir}`,
      `  files: ${report.opencodePackage.files.join(", ")}`,
      "",
    );
  if (report.commandcodeMod)
    lines.push(
      `commandcode-mod -> ${report.commandcodeMod.outDir}`,
      `  mod: ${report.commandcodeMod.modPath}`,
      `  skills: ${report.commandcodeMod.passCount} passed, ${report.commandcodeMod.failCount} failed (${report.commandcodeMod.skills.length} total)`,
      "",
    );
  if (report.agentsMd)
    lines.push(...renderAgentsMdSection(report.agentsMd), "");
  if (report.cliDocs) lines.push(...renderCliDocsSection(report.cliDocs), "");
  return lines.join("\n").trimEnd();
}
