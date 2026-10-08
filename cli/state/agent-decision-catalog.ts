import type { RequiredDecision } from "./decision-verifier.js";

/** Subjects to declare when a task includes the corresponding choice. */
export const AGENT_DECISIONS: Record<string, RequiredDecision[]> = {
  "backend-engineer": [
    {
      subject: "backend.api-contract",
      description:
        "Changed API, error, or compatibility contract and affected callers.",
    },
    {
      subject: "backend.auth-policy",
      description:
        "Authentication, authorization, or credential handling policy and its constraints.",
    },
    {
      subject: "backend.transaction-boundary",
      description:
        "Transaction, consistency, or retry boundary and failure behavior.",
    },
  ],
  "db-engineer": [
    {
      subject: "db.data-model",
      description:
        "Data model, constraints, or storage choice and the alternatives considered.",
    },
    {
      subject: "db.migration-strategy",
      description:
        "Migration sequence, compatibility window, data preservation, and rollback strategy.",
    },
  ],
  "frontend-engineer": [
    {
      subject: "frontend.state-ownership",
      description:
        "State ownership, persistence, or client/server data flow and its boundaries.",
    },
    {
      subject: "frontend.interaction-contract",
      description:
        "Changed interaction or component contract, including accessibility behavior.",
    },
  ],
  "mobile-engineer": [
    {
      subject: "mobile.platform-behavior",
      description:
        "Platform-specific behavior, permissions, or native integration choice.",
    },
    {
      subject: "mobile.sync-strategy",
      description:
        "Offline storage, synchronization, and conflict resolution behavior.",
    },
  ],
  "tf-infra-engineer": [
    {
      subject: "tf-infra.access-scope",
      description:
        "IAM or network access scope and the requirements supporting it.",
    },
    {
      subject: "tf-infra.resource-lifecycle",
      description:
        "Resource replacement, deletion, state migration, or recovery approach within authorized scope.",
    },
  ],
  "refactor-engineer": [
    {
      subject: "refactor.behavior-boundary",
      description:
        "Refactoring scope and the observable behavior and consumer contracts to preserve.",
    },
  ],
  "pm-planner": [
    {
      subject: "plan.scope-tradeoff",
      description:
        "Scope, priority, or acceptance criteria tradeoff and its decision authority.",
    },
    {
      subject: "plan.api-contract",
      description:
        "Selected API contract and the caller requirements supporting it.",
    },
  ],
  "architecture-reviewer": [
    {
      subject: "architecture.adr-complete",
      description:
        "Proposed or accepted architecture option, boundaries, and tradeoffs.",
    },
  ],
  "debug-investigator": [
    {
      subject: "debug.root-cause",
      description:
        "Confirmed causal mechanism and selected fix supported by reproduction evidence.",
    },
  ],
  "qa-reviewer": [
    {
      subject: "review.severity-classification",
      description:
        "Finding severity and remediation priority supported by observed impact.",
    },
  ],
  "docs-curator": [
    {
      subject: "docs.sync-patch-approval",
      description:
        "Documentation correction applied or skipped and its scoped authority or reason.",
    },
  ],
  "research-explorer": [
    {
      subject: "research.evidence-selection",
      description:
        "Resolution of conflicting sources or evidence that materially changes the recommendation.",
    },
  ],
};

export function listAgentDecisionSubjects(
  agentId?: string,
): Record<string, RequiredDecision[]> {
  if (!agentId) return AGENT_DECISIONS;
  return { [agentId]: AGENT_DECISIONS[agentId] ?? [] };
}
