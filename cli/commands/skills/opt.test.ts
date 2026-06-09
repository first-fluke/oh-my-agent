import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  MIN_TASKS,
  NEG_TRANSFER_FAIL,
  type RolloutEntry,
  type SkillUtilityReport,
  type TaskFixture,
} from "./eval.js";
import {
  applyEdit,
  backupSkillMd,
  confirmLiveRun,
  estimateLiveDispatchCalls,
  isOmaOwnedSkill,
  OPT_EARLY_STOP_PATIENCE,
  OPT_EDITS_PER_EPOCH,
  OPT_LR_MAX_CHARS,
  OPT_MAX_EPOCHS,
  OPT_TRAIN_VAL_SPLIT,
  type OptimizerFn,
  parseOptimizerEdits,
  resolveSkillMdPath,
  runOptEpochLoop,
  runSkillsOpt,
  type ScoringFn,
  type SkillEdit,
  splitTrainVal,
  unifiedDiff,
  validateCandidate,
} from "./opt.js";

// --- Helpers ---

let tmpDir: string;

function makeTmpDir(): string {
  const d = join(
    tmpdir(),
    `oma-opt-test-${process.pid}-${Math.floor(Math.random() * 1e9)}`,
  );
  mkdirSync(d, { recursive: true });
  return d;
}

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
    `weight: ${fixture.weight}`,
  ].join("\n");
  writeFileSync(join(dir, `${fixture.id}.yaml`), yaml, "utf-8");
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

/** Write N task fixtures to a directory. Returns the fixture list. */
function writeNTasks(dir: string, n: number): TaskFixture[] {
  const fixtures = Array.from({ length: n }, (_, i) =>
    makeTaskFixture(`task-${String(i).padStart(3, "0")}`),
  );
  for (const f of fixtures) {
    writeTask(dir, f);
  }
  return fixtures;
}

/** Create a minimal valid SKILL.md body with required frontmatter. */
function makeValidSkillBody(
  content = "## Overview\n\nThis skill helps.",
): string {
  return `---\nname: Test Skill\ndescription: A test skill for unit testing.\n---\n\n${content}`;
}

/** Make N task fixtures all with assert checker. */
function makeNTasks(n: number): TaskFixture[] {
  return Array.from({ length: n }, (_, i) =>
    makeTaskFixture(`task-${String(i).padStart(3, "0")}`),
  );
}

/** Build a mock SkillUtilityReport with a given lift value. */
function makeMockReport(
  lift: number,
  negTransfer: Array<{
    otherSkill: string;
    domain: string;
    delta: number;
  }> = [],
): SkillUtilityReport {
  return {
    skill: "oma-test",
    taskCount: MIN_TASKS,
    skippedFiles: [],
    baselineScore: 0.5,
    treatmentScore: 0.5 + lift,
    utilityLift: lift,
    utilityStdDev: 0,
    findings: [],
    negativeTransfer: negTransfer,
    decision: lift > 0.05 ? "pass" : lift > 0 ? "warn" : "fail",
    coverage: "ok",
    isolation: "n/a",
  };
}

/**
 * Build a deterministic mock scoring function.
 *
 * `scores` is a Map<body, lift> — if the body matches, that lift is returned.
 * Falls back to `defaultLift` for unrecognized bodies.
 *
 * Injectable: NO real LLM, NO Date.now, NO Math.random.
 */
function makeMockScoringFn(
  scores: Map<string, number>,
  defaultLift = 0,
): ScoringFn {
  return async (options): Promise<SkillUtilityReport> => {
    const body = options.body;
    const lift = scores.get(body) ?? defaultLift;
    return makeMockReport(lift);
  };
}

/**
 * Build a deterministic mock optimizer function.
 *
 * `editSequences` is an array of SkillEdit[] — one array per call, cycling.
 * On the N-th call, returns editSequences[N % editSequences.length].
 *
 * Injectable: NO real LLM, NO Date.now, NO Math.random.
 */
function makeMockOptimizerFn(editSequences: SkillEdit[][]): OptimizerFn {
  let callCount = 0;
  return (_body: string, _findings: SkillUtilityReport): SkillEdit[] => {
    const edits = editSequences[callCount % editSequences.length] ?? [];
    callCount++;
    return edits;
  };
}

beforeEach(() => {
  tmpDir = makeTmpDir();
});

afterEach(() => {
  vi.restoreAllMocks();
});

// --- Constants ---

describe("opt constants", () => {
  it("OPT_MAX_EPOCHS is 8", () => {
    expect(OPT_MAX_EPOCHS).toBe(8);
  });

  it("OPT_EDITS_PER_EPOCH is 4", () => {
    expect(OPT_EDITS_PER_EPOCH).toBe(4);
  });

  it("OPT_LR_MAX_CHARS is 600", () => {
    expect(OPT_LR_MAX_CHARS).toBe(600);
  });

  it("OPT_EARLY_STOP_PATIENCE is 2", () => {
    expect(OPT_EARLY_STOP_PATIENCE).toBe(2);
  });

  it("OPT_TRAIN_VAL_SPLIT is 0.5", () => {
    expect(OPT_TRAIN_VAL_SPLIT).toBe(0.5);
  });
});

// --- splitTrainVal ---

describe("splitTrainVal", () => {
  it("partitions correctly with default ratio on even count", () => {
    const tasks = Array.from({ length: 10 }, (_, i) =>
      makeTaskFixture(`t-${i}`),
    );
    const { train, val } = splitTrainVal(tasks);
    expect(train.length + val.length).toBe(tasks.length);
    expect(train.length).toBe(5);
    expect(val.length).toBe(5);
  });

  it("partitions correctly with default ratio on odd count", () => {
    const tasks = Array.from({ length: 7 }, (_, i) =>
      makeTaskFixture(`t-${i}`),
    );
    const { train, val } = splitTrainVal(tasks);
    expect(train.length + val.length).toBe(tasks.length);
  });

  it("is deterministic: same input produces same output on repeated calls", () => {
    const tasks = Array.from({ length: 8 }, (_, i) =>
      makeTaskFixture(`task-${i}`),
    );
    const first = splitTrainVal(tasks);
    const second = splitTrainVal(tasks);
    expect(first.train.map((t) => t.id)).toEqual(second.train.map((t) => t.id));
    expect(first.val.map((t) => t.id)).toEqual(second.val.map((t) => t.id));
  });

  it("is stable with respect to input ordering (sorts by id)", () => {
    const ordered = Array.from({ length: 6 }, (_, i) =>
      makeTaskFixture(`t-${i}`),
    );
    const shuffled = [...ordered].reverse();
    const fromOrdered = splitTrainVal(ordered);
    const fromShuffled = splitTrainVal(shuffled);
    expect(fromOrdered.train.map((t) => t.id)).toEqual(
      fromShuffled.train.map((t) => t.id),
    );
    expect(fromOrdered.val.map((t) => t.id)).toEqual(
      fromShuffled.val.map((t) => t.id),
    );
  });

  it("train and val contain no duplicate task IDs", () => {
    const tasks = Array.from({ length: 10 }, (_, i) =>
      makeTaskFixture(`dup-${i}`),
    );
    const { train, val } = splitTrainVal(tasks);
    const trainIds = new Set(train.map((t) => t.id));
    const valIds = new Set(val.map((t) => t.id));
    // No overlap
    for (const id of valIds) {
      expect(trainIds.has(id)).toBe(false);
    }
  });

  it("respects a custom ratio", () => {
    const tasks = Array.from({ length: 10 }, (_, i) =>
      makeTaskFixture(`r-${i}`),
    );
    const { train, val } = splitTrainVal(tasks, 0.8);
    expect(train.length).toBe(8);
    expect(val.length).toBe(2);
  });

  it("handles empty input without throwing", () => {
    const { train, val } = splitTrainVal([]);
    expect(train).toHaveLength(0);
    expect(val).toHaveLength(0);
  });
});

// --- applyEdit ---

describe("applyEdit", () => {
  const body = "# Heading\n\nSome content here.\n\n## Section\n\nMore content.";

  it("add: inserts after text after the anchor", () => {
    const edit: SkillEdit = {
      op: "add",
      anchor: "# Heading",
      after: "\n\nAdded line.",
    };
    const result = applyEdit(body, edit);
    expect(result).toContain("# Heading\n\nAdded line.");
    expect(result).toContain("Some content here.");
  });

  it("delete: removes the anchor", () => {
    const edit: SkillEdit = { op: "delete", anchor: "Some content here." };
    const result = applyEdit(body, edit);
    expect(result).not.toContain("Some content here.");
    expect(result).toContain("# Heading");
  });

  it("replace: replaces the anchor with after text", () => {
    const edit: SkillEdit = {
      op: "replace",
      anchor: "Some content here.",
      after: "Replaced content.",
    };
    const result = applyEdit(body, edit);
    expect(result).toContain("Replaced content.");
    expect(result).not.toContain("Some content here.");
  });

  it("add: uses empty string when after is undefined", () => {
    const edit: SkillEdit = { op: "add", anchor: "# Heading" };
    const result = applyEdit(body, edit);
    // after defaults to "" → no change in content, just anchor stays
    expect(result).toBe(body);
  });

  it("delete: uses first occurrence only", () => {
    const repeated = "foo bar foo";
    const edit: SkillEdit = { op: "delete", anchor: "foo" };
    const result = applyEdit(repeated, edit);
    expect(result).toBe(" bar foo");
  });

  it("replace: replaces first occurrence only", () => {
    const repeated = "foo bar foo";
    const edit: SkillEdit = { op: "replace", anchor: "foo", after: "baz" };
    const result = applyEdit(repeated, edit);
    expect(result).toBe("baz bar foo");
  });

  it("returns body unchanged when anchor is not found", () => {
    const edit: SkillEdit = {
      op: "replace",
      anchor: "NONEXISTENT",
      after: "something",
    };
    const result = applyEdit(body, edit);
    expect(result).toBe(body);
  });

  it("is deterministic: same inputs produce same output", () => {
    const edit: SkillEdit = {
      op: "replace",
      anchor: "# Heading",
      after: "# New Heading",
    };
    const r1 = applyEdit(body, edit);
    const r2 = applyEdit(body, edit);
    expect(r1).toBe(r2);
  });
});

