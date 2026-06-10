import { existsSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { downloadAndExtract } from "../../io/tarball.js";
import {
  getAllSkills,
  installShared,
  installSkill,
} from "../../platform/skills-installer.js";
import { evaluateSelfHealingGate } from "../../state/self-healing.js";
import type { SkillCheck } from "../../types/index.js";
import { auditSkills } from "../skills/audit.js";
import { MIN_TASKS } from "../skills/eval.js";
import { collectAgentMemoryCheck } from "./doctor/agent-memory.js";
import {
  CLI_DEFINITIONS,
  checkCLI,
  checkMCPConfig,
  checkSkills,
  collectVendorDocChecks,
} from "./doctor/environment-checks.js";
import { checkDualInstall } from "./dual-install.js";
import { collectHookWrapperChecks } from "./hook-wrapper-check.js";
import { collectStateDoctorCheck } from "./state-health.js";
import type {
  DoctorOptions,
  DoctorReport,
  McpCheck,
  SkillEvalCoverage,
} from "./types.js";

export { AUTH_CHECKERS } from "./doctor/environment-checks.js";
export { serializeReportAsJson } from "./doctor/report-json.js";

/**
 * Compute eval fixture coverage cheaply via filesystem scan.
 *
 * Scans `.agents/eval/<skill>/` for each installed skill and counts
 * how many directories contain >= MIN_TASKS non-underscore YAML files.
 * Pure readdir — no YAML parsing, no LLM, no network.
 *
 * @param cwd - workspace root (project dir)
 * @param totalSkills - number of installed skills (from skillAudit or getAllSkills)
 */
export function computeEvalCoverage(
  cwd: string,
  totalSkills: number,
): SkillEvalCoverage {
  const evalRoot = join(cwd, ".agents", "eval");
  if (!existsSync(evalRoot)) {
    return { skillsWithEval: 0, totalSkills };
  }

  let skillDirs: string[];
  try {
    skillDirs = readdirSync(evalRoot);
  } catch {
    return { skillsWithEval: 0, totalSkills };
  }

  let skillsWithEval = 0;

  for (const entry of skillDirs) {
    // Skip hidden / underscore directories (e.g. _rollouts at root level)
    if (entry.startsWith("_") || entry.startsWith(".")) continue;

    const skillDir = join(evalRoot, entry);
    let files: string[];
    try {
      files = readdirSync(skillDir);
    } catch {
      continue;
    }

    // Count YAML task fixture files (skip _-prefixed dirs and non-yaml files)
    const yamlCount = files.filter(
      (f) => !f.startsWith("_") && (f.endsWith(".yaml") || f.endsWith(".yml")),
    ).length;

    if (yamlCount >= MIN_TASKS) {
      skillsWithEval++;
    }
  }

  return { skillsWithEval, totalSkills };
}

export async function collectDoctorReport(
  options: DoctorOptions = {},
): Promise<DoctorReport> {
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
  const skillEval = computeEvalCoverage(cwd, skillAudit.skillCount);
  const agentMemory = await collectAgentMemoryCheck(cwd);
  const state = collectStateDoctorCheck(cwd);
  const hookWrappers = collectHookWrapperChecks(cwd);
  const selfHealing = options.healCheckAgent
    ? evaluateSelfHealingGate({
        workspace: cwd,
        agentType: options.healCheckAgent,
      })
    : undefined;

  const vendorDocIssues = vendorDocs.filter(
    (d) => d.required && !d.hasOmaBlock,
  ).length;
  const selfHealingIssues = selfHealing && !selfHealing.ok ? 1 : 0;

  const totalIssues =
    missingCLIs.length +
    missingSkills.length +
    vendorDocIssues +
    agentMemory.issues.length +
    state.issues.length +
    selfHealingIssues;

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
    agentMemory,
    totalIssues,
    skillAudit,
    skillEval,
    dualInstall,
    state,
    selfHealing,
    hookWrappers,
  };
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
