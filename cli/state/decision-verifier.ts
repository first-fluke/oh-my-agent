import {
  isNonblankEventText,
  validateEventPayload,
} from "../../.agents/hooks/core/event-contract.ts";
import {
  emitEventWithMemory,
  getActiveSid,
  readEvents,
  readIndex,
} from "./events.js";

export interface RequiredDecision {
  subject: string;
  description: string;
}

export type RequiredDecisionTable = Record<
  string,
  Record<string, RequiredDecision[]>
>;

export const REQUIRED_DECISIONS: RequiredDecisionTable = {
  ultrawork: {
    "plan-approved": [
      {
        subject: "ultrawork.plan-approved",
        description:
          "Architecture and plan decision captured after PLAN_GATE approval.",
      },
    ],
    "refine-outcome": [
      {
        subject: "ultrawork.refine-outcome",
        description:
          "REFINE experiment outcome captured before shipping or skipping refinement.",
      },
    ],
  },
  orchestrate: {
    "qa-verdict": [
      {
        subject: "orchestrate.qa-verdict",
        description:
          "Verification gate verdict captured after completed agents are checked.",
      },
    ],
  },
  work: {
    "remediation-choice": [
      {
        subject: "work.remediation-choice",
        description:
          "QA remediation decision captured before ignored or fixed findings are accepted.",
      },
    ],
  },
  plan: {
    "api-contract": [
      {
        subject: "plan.api-contract",
        description:
          "Selected endpoint and contract shape captured within existing authorization or delegated scope.",
      },
    ],
  },
  brainstorm: {
    "option-selection": [
      {
        subject: "brainstorm.option-selection",
        description:
          "Selected option and considered alternatives captured from user choice or delegated scope.",
      },
    ],
  },
  architecture: {
    "adr-complete": [
      {
        subject: "architecture.adr-complete",
        description:
          "Architecture decision and tradeoffs captured after ADR completion.",
      },
    ],
  },
  debug: {
    "root-cause": [
      {
        subject: "debug.root-cause",
        description:
          "Confirmed root cause and minimal fix scope captured after diagnosis.",
      },
    ],
  },
  review: {
    "severity-classification": [
      {
        subject: "review.severity-classification",
        description:
          "Per-finding severity assignment rationale captured after review classification.",
      },
    ],
  },
  deepsec: {
    "execution-scope": [
      {
        subject: "deepsec.execution-scope",
        description:
          "Authorized, limited, or declined backend, budget, and scan scope captured before the conditional paid or custom-scope branch.",
      },
    ],
    "triage-outcome": [
      {
        subject: "deepsec.triage-outcome",
        description:
          "Finding identity and true-positive, false-positive, fixed, or uncertain verdict captured with causal evidence for the current analysis revision.",
      },
    ],
  },
  docs: {
    "sync-patch-approval": [
      {
        subject: "docs.sync-patch-approval",
        description:
          "Documentation sync decision captured for docs auto-applied versus skipped.",
      },
    ],
  },
  video: {
    "mode-selection": [
      {
        subject: "video.mode-selection",
        description:
          "Confirmed video mode, aspect, visual track, and compositor captured before asset generation.",
      },
    ],
    "cost-confirmation": [
      {
        subject: "video.cost-confirmation",
        description:
          "Paid-cost confirmation or key-free fallback decision captured when the estimate crosses the guardrail.",
      },
    ],
  },
};

export interface DecisionVerificationResult {
  sid: string;
  workflow: string;
  checkpoint: string;
  instanceId: string;
  ok: boolean;
  required: RequiredDecision[];
  presentSubjects: string[];
  missing: RequiredDecision[];
}

export function listRequiredDecisionCheckpoints(
  workflow?: string,
): RequiredDecisionTable {
  if (!workflow) return REQUIRED_DECISIONS;
  return { [workflow]: REQUIRED_DECISIONS[workflow] ?? {} };
}

export function resolveDecisionVerifierSid(args: {
  projectDir: string;
  sid?: string;
  category?: string;
}): string {
  if (args.sid) return args.sid;
  const sid = getActiveSid(readIndex(args.projectDir), args.category ?? "main");
  if (!sid) {
    throw new Error(
      "No active L1 session found. Pass --sid or run a workflow first.",
    );
  }
  return sid;
}

export async function verifyRequiredDecisions(args: {
  projectDir: string;
  sid: string;
  workflow: string;
  checkpoint: string;
  instanceId?: string;
  emitMissing?: boolean;
}): Promise<DecisionVerificationResult> {
  const required = REQUIRED_DECISIONS[args.workflow]?.[args.checkpoint];
  if (!required) {
    throw new Error(
      `Unknown required decision checkpoint: ${args.workflow}/${args.checkpoint}`,
    );
  }
  if (!isNonblankEventText(args.instanceId)) {
    throw new Error(
      "A nonblank checkpoint instance is required. Pass --instance <id>.",
    );
  }

  const events = readEvents(args.projectDir, args.sid);
  const presentSubjects = events
    .filter(
      (event) =>
        event.kind === "decision.made" &&
        validateEventPayload(event.kind, event.payload).length === 0 &&
        event.payload?.instanceId === args.instanceId,
    )
    .map((event) => event.payload?.subject)
    .filter((subject): subject is string => typeof subject === "string");
  const present = new Set(presentSubjects);
  const missing = required.filter((decision) => !present.has(decision.subject));
  const result: DecisionVerificationResult = {
    sid: args.sid,
    workflow: args.workflow,
    checkpoint: args.checkpoint,
    instanceId: args.instanceId,
    ok: missing.length === 0,
    required,
    presentSubjects,
    missing,
  };

  if (!result.ok && args.emitMissing !== false) {
    await emitEventWithMemory(args.projectDir, args.sid, {
      kind: "decision.missing",
      payload: {
        workflow: args.workflow,
        checkpoint: args.checkpoint,
        instanceId: args.instanceId,
        missing,
        remediation:
          "Emit the required decision.made event with this instanceId, subject, decision, and rationale, then rerun this verifier with the same --instance.",
      },
    });
  }

  return result;
}