// --- validateCandidate ---

describe("validateCandidate", () => {
  it("accepts a valid body with name and description in frontmatter", () => {
    const body = makeValidSkillBody();
    const result = validateCandidate(body);
    expect(result.ok).toBe(true);
  });

  it("rejects an empty body", () => {
    const result = validateCandidate("");
    expect(result.ok).toBe(false);
    expect(result.reason).toMatch(/empty/i);
  });

  it("rejects a whitespace-only body", () => {
    const result = validateCandidate("   \n  \t  ");
    expect(result.ok).toBe(false);
    expect(result.reason).toMatch(/empty/i);
  });

  it("rejects a body missing the name field", () => {
    const body = "---\ndescription: A skill.\n---\n\n## Overview\n";
    const result = validateCandidate(body);
    expect(result.ok).toBe(false);
    expect(result.reason).toMatch(/name/i);
  });

  it("rejects a body with empty name field", () => {
    const body = "---\nname: \ndescription: A skill.\n---\n\n## Overview\n";
    const result = validateCandidate(body);
    expect(result.ok).toBe(false);
    expect(result.reason).toMatch(/name/i);
  });

  it("rejects a body missing the description field", () => {
    const body = "---\nname: Test Skill\n---\n\n## Overview\n";
    const result = validateCandidate(body);
    expect(result.ok).toBe(false);
    expect(result.reason).toMatch(/description/i);
  });

  it("rejects a body with empty description field", () => {
    const body = "---\nname: Test Skill\ndescription: \n---\n\n## Overview\n";
    const result = validateCandidate(body);
    expect(result.ok).toBe(false);
    expect(result.reason).toMatch(/description/i);
  });

  it("rejects a body with no frontmatter at all", () => {
    const body = "## Overview\n\nJust markdown content, no frontmatter.";
    const result = validateCandidate(body);
    expect(result.ok).toBe(false);
  });

  it("accepts frontmatter with extra fields beyond name/description", () => {
    const body =
      "---\nname: Test\ndescription: A skill.\nauthor: test\nversion: 1\n---\n\n## Overview\n";
    const result = validateCandidate(body);
    expect(result.ok).toBe(true);
  });
});

// --- LR budget: over-budget edits are rejected ---

describe("LR budget enforcement in runOptEpochLoop", () => {
  it("rejects edits whose net change exceeds lrMaxChars", async () => {
    const tasks = makeNTasks(MIN_TASKS * 2);
    const { train, val } = splitTrainVal(tasks);
    const body = makeValidSkillBody();
    const taskDir = join(tmpDir, "eval", "oma-lr");

    // Produce an edit whose net change is just over the budget
    const bigText = "X".repeat(OPT_LR_MAX_CHARS + 1);
    const overBudgetEdit: SkillEdit = {
      op: "replace",
      anchor: "## Overview",
      after: bigText,
    };

    const scoringFn = makeMockScoringFn(new Map(), 0.1);
    const optimizerFn = makeMockOptimizerFn([[overBudgetEdit]]);

    const result = await runOptEpochLoop({
      skillId: "oma-lr",
      originalBody: body,
      trainTasks: train,
      valTasks: val,
      taskDir,
      mode: "mock",
      maxEpochs: 1,
      lrMaxChars: OPT_LR_MAX_CHARS,
      optimizerFn,
      scoringFn,
    });

    // Over-budget edit should be rejected and never accepted
    expect(result.acceptedEdits).toHaveLength(0);
    expect(result.rejectedCount).toBeGreaterThan(0);
  });
});

// --- parseOptimizerEdits ---

describe("parseOptimizerEdits", () => {
  it("parses valid EDIT: lines", () => {
    const raw = [
      'EDIT: {"op":"replace","anchor":"old text","after":"new text"}',
      'EDIT: {"op":"add","anchor":"## Section","after":"\\n- new bullet"}',
      'EDIT: {"op":"delete","anchor":"line to remove"}',
    ].join("\n");
    const edits = parseOptimizerEdits(raw);
    expect(edits).toHaveLength(3);
    expect(edits[0]).toMatchObject({
      op: "replace",
      anchor: "old text",
      after: "new text",
    });
    expect(edits[1]).toMatchObject({ op: "add", anchor: "## Section" });
    expect(edits[2]).toMatchObject({ op: "delete", anchor: "line to remove" });
  });

  it("skips malformed lines without crashing", () => {
    const raw = [
      "EDIT: not valid json",
      'EDIT: {"op":"replace","anchor":"ok","after":"val"}',
      "Some random text",
      "EDIT: {bad json}",
    ].join("\n");
    const edits = parseOptimizerEdits(raw);
    expect(edits).toHaveLength(1);
    expect(edits[0]).toMatchObject({ op: "replace", anchor: "ok" });
  });

  it("parses bare JSON objects on their own line", () => {
    const raw = '{"op":"add","anchor":"## Rules","after":"\\n- New rule"}';
    const edits = parseOptimizerEdits(raw);
    expect(edits).toHaveLength(1);
    expect(edits[0]).toMatchObject({ op: "add", anchor: "## Rules" });
  });

  it("returns empty array for empty input", () => {
    expect(parseOptimizerEdits("")).toHaveLength(0);
  });

  it("skips edits with invalid op values", () => {
    const raw = 'EDIT: {"op":"mutate","anchor":"text","after":"val"}';
    expect(parseOptimizerEdits(raw)).toHaveLength(0);
  });
});

// --- unifiedDiff ---

describe("unifiedDiff", () => {
  it("returns empty string for identical inputs", () => {
    expect(unifiedDiff("same\ncontent", "same\ncontent")).toBe("");
  });

  it("produces --- and +++ headers for changed inputs", () => {
    const diff = unifiedDiff("line one\nline two", "line one\nline changed");
    expect(diff).toContain("--- a/SKILL.md");
    expect(diff).toContain("+++ b/SKILL.md");
    expect(diff).toContain("-line two");
    expect(diff).toContain("+line changed");
  });

  it("is deterministic: same inputs produce same diff", () => {
    const a = "line one\nline two\nline three";
    const b = "line one\nmodified two\nline three";
    expect(unifiedDiff(a, b)).toBe(unifiedDiff(a, b));
  });

  it("handles addition of new lines", () => {
    const diff = unifiedDiff("line one", "line one\nnew line");
    expect(diff).toContain("+new line");
  });

  it("handles deletion of lines", () => {
    const diff = unifiedDiff(
      "line one\nline two\nline three",
      "line one\nline three",
    );
    expect(diff).toContain("-line two");
  });
});

// --- runOptEpochLoop: accept gate uses VAL not TRAIN ---

describe("runOptEpochLoop accept gate uses VAL split", () => {
  it("rejects an edit that improves TRAIN but regresses VAL", async () => {
    // Construct a scenario where:
    //  - train scoring returns higher lift for candidate body
    //  - val scoring returns lower lift for candidate body
    // The accept gate must reject (uses VAL only)

    const originalBody = makeValidSkillBody("## Original\n\nOriginal content.");
    const candidateBody = makeValidSkillBody(
      "## Modified\n\nModified content.",
    );

    const tasks = makeNTasks(MIN_TASKS * 2);
    const { train, val } = splitTrainVal(tasks);
    const taskDir = join(tmpDir, "eval", "oma-valgate");

    const trainLiftForCandidate = 0.2; // Train improves
    const valLiftForCandidate = -0.1; // Val REGRESSES — should not be accepted

    // Scoring function: discriminates between original and candidate body,
    // and between train and val task sets.
    const scoringFn: ScoringFn = async (
      options,
    ): Promise<SkillUtilityReport> => {
      const body = options.body;
      const reqTasks = options.tasks ?? [];

      const isTrainSet =
        reqTasks.length === train.length &&
        reqTasks.every((t, i) => t.id === train[i]?.id);

      const isCandidate = body === candidateBody;

      let lift: number;
      if (isCandidate && isTrainSet) {
        lift = trainLiftForCandidate; // Train improves for candidate
      } else if (isCandidate && !isTrainSet) {
        lift = valLiftForCandidate; // Val regresses for candidate
      } else {
        lift = 0; // Original: no lift
      }

      return makeMockReport(lift);
    };

    // Optimizer always proposes a replace to produce the candidate body
    const edit: SkillEdit = {
      op: "replace",
      anchor: "## Original",
      after: "## Modified",
    };
    const optimizerFn: OptimizerFn = (_body, _findings) => {
      // Return the edit that transforms originalBody toward candidateBody
      return [edit];
    };

    const result = await runOptEpochLoop({
      skillId: "oma-valgate",
      originalBody,
      trainTasks: train,
      valTasks: val,
      taskDir,
      mode: "mock",
      maxEpochs: 1,
      lrMaxChars: OPT_LR_MAX_CHARS,
      optimizerFn,
      scoringFn,
    });

    // Edit improved train but regressed val → must NOT be accepted
    expect(result.acceptedEdits).toHaveLength(0);
    // The edit should be in the rejected buffer (rejectedCount > 0)
    expect(result.rejectedCount).toBeGreaterThan(0);
  });

  it("accepts an edit that improves VAL lift", async () => {
    const originalBody = makeValidSkillBody("## Original\n\nOriginal content.");

    const tasks = makeNTasks(MIN_TASKS * 2);
    const { train, val } = splitTrainVal(tasks);
    const taskDir = join(tmpDir, "eval", "oma-accept");

    const valLiftForCandidate = 0.15; // Val improves

    // Scoring function: candidate body gets better val lift
    const scoringFn: ScoringFn = async (
      options,
    ): Promise<SkillUtilityReport> => {
      const body = options.body;
      const isOriginal = body === originalBody;
      // Any body that is NOT the original gets higher val lift
      const lift = isOriginal ? 0 : valLiftForCandidate;
      return makeMockReport(lift);
    };

    const edit: SkillEdit = {
      op: "add",
      anchor: "## Original",
      after: "\n\n- Added rule.",
    };
    const optimizerFn: OptimizerFn = (_body, _findings) => [edit];

    const result = await runOptEpochLoop({
      skillId: "oma-accept",
      originalBody,
      trainTasks: train,
      valTasks: val,
      taskDir,
      mode: "mock",
      maxEpochs: 1,
      lrMaxChars: OPT_LR_MAX_CHARS,
      optimizerFn,
      scoringFn,
    });

    expect(result.acceptedEdits).toHaveLength(1);
    expect(result.finalLift).toBeGreaterThan(result.baselineLift);
    expect(result.diff).not.toBe("");
  });
});

