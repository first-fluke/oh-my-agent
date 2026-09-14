import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { AGENTS_DIR } from "../../../constants/paths.js";
import { listUnpromotedIncidents } from "../../harness/incident-promote.js";
import { scanHarnessIncidents } from "../../harness/incident-scan.js";
import { readSkillPromotions, type SkillPromotionRecord } from "./lineage.js";
import { procedurePromotionsLog } from "./meta.js";

/**
 * What a user can see of the evolution loop without opening artifact
 * files: which skills changed, when, why, whether the procedure itself
 * changed, and what is waiting to be fed back in. Every figure here comes
 * from the append-only lineage logs and the incident store, never from a
 * claim.
 */

export interface ProcedurePromotionRecord {
  schemaVersion: 1;
  ts: string;
  action: "apply" | "rollback";
  target: "optimizer" | "maintainer";
  parentHash: string;
  candidateHash: string;
  constitutionHash: string;
  path: string;
  backupPath: string;
  patchPath: string;
  evidence?: {
    skills: string[];
    repeats: number;
    budget: { maxEpochs: number; editsPerEpoch: number };
    pairs: number;
    meanDiff: number;
    ci95: { lower: number; upper: number } | null;
    reasons: string[];
  };
}

export interface EvolutionSummary {
  /** Per skill with at least one lineage record. */
  skills: Array<{
    skill: string;
    applied: number;
    rollbacks: number;
    lastAt?: string;
    lastAction?: "apply" | "rollback";
    lastSummary?: string;
  }>;
  appliedEdits: number;
  rollbacks: number;
  procedure: {
    promotions: number;
    lastAt?: string;
    lastTarget?: string;
    lastSummary?: string;
  };
  /** Captured incidents with no fixture yet. */
  pendingIncidents: number;
  /** Failed runs with preserved output that no incident references. */
  uncapturedFailedRuns: number;
  lastChangeAt?: string;
  records: SkillPromotionRecord[];
  procedureRecords: ProcedurePromotionRecord[];
}

export function readProcedurePromotions(
  root: string,
): ProcedurePromotionRecord[] {
  const path = procedurePromotionsLog(root);
  if (!existsSync(path)) return [];
  const records: ProcedurePromotionRecord[] = [];
  for (const line of readFileSync(path, "utf-8").split("\n")) {
    if (!line.trim()) continue;
    try {
      const parsed = JSON.parse(line) as ProcedurePromotionRecord;
      if (parsed.schemaVersion === 1) records.push(parsed);
    } catch {
      // A damaged line is skipped; the log is append-only evidence.
    }
  }
  return records;
}

export function readAllSkillPromotions(root: string): SkillPromotionRecord[] {
  const dir = join(root, AGENTS_DIR, "results", "skill-evolution");
  if (!existsSync(dir)) return [];
  const records: SkillPromotionRecord[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (!entry.isDirectory() || entry.name.startsWith("_")) continue;
    records.push(...readSkillPromotions(root, entry.name));
  }
  return records.sort((a, b) => a.ts.localeCompare(b.ts));
}

const EXCERPT = 72;
function excerpt(text: string): string {
  const flat = text.replace(/\s+/g, " ").trim();
  return flat.length > EXCERPT ? `${flat.slice(0, EXCERPT - 1)}…` : flat;
}

function pct(value: number): string {
  return `${(value * 100).toFixed(0)}%`;
}

/** One human sentence per skill promotion: what changed and on what evidence. */
export function describeSkillPromotion(record: SkillPromotionRecord): string {
  if (record.action === "rollback")
    return `rolled back ${record.skillId} to ${record.parentHash.slice(0, 8)}${record.reverses ? ` (reverses ${record.reverses.slice(0, 8)})` : ""}`;
  const e = record.evidence;
  const edits = (e.edits ?? []).map((edit) => {
    const anchor = excerpt(edit.anchor);
    return edit.op === "delete"
      ? `deleted "${anchor}"`
      : edit.op === "add"
        ? `added after "${anchor}": "${excerpt(edit.after ?? "")}"`
        : `replaced "${anchor}" with "${excerpt(edit.after ?? "")}"`;
  });
  const gains: string[] = [];
  if (e.gains?.train)
    gains.push(`train ${pct(e.gains.train[0])}→${pct(e.gains.train[1])}`);
  gains.push(`validation ${pct(e.baselineLift)}→${pct(e.finalLift)}`);
  if (e.finalTest)
    gains.push(
      `final test ${pct(e.finalTest.baselineLift)}→${pct(e.finalTest.candidateLift)} ${e.finalTest.passed ? "held" : "lost"}`,
    );
  const what = edits.length
    ? edits.join("; ")
    : `${record.parentHash.slice(0, 8)} → ${record.candidateHash.slice(0, 8)}`;
  return `${record.skillId}: ${what} (${gains.join(", ")})`;
}

