import {
  existsSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { sha256Hex } from "../../utils/hash.js";
import { captureHarnessSnapshot, harnessTaskInputHash } from "./evidence.js";
import {
  type HarnessRecord,
  inspectHarnessRecord,
  writeHarnessRecord,
} from "./records.js";
import {
  fixtureReplayHarnessRecord,
  type HarnessFixtureTranscript,
  initialSnapshotsFromHarnessRecord,
  replayHarnessFixtureTranscript,
  rescoreHarnessRecord,
  scoreHarnessReplay,
} from "./replay.js";
import type { HarnessArmRun, HarnessSuite } from "./types.js";

function required<T>(value: T | undefined): T {
  if (value === undefined) throw new Error("Missing test fixture");
  return value;
}
const roots: string[] = [];
const temporary = () => {
  const root = mkdtempSync(join(tmpdir(), "oma-replay-"));
  roots.push(root);
  return root;
};
afterEach(() => {
  for (const root of roots.splice(0))
    rmSync(root, { recursive: true, force: true });
});
function scenario(): {
  suite: HarnessSuite;
  record: HarnessRecord;
  path: string;
} {
  const root = temporary();
  writeFileSync(join(root, "state.txt"), "stale");
  const initial = captureHarnessSnapshot(root, {
    excludeHarnessControls: false,
  });
  const suite: HarnessSuite = {
    schemaVersion: 1,
    id: "raw",
    agent: "docs-curator",
    sourcePath: join(root, "suite.yaml"),
    tasks: [
      {
        id: "task",
        prompt: "Repair it",
        weight: 1,
        workspace: root,
        checks: [{ type: "file_contains", path: "state.txt", value: "fixed" }],
        incident: {
          id: "incident-1",
          manifestHash: "manifest",
          sourceRunId: "run-1",
        },
      },
    ],
  };
  const task = required(suite.tasks[0]);
  const runs: HarnessArmRun[] = (["baseline", "candidate"] as const).map(
    (arm) => {
      writeFileSync(
        join(root, "state.txt"),
        arm === "candidate" ? "fixed" : "stale",
      );
      const output = arm === "candidate" ? "completed" : "pending";
      return {
        taskId: task.id,
        arm,
        incident: task.incident,
        passed: arm === "baseline",
        durationMs: 10,
        output,
        checks: [
          {
            check: required(task.checks[0]),
            passed: arm === "baseline",
            message: "deliberately inverted old verdict",
          },
        ],
        evidence: {
          schemaVersion: 1,
          taskPromptHash: harnessTaskInputHash(task),
          outputHash: sha256Hex(output),
          initialWorkspace: initial,
          artifacts: captureHarnessSnapshot(root),
          checkerReferences: task.checks.map((check) => ({ check })),
        },
      };
    },
  );
  const path = join(temporary(), "record.json");
  writeHarnessRecord(path, {
    suiteId: suite.id,
    suiteHash: "suite",
    baselineHash: "base",
    candidateHash: "candidate",
    runs,
  });
  return { suite, record: inspectHarnessRecord(path), path };
}
function transcript(): HarnessFixtureTranscript {
  return {
    schemaVersion: 1,
    taskId: "task",
    requests: [{ tool: "docs", request: { path: "state.txt" } }],
    steps: [
      {
        tool: "docs",
        request: { path: "state.txt" },
        response: { body: "fixed" },
        writes: [{ path: "state.txt", content: "fixed" }],
      },
    ],
    dependencies: [{ name: "docs", repeatability: "fixture" }],
  };
}

describe("raw evidence rescoring", () => {
  it("uses current checks on original artifacts and ignores prior verdicts", () => {
    const { suite, record, path } = scenario();
    writeFileSync(
      join(required(suite.tasks[0]).workspace, "state.txt"),
      "unrelated current file",
    );
    for (const run of record.runs) {
      Object.defineProperty(run, "passed", {
        get: () => {
          throw new Error("Old passed verdict was read");
        },
      });
      Object.defineProperty(run, "checks", {
        get: () => {
          throw new Error("Old check verdict was read");
        },
      });
    }
    expect(rescoreHarnessRecord(record, { suite }).evidenceStatus).toBe(
      "complete",
    );
    const scored = rescoreHarnessRecord(path, { suite });
    expect(scored.runs.map((run) => run.passed)).toEqual([false, true]);
    expect(scored.runs[1]?.incident?.sourceRunId).toBe("run-1");
    required(suite.tasks[0]).checks = [
      { type: "file_contains", path: "state.txt", value: "stale" },
    ];
    expect(
      rescoreHarnessRecord(record, { suite }).runs.map((run) => run.passed),
    ).toEqual([true, false]);
  });

  it("reports missing evidence and command environments as insufficient, not candidate failures", () => {
    const { suite, record } = scenario();
    delete required(record.runs[0]).evidence;
    const result = rescoreHarnessRecord(record, { suite });
    expect(result.evidenceStatus).toBe("insufficient");
    expect(scoreHarnessReplay(suite.tasks, result)).toMatchObject({
      scoredTaskCount: 0,
      decision: "insufficient",
    });
    required(suite.tasks[0]).checks = [
      {
        type: "command",
        argv: [process.execPath, "{checker}"],
        checker: "unavailable.js",
        timeout_ms: 1000,
        expected_exit_code: 0,
      },
    ];
    expect(
      rescoreHarnessRecord(record, { suite }).limitations.join(" "),
    ).toContain("external runtime");
  });

  it("refuses missing artifacts, failed dispatch output, and task identity drift", () => {
    const { suite, record } = scenario();
    const omitted = temporary();
    writeFileSync(join(omitted, ".env"), "secret");
    required(required(record.runs[0]).evidence).artifacts =
      captureHarnessSnapshot(omitted);
    required(record.runs[1]).dispatchError = "model failed";
    const result = rescoreHarnessRecord(record, { suite });
    expect(result.runs.every((run) => run.dispatchError)).toBe(true);
    expect(result.limitations.join(" ")).toContain(
      "partial output is diagnostic",
    );
    required(suite.tasks[0]).prompt = "Different task";
    expect(
      rescoreHarnessRecord(record, { suite }).limitations.join(" "),
    ).toContain("identity changed");
  });

  it("does not infer absent harness controls from excluded artifact paths", () => {
    const { suite, record } = scenario();
    required(suite.tasks[0]).checks = [
      { type: "file_not_exists", path: "docs/../.agents/rules/policy.md" },
    ];
    expect(rescoreHarnessRecord(record, { suite }).evidenceStatus).toBe(
      "insufficient",
    );
    expect(
      fixtureReplayHarnessRecord(record, { suite, transcripts: [transcript()] })
        .evidenceStatus,
    ).toBe("insufficient");
  });

  it("keeps legacy records available for inspection but refuses their verdicts as raw evidence", () => {
    const { suite, record } = scenario();
    record.schemaVersion = 1;
    expect(
      rescoreHarnessRecord(record, { suite }).limitations.join(" "),
    ).toContain("inspection only");
    expect(() =>
      initialSnapshotsFromHarnessRecord(record, suite.tasks, suite.id),
    ).toThrow(/Legacy/);
  });

  it("rejects reuse from a different or unidentified suite before checks or reruns", () => {
    const { suite, record } = scenario();
    suite.id = "unrelated-suite";
    expect(() => rescoreHarnessRecord(record, { suite })).toThrow(
      /suite identity/,
    );
    expect(() =>
      fixtureReplayHarnessRecord(record, {
        suite,
        transcripts: [transcript()],
      }),
    ).toThrow(/suite identity/);
    expect(() =>
      initialSnapshotsFromHarnessRecord(record, suite.tasks, suite.id),
    ).toThrow(/suite identity/);
    delete record.suiteId;
    expect(() => rescoreHarnessRecord(record, { suite })).toThrow(
      /suite identity/,
    );
  });

  it("rejects modification of immutable records and raw bytes", () => {
    const { path, record } = scenario();
    expect(() =>
      writeHarnessRecord(path, { ...record, candidateHash: "new" }),
    ).toThrow(/immutable/);
    const tampered = JSON.parse(readFileSync(path, "utf-8"));
    tampered.runs[0].output = "changed";
    writeFileSync(path, JSON.stringify(tampered));
    expect(() => inspectHarnessRecord(path)).toThrow(/integrity/);
  });
});

describe("fixture transcript replay", () => {
  it("matches tool requests and applies fixtures equally to both arms without proving candidate behavior", () => {
    const { suite, record } = scenario();
    const result = fixtureReplayHarnessRecord(record, {
      suite,
      transcripts: [transcript()],
    });
    expect(result.evidenceStatus).toBe("complete");
    expect(result.runs.map((run) => run.passed)).toEqual([true, true]);
    expect(scoreHarnessReplay(suite.tasks, result).lift).toBe(0);
    expect(result.limitations.join(" ")).toContain(
      "cannot establish candidate behavioral improvement",
    );
  });

  it("rejects request drift and dependencies that cannot be replayed", () => {
    const { suite, record } = scenario();
    const fixture = transcript();
    required(fixture.requests[0]).request = { path: "other.txt" };
    expect(
      fixtureReplayHarnessRecord(record, {
        suite,
        transcripts: [fixture],
      }).limitations.join(" "),
    ).toContain("request sequence");
    const dependency = transcript();
    dependency.dependencies = [
      {
        name: "clock",
        repeatability: "live",
        reason: "wall-clock not recorded",
      },
    ];
    expect(
      fixtureReplayHarnessRecord(record, {
        suite,
        transcripts: [dependency],
      }).limitations.join(" "),
    ).toContain("Unrepeatable dependency clock");
  });

  it("never executes tool names as commands and rejects unsafe filesystem deltas", () => {
    const { suite, record } = scenario();
    const snapshot = required(
      initialSnapshotsFromHarnessRecord(record, suite.tasks, suite.id).get(
        "task",
      ),
    );
    const workspace = temporary();
    const marker = join(temporary(), "executed");
    const fixture: HarnessFixtureTranscript = {
      schemaVersion: 1,
      taskId: "task",
      requests: [{ tool: "shell", request: { argv: ["touch", marker] } }],
      steps: [
        {
          tool: "shell",
          request: { argv: ["touch", marker] },
          response: "fixture only",
        },
      ],
    };
    expect(
      replayHarnessFixtureTranscript(snapshot, fixture, workspace),
    ).toEqual(["fixture only"]);
    expect(existsSync(marker)).toBe(false);
    required(fixture.steps[0]).writes = [{ path: "../escaped", content: "no" }];
    expect(() =>
      replayHarnessFixtureTranscript(snapshot, fixture, temporary()),
    ).toThrow();
    required(fixture.steps[0]).writes = [
      { path: ".agents/rules/override.md", content: "no" },
    ];
    expect(() =>
      replayHarnessFixtureTranscript(snapshot, fixture, temporary()),
    ).toThrow(/controls/);
  });

  it("requires the same complete initial state from both recorded arms", () => {
    const { suite, record } = scenario();
    required(required(record.runs[1]).evidence).initialWorkspace = required(
      required(record.runs[1]).evidence,
    ).artifacts;
    expect(() =>
      initialSnapshotsFromHarnessRecord(record, suite.tasks, suite.id),
    ).toThrow(/mismatched/);
  });
});
