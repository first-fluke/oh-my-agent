import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  listRequiredDecisionCheckpoints,
  resolveDecisionVerifierSid,
  verifyRequiredDecisions,
} from "./decision-verifier.js";
import {
  activateWorkflowSession,
  emitEvent,
  readEvents,
  setActiveSession,
} from "./events.js";

describe("required decision verifier", () => {
  let projectDir: string;

  beforeEach(() => {
    projectDir = mkdtempSync(join(tmpdir(), "oma-decision-verifier-"));
  });

  afterEach(() => {
    rmSync(projectDir, { recursive: true, force: true });
  });

  it("passes when the required decision.made subject exists", async () => {
    activateWorkflowSession({
      projectDir,
      sid: "oma-ultra",
      workflow: "ultrawork",
    });
    emitEvent(projectDir, "oma-ultra", {
      kind: "decision.made",
      payload: {
        subject: "ultrawork.plan-approved",
        decision: "Proceed with the scoped plan.",
        rationale: "PLAN_GATE checklist passed with user approval.",
      },
    });

    const result = await verifyRequiredDecisions({
      projectDir,
      sid: "oma-ultra",
      workflow: "ultrawork",
      checkpoint: "plan-approved",
    });

    expect(result.ok).toBe(true);
    expect(result.missing).toEqual([]);
  });

  it("lists all D62 workflow decision checkpoints", () => {
    const table = listRequiredDecisionCheckpoints();
    expect(table).toMatchObject({
      ultrawork: {
        "plan-approved": [{ subject: "ultrawork.plan-approved" }],
        "impl-plan-locked": [{ subject: "ultrawork.impl-plan-locked" }],
        "refine-outcome": [{ subject: "ultrawork.refine-outcome" }],
      },
      orchestrate: {
        "fanout-strategy": [{ subject: "orchestrate.fanout-strategy" }],
        "qa-verdict": [{ subject: "orchestrate.qa-verdict" }],
      },
      work: {
        "remediation-choice": [{ subject: "work.remediation-choice" }],
      },
      plan: {
        "api-contract": [{ subject: "plan.api-contract" }],
      },
      brainstorm: {
        "option-selection": [{ subject: "brainstorm.option-selection" }],
      },
      architecture: {
        "adr-complete": [{ subject: "architecture.adr-complete" }],
      },
      debug: {
        "root-cause": [{ subject: "debug.root-cause" }],
      },
      review: {
        "severity-classification": [
          { subject: "review.severity-classification" },
        ],
      },
      deepsec: {
        "triage-outcome": [{ subject: "deepsec.triage-outcome" }],
      },
      scm: {
        "commit-split": [{ subject: "scm.commit-split" }],
      },
      docs: {
        "sync-patch-approval": [{ subject: "docs.sync-patch-approval" }],
      },
    });
  });

  it("documents every required workflow decision checkpoint in the workflow assets", () => {
    const table = listRequiredDecisionCheckpoints();
    const eventSpec = readFileSync(
      new URL(
        "../../.agents/skills/_shared/runtime/event-spec.md",
        import.meta.url,
      ),
      "utf-8",
    );

    expect(eventSpec).toContain("oma_emit()");
    expect(eventSpec).toContain('oma state:emit "$kind" "$payload"');
    expect(eventSpec).toContain("oma state:verify --workflow");

    for (const [workflow, checkpoints] of Object.entries(table)) {
      const body = readFileSync(
        new URL(`../../.agents/workflows/${workflow}.md`, import.meta.url),
        "utf-8",
      );

      expect(body, `${workflow} should reference the L1 event spec`).toContain(
        ".agents/skills/_shared/runtime/event-spec.md",
      );

      for (const [checkpoint, decisions] of Object.entries(checkpoints)) {
        expect(
          body,
          `${workflow} should verify checkpoint ${checkpoint}`,
        ).toContain(
          `oma state:verify --workflow ${workflow} --checkpoint ${checkpoint}`,
        );

        for (const decision of decisions) {
          expect(
            body,
            `${workflow} should emit subject ${decision.subject}`,
          ).toContain(`"subject":"${decision.subject}"`);
        }
      }
    }
  });

  it("emits decision.missing when a required decision is absent", async () => {
    activateWorkflowSession({
      projectDir,
      sid: "oma-work",
      workflow: "work",
    });

    const result = await verifyRequiredDecisions({
      projectDir,
      sid: "oma-work",
      workflow: "work",
      checkpoint: "remediation-choice",
    });

    expect(result.ok).toBe(false);
    expect(result.missing).toMatchObject([
      { subject: "work.remediation-choice" },
    ]);
    const missingEvent = readEvents(projectDir, "oma-work").find(
      (event) => event.kind === "decision.missing",
    );
    expect(missingEvent).toMatchObject({
      kind: "decision.missing",
      payload: {
        workflow: "work",
        checkpoint: "remediation-choice",
      },
    });
  });

  it("can resolve the active sid by category", () => {
    activateWorkflowSession({
      projectDir,
      sid: "oma-main",
      workflow: "orchestrate",
    });
    setActiveSession(projectDir, "qa", "oma-qa");

    expect(resolveDecisionVerifierSid({ projectDir, category: "qa" })).toBe(
      "oma-qa",
    );
    expect(resolveDecisionVerifierSid({ projectDir })).toBe("oma-main");
  });

  it("rejects unknown checkpoints", async () => {
    await expect(
      verifyRequiredDecisions({
        projectDir,
        sid: "oma-unknown",
        workflow: "ultrawork",
        checkpoint: "unknown",
      }),
    ).rejects.toThrow(/Unknown required decision checkpoint/);
  });
});