// --- Negative transfer gate ---

describe("runOptEpochLoop negative transfer gate", () => {
  it("rejects an edit that trips NEG_TRANSFER_FAIL even when val lift improves", async () => {
    const originalBody = makeValidSkillBody();
    const tasks = makeNTasks(MIN_TASKS * 2);
    const { train, val } = splitTrainVal(tasks);
    const taskDir = join(tmpDir, "eval", "oma-negtx");

    // Scoring: candidate has positive val lift but negative transfer that trips the threshold
    const scoringFn: ScoringFn = async (
      options,
    ): Promise<SkillUtilityReport> => {
      const isOriginal = options.body === originalBody;
      const lift = isOriginal ? 0 : 0.1;
      const negTransfer = isOriginal
        ? []
        : [
            {
              otherSkill: "oma-other",
              domain: "test",
              delta: NEG_TRANSFER_FAIL - 0.01,
            },
          ];
      return makeMockReport(lift, negTransfer);
    };

    const edit: SkillEdit = {
      op: "add",
      anchor: "## Overview",
      after: "\n\n- Extra rule.",
    };
    const optimizerFn: OptimizerFn = () => [edit];

    const result = await runOptEpochLoop({
      skillId: "oma-negtx",
      originalBody,
      trainTasks: train,
      valTasks: val,
      taskDir,
      mode: "mock",
      maxEpochs: 1,
      lrMaxChars: OPT_LR_MAX_CHARS,
      optimizerFn,
      scoringFn,
    });

    // Positive val lift but negative transfer → rejected
    expect(result.acceptedEdits).toHaveLength(0);
    expect(result.rejectedCount).toBeGreaterThan(0);
  });

  it("accepts an edit with negative transfer that is above the threshold", async () => {
    const originalBody = makeValidSkillBody();
    const tasks = makeNTasks(MIN_TASKS * 2);
    const { train, val } = splitTrainVal(tasks);
    const taskDir = join(tmpDir, "eval", "oma-negtx-ok");

    // Negative transfer delta just above NEG_TRANSFER_FAIL (not bad enough to reject)
    const scoringFn: ScoringFn = async (
      options,
    ): Promise<SkillUtilityReport> => {
      const isOriginal = options.body === originalBody;
      const lift = isOriginal ? 0 : 0.1;
      const negTransfer = isOriginal
        ? []
        : [
            {
              otherSkill: "oma-other",
              domain: "test",
              delta: NEG_TRANSFER_FAIL + 0.01,
            },
          ];
      return makeMockReport(lift, negTransfer);
    };

    const edit: SkillEdit = {
      op: "add",
      anchor: "## Overview",
      after: "\n\n- Extra rule.",
    };
    const optimizerFn: OptimizerFn = () => [edit];

    const result = await runOptEpochLoop({
      skillId: "oma-negtx-ok",
      originalBody,
      trainTasks: train,
      valTasks: val,
      taskDir,
      mode: "mock",
      maxEpochs: 1,
      lrMaxChars: OPT_LR_MAX_CHARS,
      optimizerFn,
      scoringFn,
    });

    expect(result.acceptedEdits).toHaveLength(1);
  });
});

// --- Rejected-edit buffer: never re-proposed ---

describe("runOptEpochLoop rejected-edit buffer", () => {
  it("rejected edit is never re-proposed in subsequent epochs", async () => {
    const originalBody = makeValidSkillBody("## Overview\n\nBase content.");
    const tasks = makeNTasks(MIN_TASKS * 2);
    const { train, val } = splitTrainVal(tasks);
    const taskDir = join(tmpDir, "eval", "oma-buffer");

    // Track how many times each distinct body is scored on the VAL split specifically.
    // We discriminate by tracking whether a body is the candidate (different from original).
    const candidateValScoringCount = { count: 0 };
    const candidateBody = applyEdit(originalBody, {
      op: "add",
      anchor: "## Overview",
      after: "\n\n- Will be rejected.",
    });

    // Scoring: always regress val to force rejection.
    // We track val scoring by seeing the candidateBody.
    const scoringFn: ScoringFn = async (
      options,
    ): Promise<SkillUtilityReport> => {
      if (options.body === candidateBody) {
        candidateValScoringCount.count++;
      }
      const lift = options.body === originalBody ? 0 : -0.1; // Always regress val
      return makeMockReport(lift);
    };

    const rejectedEdit: SkillEdit = {
      op: "add",
      anchor: "## Overview",
      after: "\n\n- Will be rejected.",
    };

    const optimizerFn: OptimizerFn = (_body, _findings) => {
      return [rejectedEdit]; // Always proposes the same (rejected) edit
    };

    const result = await runOptEpochLoop({
      skillId: "oma-buffer",
      originalBody,
      trainTasks: train,
      valTasks: val,
      taskDir,
      mode: "mock",
      maxEpochs: OPT_MAX_EPOCHS,
      lrMaxChars: OPT_LR_MAX_CHARS,
      optimizerFn,
      scoringFn,
    });

    // The edit is rejected in epoch 0 and added to the buffer.
    // In subsequent epochs, the optimizer proposes the same edit but it is filtered out.
    expect(result.acceptedEdits).toHaveLength(0);

    // Candidate should only be scored ONCE (in epoch 0), never again after buffering.
    // With patience=2, epochs run: 0 (candidate scored), 1 (buffer filters, 0 candidates),
    // 2 (buffer filters, 0 candidates) → early stop.
    expect(candidateValScoringCount.count).toBeLessThanOrEqual(1);
  });
});

// --- Early-stop ---

