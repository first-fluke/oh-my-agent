import { planDispatch } from "../../../io/runtime-dispatch.js";
import {
  resolvePromptFlag,
  resolveVendor,
} from "../../../platform/agent-config.js";
import type { SkillUtilityReport } from "../eval.js";
import type { OptimizerFn, SkillEdit } from "./types.js";

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
