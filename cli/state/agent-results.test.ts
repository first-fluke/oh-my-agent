import { execFileSync } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { PASS_COMMAND, writeTestPlan } from "./__fixtures__/task-contract.js";
import {
  beginAgentRun,
  finishAgentRun,
  hasCurrentChecks,
  listAgentRuns,
  resultEvidenceValid,
  verifyAgentRun,
  workspaceFingerprint,
} from "./agent-results.js";

describe("agent execution evidence", () => {
  let root: string;
  beforeEach(() => {
    root = mkdtempSync(join(tmpdir(), "oma-evidence-"));
  });
  afterEach(() => {
    rmSync(root, { recursive: true, force: true });
  });
  const start = (planned = true) => {
    if (planned && !existsSync(join(root, ".agents/results/plan-s1.json")))
      writeTestPlan(root);
    return beginAgentRun({
      root,
      workspace: root,
      agentId: "qa-reviewer",
      taskId: "T1",
      sessionId: "s1",
      vendor: "test",
    });
  };
  const claim = {
    status: "completed",
    changedFiles: [],
    unresolved: [],
    artifacts: [],
  };
  const pass = [process.execPath, "-e", "process.exit(0)"];

  it("distinguishes exit zero without a result from completion", () => {
    const run = start();
    const result = finishAgentRun(root, run.runId, 0);
    expect(result.status).toBe("partial");
    expect(result.unresolved.join()).toContain("Missing or invalid");
  });
  it("records actual command status and rejects failed checks even with a waiver", () => {
    const run = start();
    expect(
      verifyAgentRun(root, run.runId, [
        process.execPath,
        "-e",
        "process.exit(7)",
      ]).exitCode,
    ).toBe(7);
    const result = finishAgentRun(root, run.runId, 0, {
      ...claim,
      verificationSkipped: "This waiver cannot override a failed check",
    });
    expect(result.status).toBe("failed");
    expect(resultEvidenceValid(result)).toBe(false);
  });
  it("marks a signaled process failed rather than treating null as zero", () => {
    expect(finishAgentRun(root, start().runId, null, claim).status).toBe(
      "failed",
    );
  });
  it("binds artifacts and current source content to verification", () => {
    writeFileSync(join(root, "source.ts"), "one");
    mkdirSync(join(root, ".agents/results"), { recursive: true });
    writeFileSync(join(root, ".agents/results/report.md"), "verified");
    const run = start();
    verifyAgentRun(root, run.runId, pass);
    const result = finishAgentRun(root, run.runId, 0, {
      ...claim,
      artifacts: [".agents/results/report.md"],
    });
    expect(resultEvidenceValid(result)).toBe(true);
    writeFileSync(join(root, "source.ts"), "two");
    expect(resultEvidenceValid(result)).toBe(false);
    writeFileSync(join(root, "source.ts"), "one");
    writeFileSync(join(root, ".agents/results/report.md"), "rewritten");
    expect(resultEvidenceValid(result)).toBe(false);
  });
  it("rejects code edited after verification and requires a new run after finish", () => {
    const run = start();
    verifyAgentRun(root, run.runId, pass);
    writeFileSync(join(root, "new.ts"), "new code");
    expect(finishAgentRun(root, run.runId, 0, claim).status).not.toBe(
      "completed",
    );
    expect(() => verifyAgentRun(root, run.runId, pass)).toThrow("finished run");
  });
  it("allows explicit non-executable inspection but does not count it as executable proof", () => {
    const result = finishAgentRun(root, start(false).runId, 0, {
      ...claim,
      verificationSkipped:
        "Read the spelling-only change and checked the rendered text",
    });
    expect(result.status).toBe("completed");
    expect(resultEvidenceValid(result, false)).toBe(true);
    expect(resultEvidenceValid(result)).toBe(false);
  });
  it("does not promote unresolved or malformed claims", () => {
    expect(
      finishAgentRun(root, start().runId, 0, {
        ...claim,
        unresolved: ["Missing API"],
      }).status,
    ).toBe("partial");
    expect(finishAgentRun(root, start().runId, 0, {}).status).toBe("partial");
    expect(
      finishAgentRun(root, start().runId, 0, { ...claim, status: "blocked" })
        .status,
    ).toBe("blocked");
  });
  it("keeps sessions and repeated agent runs separate", () => {
    const first = start();
    const second = start();
    expect(first.runId).not.toBe(second.runId);
    expect(listAgentRuns(root)).toHaveLength(2);
  });

  it("does not silently discard a corrupted run and reuse older evidence", () => {
    start();
    const latest = start();
    writeFileSync(
      join(root, ".agents/state/agent-runs", `${latest.runId}.json`),
      "{}",
    );
    expect(() => listAgentRuns(root)).toThrow("Invalid agent run record");
  });
  it("a successful rerun supersedes only the identical failed command", () => {
    const run = {
      ...start(),
      after: "hash",
      checks: [
        {
          command: PASS_COMMAND,
          checkId: "acceptance",
          cwd: root,
          startedAt: "",
          finishedAt: "",
          before: "hash",
          after: "hash",
          exitCode: 1,
        },
        {
          command: PASS_COMMAND,
          checkId: "acceptance",
          cwd: root,
          startedAt: "",
          finishedAt: "",
          before: "hash",
          after: "hash",
          exitCode: 0,
        },
      ],
    };
    expect(hasCurrentChecks(run)).toBe(true);
    const failed = run.checks[0];
    if (!failed) throw new Error("Missing test fixture");
    run.checks.push({ ...failed, command: ["different-test"] });
    expect(hasCurrentChecks(run)).toBe(false);
  });
  it("hashes tracked and untracked content while ignoring generated receipts", () => {
    execFileSync("git", ["init", "--quiet", root]);
    writeFileSync(join(root, "tracked.txt"), "original");
    execFileSync("git", ["add", "tracked.txt"], { cwd: root });
    const initial = workspaceFingerprint(root);
    writeFileSync(join(root, "tracked.txt"), "changed");
    expect(workspaceFingerprint(root)).not.toBe(initial);
    writeFileSync(join(root, "tracked.txt"), "original");
    expect(workspaceFingerprint(root)).toBe(initial);
    start();
    expect(workspaceFingerprint(root)).toBe(initial);
    writeFileSync(join(root, "untracked.txt"), "new");
    expect(workspaceFingerprint(root)).not.toBe(initial);
  });
});
