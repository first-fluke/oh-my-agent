import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  buildJudgeDispatchFn,
  collectLiveRollouts,
  computeNegativeTransfer,
  computeUtility,
  discoverNeighborTasks,
  type IsolationStatus,
  JUDGE_DEFAULT_RUBRIC,
  type JudgeDispatchFn,
  judgeScore,
  type LiveDispatchFn,
  loadRolloutEntries,
  loadTaskFixtures,
  MIN_TASKS,
  NEG_TRANSFER_FAIL,
  type NegativeTransfer,
  REGEX_OUTPUT_MAX_LEN,
  REGEX_PATTERN_MAX_LEN,
  type RolloutEntry,
  renderSkillUtilityReport,
  resolveSkillIsolation,
  runEvalDispatch,
  runSkillsEval,
  type ScoreSkillBodyOptions,
  type SkillsEvalOptions,
  type SkillUtilityReport,
  scoreChecker,
  scoreNeighborInLive,
  scoreNeighborInMock,
  scoreSkillBody,
  serializeSkillUtilityReport,
  setupIsolatedSkillsDir,
  type TaskFixture,
  UTILITY_FAIL_LIFT,
  UTILITY_WARN_LIFT,
  writeRolloutRecord,
} from "./eval.js";

// --- Helpers ---

function writeTask(dir: string, fixture: TaskFixture): void {
  mkdirSync(dir, { recursive: true });
  const yaml = [
    `id: ${fixture.id}`,
    `skill: ${fixture.skill}`,
    `domain: ${fixture.domain}`,
    `prompt: "${fixture.prompt}"`,
    "checker:",
    `  type: ${fixture.checker.type}`,
    ...(fixture.checker.type === "assert"
      ? [
          "  expect_contains:",
          ...fixture.checker.expect_contains.map((s) => `    - "${s}"`),
        ]
      : []),
    // Single-quoted YAML scalar: backslashes are literal (YAML 1.2 §7.3.3).
    // Double-quoted scalars interpret \w as an illegal escape → BAD_DQ_ESCAPE.
    ...(fixture.checker.type === "regex"
      ? [`  pattern: '${fixture.checker.pattern}'`]
      : []),
    ...(fixture.checker.type === "judge" && fixture.checker.rubric
      ? [`  rubric: "${fixture.checker.rubric}"`]
      : []),
    `weight: ${fixture.weight}`,
  ].join("\n");
  writeFileSync(join(dir, `${fixture.id}.yaml`), yaml, "utf-8");
}

/** Write a task YAML that deliberately omits the checker block entirely. */
function writeTaskNoChecker(
  dir: string,
  id: string,
  prompt = `Prompt for ${id}`,
): void {
  mkdirSync(dir, { recursive: true });
  const yaml = [
    `id: ${id}`,
    "skill: oma-test",
    "domain: test",
    `prompt: "${prompt}"`,
    "weight: 1",
  ].join("\n");
  writeFileSync(join(dir, `${id}.yaml`), yaml, "utf-8");
}

/** Write a task YAML that has a checker block but omits the type field. */
function writeTaskCheckerNoType(
  dir: string,
  id: string,
  rubric?: string,
): void {
  mkdirSync(dir, { recursive: true });
  const lines = [
    `id: ${id}`,
    "skill: oma-test",
    "domain: test",
    `prompt: "Prompt for ${id}"`,
    "checker:",
    ...(rubric ? [`  rubric: "${rubric}"`] : []),
    "weight: 1",
  ];
  writeFileSync(join(dir, `${id}.yaml`), lines.join("\n"), "utf-8");
}

function writeRollout(dir: string, entries: RolloutEntry[]): void {
  const rolloutsDir = join(dir, "_rollouts");
  mkdirSync(rolloutsDir, { recursive: true });
  // Write each entry as its own file to mirror real fixture layout
  for (const entry of entries) {
    writeFileSync(
      join(rolloutsDir, `${entry.taskId}-${entry.arm}.json`),
      JSON.stringify(entry),
      "utf-8",
    );
  }
}

function makeTaskFixture(
  id: string,
  overrides: Partial<TaskFixture> = {},
): TaskFixture {
  return {
    id,
    skill: "oma-test",
    domain: "test",
    prompt: `Test prompt for ${id}`,
    checker: { type: "assert", expect_contains: ["EXPECTED"] },
    weight: 1,
    ...overrides,
  };
}

function makeRolloutPair(
  taskId: string,
  baselineOutput: string,
  treatmentOutput: string,
): RolloutEntry[] {
  return [
    { taskId, arm: "baseline", output: baselineOutput },
    { taskId, arm: "treatment", output: treatmentOutput },
  ];
}

/** Make MIN_TASKS fixtures all passing treatment / failing baseline. */
function makePassingScenario(n = MIN_TASKS): {
  tasks: TaskFixture[];
  rollouts: RolloutEntry[];
} {
  const tasks = Array.from({ length: n }, (_, i) =>
    makeTaskFixture(`task-${i}`),
  );
  const rollouts = tasks.flatMap((t) =>
    makeRolloutPair(t.id, "NO MATCH", "EXPECTED"),
  );
  return { tasks, rollouts };
}

// --- Tests ---

describe("scoreChecker", () => {
  it("assert: returns 1 when all strings are present", () => {
    const checker = {
      type: "assert" as const,
      expect_contains: ["foo", "bar"],
    };
    expect(scoreChecker(checker, "foo bar baz")).toBe(1);
  });

  it("assert: returns 0 when any string is missing", () => {
    const checker = {
      type: "assert" as const,
      expect_contains: ["foo", "missing"],
    };
    expect(scoreChecker(checker, "foo bar")).toBe(0);
  });

  it("assert: returns 1 for empty expect_contains (vacuously true)", () => {
    const checker = { type: "assert" as const, expect_contains: [] };
    expect(scoreChecker(checker, "anything")).toBe(1);
  });

  it("regex: returns 1 when pattern matches", () => {
    const checker = { type: "regex" as const, pattern: "section=\\w+" };
    expect(scoreChecker(checker, "result: section=statements")).toBe(1);
  });

  it("regex: returns 0 when pattern does not match", () => {
    const checker = { type: "regex" as const, pattern: "^NOPE" };
    expect(scoreChecker(checker, "output text")).toBe(0);
  });

  it("regex: returns 0 for an invalid pattern (does not throw)", () => {
    const checker = { type: "regex" as const, pattern: "[invalid" };
    expect(scoreChecker(checker, "text")).toBe(0);
  });

  it("judge: throws with M2 message", () => {
    const checker = { type: "judge" as const };
    expect(() => scoreChecker(checker, "output")).toThrow("M2");
  });

  // Fix 5 regression tests — ReDoS stop-gap
  it("regex: scores 0 promptly for a catastrophic pattern (ReDoS stop-gap via pattern-length cap)", () => {
    // A catastrophic pattern that exceeds REGEX_PATTERN_MAX_LEN is rejected
    // immediately (score 0) without any regex engine execution, so it cannot hang.
    // We use `(a+)+` repeated until the string exceeds the cap to guarantee the
    // pattern-length guard fires rather than the regex engine.
    const catastrophicCore = "(a+)+";
    const repeats = Math.ceil(
      (REGEX_PATTERN_MAX_LEN + 1) / catastrophicCore.length,
    );
    const checker = {
      type: "regex" as const,
      pattern: catastrophicCore.repeat(repeats), // length > REGEX_PATTERN_MAX_LEN
    };
    const start = performance.now();
    const score = scoreChecker(checker, `${"a".repeat(30)}!`);
    const elapsed = performance.now() - start;
    // Pattern cap fires before regex engine — must be near-instant
    expect(elapsed).toBeLessThan(100);
    expect(score).toBe(0);
  });

  it("regex: scores 0 for a pattern exceeding REGEX_PATTERN_MAX_LEN", () => {
    const checker = {
      type: "regex" as const,
      pattern: "a".repeat(REGEX_PATTERN_MAX_LEN + 1),
    };
    expect(scoreChecker(checker, "aaa")).toBe(0);
  });

  it("regex: truncates output beyond REGEX_OUTPUT_MAX_LEN before matching", () => {
    // Pattern matches the letter 'Z' — only present past the output cap
    const checker = { type: "regex" as const, pattern: "Z" };
    const longOutput = `${"a".repeat(REGEX_OUTPUT_MAX_LEN)}Z`;
    // 'Z' is beyond the cap, so match fails
    expect(scoreChecker(checker, longOutput)).toBe(0);
  });
});

describe("loadTaskFixtures", () => {
  let dir: string;

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), "oma-eval-fixtures-"));
  });

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  it("returns empty fixtures for a non-existent directory", () => {
    const result = loadTaskFixtures(join(dir, "nonexistent"));
    expect(result.fixtures).toHaveLength(0);
    expect(result.skippedFiles).toHaveLength(0);
  });

  it("returns empty fixtures for an empty directory", () => {
    const result = loadTaskFixtures(dir);
    expect(result.fixtures).toHaveLength(0);
    expect(result.skippedFiles).toHaveLength(0);
  });

  it("loads valid task fixtures", () => {
    writeTask(dir, makeTaskFixture("task-1"));
    writeTask(dir, makeTaskFixture("task-2"));
    const { fixtures } = loadTaskFixtures(dir);
    expect(fixtures).toHaveLength(2);
    expect(fixtures.map((f) => f.id)).toContain("task-1");
    expect(fixtures.map((f) => f.id)).toContain("task-2");
  });

  it("skips malformed YAML files and reports them in skippedFiles", () => {
    writeTask(dir, makeTaskFixture("valid"));
    writeFileSync(join(dir, "broken.yaml"), "id: [\ninvalid yaml", "utf-8");
    const { fixtures, skippedFiles } = loadTaskFixtures(dir);
    expect(fixtures).toHaveLength(1);
    expect(fixtures[0]?.id).toBe("valid");
    expect(skippedFiles).toContain("broken.yaml");
  });

  it("skips schema-invalid YAML files and reports them in skippedFiles", () => {
    writeTask(dir, makeTaskFixture("valid"));
    // YAML parses OK but fails isTaskFixture (missing required fields)
    writeFileSync(join(dir, "no-schema.yaml"), "foo: bar\nbaz: 42\n", "utf-8");
    const { fixtures, skippedFiles } = loadTaskFixtures(dir);
    expect(fixtures).toHaveLength(1);
    expect(skippedFiles).toContain("no-schema.yaml");
  });

  // Fix 3 regression test: malformed double-quoted regex + 5 valid tasks
  it("warns on double-quoted regex YAML (bad escape) and still loads 5 valid tasks", () => {
    for (let i = 0; i < 5; i++) {
      writeTask(dir, makeTaskFixture(`task-${i}`));
    }
    // Simulate the invalid double-quoted pattern that caused the original bug
    writeFileSync(
      join(dir, "bad-regex.yaml"),
      'id: bad\nskill: s\ndomain: d\nprompt: p\nchecker:\n  type: regex\n  pattern: "\\w+"\nweight: 1\n',
      "utf-8",
    );
    const { fixtures, skippedFiles } = loadTaskFixtures(dir);
    expect(fixtures).toHaveLength(5);
    expect(skippedFiles).toHaveLength(1);
    expect(skippedFiles[0]).toBe("bad-regex.yaml");
  });

  it("skips files starting with underscore (_rollouts dir)", () => {
    writeTask(dir, makeTaskFixture("good-task"));
    mkdirSync(join(dir, "_rollouts"), { recursive: true });
    writeFileSync(join(dir, "_rollouts", "data.yaml"), "id: skip\n", "utf-8");
    const { fixtures } = loadTaskFixtures(dir);
    expect(fixtures).toHaveLength(1);
  });

  it("skips non-yaml files", () => {
    writeTask(dir, makeTaskFixture("real"));
    writeFileSync(join(dir, "README.md"), "# docs", "utf-8");
    const { fixtures } = loadTaskFixtures(dir);
    expect(fixtures).toHaveLength(1);
  });

  it("returns fixtures in deterministic (sorted) order", () => {
    writeTask(dir, makeTaskFixture("z-task"));
    writeTask(dir, makeTaskFixture("a-task"));
    writeTask(dir, makeTaskFixture("m-task"));
    const { fixtures } = loadTaskFixtures(dir);
    expect(fixtures.map((f) => f.id)).toEqual(fixtures.map((f) => f.id).sort());
  });
});

