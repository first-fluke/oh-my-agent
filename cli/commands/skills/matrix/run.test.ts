import {
  existsSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { saveMatrixReport } from "./report.js";
import {
  matrixReportFailed,
  renderMatrixReport,
  runSkillsMatrix,
} from "./run.js";
import type { MatrixInvocation, MatrixRun, MatrixSuite } from "./types.js";

const directories: string[] = [];
afterEach(() => {
  for (const directory of directories.splice(0))
    rmSync(directory, { recursive: true, force: true });
});

function fixtureSuite(): string {
  const root = mkdtempSync(join(tmpdir(), "oma-matrix-run-test-"));
  directories.push(root);
  const suite: MatrixSuite = {
    schemaVersion: 1,
    cases: [
      {
        id: "review",
        skill: "matrix-review",
        prompt: "Perform a matrix review and return its JSON response.",
        files: {
          "SKILL.md":
            '---\nname: matrix-review\ndescription: Use for a matrix review.\n---\nReturn exactly {"ok":true}.\n',
        },
        expected: { ok: true },
      },
    ],
  };
  const path = join(root, "suite.json");
  writeFileSync(path, JSON.stringify(suite));
  return path;
}

function successfulRun(input: MatrixInvocation): MatrixRun {
  const skillPath = join(
    input.workspace,
    input.vendor === "claude" ? ".claude" : ".agents",
    "skills",
    "matrix-review",
    "SKILL.md",
  );
  return {
    exitCode: 0,
    complete: true,
    nativeSuccess: true,
    output: '{"ok":true}',
    reads: [
      {
        path: skillPath,
        success: true,
        missing: false,
        content: readFileSync(skillPath, "utf8"),
      },
    ],
    activations: [],
    cliVersion: "fixture-cli 1",
    model: input.model ?? "fixture-model",
    durationMs: 1,
  };
}

describe("skill matrix planning and execution", () => {
  it("plans six diagnostic cells without calling a CLI or asking for confirmation", async () => {
    const run = vi.fn();
    const confirm = vi.fn();
    const report = await runSkillsMatrix({}, { run, confirm });
    expect(report).toMatchObject({
      mode: "plan",
      status: "planned",
      plannedCalls: 6,
      cells: [],
      summary: { measured: 0, pass: 0 },
    });
    expect(run).not.toHaveBeenCalled();
    expect(confirm).not.toHaveBeenCalled();
    expect(matrixReportFailed(report)).toBe(false);
    expect(renderMatrixReport(report)).toContain(
      "compatibility has not been measured",
    );
  });

  it.each([
    [{ vendors: "claude,claude" }, "duplicates"],
    [{ vendors: "qwen" }, "Unsupported matrix vendor"],
    [{ vendors: "" }, "nonempty"],
    [{ cases: "" }, "nonempty"],
    [{ suite: "" }, "--suite"],
    [{ cases: "absent" }, "Unknown matrix case"],
    [{ timeoutSeconds: 0 }, "--timeout-seconds"],
    [{ timeoutSeconds: 601 }, "--timeout-seconds"],
    [{ claudeModel: "" }, "Model names"],
  ])(
    "rejects invalid selection before dispatch: %j",
    async (options, message) => {
      const run = vi.fn();
      await expect(runSkillsMatrix(options, { run })).rejects.toThrow(message);
      expect(run).not.toHaveBeenCalled();
    },
  );

  it("reports a cancelled live run without claiming any measurement", async () => {
    const run = vi.fn();
    const confirm = vi.fn().mockResolvedValue(false);
    const report = await runSkillsMatrix({ live: true }, { run, confirm });
    expect(confirm).toHaveBeenCalledWith(
      expect.stringContaining("6 native CLI invocations"),
    );
    expect(run).not.toHaveBeenCalled();
    expect(report.status).toBe("cancelled");
    expect(matrixReportFailed(report)).toBe(true);
  });

  it("measures selected native paths independently and removes all cell workspaces", async () => {
    const workspaces: string[] = [];
    const run = vi.fn(async (input: MatrixInvocation) => {
      workspaces.push(input.workspace);
      expect(input.prompt).not.toContain("SKILL.md");
      expect(input.prompt).not.toContain('"ok":true');
      return successfulRun(input);
    });
    const report = await runSkillsMatrix(
      {
        suite: fixtureSuite(),
        live: true,
        yes: true,
        claudeModel: "fixture-claude",
        codexModel: "fixture-codex",
      },
      { run },
    );
    expect(run).toHaveBeenCalledTimes(2);
    expect(new Set(workspaces).size).toBe(2);
    expect(workspaces.every((path) => !existsSync(path))).toBe(true);
    expect(report.summary).toMatchObject({ pass: 2, measured: 2 });
    expect(matrixReportFailed(report)).toBe(false);
    expect(report.cells.map((cell) => cell.model)).toEqual([
      "fixture-claude",
      "fixture-codex",
    ]);
    expect(JSON.stringify(report)).not.toContain("Return exactly");
  });

  it("continues other vendors after a dispatch error and keeps failure details generic", async () => {
    const run = vi.fn(async (input: MatrixInvocation) => {
      if (input.vendor === "claude")
        throw new Error("credential-secret-from-vendor");
      return successfulRun(input);
    });
    const report = await runSkillsMatrix(
      { suite: fixtureSuite(), live: true, yes: true },
      { run },
    );
    expect(report.cells.map((cell) => cell.status)).toEqual(["error", "pass"]);
    expect(report.summary.measured).toBe(2);
    expect(matrixReportFailed(report)).toBe(true);
    expect(JSON.stringify(report)).not.toContain("credential-secret");
  });

  it("does not dispatch a second cell after interruption and removes signal listeners", async () => {
    const controller = new AbortController();
    const before = process.listenerCount("SIGINT");
    const workspaces: string[] = [];
    const run = vi.fn(async (input: MatrixInvocation) => {
      workspaces.push(input.workspace);
      controller.abort();
      return successfulRun(input);
    });
    const report = await runSkillsMatrix(
      { suite: fixtureSuite(), live: true, yes: true },
      { run, signal: controller.signal },
    );
    expect(run).toHaveBeenCalledTimes(1);
    expect(report.status).toBe("interrupted");
    expect(matrixReportFailed(report)).toBe(true);
    expect(process.listenerCount("SIGINT")).toBe(before);
    expect(workspaces.every((path) => !existsSync(path))).toBe(true);
  });

  it("saves structured reports without overwriting an existing file", async () => {
    const suite = fixtureSuite();
    const path = join(suite, "..", "report.json");
    const report = await runSkillsMatrix({ suite });
    saveMatrixReport(path, report);
    expect(JSON.parse(readFileSync(path, "utf8"))).toEqual(report);
    expect(() => saveMatrixReport(path, report)).toThrow();
    expect(readFileSync(suite, "utf8")).toContain("matrix-review");
  });
});