describe("runOptEpochLoop early-stop", () => {
  it("stops after OPT_EARLY_STOP_PATIENCE consecutive no-accept epochs", async () => {
    const originalBody = makeValidSkillBody();
    const tasks = makeNTasks(MIN_TASKS * 2);
    const { train, val } = splitTrainVal(tasks);
    const taskDir = join(tmpDir, "eval", "oma-earlystop");

    // Scoring: always return same lift (no improvement)
    const scoringFn = makeMockScoringFn(new Map(), 0);
    const edit: SkillEdit = {
      op: "add",
      anchor: "## Overview",
      after: "\n- no improvement",
    };

    // Use a unique edit per epoch to avoid the buffer filter
    let epoch = 0;
    const optimizerFn: OptimizerFn = () => {
      const e: SkillEdit = {
        op: "add",
        anchor: "## Overview",
        after: `\n- epoch ${epoch++} edit`,
      };
      return [e];
    };

    void edit; // suppress unused

    const result = await runOptEpochLoop({
      skillId: "oma-earlystop",
      originalBody,
      trainTasks: train,
      valTasks: val,
      taskDir,
      mode: "mock",
      maxEpochs: OPT_MAX_EPOCHS,
      lrMaxChars: OPT_LR_MAX_CHARS,
      optimizerFn,
      scoringFn,
    });

    // Should stop after OPT_EARLY_STOP_PATIENCE no-accept epochs
    expect(result.epochs.length).toBeLessThanOrEqual(OPT_EARLY_STOP_PATIENCE);
    expect(result.acceptedEdits).toHaveLength(0);
  });

  it("does NOT early-stop when edits are accepted (patience resets)", async () => {
    // Key insight: the accept gate checks `deltaLift = candValLift - curValLift > 0`.
    // curValLift accumulates across epochs, so the candidate's absolute lift must keep
    // rising to beat the running best. We achieve that by returning a strictly-increasing
    // absolute lift tied to the number of accepted edits so far.
    const originalBody = makeValidSkillBody("## Overview\n\nBase content.");
    const tasks = makeNTasks(MIN_TASKS * 2);
    const { train, val } = splitTrainVal(tasks);
    const taskDir = join(tmpDir, "eval", "oma-patience-reset");

    // Accepted edit bodies, in order. Each accepted candidate becomes the new bestBody.
    const acceptedBodies: string[] = [];

    // Scoring: for the original body → 0; for each successive accepted body → strictly
    // higher lift so deltaLift > 0 on every epoch. Deterministic (no random).
    const scoringFn: ScoringFn = async (
      options,
    ): Promise<SkillUtilityReport> => {
      const bodyIdx = acceptedBodies.indexOf(options.body);
      if (bodyIdx !== -1) {
        // A previously accepted body: return its recorded lift
        return makeMockReport((bodyIdx + 1) * 0.1);
      }
      if (options.body === originalBody) {
        return makeMockReport(0);
      }
      // A candidate body not yet accepted: return a lift just above the current best.
      // We use acceptedBodies.length to know how many accepts have happened so far.
      return makeMockReport((acceptedBodies.length + 1) * 0.1 + 0.05);
    };

    let editIdx = 0;
    const optimizerFn: OptimizerFn = (body, _findings) => {
      // Record the current best so scoring can identify it
      if (!acceptedBodies.includes(body) && body !== originalBody) {
        acceptedBodies.push(body);
      }
      const e: SkillEdit = {
        op: "add",
        anchor: "## Overview",
        after: `\n- unique rule ${editIdx++}`,
      };
      return [e];
    };

    const MAX_EPOCHS = 6; // well above OPT_EARLY_STOP_PATIENCE (2)
    const result = await runOptEpochLoop({
      skillId: "oma-patience-reset",
      originalBody,
      trainTasks: train,
      valTasks: val,
      taskDir,
      mode: "mock",
      maxEpochs: MAX_EPOCHS,
      lrMaxChars: OPT_LR_MAX_CHARS,
      optimizerFn,
      scoringFn,
    });

    // When patience resets on each accept, the loop does NOT early-stop at
    // OPT_EARLY_STOP_PATIENCE epochs. It must run more than that many epochs.
    expect(result.epochs.length).toBeGreaterThan(OPT_EARLY_STOP_PATIENCE);
    // At least one edit was accepted (otherwise the patience reset never happened)
    expect(result.acceptedEdits.length).toBeGreaterThan(0);
  });
});

// --- Mock determinism (T6) ---

describe("mock determinism", () => {
  it("--mock produces byte-identical SkillOptResult across two runs", async () => {
    const originalBody = makeValidSkillBody("## Overview\n\nBase content.");
    const tasks = makeNTasks(MIN_TASKS * 2);
    const { train, val } = splitTrainVal(tasks);
    const taskDir = join(tmpDir, "eval", "oma-determinism");

    // Deterministic scores: map body content to lift
    const candidateBodyEdit: SkillEdit = {
      op: "add",
      anchor: "## Overview",
      after: "\n\n- Added rule for improvement.",
    };
    const candidateBody = applyEdit(originalBody, candidateBodyEdit);

    const scores = new Map<string, number>([
      [originalBody, 0],
      [candidateBody, 0.1],
    ]);

    const buildDeterministicOpt = () => {
      const scoringFn = makeMockScoringFn(scores);
      const optimizerFn = makeMockOptimizerFn([[candidateBodyEdit]]);
      return { scoringFn, optimizerFn };
    };

    const run = async () => {
      const { scoringFn, optimizerFn } = buildDeterministicOpt();
      return runOptEpochLoop({
        skillId: "oma-determinism",
        originalBody,
        trainTasks: train,
        valTasks: val,
        taskDir,
        mode: "mock",
        maxEpochs: 2,
        lrMaxChars: OPT_LR_MAX_CHARS,
        optimizerFn,
        scoringFn,
      });
    };

    const r1 = await run();
    const r2 = await run();

    // Both runs must produce byte-identical results
    expect(r1.baselineLift).toBe(r2.baselineLift);
    expect(r1.finalLift).toBe(r2.finalLift);
    expect(r1.epochs.length).toBe(r2.epochs.length);
    expect(r1.acceptedEdits.length).toBe(r2.acceptedEdits.length);
    expect(r1.rejectedCount).toBe(r2.rejectedCount);
    expect(r1.finalSkillMd).toBe(r2.finalSkillMd);
    expect(r1.diff).toBe(r2.diff);
    expect(r1.applied).toBe(r2.applied);

    // Serialized output must be identical
    const { serializeSkillOptResult } = await import("./opt.js");
    expect(serializeSkillOptResult(r1)).toBe(serializeSkillOptResult(r2));
  });
});

// --- validateCandidate: frontmatter loss rejection ---

describe("validateCandidate frontmatter loss", () => {
  it("rejects a candidate that would strip the frontmatter name via applyEdit", () => {
    const body = makeValidSkillBody();
    // Attempt to delete the name field
    const edit: SkillEdit = { op: "delete", anchor: "name: Test Skill\n" };
    const candidate = applyEdit(body, edit);
    const result = validateCandidate(candidate);
    expect(result.ok).toBe(false);
    expect(result.reason).toMatch(/name/i);
  });

  it("rejects a candidate that would strip the frontmatter description via applyEdit", () => {
    const body = makeValidSkillBody();
    // Delete the description field from frontmatter
    const edit: SkillEdit = {
      op: "delete",
      anchor: "description: A test skill for unit testing.\n",
    };
    const candidate = applyEdit(body, edit);
    const result = validateCandidate(candidate);
    expect(result.ok).toBe(false);
    expect(result.reason).toMatch(/description/i);
  });
});

// --- runSkillsOpt ---

