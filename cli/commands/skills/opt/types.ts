import type { ScoreSkillBodyOptions, SkillUtilityReport } from "../eval.js";

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
