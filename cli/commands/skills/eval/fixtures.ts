import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { parse as parseYaml } from "yaml";
import type {
  LoadTaskFixturesResult,
  RolloutEntry,
  RolloutExpectation,
  RolloutStaleReason,
  TaskFixture,
} from "./types.js";

// --- Task loading ---

/**
 * Apply judge-default resolution to a raw parsed fixture object (in-place).
 *
 * Design 016 amendment 2026-06-04: judge is the DEFAULT checker.
 * - No `checker` field at all → inject `{ type: "judge" }`.
 * - `checker` present but `type` absent → set `type: "judge"`.
 * - `checker` present with explicit `type` → leave unchanged.
 *
 * If a top-level `rubric` field exists and `checker` was absent, it is folded
 * into the injected judge checker so fixtures can be written as:
 *   rubric: "Does the output …?"   (no checker block at all)
 */
function applyCheckerDefaults(obj: Record<string, unknown>): void {
  if (typeof obj.checker !== "object" || obj.checker === null) {
    const rubric = typeof obj.rubric === "string" ? obj.rubric : undefined;
    obj.checker = rubric ? { type: "judge", rubric } : { type: "judge" };
    return;
  }
  const checker = obj.checker as Record<string, unknown>;
  if (typeof checker.type !== "string") {
    // Checker block exists but omits type — default to judge
    checker.type = "judge";
  }
}

function isTaskFixture(value: unknown): value is TaskFixture {
  if (typeof value !== "object" || value === null) return false;
  const obj = value as Record<string, unknown>;
  if (
    typeof obj.id !== "string" ||
    typeof obj.skill !== "string" ||
    typeof obj.domain !== "string" ||
    typeof obj.prompt !== "string" ||
    typeof obj.weight !== "number"
  ) {
    return false;
  }
  // Apply judge default before type-checking the checker shape
  applyCheckerDefaults(obj);
  const checker = obj.checker as Record<string, unknown>;
  return typeof checker.type === "string";
}

function isRolloutEntry(value: unknown): value is RolloutEntry {
  if (typeof value !== "object" || value === null) return false;
  const obj = value as Record<string, unknown>;
  if (
    typeof obj.taskId !== "string" ||
    (obj.arm !== "baseline" && obj.arm !== "treatment") ||
    typeof obj.output !== "string"
  ) {
    return false;
  }
  // score is optional; when present it must be exactly 0 or 1
  if (obj.score !== undefined && obj.score !== 0 && obj.score !== 1) {
    return false;
  }
  // Provenance fields are optional (absent in pre-provenance recordings) but
  // must be strings when present — a non-string cannot be compared safely.
  for (const field of ["skillBodyHash", "promptHash"] as const) {
    if (obj[field] !== undefined && typeof obj[field] !== "string") {
      return false;
    }
  }
  return true;
}

/**
 * Decide whether a recorded rollout entry still describes the inputs currently
 * on disk. Returns `null` when the entry is usable, or the reason it is not.
 *
 * Rules, given a caller-supplied {@link RolloutExpectation}:
 * - `treatment` arm must carry a `skillBodyHash` matching the current SKILL.md
 *   body. A treatment output is a function of that body; replaying one recorded
 *   under a different body reports a stale score as a current measurement.
 * - Both arms must carry a `promptHash` matching the current fixture prompt when
 *   the caller supplied a hash for that taskId.
 * - A recording that predates provenance tracking is unverifiable, so it is
 *   rejected rather than trusted. Re-run `--live --record` to replace it.
 *
 * A dimension the caller left `undefined` is not checked — it has nothing to
 * compare against and inventing a verdict would be worse than skipping it.
 */
export function assessRolloutStaleness(
  entry: RolloutEntry,
  expect: RolloutExpectation,
): RolloutStaleReason | null {
  if (expect.skillBodyHash !== undefined && entry.arm === "treatment") {
    if (entry.skillBodyHash === undefined) return "missing-provenance";
    if (entry.skillBodyHash !== expect.skillBodyHash) {
      return "skill-body-changed";
    }
  }

  const expectedPromptHash = expect.promptHashes?.get(entry.taskId);
  if (expectedPromptHash !== undefined) {
    if (entry.promptHash === undefined) return "missing-provenance";
    if (entry.promptHash !== expectedPromptHash) return "prompt-changed";
  }

  return null;
}

