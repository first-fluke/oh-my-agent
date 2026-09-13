import {
  appendFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  renameSync,
  writeFileSync,
} from "node:fs";
import { dirname, isAbsolute, join, relative, resolve, sep } from "node:path";
import { AGENTS_DIR } from "../../../constants/paths.js";
import { contentHash } from "../eval/rollouts.js";
import { unifiedDiff } from "./diff.js";

/**
 * Promotion lineage.
 *
 * `--apply` rewrites the installed SKILL.md in place, and an OMA-owned skill is
 * overwritten again by `oma update`. The lineage keeps what the write was:
 * parent and candidate hashes, the evidence that justified it, the backup that
 * restores it, and a reviewable patch. A rollback is recorded the same way.
 */

export interface SkillPromotionRecord {
  schemaVersion: 1;
  ts: string;
  action: "apply" | "rollback";
  skillId: string;
  omaOwned: boolean;
  /** Content hash of the body before the write. */
  parentHash: string;
  /** Content hash of the body after the write. */
  candidateHash: string;
  /** Project-relative paths. */
  skillMdPath: string;
  backupPath: string | null;
  patchPath: string | null;
  evidence: {
    baselineLift: number;
    finalLift: number;
    finalTest?: {
      baselineLift: number;
      candidateLift: number;
      passed: boolean;
    };
    promotionEligible: boolean | null;
    suiteHash?: string;
    protocolRevision: string;
    sourceRuntime?: string;
    targetRuntime?: string;
    sessionId?: string;
    procedureHash?: string;
    memory?: "recall" | "none";
  };
  /** For a rollback: the apply record it reverses. */
  reverses?: string;
}

export function promotionsDir(workspace: string, skillId: string): string {
  return join(workspace, AGENTS_DIR, "results", "skill-evolution", skillId);
}

function promotionsLog(workspace: string, skillId: string): string {
  return join(promotionsDir(workspace, skillId), "promotions.jsonl");
}

function toRelative(workspace: string, path: string): string {
  const rel = relative(resolve(workspace), resolve(path));
  return rel.split(sep).join("/");
}

function toAbsolute(workspace: string, path: string): string {
  return isAbsolute(path) ? path : join(workspace, path);
}

export function readSkillPromotions(
  workspace: string,
  skillId: string,
): SkillPromotionRecord[] {
  const path = promotionsLog(workspace, skillId);
  if (!existsSync(path)) return [];
  const records: SkillPromotionRecord[] = [];
  for (const line of readFileSync(path, "utf-8").split("\n")) {
    if (!line.trim()) continue;
    try {
      const parsed = JSON.parse(line) as SkillPromotionRecord;
      if (parsed.schemaVersion === 1 && parsed.skillId === skillId)
        records.push(parsed);
    } catch {
      // A damaged line is skipped; the log is append-only evidence.
    }
  }
  return records;
}

function appendRecord(workspace: string, record: SkillPromotionRecord): string {
  const path = promotionsLog(workspace, record.skillId);
  mkdirSync(dirname(path), { recursive: true });
  appendFileSync(path, `${JSON.stringify(record)}\n`, "utf-8");
  return path;
}

export interface RecordPromotionInput {
  workspace: string;
  skillId: string;
  omaOwned: boolean;
  skillMdPath: string;
  backupPath: string | null;
  originalBody: string;
  finalBody: string;
  evidence: SkillPromotionRecord["evidence"];
}

/** Append an apply record and write the reviewable patch beside it. */
export function recordSkillPromotion(input: RecordPromotionInput): {
  record: SkillPromotionRecord;
  logPath: string;
  patchPath: string;
} {
  const candidateHash = contentHash(input.finalBody);
  const dir = join(promotionsDir(input.workspace, input.skillId), "promotions");
  mkdirSync(dir, { recursive: true });
  const patchPath = join(dir, `${candidateHash.slice(0, 16)}.patch`);
  writeFileSync(
    patchPath,
    unifiedDiff(
      input.originalBody,
      input.finalBody,
      toRelative(input.workspace, input.skillMdPath),
    ),
    "utf-8",
  );
  const record: SkillPromotionRecord = {
    schemaVersion: 1,
    ts: new Date().toISOString(),
    action: "apply",
    skillId: input.skillId,
    omaOwned: input.omaOwned,
    parentHash: contentHash(input.originalBody),
    candidateHash,
    skillMdPath: toRelative(input.workspace, input.skillMdPath),
    backupPath: input.backupPath
      ? toRelative(input.workspace, input.backupPath)
      : null,
    patchPath: toRelative(input.workspace, patchPath),
    evidence: input.evidence,
  };
  const logPath = appendRecord(input.workspace, record);
  return { record, logPath, patchPath };
}

export interface RollbackResult {
  record: SkillPromotionRecord;
  restoredFrom: string;
  skillMdPath: string;
}

/**
 * Restore the body that the most recent apply replaced. Refuses when the
 * installed file no longer matches that apply's candidate, because a rollback
 * would then discard edits the lineage knows nothing about.
 */
export function rollbackSkillPromotion(
  workspace: string,
  skillId: string,
): RollbackResult {
  const records = readSkillPromotions(workspace, skillId);
  const applies = records.filter((record) => record.action === "apply");
  const last = applies.at(-1);
  if (!last)
    throw new Error(
      `[oma skill rollback] no recorded promotion for "${skillId}"`,
    );
  const alreadyReversed = records.some(
    (record) => record.action === "rollback" && record.reverses === last.ts,
  );
  if (alreadyReversed)
    throw new Error(
      `[oma skill rollback] the last promotion of "${skillId}" (${last.ts}) was already rolled back`,
    );
  if (!last.backupPath)
    throw new Error(
      `[oma skill rollback] promotion ${last.ts} has no backup to restore`,
    );
  const skillMdPath = toAbsolute(workspace, last.skillMdPath);
  const backupPath = toAbsolute(workspace, last.backupPath);
  if (!existsSync(skillMdPath))
    throw new Error(`[oma skill rollback] ${last.skillMdPath} is missing`);
  if (!existsSync(backupPath))
    throw new Error(
      `[oma skill rollback] backup ${last.backupPath} is missing`,
    );
  const current = readFileSync(skillMdPath, "utf-8");
  if (contentHash(current) !== last.candidateHash)
    throw new Error(
      `[oma skill rollback] ${last.skillMdPath} differs from the promoted candidate; refusing to discard unknown edits`,
    );
  const restored = readFileSync(backupPath, "utf-8");
  if (contentHash(restored) !== last.parentHash)
    throw new Error(
      `[oma skill rollback] backup ${last.backupPath} does not match the recorded parent body`,
    );
  const tmpPath = `${skillMdPath}.tmp`;
  writeFileSync(tmpPath, restored, "utf-8");
  renameSync(tmpPath, skillMdPath);
  const record: SkillPromotionRecord = {
    schemaVersion: 1,
    ts: new Date().toISOString(),
    action: "rollback",
    skillId,
    omaOwned: last.omaOwned,
    parentHash: last.candidateHash,
    candidateHash: last.parentHash,
    skillMdPath: last.skillMdPath,
    backupPath: null,
    patchPath: null,
    evidence: last.evidence,
    reverses: last.ts,
  };
  appendRecord(workspace, record);
  return { record, restoredFrom: last.backupPath, skillMdPath };
}
