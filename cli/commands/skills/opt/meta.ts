import {
  appendFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  renameSync,
  writeFileSync,
} from "node:fs";
import { join, relative, resolve, sep } from "node:path";
import { AGENTS_DIR } from "../../../constants/paths.js";
import { mapWithLimit } from "../eval/concurrency.js";
import { contentHash } from "../eval/rollouts.js";
import { unifiedDiff } from "./diff.js";
import { applyEdit } from "./edits.js";
import { runEvolutionPrompt } from "./execution.js";
import { parseOptimizerEdits } from "./llm-optimizer.js";
import {
  assertConstitutionAllows,
  assertTemplatePlaceholders,
  EVOLUTION_DIR,
  type EvolutionProcedure,
  MAINTAINER_TEMPLATE_FILE,
  OPTIMIZER_TEMPLATE_FILE,
  type ProcedureTarget,
} from "./procedure.js";
import type { SkillEdit } from "./types.js";

/**
 * Meta-optimization: the improvement procedure as the candidate.
 *
 * The inner loop (`oma skill optimize`) turns a procedure (optimizer and
 * maintainer prompts) into a validation-lift gain on one skill. Here the
 * procedure itself is proposed and scored: a candidate procedure is run
 * through the inner loop on several held-out skills, several times, under the
 * same epoch and edit budget as the current procedure, and it is promoted
 * only when the paired bootstrap interval of its gain over the current
 * procedure excludes zero and no skill regresses. The final-test partition,
 * the evaluator code, and the constitution are never touched (Self-Harness
 * held-in/held-out rule extended to the procedure level; Red Queen epoch
 * boundary: the procedure changes only between inner runs).
 */

export interface ProcedureCandidate {
  target: ProcedureTarget;
  template: string;
  hash: string;
  origin: "current" | "proposed";
  edits: SkillEdit[];
}

export interface InnerRunOutcome {
  skill: string;
  repeat: number;
  procedureHash: string;
  status: "completed" | "failed";
  baselineLift: number;
  finalLift: number;
  /** Validation-lift improvement the inner loop achieved; 0 when nothing was accepted. */
  gain: number;
  promotionEligible: boolean;
  acceptedEdits: number;
  /** Model calls the inner run charged against its budget, when metered. */
  callsUsed?: number;
  /** Proposal gate outcomes by reason for this inner run. */
  gateOutcomes?: Record<string, number>;
  error?: string;
}

export interface InnerRunRequest {
  skill: string;
  repeat: number;
  optimizerTemplate: string;
  maintainerTemplate: string;
  procedureHash: string;
  budget: MetaBudget;
}

export type InnerRunner = (
  request: InnerRunRequest,
) => Promise<InnerRunOutcome>;

export interface MetaBudget {
  maxEpochs: number;
  editsPerEpoch: number;
}

export interface InnerDiagnostics {
  runs: number;
  failed: number;
  meanGain: number;
  eligibleRuns: number;
  acceptedEdits: number;
  /** Mean model calls per completed metered run; null when none was metered. */
  meanCalls: number | null;
  /** Proposal gate outcomes summed over completed runs, by reason. */
  gateOutcomes: Record<string, number>;
}

export type MetaProposer = (args: {
  target: ProcedureTarget;
  template: string;
  diagnostics: InnerDiagnostics;
  candidates: number;
}) => Promise<ProcedureCandidate[]> | ProcedureCandidate[];

export interface CandidateDecision {
  candidate: ProcedureCandidate;
  runs: InnerRunOutcome[];
  pairs: number;
  meanDiff: number;
  ci95: { lower: number; upper: number } | null;
  regressions: string[];
  decision: "promote" | "reject" | "inconclusive";
  reasons: string[];
}

export interface MetaReport {
  target: ProcedureTarget;
  skills: string[];
  anchors: string[];
  repeats: number;
  budget: MetaBudget;
  currentHash: string;
  baselineRuns: InnerRunOutcome[];
  candidates: CandidateDecision[];
  winner: CandidateDecision | null;
  anchorCheck: {
    baseline: InnerRunOutcome[];
    winner: InnerRunOutcome[];
  } | null;
  applied: { path: string; backupPath: string; patchPath: string } | null;
}

