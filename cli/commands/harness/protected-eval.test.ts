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
import { stringify } from "yaml";
import { evaluateChecks } from "./checks.js";
import { validateCandidateOverlay } from "./overlay.js";
import { runHarnessEval } from "./run.js";
import { runHarnessLive } from "./runner.js";
import { scoreHarnessRuns } from "./scoring.js";
import { loadHarnessSuite, selectHarnessTasks } from "./suite.js";
import {
  type CommandCheck,
  evaluateTrustedCommand,
  snapshotTrustedCheckers,
} from "./trusted-checks.js";

const roots: string[] = [];
function required<T>(value: T | undefined): T {
  if (value === undefined) throw new Error("Missing test fixture");
  return value;
}
function project() {
  const root = mkdtempSync(join(tmpdir(), "oma-harness-protection-"));
  roots.push(root);
  const candidateRoot = join(root, "candidate");
  for (const prefix of [root, candidateRoot]) {
    const skill = join(prefix, ".agents", "skills", "example");
    mkdirSync(skill, { recursive: true });
    writeFileSync(
      join(skill, "SKILL.md"),
      prefix === root ? "baseline" : "candidate",
    );
  }
  const suitePath = join(root, "suite.yaml");
  const raw = {
    schema_version: 2,
    id: "protected",
    agent: "docs-curator",
    tasks: ["validation", "final-test"].map((partition) => {
      const workspace = `fixtures/${partition}`;
      mkdirSync(join(root, workspace), { recursive: true });
      writeFileSync(join(root, workspace, "input.txt"), `${partition} input`);
      return {
        id: partition,
        partition,
        prompt: `Complete the ${partition} task.`,
        workspace,
        checks: [
          {
            type: "file_json_equals",
            path: "state.json",
            pointer: "/complete",
            value: true,
          },
        ],
      };
    }),
  };
  writeFileSync(suitePath, stringify(raw));
  return { root, suitePath, candidateRoot, raw };
}
function command(checker = "verify.mjs", timeout_ms = 5_000): CommandCheck {
  return {
    type: "command",
    checker,
    argv: [process.execPath, "{checker}"],
    timeout_ms,
    expected_exit_code: 0,
  };
}

afterEach(() => {
  vi.restoreAllMocks();
  process.exitCode = undefined;
  for (const root of roots.splice(0))
    rmSync(root, { recursive: true, force: true });
});

describe("evaluation integrity", () => {
  it("cannot pass from apparent lift when an evaluator or dispatch failed", () => {
    const tasks = [1, 2, 3, 4, 5].map((id) => ({ id: String(id), weight: 1 }));
    const runs = tasks.flatMap((task) => [
      {
        taskId: task.id,
        arm: "baseline" as const,
        passed: false,
        durationMs: 1,
        output: "",
        checks: [],
        dispatchError: "Trusted evaluator source changed",
      },
      {
        taskId: task.id,
        arm: "candidate" as const,
        passed: true,
        durationMs: 1,
        output: "",
        checks: [],
      },
    ]);
    expect(scoreHarnessRuns(tasks, runs).decision).toBe("fail");
  });
});

describe("structured behavior assertions", () => {
  it("requires exact JSON state even when the agent claims success", () => {
    const { root } = project();
    writeFileSync(
      join(root, "state.json"),
      '{"complete":false,"nested":{"a/b":null}}',
    );
    const results = evaluateChecks(root, "All tests passed. complete: true", [
      {
        type: "file_json_equals",
        path: "state.json",
        pointer: "/complete",
        value: true,
      },
      { type: "output_json_equals", value: { complete: true } },
      {
        type: "file_json_equals",
        path: "state.json",
        pointer: "/nested/a~1b",
        value: null,
      },
    ]);
    expect(results.map((result) => result.passed)).toEqual([
      false,
      false,
      true,
    ]);
  });
});

