import {
  existsSync,
  mkdirSync,
  readFileSync,
  renameSync,
  writeFileSync,
} from "node:fs";
import { dirname, join, sep } from "node:path";
import { createInterface } from "node:readline";
import { AGENTS_DIR, AGENTS_SKILLS_DIR } from "../../constants/paths.js";
import { planDispatch } from "../../io/runtime-dispatch.js";
import {
  resolvePromptFlag,
  resolveVendor,
} from "../../platform/agent-config.js";
import { parseFrontmatter } from "../../utils/frontmatter.js";
import {
  loadTaskFixtures,
  MIN_TASKS,
  NEG_TRANSFER_FAIL,
  type ScoreSkillBodyOptions,
  type SkillUtilityReport,
  scoreSkillBody,
  type TaskFixture,
} from "./eval.js";

// --- Constants (design 017) ---

export const OPT_MAX_EPOCHS = 8;
export const OPT_EDITS_PER_EPOCH = 4;
export const OPT_LR_MAX_CHARS = 600;
export const OPT_EARLY_STOP_PATIENCE = 2;
export const OPT_TRAIN_VAL_SPLIT = 0.5;

// --- Interfaces (design 017) ---

export interface SkillEdit {
  op: "add" | "delete" | "replace";
  anchor: string;
  before?: string;
  after?: string;
}

export interface OptEpoch {
  epoch: number;
  proposed: number;
  accepted?: SkillEdit;
  lift: number;
  deltaLift: number;
}