describe("runSkillsOpt", () => {
  it("exits non-zero and prints error when < MIN_TASKS fixtures exist", async () => {
    const taskDir = join(tmpDir, "eval", "oma-test");
    // Write fewer than MIN_TASKS fixtures
    writeNTasks(taskDir, MIN_TASKS - 1);

    const consoleErrorSpy = vi
      .spyOn(console, "error")
      .mockImplementation(() => undefined);
    const exitSpy = vi
      .spyOn(process, "exit")
      .mockImplementation((_code?: string | number | null | undefined) => {
        throw new Error("process.exit called");
      });

    await expect(
      runSkillsOpt(false, {
        skill: "oma-test",
        _workspace: tmpDir,
        _taskDir: taskDir,
      }),
    ).rejects.toThrow("process.exit called");

    expect(exitSpy).toHaveBeenCalledWith(1);
    const errorOutput = consoleErrorSpy.mock.calls
      .map((args: unknown[]) => String(args[0]))
      .join(" ");
    expect(errorOutput).toMatch(/no eval coverage/i);
    expect(errorOutput).toMatch(/skill-eval\.md/);
  });

  it("exits non-zero (json mode) and returns JSON error when < MIN_TASKS", async () => {
    const taskDir = join(tmpDir, "eval", "oma-test-json");
    writeNTasks(taskDir, 0);

    const consoleLogSpy = vi
      .spyOn(console, "log")
      .mockImplementation(() => undefined);
    const exitSpy = vi
      .spyOn(process, "exit")
      .mockImplementation((_code?: string | number | null | undefined) => {
        throw new Error("process.exit called");
      });

    await expect(
      runSkillsOpt(true, {
        skill: "oma-test-json",
        _workspace: tmpDir,
        _taskDir: taskDir,
      }),
    ).rejects.toThrow("process.exit called");

    expect(exitSpy).toHaveBeenCalledWith(1);
    const logOutput = consoleLogSpy.mock.calls
      .map((args: unknown[]) => String(args[0]))
      .join("\n");
    const parsed: unknown = JSON.parse(logOutput);
    expect(parsed).toMatchObject({
      error: expect.stringContaining("no eval coverage"),
    });
  });

  it("runs the epoch loop and returns a SkillOptResult when >= MIN_TASKS fixtures exist", async () => {
    const taskDir = join(tmpDir, "eval", "oma-loop-ok");
    const fixtures = writeNTasks(taskDir, MIN_TASKS * 2);
    void fixtures;

    const consoleLogSpy = vi
      .spyOn(console, "log")
      .mockImplementation(() => undefined);

    // Injectable: deterministic mock optimizer + scoring
    const originalBody = "";
    const edit: SkillEdit = { op: "add", anchor: "", after: "" };
    const scoringFn = makeMockScoringFn(new Map(), 0);
    const optimizerFn = makeMockOptimizerFn([[edit]]);

    await runSkillsOpt(true, {
      skill: "oma-loop-ok",
      _workspace: tmpDir,
      _taskDir: taskDir,
      _optimizerFn: optimizerFn,
      _scoringFn: scoringFn,
    });

    void originalBody;

    const logOutput = consoleLogSpy.mock.calls
      .map((args: unknown[]) => String(args[0]))
      .join("\n");
    const parsed: unknown = JSON.parse(logOutput);
    expect(parsed).toMatchObject({
      skill: "oma-loop-ok",
      applied: false,
    });
  });

  it("dry-run is the default: _dryRun is true in JSON output", async () => {
    const taskDir = join(tmpDir, "eval", "oma-dryrun");
    writeNTasks(taskDir, MIN_TASKS);

    const consoleLogSpy = vi
      .spyOn(console, "log")
      .mockImplementation(() => undefined);

    const scoringFn = makeMockScoringFn(new Map(), 0);
    const optimizerFn = makeMockOptimizerFn([[]]);

    // Without --apply flag
    await runSkillsOpt(true, {
      skill: "oma-dryrun",
      _workspace: tmpDir,
      _taskDir: taskDir,
      _optimizerFn: optimizerFn,
      _scoringFn: scoringFn,
    });

    const logOutput = consoleLogSpy.mock.calls
      .map((args: unknown[]) => String(args[0]))
      .join("\n");
    const parsed = JSON.parse(logOutput) as Record<string, unknown>;
    expect(parsed._dryRun).toBe(true);
  });

  it("apply flag flips dry-run off", async () => {
    const taskDir = join(tmpDir, "eval", "oma-apply");
    writeNTasks(taskDir, MIN_TASKS);

    const consoleLogSpy = vi
      .spyOn(console, "log")
      .mockImplementation(() => undefined);

    const scoringFn = makeMockScoringFn(new Map(), 0);
    const optimizerFn = makeMockOptimizerFn([[]]);

    await runSkillsOpt(true, {
      skill: "oma-apply",
      _workspace: tmpDir,
      _taskDir: taskDir,
      apply: true,
      _optimizerFn: optimizerFn,
      _scoringFn: scoringFn,
    });

    const logOutput = consoleLogSpy.mock.calls
      .map((args: unknown[]) => String(args[0]))
      .join("\n");
    const parsed = JSON.parse(logOutput) as Record<string, unknown>;
    expect(parsed._dryRun).toBe(false);
  });

  it("splits train/val and includes counts in JSON output", async () => {
    const count = MIN_TASKS + 4;
    const taskDir = join(tmpDir, "eval", "oma-split");
    writeNTasks(taskDir, count);

    const consoleLogSpy = vi
      .spyOn(console, "log")
      .mockImplementation(() => undefined);

    const scoringFn = makeMockScoringFn(new Map(), 0);
    const optimizerFn = makeMockOptimizerFn([[]]);

    await runSkillsOpt(true, {
      skill: "oma-split",
      _workspace: tmpDir,
      _taskDir: taskDir,
      _optimizerFn: optimizerFn,
      _scoringFn: scoringFn,
    });

    const logOutput = consoleLogSpy.mock.calls
      .map((args: unknown[]) => String(args[0]))
      .join("\n");
    const parsed = JSON.parse(logOutput) as Record<string, unknown>;
    const split = parsed._split as { trainCount: number; valCount: number };
    expect(split.trainCount + split.valCount).toBe(count);
    expect(split.trainCount).toBeGreaterThan(0);
    expect(split.valCount).toBeGreaterThan(0);
  });

  it("rejects skill IDs with path traversal characters", async () => {
    const consoleErrorSpy = vi
      .spyOn(console, "error")
      .mockImplementation(() => undefined);
    const exitSpy = vi
      .spyOn(process, "exit")
      .mockImplementation((_code?: string | number | null | undefined) => {
        throw new Error("process.exit called");
      });

    await expect(
      runSkillsOpt(false, { skill: "../etc/passwd", _workspace: tmpDir }),
    ).rejects.toThrow("process.exit called");

    expect(exitSpy).toHaveBeenCalledWith(1);
    const errorOutput = consoleErrorSpy.mock.calls
      .map((args: unknown[]) => String(args[0]))
      .join(" ");
    expect(errorOutput).toMatch(/path separators/i);
  });

  it("runSkillsOpt mock is byte-identical across two runs with same injectable fns", async () => {
    const taskDir = join(tmpDir, "eval", "oma-runopt-determinism");
    writeNTasks(taskDir, MIN_TASKS * 2);

    const edit: SkillEdit = {
      op: "add",
      anchor: "---",
      after: "",
    };

    const run = async () => {
      const logs: string[] = [];
      const consoleLogSpy = vi
        .spyOn(console, "log")
        .mockImplementation((...args: unknown[]) => {
          logs.push(String(args[0]));
        });

      const scoringFn = makeMockScoringFn(new Map(), 0);
      const optimizerFn = makeMockOptimizerFn([[edit]]);

      await runSkillsOpt(true, {
        skill: "oma-runopt-determinism",
        _workspace: tmpDir,
        _taskDir: taskDir,
        _optimizerFn: optimizerFn,
        _scoringFn: scoringFn,
      });

      consoleLogSpy.mockRestore();
      return logs.join("\n");
    };

    const out1 = await run();
    const out2 = await run();

    // Parse JSON from both runs
    const p1 = JSON.parse(out1) as Record<string, unknown>;
    const p2 = JSON.parse(out2) as Record<string, unknown>;

    // Key fields must match
    expect(p1.baselineLift).toBe(p2.baselineLift);
    expect(p1.finalLift).toBe(p2.finalLift);
    expect(p1.epochCount).toBe(p2.epochCount);
    expect(p1.rejectedCount).toBe(p2.rejectedCount);
    expect(p1.applied).toBe(p2.applied);
    expect(p1.diff).toBe(p2.diff);
  });
});

// --- Rollout-based mock scoring integration ---

describe("runOptEpochLoop with rollout-based mock scoring (no LLM)", () => {
  it("uses scoreSkillBody in mock mode which reads rollouts from taskDir", async () => {
    // Create a proper eval dir with fixtures and rollouts so scoreSkillBody can compute
    const evalTaskDir = join(tmpDir, "eval", "oma-rollout-mock");
    const fixtures = writeNTasks(evalTaskDir, MIN_TASKS * 2);

    // Write rollouts: treatment has "EXPECTED" (pass), baseline does not
    const rolloutsDir = join(evalTaskDir, "_rollouts");
    mkdirSync(rolloutsDir, { recursive: true });
    const rollouts: RolloutEntry[] = fixtures.flatMap((f) => [
      { taskId: f.id, arm: "baseline" as const, output: "no match" },
      { taskId: f.id, arm: "treatment" as const, output: "EXPECTED" },
    ]);
    writeFileSync(
      join(rolloutsDir, "test.json"),
      JSON.stringify(rollouts),
      "utf-8",
    );

    const { scoreSkillBody: realScoreSkillBody } = await import("./eval.js");
    const { train, val } = splitTrainVal(fixtures);

    // Use the real scoreSkillBody as the scoring fn — this is mock mode (rollouts on disk)
    const scoringFn: ScoringFn = (opts) =>
      realScoreSkillBody({ ...opts, taskDir: evalTaskDir, mode: "mock" });

    const body = makeValidSkillBody();
    const optimizerFn: OptimizerFn = () => [];

    const result = await runOptEpochLoop({
      skillId: "oma-rollout-mock",
      originalBody: body,
      trainTasks: train,
      valTasks: val,
      taskDir: evalTaskDir,
      mode: "mock",
      maxEpochs: 1,
      lrMaxChars: OPT_LR_MAX_CHARS,
      optimizerFn,
      scoringFn,
    });

    // No edits proposed → no accepted, no rejected
    expect(result.acceptedEdits).toHaveLength(0);
    expect(result.applied).toBe(false);
    // Baseline lift is computed from rollouts — non-zero since treatment passes
    expect(result.baselineLift).toBeGreaterThan(0);
  });
});

// ============================================================
// T7 tests: OUTPUT layer (dry-run / apply / .bak / oma-owned / cost-preview)
// All deterministic mock — NO real LLM, NO real readline.
// ============================================================

// --- Helper: write a real SKILL.md into a tmp skill dir ---

function writeSkillMd(skillMdPath: string, content: string): void {
  const dir = skillMdPath.slice(0, skillMdPath.lastIndexOf("/"));
  mkdirSync(dir, { recursive: true });
  writeFileSync(skillMdPath, content, "utf-8");
}

// --- isOmaOwnedSkill ---

describe("isOmaOwnedSkill", () => {
  it("returns true for skills prefixed with oma-", () => {
    expect(isOmaOwnedSkill("oma-backend")).toBe(true);
    expect(isOmaOwnedSkill("oma-translator")).toBe(true);
    expect(isOmaOwnedSkill("oma-")).toBe(true);
  });

  it("returns false for user-authored skills", () => {
    expect(isOmaOwnedSkill("my-skill")).toBe(false);
    expect(isOmaOwnedSkill("backend")).toBe(false);
    expect(isOmaOwnedSkill("")).toBe(false);
  });
});

// --- resolveSkillMdPath ---

describe("resolveSkillMdPath", () => {
  it("returns <workspace>/.agents/skills/<skillId>/SKILL.md", () => {
    const p = resolveSkillMdPath("oma-backend", "/workspace");
    expect(p).toContain(".agents");
    expect(p).toContain("skills");
    expect(p).toContain("oma-backend");
    expect(p).toMatch(/SKILL\.md$/);
  });
});

// --- backupSkillMd ---

