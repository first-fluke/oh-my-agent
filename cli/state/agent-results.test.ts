import { execFileSync } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { withStateIndexLock } from "../../.agents/hooks/core/state-index-lock.ts";
import { PASS_COMMAND, writeTestPlan } from "./__fixtures__/task-contract.js";
import {
  beginAgentRun,
  claimPath,
  finishAgentRun,
  hasCurrentChecks,
  listAgentRuns,
  RUN_OUTPUT_LIMIT,
  readAgentRun,
  resultEvidenceValid,
  verifyAgentRun,
  workspaceFingerprint,
} from "./agent-results.js";
import { runtimeStateDir } from "./project-runtime.js";

describe("agent execution evidence", () => {
  let root: string;
  beforeEach(() => {
    root = mkdtempSync(join(tmpdir(), "oma-evidence-"));
  });
  afterEach(() => {
    process.env.OMA_PROFILE = "0";
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
  it("preserves the tail of the runner log as the run's observed output", () => {
    const run = start();
    const logPath = join(root, "runner.log");
    const big = `${"x".repeat(RUN_OUTPUT_LIMIT)}TAIL`;
    writeFileSync(logPath, big);
    const result = finishAgentRun(root, run.runId, 1, claim, { logPath });
    expect(result.output).toMatchObject({
      bytes: RUN_OUTPUT_LIMIT,
      truncated: true,
    });
    const kept = readFileSync(join(root, result.output?.path ?? ""), "utf8");
    expect(kept.endsWith("TAIL")).toBe(true);
    expect(kept.length).toBe(RUN_OUTPUT_LIMIT);
    expect(readAgentRun(root, run.runId).output).toEqual(result.output);
    // A missing or empty log leaves the record without an output field.
    const silent = start();
    expect(
      finishAgentRun(root, silent.runId, 1, claim, {
        logPath: join(root, "absent.log"),
      }).output,
    ).toBeUndefined();
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
      join(runtimeStateDir(root, "agent-runs"), `${latest.runId}.json`),
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

  it("isolates run records, claims, and sequence numbers for two profiles in one checkout", () => {
    const first = start(false);
    const firstDirectory = runtimeStateDir(root, "agent-runs");
    writeFileSync(claimPath(root, first.runId), JSON.stringify(claim));
    process.env.OMA_PROFILE = "1";
    expect(listAgentRuns(root)).toEqual([]);
    expect(() => readAgentRun(root, first.runId)).toThrow();
    expect(existsSync(claimPath(root, first.runId))).toBe(false);
    const second = start(false);
    expect(second.sequence).toBe(1);
    expect(runtimeStateDir(root, "agent-runs")).not.toBe(firstDirectory);
    expect(listAgentRuns(root).map((run) => run.runId)).toEqual([second.runId]);
    process.env.OMA_PROFILE = "0";
    expect(start(false).sequence).toBe(2);
    expect(finishAgentRun(root, first.runId, 0).status).toBe("partial");
  });

  it("allows another profile to dispatch while the first profile holds its runtime lock", () => {
    const first = start(false);
    const source = new URL("./agent-results.ts", import.meta.url).href;
    const script = `import { beginAgentRun } from ${JSON.stringify(source)};
      const root = process.env.OMA_TEST_RUNTIME_ROOT;
      const run = beginAgentRun({ root, workspace: root, agentId: 'qa-reviewer', sessionId: 's1', taskId: 'T1', vendor: 'test' });
      console.log(JSON.stringify({ sequence: run.sequence, runId: run.runId }));`;
    const second = withStateIndexLock(root, () =>
      JSON.parse(
        execFileSync("bun", ["-e", script], {
          encoding: "utf8",
          timeout: 6000,
          env: {
            ...process.env,
            OMA_PROFILE: "1",
            OMA_TEST_RUNTIME_ROOT: root,
          },
        }),
      ),
    ) as { sequence: number; runId: string };
    expect(second.sequence).toBe(1);
    expect(listAgentRuns(root).map((run) => run.runId)).toEqual([first.runId]);
    if (process.platform !== "win32") {
      expect(statSync(runtimeStateDir(root, "agent-runs")).mode & 0o777).toBe(
        0o700,
      );
      expect(
        statSync(
          join(runtimeStateDir(root, "agent-runs"), `${first.runId}.json`),
        ).mode & 0o777,
      ).toBe(0o600);
    }
  });

  it("ignores old project runs, claims, and sequence counters without migrating or deleting them", () => {
    const run = start(false);
    const canonical = runtimeStateDir(root, "agent-runs");
    const legacy = join(root, ".agents/state/agent-runs");
    mkdirSync(legacy, { recursive: true });
    writeFileSync(join(legacy, `${run.runId}.json`), JSON.stringify(run));
    writeFileSync(join(legacy, "_sequence.json"), "17");
    rmSync(join(canonical, `${run.runId}.json`));
    rmSync(join(canonical, "_sequence.json"));
    const legacyClaim = join(legacy, `${run.runId}.claim.json`);
    writeFileSync(
      legacyClaim,
      JSON.stringify({
        ...claim,
        verificationSkipped: "Reviewed the existing legacy execution evidence",
      }),
    );
    expect(claimPath(root, run.runId)).toBe(
      join(canonical, `${run.runId}.claim.json`),
    );
    expect(listAgentRuns(root)).toEqual([]);
    expect(() => readAgentRun(root, run.runId)).toThrow();
    expect(() => finishAgentRun(root, run.runId, 0)).toThrow();
    expect(start(false).sequence).toBe(1);
    expect(existsSync(join(canonical, "_sequence.json"))).toBe(true);
    expect(readFileSync(join(legacy, "_sequence.json"), "utf8")).toBe("17");
    expect(existsSync(legacyClaim)).toBe(true);
    expect(
      JSON.parse(readFileSync(join(legacy, `${run.runId}.json`), "utf8"))
        .status,
    ).toBe("running");
    process.env.OMA_PROFILE = "1";
    expect(listAgentRuns(root)).toEqual([]);
    expect(() => readAgentRun(root, run.runId)).toThrow();
    expect(start(false).sequence).toBe(1);
  });

  it("ignores old project shadow records when a canonical run exists", () => {
    const run = start(false);
    const legacy = join(root, ".agents/state/agent-runs");
    mkdirSync(legacy, { recursive: true });
    writeFileSync(join(legacy, `${run.runId}.json`), "invalid old record");
    expect(readAgentRun(root, run.runId).runId).toBe(run.runId);
    expect(claimPath(root, run.runId)).toBe(
      join(runtimeStateDir(root, "agent-runs"), `${run.runId}.claim.json`),
    );
    expect(listAgentRuns(root).map((record) => record.runId)).toEqual([
      run.runId,
    ]);
    expect(readFileSync(join(legacy, `${run.runId}.json`), "utf8")).toBe(
      "invalid old record",
    );
  });
});
