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
import { readEvents, sessionsDir } from "../../../state/events.js";
import { createNoneMemoryProvider } from "../../../state/memory-provider.js";
import type { SkillUtilityReport } from "../eval.js";
import { runSkillsOpt } from "../opt.js";

function utility(lift: number): SkillUtilityReport {
  return {
    skill: "persistent-skill",
    taskCount: 1,
    skippedFiles: [],
    baselineScore: 0,
    treatmentScore: lift,
    utilityLift: lift,
    utilityStdDev: 0,
    findings: [],
    negativeTransfer: [],
    decision: lift > 0 ? "pass" : "fail",
    coverage: "ok",
    isolation: "n/a",
  };
}

describe("persistent SkillOpt integration", () => {
  const workspaces: string[] = [];

  afterEach(() => {
    vi.restoreAllMocks();
    for (const workspace of workspaces.splice(0)) {
      rmSync(workspace, { recursive: true, force: true });
    }
  });

  it("records a dry-run evolution without modifying SKILL.md", async () => {
    const workspace = mkdtempSync(join(tmpdir(), "oma-opt-persistent-"));
    workspaces.push(workspace);
    const taskDir = join(workspace, ".agents", "eval", "persistent-skill");
    mkdirSync(taskDir, { recursive: true });
    for (let index = 0; index < 5; index++) {
      writeFileSync(
        join(taskDir, `task-${index}.yaml`),
        [
          `id: task-${index}`,
          "skill: persistent-skill",
          "domain: test",
          `prompt: prompt-${index}`,
          "checker:",
          "  type: assert",
          "  expect_contains:",
          "    - ok",
          "weight: 1",
        ].join("\n"),
        "utf-8",
      );
    }
    const skillPath = join(workspace, "skills", "persistent-skill", "SKILL.md");
    mkdirSync(join(workspace, "skills", "persistent-skill"), {
      recursive: true,
    });
    const original =
      "---\nname: Persistent\ndescription: Persistent test.\n---\n\n## Rules\n";
    writeFileSync(skillPath, original, "utf-8");
    vi.spyOn(console, "log").mockImplementation(() => undefined);

    await runSkillsOpt(true, {
      skill: "persistent-skill",
      _workspace: workspace,
      _taskDir: taskDir,
      _skillMdPath: skillPath,
      _memoryProvider: createNoneMemoryProvider(),
      _optimizerFn: () => [
        { op: "add", anchor: "## Rules", after: "\n- improved" },
      ],
      _scoringFn: async (options) =>
        utility(options.body.includes("improved") ? 0.2 : 0),
    });

    expect(readFileSync(skillPath, "utf-8")).toBe(original);
    const sessions = readdirSync(sessionsDir(workspace)).filter(
      (entry) => entry !== "_index.json",
    );
    expect(sessions).toHaveLength(1);
    const kinds = readEvents(workspace, sessions[0] ?? "").map(
      (event) => event.kind,
    );
    expect(kinds).toContain("skill.evolution.started");
    expect(kinds).toContain("skill.proposal.gated");
    expect(kinds).toContain("skill.evolution.completed");
    expect(
      existsSync(
        join(
          workspace,
          ".agents",
          "results",
          "skill-evolution",
          "persistent-skill",
          `${sessions[0]}.jsonl`,
        ),
      ),
    ).toBe(true);
  });
});
