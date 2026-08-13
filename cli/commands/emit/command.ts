import { isAbsolute, join } from "node:path";
import type { Command } from "commander";
import { emitAgentPlugin } from "../../platform/emit/agent-plugin.js";
import { emitAgentSkills } from "../../platform/emit/agent-skills.js";
import { emitAgentsMd } from "../../platform/emit/agents-md.js";
import { emitClaudePlugin } from "../../platform/emit/claude-plugin.js";
import { emitCliDocs } from "../../platform/emit/cli-docs.js";
import type { AgentSkillsEmitReport } from "../../platform/emit/types.js";
import {
  addOutputOptions,
  resolveJsonMode,
  runAction,
} from "../../utils/cli-framework.js";
import { resolveProjectRoot } from "../../utils/fs-utils.js";
import { type EmitRunReport, renderJson, renderText } from "./report.js";

const EMIT_TARGETS = [
  "agent-skills",
  "agent-plugin",
  "claude-plugin",
  "agents-md",
  "cli-docs",
  "all",
] as const;
type EmitCliTarget = (typeof EMIT_TARGETS)[number];

// Default emit base, relative to the repo root. Each target is written to its
// canonical repo-relative path under this base: agent-skills and agents-md
// land in `generated/`, the Claude plugin marketplace lands at the repo-root
// `.claude-plugin/` (the path Claude Code auto-discovers), and the Agent
// Plugins package (plugin.json, skills/, mcp.json, com.firstfluke.oma/) lands
// at the base itself (Agent Plugins clients discover those files at the
// package root, and a git clone of this repo is the package). A base of "."
// therefore writes every artifact to its committed location; the drift check
// passes a scratch base to emit read-only.
export const DEFAULT_OUT_DIR = ".";

function buildAgentSkillsReport(
  repoRoot: string,
  outDir: string,
): AgentSkillsEmitReport {
  const skills = emitAgentSkills(repoRoot, outDir);
  const passCount = skills.filter((s) => s.validation.valid).length;
  return {
    target: "agent-skills",
    outDir,
    skills,
    passCount,
    failCount: skills.length - passCount,
  };
}

export interface RunEmitOptions {
  target: EmitCliTarget;
  repoRoot: string;
  outDir: string;
}

/** Run the requested emit target(s) and return a structured report. */
export function runEmit(options: RunEmitOptions): EmitRunReport {
  const { target, repoRoot, outDir } = options;
  const report: EmitRunReport = {};

  if (target === "agent-skills" || target === "all") {
    report.agentSkills = buildAgentSkillsReport(
      repoRoot,
      join(outDir, "generated", "agent-skills"),
    );
  }
  if (target === "agent-plugin" || target === "all") {
    report.agentPlugin = emitAgentPlugin(repoRoot, outDir);
  }
  if (target === "claude-plugin" || target === "all") {
    report.claudePlugin = emitClaudePlugin(
      repoRoot,
      join(outDir, ".claude-plugin"),
    );
  }
  if (target === "agents-md" || target === "all") {
    report.agentsMd = emitAgentsMd(
      repoRoot,
      join(outDir, "generated", "agents-md"),
    );
  }
  if (target === "cli-docs" || target === "all") {
    report.cliDocs = emitCliDocs(repoRoot, outDir);
  }

  return report;
}

export function registerEmitCommand(program: Command): void {
  addOutputOptions(
    program
      .command("emit")
      .description(
        "Emit standards-conformant artifacts from the .agents/ SSOT " +
          "(Agent Skills spec, Agent Plugins package, Claude Code plugin " +
          "marketplace, AGENTS.md, cli/-scoped vendor docs)",
      )
      .option(
        "--target <target>",
        `Emit target: ${EMIT_TARGETS.join(" | ")}`,
        "all",
      )
      .option(
        "--out <dir>",
        "Output base directory; artifacts are written to their repo-relative " +
          "paths under it (generated/, .claude-plugin/, and the Agent " +
          "Plugins package at the base root). Default: repo root.",
        DEFAULT_OUT_DIR,
      ),
  ).action(
    runAction(
      async (options) => {
        const target = options.target as string;
        if (!EMIT_TARGETS.includes(target as EmitCliTarget)) {
          throw new Error(
            `Invalid --target "${target}". Expected one of ${EMIT_TARGETS.join(", ")}`,
          );
        }

        const repoRoot = resolveProjectRoot();
        const requestedOut = options.out as string;
        const outDir = isAbsolute(requestedOut)
          ? requestedOut
          : join(repoRoot, requestedOut);
        const report = runEmit({
          target: target as EmitCliTarget,
          repoRoot,
          outDir,
        });

        if (resolveJsonMode(options)) {
          console.log(renderJson(report));
        } else {
          console.log(renderText(report));
        }
      },
      { supportsJsonOutput: true },
    ),
  );
}
