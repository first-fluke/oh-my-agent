import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  applyCandidateOverlay,
  computeBaselineHash,
  evaluateChecks,
  type HarnessArmRun,
  loadHarnessSuite,
  runHarnessLive,
  scoreHarnessRuns,
  validateCandidateOverlay,
} from "./eval.js";

const tempDirs: string[] = [];

function makeTempDir(): string {
  const dir = mkdtempSync(join(tmpdir(), "oma-harness-eval-"));
  tempDirs.push(dir);
  return dir;
}

function writeSuite(root: string, workspace = "fixtures/task-one"): string {
  const suitePath = join(root, "suite.yaml");
  writeFileSync(
    suitePath,
    [
      "schema_version: 1",
      "id: docs-harness",
      "agent: docs-curator",
      "tasks:",
      "  - id: task-one",
      "    prompt: Fix the stale documentation reference.",
      `    workspace: ${workspace}`,
      "    weight: 2",
      "    checks:",
      "      - type: file_contains",
      "        path: docs/api.md",
      "        value: openSession",
      "      - type: file_not_contains",
      "        path: docs/api.md",
      "        value: createSession",
    ].join("\n"),
    "utf-8",
  );
  return suitePath;
}

function makeRun(
  taskId: string,
  arm: "baseline" | "candidate",
  passed: boolean,
): HarnessArmRun {
  return {
    taskId,
    arm,
    passed,
    durationMs: 10,
    output: "",
    checks: [],
  };
}

afterEach(() => {
  for (const dir of tempDirs.splice(0)) rmSync(dir, { recursive: true });
});

describe("loadHarnessSuite", () => {
  it("loads a valid suite and resolves fixture paths from the suite directory", () => {
    const root = makeTempDir();
    mkdirSync(join(root, "fixtures", "task-one"), { recursive: true });

    const suite = loadHarnessSuite(writeSuite(root), root);

    expect(suite.id).toBe("docs-harness");
    expect(suite.agent).toBe("docs-curator");
    expect(suite.tasks[0]?.workspace).toBe(join(root, "fixtures", "task-one"));
    expect(suite.tasks[0]?.weight).toBe(2);
  });

  it("rejects a fixture workspace that escapes the project root", () => {
    const root = makeTempDir();
    expect(() =>
      loadHarnessSuite(writeSuite(root, "../outside"), root),
    ).toThrow(/project root/i);
  });

  it("rejects duplicate task ids", () => {
    const root = makeTempDir();
    mkdirSync(join(root, "fixtures", "task-one"), { recursive: true });
    const suitePath = writeSuite(root);
    const duplicate = readFileSync(suitePath, "utf-8").replace(
      "  - id: task-one",
      "  - id: task-one",
    );
    writeFileSync(
      suitePath,
      `${duplicate}\n  - id: task-one\n    prompt: Duplicate.\n    workspace: fixtures/task-one\n    checks:\n      - type: file_exists\n        path: docs/api.md\n`,
      "utf-8",
    );

    expect(() => loadHarnessSuite(suitePath, root)).toThrow(/duplicate/i);
  });

  it("rejects an unsafe target agent identifier", () => {
    const root = makeTempDir();
    mkdirSync(join(root, "fixtures", "task-one"), { recursive: true });
    const suitePath = writeSuite(root);
    writeFileSync(
      suitePath,
      readFileSync(suitePath, "utf-8").replace(
        "agent: docs-curator",
        "agent: ../../escape",
      ),
      "utf-8",
    );

    expect(() => loadHarnessSuite(suitePath, root)).toThrow(/agent/i);
  });

  it("rejects fixture-owned vendor harness files", () => {
    const root = makeTempDir();
    mkdirSync(join(root, "fixtures", "task-one", ".codex", "skills"), {
      recursive: true,
    });

    expect(() => loadHarnessSuite(writeSuite(root), root)).toThrow(
      /harness control/i,
    );
  });
});