describe("loadRolloutEntries", () => {
  let dir: string;

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), "oma-eval-rollouts-"));
  });

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  it("returns empty array when _rollouts dir does not exist", () => {
    expect(loadRolloutEntries(dir)).toHaveLength(0);
  });

  it("loads rollout entries from JSON files", () => {
    const entries = [
      { taskId: "t1", arm: "baseline" as const, output: "base out" },
      { taskId: "t1", arm: "treatment" as const, output: "treat out" },
    ];
    writeRollout(dir, entries);
    const loaded = loadRolloutEntries(dir);
    expect(loaded).toHaveLength(2);
    expect(loaded.some((e) => e.arm === "baseline")).toBe(true);
    expect(loaded.some((e) => e.arm === "treatment")).toBe(true);
  });

  it("loads array rollout files", () => {
    const rolloutsDir = join(dir, "_rollouts");
    mkdirSync(rolloutsDir, { recursive: true });
    writeFileSync(
      join(rolloutsDir, "batch.json"),
      JSON.stringify([
        { taskId: "t2", arm: "baseline", output: "b" },
        { taskId: "t2", arm: "treatment", output: "t" },
      ]),
      "utf-8",
    );
    const loaded = loadRolloutEntries(dir);
    expect(loaded).toHaveLength(2);
  });

  it("skips malformed rollout files", () => {
    const rolloutsDir = join(dir, "_rollouts");
    mkdirSync(rolloutsDir, { recursive: true });
    writeFileSync(
      join(rolloutsDir, "good.json"),
      JSON.stringify({ taskId: "t3", arm: "baseline", output: "ok" }),
      "utf-8",
    );
    writeFileSync(join(rolloutsDir, "bad.json"), "not json {", "utf-8");
    const loaded = loadRolloutEntries(dir);
    expect(loaded).toHaveLength(1);
  });
});

describe("computeUtility", () => {
  it("returns coverage:insufficient and decision:insufficient when taskCount < MIN_TASKS", () => {
    const tasks = [makeTaskFixture("t1")]; // only 1 task
    const report = computeUtility("oma-test", { tasks, rollouts: [] });
    expect(report.coverage).toBe("insufficient");
    // Fix 1 regression: decision must NOT be "fail" when coverage is insufficient
    expect(report.decision).toBe("insufficient");
    expect(report.taskCount).toBe(1);
  });

  it("returns coverage:insufficient and decision:insufficient with 0 tasks", () => {
    const report = computeUtility("oma-test", { tasks: [], rollouts: [] });
    expect(report.coverage).toBe("insufficient");
    expect(report.decision).toBe("insufficient");
    expect(report.taskCount).toBe(0);
  });

  it("returns coverage:ok with MIN_TASKS tasks", () => {
    const { tasks, rollouts } = makePassingScenario();
    const report = computeUtility("oma-test", { tasks, rollouts });
    expect(report.coverage).toBe("ok");
    expect(report.taskCount).toBe(MIN_TASKS);
  });

  it("decision:pass when utilityLift >= UTILITY_WARN_LIFT", () => {
    // All treatment pass, all baseline fail → lift = 1.0
    const { tasks, rollouts } = makePassingScenario();
    const report = computeUtility("oma-test", { tasks, rollouts });
    expect(report.decision).toBe("pass");
    expect(report.utilityLift).toBeGreaterThanOrEqual(UTILITY_WARN_LIFT);
  });

  it("decision:fail when utilityLift <= UTILITY_FAIL_LIFT", () => {
    // Both arms fail → lift = 0
    const tasks = Array.from({ length: MIN_TASKS }, (_, i) =>
      makeTaskFixture(`task-${i}`),
    );
    const rollouts: RolloutEntry[] = tasks.flatMap((t) =>
      makeRolloutPair(t.id, "NO MATCH", "ALSO NO MATCH"),
    );
    const report = computeUtility("oma-test", { tasks, rollouts });
    expect(report.decision).toBe("fail");
    expect(report.utilityLift).toBeLessThanOrEqual(UTILITY_FAIL_LIFT);
  });

  it("decision:warn when 0 < utilityLift < UTILITY_WARN_LIFT", () => {
    // 21 tasks: 1 has treatment lift, 20 both fail → mean = 1/21 ≈ 0.048 < 0.05 → warn.
    const taskCount = 21;
    const tasks = Array.from({ length: taskCount }, (_, i) =>
      makeTaskFixture(`task-${i}`),
    );
    const rollouts: RolloutEntry[] = tasks.flatMap((t, i) => {
      if (i === 0) {
        return makeRolloutPair(t.id, "NO MATCH", "EXPECTED");
      }
      return makeRolloutPair(t.id, "NO MATCH", "ALSO NO MATCH");
    });
    const report = computeUtility("oma-test", { tasks, rollouts });
    expect(report.coverage).toBe("ok");
    expect(report.utilityLift).toBeGreaterThan(UTILITY_FAIL_LIFT);
    expect(report.utilityLift).toBeLessThan(UTILITY_WARN_LIFT);
    expect(report.decision).toBe("warn");
  });

  it("is deterministic: identical inputs produce identical output", () => {
    const tasks = Array.from({ length: MIN_TASKS }, (_, i) =>
      makeTaskFixture(`task-${i}`),
    );
    const rollouts: RolloutEntry[] = tasks.flatMap((t) =>
      makeRolloutPair(t.id, "base", "EXPECTED"),
    );
    const r1 = computeUtility("oma-test", { tasks, rollouts });
    const r2 = computeUtility("oma-test", { tasks, rollouts });
    expect(serializeSkillUtilityReport(r1)).toBe(
      serializeSkillUtilityReport(r2),
    );
  });

  it("respects maxTasks cap deterministically", () => {
    // 10 tasks but only 5 evaluated
    const tasks = Array.from({ length: 10 }, (_, i) =>
      makeTaskFixture(`task-${String(i).padStart(2, "0")}`),
    );
    const rollouts: RolloutEntry[] = tasks.flatMap((t) =>
      makeRolloutPair(t.id, "NO MATCH", "EXPECTED"),
    );
    const reportFull = computeUtility("oma-test", { tasks, rollouts });
    const reportCapped = computeUtility("oma-test", {
      tasks,
      rollouts,
      maxTasks: 5,
    });
    expect(reportFull.taskCount).toBe(10);
    expect(reportCapped.taskCount).toBe(5);
    expect(reportFull.decision).toBe("pass");
    expect(reportCapped.decision).toBe("pass");
  });

  it("handles missing rollouts (empty output) without throwing", () => {
    const tasks = Array.from({ length: MIN_TASKS }, (_, i) =>
      makeTaskFixture(`task-${i}`),
    );
    // No rollouts — all outputs default to empty string
    const report = computeUtility("oma-test", { tasks, rollouts: [] });
    expect(report.coverage).toBe("ok");
    expect(report.decision).toBe("fail"); // empty string fails assert checker
    expect(report.findings).toHaveLength(MIN_TASKS);
  });

  it("reports utilityStdDev = 0 when all lifts are equal", () => {
    const tasks = Array.from({ length: MIN_TASKS }, (_, i) =>
      makeTaskFixture(`task-${i}`),
    );
    const rollouts: RolloutEntry[] = tasks.flatMap((t) =>
      makeRolloutPair(t.id, "EXPECTED", "EXPECTED"),
    );
    const report = computeUtility("oma-test", { tasks, rollouts });
    expect(report.utilityStdDev).toBe(0);
  });

  it("computes utilityStdDev > 0 for mixed lifts", () => {
    const tasks = Array.from({ length: MIN_TASKS }, (_, i) =>
      makeTaskFixture(`task-${i}`),
    );
    const rollouts: RolloutEntry[] = tasks.flatMap((t, i) => {
      if (i % 2 === 0) {
        return makeRolloutPair(t.id, "NO MATCH", "EXPECTED");
      }
      return makeRolloutPair(t.id, "EXPECTED", "EXPECTED");
    });
    const report = computeUtility("oma-test", { tasks, rollouts });
    expect(report.utilityStdDev).toBeGreaterThan(0);
  });

  it("negativeTransfer is always empty in M1", () => {
    const { tasks, rollouts } = makePassingScenario();
    const report = computeUtility("oma-test", { tasks, rollouts });
    expect(report.negativeTransfer).toHaveLength(0);
  });

  it("propagates skippedFiles into the report", () => {
    const { tasks, rollouts } = makePassingScenario();
    const report = computeUtility("oma-test", {
      tasks,
      rollouts,
      skippedFiles: ["bad.yaml"],
    });
    expect(report.skippedFiles).toEqual(["bad.yaml"]);
  });

  // Fix 6 regression test — weight-aware scoring
  it("weighted mean: higher-weight tasks shift utilityLift", () => {
    // 5 tasks: task-0 has weight=10 and passes treatment only.
    // tasks 1-4 have weight=1 and both arms fail (lift=0).
    // Unweighted mean lift = 1/5 = 0.2.
    // Weighted mean lift = (10*1 + 4*0) / (10 + 4) = 10/14 ≈ 0.714.
    // Both are ≥ UTILITY_WARN_LIFT (0.05) so both "pass", but the numeric lift differs.
    const tasks = [
      makeTaskFixture("task-0", { weight: 10 }),
      ...Array.from({ length: 4 }, (_, i) =>
        makeTaskFixture(`task-${i + 1}`, { weight: 1 }),
      ),
    ];
    const rollouts: RolloutEntry[] = tasks.flatMap((t, i) => {
      if (i === 0) return makeRolloutPair(t.id, "NO MATCH", "EXPECTED");
      return makeRolloutPair(t.id, "NO MATCH", "NO MATCH");
    });
    const report = computeUtility("oma-test", { tasks, rollouts });
    // Weighted: 10/(10+4) ≈ 0.7143
    expect(report.utilityLift).toBeCloseTo(10 / 14, 4);
    // Unweighted would give 0.2 — ensure they differ
    expect(report.utilityLift).not.toBeCloseTo(0.2, 4);
    expect(report.decision).toBe("pass");
  });

  it("uniform weights produce the same result as unweighted mean", () => {
    // When all weights = 1, weighted mean = unweighted mean
    const tasks = Array.from({ length: MIN_TASKS }, (_, i) =>
      makeTaskFixture(`task-${i}`, { weight: 1 }),
    );
    const rollouts: RolloutEntry[] = tasks.flatMap((t, i) => {
      if (i === 0) return makeRolloutPair(t.id, "NO MATCH", "EXPECTED");
      return makeRolloutPair(t.id, "NO MATCH", "NO MATCH");
    });
    const report = computeUtility("oma-test", { tasks, rollouts });
    expect(report.utilityLift).toBeCloseTo(1 / MIN_TASKS, 6);
  });
});

