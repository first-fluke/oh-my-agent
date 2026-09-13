import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { readEvents } from "../../state/events.js";
import { runHarnessEval } from "./run.js";

const roots: string[] = [];

function makeProject(): {
  root: string;
  suitePath: string;
  candidateRoot: string;
} {
  const root = mkdtempSync(join(tmpdir(), "oma-harness-run-"));
  roots.push(root);
  const baseSkill = join(root, ".agents", "skills", "oma-example");
  const candidateRoot = join(root, "candidate");
  const candidateSkill = join(
    candidateRoot,
    ".agents",
    "skills",
    "oma-example",
  );
  mkdirSync(baseSkill, { recursive: true });
  mkdirSync(candidateSkill, { recursive: true });
  writeFileSync(join(baseSkill, "SKILL.md"), "BASELINE", "utf-8");
  writeFileSync(join(candidateSkill, "SKILL.md"), "CANDIDATE", "utf-8");

  const suiteDir = join(root, "eval");
  const lines = [
    "schema_version: 1",
    "id: recorded-eval",
    "agent: docs-curator",
    "tasks:",
  ];
  for (let index = 1; index <= 5; index += 1) {
    const id = `task-${index}`;
    const fixture = join(suiteDir, "fixtures", id);
    mkdirSync(join(fixture, "docs"), { recursive: true });
    writeFileSync(join(fixture, "docs", "api.md"), "stale", "utf-8");
    lines.push(
      `  - id: ${id}`,
      "    prompt: Fix it.",
      `    workspace: fixtures/${id}`,
      "    checks:",
      "      - type: file_contains",
      "        path: docs/api.md",
      "        value: fixed",
    );
  }
  const suitePath = join(suiteDir, "suite.yaml");
  writeFileSync(suitePath, lines.join("\n"), "utf-8");
  return { root, suitePath, candidateRoot };
}

afterEach(() => {
  vi.restoreAllMocks();
  process.exitCode = undefined;
  for (const root of roots.splice(0)) rmSync(root, { recursive: true });
});

