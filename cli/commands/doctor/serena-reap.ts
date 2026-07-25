import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import type { SerenaLanguageAdvisory } from "../../io/serena.js";
import {
  advisoryHeavyLanguages,
  deriveSerenaLanguages,
  inferSerenaLanguages,
  parseProjectYmlLanguages,
} from "../../io/serena.js";
import { daemonPidsWithLiveClients } from "../../io/serena-daemon.js";
import type {
  ActivitySignalSource,
  SerenaReaperConfig,
  SerenaRoot,
} from "../../io/serena-reaper.js";
import {
  computeReapTargets,
  discoverSerenaRoots,
  loadSerenaReaperConfigFromContent,
} from "../../io/serena-reaper.js";
import {
  buildActivityResolver,
  loadOmaConfigContent,
  runPs,
  scanSerenaLogs,
} from "../../io/serena-reaper-runtime.js";
import type { SerenaReapDoctorCheck } from "./types.js";

/**
 * Collect the Serena Reaper diagnostic check.
 *
 * Diagnostic-ONLY: never kills any processes.
 *
 * Reports:
 *   - All current Serena roots with PID, project, LSP RSS
 *   - Active signal source per root (log/mtime/cpu — T1-3, no silent failure)
 *   - Total LSP RSS across all roots
 *   - Reapable amount under current config
 *   - Track-A advisory: heavy/unmapped languages in .serena/project.yml (T2-2)
 *
 * Design: docs/plans/designs/021-serena-memory-reaper.md §T1-3, T2-2
 */
export function collectSerenaReapCheck(cwd: string): SerenaReapDoctorCheck {
  // 1. Run ps and scan logs
  const psOutput = runPs();
  const logEntries = scanSerenaLogs();
  const activityResolver = buildActivityResolver(logEntries);

  // 2. Discover roots
  const roots = discoverSerenaRoots(psOutput, activityResolver);

  // 3. Load config
  const configContent = loadOmaConfigContent();
  const config = loadSerenaReaperConfigFromContent(configContent);

  // 4. Compute reap targets (diagnostic — not acting on them). Protected
  // daemon pids are passed so the KEEP/REAP labels shown here match what an
  // actual `oma serena reap` would do.
  const nowMs = Date.now();
  const targets = computeReapTargets(
    roots,
    config,
    undefined,
    nowMs,
    daemonPidsWithLiveClients(),
  );

  // 5. Aggregate RSS
  const totalLspRssMb = roots.reduce(
    (sum, r) => sum + r.lspChildren.reduce((s, l) => s + l.rssMb, 0),
    0,
  );
  const reapableRssMb = targets.reduce(
    (sum, t) => sum + t.projectedFreedRssMb,
    0,
  );

  // 6. Track-A advisory — check .serena/project.yml for heavy/unmapped languages
  const projectYmlPath = join(cwd, ".serena", "project.yml");
  let languageAdvisories: SerenaLanguageAdvisory[] = [];
  if (existsSync(projectYmlPath)) {
    try {
      const ymlContent = readFileSync(projectYmlPath, "utf-8");
      const projectYmlLanguages = parseProjectYmlLanguages(ymlContent);
      // Match what `oma update` would derive, so doctor and update agree on
      // which entries are justified: project files first, skills as fallback.
      const { languages: derivedLanguages } = deriveSerenaLanguages(
        cwd,
        inferSerenaLanguages(cwd),
      );
      languageAdvisories = advisoryHeavyLanguages(
        projectYmlLanguages,
        derivedLanguages,
      );
    } catch {
      // best-effort — advisory failure must not break doctor
    }
  }

  // 7. Build per-root summaries (always surface signal source — T1-3)
  const rootSummaries = roots.map(
    (r): SerenaRootSummary => ({
      pid: r.pid,
      project: r.project,
      signalSource: r.signalSource,
      idleMinutes: Math.floor((nowMs - r.lastActivityMs) / 60_000),
      lspRssMb: r.lspChildren.reduce((s, l) => s + l.rssMb, 0),
      lspCount: r.lspChildren.length,
      lspNames: r.lspChildren.map((l) => l.name),
      isReapTarget: targets.some((t) => t.root.pid === r.pid),
    }),
  );

  return {
    roots: rootSummaries,
    totalLspRssMb,
    reapableRssMb,
    reapTargetCount: targets.length,
    config,
    languageAdvisories,
    issues: buildIssues(roots, config, reapableRssMb, languageAdvisories),
  };
}

function buildIssues(
  roots: SerenaRoot[],
  config: SerenaReaperConfig,
  reapableRssMb: number,
  languageAdvisories: SerenaLanguageAdvisory[],
): string[] {
  const issues: string[] = [];

  if (roots.length > 3 && !config.enabled) {
    issues.push(
      `${roots.length} Serena roots active — consider enabling the reaper (serena_reaper.enabled: true)`,
    );
  }

  if (reapableRssMb > 200) {
    issues.push(
      `${reapableRssMb.toFixed(0)} MB reapable under current config — run "oma serena reap" to reclaim`,
    );
  }

  for (const advisory of languageAdvisories) {
    issues.push(advisory.reason);
  }

  return issues;
}

/** Per-root diagnostic summary (surfaced in doctor output). */
export interface SerenaRootSummary {
  pid: number;
  project: string;
  /** Which signal tier was used (log/mtime/cpu) — T1-3: always surfaced */
  signalSource: ActivitySignalSource;
  idleMinutes: number;
  lspRssMb: number;
  lspCount: number;
  lspNames: string[];
  isReapTarget: boolean;
}
