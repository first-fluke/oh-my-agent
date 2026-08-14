import {
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
  it("records a live paired run and deterministically replays it in mock mode", async () => {
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
      _materializeVendor: () => undefined,
    });

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
    expect(replay?.score).toEqual(live?.score);
    expect(replay?.runs).toEqual(live?.runs);
    expect(log).toHaveBeenCalledTimes(2);
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