describe("runHarnessEval", () => {
  it("records a live paired run and inspects its verdicts in mock mode", async () => {
    const project = makeProject();
    const log = vi.spyOn(console, "log").mockImplementation(() => undefined);
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    const dispatch = ({ workspace }: { workspace: string }): string => {
      const skill = readFileSync(
        join(workspace, ".agents", "skills", "oma-example", "SKILL.md"),
        "utf-8",
      );
      if (skill === "CANDIDATE") {
        writeFileSync(join(workspace, "docs", "api.md"), "fixed", "utf-8");
      }
      return skill;
    };

    const live = await runHarnessEval(true, {
      suite: project.suitePath,
      candidate: project.candidateRoot,
      live: true,
      record: true,
      yes: true,
      _projectRoot: project.root,
      _vendor: "codex",
      _dispatch: dispatch,
      _sourceLimitations: ["Historical external dependency was not captured"],
      _materializeVendor: () => undefined,
    });

    expect(live?.executionMode).toBe("live");
    expect(live?.evidenceStatus).toBe("complete");
    expect(live?.promotionBlockers).toContain(
      "Historical external dependency was not captured",
    );
    expect(log.mock.calls[0]?.[0]).toContain(
      "Historical external dependency was not captured",
    );
    expect(live?.score.decision).toBe("pass");
    expect(live?.score.correctedTaskIds).toHaveLength(5);
    expect(readdirSync(join(project.root, "eval", "_runs"))).toHaveLength(1);
    expect(log).toHaveBeenCalledTimes(1);

    const replay = await runHarnessEval(true, {
      suite: project.suitePath,
      candidate: project.candidateRoot,
      mock: true,
      _projectRoot: project.root,
    });
    expect(replay?.executionMode).toBe("inspect");
    expect(replay?.replayLimitations?.join(" ")).toContain(
      "no checks or agents were rerun",
    );
    expect(replay?.score).toEqual(live?.score);
    expect(replay?.runs).toEqual(live?.runs);
    expect(log).toHaveBeenCalledTimes(2);
  });

  it("captures final artifacts before cleanup and reruns from the pinned original workspace", async () => {
    const project = makeProject();
    vi.spyOn(console, "log").mockImplementation(() => undefined);
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    const workspaces: string[] = [];
    const observedInitial: string[] = [];
    const dispatch = ({
      workspace,
      arm,
    }: {
      workspace: string;
      arm: "baseline" | "candidate";
    }) => {
      workspaces.push(workspace);
      observedInitial.push(
        readFileSync(join(workspace, "docs", "api.md"), "utf-8"),
      );
      if (arm === "candidate")
        writeFileSync(join(workspace, "docs", "api.md"), "fixed");
      return "done";
    };
    const common = {
      suite: project.suitePath,
      candidate: project.candidateRoot,
      yes: true,
      _projectRoot: project.root,
      _vendor: "codex",
      _dispatch: dispatch,
      _materializeVendor: () => undefined,
    };
    const original = await runHarnessEval(true, {
      ...common,
      live: true,
      record: true,
    });
    expect(workspaces.every((workspace) => !existsSync(workspace))).toBe(true);
    expect(
      original?.runs[1]?.evidence?.artifacts.entries.find(
        (entry) => entry.path === "docs/api.md",
      )?.contentBase64,
    ).toBe(Buffer.from("fixed").toString("base64"));
    for (let index = 1; index <= 5; index++)
      writeFileSync(
        join(
          project.root,
          "eval",
          "fixtures",
          `task-${index}`,
          "docs",
          "api.md",
        ),
        "later changed source",
      );
    const rerun = await runHarnessEval(true, { ...common, action: "rerun" });
    expect(observedInitial).toEqual(Array(20).fill("stale"));
    expect(rerun?.executionMode).toBe("rerun");
    expect(rerun?.sourceRecordHash).toBeTruthy();
    expect(rerun?.score.correctedTaskIds).toHaveLength(5);
    expect(rerun?.promotionReady).toBe(false);
  });

  it("rescoring accepts changed checks, reads raw artifacts, and never dispatches agents", async () => {
    const project = makeProject();
    vi.spyOn(console, "log").mockImplementation(() => undefined);
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    const common = {
      suite: project.suitePath,
      candidate: project.candidateRoot,
      _projectRoot: project.root,
    };
    await runHarnessEval(true, {
      ...common,
      live: true,
      record: true,
      yes: true,
      _vendor: "codex",
      _materializeVendor: () => undefined,
      _dispatch: ({ workspace, arm }) => {
        if (arm === "candidate")
          writeFileSync(join(workspace, "docs", "api.md"), "fixed");
        return "done";
      },
    });
    writeFileSync(
      project.suitePath,
      readFileSync(project.suitePath, "utf-8").replaceAll(
        "value: fixed",
        "value: stale",
      ),
    );
    const unexpectedDispatch = vi.fn(() => {
      throw new Error("must not dispatch");
    });
    const rescored = await runHarnessEval(true, {
      ...common,
      action: "rescore",
      _dispatch: unexpectedDispatch,
    });
    expect(unexpectedDispatch).not.toHaveBeenCalled();
    expect(rescored?.executionMode).toBe("rescore");
    expect(rescored?.evidenceStatus).toBe("complete");
    expect(rescored?.score).toMatchObject({
      baselineScore: 1,
      candidateScore: 0,
    });
    await expect(
      runHarnessEval(true, { ...common, mock: true }),
    ).rejects.toThrow(/stale/);
  });

  it("retains partial output and artifacts when dispatch fails, without rescoring them as valid", async () => {
    const project = makeProject();
    vi.spyOn(console, "log").mockImplementation(() => undefined);
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    const common = {
      suite: project.suitePath,
      candidate: project.candidateRoot,
      _projectRoot: project.root,
    };
    const result = await runHarnessEval(true, {
      ...common,
      live: true,
      record: true,
      yes: true,
      _vendor: "codex",
      _materializeVendor: () => undefined,
      _dispatch: ({ workspace }) => {
        writeFileSync(join(workspace, "docs", "api.md"), "partial edit");
        throw new Error("dispatch failed", {
          cause: { stdout: "partial output" },
        });
      },
    });
    expect(result?.runs[0]?.output).toBe("partial output");
    expect(
      result?.runs[0]?.evidence?.artifacts.entries.find(
        (entry) => entry.path === "docs/api.md",
      )?.contentBase64,
    ).toBe(Buffer.from("partial edit").toString("base64"));
    expect(result?.evidenceStatus).toBe("insufficient");
    const rescored = await runHarnessEval(true, {
      ...common,
      action: "rescore",
    });
    expect(rescored?.score).toMatchObject({
      scoredTaskCount: 0,
      decision: "insufficient",
    });
  });

  it("preserves captured evidence even when the current checker cannot complete", async () => {
    const project = makeProject();
    vi.spyOn(console, "log").mockImplementation(() => undefined);
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    writeFileSync(
      project.suitePath,
      readFileSync(project.suitePath, "utf-8").replaceAll(
        "path: docs/api.md",
        "path: ../outside.md",
      ),
    );
    const result = await runHarnessEval(true, {
      suite: project.suitePath,
      candidate: project.candidateRoot,
      _projectRoot: project.root,
      live: true,
      record: true,
      yes: true,
      _vendor: "codex",
      _materializeVendor: () => undefined,
      _dispatch: () => "original output",
    });
    expect(result?.runs[0]?.dispatchError).toContain(
      "Current checks could not complete",
    );
    expect(result?.runs[0]?.evidence?.outputHash).toBeTruthy();
    expect(result?.runs[0]?.evidence?.artifacts.complete).toBe(true);
  });

  it("rejects an unknown runtime action before dispatch", async () => {
    const project = makeProject();
    const dispatch = vi.fn(() => "unexpected");
    await expect(
      runHarnessEval(true, {
        suite: project.suitePath,
        candidate: project.candidateRoot,
        _projectRoot: project.root,
        action: "unknown" as never,
        _dispatch: dispatch,
      }),
    ).rejects.toThrow(/Unknown harness action/);
    expect(dispatch).not.toHaveBeenCalled();
  });

  it("rejects a candidate rooted at the baseline project", async () => {
    const project = makeProject();
    await expect(
      runHarnessEval(true, {
        suite: project.suitePath,
        candidate: project.root,
        mock: true,
        _projectRoot: project.root,
      }),
    ).rejects.toThrow(/separate/i);
  });
});

