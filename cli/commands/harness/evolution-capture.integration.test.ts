import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { writeTestPlan } from "../../state/__fixtures__/task-contract.js";
import { beginAgentRun, finishAgentRun } from "../../state/agent-results.js";
import {
  readHarnessEvolutionState,
  writeHarnessEvolutionConfig,
} from "../../state/harness-evolution.js";
import { listUnpromotedIncidents } from "./incident-promote.js";

const evolutionPrompt = vi.hoisted(() => vi.fn());
const judgeFactory = vi.hoisted(() => vi.fn());
const judgeVerdict = vi.hoisted(() => vi.fn());
const routerFactory = vi.hoisted(() => vi.fn());
const optimizer = vi.hoisted(() => vi.fn());

vi.mock("../skills/opt/execution.js", () => ({
  runEvolutionPrompt: evolutionPrompt,
}));
vi.mock("../skills/eval.js", () => ({
  buildJudgeDispatchFn: judgeFactory,
  buildLiveDispatchFn: routerFactory,
  judgeVerdict,
}));
vi.mock("../skills/opt.js", () => ({ runSkillsOpt: optimizer }));

import { runHarnessEvolutionTick } from "./evolution.js";

let root: string;

function setupFailedRun(): string {
  root = mkdtempSync(join(tmpdir(), "oma-evolution-capture-"));
  writeTestPlan(root, ["T1"], "s1");
  mkdirSync(join(root, ".agents", "skills", "oma-scm"), { recursive: true });
  writeFileSync(
    join(root, ".agents", "skills", "oma-scm", "SKILL.md"),
    "---\nname: oma-scm\ndescription: scm\n---\n",
  );
  const run = beginAgentRun({
    root,
    workspace: root,
    agentId: "scm",
    sessionId: "s1",
    taskId: "T1",
    vendor: "codex",
    dispatch: { prompt: "Push the approved rewrite safely." },
  });
  const logPath = join(root, "runner.log");
  writeFileSync(logPath, "I ran git push --force.");
  finishAgentRun(root, run.runId, 1, undefined, { logPath });
  writeHarnessEvolutionConfig(root, {
    schemaVersion: 1,
    enabled: true,
    cron: "0 3 * * *",
    mode: "apply",
    maxDispatches: 10,
    updatedAt: new Date().toISOString(),
  });
  return run.runId;
}

afterEach(() => {
  vi.clearAllMocks();
  if (root) rmSync(root, { recursive: true, force: true });
});

describe("scheduled harness evolution capture", () => {
  it("captures, promotes, and optimizes a fresh failed run without stranding it", async () => {
    const runId = setupFailedRun();
    evolutionPrompt.mockResolvedValue(
      "PASS only if the answer uses --force-with-lease. FAIL if it uses --force.",
    );
    judgeFactory.mockReturnValue(() => "FAIL");
    judgeVerdict.mockResolvedValue({
      score: 0,
      response: "FAIL",
      usage: { status: "unknown" },
    });
    routerFactory.mockReturnValue(() => "oma-scm");
    optimizer.mockResolvedValue({
      baselineLift: 0,
      finalLift: 0,
      baselineTrainLift: 0,
      finalTrainLift: 0,
      acceptedEdits: [],
      finalTest: { baselineLift: 0, candidateLift: 0, passed: false },
      promotion: { eligible: false, reasons: ["no-validated-candidate"] },
      applied: false,
      budget: { limit: 10, used: 0 },
      diff: "",
    });

    await expect(runHarnessEvolutionTick(root)).resolves.toMatchObject({
      status: "completed",
    });

    expect(listUnpromotedIncidents(root)).toEqual([]);
    expect(optimizer).toHaveBeenCalledWith(
      true,
      expect.objectContaining({ skill: "oma-scm", applyTarget: "overlay" }),
    );
    expect(readHarnessEvolutionState(root).retries).toContainEqual(
      expect.objectContaining({
        key: `capture:${runId}`,
        completedAt: expect.any(String),
      }),
    );

    await expect(runHarnessEvolutionTick(root)).resolves.toMatchObject({
      status: "completed",
    });
    expect(optimizer).toHaveBeenCalledTimes(1);
    expect(listUnpromotedIncidents(root)).toEqual([]);
  });

  it("keeps a budget-incomplete optimizer result retryable", async () => {
    setupFailedRun();
    evolutionPrompt.mockResolvedValue(
      "PASS only if the answer uses --force-with-lease. FAIL if it uses --force.",
    );
    judgeFactory.mockReturnValue(() => "FAIL");
    judgeVerdict.mockResolvedValue({
      score: 0,
      response: "FAIL",
      usage: { status: "unknown" },
    });
    routerFactory.mockReturnValue(() => "oma-scm");
    optimizer.mockResolvedValue({
      baselineLift: 0,
      finalLift: 0,
      baselineTrainLift: 0,
      finalTrainLift: 0,
      acceptedEdits: [],
      finalTest: { baselineLift: 0, candidateLift: 0, passed: false },
      promotion: { eligible: false, reasons: ["incomplete"] },
      diagnostics: [
        {
          stage: "budget",
          status: "exhausted",
          message: "Evolution dispatch budget exhausted",
        },
      ],
      applied: false,
      budget: { limit: 10, used: 10 },
      diff: "",
    });

    await expect(runHarnessEvolutionTick(root)).resolves.toMatchObject({
      status: "partial",
    });
    expect(readHarnessEvolutionState(root).retries).toContainEqual(
      expect.objectContaining({
        kind: "optimize",
        attemptCount: 1,
        lastError: expect.stringMatching(/budget/i),
      }),
    );
    expect(
      readHarnessEvolutionState(root).retries.find(
        (retry) => retry.kind === "optimize",
      )?.completedAt,
    ).toBeUndefined();
  });

  it("keeps a maintainer dispatch-error result retryable", async () => {
    setupFailedRun();
    evolutionPrompt.mockResolvedValue(
      "PASS only if the answer uses --force-with-lease. FAIL if it uses --force.",
    );
    judgeFactory.mockReturnValue(() => "FAIL");
    judgeVerdict.mockResolvedValue({
      score: 0,
      response: "FAIL",
      usage: { status: "unknown" },
    });
    routerFactory.mockReturnValue(() => "oma-scm");
    optimizer.mockResolvedValue({
      baselineLift: 0,
      finalLift: 0,
      baselineTrainLift: 0,
      finalTrainLift: 0,
      acceptedEdits: [],
      finalTest: { baselineLift: 0, candidateLift: 0, passed: false },
      promotion: { eligible: false, reasons: ["incomplete"] },
      diagnostics: [
        {
          stage: "maintainer",
          status: "dispatch-error",
          message: "model transport failed",
        },
      ],
      applied: false,
      budget: { limit: 10, used: 1 },
      diff: "",
    });

    await expect(runHarnessEvolutionTick(root)).resolves.toMatchObject({
      status: "partial",
    });
    expect(readHarnessEvolutionState(root).retries).toContainEqual(
      expect.objectContaining({
        kind: "optimize",
        attemptCount: 1,
        lastError: expect.stringMatching(/maintainer.*dispatch-error/i),
      }),
    );
  });
});