describe("candidate overlay safety", () => {
  it("accepts and applies only harness definition files", () => {
    const candidate = makeTempDir();
    const target = makeTempDir();
    const skillDir = join(candidate, ".agents", "skills", "oma-example");
    mkdirSync(skillDir, { recursive: true });
    writeFileSync(join(skillDir, "SKILL.md"), "# Candidate\n", "utf-8");

    const manifest = validateCandidateOverlay(candidate, candidate);
    applyCandidateOverlay(manifest, target);

    expect(manifest.files).toEqual([".agents/skills/oma-example/SKILL.md"]);
    expect(
      readFileSync(
        join(target, ".agents", "skills", "oma-example", "SKILL.md"),
        "utf-8",
      ),
    ).toBe("# Candidate\n");
  });

  it("changes the candidate hash when overlay content changes", () => {
    const project = makeTempDir();
    const candidate = join(project, "candidate");
    const skillDir = join(candidate, ".agents", "skills", "oma-example");
    mkdirSync(skillDir, { recursive: true });
    const skillPath = join(skillDir, "SKILL.md");
    writeFileSync(skillPath, "first", "utf-8");
    const before = validateCandidateOverlay(candidate, project).hash;
    writeFileSync(skillPath, "second", "utf-8");

    expect(validateCandidateOverlay(candidate, project).hash).not.toBe(before);
  });

  it("rejects hooks and other evaluator-control files", () => {
    const candidate = makeTempDir();
    const hooksDir = join(candidate, ".agents", "hooks");
    mkdirSync(hooksDir, { recursive: true });
    writeFileSync(join(hooksDir, "before.ts"), "export {};", "utf-8");

    expect(() => validateCandidateOverlay(candidate, candidate)).toThrow(
      /not allowed/i,
    );
  });

  it("rejects symlinks in a candidate overlay", () => {
    const candidate = makeTempDir();
    const outside = join(makeTempDir(), "outside.md");
    const skillDir = join(candidate, ".agents", "skills", "oma-example");
    mkdirSync(skillDir, { recursive: true });
    writeFileSync(outside, "secret", "utf-8");
    symlinkSync(outside, join(skillDir, "SKILL.md"));

    expect(() => validateCandidateOverlay(candidate, candidate)).toThrow(
      /symbolic link/i,
    );
  });

  it("rejects vendor variants that could change the model or permissions", () => {
    const candidate = makeTempDir();
    const variantsDir = join(candidate, ".agents", "agents", "variants");
    mkdirSync(variantsDir, { recursive: true });
    writeFileSync(join(variantsDir, "codex.json"), "{}", "utf-8");

    expect(() => validateCandidateOverlay(candidate, candidate)).toThrow(
      /variant/i,
    );
  });

  it("rejects agent frontmatter that changes execution controls", () => {
    const project = makeTempDir();
    const candidate = join(project, "candidate");
    const baselineAgents = join(project, ".agents", "agents");
    const candidateAgents = join(candidate, ".agents", "agents");
    mkdirSync(baselineAgents, { recursive: true });
    mkdirSync(candidateAgents, { recursive: true });
    writeFileSync(
      join(baselineAgents, "docs-curator.md"),
      "---\nmodel: fixed\ntools: read\n---\nBaseline\n",
      "utf-8",
    );
    writeFileSync(
      join(candidateAgents, "docs-curator.md"),
      "---\nmodel: stronger\ntools: read\n---\nCandidate\n",
      "utf-8",
    );

    expect(() => validateCandidateOverlay(candidate, project)).toThrow(
      /model/i,
    );
  });
});

describe("baseline provenance", () => {
  it("ignores generated results that are not copied into evaluation arms", () => {
    const project = makeTempDir();
    const skillDir = join(project, ".agents", "skills", "oma-example");
    const resultsDir = join(project, ".agents", "results");
    mkdirSync(skillDir, { recursive: true });
    mkdirSync(resultsDir, { recursive: true });
    writeFileSync(join(skillDir, "SKILL.md"), "stable", "utf-8");
    writeFileSync(join(resultsDir, "progress.md"), "before", "utf-8");
    const before = computeBaselineHash(project);
    writeFileSync(join(resultsDir, "progress.md"), "after", "utf-8");

    expect(computeBaselineHash(project)).toBe(before);
  });
});

