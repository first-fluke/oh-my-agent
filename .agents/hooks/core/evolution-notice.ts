import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { join } from "node:path";

/**
 * Session-start notice for the self-improvement loop. The lineage logs are
 * append-only; this reads what was promoted since the last session that
 * showed a notice, renders one line per change, and moves the marker. A
 * change is announced exactly once, and nothing is announced when nothing
 * moved.
 */

const MARKER = ".agents/state/evolution-notice.json";
const SKILL_ROOT = ".agents/results/skill-evolution";

interface SkillRecord {
  schemaVersion: number;
  ts: string;
  action: "apply" | "rollback";
  skillId: string;
  parentHash: string;
  candidateHash: string;
  evidence?: {
    baselineLift?: number;
    finalLift?: number;
    finalTest?: { passed?: boolean };
    edits?: Array<{ op: string; anchor: string; after?: string }>;
    gains?: { train?: [number, number] };
  };
}

interface ProcedureRecord {
  schemaVersion: number;
  ts: string;
  action: "apply" | "rollback";
  target: string;
  parentHash: string;
  candidateHash: string;
  evidence?: { meanDiff?: number; pairs?: number; skills?: string[] };
}

function readLines<T>(path: string): T[] {
  if (!existsSync(path)) return [];
  const out: T[] = [];
  for (const line of readFileSync(path, "utf-8").split("\n")) {
    if (!line.trim()) continue;
    try {
      const parsed = JSON.parse(line) as T & { schemaVersion?: number };
      if (parsed.schemaVersion === 1) out.push(parsed);
    } catch {
      // damaged line: skipped, the log stays append-only evidence
    }
  }
  return out;
}

function readMarker(projectDir: string): string {
  try {
    const parsed = JSON.parse(
      readFileSync(join(projectDir, MARKER), "utf-8"),
    ) as { lastSeen?: unknown };
    return typeof parsed.lastSeen === "string" ? parsed.lastSeen : "";
  } catch {
    return "";
  }
}

function writeMarker(projectDir: string, lastSeen: string): void {
  const path = join(projectDir, MARKER);
  mkdirSync(join(projectDir, ".agents", "state"), { recursive: true });
  writeFileSync(path, `${JSON.stringify({ lastSeen })}\n`, "utf-8");
}

function pct(value: number | undefined): string {
  return value === undefined ? "?" : `${Math.round(value * 100)}%`;
}

function describeSkill(record: SkillRecord): string {
  if (record.action === "rollback")
    return `${record.skillId} rolled back to ${record.parentHash.slice(0, 8)}`;
  const edit = record.evidence?.edits?.[0];
  const what = edit
    ? `${edit.op} "${edit.anchor.replace(/\s+/g, " ").slice(0, 48)}${edit.anchor.length > 48 ? "…" : ""}"${(record.evidence?.edits?.length ?? 0) > 1 ? ` +${(record.evidence?.edits?.length ?? 1) - 1}` : ""}`
    : `${record.parentHash.slice(0, 8)} → ${record.candidateHash.slice(0, 8)}`;
  const train = record.evidence?.gains?.train;
  const gains = [
    train ? `train ${pct(train[0])}→${pct(train[1])}` : "",
    `validation ${pct(record.evidence?.baselineLift)}→${pct(record.evidence?.finalLift)}`,
  ]
    .filter(Boolean)
    .join(", ");
  return `${record.skillId}: ${what} (${gains})`;
}

function describeProcedure(record: ProcedureRecord): string {
  const e = record.evidence;
  const stats = e
    ? ` (mean gain diff ${(e.meanDiff ?? 0) >= 0 ? "+" : ""}${(e.meanDiff ?? 0).toFixed(2)}, ${e.pairs ?? 0} pairs)`
    : "";
  return `${record.target} procedure ${record.parentHash.slice(0, 8)} → ${record.candidateHash.slice(0, 8)}${stats}`;
}

/**
 * Lines to show once for changes since the last notice; `[]` when nothing
 * changed. Moves the marker when `advance` is true (the default).
 */
export function evolutionNoticeLines(
  projectDir: string,
  options: { advance?: boolean; limit?: number } = {},
): string[] {
  const root = join(projectDir, SKILL_ROOT);
  if (!existsSync(root)) return [];
  const since = readMarker(projectDir);
  const skillRecords: SkillRecord[] = [];
  for (const entry of readdirSync(root, { withFileTypes: true })) {
    if (!entry.isDirectory() || entry.name.startsWith("_")) continue;
    skillRecords.push(
      ...readLines<SkillRecord>(join(root, entry.name, "promotions.jsonl")),
    );
  }
  const procedureRecords = readLines<ProcedureRecord>(
    join(root, "_procedure", "promotions.jsonl"),
  );
  const fresh = [
    ...skillRecords
      .filter((r) => r.ts > since)
      .map((r) => ({ ts: r.ts, line: describeSkill(r) })),
    ...procedureRecords
      .filter((r) => r.ts > since)
      .map((r) => ({ ts: r.ts, line: describeProcedure(r) })),
  ].sort((a, b) => a.ts.localeCompare(b.ts));
  if (fresh.length === 0) return [];
  const latest = fresh[fresh.length - 1]?.ts ?? since;
  if (options.advance !== false) writeMarker(projectDir, latest);
  const limit = options.limit ?? 5;
  const shown = fresh
    .slice(-limit)
    .map((f) => `- ${f.ts.slice(0, 16)} ${f.line}`);
  if (fresh.length > limit) shown.unshift(`- …${fresh.length - limit} earlier`);
  return shown;
}
