import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  ensureMemorySchema,
  getCompletedTasksCount,
  getCoordinationStoreDirs,
  getRecentAgentActivities,
  getResultsPath,
  getSessionSummary,
  listMemoryFiles,
  resolveCoordinationFile,
} from "./memory.js";

describe("canonical result reports", () => {
  let root: string;

  beforeEach(() => {
    root = mkdtempSync(join(tmpdir(), "oma-report-layout-"));
  });
  afterEach(() => rmSync(root, { recursive: true, force: true }));

  function write(relativePath: string, content: string): string {
    const target = join(root, relativePath);
    mkdirSync(dirname(target), { recursive: true });
    writeFileSync(target, content);
    return target;
  }

  it("prefers the results report over both legacy copies without counting duplicates", () => {
    const filename = "result-backend-task-run-session.md";
    write(`.serena/memories/${filename}`, "## Status: failed\nTask: legacy");
    write(`.agents/state/memories/${filename}`, "## Status: failed\nTask: old");
    const canonical = write(
      `.agents/results/${filename}`,
      "## Status: completed\nTask: canonical",
    );

    expect(resolveCoordinationFile(root, filename)).toBe(canonical);
    expect(getCompletedTasksCount(root)).toBe(1);
    expect(getSessionSummary(root).completedTasks).toEqual(["canonical"]);
    expect(getRecentAgentActivities(root)).toHaveLength(1);
    expect(listMemoryFiles(root)).toEqual([filename]);
  });

  it("retains old reports and progress while excluding unrelated result artifacts", () => {
    const legacy = write(
      ".serena/memories/result-qa-old.md",
      "Status: completed\nTask: QA",
    );
    write(
      ".agents/state/memories/progress-backend-task-run-session.md",
      "Current: API",
    );
    write(".agents/results/task-board.md", "Status: completed");
    write(".agents/results/research.md", "Status: completed");
    write(".agents/results/architecture/adr.md", "ADR");

    expect(resolveCoordinationFile(root, "result-qa-old.md")).toBe(legacy);
    expect(resolveCoordinationFile(root, "task-board.md")).toBeNull();
    expect(getCompletedTasksCount(root)).toBe(1);
    expect(getSessionSummary(root).inProgressTasks).toEqual(["API"]);
    expect(listMemoryFiles(root).sort()).toEqual([
      "progress-backend-task-run-session.md",
      "result-qa-old.md",
    ]);
    expect(getCoordinationStoreDirs(root)).not.toContain(getResultsPath(root));
  });

  it("keeps initialization writes in state even when results contain lookalike notes", () => {
    const unrelated = write(".agents/results/task-board.md", "User artifact");
    const initialized = ensureMemorySchema(root);

    expect(initialized.memoriesDir).toBe(join(root, ".agents/state/memories"));
    expect(initialized.created).toContain("task-board.md");
    expect(readFileSync(unrelated, "utf8")).toBe("User artifact");
  });
});
