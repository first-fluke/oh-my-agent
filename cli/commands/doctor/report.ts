import { existsSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { inspectRecommendedGitConfig } from "../../io/git-recommended.js";
import { getMemoriesPath } from "../../io/memory.js";
import { SERENA_INSTALL_HINT } from "../../io/serena.js";
import { downloadAndExtract } from "../../io/tarball.js";
import { safeGetInstallRoot } from "../../platform/install-context.js";
import {
  getAllSkills,
  installShared,
  installSkill,
} from "../../platform/skills-installer.js";
import { evaluateSelfHealingGate } from "../../state/self-healing.js";
import type { SkillCheck } from "../../types/index.js";
import { auditSkills } from "../skills/audit.js";
import { MIN_TASKS } from "../skills/eval.js";
import { collectAgentMemoryCheck } from "./agent-memory.js";
import { checkDualInstall } from "./dual-install.js";
import {
  CLI_DEFINITIONS,
  checkCLI,
  checkMCPConfig,
  checkSkills,
  collectVendorDocChecks,
} from "./environment-checks.js";
import { collectHookWrapperChecks } from "./hook-wrapper-check.js";
import { collectSerenaDaemonCheck } from "./serena-daemons.js";
import { collectSerenaReapCheck } from "./serena-reap.js";
import { collectStateDoctorCheck } from "./state-health.js";
import type {
  DoctorOptions,
  DoctorReport,
  GitRecommendedDoctorCheck,
  McpCheck,
  SkillEvalCoverage,
} from "./types.js";

export { serializeReportAsJson } from "./report-json.js";

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
  // Install-scoped checks (.agents/, vendor dirs, hook wrappers) follow the
  // resolved install root so `oma doctor --global` inspects ~/.agents/ from any
  // directory. Project mode resolves to process.cwd(), so nothing changes there.
  const root = safeGetInstallRoot();
  // The dual-install comparison and the serena project registration are about
  // the directory the user is standing in, not the install root: probing the
  // same path as `home` would make every --global run report the global install
  // as a phantom project install with mode=global.
  const cwd = process.cwd();
  const dualInstall = await checkDualInstall(cwd);

  // Probe the serena binary in the same batch as the vendor CLIs so every
  // `spawn` is created up front (migration 009's MCP transport runs
  // `command: "serena"`, so a missing binary is a real failure mode).
  const [clis, serenaBinary] = await Promise.all([
    Promise.all(
      CLI_DEFINITIONS.map(([name, cmd, installCmd]) =>
        checkCLI(name, cmd, installCmd),
      ),
    ),
    checkCLI("serena", "serena", SERENA_INSTALL_HINT),
  ]);

  const mcpChecks: McpCheck[] = clis
    .filter((c) => c.installed)
    .map((cli) => ({ ...cli, mcp: checkMCPConfig(cli.name) }));

  const skillChecks = checkSkills(root);

  const vendorDocs = collectVendorDocChecks(root, clis);

  // Coordination memory store (canonical .agents/state/memories, legacy
  // .serena/memories fallback) — the dir the dashboards watch.
  const memoriesDir = getMemoriesPath(root);
  const hasSerena = existsSync(memoriesDir);
  let serenaFileCount = 0;
  if (hasSerena) {
    try {
      serenaFileCount = readdirSync(memoriesDir).length;
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

  const skillAudit = auditSkills(root);
  const skillEval = computeEvalCoverage(root, skillAudit.skillCount);
  const agentMemory = await collectAgentMemoryCheck(root);
  const serenaReap = collectSerenaReapCheck(cwd);
  const serenaDaemons = collectSerenaDaemonCheck();
  const state = collectStateDoctorCheck(root);
  const hookWrappers = collectHookWrapperChecks(root);
  const selfHealing = options.healCheckAgent
    ? evaluateSelfHealingGate({
        workspace: root,
        agentType: options.healCheckAgent,
      })
    : undefined;

  const vendorDocIssues = vendorDocs.filter(
    (d) => d.required && !d.hasOmaBlock,
  ).length;
  const selfHealingIssues = selfHealing && !selfHealing.ok ? 1 : 0;
  // Only an issue when the project is Serena-activated — don't flag plain dirs.
  const serenaBinaryIssues = hasSerena && !serenaBinary.installed ? 1 : 0;

  const gitStatus = inspectRecommendedGitConfig();
  const gitRecommended: GitRecommendedDoctorCheck = {
    available: gitStatus.available,
    allOk: gitStatus.allOk,
    issueCount: gitStatus.issueCount,
    items: gitStatus.items.map((item) => ({
      key: item.key,
      desired: item.desired,
      current: item.current,
      ok: item.ok,
      fixHint: item.fixHint,
    })),
  };

  const totalIssues =
    missingCLIs.length +
    missingSkills.length +
    vendorDocIssues +
    agentMemory.issues.length +
    serenaReap.issues.length +
    serenaDaemons.issues.length +
    state.issues.length +
    selfHealingIssues +
    serenaBinaryIssues +
    gitRecommended.issueCount;

  return {
    installRoot: root,
    clis,
    mcpChecks,
    skillChecks,
    missingCLIs,
    missingSkills,
    vendorDocs,
    hasSerena,
    serenaFileCount,
    serenaBinary,
    agentMemory,
    serenaReap,
    serenaDaemons,
    gitRecommended,
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