const STALE_REASON_TEXT: Record<RolloutStaleReason, string> = {
  "missing-provenance":
    "recorded before provenance tracking, so it cannot be verified",
  "skill-body-changed": "recorded against a different SKILL.md body",
  "prompt-changed": "recorded against a different fixture prompt",
};

/**
 * Load task fixture YAML files from a directory.
 * Files that fail to parse or fail schema validation are skipped with a
 * console.warn (no silent truncation — design T1-c).
 */
export function loadTaskFixtures(taskDir: string): LoadTaskFixturesResult {
  if (!existsSync(taskDir)) return { fixtures: [], skippedFiles: [] };
  let entries: string[];
  try {
    entries = readdirSync(taskDir);
  } catch {
    return { fixtures: [], skippedFiles: [] };
  }

  const fixtures: TaskFixture[] = [];
  const skippedFiles: string[] = [];

  for (const entry of entries.sort()) {
    // Skip rollouts sub-directory and non-yaml files
    if (entry.startsWith("_")) continue;
    if (!entry.endsWith(".yaml") && !entry.endsWith(".yml")) continue;
    const filePath = join(taskDir, entry);
    try {
      const raw = readFileSync(filePath, "utf-8");
      const parsed = parseYaml(raw);
      if (isTaskFixture(parsed)) {
        fixtures.push(parsed);
      } else {
        console.warn(
          `[oma skill eval] skipped ${entry}: does not match TaskFixture schema`,
        );
        skippedFiles.push(entry);
      }
    } catch (err) {
      const reason = err instanceof Error ? err.message : String(err);
      console.warn(`[oma skill eval] skipped ${entry}: ${reason}`);
      skippedFiles.push(entry);
    }
  }
  return { fixtures, skippedFiles };
}

/**
 * Load rollout entries from `_rollouts/` under a task directory.
 * Deterministic: files are sorted before reading; no Date.now/random.
 *
 * When `expect` is supplied, entries that no longer match the inputs on disk are
 * discarded and reported via console.warn (one line per file — no silent
 * truncation, design T1-c). Callers that pass nothing get every well-formed
 * entry, which is only correct when there is no current state to compare
 * against. See {@link assessRolloutStaleness}.
 */
export function loadRolloutEntries(
  taskDir: string,
  expect?: RolloutExpectation,
): RolloutEntry[] {
  const rolloutsDir = join(taskDir, "_rollouts");
  if (!existsSync(rolloutsDir)) return [];
  let entries: string[];
  try {
    entries = readdirSync(rolloutsDir);
  } catch {
    return [];
  }

  const validating =
    expect !== undefined &&
    (expect.skillBodyHash !== undefined || expect.promptHashes !== undefined);

  const rollouts: RolloutEntry[] = [];
  for (const entry of entries.sort()) {
    if (!entry.endsWith(".json")) continue;
    const filePath = join(rolloutsDir, entry);
    const parsedEntries: RolloutEntry[] = [];
    try {
      const raw = readFileSync(filePath, "utf-8");
      const parsed: unknown = JSON.parse(raw);
      // Each file may contain a single entry or an array of entries
      if (Array.isArray(parsed)) {
        for (const item of parsed) {
          if (isRolloutEntry(item)) parsedEntries.push(item);
        }
      } else if (isRolloutEntry(parsed)) {
        parsedEntries.push(parsed);
      }
    } catch {
      // Skip malformed rollout files
      continue;
    }

    if (!validating) {
      rollouts.push(...parsedEntries);
      continue;
    }

    const reasons = new Set<RolloutStaleReason>();
    let discarded = 0;
    for (const item of parsedEntries) {
      const reason = assessRolloutStaleness(item, expect);
      if (reason === null) {
        rollouts.push(item);
        continue;
      }
      reasons.add(reason);
      discarded++;
    }

    if (discarded > 0) {
      const why = [...reasons].map((r) => STALE_REASON_TEXT[r]).join("; ");
      console.warn(
        `[oma skill eval] discarded ${discarded} stale rollout ${
          discarded === 1 ? "entry" : "entries"
        } from _rollouts/${entry}: ${why}. Re-run --live --record to refresh.`,
      );
    }
  }
  return rollouts;
}