describe("backupSkillMd", () => {
  it("creates <path>.bak with original content when no .bak exists", () => {
    const skillMdPath = join(tmpDir, "SKILL.md");
    const original = makeValidSkillBody("## Original\n\nContent.");
    writeSkillMd(skillMdPath, original);

    const bakPath = backupSkillMd(skillMdPath);

    expect(bakPath).toBe(`${skillMdPath}.bak`);
    expect(existsSync(bakPath)).toBe(true);
    expect(readFileSync(bakPath, "utf-8")).toBe(original);
  });

  it("creates <path>.bak.1 when <path>.bak already exists", () => {
    const skillMdPath = join(tmpDir, "SKILL-bak1.md");
    const original = makeValidSkillBody("## Suffix\n\nContent.");
    writeSkillMd(skillMdPath, original);

    // Create the .bak slot first
    writeFileSync(`${skillMdPath}.bak`, "earlier backup", "utf-8");

    const bakPath = backupSkillMd(skillMdPath);

    expect(bakPath).toBe(`${skillMdPath}.bak.1`);
    expect(existsSync(bakPath)).toBe(true);
    expect(readFileSync(bakPath, "utf-8")).toBe(original);
    // Original .bak is untouched
    expect(readFileSync(`${skillMdPath}.bak`, "utf-8")).toBe("earlier backup");
  });

  it("routes in-project backups under .agents/backup/skills-opt (no sibling .bak)", () => {
    // Make tmpDir a project so the canonical backup root applies.
    mkdirSync(join(tmpDir, ".agents"), { recursive: true });
    const skillMdPath = join(tmpDir, ".agents", "skills", "demo", "SKILL.md");
    const original = makeValidSkillBody("## Routed\n\nContent.");
    writeSkillMd(skillMdPath, original);

    const bakPath = backupSkillMd(skillMdPath);

    expect(
      bakPath.startsWith(join(tmpDir, ".agents", "backup", "skills-opt")),
    ).toBe(true);
    expect(readFileSync(bakPath, "utf-8")).toBe(original);
    // no sibling .bak next to the SKILL.md
    expect(existsSync(`${skillMdPath}.bak`)).toBe(false);
  });
});

// --- estimateLiveDispatchCalls ---

describe("estimateLiveDispatchCalls", () => {
  it("returns maxEpochs * (2 + editsPerEpoch)", () => {
    expect(estimateLiveDispatchCalls(4, 3)).toBe(4 * (1 + 1 + 3));
    expect(estimateLiveDispatchCalls(8, 4)).toBe(8 * (1 + 1 + 4));
    expect(estimateLiveDispatchCalls(1, 0)).toBe(1 * 2);
  });
});

// --- confirmLiveRun ---

describe("confirmLiveRun", () => {
  it("returns true and prints preview when --yes is true (no prompt)", async () => {
    const logs: string[] = [];
    const consoleSpy = vi
      .spyOn(console, "log")
      .mockImplementation((...args: unknown[]) => {
        logs.push(String(args[0]));
      });

    const readlineMock = vi.fn((_prompt: string) => Promise.resolve("n"));

    const result = await confirmLiveRun(4, 3, true, readlineMock);

    expect(result).toBe(true);
    // Should NOT have called readline since --yes bypasses it
    expect(readlineMock).not.toHaveBeenCalled();
    // Preview line was printed
    const combined = logs.join(" ");
    expect(combined).toContain("cost preview");
    expect(combined).toContain("model dispatch calls");

    consoleSpy.mockRestore();
  });

  it("returns true when user answers y", async () => {
    const consoleSpy = vi
      .spyOn(console, "log")
      .mockImplementation(() => undefined);

    const readlineMock = vi.fn((_prompt: string) => Promise.resolve("y"));

    const result = await confirmLiveRun(4, 3, false, readlineMock);

    expect(result).toBe(true);
    expect(readlineMock).toHaveBeenCalledTimes(1);
    const promptArg: string = readlineMock.mock.calls[0]?.[0] ?? "";
    expect(promptArg).toContain("Proceed");

    consoleSpy.mockRestore();
  });

  it("returns false when user declines (answers n)", async () => {
    const consoleSpy = vi
      .spyOn(console, "log")
      .mockImplementation(() => undefined);

    const readlineMock = vi.fn((_prompt: string) => Promise.resolve("n"));

    const result = await confirmLiveRun(4, 3, false, readlineMock);

    expect(result).toBe(false);

    consoleSpy.mockRestore();
  });

  it("returns false when user presses enter (empty string)", async () => {
    const consoleSpy = vi
      .spyOn(console, "log")
      .mockImplementation(() => undefined);

    const readlineMock = vi.fn((_prompt: string) => Promise.resolve(""));

    const result = await confirmLiveRun(2, 2, false, readlineMock);

    expect(result).toBe(false);

    consoleSpy.mockRestore();
  });
});

// --- runSkillsOpt OUTPUT layer: dry-run (default) ---

describe("runSkillsOpt OUTPUT layer: --dry-run (default) writes nothing", () => {
  it("does not write SKILL.md and does not create .bak after a dry-run", async () => {
    const skillId = "user-dryrun";
    const taskDir = join(tmpDir, "eval", skillId);
    writeNTasks(taskDir, MIN_TASKS * 2);

    const originalContent = makeValidSkillBody(
      "## Overview\n\nOriginal dry-run content.",
    );
    const skillMdPath = join(tmpDir, "skills", skillId, "SKILL.md");
    writeSkillMd(skillMdPath, originalContent);

    const consoleSpy = vi
      .spyOn(console, "log")
      .mockImplementation(() => undefined);

    // Optimizer proposes an edit that would improve val lift
    const edit: SkillEdit = {
      op: "add",
      anchor: "## Overview",
      after: "\n\n- New rule.",
    };
    const candidateBody = applyEdit(originalContent, edit);
    const scores = new Map<string, number>([
      [originalContent, 0],
      [candidateBody, 0.2],
    ]);
    const scoringFn = makeMockScoringFn(scores, 0);
    const optimizerFn = makeMockOptimizerFn([[edit]]);

    await runSkillsOpt(false, {
      skill: skillId,
      _workspace: tmpDir,
      _taskDir: taskDir,
      _skillMdPath: skillMdPath,
      _optimizerFn: optimizerFn,
      _scoringFn: scoringFn,
      // No --apply flag → dry-run is default
    });

    // SKILL.md must be unchanged
    expect(readFileSync(skillMdPath, "utf-8")).toBe(originalContent);
    // No .bak must exist
    expect(existsSync(`${skillMdPath}.bak`)).toBe(false);

    consoleSpy.mockRestore();
  });
});

// --- runSkillsOpt OUTPUT layer: --apply with improvement ---

describe("runSkillsOpt OUTPUT layer: --apply with improving result", () => {
  it("writes finalSkillMd and creates .bak with original content", async () => {
    const skillId = "user-apply-ok";
    const taskDir = join(tmpDir, "eval", skillId);
    writeNTasks(taskDir, MIN_TASKS * 2);

    const originalContent = makeValidSkillBody(
      "## Overview\n\nOriginal content before apply.",
    );
    const skillMdPath = join(tmpDir, "skills", skillId, "SKILL.md");
    writeSkillMd(skillMdPath, originalContent);

    const consoleSpy = vi
      .spyOn(console, "log")
      .mockImplementation(() => undefined);

    // Optimizer proposes an edit that strictly improves val lift
    const edit: SkillEdit = {
      op: "add",
      anchor: "## Overview",
      after: "\n\n- Improved rule.",
    };
    const candidateBody = applyEdit(originalContent, edit);
    const scores = new Map<string, number>([
      [originalContent, 0],
      [candidateBody, 0.3],
    ]);
    const scoringFn = makeMockScoringFn(scores, 0);
    const optimizerFn = makeMockOptimizerFn([[edit]]);

    await runSkillsOpt(false, {
      skill: skillId,
      apply: true,
      _workspace: tmpDir,
      _taskDir: taskDir,
      _skillMdPath: skillMdPath,
      _optimizerFn: optimizerFn,
      _scoringFn: scoringFn,
    });

    // SKILL.md must contain the final (improved) body
    const writtenContent = readFileSync(skillMdPath, "utf-8");
    expect(writtenContent).toContain("Improved rule.");
    expect(writtenContent).not.toBe(originalContent);

    // .bak must exist with the original content
    const bakPath = `${skillMdPath}.bak`;
    expect(existsSync(bakPath)).toBe(true);
    expect(readFileSync(bakPath, "utf-8")).toBe(originalContent);

    consoleSpy.mockRestore();
  });

  it("JSON output has applied:true after a successful --apply", async () => {
    const skillId = "user-apply-json";
    const taskDir = join(tmpDir, "eval", skillId);
    writeNTasks(taskDir, MIN_TASKS * 2);

    const originalContent = makeValidSkillBody(
      "## Overview\n\nFor JSON apply test.",
    );
    const skillMdPath = join(tmpDir, "skills", skillId, "SKILL.md");
    writeSkillMd(skillMdPath, originalContent);

    const logs: string[] = [];
    const consoleSpy = vi
      .spyOn(console, "log")
      .mockImplementation((...args: unknown[]) => {
        logs.push(String(args[0]));
      });

    const edit: SkillEdit = {
      op: "add",
      anchor: "## Overview",
      after: "\n\n- JSON improvement.",
    };
    const candidateBody = applyEdit(originalContent, edit);
    const scores = new Map<string, number>([
      [originalContent, 0],
      [candidateBody, 0.25],
    ]);
    const scoringFn = makeMockScoringFn(scores, 0);
    const optimizerFn = makeMockOptimizerFn([[edit]]);

    await runSkillsOpt(true, {
      skill: skillId,
      apply: true,
      _workspace: tmpDir,
      _taskDir: taskDir,
      _skillMdPath: skillMdPath,
      _optimizerFn: optimizerFn,
      _scoringFn: scoringFn,
    });

    const parsed = JSON.parse(logs.join("\n")) as Record<string, unknown>;
    expect(parsed.applied).toBe(true);
    expect(parsed._dryRun).toBe(false);

    consoleSpy.mockRestore();
  });
});

