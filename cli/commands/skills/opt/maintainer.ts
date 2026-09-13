import { createHash } from "node:crypto";
import type { SkillUtilityFinding, SkillUtilityReport } from "../eval.js";
import { redactEvolutionText } from "./evolution-memory.js";
import { evolutionErrorMessage, runEvolutionPrompt } from "./execution.js";
import { DEFAULT_MAINTAINER_TEMPLATE, renderTemplate } from "./procedure.js";
import type {
  MaintainerFn,
  MaintainerOutcome,
  SkillEvolutionKnowledge,
  SkillEvolutionPattern,
} from "./types.js";

const EVIDENCE_FIELD_LIMIT = 3_000;
const MAX_FAILURES = 5;
const MAX_SUCCESSES = 3;

function shortHash(value: string): string {
  return createHash("sha256").update(value).digest("hex").slice(0, 12);
}

function cap(value: string): string {
  return redactEvolutionText(value).slice(0, EVIDENCE_FIELD_LIMIT);
}

/**
 * Pick the evidence with learning value. A regression (lift < 0) explains
 * harm; a shared failure (both arms short of full score) explains a gap the
 * skill does not close; a task both arms already pass explains nothing about
 * the next edit and is left out. Regressions come first, then the deepest
 * shared failures; successes are ranked by lift.
 */
export function selectMaintainerEvidence(
  findings: SkillUtilityFinding[],
): SkillUtilityFinding[] {
  const failures = findings
    .filter((finding) => finding.lift <= 0 && finding.treatment < 1)
    .sort((a, b) => a.lift - b.lift || a.treatment - b.treatment)
    .slice(0, MAX_FAILURES);
  const successes = findings
    .filter((finding) => finding.lift > 0)
    .sort((a, b) => b.lift - a.lift)
    .slice(0, MAX_SUCCESSES);
  return [...failures, ...successes];
}

function evidencePayload(findings: SkillUtilityFinding[]): unknown[] {
  return selectMaintainerEvidence(findings).map((finding) => ({
    evidenceId: finding.taskId,
    baseline: finding.baseline,
    treatment: finding.treatment,
    lift: finding.lift,
    ...(finding.evidence
      ? {
          domain: finding.evidence.domain,
          prompt: cap(finding.evidence.prompt),
          checker: finding.evidence.checker,
          baselineOutput: cap(finding.evidence.baselineOutput),
          treatmentOutput: cap(finding.evidence.treatmentOutput),
        }
      : {}),
  }));
}

export function parseMaintainerPatterns(raw: string): SkillEvolutionPattern[] {
  const patterns: SkillEvolutionPattern[] = [];
  for (const line of raw.split("\n")) {
    const trimmed = line.trim();
    const json = trimmed.startsWith("PATTERN:")
      ? trimmed.slice("PATTERN:".length).trim()
      : trimmed.startsWith("{") && trimmed.endsWith("}")
        ? trimmed
        : "";
    if (!json) continue;
    try {
      const parsed = JSON.parse(json) as Record<string, unknown>;
      if (typeof parsed.summary !== "string" || !parsed.summary.trim()) {
        continue;
      }
      const evidenceIds = Array.isArray(parsed.evidenceIds)
        ? parsed.evidenceIds.filter(
            (value): value is string => typeof value === "string",
          )
        : [];
      if (evidenceIds.length === 0) continue;
      const confidence =
        typeof parsed.confidence === "number" &&
        Number.isFinite(parsed.confidence)
          ? Math.max(0, Math.min(parsed.confidence, 1))
          : 0.5;
      const summary = parsed.summary.trim().slice(0, 2_000);
      patterns.push({
        id:
          typeof parsed.id === "string" && parsed.id.trim()
            ? parsed.id.trim().slice(0, 120)
            : `pattern-${shortHash(`${summary}\n${evidenceIds.join("\n")}`)}`,
        summary,
        evidenceIds: [...new Set(evidenceIds)].slice(0, 8),
        confidence,
      });
    } catch {
      // Malformed maintainer output is ignored; raw evidence remains durable.
    }
  }
  return patterns.slice(0, 8);
}

export function buildHeuristicMaintainerFn(): MaintainerFn {
  return (findings) =>
    selectMaintainerEvidence(findings.findings).map((finding) => {
      const result =
        finding.lift > 0
          ? "The skill improved this task; preserve and generalize the successful procedure."
          : "The skill did not improve this task; inspect the observable arm difference before proposing another edit.";
      return {
        id: `pattern-${shortHash(`${finding.taskId}:${finding.lift}`)}`,
        summary: `${result} task=${finding.taskId} baseline=${finding.baseline} treatment=${finding.treatment}.`,
        evidenceIds: [finding.taskId],
        confidence: 0.5,
      };
    });
}

export function buildLlmMaintainerFn(
  template: string = DEFAULT_MAINTAINER_TEMPLATE,
): MaintainerFn {
  return async (
    findings: SkillUtilityReport,
    knowledge: SkillEvolutionKnowledge,
    epoch: number,
  ): Promise<MaintainerOutcome> => {
    const evidence = evidencePayload(findings.findings);
    if (evidence.length === 0) return { status: "consolidated", patterns: [] };
    const prompt = renderTemplate(template, {
      skillId: knowledge.skillId,
      suiteHash: knowledge.suiteHash,
      epoch,
      priorFacts: JSON.stringify(knowledge.patterns.slice(0, 12), null, 2),
      evidence: JSON.stringify(evidence, null, 2),
    });

    try {
      const output = runEvolutionPrompt(prompt);
      const evidenceIds = new Set(
        selectMaintainerEvidence(findings.findings).map(
          (finding) => finding.taskId,
        ),
      );
      const patterns = parseMaintainerPatterns(output).filter((pattern) =>
        pattern.evidenceIds.every((id) => evidenceIds.has(id)),
      );
      if (patterns.length > 0) return { status: "consolidated", patterns };
      return {
        status: "degraded",
        reason: "parse-error",
        patterns: [],
        message:
          "Maintainer response contained no patterns supported by the supplied evidence.",
      };
    } catch (error) {
      // Heuristics are diagnostic suggestions, never silently promoted knowledge.
      const fallback = await buildHeuristicMaintainerFn()(
        findings,
        knowledge,
        epoch,
      );
      return {
        status: "degraded",
        reason: "dispatch-error",
        patterns: Array.isArray(fallback) ? fallback : fallback.patterns,
        message: evolutionErrorMessage(error),
      };
    }
  };
}
