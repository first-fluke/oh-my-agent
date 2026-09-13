import type { SkillUtilityReport } from "../eval.js";
import { redactEvolutionText } from "./evolution-memory.js";
import { evolutionErrorMessage, runEvolutionPrompt } from "./execution.js";
import { DEFAULT_OPTIMIZER_TEMPLATE, renderTemplate } from "./procedure.js";
import type { OptimizerFn, OptimizerOutcome, SkillEdit } from "./types.js";

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
 * Lines that carry content: code fences and blank lines are formatting, not
 * edits, so they never count against the "only EDIT lines" contract.
 */
export function optimizerContentLines(raw: string): string[] {
  return raw
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line && !/^`{3,}[a-zA-Z]*$/.test(line));
}

/** Bounded, redacted excerpt of a response for a parse-error diagnostic. */
export function optimizerResponseExcerpt(raw: string): string {
  return redactEvolutionText(raw).replace(/\s+/g, " ").trim().slice(0, 300);
}

/**
 * Build the real LLM-backed optimizer function.
 *
 * Uses a tool-free compiler invocation to request up to `editsPerEpoch`
 * SKILL.md edits from the supplied training evidence.
 *
 * Returns an OptimizerFn — injectable for tests.
 */
export function buildLlmOptimizerFn(
  editsPerEpoch: number,
  template: string = DEFAULT_OPTIMIZER_TEMPLATE,
): OptimizerFn {
  return (body, findings: SkillUtilityReport, context): OptimizerOutcome => {
    const findingsJson = JSON.stringify(
      {
        utilityLift: findings.utilityLift,
        decision: findings.decision,
        taskCount: findings.taskCount,
        findings: findings.findings.slice(0, 10).map((f) => ({
          taskId: f.taskId,
          baseline: f.baseline,
          treatment: f.treatment,
          lift: f.lift,
          ...(f.evidence
            ? {
                domain: f.evidence.domain,
                prompt: redactEvolutionText(f.evidence.prompt).slice(0, 3_000),
                checker: f.evidence.checker,
                baselineOutput: redactEvolutionText(
                  f.evidence.baselineOutput,
                ).slice(0, 3_000),
                treatmentOutput: redactEvolutionText(
                  f.evidence.treatmentOutput,
                ).slice(0, 3_000),
              }
            : {}),
        })),
      },
      null,
      2,
    );

    const prompt = renderTemplate(template, {
      body,
      findings: findingsJson,
      knowledge: JSON.stringify(
        {
          suiteHash: context?.knowledge.suiteHash,
          priorPatterns: context?.knowledge.patterns.slice(0, 12) ?? [],
          currentPatterns: context?.patterns ?? [],
          rejectedEditKeys:
            context?.knowledge.rejectedEditKeys.slice(-20) ?? [],
          acceptedEditKeys:
            context?.knowledge.acceptedEditKeys.slice(-20) ?? [],
        },
        null,
        2,
      ),
      editsPerEpoch,
    });

    try {
      const output = runEvolutionPrompt(prompt);
      const lines = optimizerContentLines(output);
      if (lines.length === 1 && lines[0] === "NO_ACTION")
        return { status: "no-action", edits: [] };
      const edits = parseOptimizerEdits(output);
      if (
        edits.length > 0 &&
        edits.length === lines.length &&
        lines.every((line) => line.startsWith("EDIT:"))
      )
        return { status: "proposed", edits: edits.slice(0, editsPerEpoch) };
      const offending = lines.find(
        (line) =>
          !line.startsWith("EDIT:") || !parseOptimizerEdits(line).length,
      );
      return {
        status: "parse-error",
        message:
          "Optimizer response must contain only valid EDIT lines or explicit NO_ACTION" +
          ` (${lines.length} content lines, ${edits.length} parsed edits)` +
          `; first offending line: ${optimizerResponseExcerpt(offending ?? output)}`,
      };
    } catch (error) {
      return {
        status: "dispatch-error",
        message: evolutionErrorMessage(error),
      };
    }
  };
}
