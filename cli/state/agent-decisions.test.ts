import { appendFileSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  type AgentDecisionScope,
  deliverAgentDecisionMemory,
  recordAgentDecisions,
  verifyAgentDecisions,
} from "./agent-decisions.js";
import * as events from "./events.js";
import { eventsPath, readEvents } from "./events.js";
import * as memoryDelivery from "./memory-delivery.js";

describe("agent decision events", () => {
  let root: string;
  let scope: AgentDecisionScope;
  const decision = {
    subject: "backend.auth-policy",
    decision: "Require a tenant-scoped role for write operations.",
    rationale:
      "The API is shared across tenants and writes must respect membership.",
  };
  const required = [
    { subject: decision.subject, description: "Choose write authorization." },
  ];

  beforeEach(() => {
    root = mkdtempSync(join(tmpdir(), "oma-agent-decisions-"));
    scope = {
      artifactRoot: root,
      sessionId: "s1",
      agentId: "backend-engineer",
      taskId: "auth",
      runId: "run-1",
    };
  });
  afterEach(() => {
    vi.restoreAllMocks();
    rmSync(root, { recursive: true, force: true });
  });

  it("persists optional choices and rejects conflicting finalization retries", () => {
    const ids = recordAgentDecisions(scope, [decision]);
    expect(recordAgentDecisions(scope, [decision])).toEqual(ids);
    expect(readEvents(root, "s1")).toHaveLength(1);
    expect(verifyAgentDecisions(scope, []).eventIds).toEqual(ids);
    expect(() =>
      recordAgentDecisions(scope, [
        { ...decision, decision: "Allow all writes." },
      ]),
    ).toThrow("changed during finalization");
  });

  it.each([
    { writerPid: undefined },
    { ts: "invalid" },
    { sid: "foreign-session" },
    {
      payload: {
        ...decision,
        instanceId: "run-1",
        runId: "run-1",
        taskId: "auth",
        agentId: "backend-engineer",
        rationale: " ",
      },
    },
  ])("rejects corrupt decision records: %j", (overrides) => {
    const ids = recordAgentDecisions(scope, [decision]);
    const original = readEvents(root, "s1")[0];
    writeFileSync(
      eventsPath(root, "s1"),
      `${JSON.stringify({ ...original, ...overrides })}\n`,
    );
    expect(verifyAgentDecisions(scope, required, ids).ok).toBe(false);
  });

  it("rejects missing optional pointers even without mandatory subjects", () => {
    expect(verifyAgentDecisions(scope, [], ["missing-event"]).ok).toBe(false);
    const ids = recordAgentDecisions(scope, [decision]);
    const id = ids[0];
    if (!id) throw new Error("Missing recorded event");
    expect(verifyAgentDecisions(scope, [], [id, id]).ok).toBe(false);
  });

  it("rejects duplicate IDs and valid but changed decision content", () => {
    const ids = recordAgentDecisions(scope, [decision]);
    const evidence = verifyAgentDecisions(scope, required, ids);
    const original = readEvents(root, "s1")[0];
    appendFileSync(eventsPath(root, "s1"), `${JSON.stringify(original)}\n`);
    expect(verifyAgentDecisions(scope, required, ids).ok).toBe(false);
    writeFileSync(
      eventsPath(root, "s1"),
      `${JSON.stringify({
        ...original,
        payload: {
          ...original?.payload,
          decision: "Allow all writes without a tenant check.",
        },
      })}\n`,
    );
    expect(
      verifyAgentDecisions(scope, required, ids, evidence.eventHashes).ok,
    ).toBe(false);
  });

  it("requires decisions from the current agent, task, run, and session", () => {
    recordAgentDecisions(scope, [decision]);
    for (const mismatch of [
      { agentId: "frontend-engineer" },
      { taskId: "another-task" },
      { runId: "run-2" },
      { sessionId: "s2" },
    ]) {
      expect(verifyAgentDecisions({ ...scope, ...mismatch }, required).ok).toBe(
        false,
      );
    }
    expect(verifyAgentDecisions(scope, required, []).ok).toBe(false);
  });

  it("delivers scoped decisions and missing notices through the memory retry path", async () => {
    recordAgentDecisions(scope, [decision]);
    recordAgentDecisions({ ...scope, runId: "other-run" }, [decision]);
    events.emitEvent(root, "s1", {
      kind: "decision.missing",
      payload: {
        ...scope,
        artifactRoot: undefined,
        instanceId: scope.runId,
        missing: required,
      },
    });
    const deliver = vi
      .spyOn(memoryDelivery, "deliverEventMemory")
      .mockResolvedValue({} as events.OmaEvent);
    deliverAgentDecisionMemory(scope);
    expect(deliver).toHaveBeenCalledTimes(2);
    expect(deliver).toHaveBeenCalledWith(
      root,
      expect.objectContaining({ kind: "decision.made" }),
    );
    expect(deliver).toHaveBeenCalledWith(
      root,
      expect.objectContaining({ kind: "decision.missing" }),
    );

    const warning = vi
      .spyOn(console, "warn")
      .mockImplementation(() => undefined);
    deliver.mockRejectedValue(new Error("provider unavailable"));
    expect(() => deliverAgentDecisionMemory(scope)).not.toThrow();
    await Promise.resolve();
    expect(warning).toHaveBeenCalledWith(
      expect.stringContaining("provider unavailable"),
    );
  });
});