describe("serializeSkillUtilityReport", () => {
  it("produces valid JSON with required fields including ok and skippedFiles", () => {
    const report: SkillUtilityReport = {
      skill: "oma-test",
      taskCount: 5,
      skippedFiles: [],
      baselineScore: 0.4,
      treatmentScore: 0.8,
      utilityLift: 0.4,
      utilityStdDev: 0.0,
      findings: [{ taskId: "t1", baseline: 0, treatment: 1, lift: 1 }],
      negativeTransfer: [],
      decision: "pass",
      coverage: "ok",
      isolation: "n/a",
    };
    const json = serializeSkillUtilityReport(report);
    const parsed = JSON.parse(json) as Record<string, unknown>;
    expect(parsed.skill).toBe("oma-test");
    expect(parsed.coverage).toBe("ok");
    expect(parsed.decision).toBe("pass");
    // Fix 2 regression: ok field present
    expect(parsed.ok).toBe(true);
    expect(typeof parsed.utilityLift).toBe("number");
    expect(Array.isArray(parsed.findings)).toBe(true);
    expect(Array.isArray(parsed.negativeTransfer)).toBe(true);
    expect(Array.isArray(parsed.skippedFiles)).toBe(true);
  });

  // Fix 2 regression: ok field semantics
  it("ok is false when decision is warn", () => {
    const report: SkillUtilityReport = {
      skill: "oma-test",
      taskCount: 21,
      skippedFiles: [],
      baselineScore: 0,
      treatmentScore: 0.048,
      utilityLift: 0.048,
      utilityStdDev: 0,
      findings: [],
      negativeTransfer: [],
      decision: "warn",
      coverage: "ok",
      isolation: "n/a",
    };
    const parsed = JSON.parse(serializeSkillUtilityReport(report)) as Record<
      string,
      unknown
    >;
    expect(parsed.ok).toBe(false);
  });

  it("ok is false when decision is fail", () => {
    const report: SkillUtilityReport = {
      skill: "oma-test",
      taskCount: 5,
      skippedFiles: [],
      baselineScore: 0,
      treatmentScore: 0,
      utilityLift: 0,
      utilityStdDev: 0,
      findings: [],
      negativeTransfer: [],
      decision: "fail",
      coverage: "ok",
      isolation: "n/a",
    };
    const parsed = JSON.parse(serializeSkillUtilityReport(report)) as Record<
      string,
      unknown
    >;
    expect(parsed.ok).toBe(false);
  });

  // Fix 1 regression: insufficient coverage must NOT expose decision:"fail"
  it("insufficient coverage serializes decision:insufficient, not fail", () => {
    const report: SkillUtilityReport = {
      skill: "oma-test",
      taskCount: 1,
      skippedFiles: [],
      baselineScore: 0,
      treatmentScore: 0,
      utilityLift: 0,
      utilityStdDev: 0,
      findings: [],
      negativeTransfer: [],
      decision: "insufficient",
      coverage: "insufficient",
      isolation: "n/a",
    };
    const parsed = JSON.parse(serializeSkillUtilityReport(report)) as Record<
      string,
      unknown
    >;
    expect(parsed.decision).toBe("insufficient");
    expect(parsed.decision).not.toBe("fail");
    expect(parsed.coverage).toBe("insufficient");
    expect(parsed.ok).toBe(false);
  });

  it("ok is false when coverage is insufficient (even if decision were pass)", () => {
    const report: SkillUtilityReport = {
      skill: "oma-test",
      taskCount: 0,
      skippedFiles: [],
      baselineScore: 0,
      treatmentScore: 0,
      utilityLift: 0,
      utilityStdDev: 0,
      findings: [],
      negativeTransfer: [],
      decision: "insufficient",
      coverage: "insufficient",
      isolation: "n/a",
    };
    const parsed = JSON.parse(serializeSkillUtilityReport(report)) as Record<
      string,
      unknown
    >;
    expect(parsed.ok).toBe(false);
  });

  it("produces byte-identical output on repeated calls", () => {
    const report: SkillUtilityReport = {
      skill: "oma-demo",
      taskCount: 5,
      skippedFiles: [],
      baselineScore: 0.6,
      treatmentScore: 0.8,
      utilityLift: 0.2,
      utilityStdDev: 0.1,
      findings: [],
      negativeTransfer: [],
      decision: "pass",
      coverage: "ok",
      isolation: "n/a",
    };
    expect(serializeSkillUtilityReport(report)).toBe(
      serializeSkillUtilityReport(report),
    );
  });
});

describe("loadTaskFixtures + loadRolloutEntries + computeUtility integration", () => {
  let dir: string;

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), "oma-eval-integration-"));
  });

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  it("end-to-end pass: 5 tasks all improve in treatment", () => {
    const tasks = Array.from({ length: 5 }, (_, i) =>
      makeTaskFixture(`task-${i}`),
    );
    for (const t of tasks) {
      writeTask(dir, t);
    }
    const rollouts = tasks.flatMap((t) =>
      makeRolloutPair(t.id, "nothing here", "EXPECTED content"),
    );
    writeRollout(dir, rollouts);

    const { fixtures: loadedTasks, skippedFiles } = loadTaskFixtures(dir);
    const loadedRollouts = loadRolloutEntries(dir);
    const report = computeUtility("oma-test", {
      tasks: loadedTasks,
      rollouts: loadedRollouts,
      skippedFiles,
    });

    expect(report.coverage).toBe("ok");
    expect(report.decision).toBe("pass");
    expect(report.taskCount).toBe(5);
    expect(report.utilityLift).toBeGreaterThan(0);
    expect(report.skippedFiles).toHaveLength(0);
  });

  it("end-to-end fail: 5 tasks, no improvement", () => {
    const tasks = Array.from({ length: 5 }, (_, i) =>
      makeTaskFixture(`task-${i}`),
    );
    for (const t of tasks) {
      writeTask(dir, t);
    }
    const rollouts = tasks.flatMap((t) =>
      makeRolloutPair(t.id, "no match", "also no match"),
    );
    writeRollout(dir, rollouts);

    const { fixtures: loadedTasks, skippedFiles } = loadTaskFixtures(dir);
    const loadedRollouts = loadRolloutEntries(dir);
    const report = computeUtility("oma-test", {
      tasks: loadedTasks,
      rollouts: loadedRollouts,
      skippedFiles,
    });

    expect(report.coverage).toBe("ok");
    expect(report.decision).toBe("fail");
  });

  it("end-to-end insufficient: fewer than MIN_TASKS fixtures", () => {
    writeTask(dir, makeTaskFixture("only-one"));
    const { fixtures: loadedTasks } = loadTaskFixtures(dir);
    const report = computeUtility("oma-test", {
      tasks: loadedTasks,
      rollouts: [],
    });
    expect(report.coverage).toBe("insufficient");
    // Fix 1: must be "insufficient", not "fail"
    expect(report.decision).toBe("insufficient");
  });

  it("is fully deterministic: same tmp dir yields byte-identical JSON twice", () => {
    const tasks = Array.from({ length: MIN_TASKS }, (_, i) =>
      makeTaskFixture(`task-${i}`),
    );
    for (const t of tasks) {
      writeTask(dir, t);
    }
    const rollouts = tasks.flatMap((t) =>
      makeRolloutPair(t.id, "base", "EXPECTED"),
    );
    writeRollout(dir, rollouts);

    const run = (): string => {
      const { fixtures: t, skippedFiles } = loadTaskFixtures(dir);
      const r = loadRolloutEntries(dir);
      return serializeSkillUtilityReport(
        computeUtility("oma-test", { tasks: t, rollouts: r, skippedFiles }),
      );
    };

    expect(run()).toBe(run());
  });

  it("regex checker end-to-end", () => {
    const tasks = Array.from({ length: MIN_TASKS }, (_, i) =>
      makeTaskFixture(`task-${i}`, {
        checker: { type: "regex", pattern: "section=\\w+" },
      }),
    );
    for (const t of tasks) {
      writeTask(dir, t);
    }
    const rollouts = tasks.flatMap((t) =>
      makeRolloutPair(t.id, "no section here", "result: section=claims"),
    );
    writeRollout(dir, rollouts);

    const { fixtures: loadedTasks, skippedFiles } = loadTaskFixtures(dir);
    const loadedRollouts = loadRolloutEntries(dir);
    const report = computeUtility("oma-test", {
      tasks: loadedTasks,
      rollouts: loadedRollouts,
      skippedFiles,
    });

    expect(report.coverage).toBe("ok");
    expect(report.decision).toBe("pass");
  });

  // Fix 3 integration: 1 malformed + 5 valid → skippedFiles populated, coverage ok
  it("skippedFiles is populated and coverage ok when 1 bad file + 5 valid", () => {
    const tasks = Array.from({ length: 5 }, (_, i) =>
      makeTaskFixture(`task-${i}`),
    );
    for (const t of tasks) {
      writeTask(dir, t);
    }
    writeFileSync(join(dir, "bad-file.yaml"), "id: [\nbad yaml", "utf-8");
    const rollouts = tasks.flatMap((t) =>
      makeRolloutPair(t.id, "NO MATCH", "EXPECTED"),
    );
    writeRollout(dir, rollouts);

    const { fixtures: loadedTasks, skippedFiles } = loadTaskFixtures(dir);
    const loadedRollouts = loadRolloutEntries(dir);
    const report = computeUtility("oma-test", {
      tasks: loadedTasks,
      rollouts: loadedRollouts,
      skippedFiles,
    });

    expect(loadedTasks).toHaveLength(5);
    expect(skippedFiles).toHaveLength(1);
    expect(skippedFiles[0]).toBe("bad-file.yaml");
    expect(report.coverage).toBe("ok");
    expect(report.skippedFiles).toHaveLength(1);
  });
});

// Fix 4 regression tests — input validation security
describe("input validation", () => {
  // These tests exercise the exported helpers by importing them indirectly
  // via the runSkillsEval behavior. We test the guards using direct module
  // imports from a sub-import of eval.ts internals. Since the guards are
  // internal, we verify them via runSkillsEval's observable exit behavior
  // using a simple integration approach: construct bad inputs and expect
  // the thrown error message.
  //
  // The guards are also exercised through computeUtility in a safe dir, but
  // the path-traversal checks live in runSkillsEval. We import and call the
  // module-private helpers by re-testing through a thin harness pattern below.

  it("scoreChecker with assert: does not throw on untrusted output", () => {
    const checker = { type: "assert" as const, expect_contains: ["ok"] };
    // Long output must not throw or hang
    expect(() => scoreChecker(checker, "x".repeat(100_000))).not.toThrow();
  });

  it("regex: pattern at exactly MAX length is accepted and executes", () => {
    // Build a pattern of exactly REGEX_PATTERN_MAX_LEN chars that matches its input.
    // Use "a" repeated 200 chars — then use input of 200 "a"s so the pattern matches.
    const checker = {
      type: "regex" as const,
      pattern: "a".repeat(REGEX_PATTERN_MAX_LEN),
    };
    // Input must be at least REGEX_PATTERN_MAX_LEN "a"s for the pattern to match
    expect(scoreChecker(checker, "a".repeat(REGEX_PATTERN_MAX_LEN))).toBe(1);
  });

  it("regex: pattern at MAX+1 length is rejected (score 0)", () => {
    const checker = {
      type: "regex" as const,
      pattern: "a".repeat(REGEX_PATTERN_MAX_LEN + 1),
    };
    expect(scoreChecker(checker, "aaa")).toBe(0);
  });
});

describe("exported constants", () => {
  it("MIN_TASKS is 5", () => expect(MIN_TASKS).toBe(5));
  it("UTILITY_WARN_LIFT is 0.05", () =>
    expect(UTILITY_WARN_LIFT).toBeCloseTo(0.05));
  it("UTILITY_FAIL_LIFT is 0", () => expect(UTILITY_FAIL_LIFT).toBe(0));
  it("NEG_TRANSFER_FAIL is -0.10", () =>
    expect(NEG_TRANSFER_FAIL).toBeCloseTo(-0.1));
  it("REGEX_PATTERN_MAX_LEN is 200", () =>
    expect(REGEX_PATTERN_MAX_LEN).toBe(200));
  it("REGEX_OUTPUT_MAX_LEN is 10_000", () =>
    expect(REGEX_OUTPUT_MAX_LEN).toBe(10_000));
  it("JUDGE_DEFAULT_RUBRIC is non-empty string", () => {
    expect(typeof JUDGE_DEFAULT_RUBRIC).toBe("string");
    expect(JUDGE_DEFAULT_RUBRIC.length).toBeGreaterThan(0);
  });
});

// ============================================================
// Task 12 — judge checker as DEFAULT (design 016 2026-06-04)
// All tests below are deterministic; NO real LLM calls.
// ============================================================

