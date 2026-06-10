import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { parse as parseYaml } from "yaml";
import type {
  LoadTaskFixturesResult,
  RolloutEntry,
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
  return true;
}

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
          `[oma skills eval] skipped ${entry}: does not match TaskFixture schema`,
        );
        skippedFiles.push(entry);
      }
    } catch (err) {
      const reason = err instanceof Error ? err.message : String(err);
      console.warn(`[oma skills eval] skipped ${entry}: ${reason}`);
      skippedFiles.push(entry);
    }
  }
  return { fixtures, skippedFiles };
}

/**
 * Load rollout entries from `_rollouts/` under a task directory.
 * Deterministic: files are sorted before reading; no Date.now/random.
 */
export function loadRolloutEntries(taskDir: string): RolloutEntry[] {
  const rolloutsDir = join(taskDir, "_rollouts");
  if (!existsSync(rolloutsDir)) return [];
  let entries: string[];
  try {
    entries = readdirSync(rolloutsDir);
  } catch {
    return [];
  }

  const rollouts: RolloutEntry[] = [];
  for (const entry of entries.sort()) {
    if (!entry.endsWith(".json")) continue;
    const filePath = join(rolloutsDir, entry);
    try {
      const raw = readFileSync(filePath, "utf-8");
      const parsed: unknown = JSON.parse(raw);
      // Each file may contain a single entry or an array of entries
      if (Array.isArray(parsed)) {
        for (const item of parsed) {
          if (isRolloutEntry(item)) rollouts.push(item);
        }
      } else if (isRolloutEntry(parsed)) {
        rollouts.push(parsed);
      }
    } catch {
      // Skip malformed rollout files
    }
  }
  return rollouts;
}