describe("evaluateChecks", () => {
  it("scores file existence and positive/negative content checks", () => {
    const workspace = makeTempDir();
    mkdirSync(join(workspace, "docs"), { recursive: true });
    writeFileSync(
      join(workspace, "docs", "api.md"),
      "Use openSession now.",
      "utf-8",
    );

    const results = evaluateChecks(workspace, "finished", [
      { type: "file_exists", path: "docs/api.md" },
      { type: "file_contains", path: "docs/api.md", value: "openSession" },
      {
        type: "file_not_contains",
        path: "docs/api.md",
        value: "createSession",
      },
      { type: "output_contains", value: "finished" },
    ]);

    expect(results.every((result) => result.passed)).toBe(true);
  });

  it("does not allow a check path to escape the evaluated workspace", () => {
    const workspace = makeTempDir();
    expect(() =>
      evaluateChecks(workspace, "", [
        { type: "file_exists", path: "../secret" },
      ]),
    ).toThrow(/workspace/i);
  });

  it("fails content checks when the target file was deleted", () => {
    const workspace = makeTempDir();
    const [result] = evaluateChecks(workspace, "", [
      { type: "file_not_contains", path: "docs/api.md", value: "stale" },
    ]);

    expect(result?.passed).toBe(false);
  });
});

describe("scoreHarnessRuns", () => {
  it("reports lift, corrections, and regressions from paired task outcomes", () => {
    const tasks = [
      { id: "a", weight: 2 },
      { id: "b", weight: 1 },
      { id: "c", weight: 1 },
      { id: "d", weight: 1 },
      { id: "e", weight: 1 },
    ];
    const runs = [
      makeRun("a", "baseline", false),
      makeRun("a", "candidate", true),
      makeRun("b", "baseline", true),
      makeRun("b", "candidate", false),
      ...["c", "d", "e"].flatMap((id) => [
        makeRun(id, "baseline", true),
        makeRun(id, "candidate", true),
      ]),
    ];

    const score = scoreHarnessRuns(tasks, runs);

    expect(score.baselineScore).toBeCloseTo(4 / 6);
    expect(score.candidateScore).toBeCloseTo(5 / 6);
    expect(score.lift).toBeCloseTo(1 / 6);
    expect(score.correctedTaskIds).toEqual(["a"]);
    expect(score.regressedTaskIds).toEqual(["b"]);
    expect(score.coverage).toBe("ok");
    expect(score.decision).toBe("fail");
  });

  it("does not issue a pass/fail verdict below five tasks", () => {
    const score = scoreHarnessRuns(
      [{ id: "a", weight: 1 }],
      [makeRun("a", "baseline", false), makeRun("a", "candidate", true)],
    );

    expect(score.coverage).toBe("insufficient");
    expect(score.decision).toBe("insufficient");
  });
});