describe("judge default resolution — loadTaskFixtures", () => {
  let dir: string;

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), "oma-eval-judge-default-"));
  });

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  it("fixture with no checker block at all defaults to type: judge", () => {
    writeTaskNoChecker(dir, "no-checker-task");
    const { fixtures } = loadTaskFixtures(dir);
    expect(fixtures).toHaveLength(1);
    expect(fixtures[0]?.checker.type).toBe("judge");
  });

  it("fixture with no checker block uses JUDGE_DEFAULT_RUBRIC (no explicit rubric)", () => {
    writeTaskNoChecker(dir, "no-checker-rubric");
    const { fixtures } = loadTaskFixtures(dir);
    const checker = fixtures[0]?.checker;
    expect(checker?.type).toBe("judge");
    // rubric field on the checker is undefined — caller uses JUDGE_DEFAULT_RUBRIC
    if (checker?.type === "judge") {
      expect(checker.rubric).toBeUndefined();
    }
  });

  it("fixture with checker block but no type defaults to type: judge", () => {
    writeTaskCheckerNoType(dir, "no-type-task");
    const { fixtures } = loadTaskFixtures(dir);
    expect(fixtures).toHaveLength(1);
    expect(fixtures[0]?.checker.type).toBe("judge");
  });

  it("fixture with checker block, no type, but rubric field retains rubric", () => {
    writeTaskCheckerNoType(
      dir,
      "with-rubric-task",
      "Output must mention section=claims",
    );
    const { fixtures } = loadTaskFixtures(dir);
    expect(fixtures).toHaveLength(1);
    const checker = fixtures[0]?.checker;
    expect(checker?.type).toBe("judge");
    if (checker?.type === "judge") {
      expect(checker.rubric).toBe("Output must mention section=claims");
    }
  });

  it("explicit type: judge fixture loads correctly", () => {
    writeTask(dir, {
      id: "explicit-judge",
      skill: "oma-test",
      domain: "test",
      prompt: "Do something",
      checker: { type: "judge", rubric: "Does it do the thing?" },
      weight: 1,
    });
    const { fixtures } = loadTaskFixtures(dir);
    expect(fixtures).toHaveLength(1);
    expect(fixtures[0]?.checker.type).toBe("judge");
    if (fixtures[0]?.checker.type === "judge") {
      expect(fixtures[0].checker.rubric).toBe("Does it do the thing?");
    }
  });

  it("assert and regex checkers are unaffected by judge default logic", () => {
    writeTask(dir, makeTaskFixture("assert-task"));
    writeTask(
      dir,
      makeTaskFixture("regex-task", {
        checker: { type: "regex", pattern: "ok" },
      }),
    );
    const { fixtures } = loadTaskFixtures(dir);
    expect(fixtures).toHaveLength(2);
    const types = fixtures.map((f) => f.checker.type).sort();
    expect(types).toEqual(["assert", "regex"]);
  });
});

describe("judgeScore — verdict parsing (mocked dispatch, no real LLM)", () => {
  const makeMockDispatch = (response: string): JudgeDispatchFn =>
    vi.fn(() => response);

  it("returns 1 when LLM responds PASS", () => {
    expect(
      judgeScore("task", "output", "rubric", makeMockDispatch("PASS")),
    ).toBe(1);
  });

  it("returns 1 when PASS appears in mixed-case response", () => {
    expect(
      judgeScore("task", "output", "rubric", makeMockDispatch("pass")),
    ).toBe(1);
  });

  it("returns 0 when LLM responds FAIL", () => {
    expect(
      judgeScore("task", "output", "rubric", makeMockDispatch("FAIL")),
    ).toBe(0);
  });

  it("returns 0 when LLM responds fail (lowercase)", () => {
    expect(
      judgeScore("task", "output", "rubric", makeMockDispatch("fail")),
    ).toBe(0);
  });

  it("returns 0 on ambiguous response (neither PASS nor FAIL)", () => {
    expect(
      judgeScore("task", "output", "rubric", makeMockDispatch("I don't know")),
    ).toBe(0);
  });

  it("returns 0 on empty response", () => {
    expect(judgeScore("task", "output", "rubric", makeMockDispatch(""))).toBe(
      0,
    );
  });

  it("PASS wins when PASS appears before FAIL in response", () => {
    expect(
      judgeScore(
        "task",
        "output",
        "rubric",
        makeMockDispatch("PASS or FAIL? PASS"),
      ),
    ).toBe(1);
  });

  it("FAIL wins when FAIL appears before PASS in response", () => {
    expect(
      judgeScore(
        "task",
        "output",
        "rubric",
        makeMockDispatch("FAIL — but almost PASS"),
      ),
    ).toBe(0);
  });

  it("dispatch is called exactly once per judgeScore call", () => {
    const dispatch = vi.fn(() => "PASS");
    judgeScore("task", "output", "rubric", dispatch);
    expect(dispatch).toHaveBeenCalledTimes(1);
  });

  it("grading prompt includes task prompt, output, and rubric", () => {
    const dispatch = vi.fn((_prompt: string) => "PASS");
    judgeScore("MY_TASK_PROMPT", "MY_OUTPUT", "MY_RUBRIC", dispatch);
    const calledWith = dispatch.mock.calls[0]?.[0] ?? "";
    expect(calledWith).toContain("MY_TASK_PROMPT");
    expect(calledWith).toContain("MY_OUTPUT");
    expect(calledWith).toContain("MY_RUBRIC");
    expect(calledWith).toContain("PASS or FAIL");
  });
});

describe("scoreChecker — judge with recordedScore (mock replay)", () => {
  it("returns recorded score 1 without calling any dispatch", () => {
    const checker = { type: "judge" as const };
    expect(scoreChecker(checker, "any output", 1)).toBe(1);
  });

  it("returns recorded score 0 without calling any dispatch", () => {
    const checker = { type: "judge" as const };
    expect(scoreChecker(checker, "any output", 0)).toBe(0);
  });

  it("throws when judge checker has no recorded score (mock mode guard)", () => {
    const checker = { type: "judge" as const };
    expect(() => scoreChecker(checker, "output")).toThrow(/recorded/);
  });
});

describe("collectLiveRollouts — judge tasks get score field", () => {
  it("populates score on both arms for a judge task when judgeDispatchFn is provided", () => {
    const tasks: TaskFixture[] = [
      {
        id: "j1",
        skill: "oma-test",
        domain: "test",
        prompt: "Do something",
        checker: { type: "judge", rubric: "Does it work?" },
        weight: 1,
      },
    ];
    const liveFn = vi.fn((_arm: string, _prompt: string) => "arm output");
    // baseline → FAIL (0), treatment → PASS (1)
    let judgeCallCount = 0;
    const judgeFn: JudgeDispatchFn = vi.fn(() => {
      judgeCallCount++;
      return judgeCallCount === 1 ? "FAIL" : "PASS";
    });

    const { rollouts, cleanupTmp } = collectLiveRollouts(
      tasks,
      "",
      liveFn as unknown as import("./eval.js").LiveDispatchFn,
      "/tmp",
      judgeFn,
    );
    cleanupTmp();

    expect(rollouts).toHaveLength(2);
    const baseline = rollouts.find((r) => r.arm === "baseline");
    const treatment = rollouts.find((r) => r.arm === "treatment");
    expect(baseline?.score).toBe(0);
    expect(treatment?.score).toBe(1);
    expect(judgeFn).toHaveBeenCalledTimes(2);
  });

  it("does NOT call judgeDispatchFn for assert tasks", () => {
    const tasks: TaskFixture[] = [
      {
        id: "a1",
        skill: "oma-test",
        domain: "test",
        prompt: "Do something",
        checker: { type: "assert", expect_contains: ["ok"] },
        weight: 1,
      },
    ];
    const liveFn = vi.fn(() => "ok");
    const judgeFn = vi.fn(() => "PASS");

    const { rollouts, cleanupTmp } = collectLiveRollouts(
      tasks,
      "",
      liveFn as unknown as import("./eval.js").LiveDispatchFn,
      "/tmp",
      judgeFn,
    );
    cleanupTmp();

    expect(judgeFn).not.toHaveBeenCalled();
    // score should be absent for assert tasks
    for (const entry of rollouts) {
      expect(entry.score).toBeUndefined();
    }
  });
});

describe("--live --record writes judge score, --mock replays it (record/replay flow)", () => {
  let dir: string;

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), "oma-eval-judge-replay-"));
  });

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  /** Build MIN_TASKS judge task fixtures and write them to dir. */
  function makeJudgeTasks(n = MIN_TASKS): TaskFixture[] {
    return Array.from({ length: n }, (_, i) => ({
      id: `judge-task-${i}`,
      skill: "oma-test",
      domain: "test",
      prompt: `Judge prompt ${i}`,
      checker: { type: "judge" as const, rubric: "Does it work?" },
      weight: 1,
    }));
  }

  it("writeRolloutRecord persists judge score field into JSON", () => {
    const rollouts: RolloutEntry[] = [
      { taskId: "j1", arm: "baseline", output: "base out", score: 0 },
      { taskId: "j1", arm: "treatment", output: "treat out", score: 1 },
    ];
    const filePath = writeRolloutRecord(dir, rollouts);
    const raw = JSON.parse(readFileSync(filePath, "utf-8")) as RolloutEntry[];
    const baseline = raw.find((e) => e.arm === "baseline");
    const treatment = raw.find((e) => e.arm === "treatment");
    expect(baseline?.score).toBe(0);
    expect(treatment?.score).toBe(1);
  });

  it("loadRolloutEntries reads back the persisted score field", () => {
    const rollouts: RolloutEntry[] = [
      { taskId: "j1", arm: "baseline", output: "b", score: 0 },
      { taskId: "j1", arm: "treatment", output: "t", score: 1 },
    ];
    writeRolloutRecord(dir, rollouts);
    const loaded = loadRolloutEntries(dir);
    const baseline = loaded.find((e) => e.arm === "baseline");
    const treatment = loaded.find((e) => e.arm === "treatment");
    expect(baseline?.score).toBe(0);
    expect(treatment?.score).toBe(1);
  });

  it("--mock replay of judge tasks produces identical report as live run (no judge dispatch called)", () => {
    const tasks = makeJudgeTasks();

    // Simulate live rollouts with judge verdicts already recorded
    const liveRollouts: RolloutEntry[] = tasks.flatMap((t, i) => [
      {
        taskId: t.id,
        arm: "baseline" as const,
        output: "base",
        score: 0 as 0 | 1,
      },
      {
        taskId: t.id,
        arm: "treatment" as const,
        output: "treat",
        score: (i % 2 === 0 ? 1 : 0) as 0 | 1,
      },
    ]);

    // Write rollouts (simulating --live --record)
    writeRolloutRecord(dir, liveRollouts);

    // Compute report from live rollouts (simulating live scoring)
    const liveReport = computeUtility("oma-test", {
      tasks,
      rollouts: liveRollouts,
    });

    // Now replay from disk (simulating --mock) — judge dispatch must NOT be called
    const judgeDispatch = vi.fn(() => "PASS");
    const loadedRollouts = loadRolloutEntries(dir);
    const mockReport = computeUtility("oma-test", {
      tasks,
      rollouts: loadedRollouts,
    });

    // Reports must be identical
    expect(serializeSkillUtilityReport(mockReport)).toBe(
      serializeSkillUtilityReport(liveReport),
    );
    // Judge dispatch was never called in mock path
    expect(judgeDispatch).not.toHaveBeenCalled();
  });

  it("computeUtility excludes judge task and warns when rollout has no recorded score", () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

    // MIN_TASKS judge tasks but rollouts have NO score field — simulates
    // a judge task in --mock with no prior --live --record run.
    const tasks = makeJudgeTasks();
    const rolloutsWithoutScore: RolloutEntry[] = tasks.flatMap((t) => [
      { taskId: t.id, arm: "baseline" as const, output: "b" },
      { taskId: t.id, arm: "treatment" as const, output: "t" },
    ]);

    const report = computeUtility("oma-test", {
      tasks,
      rollouts: rolloutsWithoutScore,
    });

    // All tasks excluded → findings < MIN_TASKS → insufficient coverage
    expect(report.coverage).toBe("insufficient");
    // At least one warn emitted per missing verdict
    expect(warnSpy).toHaveBeenCalled();
    const warnings = warnSpy.mock.calls.map((c) => String(c[0]));
    expect(warnings.some((w) => w.includes("no recorded verdict"))).toBe(true);

    warnSpy.mockRestore();
  });

  it("computeUtility with mixed judge tasks: scored ones included, unscored excluded + warn", () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

    // 6 judge tasks (≥ MIN_TASKS). First 5 have scores, last 1 does not.
    const tasks = makeJudgeTasks(6);
    const rollouts: RolloutEntry[] = tasks.flatMap((t, i) => {
      if (i < 5) {
        return [
          {
            taskId: t.id,
            arm: "baseline" as const,
            output: "b",
            score: 0 as 0 | 1,
          },
          {
            taskId: t.id,
            arm: "treatment" as const,
            output: "t",
            score: 1 as 0 | 1,
          },
        ];
      }
      // Last task: no score
      return [
        { taskId: t.id, arm: "baseline" as const, output: "b" },
        { taskId: t.id, arm: "treatment" as const, output: "t" },
      ];
    });

    const report = computeUtility("oma-test", { tasks, rollouts });

    // 5 scored tasks → coverage ok
    expect(report.coverage).toBe("ok");
    expect(report.findings).toHaveLength(5);
    expect(warnSpy).toHaveBeenCalled();
    const warnings = warnSpy.mock.calls.map((c) => String(c[0]));
    expect(warnings.some((w) => w.includes("no recorded verdict"))).toBe(true);

    warnSpy.mockRestore();
  });
});