describe("final-test partition", () => {
  it("dispatches only the selected partition without suite/check definitions or the other fixture", () => {
    const setup = project();
    const suite = loadHarnessSuite(setup.suitePath, setup.root);
    const candidate = validateCandidateOverlay(setup.candidateRoot, setup.root);
    const prompts: string[] = [];
    const result = runHarnessLive({
      projectRoot: setup.root,
      suite,
      candidate,
      partition: "final-test",
      vendor: "codex",
      materializeVendor: () => undefined,
      dispatch: ({ prompt, workspace }) => {
        prompts.push(prompt);
        expect(existsSync(join(workspace, "suite.yaml"))).toBe(false);
        expect(readdirSync(workspace)).not.toContain("fixtures");
        expect(readFileSync(join(workspace, "input.txt"), "utf-8")).toBe(
          "final-test input",
        );
        expect(prompt).not.toContain("state.json");
        expect(prompt).not.toContain("checks");
        writeFileSync(join(workspace, "state.json"), '{"complete":true}');
        return "done";
      },
    });
    expect(prompts).toEqual([
      "Complete the final-test task.",
      "Complete the final-test task.",
    ]);
    expect(result.runs.map((run) => run.taskId)).toEqual([
      "final-test",
      "final-test",
    ]);
    expect(result.partition).toBe("final-test");
    expect(result.evaluatorHash).toMatch(/^[a-f0-9]{64}$/);
    expect(result.promotionReady).toBe(false);
    expect(result.promotionBlockers.join(" ")).toMatch(/confinement/);
  });

  it("rejects missing partitions, reused fixture directories, and suite files inside visible fixtures", () => {
    const setup = project();
    required(setup.raw.tasks[1]).workspace = required(
      setup.raw.tasks[0],
    ).workspace;
    writeFileSync(setup.suitePath, stringify(setup.raw));
    expect(() => loadHarnessSuite(setup.suitePath, setup.root)).toThrow(
      /separate directories/,
    );
    setup.raw.tasks.splice(1);
    writeFileSync(setup.suitePath, stringify(setup.raw));
    expect(() => loadHarnessSuite(setup.suitePath, setup.root)).toThrow(
      /final-test task/,
    );
    setup.raw.schema_version = 1;
    delete (setup.raw.tasks[0] as { partition?: string }).partition;
    required(setup.raw.tasks[0]).workspace = ".";
    writeFileSync(setup.suitePath, stringify(setup.raw));
    expect(() => loadHarnessSuite(setup.suitePath, setup.root)).toThrow(
      /harness control|evaluator suite/,
    );
  });

  it("rejects evaluator definitions copied through baseline or candidate harness files", () => {
    const setup = project();
    const baselineSuite = join(
      setup.root,
      ".agents",
      "skills",
      "example",
      "suite.yaml",
    );
    writeFileSync(baselineSuite, readFileSync(setup.suitePath));
    expect(() => loadHarnessSuite(baselineSuite, setup.root)).toThrow(
      /copied baseline/,
    );
    const suite = loadHarnessSuite(setup.suitePath, setup.root);
    const candidateSuite = join(
      setup.candidateRoot,
      ".agents",
      "skills",
      "example",
      "suite.yaml",
    );
    writeFileSync(candidateSuite, readFileSync(setup.suitePath));
    suite.sourcePath = candidateSuite;
    expect(() =>
      snapshotTrustedCheckers(
        suite,
        setup.root,
        validateCandidateOverlay(setup.candidateRoot, setup.root),
      ),
    ).toThrow(/separate.*candidate/);
  });

  it("keeps legacy suites exploratory and refuses to label them final-test", () => {
    const setup = project();
    setup.raw.schema_version = 1;
    for (const task of setup.raw.tasks)
      delete (task as { partition?: string }).partition;
    writeFileSync(setup.suitePath, stringify(setup.raw));
    const suite = loadHarnessSuite(setup.suitePath, setup.root);
    expect(() => selectHarnessTasks(suite, "final-test")).toThrow(
      /partitioned/,
    );
    const result = runHarnessLive({
      projectRoot: setup.root,
      suite,
      candidate: validateCandidateOverlay(setup.candidateRoot, setup.root),
      vendor: "codex",
      dispatch: () => "done",
      materializeVendor: () => undefined,
    });
    expect(result.partition).toBe("exploratory");
    expect(result.promotionReady).toBe(false);
    expect(result.promotionBlockers.join(" ")).toMatch(/Legacy suite/);
  });

  it("rejects a record destination that would expose final checks to a later candidate", async () => {
    const setup = project();
    await expect(
      runHarnessEval(true, {
        suite: setup.suitePath,
        candidate: setup.candidateRoot,
        mock: true,
        partition: "final-test",
        recordFile: "fixtures/validation/record.json",
        _projectRoot: setup.root,
      }),
    ).rejects.toThrow(/recording must be separate/);
  });

  it("rejects a validation recording reused for final-test even through an explicit record path", async () => {
    const setup = project();
    vi.spyOn(console, "log").mockImplementation(() => undefined);
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    const recordFile = join(setup.root, "record.json");
    await runHarnessEval(true, {
      suite: setup.suitePath,
      candidate: setup.candidateRoot,
      live: true,
      record: true,
      recordFile,
      yes: true,
      partition: "validation",
      _projectRoot: setup.root,
      _vendor: "codex",
      _materializeVendor: () => undefined,
      _dispatch: ({ workspace }) => {
        writeFileSync(join(workspace, "state.json"), '{"complete":true}');
        return "done";
      },
    });
    await expect(
      runHarnessEval(true, {
        suite: setup.suitePath,
        candidate: setup.candidateRoot,
        mock: true,
        recordFile,
        partition: "final-test",
        _projectRoot: setup.root,
      }),
    ).rejects.toThrow(/partition/);
  });
});

