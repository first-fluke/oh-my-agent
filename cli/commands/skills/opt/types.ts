import type { MemoryProvider } from "../../../types/memory.js";
import type { ScoreSkillBodyOptions, SkillUtilityReport } from "../eval.js";

// --- Constants (design 017) ---

export const OPT_MAX_EPOCHS = 8;
export const OPT_EDITS_PER_EPOCH = 4;
export const OPT_LR_MAX_CHARS = 600;
export const OPT_EARLY_STOP_PATIENCE = 2;
export const OPT_TRAIN_VAL_SPLIT = 0.5;
export const OPT_TRAIN_SPLIT = 0.6;
export const OPT_VALIDATION_SPLIT = 0.2;

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
  patterns?: SkillEvolutionPattern[];
}

export interface SkillEvolutionPattern {
  id: string;
  summary: string;
  evidenceIds: string[];
  confidence: number;
}

export interface SkillEvolutionKnowledge {
  skillId: string;
  suiteHash: string;
  sourceRuntime?: string;
  targetRuntime?: string;
  environmentHash?: string;
  patterns: string[];
  rejectedEditKeys: string[];
  acceptedEditKeys: string[];
}

export interface SkillOptimizerContext {
  epoch: number;
  knowledge: SkillEvolutionKnowledge;
  patterns: SkillEvolutionPattern[];
}

export type OptimizerOutcome =
  | { status: "proposed"; edits: SkillEdit[] }
  | { status: "no-action"; edits: [] }
  | { status: "dispatch-error" | "parse-error"; message: string };

export type MaintainerOutcome =
  | { status: "consolidated"; patterns: SkillEvolutionPattern[] }
  | {
      status: "degraded";
      patterns: SkillEvolutionPattern[];
      reason: "dispatch-error" | "parse-error";
      message: string;
    };

export interface EvolutionDiagnostic {
  stage: "optimizer" | "maintainer" | "validation" | "budget";
  status: string;
  message: string;
}

export interface SkillProposalGateRecord {
  epoch: number;
  edit: SkillEdit;
  editKey: string;
  outcome: "accepted" | "rejected" | "inconclusive";
  reason:
    | "accepted"
    | "learning-rate"
    | "invalid-candidate"
    | "no-validation-lift"
    | "split-regression"
    | "not-best-candidate"
    | "negative-transfer"
    | "negative-transfer-unmeasured"
    | "insufficient-coverage"
    | "unverified-isolation"
    | "final-test";
  /** Held-out validation delta against the current best body. */
  deltaLift: number;
  /** Held-in training delta against the current best body (candidates only). */
  deltaTrainLift?: number;
  /** Paired neighbor deltas behind a negative-transfer verdict. */
  negativeTransfer?: Array<{
    taskId?: string;
    otherSkill: string;
    delta: number;
    trials?: number;
    confirmed?: boolean;
  }>;
}

export interface SkillEvolutionRecorder {
  knowledge: SkillEvolutionKnowledge;
  recordEvidence(
    epoch: number,
    report: SkillUtilityReport,
  ): Promise<void> | void;
  recordPatterns(
    epoch: number,
    patterns: SkillEvolutionPattern[],
  ): Promise<void> | void;
  recordProposal(record: SkillProposalGateRecord): Promise<void> | void;
  complete(result: SkillOptResult): Promise<void> | void;
  fail?(error: unknown): Promise<void> | void;
}

export interface SkillOptResult {
  skill: string;
  /** Held-out validation lift of the original body. */
  baselineLift: number;
  /** Held-out validation lift of the final body. */
  finalLift: number;
  /** Held-in training lift of the original body (absent when the loop never scored it). */
  baselineTrainLift?: number;
  /** Held-in training lift of the final body. */
  finalTrainLift?: number;
  /** Model calls charged against the constitution budget (live runs). */
  budget?: { limit: number | null; used: number };
  epochs: OptEpoch[];
  acceptedEdits: SkillEdit[];
  rejectedCount: number;
  finalSkillMd: string;
  diff: string;
  applied: boolean;
  diagnostics?: EvolutionDiagnostic[];
  promotion?: { eligible: boolean; reasons: string[] };
  evolution?: {
    suiteHash: string;
    persistentPatterns: number;
    persistentRejectedEdits: number;
  };
  finalTest?: {
    baselineLift: number;
    candidateLift: number;
    passed: boolean;
    blocker?: string;
  };
  /** Which procedure files and constitution shaped this run. */
  procedure?: {
    hash: string;
    optimizer: { source: string; hash: string };
    maintainer: { source: string; hash: string };
    constitution: { source: string; hash: string };
  };
  /** `recall` reuses persistent knowledge; `none` starts from an empty memory. */
  memory?: "recall" | "none";
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
  context?: SkillOptimizerContext,
) => SkillEdit[] | OptimizerOutcome | Promise<SkillEdit[] | OptimizerOutcome>;

export type MaintainerFn = (
  findings: SkillUtilityReport,
  knowledge: SkillEvolutionKnowledge,
  epoch: number,
) =>
  | SkillEvolutionPattern[]
  | MaintainerOutcome
  | Promise<SkillEvolutionPattern[] | MaintainerOutcome>;

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
  /**
   * `recall` (default) loads persistent patterns and past gate outcomes;
   * `none` runs with an empty memory so the two can be compared under the
   * same budget. Events and artifacts are recorded either way.
   */
  memory?: "recall" | "none";
  /** Mute console output; the caller consumes the returned result (meta-optimization). */
  _quiet?: boolean;
  /** Override task directory (for testing). */
  _taskDir?: string;
  /** Override workspace root (for testing). */
  _workspace?: string;
  /**
   * Injectable optimizer function (for tests / mock mode).
   * When provided, replaces the LLM-backed optimizer.
   */
  _optimizerFn?: OptimizerFn;
  /** Injectable WikiSkill-style evidence consolidator. */
  _maintainerFn?: MaintainerFn;
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
  /** Injectable memory provider for hermetic tests. */
  _memoryProvider?: MemoryProvider;
  /** Injectable evolution recorder for epoch-loop tests. */
  _evolutionRecorder?: SkillEvolutionRecorder;
}