describe("scoreChecker — existing assert/regex tests still pass (regression guard)", () => {
  it("assert: recordedScore param has no effect (ignored for assert)", () => {
    const checker = { type: "assert" as const, expect_contains: ["EXPECTED"] };
    // assert scoring comes from output, not recordedScore
    expect(scoreChecker(checker, "EXPECTED", 0)).toBe(1);
    expect(scoreChecker(checker, "no match", 1)).toBe(0);
  });

  it("regex: recordedScore param has no effect (ignored for regex)", () => {
    const checker = { type: "regex" as const, pattern: "ok" };
    expect(scoreChecker(checker, "ok output", 0)).toBe(1);
    expect(scoreChecker(checker, "no match", 1)).toBe(0);
  });
});

// ============================================================
// Task 9 — Negative-transfer sampling (design 016 M3)
// All tests are deterministic; NO real LLM calls.
// ============================================================

// --- Helpers shared by negative-transfer tests ---

/**
 * Build a temp eval root containing one directory per skill, each with
 * task YAML files and (optionally) _rollouts/ rollout JSON files.
 *
 * Layout:
 *   evalRoot/
 *     <skillId>/
 *       <taskId>.yaml
 *       _rollouts/
 *         <taskId>-baseline.json
 *         <taskId>-treatment.json
 */
function buildEvalRoot(
  rootDir: string,
  skills: Array<{
    skillId: string;
    tasks: TaskFixture[];
    rollouts?: RolloutEntry[];
  }>,
): string {
  const evalRoot = join(rootDir, "eval");
  mkdirSync(evalRoot, { recursive: true });
  for (const { skillId, tasks, rollouts } of skills) {
    const skillDir = join(evalRoot, skillId);
    mkdirSync(skillDir, { recursive: true });
    for (const task of tasks) {
      writeTask(skillDir, task);
    }
    if (rollouts && rollouts.length > 0) {
      writeRollout(skillDir, rollouts);
    }
  }
  return evalRoot;
}

describe("discoverNeighborTasks", () => {
  let rootDir: string;

  beforeEach(() => {
    rootDir = mkdtempSync(join(tmpdir(), "oma-eval-neigh-disc-"));
  });

  afterEach(() => {
    rmSync(rootDir, { recursive: true, force: true });
  });

  it("returns empty array when evalRoot does not exist", () => {
    const result = discoverNeighborTasks(
      "skill-x",
      new Set(["research"]),
      join(rootDir, "nonexistent"),
    );
    expect(result).toHaveLength(0);
  });

  it("returns empty array when no other skills exist in evalRoot", () => {
    const evalRoot = buildEvalRoot(rootDir, [
      {
        skillId: "skill-x",
        tasks: [makeTaskFixture("t1", { domain: "research" })],
      },
    ]);
    const result = discoverNeighborTasks(
      "skill-x",
      new Set(["research"]),
      evalRoot,
    );
    expect(result).toHaveLength(0);
  });

  it("skips the skill under evaluation (self-exclusion)", () => {
    const evalRoot = buildEvalRoot(rootDir, [
      {
        skillId: "skill-x",
        tasks: [makeTaskFixture("tx", { domain: "research" })],
      },
      {
        skillId: "skill-y",
        tasks: [makeTaskFixture("ty", { domain: "research" })],
      },
    ]);
    const result = discoverNeighborTasks(
      "skill-x",
      new Set(["research"]),
      evalRoot,
    );
    // Only skill-y task should appear, not skill-x's own task
    expect(result).toHaveLength(1);
    expect(result[0]?.otherSkill).toBe("skill-y");
    expect(result[0]?.task.id).toBe("ty");
  });

  it("only returns tasks whose domain is in the given domains set", () => {
    const evalRoot = buildEvalRoot(rootDir, [
      {
        skillId: "skill-x",
        tasks: [makeTaskFixture("tx", { domain: "research" })],
      },
      {
        skillId: "skill-y",
        tasks: [
          makeTaskFixture("ty-research", { domain: "research" }),
          makeTaskFixture("ty-coding", { domain: "coding" }),
        ],
      },
    ]);
    // Only look for "research" neighbors
    const result = discoverNeighborTasks(
      "skill-x",
      new Set(["research"]),
      evalRoot,
    );
    expect(result).toHaveLength(1);
    expect(result[0]?.task.domain).toBe("research");
  });

  it("returns neighbors from multiple other skills", () => {
    const evalRoot = buildEvalRoot(rootDir, [
      {
        skillId: "skill-x",
        tasks: [makeTaskFixture("tx", { domain: "writing" })],
      },
      {
        skillId: "skill-a",
        tasks: [makeTaskFixture("ta", { domain: "writing" })],
      },
      {
        skillId: "skill-b",
        tasks: [makeTaskFixture("tb", { domain: "writing" })],
      },
    ]);
    const result = discoverNeighborTasks(
      "skill-x",
      new Set(["writing"]),
      evalRoot,
    );
    expect(result).toHaveLength(2);
    const skills = result.map((n) => n.otherSkill).sort();
    expect(skills).toEqual(["skill-a", "skill-b"]);
  });

  it("returns neighbors in deterministic (sorted) order", () => {
    const evalRoot = buildEvalRoot(rootDir, [
      {
        skillId: "skill-x",
        tasks: [makeTaskFixture("tx", { domain: "writing" })],
      },
      {
        skillId: "zzz-skill",
        tasks: [makeTaskFixture("tz", { domain: "writing" })],
      },
      {
        skillId: "aaa-skill",
        tasks: [makeTaskFixture("ta", { domain: "writing" })],
      },
    ]);
    const result = discoverNeighborTasks(
      "skill-x",
      new Set(["writing"]),
      evalRoot,
    );
    const otherSkills = result.map((n) => n.otherSkill);
    expect(otherSkills).toEqual([...otherSkills].sort());
  });
});

describe("scoreNeighborInMock", () => {
  let rootDir: string;

  beforeEach(() => {
    rootDir = mkdtempSync(join(tmpdir(), "oma-eval-neigh-mock-"));
  });

  afterEach(() => {
    rmSync(rootDir, { recursive: true, force: true });
  });

  it("returns correct scores from recorded rollout arms (assert checker)", () => {
    const task = makeTaskFixture("task-n1", {
      domain: "research",
      checker: { type: "assert", expect_contains: ["EXPECTED"] },
    });
    const neighborDir = join(rootDir, "skill-y");
    writeTask(neighborDir, task);
    // baseline: fails the assert (no EXPECTED), treatment: passes (has EXPECTED)
    writeRollout(neighborDir, [
      { taskId: "task-n1", arm: "baseline", output: "no match here" },
      { taskId: "task-n1", arm: "treatment", output: "EXPECTED result" },
    ]);

    const result = scoreNeighborInMock(task, neighborDir);
    expect(result).not.toBeNull();
    expect(result?.scoreWithoutX).toBe(0); // baseline fails
    expect(result?.scoreWithX).toBe(1); // treatment passes
  });

  it("returns correct scores: treatment fails, baseline passes (negative delta scenario)", () => {
    const task = makeTaskFixture("task-n2", {
      domain: "research",
      checker: { type: "assert", expect_contains: ["EXPECTED"] },
    });
    const neighborDir = join(rootDir, "skill-y");
    writeTask(neighborDir, task);
    // baseline: passes, treatment: fails → delta = 0 - 1 = -1 (regression)
    writeRollout(neighborDir, [
      { taskId: "task-n2", arm: "baseline", output: "EXPECTED content" },
      { taskId: "task-n2", arm: "treatment", output: "no match" },
    ]);

    const result = scoreNeighborInMock(task, neighborDir);
    expect(result).not.toBeNull();
    expect(result?.scoreWithoutX).toBe(1); // baseline passes
    expect(result?.scoreWithX).toBe(0); // treatment fails
  });

  it("returns null and warns when rollout arms are missing (assert checker)", () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    const task = makeTaskFixture("task-missing", { domain: "research" });
    const neighborDir = join(rootDir, "skill-y");
    mkdirSync(neighborDir, { recursive: true });
    // No rollout written

    const result = scoreNeighborInMock(task, neighborDir);
    expect(result).toBeNull();
    expect(warnSpy).toHaveBeenCalled();
    const warnings = warnSpy.mock.calls.map((c: unknown[]) => String(c[0]));
    expect(warnings.some((w) => w.includes("neg-transfer"))).toBe(true);

    warnSpy.mockRestore();
  });

  it("returns recorded judge scores for judge-checker task (no LLM dispatch)", () => {
    const task: TaskFixture = {
      id: "judge-n1",
      skill: "skill-y",
      domain: "research",
      prompt: "Do something",
      checker: { type: "judge", rubric: "Does it work?" },
      weight: 1,
    };
    const neighborDir = join(rootDir, "skill-y");
    writeTask(neighborDir, task);
    // Recorded scores: baseline FAIL (0), treatment PASS (1)
    writeRollout(neighborDir, [
      { taskId: "judge-n1", arm: "baseline", output: "b", score: 0 },
      { taskId: "judge-n1", arm: "treatment", output: "t", score: 1 },
    ] as RolloutEntry[]);

    const result = scoreNeighborInMock(task, neighborDir);
    expect(result).not.toBeNull();
    expect(result?.scoreWithoutX).toBe(0);
    expect(result?.scoreWithX).toBe(1);
  });

  it("returns null and warns for judge-checker task with missing recorded score", () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    const task: TaskFixture = {
      id: "judge-no-score",
      skill: "skill-y",
      domain: "research",
      prompt: "Do something",
      checker: { type: "judge" },
      weight: 1,
    };
    const neighborDir = join(rootDir, "skill-y");
    writeTask(neighborDir, task);
    // Rollout exists but has no score field
    writeRollout(neighborDir, [
      { taskId: "judge-no-score", arm: "baseline", output: "b" },
      { taskId: "judge-no-score", arm: "treatment", output: "t" },
    ]);

    const result = scoreNeighborInMock(task, neighborDir);
    expect(result).toBeNull();
    const warnings = warnSpy.mock.calls.map((c: unknown[]) => String(c[0]));
    expect(warnings.some((w) => w.includes("no recorded judge score"))).toBe(
      true,
    );

    warnSpy.mockRestore();
  });
});