describe("harness execution provenance and trace", () => {
  it("records conditions, per-arm trace, and linked session events for a live run", async () => {
    const project = makeProject();
    vi.spyOn(console, "log").mockImplementation(() => undefined);
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    const result = await runHarnessEval(true, {
      suite: project.suitePath,
      candidate: project.candidateRoot,
      live: true,
      record: true,
      yes: true,
      _projectRoot: project.root,
      _vendor: "codex",
      _materializeVendor: () => undefined,
      _dispatch: ({ workspace }) => {
        const skill = readFileSync(
          join(workspace, ".agents", "skills", "oma-example", "SKILL.md"),
          "utf-8",
        );
        if (skill === "CANDIDATE")
          writeFileSync(join(workspace, "docs", "api.md"), "fixed", "utf-8");
        return skill;
      },
    });
    expect(result?.conditions).toBe("current");
    expect(result?.manifest).toMatchObject({
      vendor: "codex",
      dispatchMode: "injected",
      memory: "disabled",
      environmentPolicy: { mode: "allowlist", forced: ["OMA_NO_AGENTMEMORY"] },
    });
    expect(result?.traceSession).toBe("oma-harness-recorded-eval");
    const candidateRun = result?.runs.find(
      (run) => run.taskId === "task-1" && run.arm === "candidate",
    );
    expect(candidateRun?.trace).toMatchObject({
      output: "complete",
      stderr: "unavailable",
      artifacts: "complete",
      toolCalls: "unsupported",
      changedPaths: ["docs/api.md"],
    });
    const baselineRun = result?.runs.find(
      (run) => run.taskId === "task-1" && run.arm === "baseline",
    );
    expect(baselineRun?.trace?.changedPaths).toEqual([]);
    expect(baselineRun?.trace?.causalityKey).not.toBe(
      candidateRun?.trace?.causalityKey,
    );

    const recordFile = readdirSync(join(project.root, "eval", "_runs"))[0];
    const record = JSON.parse(
      readFileSync(
        join(project.root, "eval", "_runs", recordFile ?? ""),
        "utf-8",
      ),
    ) as { manifest?: { manifestHash: string }; recordHash: string };
    expect(record.manifest?.manifestHash).toBe(result?.manifest?.manifestHash);

    const events = readEvents(project.root, "oma-harness-recorded-eval");
    const started = events.find(
      (event) => event.kind === "harness.eval.started",
    );
    const arms = events.filter(
      (event) => event.kind === "harness.arm.completed",
    );
    const completed = events.find(
      (event) => event.kind === "harness.eval.completed",
    );
    expect(started?.payload).toMatchObject({
      action: "live",
      suiteId: "recorded-eval",
      manifestHash: result?.manifest?.manifestHash,
      tasks: 5,
    });
    expect(arms).toHaveLength(10);
    for (const arm of arms) {
      expect(arm.parentEventId).toBe(started?.eventId);
      expect(arm.causalityKey).toBe(started?.causalityKey);
    }
    expect(arms.map((event) => event.payload?.arm)).toEqual(
      Array.from({ length: 5 }, () => ["baseline", "candidate"]).flat(),
    );
    expect(completed?.payload).toMatchObject({
      decision: "pass",
      recordHash: record.recordHash,
      recordPath: join("eval", "_runs", recordFile ?? ""),
    });
  });

  it("keeps bounded diagnostics and a partial-output trace for a failed arm", async () => {
    const project = makeProject();
    vi.spyOn(console, "log").mockImplementation(() => undefined);
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    const result = await runHarnessEval(true, {
      suite: project.suitePath,
      candidate: project.candidateRoot,
      live: true,
      yes: true,
      _projectRoot: project.root,
      _vendor: "codex",
      _materializeVendor: () => undefined,
      _dispatch: ({ workspace, arm }) => {
        if (arm === "baseline") return "ok";
        writeFileSync(join(workspace, "docs", "api.md"), "half done", "utf-8");
        throw new Error("Harness dispatch failed (exit 7): boom", {
          cause: {
            status: 7,
            stderr: "boom\nstack",
            stdout: "half answer",
          },
        });
      },
    });
    const failed = result?.runs.find((run) => run.arm === "candidate");
    expect(failed?.diagnostics).toEqual({
      exitCode: 7,
      signal: null,
      timedOut: false,
      stderr: "boom\nstack",
      stderrStatus: "captured",
    });
    expect(failed?.trace).toMatchObject({
      output: "partial",
      stderr: "captured",
      changedPaths: ["docs/api.md"],
    });
    expect(failed?.output).toBe("half answer");
    const succeeded = result?.runs.find((run) => run.arm === "baseline");
    expect(succeeded?.diagnostics?.stderrStatus).toBe("unavailable");
    expect(succeeded?.trace?.output).toBe("complete");
    const armEvents = readEvents(
      project.root,
      "oma-harness-recorded-eval",
    ).filter((event) => event.kind === "harness.arm.completed");
    expect(
      armEvents.find((event) => event.payload?.arm === "candidate")?.payload,
    ).toMatchObject({
      exitCode: 7,
      timedOut: false,
      trace: { output: "partial" },
    });
  });

  it("flags recorded conditions that differ from the current resolution on replay", async () => {
    const project = makeProject();
    vi.spyOn(console, "log").mockImplementation(() => undefined);
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    const common = {
      suite: project.suitePath,
      candidate: project.candidateRoot,
      _projectRoot: project.root,
    };
    await runHarnessEval(true, {
      ...common,
      live: true,
      record: true,
      yes: true,
      _vendor: "codex",
      _materializeVendor: () => undefined,
      _dispatch: () => "done",
    });
    const same = await runHarnessEval(true, {
      ...common,
      mock: true,
      _vendor: "codex",
    });
    expect(same?.conditions).toBe("recorded");
    expect(same?.manifest?.vendor).toBe("codex");
    expect(
      same?.replayLimitations?.some((limit) =>
        limit.startsWith("Recorded conditions differ"),
      ),
    ).toBe(false);

    const different = await runHarnessEval(true, {
      ...common,
      action: "rescore",
      _vendor: "claude",
    });
    expect(different?.conditions).toBe("recorded");
    expect(different?.manifest?.vendor).toBe("codex");
    const limitation = different?.replayLimitations?.find((limit) =>
      limit.startsWith("Recorded conditions differ"),
    );
    expect(limitation).toContain('vendor: recorded "codex", current "claude"');
    expect(different?.promotionBlockers).toContain(limitation);
  });
});