describe("runHarnessLive", () => {
  it("runs paired isolated workspaces and exposes the overlay only to the candidate arm", () => {
    const projectRoot = makeTempDir();
    const fixture = join(projectRoot, "eval", "fixtures", "task-one");
    const baseSkill = join(projectRoot, ".agents", "skills", "oma-example");
    const candidateRoot = join(projectRoot, "candidate");
    const candidateSkill = join(
      candidateRoot,
      ".agents",
      "skills",
      "oma-example",
    );
    mkdirSync(join(fixture, "docs"), { recursive: true });
    mkdirSync(baseSkill, { recursive: true });
    mkdirSync(candidateSkill, { recursive: true });
    writeFileSync(join(fixture, "docs", "api.md"), "createSession", "utf-8");
    writeFileSync(join(baseSkill, "SKILL.md"), "BASELINE", "utf-8");
    writeFileSync(join(candidateSkill, "SKILL.md"), "CANDIDATE", "utf-8");
    const suitePath = join(projectRoot, "eval", "suite.yaml");
    writeFileSync(
      suitePath,
      [
        "schema_version: 1",
        "id: isolation",
        "agent: docs-curator",
        "tasks:",
        "  - id: task-one",
        "    prompt: Fix it.",
        "    workspace: fixtures/task-one",
        "    checks:",
        "      - type: file_contains",
        "        path: docs/api.md",
        "        value: openSession",
      ].join("\n"),
      "utf-8",
    );
    const suite = loadHarnessSuite(suitePath, projectRoot);
    const candidate = validateCandidateOverlay(candidateRoot, projectRoot);
    const observedBodies: string[] = [];

    const result = runHarnessLive({
      projectRoot,
      suite,
      candidate,
      vendor: "codex",
      materializeVendor: () => undefined,
      dispatch: ({ workspace }) => {
        const body = readFileSync(
          join(workspace, ".agents", "skills", "oma-example", "SKILL.md"),
          "utf-8",
        );
        observedBodies.push(body);
        if (body === "CANDIDATE") {
          writeFileSync(
            join(workspace, "docs", "api.md"),
            "openSession",
            "utf-8",
          );
        }
        return body;
      },
    });

    expect(observedBodies).toEqual(["BASELINE", "CANDIDATE"]);
    expect(result.runs.map((run) => run.passed)).toEqual([false, true]);
    expect(result.score.correctedTaskIds).toEqual(["task-one"]);
  });

  it("fails an arm that mutates protected harness definitions during execution", () => {
    const projectRoot = makeTempDir();
    const fixture = join(projectRoot, "eval", "fixtures", "task-one");
    const baseSkill = join(projectRoot, ".agents", "skills", "oma-example");
    const candidateRoot = join(projectRoot, "candidate");
    const candidateSkill = join(
      candidateRoot,
      ".agents",
      "skills",
      "oma-example",
    );
    mkdirSync(join(fixture, "docs"), { recursive: true });
    mkdirSync(baseSkill, { recursive: true });
    mkdirSync(candidateSkill, { recursive: true });
    writeFileSync(join(fixture, "docs", "api.md"), "stale", "utf-8");
    writeFileSync(join(baseSkill, "SKILL.md"), "BASELINE", "utf-8");
    writeFileSync(join(candidateSkill, "SKILL.md"), "CANDIDATE", "utf-8");
    const suitePath = join(projectRoot, "eval", "suite.yaml");
    writeFileSync(
      suitePath,
      [
        "schema_version: 1",
        "id: mutation",
        "agent: docs-curator",
        "tasks:",
        "  - id: task-one",
        "    prompt: Fix it.",
        "    workspace: fixtures/task-one",
        "    checks:",
        "      - type: file_contains",
        "        path: docs/api.md",
        "        value: fixed",
      ].join("\n"),
      "utf-8",
    );
    const suite = loadHarnessSuite(suitePath, projectRoot);
    const candidate = validateCandidateOverlay(candidateRoot, projectRoot);

    const result = runHarnessLive({
      projectRoot,
      suite,
      candidate,
      vendor: "codex",
      materializeVendor: () => undefined,
      dispatch: ({ arm, workspace }) => {
        writeFileSync(join(workspace, "docs", "api.md"), "fixed", "utf-8");
        if (arm === "candidate") {
          writeFileSync(
            join(workspace, ".agents", "skills", "oma-example", "SKILL.md"),
            "TAMPERED",
            "utf-8",
          );
        }
        return "done";
      },
    });

    expect(result.runs[0]?.passed).toBe(true);
    expect(result.runs[1]?.passed).toBe(false);
    expect(result.runs[1]?.dispatchError).toMatch(/protected harness/i);
  });
});