describe("trusted command evaluator", () => {
  it("runs immutable checker bytes after dispatch in a fresh copy and ignores success prose", () => {
    const setup = project();
    const check = command();
    writeFileSync(
      join(setup.root, check.checker),
      'import { readFileSync, writeFileSync } from "node:fs"; writeFileSync("checker-ran", "yes"); process.exit(JSON.parse(readFileSync("state.json", "utf8")).complete ? 0 : 42);',
    );
    const suite = loadHarnessSuite(setup.suitePath, setup.root);
    required(suite.tasks[0]).checks = [check];
    const observed: string[] = [];
    const result = runHarnessLive({
      projectRoot: setup.root,
      suite,
      candidate: validateCandidateOverlay(setup.candidateRoot, setup.root),
      vendor: "codex",
      materializeVendor: () => undefined,
      dispatch: ({ arm, workspace }) => {
        expect(existsSync(join(workspace, "verify.mjs"))).toBe(false);
        expect(existsSync(join(workspace, "checker-ran"))).toBe(false);
        observed.push(workspace);
        writeFileSync(join(workspace, "state.json"), '{"complete":false}');
        if (arm === "candidate") {
          writeFileSync(join(setup.root, check.checker), "process.exit(0)");
          required(suite.tasks[0]).checks = [
            { type: "output_contains", value: "success" },
          ];
        }
        return "success; all tests passed";
      },
    });
    expect(result.runs.map((run) => run.checks[0]?.passed)).toEqual([
      false,
      false,
    ]);
    expect(result.runs.map((run) => run.checks[0]?.exitCode)).toEqual([42, 42]);
    expect(result.runs[1]?.dispatchError).toMatch(/evaluator source/);
    expect(result.runs[0]?.checks[0]?.checkerHash).toEqual(
      result.runs[1]?.checks[0]?.checkerHash,
    );
    expect(observed[0]).not.toBe(observed[1]);
  });

  it("records exit codes and timeout failure from the trusted subprocess", () => {
    const setup = project();
    const suite = loadHarnessSuite(setup.suitePath, setup.root);
    const passing = command("passing.mjs");
    const hanging = command("hanging.mjs", 30);
    const literal = command("literal.mjs");
    literal.argv.push("$(exit 99); literal");
    writeFileSync(join(setup.root, "passing.mjs"), "process.exit(0)");
    writeFileSync(
      join(setup.root, "hanging.mjs"),
      "setInterval(() => {}, 1000)",
    );
    writeFileSync(
      join(setup.root, "literal.mjs"),
      'process.exit(process.argv[2] === "$(exit 99); literal" ? 0 : 1)',
    );
    required(suite.tasks[0]).checks = [passing, hanging, literal];
    const snapshots = snapshotTrustedCheckers(
      suite,
      setup.root,
      validateCandidateOverlay(setup.candidateRoot, setup.root),
    );
    const results = [passing, hanging, literal].map((check) =>
      evaluateTrustedCommand(
        required(suite.tasks[0]).workspace,
        check,
        snapshots.get(JSON.stringify(check)),
      ),
    );
    expect(results[0]).toMatchObject({
      passed: true,
      exitCode: 0,
      timedOut: false,
    });
    expect(results[1]).toMatchObject({
      passed: false,
      exitCode: null,
      timedOut: true,
    });
    expect(results[2]).toMatchObject({ passed: true, exitCode: 0 });
    expect(readdirSync(required(suite.tasks[0]).workspace)).toEqual([
      "input.txt",
    ]);
  });

  it("invalidates recordings when only trusted checker bytes change", async () => {
    const setup = project();
    const check = command();
    writeFileSync(join(setup.root, check.checker), "process.exit(0)");
    writeFileSync(
      setup.suitePath,
      stringify({
        ...setup.raw,
        tasks: setup.raw.tasks.map((task) => ({ ...task, checks: [check] })),
      }),
    );
    vi.spyOn(console, "log").mockImplementation(() => undefined);
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    const recordFile = join(setup.root, "record.json");
    await runHarnessEval(true, {
      suite: setup.suitePath,
      candidate: setup.candidateRoot,
      live: true,
      record: true,
      recordFile,
      yes: true,
      partition: "validation",
      _projectRoot: setup.root,
      _vendor: "codex",
      _materializeVendor: () => undefined,
      _dispatch: () => "done",
    });
    writeFileSync(join(setup.root, check.checker), "process.exit(1)");
    await expect(
      runHarnessEval(true, {
        suite: setup.suitePath,
        candidate: setup.candidateRoot,
        mock: true,
        recordFile,
        partition: "validation",
        _projectRoot: setup.root,
      }),
    ).rejects.toThrow(/evaluator/);
  });

  it("rejects candidate-visible checker files and invalid command contracts", () => {
    const setup = project();
    const suite = loadHarnessSuite(setup.suitePath, setup.root);
    const check = command("fixtures/validation/verify.mjs");
    writeFileSync(join(setup.root, check.checker), "process.exit(0)");
    required(suite.tasks[0]).checks = [check];
    expect(() =>
      snapshotTrustedCheckers(
        suite,
        setup.root,
        validateCandidateOverlay(setup.candidateRoot, setup.root),
      ),
    ).toThrow(/separate/);
    const raw = {
      ...setup.raw,
      tasks: setup.raw.tasks.map((task) => ({
        ...task,
        checks: [{ ...command(), argv: ["node", "{checker}"], timeout_ms: 0 }],
      })),
    };
    writeFileSync(setup.suitePath, stringify(raw));
    expect(() => loadHarnessSuite(setup.suitePath, setup.root)).toThrow(
      /Invalid harness suite/,
    );
  });
});
