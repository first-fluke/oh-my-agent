import { randomUUID } from "node:crypto";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { testTask } from "./__fixtures__/task-contract.js";
import * as decisionStore from "./agent-decisions.js";
import {
  agentResultInstructions,
  beginAgentRun,
  classifyRunFailure,
  finishAgentRun,
  readAgentRun,
  readOnlyClaim,
  resultEvidenceValid,
  verifyRequiredChecks,
} from "./agent-results.js";
import * as eventStore from "./events.js";
import { emitEvent, eventsPath, readEvents } from "./events.js";

const required = {
  subject: "backend.auth-policy",
  description: "Resolve the authorization policy for this endpoint",
};
const decision = {
  subject: required.subject,
  decision: "Require ownership before accepting the update",
  rationale: "The endpoint modifies a resource owned by one account",
  alternatives: ["Allow any authenticated account"],
  evidence: ["Endpoint acceptance criterion AC1"],
};
const claim = {
  status: "completed",
  changedFiles: [],
  unresolved: [],
  artifacts: [],
};

describe("agent decision completion evidence", () => {
  let root: string;
  beforeEach(() => {
    root = mkdtempSync(join(tmpdir(), "oma-agent-decisions-"));
  });
  afterEach(() => {
    vi.restoreAllMocks();
    rmSync(root, { recursive: true, force: true });
  });

  function start(
    options: {
      required?: boolean;
      planned?: boolean;
      executable?: boolean;
    } = {},
  ) {
    if (
      options.planned !== false &&
      !existsSync(join(root, ".agents/results/plan-s1.json"))
    ) {
      mkdirSync(join(root, ".agents/results"), { recursive: true });
      writeFileSync(
        join(root, ".agents/results/plan-s1.json"),
        JSON.stringify({
          max_attempts: 4,
          tasks: [
            testTask("T1", {
              agent: "backend-engineer",
              required_decisions:
                options.required === false ? undefined : [required],
              ...(options.executable === false
                ? { required_checks: undefined, acceptance_criteria: undefined }
                : {}),
            }),
          ],
        }),
      );
    }
    return beginAgentRun({
      root,
      workspace: root,
      agentId: "backend-engineer",
      taskId: "T1",
      sessionId: "s1",
      vendor: "test",
    });
  }

  it("records structured decisions with the run identity and pins completion evidence", () => {
    const run = start();
    verifyRequiredChecks(root, run.runId);
    const finished = finishAgentRun(root, run.runId, 0, {
      ...claim,
      decisions: [decision],
    });
    expect(finished.status).toBe("completed");
    expect(resultEvidenceValid(finished)).toBe(true);
    const events = readEvents(root, run.sessionId).filter(
      (event) => event.kind === "decision.made",
    );
    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({
      sid: run.sessionId,
      vendor: run.vendor,
      payload: {
        ...decision,
        agentId: run.agentId,
        taskId: run.taskId,
        runId: run.runId,
        instanceId: run.runId,
      },
    });
    expect(finished.decisionEventIds).toEqual([events[0]?.eventId]);
    expect(finished.decisionEventHashes).toEqual({
      [events[0]?.eventId ?? ""]: expect.stringMatching(/^[a-f0-9]{64}$/),
    });
    expect(finished.requiredDecisions).toEqual([required]);
    expect(readAgentRun(root, run.runId).decisionEventIds).toEqual(
      finished.decisionEventIds,
    );
    expect(
      finishAgentRun(root, run.runId, 0, {
        ...claim,
        decisions: [{ ...decision, decision: "Changed after completion" }],
      }),
    ).toEqual(finished);
    expect(readEvents(root, run.sessionId)).toHaveLength(1);
  });

  it("blocks missing decisions even with verificationSkipped and allows one metadata repair", () => {
    const run = start();
    verifyRequiredChecks(root, run.runId);
    const finished = finishAgentRun(root, run.runId, 0, {
      ...claim,
      verificationSkipped: "Inspection cannot waive a declared decision",
    });
    expect(finished.status).toBe("partial");
    expect(finished.unresolved).toContain(
      `Missing required decisions: ${required.subject}`,
    );
    expect(classifyRunFailure(finished)).toBe("WORKFLOW_EVIDENCE_FAILURE");
    expect(resultEvidenceValid(finished, false)).toBe(false);
    expect(readEvents(root, run.sessionId)).toEqual([
      expect.objectContaining({
        kind: "decision.missing",
        payload: expect.objectContaining({
          workflow: "agent",
          checkpoint: run.agentId,
          agentId: run.agentId,
          taskId: run.taskId,
          runId: run.runId,
          instanceId: run.runId,
          missing: [required],
        }),
      }),
    ]);
    const repair = start();
    expect(repair.evidenceRepair).toBe(true);
    verifyRequiredChecks(root, repair.runId);
    expect(finishAgentRun(root, repair.runId, 0, claim).status).toBe("partial");
    expect(() => start()).toThrow("WORKFLOW_EVIDENCE_FAILURE");
  });

  it("delivers decision memory once after persisting the final receipt", () => {
    const run = start();
    verifyRequiredChecks(root, run.runId);
    const deliver = vi
      .spyOn(decisionStore, "deliverAgentDecisionMemory")
      .mockImplementation(() => {
        expect(readAgentRun(root, run.runId).status).toBe("completed");
      });
    finishAgentRun(root, run.runId, 0, { ...claim, decisions: [decision] });
    finishAgentRun(root, run.runId, 0, claim);
    expect(deliver).toHaveBeenCalledTimes(1);
  });

  it("can complete the metadata repair by reporting its own scoped decisions", () => {
    const run = start();
    verifyRequiredChecks(root, run.runId);
    finishAgentRun(root, run.runId, 0, claim);
    const repair = start();
    verifyRequiredChecks(root, repair.runId);
    const finished = finishAgentRun(root, repair.runId, 0, {
      ...claim,
      decisions: [decision],
    });
    expect(finished.evidenceRepair).toBe(true);
    expect(resultEvidenceValid(finished)).toBe(true);
  });

  it.each([
    ["decision", ""],
    ["decision", " \n "],
    ["rationale", ""],
    ["rationale", " \n "],
  ])("rejects an empty %s (%j)", (field, value) => {
    const run = start();
    verifyRequiredChecks(root, run.runId);
    const finished = finishAgentRun(root, run.runId, 0, {
      ...claim,
      decisions: [{ ...decision, [field]: value }],
    });
    expect(finished.status).toBe("partial");
    expect(classifyRunFailure(finished)).toBe("WORKFLOW_EVIDENCE_FAILURE");
    expect(resultEvidenceValid(finished)).toBe(false);
    expect(
      readEvents(root, run.sessionId).some(
        (event) => event.kind === "decision.made",
      ),
    ).toBe(false);
  });

  it.each(["agentId", "taskId", "runId", "instanceId", "sessionId"])(
    "does not accept a decision from a different %s",
    (field) => {
      const run = start();
      verifyRequiredChecks(root, run.runId);
      emitEvent(root, field === "sessionId" ? "other-session" : run.sessionId, {
        kind: "decision.made",
        payload: {
          ...decision,
          agentId: run.agentId,
          taskId: run.taskId,
          runId: run.runId,
          instanceId: run.runId,
          ...(field === "sessionId" ? {} : { [field]: randomUUID() }),
        },
      });
      const finished = finishAgentRun(root, run.runId, 0, claim);
      expect(finished.status).toBe("partial");
      expect(finished.decisionEventIds).toEqual([]);
      expect(resultEvidenceValid(finished)).toBe(false);
    },
  );

  it.each([
    "deleted",
    "empty-rationale",
    "changed-decision",
    "changed-rationale",
    "cross-agent",
    "duplicate-id",
  ])("invalidates reused evidence when a decision event is %s", (change) => {
    const run = start();
    verifyRequiredChecks(root, run.runId);
    const finished = finishAgentRun(root, run.runId, 0, {
      ...claim,
      decisions: [decision],
    });
    expect(resultEvidenceValid(finished)).toBe(true);
    const events = readEvents(root, run.sessionId);
    const event = events[0];
    if (!event?.payload) throw new Error("Decision event was not persisted");
    if (change === "empty-rationale") event.payload.rationale = " ";
    if (change === "changed-decision")
      event.payload.decision = "Allow any authenticated account";
    if (change === "changed-rationale")
      event.payload.rationale = "The endpoint is public to all accounts";
    if (change === "cross-agent") event.payload.agentId = "frontend-engineer";
    writeFileSync(
      eventsPath(root, run.sessionId),
      change === "deleted"
        ? ""
        : `${(change === "duplicate-id" ? [...events, event] : events)
            .map((item) => JSON.stringify(item))
            .join("\n")}\n`,
    );
    expect(resultEvidenceValid(finished)).toBe(false);
  });

  it("does not replace deleted pinned evidence with a new event for the same subject", () => {
    const run = start();
    verifyRequiredChecks(root, run.runId);
    const finished = finishAgentRun(root, run.runId, 0, {
      ...claim,
      decisions: [decision],
    });
    writeFileSync(eventsPath(root, run.sessionId), "");
    emitEvent(root, run.sessionId, {
      kind: "decision.made",
      payload: {
        ...decision,
        agentId: run.agentId,
        taskId: run.taskId,
        runId: run.runId,
        instanceId: run.runId,
      },
    });
    expect(resultEvidenceValid(finished)).toBe(false);
    expect(
      resultEvidenceValid({ ...finished, decisionEventIds: undefined }),
    ).toBe(false);
  });

  it("rejects a decision requirement snapshot that drifts from the pinned plan", () => {
    const run = start();
    verifyRequiredChecks(root, run.runId);
    const current = readAgentRun(root, run.runId);
    writeFileSync(
      join(root, ".agents/state/agent-runs", `${run.runId}.json`),
      JSON.stringify({ ...current, requiredDecisions: [] }),
    );
    const finished = finishAgentRun(root, run.runId, 0, claim);
    expect(finished.status).toBe("failed");
    expect(finished.unresolved).toContain(
      "Task decision requirements changed during execution",
    );
  });

  it("revalidates decision requirement snapshots before reusing completion", () => {
    const run = start();
    verifyRequiredChecks(root, run.runId);
    const finished = finishAgentRun(root, run.runId, 0, {
      ...claim,
      decisions: [decision],
    });
    expect(resultEvidenceValid(finished)).toBe(true);
    expect(
      resultEvidenceValid({
        ...finished,
        requiredDecisions: [],
        decisionEventIds: [],
        decisionEventHashes: {},
      }),
    ).toBe(false);
  });

  it("accepts decisions emitted for the current run before its final claim", () => {
    const run = start();
    verifyRequiredChecks(root, run.runId);
    const event = emitEvent(root, run.sessionId, {
      kind: "decision.made",
      payload: {
        ...decision,
        agentId: run.agentId,
        taskId: run.taskId,
        runId: run.runId,
        instanceId: run.runId,
      },
    });
    const finished = finishAgentRun(root, run.runId, 0, claim);
    expect(finished.decisionEventIds).toEqual([event.eventId]);
    expect(resultEvidenceValid(finished)).toBe(true);
  });

  it("injects the decision claim into normal and read-only instructions and records parent claims", () => {
    const run = start();
    for (const readOnly of [false, true]) {
      const instructions = agentResultInstructions(root, run, readOnly);
      expect(instructions).toContain(JSON.stringify([required]));
      expect(instructions).toContain('"decisions":[]');
      expect(instructions).toContain('"rationale":"reason"');
      expect(instructions).toContain("backend.api-contract");
    }
    const returnedClaim = readOnlyClaim(
      `Inspection complete\nOMA_RESULT_JSON: ${JSON.stringify({
        ...claim,
        decisions: [decision],
        verificationSkipped: "Read the endpoint policy and acceptance contract",
      })}\n`,
    );
    verifyRequiredChecks(root, run.runId);
    expect(
      resultEvidenceValid(finishAgentRun(root, run.runId, 0, returnedClaim)),
    ).toBe(true);
  });

  it("instructs planners to declare downstream decisions before dispatch", () => {
    const run = { ...start(), agentId: "pm-planner" };
    for (const readOnly of [false, true]) {
      const instructions = agentResultInstructions(root, run, readOnly);
      expect(instructions).toContain("declare task.required_decisions");
      expect(instructions).toContain("before dispatch");
      expect(instructions).toContain("omit this field for routine execution");
      expect(instructions).toContain(
        "oma state required-decisions --agent <agent-id> --json",
      );
    }
  });

  it("records optional material choices without making catalog subjects mandatory", () => {
    const run = start({ required: false });
    verifyRequiredChecks(root, run.runId);
    const finished = finishAgentRun(root, run.runId, 0, {
      ...claim,
      decisions: [decision],
    });
    expect(finished.status).toBe("completed");
    expect(finished.decisionEventIds).toHaveLength(1);
    expect(resultEvidenceValid(finished)).toBe(true);
    writeFileSync(eventsPath(root, run.sessionId), "");
    expect(resultEvidenceValid(finished)).toBe(false);
  });

  it("preserves routine completion without required or reported decisions", () => {
    const run = start({ required: false });
    verifyRequiredChecks(root, run.runId);
    const finished = finishAgentRun(root, run.runId, 0, claim);
    expect(finished.status).toBe("completed");
    expect(finished.decisionEventIds).toBeUndefined();
    expect(finished.requiredDecisions).toBeUndefined();
    expect(resultEvidenceValid(finished)).toBe(true);
    expect(readEvents(root, run.sessionId)).toEqual([]);
  });

  it("preserves inspection-only legacy completion with no contract", () => {
    const run = start({ planned: false });
    const finished = finishAgentRun(root, run.runId, 0, {
      ...claim,
      verificationSkipped:
        "Read the prose and inspected the spelling correction",
    });
    expect(finished.status).toBe("completed");
    expect(resultEvidenceValid(finished, false)).toBe(true);
    expect(resultEvidenceValid(finished)).toBe(false);
  });

  it("blocks missing required choices in inspection-only plans without executable checks", () => {
    const run = start({ executable: false });
    expect(run.contract).toBeUndefined();
    expect(run.requiredDecisions).toEqual([required]);
    expect(agentResultInstructions(root, run, true)).toContain(
      JSON.stringify([required]),
    );
    const finished = finishAgentRun(root, run.runId, 0, {
      ...claim,
      verificationSkipped:
        "Read the endpoint policy and evaluated authorization",
    });
    expect(finished.status).toBe("partial");
    expect(finished.unresolved).toContain(
      `Missing required decisions: ${required.subject}`,
    );
    expect(resultEvidenceValid(finished, false)).toBe(false);
  });

  it("completes inspection-only plans when the parent records the required choices", () => {
    const run = start({ executable: false });
    const returned = readOnlyClaim(
      `OMA_RESULT_JSON: ${JSON.stringify({
        ...claim,
        decisions: [decision],
        verificationSkipped:
          "Read the endpoint policy and evaluated authorization",
      })}`,
    );
    const finished = finishAgentRun(root, run.runId, 0, returned);
    expect(finished.status).toBe("completed");
    expect(readAgentRun(root, run.runId).requiredDecisions).toEqual([required]);
    expect(resultEvidenceValid(finished, false)).toBe(true);
    expect(resultEvidenceValid(finished)).toBe(false);
  });

  it("persists a partial receipt when reading decision evidence fails", () => {
    const run = start();
    verifyRequiredChecks(root, run.runId);
    mkdirSync(eventsPath(root, run.sessionId), { recursive: true });
    const finished = finishAgentRun(root, run.runId, 0, claim);
    expect(finished.status).toBe("partial");
    expect(finished.unresolved.join("\n")).toContain(
      "Missing or invalid decision evidence:",
    );
    expect(readAgentRun(root, run.runId).status).toBe("partial");
    expect(classifyRunFailure(finished)).toBe("WORKFLOW_EVIDENCE_FAILURE");
  });

  it("persists a partial receipt when recording the missing-decision event fails", () => {
    const run = start();
    verifyRequiredChecks(root, run.runId);
    vi.spyOn(eventStore, "emitEvent").mockImplementationOnce(() => {
      throw new Error("Decision event write failed");
    });
    const finished = finishAgentRun(root, run.runId, 0, claim);
    expect(finished.status).toBe("partial");
    expect(finished.unresolved).toContain(
      "Missing or invalid decision evidence: Decision event write failed",
    );
    expect(readAgentRun(root, run.runId).status).toBe("partial");
    expect(classifyRunFailure(finished)).toBe("WORKFLOW_EVIDENCE_FAILURE");
  });
});