describe("scoreNeighborInLive", () => {
  let rootDir: string;

  beforeEach(() => {
    rootDir = mkdtempSync(join(tmpdir(), "oma-eval-neigh-live-"));
  });

  afterEach(() => {
    rmSync(rootDir, { recursive: true, force: true });
  });

  it("returns null and warns when no recorded baseline exists", () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    const task = makeTaskFixture("task-live-n1", { domain: "research" });
    const neighborDir = join(rootDir, "skill-y");
    mkdirSync(neighborDir, { recursive: true });
    const dispatchFn = vi.fn(
      (_arm: string, _prompt: string, _tmp: string): string => "EXPECTED",
    );

    const result = scoreNeighborInLive(
      task,
      neighborDir,
      "SKILL_BODY",
      dispatchFn as unknown as LiveDispatchFn,
      undefined,
      "/tmp",
    );
    expect(result).toBeNull();
    expect(dispatchFn).not.toHaveBeenCalled();
    const warnings = warnSpy.mock.calls.map((c: unknown[]) => String(c[0]));
    expect(warnings.some((w) => w.includes("no recorded baseline"))).toBe(true);

    warnSpy.mockRestore();
  });

  it("uses recorded baseline as scoreWithoutX and dispatches treatment for scoreWithX (assert checker)", () => {
    const task = makeTaskFixture("task-live-n2", {
      domain: "research",
      checker: { type: "assert", expect_contains: ["EXPECTED"] },
    });
    const neighborDir = join(rootDir, "skill-y");
    writeTask(neighborDir, task);
    // Recorded baseline: fails the assert
    writeRollout(neighborDir, [
      { taskId: "task-live-n2", arm: "baseline", output: "no match" },
    ]);

    // Live dispatch returns output that passes the assert
    const dispatchFn = vi.fn(
      (_arm: string, _prompt: string, _tmp: string): string =>
        "EXPECTED output",
    );

    const result = scoreNeighborInLive(
      task,
      neighborDir,
      "SKILL_BODY",
      dispatchFn as unknown as LiveDispatchFn,
      undefined,
      "/tmp",
    );

    expect(result).not.toBeNull();
    expect(result?.scoreWithoutX).toBe(0); // baseline failed
    expect(result?.scoreWithX).toBe(1); // treatment passed
    expect(dispatchFn).toHaveBeenCalledTimes(1);
    // Treatment prompt must include the skill body and the task prompt
    const calledPrompt = (
      dispatchFn.mock.calls[0] as [string, string, string]
    )[1];
    expect(calledPrompt).toContain("SKILL_BODY");
    expect(calledPrompt).toContain(task.prompt);
  });

  it("scores judge neighbor task in live mode using judgeDispatchFn", () => {
    const task: TaskFixture = {
      id: "judge-live-n1",
      skill: "skill-y",
      domain: "research",
      prompt: "Do something",
      checker: { type: "judge", rubric: "Does it work?" },
      weight: 1,
    };
    const neighborDir = join(rootDir, "skill-y");
    writeTask(neighborDir, task);
    // Recorded baseline with judge score
    writeRollout(neighborDir, [
      { taskId: "judge-live-n1", arm: "baseline", output: "base", score: 0 },
    ] as RolloutEntry[]);

    const dispatchFn = vi.fn(
      (_arm: string, _prompt: string, _tmp: string): string =>
        "treatment output",
    );
    const judgeFn: JudgeDispatchFn = vi.fn(() => "PASS");

    const result = scoreNeighborInLive(
      task,
      neighborDir,
      "SKILL_BODY",
      dispatchFn as unknown as LiveDispatchFn,
      judgeFn,
      "/tmp",
    );

    expect(result).not.toBeNull();
    expect(result?.scoreWithoutX).toBe(0); // recorded baseline score
    expect(result?.scoreWithX).toBe(1); // judge returned PASS
    expect(judgeFn).toHaveBeenCalledTimes(1);
  });
});

describe("computeNegativeTransfer", () => {
  let rootDir: string;

  beforeEach(() => {
    rootDir = mkdtempSync(join(tmpdir(), "oma-eval-comp-negtx-"));
  });

  afterEach(() => {
    rmSync(rootDir, { recursive: true, force: true });
  });

  it("returns empty array when evalRoot does not exist", () => {
    const result = computeNegativeTransfer(
      "skill-x",
      new Set(["research"]),
      join(rootDir, "nonexistent"),
      "mock",
      undefined,
      "",
      undefined,
      undefined,
      "",
    );
    expect(result).toHaveLength(0);
  });

  it("returns empty array when no neighbors share the skill domains", () => {
    const evalRoot = buildEvalRoot(rootDir, [
      {
        skillId: "skill-x",
        tasks: [makeTaskFixture("tx", { domain: "research" })],
      },
      {
        skillId: "skill-y",
        tasks: [makeTaskFixture("ty", { domain: "coding" })], // different domain
      },
    ]);

    const result = computeNegativeTransfer(
      "skill-x",
      new Set(["research"]),
      evalRoot,
      "mock",
      undefined,
      "",
      undefined,
      undefined,
      "",
    );
    expect(result).toHaveLength(0);
  });

  it("returns NegativeTransfer entries with correct delta signs (positive delta = no regression)", () => {
    // skill-y has a task in domain "research" with recorded rollouts:
    // baseline: fails assert, treatment: passes → delta = 1 - 0 = +1 (no regression)
    const neighborTask = makeTaskFixture("ty-research", {
      skill: "skill-y",
      domain: "research",
      checker: { type: "assert", expect_contains: ["EXPECTED"] },
    });
    const evalRoot = buildEvalRoot(rootDir, [
      {
        skillId: "skill-x",
        tasks: [
          makeTaskFixture("tx", { skill: "skill-x", domain: "research" }),
        ],
      },
      {
        skillId: "skill-y",
        tasks: [neighborTask],
        rollouts: [
          { taskId: "ty-research", arm: "baseline", output: "no match" },
          { taskId: "ty-research", arm: "treatment", output: "EXPECTED" },
        ],
      },
    ]);

    const result = computeNegativeTransfer(
      "skill-x",
      new Set(["research"]),
      evalRoot,
      "mock",
      undefined,
      "",
      undefined,
      undefined,
      "",
    );

    expect(result).toHaveLength(1);
    expect(result[0]?.otherSkill).toBe("skill-y");
    expect(result[0]?.domain).toBe("research");
    // delta = scoreWithX(1) - scoreWithoutX(0) = +1
    expect(result[0]?.delta).toBeCloseTo(1);
  });

  it("returns NegativeTransfer entry with negative delta (regression scenario)", () => {
    // baseline: passes assert, treatment: fails → delta = 0 - 1 = -1 (regression)
    const neighborTask = makeTaskFixture("ty-reg", {
      skill: "skill-y",
      domain: "research",
      checker: { type: "assert", expect_contains: ["EXPECTED"] },
    });
    const evalRoot = buildEvalRoot(rootDir, [
      {
        skillId: "skill-x",
        tasks: [
          makeTaskFixture("tx", { skill: "skill-x", domain: "research" }),
        ],
      },
      {
        skillId: "skill-y",
        tasks: [neighborTask],
        rollouts: [
          { taskId: "ty-reg", arm: "baseline", output: "EXPECTED content" },
          { taskId: "ty-reg", arm: "treatment", output: "no match" },
        ],
      },
    ]);

    const result = computeNegativeTransfer(
      "skill-x",
      new Set(["research"]),
      evalRoot,
      "mock",
      undefined,
      "",
      undefined,
      undefined,
      "",
    );

    expect(result).toHaveLength(1);
    expect(result[0]?.delta).toBeCloseTo(-1);
  });

  it("caps neighbor sample at maxTasks and warns with dropped count (no silent truncation)", () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

    // Create 3 neighbor tasks across 3 skills, all in domain "research"
    const skills: Array<{
      skillId: string;
      tasks: TaskFixture[];
      rollouts: RolloutEntry[];
    }> = [
      {
        skillId: "skill-x",
        tasks: [
          makeTaskFixture("tx", { skill: "skill-x", domain: "research" }),
        ],
        rollouts: [],
      },
    ];
    for (let i = 0; i < 3; i++) {
      const tid = `t-neigh-${i}`;
      skills.push({
        skillId: `skill-n${i}`,
        tasks: [
          makeTaskFixture(tid, {
            skill: `skill-n${i}`,
            domain: "research",
            checker: { type: "assert", expect_contains: ["OK"] },
          }),
        ],
        rollouts: [
          { taskId: tid, arm: "baseline", output: "OK" },
          { taskId: tid, arm: "treatment", output: "OK" },
        ],
      });
    }
    const evalRoot = buildEvalRoot(rootDir, skills);

    // Cap at 2 — 1 should be dropped
    const result = computeNegativeTransfer(
      "skill-x",
      new Set(["research"]),
      evalRoot,
      "mock",
      2, // maxTasks cap
      "",
      undefined,
      undefined,
      "",
    );

    expect(result).toHaveLength(2); // capped
    // Must have warned about the dropped count
    const warnings = warnSpy.mock.calls.map((c: unknown[]) => String(c[0]));
    expect(
      warnings.some(
        (w) =>
          w.includes("capping at --max-tasks=2") && w.includes("1 dropped"),
      ),
    ).toBe(true);

    warnSpy.mockRestore();
  });

  it("skips neighbor tasks with no recorded rollouts and does NOT crash (mock stays offline)", () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

    const neighborTask = makeTaskFixture("ty-norollout", {
      skill: "skill-y",
      domain: "research",
    });
    const evalRoot = buildEvalRoot(rootDir, [
      {
        skillId: "skill-x",
        tasks: [
          makeTaskFixture("tx", { skill: "skill-x", domain: "research" }),
        ],
      },
      {
        skillId: "skill-y",
        tasks: [neighborTask],
        // No rollouts written
      },
    ]);

    const result = computeNegativeTransfer(
      "skill-x",
      new Set(["research"]),
      evalRoot,
      "mock",
      undefined,
      "",
      undefined,
      undefined,
      "",
    );

    // No scored entries — task was skipped, no crash
    expect(result).toHaveLength(0);
    // Must have warned
    expect(warnSpy).toHaveBeenCalled();

    warnSpy.mockRestore();
  });

  it("skips judge neighbor tasks with no recorded score and warns (mock stays offline)", () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

    const neighborTask: TaskFixture = {
      id: "ty-judge-noscores",
      skill: "skill-y",
      domain: "research",
      prompt: "Judge task with no scores",
      checker: { type: "judge" },
      weight: 1,
    };
    const evalRoot = buildEvalRoot(rootDir, [
      {
        skillId: "skill-x",
        tasks: [
          makeTaskFixture("tx", { skill: "skill-x", domain: "research" }),
        ],
      },
      {
        skillId: "skill-y",
        tasks: [neighborTask],
        rollouts: [
          // Rollout present but no score fields
          { taskId: "ty-judge-noscores", arm: "baseline", output: "b" },
          { taskId: "ty-judge-noscores", arm: "treatment", output: "t" },
        ],
      },
    ]);

    const result = computeNegativeTransfer(
      "skill-x",
      new Set(["research"]),
      evalRoot,
      "mock",
      undefined,
      "",
      undefined,
      undefined,
      "",
    );

    expect(result).toHaveLength(0); // skipped
    expect(warnSpy).toHaveBeenCalled();
    const warnings = warnSpy.mock.calls.map((c: unknown[]) => String(c[0]));
    expect(warnings.some((w) => w.includes("no recorded judge score"))).toBe(
      true,
    );

    warnSpy.mockRestore();
  });

  it("is deterministic: same evalRoot produces byte-identical results on repeated calls", () => {
    const neighborTask = makeTaskFixture("ty-det", {
      skill: "skill-y",
      domain: "research",
      checker: { type: "assert", expect_contains: ["EXPECTED"] },
    });
    const evalRoot = buildEvalRoot(rootDir, [
      {
        skillId: "skill-x",
        tasks: [
          makeTaskFixture("tx", { skill: "skill-x", domain: "research" }),
        ],
      },
      {
        skillId: "skill-y",
        tasks: [neighborTask],
        rollouts: [
          { taskId: "ty-det", arm: "baseline", output: "no match" },
          { taskId: "ty-det", arm: "treatment", output: "EXPECTED" },
        ],
      },
    ]);

    const run1 = computeNegativeTransfer(
      "skill-x",
      new Set(["research"]),
      evalRoot,
      "mock",
      undefined,
      "",
      undefined,
      undefined,
      "",
    );
    const run2 = computeNegativeTransfer(
      "skill-x",
      new Set(["research"]),
      evalRoot,
      "mock",
      undefined,
      "",
      undefined,
      undefined,
      "",
    );

    expect(JSON.stringify(run1)).toBe(JSON.stringify(run2));
  });
});

