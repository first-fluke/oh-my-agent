import { createHash } from "node:crypto";
import { appendFileSync, mkdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import {
  AGENTS_RESULTS_DIR,
  agentsPathFromRoot,
} from "../../../constants/paths.js";
import {
  createSessionId,
  emitEvent,
  emitEventWithMemory,
  listSessionIds,
  type OmaEvent,
  readEvents,
  sessionDir,
} from "../../../state/events.js";
import type { MemoryProvider } from "../../../types/memory.js";
import { taskFixtureHash } from "../eval/rollouts.js";
import type { SkillUtilityReport, TaskFixture } from "../eval.js";
import type {
  SkillEvolutionKnowledge,
  SkillEvolutionPattern,
  SkillEvolutionRecorder,
  SkillOptResult,
  SkillProposalGateRecord,
} from "./types.js";

const HISTORY_LIMIT = 24;
const EVIDENCE_LIMIT = 8;
const TRACE_FIELD_LIMIT = 15_000;

function hash(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

function cap(value: string): string {
  return redactEvolutionText(value).slice(0, TRACE_FIELD_LIMIT);
}

export function redactEvolutionText(value: string): string {
  return value
    .replace(/\bsk-[A-Za-z0-9_-]{16,}\b/g, "[REDACTED]")
    .replace(/\bAKIA[A-Z0-9]{16}\b/g, "[REDACTED]")
    .replace(
      /\b(authorization\s*:\s*bearer|api[_-]?key|secret|password|auth[_-]?token|access[_-]?token)\s*[:=]?\s*["']?[A-Za-z0-9._~+/-]{8,}["']?/gi,
      "$1=[REDACTED]",
    );
}

export function skillEvolutionSuiteHash(tasks: TaskFixture[]): string {
  const canonical = [...tasks]
    .sort((a, b) => a.id.localeCompare(b.id))
    .map(taskFixtureHash);
  return hash(JSON.stringify(canonical)).slice(0, 16);
}

export function skillEvolutionEnvironmentHash(mode: "mock" | "live"): string {
  return hash(
    JSON.stringify({
      mode,
      platform: process.platform,
      architecture: process.arch,
      node: process.versions.node,
    }),
  ).slice(0, 16);
}

export function skillEvolutionScopeTag(
  knowledge: Pick<
    SkillEvolutionKnowledge,
    | "skillId"
    | "suiteHash"
    | "sourceRuntime"
    | "targetRuntime"
    | "environmentHash"
  >,
): string {
  return `[skill-evolution:${[
    knowledge.skillId,
    knowledge.suiteHash,
    knowledge.sourceRuntime,
    knowledge.targetRuntime,
    knowledge.environmentHash,
  ]
    .filter(Boolean)
    .join(":")}]`;
}

function matchesScope(
  event: OmaEvent,
  knowledge: Pick<
    SkillEvolutionKnowledge,
    | "skillId"
    | "suiteHash"
    | "sourceRuntime"
    | "targetRuntime"
    | "environmentHash"
  >,
): boolean {
  if (
    event.payload?.skillId !== knowledge.skillId ||
    event.payload?.suiteHash !== knowledge.suiteHash
  ) {
    return false;
  }
  for (const key of [
    "sourceRuntime",
    "targetRuntime",
    "environmentHash",
  ] as const) {
    if (knowledge[key] && event.payload?.[key] !== knowledge[key]) return false;
  }
  return true;
}

export function loadLocalSkillEvolutionKnowledge(
  workspace: string,
  skillId: string,
  suiteHash: string,
  scope: Pick<
    SkillEvolutionKnowledge,
    "sourceRuntime" | "targetRuntime" | "environmentHash"
  > = {},
): SkillEvolutionKnowledge {
  const base = { skillId, suiteHash, ...scope };
  const patterns: string[] = [];
  const rejectedEditKeys: string[] = [];
  const acceptedEditKeys: string[] = [];
  let entries: string[] = [];
  try {
    entries = listSessionIds(workspace)
      .map((entry) => {
        try {
          const stat = statSync(sessionDir(workspace, entry));
          return stat.isDirectory() ? { entry, mtimeMs: stat.mtimeMs } : null;
        } catch {
          return null;
        }
      })
      .filter(
        (value): value is { entry: string; mtimeMs: number } => value !== null,
      )
      .sort((a, b) => a.mtimeMs - b.mtimeMs || a.entry.localeCompare(b.entry))
      .slice(-100)
      .map(({ entry }) => entry);
  } catch {
    return { ...base, patterns, rejectedEditKeys, acceptedEditKeys };
  }

  for (const sid of entries) {
    for (const event of readEvents(workspace, sid)) {
      if (!matchesScope(event, base)) continue;
      if (event.kind === "skill.pattern.consolidated") {
        const summary = event.payload?.summary;
        if (typeof summary === "string" && summary.trim()) {
          patterns.push(summary.trim());
        }
      }
      if (event.kind === "skill.proposal.gated") {
        // Final verdicts are audit-only, including history written by older versions.
        if (event.payload?.reason === "final-test") continue;
        const key = event.payload?.editKey;
        const outcome = event.payload?.outcome;
        if (typeof key !== "string") continue;
        if (outcome === "accepted") {
          acceptedEditKeys.push(key);
        }
        if (outcome === "rejected") rejectedEditKeys.push(key);
      }
    }
  }

  return {
    ...base,
    patterns: [...new Set(patterns)].slice(-HISTORY_LIMIT),
    rejectedEditKeys: [...new Set(rejectedEditKeys)],
    acceptedEditKeys: [...new Set(acceptedEditKeys)].filter(
      (key) => !rejectedEditKeys.includes(key),
    ),
  };
}

async function enrichWithSemanticRecall(
  provider: MemoryProvider,
  knowledge: SkillEvolutionKnowledge,
): Promise<SkillEvolutionKnowledge> {
  if (typeof provider.recall !== "function") return knowledge;
  const tag = skillEvolutionScopeTag(knowledge);
  const recalled = await provider.recall({
    query: `${tag} root cause successful strategy rejected proposal`,
    limit: HISTORY_LIMIT,
  });
  const scoped = recalled
    .filter(
      (fact) =>
        fact.text.includes(tag) &&
        !/Reason: final-test(?:\s|$)/.test(fact.text) &&
        !fact.text.includes("Proposal inconclusive:"),
    )
    .map((fact) => fact.text.slice(0, 4_000));
  return {
    ...knowledge,
    patterns: [...new Set([...knowledge.patterns, ...scoped])].slice(
      -HISTORY_LIMIT,
    ),
  };
}

function artifactRecord(report: SkillUtilityReport, epoch: number): unknown {
  const failures = report.findings.filter((finding) => finding.lift <= 0);
  const successes = report.findings.filter((finding) => finding.lift > 0);
  const selected = [...failures.slice(0, 5), ...successes.slice(0, 3)].slice(
    0,
    EVIDENCE_LIMIT,
  );
  return {
    type: "training-evidence",
    epoch,
    skill: report.skill,
    utilityLift: report.utilityLift,
    coverage: report.coverage,
    findings: selected.map((finding) => ({
      taskId: finding.taskId,
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
    })),
  };
}

export async function createSkillEvolutionRecorder(args: {
  workspace: string;
  skillId: string;
  tasks: TaskFixture[];
  provider: MemoryProvider;
  sourceRuntime?: string;
  targetRuntime?: string;
  environmentHash?: string;
  /** false: start from empty knowledge (memory ablation); events still record. */
  recall?: boolean;
  procedureHash?: string;
}): Promise<SkillEvolutionRecorder> {
  const suiteHash = skillEvolutionSuiteHash(args.tasks);
  const sid = createSessionId();
  const recall = args.recall !== false;
  const scope = {
    sourceRuntime: args.sourceRuntime,
    targetRuntime: args.targetRuntime,
    environmentHash: args.environmentHash,
  };
  const local: SkillEvolutionKnowledge = recall
    ? loadLocalSkillEvolutionKnowledge(
        args.workspace,
        args.skillId,
        suiteHash,
        scope,
      )
    : {
        skillId: args.skillId,
        suiteHash,
        ...scope,
        patterns: [],
        rejectedEditKeys: [],
        acceptedEditKeys: [],
      };
  const knowledge = recall
    ? await enrichWithSemanticRecall(args.provider, local)
    : local;
  const memoryMode: "recall" | "none" = recall ? "recall" : "none";
  const artifactDir = agentsPathFromRoot(
    args.workspace,
    `${AGENTS_RESULTS_DIR}/skill-evolution/${args.skillId}`,
  );
  const artifactPath = join(artifactDir, `${sid}.jsonl`);
  const artifactRelative = relative(args.workspace, artifactPath);
  mkdirSync(artifactDir, { recursive: true });

  const emit = async (
    kind: string,
    payload: Record<string, unknown>,
  ): Promise<OmaEvent> => {
    if (
      args.provider.name === "none" ||
      kind === "skill.evolution.completed" ||
      (kind === "skill.proposal.gated" &&
        (payload.reason === "final-test" || payload.outcome === "inconclusive"))
    ) {
      return emitEvent(args.workspace, sid, { kind, payload });
    }
    return emitEventWithMemory(
      args.workspace,
      sid,
      { kind, payload },
      args.provider,
    );
  };
  const scopePayload = {
    skillId: args.skillId,
    suiteHash,
    ...(args.sourceRuntime ? { sourceRuntime: args.sourceRuntime } : {}),
    ...(args.targetRuntime ? { targetRuntime: args.targetRuntime } : {}),
    ...(args.environmentHash ? { environmentHash: args.environmentHash } : {}),
  };

  await emit("session.created", {
    workflow: "skill-evolution",
    category: "skill-evolution",
  });
  await emit("skill.evolution.started", {
    ...scopePayload,
    artifact: artifactRelative,
    memory: memoryMode,
    procedureHash: args.procedureHash,
    recalledPatterns: knowledge.patterns.length,
    recalledRejectedEdits: knowledge.rejectedEditKeys.length,
  });

  return {
    knowledge,
    async recordEvidence(epoch, report) {
      const record = artifactRecord(report, epoch);
      const serialized = JSON.stringify(record);
      appendFileSync(artifactPath, `${serialized}\n`, "utf-8");
      const evidenceIds = report.findings
        .slice(0, EVIDENCE_LIMIT)
        .map((finding) => finding.taskId);
      await emit("skill.rollout.recorded", {
        ...scopePayload,
        epoch,
        artifact: artifactRelative,
        artifactHash: hash(serialized),
        evidenceIds,
      });
    },
    async recordPatterns(epoch, patterns: SkillEvolutionPattern[]) {
      for (const pattern of patterns) {
        knowledge.patterns = [
          ...new Set([...knowledge.patterns, pattern.summary]),
        ].slice(-HISTORY_LIMIT);
        await emit("skill.pattern.consolidated", {
          ...scopePayload,
          epoch,
          patternId: pattern.id,
          summary: pattern.summary,
          evidenceIds: pattern.evidenceIds.join(","),
          confidence: pattern.confidence,
        });
      }
    },
    async recordProposal(record: SkillProposalGateRecord) {
      if (record.reason !== "final-test") {
        await emit("skill.proposal.created", {
          ...scopePayload,
          epoch: record.epoch,
          edit: record.edit,
          editKey: record.editKey,
        });
      }
      if (record.reason !== "final-test" && record.outcome === "accepted") {
        knowledge.acceptedEditKeys = [
          ...new Set([...knowledge.acceptedEditKeys, record.editKey]),
        ];
      } else if (
        record.reason !== "final-test" &&
        record.outcome === "rejected"
      ) {
        knowledge.rejectedEditKeys = [
          ...new Set([...knowledge.rejectedEditKeys, record.editKey]),
        ];
        knowledge.acceptedEditKeys = knowledge.acceptedEditKeys.filter(
          (key) => key !== record.editKey,
        );
      }
      await emit("skill.proposal.gated", {
        ...scopePayload,
        epoch: record.epoch,
        edit: record.edit,
        editKey: record.editKey,
        outcome: record.outcome,
        reason: record.reason,
        deltaLift: record.deltaLift,
      });
      appendFileSync(
        artifactPath,
        `${JSON.stringify({ type: "proposal-gate", ...record })}\n`,
        "utf-8",
      );
    },
    async complete(result: SkillOptResult) {
      appendFileSync(
        artifactPath,
        `${JSON.stringify({
          type: "run-summary",
          ts: new Date().toISOString(),
          status: "completed",
          memory: memoryMode,
          procedureHash: args.procedureHash,
          baselineLift: result.baselineLift,
          finalLift: result.finalLift,
          finalTestPassed: result.finalTest?.passed,
          promotionEligible: result.promotion?.eligible,
          applied: result.applied,
          budget: result.budget,
        })}\n`,
        "utf-8",
      );
      await emit("skill.evolution.completed", {
        ...scopePayload,
        baselineLift: result.baselineLift,
        finalLift: result.finalLift,
        acceptedEdits: result.acceptedEdits.length,
        rejectedEdits: result.rejectedCount,
        applied: result.applied,
        promotionEligible: result.promotion?.eligible,
        diagnostics: result.diagnostics,
        finalTestBlocker: result.finalTest?.blocker,
        finalTestPassed: result.finalTest?.passed,
        artifact: artifactRelative,
      });
      await emit("session.ended", {
        workflow: "skill-evolution",
        category: "skill-evolution",
        status: "completed",
      });
    },
    async fail(error: unknown) {
      appendFileSync(
        artifactPath,
        `${JSON.stringify({
          type: "run-summary",
          ts: new Date().toISOString(),
          status: "failed",
          memory: memoryMode,
          procedureHash: args.procedureHash,
        })}\n`,
        "utf-8",
      );
      await emit("skill.evolution.completed", {
        ...scopePayload,
        status: "failed",
        error: redactEvolutionText(
          error instanceof Error ? error.message : String(error),
        ).slice(0, 1_000),
        artifact: artifactRelative,
      });
      await emit("session.ended", {
        workflow: "skill-evolution",
        category: "skill-evolution",
        status: "failed",
      });
    },
  };
}
