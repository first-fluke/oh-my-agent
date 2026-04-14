import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { parseInlineTasks, parseTasksFile } from "./tasks.js";

describe("agent/tasks.ts", () => {
  const tempDirs: string[] = [];

  afterEach(() => {
    for (const dir of tempDirs) {
      rmSync(dir, { recursive: true, force: true });
    }
    tempDirs.length = 0;
  });

  it("parses inline tasks with optional workspace suffix", () => {
    expect(
      parseInlineTasks([
        "backend:implement auth:./apps/api",
        "qa:review auth flow",
      ]),
    ).toEqual([
      {
        agent: "backend",
        task: "implement auth",
        workspace: "./apps/api",
      },
      {
        agent: "qa",
        task: "review auth flow",
      },
    ]);
  });

  it("throws on invalid inline task format", () => {
    expect(() => parseInlineTasks(["backend-only"])).toThrow(
      'Invalid task format: "backend-only"',
    );
  });

  it("parses yaml task files", () => {
    const dir = mkdtempSync(join(tmpdir(), "oma-agent-tasks-"));
    tempDirs.push(dir);
    const file = join(dir, "tasks.yaml");
    writeFileSync(
      file,
      [
        "tasks:",
        "  - agent: backend",
        "    task: implement auth",
        "    workspace: ./apps/api",
        "  - agent: qa",
        "    task: verify auth",
      ].join("\n"),
    );

    expect(parseTasksFile(file)).toEqual([
      {
        agent: "backend",
        task: "implement auth",
        workspace: "./apps/api",
      },
      {
        agent: "qa",
        task: "verify auth",
      },
    ]);
  });
});