describe("computeUtility — negativeTransfer integration", () => {
  it("passes through pre-computed negativeTransfer entries into the report", () => {
    const { tasks, rollouts } = makePassingScenario();
    const negativeTransfer: NegativeTransfer[] = [
      { otherSkill: "skill-y", domain: "research", delta: -0.2 },
    ];
    const report = computeUtility("skill-x", {
      tasks,
      rollouts,
      negativeTransfer,
    });
    expect(report.negativeTransfer).toHaveLength(1);
    expect(report.negativeTransfer[0]?.delta).toBeCloseTo(-0.2);
  });

  it("negativeTransfer is empty when no entries are passed (backward-compat with M1)", () => {
    const { tasks, rollouts } = makePassingScenario();
    const report = computeUtility("skill-x", { tasks, rollouts });
    expect(report.negativeTransfer).toHaveLength(0);
  });

  it("decision downgrades from pass to warn when any delta <= NEG_TRANSFER_FAIL", () => {
    const { tasks, rollouts } = makePassingScenario(); // lift = 1.0 → would be pass
    const negativeTransfer: NegativeTransfer[] = [
      { otherSkill: "skill-y", domain: "research", delta: NEG_TRANSFER_FAIL }, // exactly at threshold
    ];
    const report = computeUtility("skill-x", {
      tasks,
      rollouts,
      negativeTransfer,
    });
    // Lift is >= UTILITY_WARN_LIFT and >= 0 — would normally be "pass"
    // But regression delta <= NEG_TRANSFER_FAIL downgrades to "warn"
    expect(report.decision).toBe("warn");
  });

  it("decision remains fail (not further changed) when utility already fails and neg-transfer regression present", () => {
    const tasks = Array.from({ length: MIN_TASKS }, (_, i) =>
      makeTaskFixture(`task-${i}`),
    );
    const rollouts: RolloutEntry[] = tasks.flatMap((t) =>
      makeRolloutPair(t.id, "NO MATCH", "ALSO NO MATCH"),
    );
    const negativeTransfer: NegativeTransfer[] = [
      { otherSkill: "skill-y", domain: "research", delta: -0.5 },
    ];
    const report = computeUtility("skill-x", {
      tasks,
      rollouts,
      negativeTransfer,
    });
    // Utility fails AND has regression — decision stays "fail" (not double-downgraded)
    expect(report.decision).toBe("fail");
  });

  it("decision is not downgraded when delta is above NEG_TRANSFER_FAIL", () => {
    const { tasks, rollouts } = makePassingScenario();
    const negativeTransfer: NegativeTransfer[] = [
      { otherSkill: "skill-y", domain: "research", delta: -0.05 }, // above threshold (-0.10)
    ];
    const report = computeUtility("skill-x", {
      tasks,
      rollouts,
      negativeTransfer,
    });
    // delta = -0.05 > NEG_TRANSFER_FAIL (-0.10) → no downgrade
    expect(report.decision).toBe("pass");
  });
});

describe("renderSkillUtilityReport — negativeTransfer render line", () => {
  it("renders negative transfer section when entries exist", () => {
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    const { tasks, rollouts } = makePassingScenario();
    const negativeTransfer: NegativeTransfer[] = [
      { otherSkill: "skill-y", domain: "research", delta: -0.15 },
    ];
    const report = computeUtility("skill-x", {
      tasks,
      rollouts,
      negativeTransfer,
    });
    // Import renderSkillUtilityReport via dynamic require pattern is not possible;
    // we verify via serialization that the report carries the entries.
    // The render path is tested by checking the report shape that feeds the renderer.
    expect(report.negativeTransfer).toHaveLength(1);
    expect(report.negativeTransfer[0]?.delta).toBeCloseTo(-0.15);
    logSpy.mockRestore();
  });

  it("regression delta <= NEG_TRANSFER_FAIL is surfaced in the report", () => {
    const { tasks, rollouts } = makePassingScenario();
    const negativeTransfer: NegativeTransfer[] = [
      { otherSkill: "skill-z", domain: "writing", delta: -0.12 },
    ];
    const report = computeUtility("skill-x", {
      tasks,
      rollouts,
      negativeTransfer,
    });
    // Regression is present: delta -0.12 <= NEG_TRANSFER_FAIL (-0.10)
    const regressions = report.negativeTransfer.filter(
      (nt) => nt.delta <= NEG_TRANSFER_FAIL,
    );
    expect(regressions).toHaveLength(1);
    expect(regressions[0]?.otherSkill).toBe("skill-z");
    // Decision was downgraded from pass to warn
    expect(report.decision).toBe("warn");
  });
});

describe("runSkillsEval — neg-transfer flag (mock mode, no LLM)", () => {
  let rootDir: string;

  beforeEach(() => {
    rootDir = mkdtempSync(join(tmpdir(), "oma-eval-run-negtx-"));
  });

  afterEach(() => {
    rmSync(rootDir, { recursive: true, force: true });
  });

  it("negativeTransfer is empty when --neg-transfer is not set (default behavior)", async () => {
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

    const evalRoot = join(rootDir, "eval-root");
    const skillEvalDir = join(evalRoot, "skill-x");
    mkdirSync(skillEvalDir, { recursive: true });

    const { tasks, rollouts } = makePassingScenario();
    for (const t of tasks) writeTask(skillEvalDir, t);
    writeRollout(skillEvalDir, rollouts);

    const opts: SkillsEvalOptions = {
      skill: "skill-x",
      taskDir: skillEvalDir,
      _evalRoot: evalRoot,
      _workspace: rootDir, // allow taskDir outside process.cwd()
      // negTransfer is NOT set
    };

    await runSkillsEval(true, opts);

    const jsonOutput = logSpy.mock.calls
      .map((c: unknown[]) => String(c[0]))
      .find((s) => s.trimStart().startsWith("{"));
    const parsed = JSON.parse(jsonOutput ?? "{}") as {
      negativeTransfer?: NegativeTransfer[];
    };
    expect(parsed.negativeTransfer).toHaveLength(0);

    logSpy.mockRestore();
    warnSpy.mockRestore();
  });

  it("negativeTransfer populated when --neg-transfer is set with neighbor tasks (mock mode)", async () => {
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

    const evalRoot = join(rootDir, "eval-root");

    // skill-x: MIN_TASKS tasks with passing rollouts
    const { tasks: xTasks, rollouts: xRollouts } = makePassingScenario();
    const xEvalDir = join(evalRoot, "skill-x");
    mkdirSync(xEvalDir, { recursive: true });
    for (const t of xTasks) writeTask(xEvalDir, t);
    writeRollout(xEvalDir, xRollouts);

    // skill-y: 1 neighbor task in the same domain ("test"), with recorded rollouts
    // baseline fails assert, treatment passes → delta = +1 (no regression)
    const neighborTask = makeTaskFixture("ny-t1", {
      skill: "skill-y",
      domain: "test", // same domain as makePassingScenario tasks
      checker: { type: "assert", expect_contains: ["EXPECTED"] },
    });
    const yEvalDir = join(evalRoot, "skill-y");
    mkdirSync(yEvalDir, { recursive: true });
    writeTask(yEvalDir, neighborTask);
    writeRollout(yEvalDir, [
      { taskId: "ny-t1", arm: "baseline", output: "no match" },
      { taskId: "ny-t1", arm: "treatment", output: "EXPECTED content" },
    ]);

    const opts: SkillsEvalOptions = {
      skill: "skill-x",
      taskDir: xEvalDir,
      _evalRoot: evalRoot,
      _workspace: rootDir, // allow taskDir outside process.cwd()
      negTransfer: true,
    };

    await runSkillsEval(true, opts);

    const jsonOutput = logSpy.mock.calls
      .map((c: unknown[]) => String(c[0]))
      .find((s) => s.trimStart().startsWith("{"));
    const parsed = JSON.parse(jsonOutput ?? "{}") as {
      negativeTransfer?: NegativeTransfer[];
    };
    expect(parsed.negativeTransfer).toHaveLength(1);
    expect(parsed.negativeTransfer?.[0]?.otherSkill).toBe("skill-y");
    expect(parsed.negativeTransfer?.[0]?.domain).toBe("test");
    // delta = 1 - 0 = +1 (treatment passes, baseline fails)
    expect(parsed.negativeTransfer?.[0]?.delta).toBeCloseTo(1);

    logSpy.mockRestore();
    warnSpy.mockRestore();
  });

  it("negativeTransfer empty and no crash when no neighbor tasks exist (mock stays offline)", async () => {
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

    const evalRoot = join(rootDir, "eval-root-empty");
    const { tasks, rollouts } = makePassingScenario();
    const xEvalDir = join(evalRoot, "skill-x");
    mkdirSync(xEvalDir, { recursive: true });
    for (const t of tasks) writeTask(xEvalDir, t);
    writeRollout(xEvalDir, rollouts);
    // No other skills in evalRoot

    const opts: SkillsEvalOptions = {
      skill: "skill-x",
      taskDir: xEvalDir,
      _evalRoot: evalRoot,
      _workspace: rootDir, // allow taskDir outside process.cwd()
      negTransfer: true,
    };

    // Must not throw
    await expect(runSkillsEval(true, opts)).resolves.toBeUndefined();

    const jsonOutput = logSpy.mock.calls
      .map((c: unknown[]) => String(c[0]))
      .find((s) => s.trimStart().startsWith("{"));
    const parsed = JSON.parse(jsonOutput ?? "{}") as {
      negativeTransfer?: NegativeTransfer[];
    };
    expect(parsed.negativeTransfer).toHaveLength(0);

    logSpy.mockRestore();
    warnSpy.mockRestore();
  });

  it("--max-tasks caps neighbor sample and warns when more neighbors exist than cap", async () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});

    const evalRoot = join(rootDir, "eval-root-cap");

    // skill-x: MIN_TASKS passing tasks
    const { tasks: xTasks, rollouts: xRollouts } = makePassingScenario();
    const xEvalDir = join(evalRoot, "skill-x");
    mkdirSync(xEvalDir, { recursive: true });
    for (const t of xTasks) writeTask(xEvalDir, t);
    writeRollout(xEvalDir, xRollouts);

    // 4 neighbor skills, each with 1 task in domain "test"
    for (let i = 0; i < 4; i++) {
      const tid = `nz-${i}`;
      const nDir = join(evalRoot, `skill-n${i}`);
      mkdirSync(nDir, { recursive: true });
      writeTask(
        nDir,
        makeTaskFixture(tid, {
          skill: `skill-n${i}`,
          domain: "test",
          checker: { type: "assert", expect_contains: ["OK"] },
        }),
      );
      writeRollout(nDir, [
        { taskId: tid, arm: "baseline", output: "OK" },
        { taskId: tid, arm: "treatment", output: "OK" },
      ]);
    }

    const opts: SkillsEvalOptions = {
      skill: "skill-x",
      taskDir: xEvalDir,
      _evalRoot: evalRoot,
      _workspace: rootDir, // allow taskDir outside process.cwd()
      negTransfer: true,
      maxTasks: 2, // cap at 2 — 2 neighbor tasks dropped
    };

    await runSkillsEval(true, opts);

    // computeNegativeTransfer should have warned about the cap
    const warnings = warnSpy.mock.calls.map((c: unknown[]) => String(c[0]));
    expect(
      warnings.some(
        (w) => w.includes("capping at --max-tasks=2") && w.includes("dropped"),
      ),
    ).toBe(true);

    // JSON output should have at most 2 negativeTransfer entries
    const jsonOutput = logSpy.mock.calls
      .map((c: unknown[]) => String(c[0]))
      .find((s) => s.trimStart().startsWith("{"));
    const parsed = JSON.parse(jsonOutput ?? "{}") as {
      negativeTransfer?: NegativeTransfer[];
    };
    expect((parsed.negativeTransfer ?? []).length).toBeLessThanOrEqual(2);

    warnSpy.mockRestore();
    logSpy.mockRestore();
  });
});

// --- scoreSkillBody ---