export interface SkillOptResult {
  skill: string;
  baselineLift: number;
  finalLift: number;
  epochs: OptEpoch[];
  acceptedEdits: SkillEdit[];
  rejectedCount: number;
  finalSkillMd: string;
  diff: string;
  applied: boolean;
}

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
function editNetChange(body: string, edit: SkillEdit): number {
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
function editKey(edit: SkillEdit): string {
  return JSON.stringify({
    op: edit.op,
    anchor: edit.anchor,
    after: edit.after ?? "",
  });
}

// --- Optimizer function type (T4) ---

/**
 * An OptimizerFn takes the current best body and a SkillUtilityReport (findings
 * from the TRAIN split) and returns a list of proposed SkillEdits.
 *
 * Injectable for tests (deterministic mock). Default builds a real LLM-backed
 * version via planDispatch with readOnly: true, temp 0.
 */
export type OptimizerFn = (
  body: string,
  findings: SkillUtilityReport,
) => SkillEdit[] | Promise<SkillEdit[]>;

// --- Scoring function type (T6 injectable) ---

/**
 * An injectable scoring function for the epoch loop.
 * Has the same signature as scoreSkillBody.
 */
export type ScoringFn = (
  options: ScoreSkillBodyOptions,
) => Promise<SkillUtilityReport>;

// --- Unified diff helper (T5) ---

/**
 * Produce a minimal unified diff between `original` and `final`.
 *
 * This is a pure line-by-line diff — no Date.now/Math.random, deterministic.
 * Produces standard unified diff format (--- / +++ / @@ headers, +/- lines).
 */
export function unifiedDiff(
  original: string,
  final: string,
  filename = "SKILL.md",
): string {
  if (original === final) return "";

  const origLines = original.split("\n");
  const finalLines = final.split("\n");

  // Build a list of chunks using a simple greedy LCS-based diff
  const hunks: string[] = [];

  // Use a simple line diff: mark lines as context/added/removed
  const diff = computeLineDiff(origLines, finalLines);

  // Group into hunks (context=3)
  const CONTEXT = 3;
  let hunkLines: string[] = [];
  const origStart = 0;
  const finalStart = 0;
  const origCount = 0;
  const finalCount = 0;
  let lastChangeIdx = -1;

  for (let i = 0; i < diff.length; i++) {
    const op = diff[i];
    if (op !== "=") {
      lastChangeIdx = i;
    }
  }

  if (lastChangeIdx === -1) return ""; // no changes

  let inHunk = false;
  let hunkOrigStart = 1;
  let hunkFinalStart = 1;
  let hunkOrigCount = 0;
  let hunkFinalCount = 0;
  let pendingContext: string[] = [];
  let origLine = 0;
  let finalLine = 0;

  const flushHunk = () => {
    if (hunkLines.length === 0) return;
    // Trim trailing context lines from hunk (keep only CONTEXT trailing lines)
    let trail = 0;
    for (let k = hunkLines.length - 1; k >= 0; k--) {
      if (hunkLines[k]?.startsWith(" ")) {
        trail++;
      } else {
        break;
      }
    }
    const excess = Math.max(0, trail - CONTEXT);
    if (excess > 0) {
      hunkLines = hunkLines.slice(0, hunkLines.length - excess);
      hunkFinalCount -= excess;
      hunkOrigCount -= excess;
    }
    const header = `@@ -${hunkOrigStart},${hunkOrigCount} +${hunkFinalStart},${hunkFinalCount} @@`;
    hunks.push([header, ...hunkLines].join("\n"));
    hunkLines = [];
    hunkOrigCount = 0;
    hunkFinalCount = 0;
    inHunk = false;
    pendingContext = [];
  };

  // Suppress unused variable warnings
  void origStart;
  void finalStart;
  void origCount;
  void finalCount;

  for (let i = 0; i < diff.length; i++) {
    const op = diff[i] ?? "=";
    const isChange = op !== "=";

    if (isChange) {
      // Flush pending context as leading context lines
      if (!inHunk) {
        const leading = pendingContext.slice(-CONTEXT);
        hunkOrigStart = origLine - leading.length + 1;
        hunkFinalStart = finalLine - leading.length + 1;
        hunkOrigCount = 0;
        hunkFinalCount = 0;
        hunkLines = [...leading];
        hunkOrigCount += leading.length;
        hunkFinalCount += leading.length;
        inHunk = true;
        pendingContext = [];
      } else {
        // Flush any pending context that was accumulated while inHunk
        for (const ctx of pendingContext) {
          hunkLines.push(ctx);
          hunkOrigCount++;
          hunkFinalCount++;
        }
        pendingContext = [];
      }

      if (op === "-") {
        hunkLines.push(`-${origLines[origLine] ?? ""}`);
        hunkOrigCount++;
        origLine++;
      } else if (op === "+") {
        hunkLines.push(`+${finalLines[finalLine] ?? ""}`);
        hunkFinalCount++;
        finalLine++;
      }
    } else {
      // context line
      const ctxLine = ` ${origLines[origLine] ?? ""}`;
      origLine++;
      finalLine++;

      if (inHunk) {
        pendingContext.push(ctxLine);
        // Check if we are far enough from the next change to flush the hunk
        // Look ahead to see if there's a change within CONTEXT lines
        let hasNearChange = false;
        for (let k = 1; k <= CONTEXT && i + k < diff.length; k++) {
          if (diff[i + k] !== "=") {
            hasNearChange = true;
            break;
          }
        }
        if (!hasNearChange && pendingContext.length >= CONTEXT) {
          flushHunk();
        }
      } else {
        pendingContext.push(ctxLine);
        if (pendingContext.length > CONTEXT) {
          pendingContext.shift();
        }
      }
    }
  }

  if (inHunk) {
    flushHunk();
  }

  if (hunks.length === 0) return "";

  return [`--- a/${filename}`, `+++ b/${filename}`, ...hunks].join("\n");
}

/**
 * Compute a line-level diff between two string arrays.
 * Returns an array of operations: "=" (context), "-" (removed), "+" (added).
 *
 * Uses a Myers-style patience diff (greedy LCS via dynamic programming).
 * Deterministic: no random/date.
 */
function computeLineDiff(a: string[], b: string[]): string[] {
  const m = a.length;
  const n = b.length;

  // Build LCS table (m+1 x n+1)
  const dp: number[][] = Array.from({ length: m + 1 }, () =>
    new Array<number>(n + 1).fill(0),
  );

  for (let i = m - 1; i >= 0; i--) {
    for (let j = n - 1; j >= 0; j--) {
      const row = dp[i];
      if (row === undefined) continue;
      if (a[i] === b[j]) {
        row[j] = (dp[i + 1]?.[j + 1] ?? 0) + 1;
      } else {
        row[j] = Math.max(dp[i + 1]?.[j] ?? 0, dp[i]?.[j + 1] ?? 0);
      }
    }
  }

  // Trace back
  const ops: string[] = [];
  let i = 0;
  let j = 0;
  while (i < m && j < n) {
    if (a[i] === b[j]) {
      ops.push("=");
      i++;
      j++;
    } else if ((dp[i + 1]?.[j] ?? 0) >= (dp[i]?.[j + 1] ?? 0)) {
      ops.push("-");
      i++;
    } else {
      ops.push("+");
      j++;
    }
  }
  while (i < m) {
    ops.push("-");
    i++;
  }
  while (j < n) {
    ops.push("+");
    j++;
  }
  return ops;
}

// --- LLM optimizer (real, default) (T4) ---

/**
 * Parse LLM optimizer output into a list of SkillEdits.
 *
 * Expected format (each edit as a JSON object on its own line within a code block
 * or bare, prefixed with "EDIT:"):
 *
 *   EDIT: {"op":"replace","anchor":"old text","after":"new text"}
 *   EDIT: {"op":"add","anchor":"## Section","after":"\n- new bullet"}
 *   EDIT: {"op":"delete","anchor":"line to remove"}
 *
 * Malformed lines are skipped without throwing. Deterministic parsing.
 */
export function parseOptimizerEdits(raw: string): SkillEdit[] {
  const edits: SkillEdit[] = [];
  const lines = raw.split("\n");

  for (const line of lines) {
    const trimmed = line.trim();
    let jsonStr: string | undefined;

    if (trimmed.startsWith("EDIT:")) {
      jsonStr = trimmed.slice(5).trim();
    } else if (trimmed.startsWith("{") && trimmed.endsWith("}")) {
      jsonStr = trimmed;
    }

    if (!jsonStr) continue;

    try {
      const parsed: unknown = JSON.parse(jsonStr);
      if (
        typeof parsed === "object" &&
        parsed !== null &&
        "op" in parsed &&
        "anchor" in parsed &&
        (parsed as Record<string, unknown>).op !== undefined &&
        (parsed as Record<string, unknown>).anchor !== undefined
      ) {
        const obj = parsed as Record<string, unknown>;
        const op = obj.op;
        const anchor = obj.anchor;
        const after = obj.after;
        const before = obj.before;

        if (
          (op === "add" || op === "delete" || op === "replace") &&
          typeof anchor === "string" &&
          (after === undefined || typeof after === "string") &&
          (before === undefined || typeof before === "string")
        ) {
          const edit: SkillEdit = { op, anchor };
          if (typeof after === "string") edit.after = after;
          if (typeof before === "string") edit.before = before;
          edits.push(edit);
        }
      }
    } catch {
      // Skip malformed JSON — deterministic, no crash
    }
  }

  return edits;
}

/**
 * Build the real LLM-backed optimizer function.
 *
 * Uses planDispatch (readOnly: true) to call the LLM with a structured prompt
 * that asks it to emit up to `editsPerEpoch` SKILL.md edits in parseable format.
 * Temperature 0 (via the dispatch's read-only constraint) for determinism.
 *
 * Returns an OptimizerFn — injectable for tests.
 */
export function buildLlmOptimizerFn(editsPerEpoch: number): OptimizerFn {
  return (body: string, findings: SkillUtilityReport): SkillEdit[] => {
    const findingsJson = JSON.stringify(
      {
        utilityLift: findings.utilityLift,
        decision: findings.decision,
        taskCount: findings.taskCount,
        findings: findings.findings.slice(0, 10).map((f) => ({
          taskId: f.taskId,
          lift: f.lift,
        })),
      },
      null,
      2,
    );

    const prompt = [
      "You are a skill document optimizer. Your task is to propose targeted edits to a SKILL.md file to improve its utility.",
      "",
      "## Current SKILL.md body",
      "```markdown",
      body,
      "```",
      "",
      "## Evaluation findings (utility on train tasks)",
      "```json",
      findingsJson,
      "```",
      "",
      `## Instructions`,
      `Propose up to ${editsPerEpoch} targeted edits to improve the skill's utility lift.`,
      "Each edit must be a single JSON object on its own line, prefixed with 'EDIT:'.",
      'Edit format: EDIT: {"op":"add"|"delete"|"replace","anchor":"exact text from SKILL.md","after":"replacement/addition text"}',
      "- op=add: insert 'after' immediately after 'anchor'",
      "- op=delete: remove 'anchor' from the document",
      "- op=replace: replace 'anchor' with 'after'",
      "Rules:",
      "- anchor MUST be an exact substring of the current SKILL.md body",
      "- Each edit must be small and focused (under 600 chars net change)",
      "- Do NOT propose edits that would remove the frontmatter name or description fields",
      "- Emit ONLY the EDIT: lines, no other text",
    ].join("\n");

    try {
      const { vendor, config } = resolveVendor("opt-agent");
      const vendorConfig = config?.vendors?.[vendor] ?? {};
      const promptFlag = resolvePromptFlag(vendor, vendorConfig.prompt_flag);

      const dispatch = planDispatch(
        "opt-agent",
        vendor,
        vendorConfig,
        promptFlag,
        prompt,
        process.env,
        { readOnly: true },
      );

      const { execFileSync } =
        require("node:child_process") as typeof import("node:child_process");
      const { command, args, env } = dispatch.invocation;
      const output = execFileSync(command, args, {
        cwd: process.cwd(),
        env,
        encoding: "utf-8",
        stdio: ["ignore", "pipe", "pipe"],
      });

      return parseOptimizerEdits(typeof output === "string" ? output : "");
    } catch {
      // If LLM dispatch fails, return empty edits (no crash)
      return [];
    }
  };
}

// --- Input validation ---

/**
 * Assert that `skillId` does not contain path traversal characters.
 * A skill ID is a simple identifier: no path separators, no `..`.
 */
function assertSafeSkillId(skillId: string): void {
  if (
    skillId.includes("..") ||
    skillId.includes("/") ||
    skillId.includes(sep)
  ) {
    throw new Error(
      `--skill must be a simple identifier (no path separators or '..'): ${skillId}`,
    );
  }
}

// --- oma-owned guard ---

/**
 * Returns true when the skill is oma-owned (shipped with oh-my-agent).
 *
 * oma-owned skills live under `.agents/skills/oma-*` and are overwritten by
 * `oma update`. Applying edits to them without `--yes` is discouraged.
 */
export function isOmaOwnedSkill(skillId: string): boolean {
  return skillId.startsWith("oma-");
}

// --- SKILL.md path resolution ---

/**
 * Resolve the absolute path to a skill's SKILL.md file.
 *
 * Mirrors the resolution in `loadSkillMdBody` from eval.ts (single source:
 * `<workspace>/<AGENTS_SKILLS_DIR>/<skillId>/SKILL.md`).
 */
export function resolveSkillMdPath(skillId: string, workspace: string): string {
  return join(workspace, AGENTS_SKILLS_DIR, skillId, "SKILL.md");
}

// --- Backup helper ---

/**
 * Back up a SKILL.md to `<path>.bak`.
 *
 * If `<path>.bak` already exists, tries suffixed names (`<path>.bak.1`,
 * `<path>.bak.2`, …) up to 99. Throws when all suffixes are exhausted.
 *
 * Returns the path actually written.
 */
export function backupSkillMd(skillMdPath: string): string {
  const base = `${skillMdPath}.bak`;
  if (!existsSync(base)) {
    const content = readFileSync(skillMdPath, "utf-8");
    writeFileSync(base, content, "utf-8");
    return base;
  }
  for (let i = 1; i <= 99; i++) {
    const candidate = `${base}.${i}`;
    if (!existsSync(candidate)) {
      const content = readFileSync(skillMdPath, "utf-8");
      writeFileSync(candidate, content, "utf-8");
      return candidate;
    }
  }
  throw new Error(
    `[oma skills opt] cannot create backup: all suffix slots (.bak through .bak.99) are taken for ${skillMdPath}`,
  );
}

// --- Live cost preview + confirmation ---

/**
 * Estimate the total number of LLM dispatch calls for a live run.
 *
 * Per epoch: 1 train-score + K candidate-score-on-val + 1 optimizer-call
 *   = editsPerEpoch + 2 scoring calls
 *
 * This is a rough upper-bound; actual calls may be fewer if edits are
 * rejected early (LR budget, validation) or early-stop fires.
 *
 * Returns the estimated call count.
 */
export function estimateLiveDispatchCalls(
  maxEpochs: number,
  editsPerEpoch: number,
): number {
  // Per epoch: 1 optimizer call + 1 train-score + editsPerEpoch val-scores
  return maxEpochs * (1 + 1 + editsPerEpoch);
}

/**
 * Print the live-run cost preview and, unless `yes` is true, prompt the user
 * to confirm before proceeding.
 *
 * Returns a Promise<boolean>: true = proceed, false = user declined.
 * When `yes` is true, prints the preview but skips the prompt (returns true).
 *
 * Uses readline for the interactive prompt (injectable via `_readline` for
 * tests).
 */
export async function confirmLiveRun(
  maxEpochs: number,
  editsPerEpoch: number,
  yes: boolean,
  _readline?: (prompt: string) => Promise<string>,
): Promise<boolean> {
  const calls = estimateLiveDispatchCalls(maxEpochs, editsPerEpoch);
  console.log(
    `[oma skills opt] --live cost preview: up to ${calls} model dispatch calls` +
      ` (${maxEpochs} epochs × (1 optimizer + 1 train-score + ${editsPerEpoch} val-scores)).` +
      ` This incurs real model cost.`,
  );

  if (yes) {
    return true;
  }

  const ask =
    _readline ??
    ((prompt: string): Promise<string> => {
      const rl = createInterface({
        input: process.stdin,
        output: process.stdout,
      });
      return new Promise((resolve) => {
        rl.question(prompt, (answer) => {
          rl.close();
          resolve(answer);
        });
      });
    });

  const answer = await ask("Proceed? [y/N] ");
  return answer.trim().toLowerCase() === "y";
}

// --- Options ---

export interface SkillsOptOptions {
  skill?: string;
  dryRun?: boolean;
  apply?: boolean;
  mock?: boolean;
  live?: boolean;
  maxEpochs?: number;
  editsPerEpoch?: number;
  lr?: number;
  yes?: boolean;
  /** Override task directory (for testing). */
  _taskDir?: string;
  /** Override workspace root (for testing). */
  _workspace?: string;
  /**
   * Injectable optimizer function (for tests / mock mode).
   * When provided, replaces the LLM-backed optimizer.
   */
  _optimizerFn?: OptimizerFn;
  /**
   * Injectable scoring function (for tests / mock mode).
   * When provided, replaces scoreSkillBody.
   */
  _scoringFn?: ScoringFn;
  /**
   * Injectable readline function (for tests).
   * When provided, replaces the interactive stdin prompt in confirmLiveRun.
   */
  _readline?: (prompt: string) => Promise<string>;
  /**
   * Override the SKILL.md path (for testing --apply without touching real files).
   * When provided, replaces resolveSkillMdPath().
   */
  _skillMdPath?: string;
}

// --- Serialization ---

export function serializeSkillOptResult(result: SkillOptResult): string {
  return JSON.stringify(
    {
      ok: result.applied || result.finalLift > result.baselineLift,
      skill: result.skill,
      baselineLift: Number(result.baselineLift.toFixed(4)),
      finalLift: Number(result.finalLift.toFixed(4)),
      epochCount: result.epochs.length,
      acceptedEdits: result.acceptedEdits,
      rejectedCount: result.rejectedCount,
      applied: result.applied,
      diff: result.diff,
    },
    null,
    2,
  );
}

// --- Rendering ---

export function renderSkillOptResult(result: SkillOptResult): void {
  console.log(`\nSkill opt  (skill: ${result.skill})`);
  console.log(`  applied: ${result.applied}`);
  console.log(
    `  baselineLift: ${(result.baselineLift * 100).toFixed(1)}%  finalLift: ${(result.finalLift * 100).toFixed(1)}%`,
  );
  console.log(
    `  epochs: ${result.epochs.length}  acceptedEdits: ${result.acceptedEdits.length}  rejected: ${result.rejectedCount}`,
  );
  if (result.diff) {
    console.log(`\n  diff:\n${result.diff}`);
  }
}

// --- Epoch loop core (T5) ---

/**
 * Score a body on a given task split using the injectable scoring function.
 * Returns the utilityLift from the report (0 if coverage is insufficient).
 */
async function scoreOnSplit(
  body: string,
  skill: string,
  tasks: TaskFixture[],
  taskDir: string,
  mode: "mock" | "live",
  scoringFn: ScoringFn,
): Promise<{ lift: number; report: SkillUtilityReport }> {
  const report = await scoringFn({
    skill,
    body,
    tasks,
    taskDir,
    mode,
  });
  return {
    lift: report.coverage === "ok" ? report.utilityLift : 0,
    report,
  };
}

/**
 * Run the optimization epoch loop.
 *
 * Per epoch (up to maxEpochs):
 * 1. Score current best body on the TRAIN split → findings.
 * 2. Optimizer proposes K edits (filtered by rejected buffer).
 * 3. For each candidate edit:
 *    a. applyEdit → validateCandidate (skip if invalid)
 *    b. enforce LR budget (skip if net change > lrMaxChars)
 *    c. score candidate on the HELD-OUT VAL split → deltaLift
 * 4. Accept the BEST candidate IFF deltaLift > 0 AND no negativeTransfer entry <= NEG_TRANSFER_FAIL.
 *    Otherwise add all proposed edits to the rejected buffer.
 * 5. On accept: update best body + record OptEpoch; on no-accept: increment patience.
 * 6. Early-stop after OPT_EARLY_STOP_PATIENCE consecutive no-accept epochs.
 *
 * Returns a full SkillOptResult.
 */
export async function runOptEpochLoop(options: {
  skillId: string;
  originalBody: string;
  trainTasks: TaskFixture[];
  valTasks: TaskFixture[];
  taskDir: string;
  mode: "mock" | "live";
  maxEpochs: number;
  lrMaxChars: number;
  optimizerFn: OptimizerFn;
  scoringFn: ScoringFn;
}): Promise<SkillOptResult> {
  const {
    skillId,
    originalBody,
    trainTasks,
    valTasks,
    taskDir,
    mode,
    maxEpochs,
    lrMaxChars,
    optimizerFn,
    scoringFn,
  } = options;

  // Baseline: score the original body on the VAL split
  const { lift: baselineLift } = await scoreOnSplit(
    originalBody,
    skillId,
    valTasks,
    taskDir,
    mode,
    scoringFn,
  );

  let bestBody = originalBody;
  let curValLift = baselineLift;

  const epochs: OptEpoch[] = [];
  const acceptedEdits: SkillEdit[] = [];
  const rejectedBuffer = new Set<string>();
  let totalRejected = 0;
  let patience = 0;

  for (let epochIdx = 0; epochIdx < maxEpochs; epochIdx++) {
    // Early-stop check
    if (patience >= OPT_EARLY_STOP_PATIENCE) {
      break;
    }

    // 1. Score current best on TRAIN to get findings for optimizer
    const { report: trainReport, lift: trainLift } = await scoreOnSplit(
      bestBody,
      skillId,
      trainTasks,
      taskDir,
      mode,
      scoringFn,
    );

    // 2. Optimizer proposes K edits, filtered by rejected buffer
    const rawEdits = await optimizerFn(bestBody, trainReport);
    const candidateEdits = rawEdits.filter(
      (e) => !rejectedBuffer.has(editKey(e)),
    );

    // 3. Score each candidate on the HELD-OUT VAL split
    let bestCandidateDeltaLift = -Infinity;
    let bestCandidateEdit: SkillEdit | undefined;
    let bestCandidateBody: string | undefined;
    let bestCandidateReport: SkillUtilityReport | undefined;

    const allProposedKeys: string[] = [];

    for (const edit of candidateEdits) {
      allProposedKeys.push(editKey(edit));

      // LR budget check
      const netChange = editNetChange(bestBody, edit);
      if (netChange > lrMaxChars) {
        totalRejected++;
        rejectedBuffer.add(editKey(edit));
        continue;
      }

      // Apply edit
      const candidateBody = applyEdit(bestBody, edit);

      // Candidate validation
      const validation = validateCandidate(candidateBody);
      if (!validation.ok) {
        totalRejected++;
        rejectedBuffer.add(editKey(edit));
        continue;
      }

      // Score on VAL split
      const { lift: candValLift, report: candReport } = await scoreOnSplit(
        candidateBody,
        skillId,
        valTasks,
        taskDir,
        mode,
        scoringFn,
      );

      const deltaLift = candValLift - curValLift;

      if (deltaLift > bestCandidateDeltaLift) {
        bestCandidateDeltaLift = deltaLift;
        bestCandidateEdit = edit;
        bestCandidateBody = candidateBody;
        bestCandidateReport = candReport;
      }
    }

    // 4. Accept the best candidate IFF deltaLift > 0 AND no negativeTransfer <= NEG_TRANSFER_FAIL
    const epochProposed = candidateEdits.length;
    let accepted = false;

    if (
      bestCandidateEdit !== undefined &&
      bestCandidateBody !== undefined &&
      bestCandidateDeltaLift > 0
    ) {
      // Check negative transfer gate
      const negTransferEntries = bestCandidateReport?.negativeTransfer ?? [];
      const tripsNegTransfer = negTransferEntries.some(
        (nt) => nt.delta <= NEG_TRANSFER_FAIL,
      );

      if (!tripsNegTransfer) {
        // Accept
        const newValLift = curValLift + bestCandidateDeltaLift;
        const epochRecord: OptEpoch = {
          epoch: epochIdx,
          proposed: epochProposed,
          accepted: bestCandidateEdit,
          lift: newValLift,
          deltaLift: bestCandidateDeltaLift,
        };
        epochs.push(epochRecord);
        acceptedEdits.push(bestCandidateEdit);
        bestBody = bestCandidateBody;
        curValLift = newValLift;
        patience = 0;
        accepted = true;
      }
    }

    if (!accepted) {
      // Add all proposed edit keys to rejected buffer
      for (const key of allProposedKeys) {
        if (!rejectedBuffer.has(key)) {
          rejectedBuffer.add(key);
          totalRejected++;
        }
      }

      // Also count candidates that were already rejected (LR, invalid) in this epoch
      // (those were already added above)
      const epochRecord: OptEpoch = {
        epoch: epochIdx,
        proposed: epochProposed,
        lift: curValLift,
        deltaLift: 0,
      };
      epochs.push(epochRecord);
      patience++;
    }

    // Suppress unused variable warning
    void trainLift;
  }

  // Final diff: original → bestBody
  const diff = unifiedDiff(originalBody, bestBody);

  return {
    skill: skillId,
    baselineLift,
    finalLift: curValLift,
    epochs,
    acceptedEdits,
    rejectedCount: totalRejected,
    finalSkillMd: bestBody,
    diff,
    applied: false,
  };
}

// --- Main entry point ---

/**
 * CLI entry point for `oma skills opt`.
 *
 * M3 scope: full OUTPUT layer (tasks 7–8).
 * - Resolves skill's eval task directory and loads fixtures.
 * - Errors with a clear message (non-zero exit) when < MIN_TASKS fixtures exist.
 * - Splits fixtures into train/val sets.
 * - --live: prints cost preview + requires confirmation unless --yes.
 * - Runs the optimization epoch loop using injectable optimizer + scoring functions.
 * - --dry-run (default): prints diff + lift change, writes nothing.
 * - --apply: backs up original SKILL.md to .bak, writes finalSkillMd only when
 *   finalLift > baselineLift AND validateCandidate passes.
 *   - oma-owned skills (oma-*): requires --yes to proceed, otherwise warns + refuses.
 */
export async function runSkillsOpt(
  jsonMode: boolean,
  options: SkillsOptOptions = {},
): Promise<void> {
  const workspace = options._workspace ?? process.cwd();
  const skillId = options.skill ?? "_all";

  // Validate skill ID (no path traversal)
  try {
    assertSafeSkillId(skillId);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (jsonMode) {
      console.log(JSON.stringify({ error: message }, null, 2));
    } else {
      console.error(message);
    }
    process.exit(1);
  }

  // Resolve task directory
  const taskDir =
    options._taskDir ?? join(workspace, AGENTS_DIR, "eval", skillId);

  // Load task fixtures
  const { fixtures } = loadTaskFixtures(taskDir);

  // Hard check: need at least MIN_TASKS fixtures for a meaningful train/val split
  if (fixtures.length < MIN_TASKS) {
    const message = `[oma skills opt] no eval coverage for skill "${skillId}": found ${fixtures.length} task fixture(s), need at least ${MIN_TASKS}. Author tasks first — see web/docs/guide/skill-eval.md`;
    if (jsonMode) {
      console.log(JSON.stringify({ error: message }, null, 2));
    } else {
      console.error(message);
    }
    process.exit(1);
  }

  // Split train/val deterministically
  const { train, val } = splitTrainVal(fixtures);

  // Resolve effective options (--dry-run is the default when neither flag is set)
  const apply = options.apply === true;
  const dryRun = !apply;
  const isLive = options.live === true;
  const yes = options.yes === true;
  const mode: "mock" | "live" = isLive ? "live" : "mock";

  const maxEpochs = options.maxEpochs ?? OPT_MAX_EPOCHS;
  const editsPerEpoch = options.editsPerEpoch ?? OPT_EDITS_PER_EPOCH;
  const lrMaxChars = options.lr ?? OPT_LR_MAX_CHARS;

  // --- Live cost preview + confirmation (T7) ---
  if (isLive) {
    const proceed = await confirmLiveRun(
      maxEpochs,
      editsPerEpoch,
      yes,
      options._readline,
    );
    if (!proceed) {
      if (!jsonMode) {
        console.log("[oma skills opt] aborted: user declined live run.");
      } else {
        console.log(
          JSON.stringify(
            { aborted: true, reason: "user declined live cost preview" },
            null,
            2,
          ),
        );
      }
      return; // exit 0 — no dispatch
    }
  }

  // Resolve injectable functions (for test / mock determinism)
  const optimizerFn: OptimizerFn =
    options._optimizerFn ?? buildLlmOptimizerFn(editsPerEpoch);
  const scoringFn: ScoringFn = options._scoringFn ?? scoreSkillBody;

  // Load original SKILL.md body (for diff and baseline).
  // When _skillMdPath is injected (tests), read from there; otherwise use
  // the standard installed-skills resolution via loadSkillMdBody.
  let originalBody: string;
  if (options._skillMdPath) {
    originalBody = existsSync(options._skillMdPath)
      ? readFileSync(options._skillMdPath, "utf-8")
      : "";
  } else {
    const { loadSkillMdBody } = await import("./eval.js");
    originalBody = loadSkillMdBody(skillId, workspace);
  }

  // Run the optimization epoch loop
  const loopResult = await runOptEpochLoop({
    skillId,
    originalBody,
    trainTasks: train,
    valTasks: val,
    taskDir,
    mode,
    maxEpochs,
    lrMaxChars,
    optimizerFn,
    scoringFn,
  });

  // --- Output layer (T7): --dry-run vs --apply ---

  let finalResult: SkillOptResult = { ...loopResult, applied: false };

  if (apply) {
    const hasImprovement = loopResult.finalLift > loopResult.baselineLift;
    const validation = validateCandidate(loopResult.finalSkillMd);

    if (!hasImprovement) {
      // No real improvement — write nothing
      const noImpMsg = `[oma skills opt] no improving edit found (finalLift ${loopResult.finalLift.toFixed(4)} <= baselineLift ${loopResult.baselineLift.toFixed(4)}); nothing written.`;
      if (!jsonMode) {
        console.log(noImpMsg);
        renderSkillOptResult(finalResult);
      } else {
        console.log(
          JSON.stringify(
            {
              ...JSON.parse(serializeSkillOptResult(finalResult)),
              _dryRun: false,
              _noImprovement: true,
              _split: { trainCount: train.length, valCount: val.length },
            },
            null,
            2,
          ),
        );
      }
      return;
    }

    if (!validation.ok) {
      // Candidate failed validation — write nothing
      const validMsg = `[oma skills opt] candidate failed validation (${validation.reason}); nothing written.`;
      if (!jsonMode) {
        console.error(validMsg);
        renderSkillOptResult(finalResult);
      } else {
        console.log(
          JSON.stringify(
            {
              ...JSON.parse(serializeSkillOptResult(finalResult)),
              _dryRun: false,
              _validationFailed: true,
              _validationReason: validation.reason,
              _split: { trainCount: train.length, valCount: val.length },
            },
            null,
            2,
          ),
        );
      }
      return;
    }

    // --- oma-owned guard ---
    if (isOmaOwnedSkill(skillId) && !yes) {
      const warnMsg =
        `[oma skills opt] WARNING: "${skillId}" is an oma-owned skill. ` +
        `oma-owned skills are overwritten by \`oma update\` — applying edits here may be lost. ` +
        `Re-run with --yes to proceed, or use --dry-run to review the proposed diff.`;
      if (!jsonMode) {
        console.warn(warnMsg);
      } else {
        console.log(
          JSON.stringify(
            {
              ...JSON.parse(serializeSkillOptResult(finalResult)),
              _dryRun: false,
              _omaOwnedRefused: true,
              _split: { trainCount: train.length, valCount: val.length },
            },
            null,
            2,
          ),
        );
      }
      return;
    }

    // --- Write the improved SKILL.md ---
    const skillMdPath =
      options._skillMdPath ?? resolveSkillMdPath(skillId, workspace);

    // Ensure the skill directory exists (in case it is brand-new)
    const skillDir = dirname(skillMdPath);
    mkdirSync(skillDir, { recursive: true });

    // Backup original BEFORE touching the live file
    if (existsSync(skillMdPath)) {
      backupSkillMd(skillMdPath);
    }

    // Atomic write: write to a sibling .tmp file on the SAME filesystem,
    // then rename into place. On POSIX, rename(2) is atomic — the live
    // SKILL.md is never in a truncated/partial state even if the process
    // is killed between the writeFileSync and the renameSync.
    const tmpPath = `${skillMdPath}.tmp`;
    writeFileSync(tmpPath, loopResult.finalSkillMd, "utf-8");
    renameSync(tmpPath, skillMdPath);

    finalResult = { ...loopResult, applied: true };

    if (!jsonMode) {
      console.log(
        `[oma skills opt] applied: wrote ${skillMdPath} (backup created).`,
      );
      renderSkillOptResult(finalResult);
    } else {
      console.log(
        JSON.stringify(
          {
            ...JSON.parse(serializeSkillOptResult(finalResult)),
            _dryRun: false,
            _split: { trainCount: train.length, valCount: val.length },
          },
          null,
          2,
        ),
      );
    }
    return;
  }

  // --- dry-run (default): print diff + lift, write nothing ---
  if (jsonMode) {
    console.log(
      JSON.stringify(
        {
          ...JSON.parse(serializeSkillOptResult(finalResult)),
          _dryRun: dryRun,
          _split: { trainCount: train.length, valCount: val.length },
        },
        null,
        2,
      ),
    );
  } else {
    console.log(
      `[oma skills opt] skill: ${skillId}, tasks: ${fixtures.length} (train: ${train.length}, val: ${val.length}), dry-run: ${dryRun}`,
    );
    renderSkillOptResult(finalResult);
  }
}