// --- runSkillsOpt OUTPUT layer: --apply with NO improvement ---

describe("runSkillsOpt OUTPUT layer: --apply with no improvement writes nothing", () => {
  it("does not write SKILL.md when finalLift <= baselineLift", async () => {
    const skillId = "user-apply-noimprove";
    const taskDir = join(tmpDir, "eval", skillId);
    writeNTasks(taskDir, MIN_TASKS * 2);

    const originalContent = makeValidSkillBody(
      "## Overview\n\nNo improvement case.",
    );
    const skillMdPath = join(tmpDir, "skills", skillId, "SKILL.md");
    writeSkillMd(skillMdPath, originalContent);

    const consoleSpy = vi
      .spyOn(console, "log")
      .mockImplementation(() => undefined);

    // Scoring always returns 0 → no improvement possible
    const scoringFn = makeMockScoringFn(new Map(), 0);
    // Optimizer proposes no edits → no changes
    const optimizerFn = makeMockOptimizerFn([[]]);

    await runSkillsOpt(false, {
      skill: skillId,
      apply: true,
      _workspace: tmpDir,
      _taskDir: taskDir,
      _skillMdPath: skillMdPath,
      _optimizerFn: optimizerFn,
      _scoringFn: scoringFn,
    });

    // SKILL.md must remain unchanged
    expect(readFileSync(skillMdPath, "utf-8")).toBe(originalContent);
    // No .bak
    expect(existsSync(`${skillMdPath}.bak`)).toBe(false);

    consoleSpy.mockRestore();
  });

  it("JSON output has _noImprovement:true when no improvement", async () => {
    const skillId = "user-apply-noimprove-json";
    const taskDir = join(tmpDir, "eval", skillId);
    writeNTasks(taskDir, MIN_TASKS * 2);

    const originalContent = makeValidSkillBody("## Overview\n\nFor JSON.");
    const skillMdPath = join(tmpDir, "skills", skillId, "SKILL.md");
    writeSkillMd(skillMdPath, originalContent);

    const logs: string[] = [];
    const consoleSpy = vi
      .spyOn(console, "log")
      .mockImplementation((...args: unknown[]) => {
        logs.push(String(args[0]));
      });

    const scoringFn = makeMockScoringFn(new Map(), 0);
    const optimizerFn = makeMockOptimizerFn([[]]);

    await runSkillsOpt(true, {
      skill: skillId,
      apply: true,
      _workspace: tmpDir,
      _taskDir: taskDir,
      _skillMdPath: skillMdPath,
      _optimizerFn: optimizerFn,
      _scoringFn: scoringFn,
    });

    const parsed = JSON.parse(logs.join("\n")) as Record<string, unknown>;
    expect(parsed._noImprovement).toBe(true);
    expect(parsed.applied).toBe(false);

    consoleSpy.mockRestore();
  });
});

// --- runSkillsOpt OUTPUT layer: oma-owned guard ---

describe("runSkillsOpt OUTPUT layer: oma-owned guard", () => {
  it("refuses --apply on oma-* skill without --yes, writes nothing", async () => {
    const skillId = "oma-owned-guard";
    const taskDir = join(tmpDir, "eval", skillId);
    writeNTasks(taskDir, MIN_TASKS * 2);

    const originalContent = makeValidSkillBody(
      "## Overview\n\nOma-owned original.",
    );
    const skillMdPath = join(tmpDir, "skills", skillId, "SKILL.md");
    writeSkillMd(skillMdPath, originalContent);

    const warnLogs: string[] = [];
    const consoleSpy = vi
      .spyOn(console, "log")
      .mockImplementation(() => undefined);
    const warnSpy = vi
      .spyOn(console, "warn")
      .mockImplementation((...args: unknown[]) => {
        warnLogs.push(String(args[0]));
      });

    // Optimizer proposes an improving edit
    const edit: SkillEdit = {
      op: "add",
      anchor: "## Overview",
      after: "\n\n- Oma rule.",
    };
    const candidateBody = applyEdit(originalContent, edit);
    const scores = new Map<string, number>([
      [originalContent, 0],
      [candidateBody, 0.2],
    ]);
    const scoringFn = makeMockScoringFn(scores, 0);
    const optimizerFn = makeMockOptimizerFn([[edit]]);

    // --apply without --yes on oma-owned skill
    await runSkillsOpt(false, {
      skill: skillId,
      apply: true,
      yes: false,
      _workspace: tmpDir,
      _taskDir: taskDir,
      _skillMdPath: skillMdPath,
      _optimizerFn: optimizerFn,
      _scoringFn: scoringFn,
    });

    // Must NOT write to SKILL.md
    expect(readFileSync(skillMdPath, "utf-8")).toBe(originalContent);
    // Must NOT create .bak
    expect(existsSync(`${skillMdPath}.bak`)).toBe(false);
    // Must warn about oma-owned
    const allWarns = warnLogs.join(" ");
    expect(allWarns).toMatch(/oma-owned/i);
    expect(allWarns).toMatch(/oma update/i);

    consoleSpy.mockRestore();
    warnSpy.mockRestore();
  });

  it("JSON output has _omaOwnedRefused:true without --yes", async () => {
    const skillId = "oma-guard-json";
    const taskDir = join(tmpDir, "eval", skillId);
    writeNTasks(taskDir, MIN_TASKS * 2);

    const originalContent = makeValidSkillBody("## Overview\n\nOma JSON.");
    const skillMdPath = join(tmpDir, "skills", skillId, "SKILL.md");
    writeSkillMd(skillMdPath, originalContent);

    const logs: string[] = [];
    const consoleSpy = vi
      .spyOn(console, "log")
      .mockImplementation((...args: unknown[]) => {
        logs.push(String(args[0]));
      });

    const edit: SkillEdit = {
      op: "add",
      anchor: "## Overview",
      after: "\n\n- Oma JSON rule.",
    };
    const candidateBody = applyEdit(originalContent, edit);
    const scores = new Map<string, number>([
      [originalContent, 0],
      [candidateBody, 0.2],
    ]);
    const scoringFn = makeMockScoringFn(scores, 0);
    const optimizerFn = makeMockOptimizerFn([[edit]]);

    await runSkillsOpt(true, {
      skill: skillId,
      apply: true,
      yes: false,
      _workspace: tmpDir,
      _taskDir: taskDir,
      _skillMdPath: skillMdPath,
      _optimizerFn: optimizerFn,
      _scoringFn: scoringFn,
    });

    const parsed = JSON.parse(logs.join("\n")) as Record<string, unknown>;
    expect(parsed._omaOwnedRefused).toBe(true);
    expect(parsed.applied).toBe(false);

    consoleSpy.mockRestore();
  });

  it("proceeds and writes when oma-owned skill has --yes", async () => {
    const skillId = "oma-with-yes";
    const taskDir = join(tmpDir, "eval", skillId);
    writeNTasks(taskDir, MIN_TASKS * 2);

    const originalContent = makeValidSkillBody("## Overview\n\nOma yes case.");
    const skillMdPath = join(tmpDir, "skills", skillId, "SKILL.md");
    writeSkillMd(skillMdPath, originalContent);

    const consoleSpy = vi
      .spyOn(console, "log")
      .mockImplementation(() => undefined);

    const edit: SkillEdit = {
      op: "add",
      anchor: "## Overview",
      after: "\n\n- Oma yes rule.",
    };
    const candidateBody = applyEdit(originalContent, edit);
    const scores = new Map<string, number>([
      [originalContent, 0],
      [candidateBody, 0.2],
    ]);
    const scoringFn = makeMockScoringFn(scores, 0);
    const optimizerFn = makeMockOptimizerFn([[edit]]);

    await runSkillsOpt(false, {
      skill: skillId,
      apply: true,
      yes: true, // --yes bypasses oma-owned guard
      _workspace: tmpDir,
      _taskDir: taskDir,
      _skillMdPath: skillMdPath,
      _optimizerFn: optimizerFn,
      _scoringFn: scoringFn,
    });

    // Should have written the improved content
    const written = readFileSync(skillMdPath, "utf-8");
    expect(written).toContain("Oma yes rule.");
    // .bak must exist
    expect(existsSync(`${skillMdPath}.bak`)).toBe(true);

    consoleSpy.mockRestore();
  });
});

// --- runSkillsOpt OUTPUT layer: --live cost preview ---