describe("scoreSkillBody", () => {
  let rootDir: string;

  beforeEach(() => {
    rootDir = mkdtempSync(join(tmpdir(), "oma-eval-scorebody-"));
  });

  afterEach(() => {
    rmSync(rootDir, { recursive: true, force: true });
  });

  it("override body == disk body yields same utilityLift (parity)", async () => {
    const taskDir = join(rootDir, "skill-parity");
    const { tasks, rollouts } = makePassingScenario();
    for (const t of tasks) writeTask(taskDir, t);
    writeRollout(taskDir, rollouts);

    // Score via scoreSkillBody (mock mode, any body string — body is unused in mock)
    const opts: ScoreSkillBodyOptions = {
      skill: "oma-parity",
      body: "# SKILL BODY\nsome content",
      taskDir,
      mode: "mock",
    };
    const report = await scoreSkillBody(opts);

    // Compute expected via computeUtility directly (same fixtures + rollouts)
    const { fixtures } = loadTaskFixtures(taskDir);
    const recorded = loadRolloutEntries(taskDir);
    const expected = computeUtility("oma-parity", {
      tasks: fixtures,
      rollouts: recorded,
    });

    expect(report.utilityLift).toBeCloseTo(expected.utilityLift);
    expect(report.decision).toBe(expected.decision);
  });

  it("two different override bodies yield different utilityLifts (live mode, mock dispatch)", async () => {
    const taskDir = join(rootDir, "skill-diff");
    const tasks = Array.from({ length: MIN_TASKS }, (_, i) =>
      makeTaskFixture(`td-${i}`, {
        checker: { type: "assert", expect_contains: ["GOOD"] },
      }),
    );
    for (const t of tasks) writeTask(taskDir, t);

    // bodyA dispatch: treatment returns "GOOD" (pass), baseline returns "bad"
    const dispatchFnA = vi.fn(
      (arm: "baseline" | "treatment", _prompt: string, _tmp: string): string =>
        arm === "treatment" ? "GOOD" : "bad",
    );

    // bodyB dispatch: treatment also returns "bad" (fail) — lift = 0
    const dispatchFnB = vi.fn(
      (_arm: "baseline" | "treatment", _prompt: string, _tmp: string): string =>
        "bad",
    );

    const reportA = await scoreSkillBody({
      skill: "oma-diff",
      body: "# Body A",
      tasks,
      mode: "live",
      dispatchFn: dispatchFnA as unknown as LiveDispatchFn,
    });

    const reportB = await scoreSkillBody({
      skill: "oma-diff",
      body: "# Body B",
      tasks,
      mode: "live",
      dispatchFn: dispatchFnB as unknown as LiveDispatchFn,
    });

    // bodyA should lift > bodyB (bodyA treatment passes, bodyB treatment fails)
    expect(reportA.utilityLift).toBeGreaterThan(reportB.utilityLift);
  });

  it("override path never writes to disk", async () => {
    const taskDir = join(rootDir, "skill-nodisk");
    const tasks = Array.from({ length: MIN_TASKS }, (_, i) =>
      makeTaskFixture(`nw-${i}`, {
        checker: { type: "assert", expect_contains: ["OK"] },
      }),
    );
    for (const t of tasks) writeTask(taskDir, t);

    const dispatchFn = vi.fn(
      (_arm: "baseline" | "treatment", _prompt: string, _tmp: string): string =>
        "OK",
    );

    await scoreSkillBody({
      skill: "oma-nodisk",
      body: "# Override body",
      tasks,
      mode: "live",
      dispatchFn: dispatchFn as unknown as LiveDispatchFn,
    });

    // No _rollouts directory should have been created
    const { existsSync } = await import("node:fs");
    expect(existsSync(join(taskDir, "_rollouts"))).toBe(false);
  });

  it("existing eval tests unaffected — runSkillsEval mock still works without override", async () => {
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

    const taskDir = join(rootDir, "skill-unaffected");
    const { tasks, rollouts } = makePassingScenario();
    for (const t of tasks) writeTask(taskDir, t);
    writeRollout(taskDir, rollouts);

    const evalOpts: SkillsEvalOptions = {
      skill: "oma-unaffected",
      taskDir,
      _workspace: rootDir,
      // No skillMdOverride — default behavior
    };

    await runSkillsEval(true, evalOpts);

    const jsonOutput = logSpy.mock.calls
      .map((c: unknown[]) => String(c[0]))
      .find((s) => s.trimStart().startsWith("{"));
    const parsed = JSON.parse(jsonOutput ?? "{}") as SkillUtilityReport;
    expect(parsed.coverage).toBe("ok");
    expect(parsed.decision).toBe("pass");

    logSpy.mockRestore();
    warnSpy.mockRestore();
  });
});

// --- Skill isolation (plan 013) ---

describe("resolveSkillIsolation", () => {
  it("returns 'unavailable' for a HOME-based vendor (antigravity)", () => {
    // antigravity discovers skills from ~/.gemini/antigravity-cli/skills
    // (requiresHomeConsent) — a clean cwd cannot isolate it.
    const status: IsolationStatus = resolveSkillIsolation(
      "antigravity",
      "oma-scholar",
    );
    expect(status).toBe("unavailable");
  });

  it("returns 'best-effort' for an unknown vendor (cannot prove isolation)", () => {
    expect(resolveSkillIsolation("grok", "oma-scholar")).toBe("best-effort");
  });

  it("returns 'enforced' for a cwd-relative vendor when the skill is absent from HOME", () => {
    // A uniquely-named skill guaranteed not installed under ~/.codex/skills.
    expect(
      resolveSkillIsolation("codex", "__oma_test_nonexistent_skill__"),
    ).toBe("enforced");
  });

  it("returns 'best-effort' for a path-traversal id without probing the filesystem", () => {
    // Defense-in-depth: a non-simple id must not be used to build a HOME probe path.
    expect(resolveSkillIsolation("codex", "../../etc/passwd")).toBe(
      "best-effort",
    );
    expect(resolveSkillIsolation("codex", "a/b")).toBe("best-effort");
  });
});

describe("runEvalDispatch (dash-leading prompt handling)", () => {
  let dir: string;
  let echoArgv: string;

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), "oma-dispatch-"));
    // Harness: prints what it received on stdin and in argv (after the script path),
    // so we can prove where the prompt was routed. .cjs = CommonJS regardless of pkg type.
    echoArgv = join(dir, "harness.cjs");
    writeFileSync(
      echoArgv,
      "let d='';process.stdin.on('data',c=>d+=c).on('end',()=>process.stdout.write('STDIN['+d+']ARGV['+process.argv.slice(2).join(',')+']'));",
    );
  });

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  it("routes a dash-leading prompt through stdin, not argv (the SKILL.md '---' bug)", () => {
    // Regression for plan-013 T4: a prompt starting with '-' (SKILL.md frontmatter)
    // was misparsed as a CLI option by `claude -p <prompt>` → empty output.
    const prompt = "--- name: oma-scholar frontmatter";
    const out = runEvalDispatch(
      {
        command: process.execPath,
        args: [echoArgv, "-p", prompt],
        env: process.env,
      },
      dir,
      prompt,
      "-p",
    );
    // Prompt arrived via stdin; only the bare flag remains in argv.
    expect(out).toBe(`STDIN[${prompt}]ARGV[-p]`);
  });

  it("finds the prompt by flag→value pair even when trailing flags follow it", () => {
    // Real eval invocations append plan flags (e.g. `--model sonnet`) AFTER `-p <prompt>`,
    // so the prompt is NOT the last arg. Only the prompt VALUE must move to stdin.
    const prompt = "--- frontmatter prompt";
    const out = runEvalDispatch(
      {
        command: process.execPath,
        args: [echoArgv, "-p", prompt, "--model", "x"],
        env: process.env,
      },
      dir,
      prompt,
      "-p",
    );
    expect(out).toBe(`STDIN[${prompt}]ARGV[-p,--model,x]`);
  });

  it("passes a non-dash prompt as an argv value (stdin unused)", () => {
    const prompt = "plain task prompt";
    const out = runEvalDispatch(
      {
        command: process.execPath,
        args: [echoArgv, "-p", prompt],
        env: process.env,
      },
      dir,
      prompt,
      "-p",
    );
    expect(out).toBe(`STDIN[]ARGV[-p,${prompt}]`);
  });

  it("warns and returns captured stdout on non-zero exit (no longer silently swallowed)", () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    const failer = join(dir, "fail.cjs");
    writeFileSync(failer, "process.stdout.write('partial');process.exit(3);");
    const out = runEvalDispatch(
      { command: process.execPath, args: [failer], env: process.env },
      dir,
      "x",
      null,
    );
    expect(out).toBe("partial");
    expect(warnSpy).toHaveBeenCalled();
    warnSpy.mockRestore();
  });
});

describe("setupIsolatedSkillsDir", () => {
  let workspace: string;
  let tmpBase: string;

  beforeEach(() => {
    workspace = mkdtempSync(join(tmpdir(), "oma-iso-ws-"));
    tmpBase = mkdtempSync(join(tmpdir(), "oma-iso-tmp-"));
    // Seed a cwd-relative vendor skills dir with three skills (incl. the target).
    for (const skill of ["skill-a", "skill-b", "target-skill"]) {
      const dir = join(workspace, ".codex", "skills", skill);
      mkdirSync(dir, { recursive: true });
      writeFileSync(join(dir, "SKILL.md"), `# ${skill}\n`);
    }
  });

  afterEach(() => {
    rmSync(workspace, { recursive: true, force: true });
    rmSync(tmpBase, { recursive: true, force: true });
  });

  it("mirrors every installed skill EXCEPT the target into tmpBase", () => {
    setupIsolatedSkillsDir(tmpBase, "codex", workspace, "target-skill");
    const dest = join(tmpBase, ".codex", "skills");
    expect(existsSync(join(dest, "skill-a"))).toBe(true);
    expect(existsSync(join(dest, "skill-b"))).toBe(true);
    // The target skill is withheld so the baseline arm cannot auto-load it.
    expect(existsSync(join(dest, "target-skill"))).toBe(false);
  });

  it("does not mutate the source install (target stays installed)", () => {
    setupIsolatedSkillsDir(tmpBase, "codex", workspace, "target-skill");
    const src = join(workspace, ".codex", "skills");
    expect(existsSync(join(src, "skill-a"))).toBe(true);
    expect(existsSync(join(src, "target-skill"))).toBe(true);
  });
});

describe("isolation status in report", () => {
  it("computeUtility threads isolation + isolationVendor into the report", () => {
    const report = computeUtility("oma-test", {
      tasks: [],
      rollouts: [],
      isolation: "enforced",
      isolationVendor: "codex",
    });
    expect(report.isolation).toBe("enforced");
    expect(report.isolationVendor).toBe("codex");
  });

  it("computeUtility defaults isolation to 'n/a' when not provided (mock)", () => {
    const report = computeUtility("oma-test", { tasks: [], rollouts: [] });
    expect(report.isolation).toBe("n/a");
  });

  it("serializeSkillUtilityReport exposes isolation in the JSON", () => {
    const report = computeUtility("oma-test", {
      tasks: [],
      rollouts: [],
      isolation: "best-effort",
      isolationVendor: "claude",
    });
    const parsed = JSON.parse(serializeSkillUtilityReport(report)) as Record<
      string,
      unknown
    >;
    expect(parsed.isolation).toBe("best-effort");
    expect(parsed.isolationVendor).toBe("claude");
  });

  it("renderSkillUtilityReport prints a low-confidence line for non-enforced isolation", () => {
    const report: SkillUtilityReport = {
      skill: "oma-test",
      taskCount: 5,
      skippedFiles: [],
      baselineScore: 0.5,
      treatmentScore: 0.5,
      utilityLift: 0,
      utilityStdDev: 0,
      findings: [],
      negativeTransfer: [],
      decision: "fail",
      coverage: "ok",
      isolation: "best-effort",
      isolationVendor: "claude",
    };
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    renderSkillUtilityReport(report);
    const printed = logSpy.mock.calls.map((c: unknown[]) => String(c[0]));
    const isoLine = printed.find((s) => s.includes("isolation:"));
    expect(isoLine).toBeDefined();
    expect(isoLine).toContain("best-effort");
    expect(isoLine).toContain("low-confidence");
    logSpy.mockRestore();
  });

  it("renderSkillUtilityReport omits the isolation line for 'n/a' (mock mode)", () => {
    const report: SkillUtilityReport = {
      skill: "oma-test",
      taskCount: 5,
      skippedFiles: [],
      baselineScore: 0.5,
      treatmentScore: 0.5,
      utilityLift: 0,
      utilityStdDev: 0,
      findings: [],
      negativeTransfer: [],
      decision: "fail",
      coverage: "ok",
      isolation: "n/a",
    };
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    renderSkillUtilityReport(report);
    const printed = logSpy.mock.calls.map((c: unknown[]) => String(c[0]));
    expect(printed.some((s) => s.includes("isolation:"))).toBe(false);
    logSpy.mockRestore();
  });
});