/** Deterministic PRNG so a bootstrap interval is reproducible from a seed. */
export function mulberry32(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Percentile bootstrap 95% interval of the mean; null below two values. */
export function bootstrapMeanInterval(
  values: number[],
  resamples = 1000,
  seed = 42,
): { lower: number; upper: number } | null {
  if (values.length < 2) return null;
  const random = mulberry32(seed);
  const means: number[] = [];
  for (let r = 0; r < resamples; r += 1) {
    let sum = 0;
    for (let i = 0; i < values.length; i += 1)
      sum += values[Math.floor(random() * values.length)] ?? 0;
    means.push(sum / values.length);
  }
  means.sort((a, b) => a - b);
  const at = (q: number): number =>
    means[
      Math.min(means.length - 1, Math.max(0, Math.floor(q * means.length)))
    ] ?? 0;
  return { lower: at(0.025), upper: at(0.975) };
}

export function summarizeInnerRuns(runs: InnerRunOutcome[]): InnerDiagnostics {
  const completed = runs.filter((run) => run.status === "completed");
  return {
    runs: runs.length,
    failed: runs.length - completed.length,
    meanGain: completed.length
      ? completed.reduce((s, run) => s + run.gain, 0) / completed.length
      : 0,
    eligibleRuns: completed.filter((run) => run.promotionEligible).length,
    acceptedEdits: completed.reduce((s, run) => s + run.acceptedEdits, 0),
    meanCalls: meanCallsUsed(completed),
    gateOutcomes: sumGateOutcomes(completed),
  };
}

function sumGateOutcomes(runs: InnerRunOutcome[]): Record<string, number> {
  const totals: Record<string, number> = {};
  for (const run of runs)
    for (const [reason, count] of Object.entries(run.gateOutcomes ?? {}))
      totals[reason] = (totals[reason] ?? 0) + count;
  return totals;
}

function meanCallsUsed(runs: InnerRunOutcome[]): number | null {
  const metered = runs.filter((run) => typeof run.callsUsed === "number");
  return metered.length
    ? metered.reduce((s, run) => s + (run.callsUsed ?? 0), 0) / metered.length
    : null;
}

function meanGainBySkill(runs: InnerRunOutcome[]): Map<string, number> {
  const sums = new Map<string, { total: number; count: number }>();
  for (const run of runs) {
    if (run.status !== "completed") continue;
    const entry = sums.get(run.skill) ?? { total: 0, count: 0 };
    entry.total += run.gain;
    entry.count += 1;
    sums.set(run.skill, entry);
  }
  return new Map(
    [...sums].map(([skill, { total, count }]) => [skill, total / count]),
  );
}

/**
 * Promote only when the candidate's paired gain over the current procedure has
 * a bootstrap interval above zero and no skill that improved under the current
 * procedure stops improving under the candidate.
 */
export function decideCandidate(
  candidate: ProcedureCandidate,
  baselineRuns: InnerRunOutcome[],
  candidateRuns: InnerRunOutcome[],
  options: { minPairs?: number; seed?: number } = {},
): CandidateDecision {
  const minPairs = options.minPairs ?? 3;
  const key = (run: InnerRunOutcome): string => `${run.skill}#${run.repeat}`;
  const baselineByKey = new Map(
    baselineRuns
      .filter((run) => run.status === "completed")
      .map((run) => [key(run), run]),
  );
  const diffs: number[] = [];
  for (const run of candidateRuns) {
    if (run.status !== "completed") continue;
    const base = baselineByKey.get(key(run));
    if (!base) continue;
    diffs.push(run.gain - base.gain);
  }
  const meanDiff = diffs.length
    ? diffs.reduce((s, v) => s + v, 0) / diffs.length
    : 0;
  const ci95 = bootstrapMeanInterval(diffs, 1000, options.seed ?? 42);
  const baseBySkill = meanGainBySkill(baselineRuns);
  const candBySkill = meanGainBySkill(candidateRuns);
  const regressions = [...baseBySkill]
    .filter(
      ([skill, gain]) => gain > 0 && (candBySkill.get(skill) ?? 0) < gain * 0.5,
    )
    .map(([skill]) => skill)
    .sort();
  const reasons: string[] = [];
  let decision: CandidateDecision["decision"];
  if (diffs.length < minPairs) {
    decision = "inconclusive";
    reasons.push(`insufficient-pairs:${diffs.length}<${minPairs}`);
  } else if (regressions.length > 0) {
    decision = "reject";
    reasons.push(...regressions.map((skill) => `regression:${skill}`));
  } else if (ci95 && ci95.lower > 0 && meanDiff > 0) {
    decision = "promote";
    reasons.push("paired-ci-above-zero");
  } else if (ci95 && ci95.upper < 0) {
    decision = "reject";
    reasons.push("paired-ci-below-zero");
  } else {
    decision = "inconclusive";
    reasons.push("paired-ci-includes-zero");
  }
  return {
    candidate,
    runs: candidateRuns,
    pairs: diffs.length,
    meanDiff,
    ci95,
    regressions,
    decision,
    reasons,
  };
}

/** Turn EDIT lines into validated procedure candidates; invalid ones are dropped. */
export function candidatesFromEdits(
  target: ProcedureTarget,
  template: string,
  edits: SkillEdit[],
  limit: number,
): ProcedureCandidate[] {
  const candidates: ProcedureCandidate[] = [];
  const seen = new Set<string>();
  for (const edit of edits) {
    const next = applyEdit(template, edit);
    if (next === template) continue;
    try {
      assertTemplatePlaceholders(target, next, "proposed candidate");
    } catch {
      continue;
    }
    const hash = contentHash(next);
    if (seen.has(hash)) continue;
    seen.add(hash);
    candidates.push({
      target,
      template: next,
      hash,
      origin: "proposed",
      edits: [edit],
    });
    if (candidates.length >= limit) break;
  }
  return candidates;
}

export function buildLlmMetaProposer(
  prompt: (text: string) => string = runEvolutionPrompt,
): MetaProposer {
  return ({ target, template, diagnostics, candidates }) => {
    const text = [
      "You are refining the improvement procedure of a skill-evolution loop. The procedure is the prompt below; it is used to propose edits to skill documents, and its quality is measured by the validation lift those edits achieve.",
      "",
      `## Current ${target} prompt template`,
      "```markdown",
      template,
      "```",
      "",
      "## Inner-loop diagnostics under this template",
      "```json",
      JSON.stringify(diagnostics, null, 2),
      "```",
      "`gateOutcomes` counts what happened to the edits this template proposed: `accepted`; `split-regression` (lost on the training or validation split); `no-validation-lift` (changed nothing); `negative-transfer` (hurt a neighboring skill's task); `learning-rate` (too large); `invalid-candidate` (anchor not found or frontmatter broken); `not-best-candidate`; `final-test` (accepted, then lost on the frozen test). Aim the edits at the dominant failure.",
      "",
      "## Instructions",
      `Propose up to ${candidates} independent edits to the template that would make the inner loop produce better-grounded, more targeted skill edits. Each edit must be a single JSON object on its own line prefixed with 'EDIT:'.`,
      'Edit format: EDIT: {"op":"add"|"delete"|"replace","anchor":"exact text from the template","after":"replacement/addition text"}',
      "Rules:",
      "- anchor MUST be an exact substring of the current template",
      "- Keep every {{placeholder}} intact",
      "- Each edit changes one instruction and stays under 500 characters",
      "- Do not weaken grounding, safety, or output-format rules",
      "- Emit ONLY EDIT: lines, or NO_ACTION when the diagnostics support no change",
    ].join("\n");
    const output = prompt(text);
    if (output.trim() === "NO_ACTION") return [];
    return candidatesFromEdits(
      target,
      template,
      parseOptimizerEdits(output),
      candidates,
    );
  };
}

export interface RunMetaOptimizationOptions {
  workspace: string;
  procedure: EvolutionProcedure;
  target: ProcedureTarget;
  skills: string[];
  anchors?: string[];
  repeats?: number;
  candidateCount?: number;
  budget: MetaBudget;
  proposer: MetaProposer;
  innerRunner: InnerRunner;
  apply?: boolean;
  seed?: number;
  onProgress?: (message: string) => void;
}

function procedureFile(target: ProcedureTarget): string {
  return target === "optimizer"
    ? OPTIMIZER_TEMPLATE_FILE
    : MAINTAINER_TEMPLATE_FILE;
}

function combinedHash(
  procedure: EvolutionProcedure,
  target: ProcedureTarget,
  templateHash: string,
): string {
  const optimizer =
    target === "optimizer" ? templateHash : procedure.optimizer.hash;
  const maintainer =
    target === "maintainer" ? templateHash : procedure.maintainer.hash;
  return contentHash(
    JSON.stringify([optimizer, maintainer, procedure.constitution.hash]),
  );
}

/** Inner runs of one arm overlap across skills; repeats of a skill stay serial. */
export function metaConcurrency(skillCount: number): number {
  const configured = Number.parseInt(
    process.env.OMA_META_CONCURRENCY ?? "",
    10,
  );
  const limit = Number.isFinite(configured) && configured >= 1 ? configured : 4;
  return Math.max(1, Math.min(limit, skillCount));
}

async function runArm(
  options: RunMetaOptimizationOptions,
  candidate: ProcedureCandidate,
  skills: string[],
  repeats: number,
): Promise<InnerRunOutcome[]> {
  const procedureHash = combinedHash(
    options.procedure,
    options.target,
    candidate.hash,
  );
  // Each skill's evidence lands in its own artifact file, so skills may run
  // side by side; repeats of one skill append to the same file and stay
  // serial.
  const perSkill = await mapWithLimit(
    skills,
    metaConcurrency(skills.length),
    async (skill) => {
      const outcomes: InnerRunOutcome[] = [];
      for (let repeat = 0; repeat < repeats; repeat += 1) {
        options.onProgress?.(
          `${candidate.origin} ${candidate.hash.slice(0, 8)} · ${skill} · repeat ${repeat + 1}/${repeats}`,
        );
        try {
          outcomes.push(
            await options.innerRunner({
              skill,
              repeat,
              optimizerTemplate:
                options.target === "optimizer"
                  ? candidate.template
                  : options.procedure.optimizer.template,
              maintainerTemplate:
                options.target === "maintainer"
                  ? candidate.template
                  : options.procedure.maintainer.template,
              procedureHash,
              budget: options.budget,
            }),
          );
        } catch (error) {
          outcomes.push({
            skill,
            repeat,
            procedureHash,
            status: "failed",
            baselineLift: 0,
            finalLift: 0,
            gain: 0,
            promotionEligible: false,
            acceptedEdits: 0,
            error: error instanceof Error ? error.message : String(error),
          });
        }
      }
      return outcomes;
    },
  );
  return perSkill.flat();
}

export function procedurePromotionsLog(workspace: string): string {
  return join(
    workspace,
    AGENTS_DIR,
    "results",
    "skill-evolution",
    "_procedure",
    "promotions.jsonl",
  );
}

function applyWinner(
  options: RunMetaOptimizationOptions,
  winner: CandidateDecision,
  report: Omit<MetaReport, "applied">,
): MetaReport["applied"] {
  const { constitution } = options.procedure;
  if (!constitution.meta_targets.includes(options.target)) {
    throw new Error(
      `[oma skill meta-optimize] constitution does not list ${options.target} in meta_targets`,
    );
  }
  const relPath = `${EVOLUTION_DIR}/${procedureFile(options.target)}`;
  assertConstitutionAllows(
    constitution,
    options.workspace,
    relPath,
    `writing the ${options.target} procedure`,
  );
  const path = join(options.workspace, relPath);
  mkdirSync(join(options.workspace, EVOLUTION_DIR), { recursive: true });
  const previous = existsSync(path) ? readFileSync(path, "utf-8") : "";
  const current =
    options.target === "optimizer"
      ? options.procedure.optimizer.template
      : options.procedure.maintainer.template;
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const backupPath = `${path}.${stamp}.bak`;
  writeFileSync(backupPath, previous || current, "utf-8");
  const tmp = `${path}.tmp`;
  // Written byte-for-byte so the file's hash equals the promoted candidate's.
  writeFileSync(tmp, winner.candidate.template, "utf-8");
  renameSync(tmp, path);
  const logPath = procedurePromotionsLog(options.workspace);
  mkdirSync(join(logPath, ".."), { recursive: true });
  const patchDir = join(logPath, "..", "promotions");
  mkdirSync(patchDir, { recursive: true });
  const patchPath = join(
    patchDir,
    `${winner.candidate.hash.slice(0, 16)}.patch`,
  );
  writeFileSync(
    patchPath,
    unifiedDiff(current, winner.candidate.template, relPath),
    "utf-8",
  );
  const rel = (p: string): string =>
    relative(resolve(options.workspace), resolve(p)).split(sep).join("/");
  appendFileSync(
    logPath,
    `${JSON.stringify({
      schemaVersion: 1,
      ts: new Date().toISOString(),
      action: "apply",
      target: options.target,
      parentHash: contentHash(current),
      candidateHash: winner.candidate.hash,
      constitutionHash: constitution.hash,
      path: relPath,
      backupPath: rel(backupPath),
      patchPath: rel(patchPath),
      evidence: {
        skills: report.skills,
        repeats: report.repeats,
        budget: report.budget,
        pairs: winner.pairs,
        meanDiff: winner.meanDiff,
        ci95: winner.ci95,
        reasons: winner.reasons,
      },
    })}\n`,
    "utf-8",
  );
  return {
    path: relPath,
    backupPath: rel(backupPath),
    patchPath: rel(patchPath),
  };
}

export async function runMetaOptimization(
  options: RunMetaOptimizationOptions,
): Promise<MetaReport> {
  const repeats = options.repeats ?? 3;
  const candidateCount = options.candidateCount ?? 2;
  const anchors = (options.anchors ?? []).filter(
    (anchor) => !options.skills.includes(anchor),
  );
  if (options.skills.length === 0)
    throw new Error(
      "[oma skill meta-optimize] at least one held-out skill is required",
    );
  const currentTemplate =
    options.target === "optimizer"
      ? options.procedure.optimizer.template
      : options.procedure.maintainer.template;
  const current: ProcedureCandidate = {
    target: options.target,
    template: currentTemplate,
    hash: contentHash(currentTemplate),
    origin: "current",
    edits: [],
  };
  const baselineRuns = await runArm(options, current, options.skills, repeats);
  const diagnostics = summarizeInnerRuns(baselineRuns);
  const proposed = await options.proposer({
    target: options.target,
    template: currentTemplate,
    diagnostics,
    candidates: candidateCount,
  });
  const decisions: CandidateDecision[] = [];
  for (const candidate of proposed) {
    const runs = await runArm(options, candidate, options.skills, repeats);
    decisions.push(
      decideCandidate(candidate, baselineRuns, runs, { seed: options.seed }),
    );
  }
  const promotable = decisions
    .filter((decision) => decision.decision === "promote")
    .sort((a, b) => (b.ci95?.lower ?? 0) - (a.ci95?.lower ?? 0));
  const winner = promotable[0] ?? null;
  let anchorCheck: MetaReport["anchorCheck"] = null;
  if (winner && anchors.length > 0) {
    anchorCheck = {
      baseline: await runArm(options, current, anchors, 1),
      winner: await runArm(options, winner.candidate, anchors, 1),
    };
  }
  const base: Omit<MetaReport, "applied"> = {
    target: options.target,
    skills: options.skills,
    anchors,
    repeats,
    budget: options.budget,
    currentHash: current.hash,
    baselineRuns,
    candidates: decisions,
    winner,
    anchorCheck,
  };
  const applied =
    options.apply && winner ? applyWinner(options, winner, base) : null;
  return { ...base, applied };
}

function callsSuffix(summary: InnerDiagnostics): string {
  return summary.meanCalls === null
    ? ""
    : `  ~${summary.meanCalls.toFixed(0)} calls/run`;
}

export function renderMetaReport(report: MetaReport): void {
  console.log(`\nSkill meta-optimization  (target: ${report.target})`);
  console.log(
    `  skills: ${report.skills.join(", ")}  repeats: ${report.repeats}  budget: ${report.budget.maxEpochs} epochs × ${report.budget.editsPerEpoch} edits`,
  );
  const base = summarizeInnerRuns(report.baselineRuns);
  console.log(
    `  current ${report.currentHash}: mean gain ${(base.meanGain * 100).toFixed(1)}%  eligible ${base.eligibleRuns}/${base.runs}  failed ${base.failed}${callsSuffix(base)}`,
  );
  for (const decision of report.candidates) {
    const cand = summarizeInnerRuns(decision.runs);
    const ci = decision.ci95
      ? `[${(decision.ci95.lower * 100).toFixed(1)}%, ${(decision.ci95.upper * 100).toFixed(1)}%]`
      : "n/a";
    console.log(
      `  candidate ${decision.candidate.hash.slice(0, 8)}: ${decision.decision}  mean gain ${(cand.meanGain * 100).toFixed(1)}%  Δ ${(decision.meanDiff * 100).toFixed(1)}%  CI ${ci}  pairs ${decision.pairs}${callsSuffix(cand)}  ${decision.reasons.join(", ")}`,
    );
  }
  if (report.anchorCheck) {
    const b = summarizeInnerRuns(report.anchorCheck.baseline);
    const w = summarizeInnerRuns(report.anchorCheck.winner);
    console.log(
      `  anchors ${report.anchors.join(", ")}: current ${(b.meanGain * 100).toFixed(1)}% → winner ${(w.meanGain * 100).toFixed(1)}% (informational)`,
    );
  }
  console.log(
    report.applied
      ? `  applied: ${report.applied.path} (backup ${report.applied.backupPath}, patch ${report.applied.patchPath})`
      : `  applied: false${report.winner ? " (dry-run)" : " (no promotable candidate)"}`,
  );
}