export function describeProcedurePromotion(
  record: ProcedurePromotionRecord,
): string {
  const e = record.evidence;
  const stats = e
    ? `mean gain diff ${e.meanDiff >= 0 ? "+" : ""}${e.meanDiff.toFixed(2)}, 95% CI ${e.ci95 ? `[${e.ci95.lower.toFixed(2)}, ${e.ci95.upper.toFixed(2)}]` : "n/a"}, ${e.pairs} pairs on ${e.skills.join(", ")}`
    : "no evidence recorded";
  return `${record.target} procedure ${record.parentHash.slice(0, 8)} → ${record.candidateHash.slice(0, 8)} (${stats})`;
}

export function collectEvolutionSummary(root: string): EvolutionSummary {
  const records = readAllSkillPromotions(root);
  const procedureRecords = readProcedurePromotions(root);
  const bySkill = new Map<string, EvolutionSummary["skills"][number]>();
  for (const record of records) {
    const entry = bySkill.get(record.skillId) ?? {
      skill: record.skillId,
      applied: 0,
      rollbacks: 0,
    };
    if (record.action === "apply") entry.applied += 1;
    else entry.rollbacks += 1;
    entry.lastAt = record.ts;
    entry.lastAction = record.action;
    entry.lastSummary = describeSkillPromotion(record);
    bySkill.set(record.skillId, entry);
  }
  const lastProcedure = procedureRecords.at(-1);
  let pendingIncidents = 0;
  let uncapturedFailedRuns = 0;
  try {
    pendingIncidents = listUnpromotedIncidents(root).length;
  } catch {
    // An unreadable incident store is reported by `incident show`.
  }
  try {
    uncapturedFailedRuns = scanHarnessIncidents(root).candidates.filter(
      (candidate) => candidate.hasOutput && candidate.hasPrompt,
    ).length;
  } catch {
    // A damaged run record is reported by `agent results`.
  }
  const stamps = [
    ...records.map((r) => r.ts),
    ...procedureRecords.map((r) => r.ts),
  ].sort();
  return {
    skills: [...bySkill.values()].sort((a, b) =>
      (b.lastAt ?? "").localeCompare(a.lastAt ?? ""),
    ),
    appliedEdits: records.filter((r) => r.action === "apply").length,
    rollbacks: records.filter((r) => r.action === "rollback").length,
    procedure: {
      promotions: procedureRecords.filter((r) => r.action === "apply").length,
      lastAt: lastProcedure?.ts,
      lastTarget: lastProcedure?.target,
      lastSummary: lastProcedure
        ? describeProcedurePromotion(lastProcedure)
        : undefined,
    },
    pendingIncidents,
    uncapturedFailedRuns,
    lastChangeAt: stamps.at(-1),
    records,
    procedureRecords,
  };
}

/** Lines for `oma doctor` and the session snapshot; empty when nothing evolved. */
export function renderEvolutionLines(summary: EvolutionSummary): string[] {
  const lines: string[] = [];
  lines.push(
    `Skill edits applied: ${summary.appliedEdits} across ${summary.skills.length} skill${summary.skills.length === 1 ? "" : "s"}${summary.rollbacks ? `, rolled back ${summary.rollbacks}` : ""}`,
  );
  for (const skill of summary.skills.slice(0, 5))
    if (skill.lastSummary)
      lines.push(`  ${skill.lastAt?.slice(0, 16)}  ${skill.lastSummary}`);
  lines.push(
    `Procedure promotions: ${summary.procedure.promotions}${summary.procedure.lastSummary ? `\n  ${summary.procedure.lastAt?.slice(0, 16)}  ${summary.procedure.lastSummary}` : ""}`,
  );
  lines.push(
    `Waiting for feedback: ${summary.pendingIncidents} captured incident${summary.pendingIncidents === 1 ? "" : "s"} without a fixture, ${summary.uncapturedFailedRuns} failed run${summary.uncapturedFailedRuns === 1 ? "" : "s"} not yet captured` +
      (summary.pendingIncidents + summary.uncapturedFailedRuns > 0
        ? "  → oma harness feedback --scan-runs --live"
        : ""),
  );
  return lines;
}
