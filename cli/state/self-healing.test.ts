import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  evaluateSelfHealingGate,
  renderSelfHealingGateResult,
} from "./self-healing.js";

describe("self-healing gate", () => {
  let workspace: string;

  beforeEach(() => {
    workspace = mkdtempSync(join(tmpdir(), "oma-self-healing-"));
  });

  afterEach(() => {
    rmSync(workspace, { recursive: true, force: true });
  });

  function git(args: string[]) {
    execFileSync("git", args, { cwd: workspace, stdio: "ignore" });
  }

  function initRepo() {
    git(["init", "--quiet", "-b", "main"]);
    git(["config", "user.email", "test@example.com"]);
    git(["config", "user.name", "Test User"]);
    writeFileSync(join(workspace, "tracked.txt"), "initial\n");
    git(["add", "tracked.txt"]);
    git(["commit", "--quiet", "-m", "init"]);
  }

  function writeSkill(agentType: string, requiredArtifact: string) {
    const dir = join(workspace, ".agents", "skills", `oma-${agentType}`);
    mkdirSync(dir, { recursive: true });
    writeFileSync(
      join(dir, "SKILL.md"),
      `---\nname: oma-${agentType}\ndescription: test\n---\n\n### Expected outputs\n\n\`\`\`yaml\noutputs:\n  - name: report\n    artifact: "${requiredArtifact}"\n    required: true\n\`\`\`\n`,
    );
  }

  it("blocks outside a git worktree", () => {
    const result = evaluateSelfHealingGate({
      workspace,
      agentType: "debug",
    });

    expect(result.ok).toBe(false);
    expect(result.reasons).toContain("not-a-git-worktree");
    expect(result.reasons).toContain("no-git-tracked-changes");
  });

  it("ignores untracked files for the git snapshot gate", () => {
    initRepo();
    writeSkill("debug", "report.md");
    writeFileSync(join(workspace, "report.md"), "ok\n");
    writeFileSync(join(workspace, "untracked.txt"), "new\n");

    const result = evaluateSelfHealingGate({
      workspace,
      agentType: "debug",
    });

    expect(result.ok).toBe(false);
    expect(result.git.trackedChanges).toEqual([]);
    expect(result.reasons).toContain("no-git-tracked-changes");
  });

  it("allows self-healing when tracked changes and required skill metadata are present", () => {
    initRepo();
    writeSkill("debug", "report.md");
    writeFileSync(join(workspace, "report.md"), "ok\n");
    writeFileSync(join(workspace, "tracked.txt"), "changed\n");

    const result = evaluateSelfHealingGate({
      workspace,
      agentType: "debug",
    });

    expect(result.ok).toBe(true);
    expect(result.reasons).toEqual([]);
    expect(result.git.trackedChanges).toEqual(["tracked.txt"]);
    expect(result.skill).toMatchObject({
      agentType: "debug",
      hasStructuredOutputs: true,
      missingRequired: [],
    });
  });

  it("blocks when required skill artifacts are missing", () => {
    initRepo();
    writeSkill("debug", "report.md");
    writeFileSync(join(workspace, "tracked.txt"), "changed\n");

    const result = evaluateSelfHealingGate({
      workspace,
      agentType: "debug",
    });

    expect(result.ok).toBe(false);
    expect(result.reasons).toContain("missing-required-skill-artifacts");
    expect(result.skill.missingRequired).toEqual(["report"]);
  });

  it("renders check output with blockers and tracked changes", () => {
    initRepo();
    writeSkill("debug", "report.md");
    writeFileSync(join(workspace, "tracked.txt"), "changed\n");

    const output = renderSelfHealingGateResult(
      evaluateSelfHealingGate({
        workspace,
        agentType: "debug",
      }),
    );

    expect(output).toContain("OMA self-healing check");
    expect(output).toContain("status:");
    expect(output).toContain("blocked");
    expect(output).toContain("tracked.txt");
    expect(output).toContain("missing-required-skill-artifacts");
  });
});