describe("runSkillsOpt OUTPUT layer: --live cost preview", () => {
  it("prints cost estimate before running the loop", async () => {
    const skillId = "user-live-preview";
    const taskDir = join(tmpDir, "eval", skillId);
    writeNTasks(taskDir, MIN_TASKS * 2);

    const logs: string[] = [];
    const consoleSpy = vi
      .spyOn(console, "log")
      .mockImplementation((...args: unknown[]) => {
        logs.push(String(args[0]));
      });

    const scoringFn = makeMockScoringFn(new Map(), 0);
    const optimizerFn = makeMockOptimizerFn([[]]);

    // _readline returns "y" so the loop proceeds (but mock scoring does nothing)
    const readlineMock = vi.fn((_prompt: string) => Promise.resolve("y"));

    await runSkillsOpt(false, {
      skill: skillId,
      live: true,
      yes: false,
      _workspace: tmpDir,
      _taskDir: taskDir,
      _optimizerFn: optimizerFn,
      _scoringFn: scoringFn,
      _readline: readlineMock,
    });

    const combined = logs.join(" ");
    expect(combined).toContain("cost preview");
    expect(combined).toContain("model dispatch calls");
    expect(combined).toMatch(/\d+ model dispatch calls/);

    consoleSpy.mockRestore();
  });

  it("--yes bypasses the readline prompt entirely", async () => {
    const skillId = "user-live-yes";
    const taskDir = join(tmpDir, "eval", skillId);
    writeNTasks(taskDir, MIN_TASKS * 2);

    const consoleSpy = vi
      .spyOn(console, "log")
      .mockImplementation(() => undefined);

    const scoringFn = makeMockScoringFn(new Map(), 0);
    const optimizerFn = makeMockOptimizerFn([[]]);

    const readlineMock = vi.fn((_prompt: string) => Promise.resolve("n"));

    // --yes means readline is never called even if it returns "n"
    await runSkillsOpt(false, {
      skill: skillId,
      live: true,
      yes: true,
      _workspace: tmpDir,
      _taskDir: taskDir,
      _optimizerFn: optimizerFn,
      _scoringFn: scoringFn,
      _readline: readlineMock,
    });

    // readline was NOT called
    expect(readlineMock).not.toHaveBeenCalled();

    consoleSpy.mockRestore();
  });

  it("user decline → no dispatch (exits 0, loop never runs)", async () => {
    const skillId = "user-live-decline";
    const taskDir = join(tmpDir, "eval", skillId);
    writeNTasks(taskDir, MIN_TASKS * 2);

    const consoleSpy = vi
      .spyOn(console, "log")
      .mockImplementation(() => undefined);

    // Track whether the scoring fn is called (it should NOT be after decline)
    let scoringCallCount = 0;
    const scoringFn: ScoringFn = async (_opts): Promise<SkillUtilityReport> => {
      scoringCallCount++;
      return makeMockReport(0);
    };

    const optimizerCallCount = { n: 0 };
    const optimizerFn: OptimizerFn = () => {
      optimizerCallCount.n++;
      return [];
    };

    // Decline
    const readlineMock = vi.fn((_prompt: string) => Promise.resolve("n"));

    await runSkillsOpt(false, {
      skill: skillId,
      live: true,
      yes: false,
      _workspace: tmpDir,
      _taskDir: taskDir,
      _optimizerFn: optimizerFn,
      _scoringFn: scoringFn,
      _readline: readlineMock,
    });

    // Neither scoring nor optimizer should have been called
    expect(scoringCallCount).toBe(0);
    expect(optimizerCallCount.n).toBe(0);

    consoleSpy.mockRestore();
  });

  it("decline in JSON mode emits aborted JSON and no error", async () => {
    const skillId = "user-live-decline-json";
    const taskDir = join(tmpDir, "eval", skillId);
    writeNTasks(taskDir, MIN_TASKS * 2);

    const logs: string[] = [];
    const consoleSpy = vi
      .spyOn(console, "log")
      .mockImplementation((...args: unknown[]) => {
        logs.push(String(args[0]));
      });

    const scoringFn = makeMockScoringFn(new Map(), 0);
    const optimizerFn = makeMockOptimizerFn([[]]);
    const readlineMock = vi.fn((_prompt: string) => Promise.resolve("n"));

    await runSkillsOpt(true, {
      skill: skillId,
      live: true,
      yes: false,
      _workspace: tmpDir,
      _taskDir: taskDir,
      _optimizerFn: optimizerFn,
      _scoringFn: scoringFn,
      _readline: readlineMock,
    });

    // The cost-preview line is printed before the aborted JSON.
    // Find the JSON blob among the logged lines.
    const jsonLine = logs.find((l) => l.trimStart().startsWith("{"));
    expect(jsonLine).toBeDefined();
    const parsed = JSON.parse(jsonLine ?? "{}") as Record<string, unknown>;
    expect(parsed.aborted).toBe(true);

    consoleSpy.mockRestore();
  });
});

// ============================================================
// Security regression tests: atomic write + dirname fix (M3 QA)
// ============================================================

describe("atomic write: --apply uses tmp+rename, no .tmp left on disk after success", () => {
  it("live file equals finalSkillMd and .bak equals original after successful --apply", async () => {
    const skillId = "user-atomic-write";
    const taskDir = join(tmpDir, "eval", skillId);
    writeNTasks(taskDir, MIN_TASKS * 2);

    const originalContent = makeValidSkillBody(
      "## Overview\n\nAtomic write original.",
    );
    const skillMdPath = join(tmpDir, "skills", skillId, "SKILL.md");
    writeSkillMd(skillMdPath, originalContent);

    const consoleSpy = vi
      .spyOn(console, "log")
      .mockImplementation(() => undefined);

    const edit: SkillEdit = {
      op: "add",
      anchor: "## Overview",
      after: "\n\n- Atomic rule.",
    };
    const candidateBody = applyEdit(originalContent, edit);
    const scores = new Map<string, number>([
      [originalContent, 0],
      [candidateBody, 0.3],
    ]);
    const scoringFn = makeMockScoringFn(scores, 0);
    const optimizerFn = makeMockOptimizerFn([[edit]]);

    await runSkillsOpt(false, {
      skill: skillId,
      apply: true,
      _workspace: tmpDir,
      _taskDir: taskDir,
      _skillMdPath: skillMdPath,
      _optimizerFn: optimizerFn,
      _scoringFn: scoringFn,
    });

    // Live SKILL.md must contain the final (improved) body
    const liveContent = readFileSync(skillMdPath, "utf-8");
    expect(liveContent).toContain("Atomic rule.");
    expect(liveContent).not.toBe(originalContent);

    // .bak must have the original content (backup taken BEFORE rename)
    const bakContent = readFileSync(`${skillMdPath}.bak`, "utf-8");
    expect(bakContent).toBe(originalContent);

    // .tmp must NOT exist after a successful apply (rename consumed it)
    expect(existsSync(`${skillMdPath}.tmp`)).toBe(false);

    consoleSpy.mockRestore();
  });

  it("no .tmp file is left on disk when apply finds no improvement", async () => {
    const skillId = "user-atomic-noimprove";
    const taskDir = join(tmpDir, "eval", skillId);
    writeNTasks(taskDir, MIN_TASKS * 2);

    const originalContent = makeValidSkillBody(
      "## Overview\n\nStable content.",
    );
    const skillMdPath = join(tmpDir, "skills", skillId, "SKILL.md");
    writeSkillMd(skillMdPath, originalContent);

    const consoleSpy = vi
      .spyOn(console, "log")
      .mockImplementation(() => undefined);

    const scoringFn = makeMockScoringFn(new Map(), 0);
    const optimizerFn = makeMockOptimizerFn([[]]);

    await runSkillsOpt(false, {
      skill: skillId,
      apply: true,
      _workspace: tmpDir,
      _taskDir: taskDir,
      _skillMdPath: skillMdPath,
      _optimizerFn: optimizerFn,
      _scoringFn: scoringFn,
    });

    // No improvement → no write → no .tmp, no .bak, live file unchanged
    expect(readFileSync(skillMdPath, "utf-8")).toBe(originalContent);
    expect(existsSync(`${skillMdPath}.tmp`)).toBe(false);
    expect(existsSync(`${skillMdPath}.bak`)).toBe(false);

    consoleSpy.mockRestore();
  });
});

describe("dirname fix: skillDir derived from dirname(skillMdPath), not string-slice", () => {
  it("creates nested skill directory correctly on a path without trailing /SKILL.md slice edge", async () => {
    const skillId = "user-dirname-check";
    const taskDir = join(tmpDir, "eval", skillId);
    writeNTasks(taskDir, MIN_TASKS * 2);

    // Use a custom _skillMdPath with unusual nesting to stress the dirname fix
    const customDir = join(tmpDir, "nested", "deep", skillId);
    const skillMdPath = join(customDir, "SKILL.md");

    const originalContent = makeValidSkillBody("## Overview\n\nDirname test.");
    mkdirSync(customDir, { recursive: true });
    writeFileSync(skillMdPath, originalContent, "utf-8");

    const consoleSpy = vi
      .spyOn(console, "log")
      .mockImplementation(() => undefined);

    const edit: SkillEdit = {
      op: "add",
      anchor: "## Overview",
      after: "\n\n- dirname rule.",
    };
    const candidateBody = applyEdit(originalContent, edit);
    const scores = new Map<string, number>([
      [originalContent, 0],
      [candidateBody, 0.2],
    ]);
    const scoringFn = makeMockScoringFn(scores, 0);
    const optimizerFn = makeMockOptimizerFn([[edit]]);

    await runSkillsOpt(false, {
      skill: skillId,
      apply: true,
      _workspace: tmpDir,
      _taskDir: taskDir,
      _skillMdPath: skillMdPath,
      _optimizerFn: optimizerFn,
      _scoringFn: scoringFn,
    });

    // File was written into the dirname-resolved path, not a string-slice path
    const liveContent = readFileSync(skillMdPath, "utf-8");
    expect(liveContent).toContain("dirname rule.");
    // .bak is in the same directory as SKILL.md (dirname result)
    expect(existsSync(`${skillMdPath}.bak`)).toBe(true);
    // .tmp cleaned up by rename
    expect(existsSync(`${skillMdPath}.tmp`)).toBe(false);

    consoleSpy.mockRestore();
  });
});
