import { parseFrontmatter } from "../../../utils/frontmatter.js";
import type { TaskFixture } from "../eval.js";
import { OPT_TRAIN_VAL_SPLIT, type SkillEdit } from "./types.js";

// --- Train/val split ---

/**
 * Deterministically split a list of TaskFixture into train and validation sets.
 *
 * Sorting by task ID guarantees a stable, reproducible partition regardless of
 * the order fixtures are loaded. No Date.now() or Math.random() used.
 *
 * @param tasks  - The full set of task fixtures.
 * @param ratio  - Fraction to assign to `train` (default: OPT_TRAIN_VAL_SPLIT = 0.5).
 * @returns      - `{ train, val }` where `train.length + val.length === tasks.length`.
 */
export function splitTrainVal(
  tasks: TaskFixture[],
  ratio = OPT_TRAIN_VAL_SPLIT,
): { train: TaskFixture[]; val: TaskFixture[] } {
  // Sort by id for determinism (stable, no random)
  const sorted = [...tasks].sort((a, b) => a.id.localeCompare(b.id));
  const splitAt = Math.round(sorted.length * ratio);
  return {
    train: sorted.slice(0, splitAt),
    val: sorted.slice(splitAt),
  };
}

// --- Edit application (T3) ---

/**
 * Apply a SkillEdit to a body string deterministically.
 *
 * - `add`: insert `edit.after` after the first occurrence of `edit.anchor`.
 * - `delete`: remove the first occurrence of `edit.anchor`.
 * - `replace`: replace the first occurrence of `edit.anchor` with `edit.after ?? ""`.
 *
 * If the anchor is not found, the body is returned unchanged.
 * No Date.now() or Math.random() used.
 */
export function applyEdit(body: string, edit: SkillEdit): string {
  const { op, anchor, after = "" } = edit;
  const idx = body.indexOf(anchor);
  if (idx === -1) {
    // anchor not found — no change
    return body;
  }

  switch (op) {
    case "add": {
      // Insert `after` immediately after the anchor
      return (
        body.slice(0, idx + anchor.length) +
        after +
        body.slice(idx + anchor.length)
      );
    }
    case "delete": {
      // Remove the anchor
      return body.slice(0, idx) + body.slice(idx + anchor.length);
    }
    case "replace": {
      // Replace the anchor with `after`
      return body.slice(0, idx) + after + body.slice(idx + anchor.length);
    }
  }
}

// --- Candidate validation (T3) ---

/**
 * Validate a candidate SKILL.md body:
 *
 * 1. Must be non-empty.
 * 2. Must parse to a valid frontmatter block containing `name` and `description`.
 *
 * Returns `{ ok: true }` on success, or `{ ok: false, reason: string }` on failure.
 * Deterministic — no side effects.
 */
export function validateCandidate(body: string): {
  ok: boolean;
  reason?: string;
} {
  if (!body || body.trim().length === 0) {
    return { ok: false, reason: "candidate body is empty" };
  }

  const { frontmatter } = parseFrontmatter(body);

  if (
    typeof frontmatter.name !== "string" ||
    frontmatter.name.trim().length === 0
  ) {
    return { ok: false, reason: "frontmatter missing required field: name" };
  }

  if (
    typeof frontmatter.description !== "string" ||
    frontmatter.description.trim().length === 0
  ) {
    return {
      ok: false,
      reason: "frontmatter missing required field: description",
    };
  }

  return { ok: true };
}

// --- LR budget guard (T3) ---

/**
 * Compute the net character change introduced by an edit against a body.
 *
 * For `add`: net change = after.length
 * For `delete`: net change = anchor.length (chars removed)
 * For `replace`: net change = |after.length - anchor.length|
 *
 * Returns `Infinity` if anchor is not in body (edit cannot be applied).
 */
export function editNetChange(body: string, edit: SkillEdit): number {
  const { op, anchor, after = "" } = edit;
  if (!body.includes(anchor)) return Infinity;
  switch (op) {
    case "add":
      return after.length;
    case "delete":
      return anchor.length;
    case "replace":
      return Math.abs(after.length - anchor.length);
  }
}

// --- Stable edit key (T4 rejected buffer) ---

/**
 * Produce a stable, deterministic string key for a SkillEdit.
 * Used to populate the rejected-edit buffer.
 */
export function editKey(edit: SkillEdit): string {
  return JSON.stringify({
    op: edit.op,
    anchor: edit.anchor,
    after: edit.after ?? "",
  });
}