describe("harness usage accounting", () => {
  it("sums vendor-reported usage over arms and stores it in the record", async () => {
    const project = makeProject();
    vi.spyOn(console, "log").mockImplementation(() => undefined);
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    const result = await runHarnessEval(true, {
      suite: project.suitePath,
      candidate: project.candidateRoot,
      live: true,
      record: true,
      yes: true,
      _projectRoot: project.root,
      _vendor: "codex",
      _materializeVendor: () => undefined,
      _dispatch: ({ arm }) => ({
        output: "done",
        usage:
          arm === "candidate"
            ? {
                status: "actual",
                inputTokens: 100,
                outputTokens: 10,
                costUsd: 0.01,
                durationMs: 500,
                model: "m",
              }
            : undefined,
      }),
    });
    expect(result?.usage).toEqual({
      status: "partial",
      dispatches: 10,
      inputTokens: 500,
      outputTokens: 50,
      costUsd: expect.closeTo(0.05, 6),
    });
    const candidateRun = result?.runs.find((run) => run.arm === "candidate");
    expect(candidateRun?.usage?.costUsd).toBe(0.01);
    expect(
      result?.runs.find((run) => run.arm === "baseline")?.usage,
    ).toBeUndefined();
    const recordFile = readdirSync(join(project.root, "eval", "_runs"))[0];
    const record = JSON.parse(
      readFileSync(
        join(project.root, "eval", "_runs", recordFile ?? ""),
        "utf-8",
      ),
    ) as { runs: Array<{ usage?: { costUsd: number } }> };
    expect(record.runs.filter((run) => run.usage)).toHaveLength(5);
    const replay = await runHarnessEval(true, {
      suite: project.suitePath,
      candidate: project.candidateRoot,
      mock: true,
      _projectRoot: project.root,
      _vendor: "codex",
    });
    expect(
      replay?.runs.find((run) => run.arm === "candidate")?.usage?.costUsd,
    ).toBe(0.01);
  });
});
