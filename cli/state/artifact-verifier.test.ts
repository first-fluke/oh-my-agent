import {
  mkdirSync,
  mkdtempSync,
  rmSync,
  utimesSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  resolveMemoryBasePath,
  verifyRalphExecArtifacts,
} from "./artifact-verifier.js";
import { activateWorkflowSession, readEvents } from "./events.js";

const MEM_BASE = ".serena/memories";

function writeArtifact(projectDir: string, relPath: string, content = "x") {
  const fullPath = join(projectDir, relPath);
  mkdirSync(join(fullPath, ".."), { recursive: true });
  writeFileSync(fullPath, content);
  return fullPath;
}

function writeFullArtifactSet(projectDir: string, sid = "s1") {
  writeArtifact(
    projectDir,
    `${MEM_BASE}/session-ultrawork.md`,
    "## Phase completion: PLAN done",
  );
  writeArtifact(projectDir, `.agents/results/plan-${sid}.json`, "{}");
  writeArtifact(projectDir, `${MEM_BASE}/result-qa-agent-${sid}.md`);
  writeArtifact(projectDir, `${MEM_BASE}/result-refactor-engineer-${sid}.md`);
}

describe("resolveMemoryBasePath", () => {
  let projectDir: string;

  beforeEach(() => {
    projectDir = mkdtempSync(join(tmpdir(), "oma-artifact-verifier-"));
  });

  afterEach(() => {
    rmSync(projectDir, { recursive: true, force: true });
  });

  it("defaults to .agents/state/memories when mcp.json is absent", () => {
    expect(resolveMemoryBasePath(projectDir)).toBe(".agents/state/memories");
  });

  it("falls back to legacy .serena/memories when only it exists", () => {
    mkdirSync(join(projectDir, ".serena", "memories"), { recursive: true });
    expect(resolveMemoryBasePath(projectDir)).toBe(".serena/memories");
  });

  it("prefers canonical .agents/state/memories over an existing legacy dir", () => {
    mkdirSync(join(projectDir, ".serena", "memories"), { recursive: true });
    mkdirSync(join(projectDir, ".agents", "state", "memories"), {
      recursive: true,
    });
    expect(resolveMemoryBasePath(projectDir)).toBe(".agents/state/memories");
  });

  it("reads memoryConfig.basePath from .agents/mcp.json", () => {
    writeArtifact(
      projectDir,
      ".agents/mcp.json",
      JSON.stringify({ memoryConfig: { basePath: ".custom/mem" } }),
    );
    expect(resolveMemoryBasePath(projectDir)).toBe(".custom/mem");
  });

  it("falls back to the default on malformed mcp.json", () => {
    writeArtifact(projectDir, ".agents/mcp.json", "not-json");
    expect(resolveMemoryBasePath(projectDir)).toBe(".agents/state/memories");
  });
});

describe("verifyRalphExecArtifacts", () => {
  let projectDir: string;

  beforeEach(() => {
    projectDir = mkdtempSync(join(tmpdir(), "oma-artifact-verifier-"));
  });

  afterEach(() => {
    rmSync(projectDir, { recursive: true, force: true });
  });

  it("passes when all four artifacts are present", async () => {
    writeFullArtifactSet(projectDir);

    const result = await verifyRalphExecArtifacts({ projectDir });

    expect(result.ok).toBe(true);
    expect(result.missing).toEqual([]);
    expect(result.remediation).toBeNull();
    expect(result.checks.map((check) => check.status)).toEqual([
      "present",
      "present",
      "present",
      "present",
    ]);
  });

  it("accepts Claude-native result naming in .agents/results (qa-reviewer/refactor-engineer)", async () => {
    writeArtifact(
      projectDir,
      `${MEM_BASE}/session-ultrawork.md`,
      "## Phase completion: PLAN done",
    );
    writeArtifact(projectDir, ".agents/results/plan-s1.json", "{}");
    writeArtifact(projectDir, ".agents/results/result-qa-s1.md");
    writeArtifact(projectDir, ".agents/results/result-refactor-s1.md");

    const result = await verifyRalphExecArtifacts({
      projectDir,
      emitOnFail: false,
    });

    expect(result.ok).toBe(true);
    const a3 = result.checks.find((check) => check.id === "A3");
    expect(a3?.matches).toEqual([".agents/results/result-qa-s1.md"]);
  });

  it("accepts legacy result-debug A4 naming from runs before REFINE moved to refactor-engineer", async () => {
    writeFullArtifactSet(projectDir);
    rmSync(join(projectDir, `${MEM_BASE}/result-refactor-engineer-s1.md`));
    writeArtifact(projectDir, `${MEM_BASE}/result-debug-agent-s1.md`);

    const result = await verifyRalphExecArtifacts({
      projectDir,
      emitOnFail: false,
    });

    expect(result.ok).toBe(true);
    const a4 = result.checks.find((check) => check.id === "A4");
    expect(a4?.matches).toEqual([`${MEM_BASE}/result-debug-agent-s1.md`]);
  });

  it("fails with a structured missing list when the QA result is absent", async () => {
    writeFullArtifactSet(projectDir);
    rmSync(join(projectDir, `${MEM_BASE}/result-qa-agent-s1.md`));

    const result = await verifyRalphExecArtifacts({
      projectDir,
      emitOnFail: false,
    });

    expect(result.ok).toBe(false);
    expect(result.missing.map((check) => check.id)).toEqual(["A3"]);
    expect(result.remediation).toContain("Treat EXEC as NOT performed");
  });

  it("accepts a missing A4 when session-ultrawork.md records a REFINE skip", async () => {
    writeFullArtifactSet(projectDir);
    rmSync(join(projectDir, `${MEM_BASE}/result-refactor-engineer-s1.md`));
    writeArtifact(
      projectDir,
      `${MEM_BASE}/session-ultrawork.md`,
      "## REFINE skipped: trivial task (< 50 lines)",
    );

    const result = await verifyRalphExecArtifacts({ projectDir });

    expect(result.ok).toBe(true);
    const a4 = result.checks.find((check) => check.id === "A4");
    expect(a4?.status).toBe("skip-recorded");
    expect(a4?.matches[0]).toContain("REFINE skipped");
  });

  it("treats a missing A4 without a recorded skip reason as circumvention", async () => {
    writeFullArtifactSet(projectDir);
    rmSync(join(projectDir, `${MEM_BASE}/result-refactor-engineer-s1.md`));

    const result = await verifyRalphExecArtifacts({
      projectDir,
      emitOnFail: false,
    });

    expect(result.ok).toBe(false);
    expect(result.missing.map((check) => check.id)).toEqual(["A4"]);
  });

  it("scopes the plan artifact to --session when provided", async () => {
    writeFullArtifactSet(projectDir, "s1");

    const scoped = await verifyRalphExecArtifacts({
      projectDir,
      sid: "other",
      emitOnFail: false,
    });

    expect(scoped.ok).toBe(false);
    expect(scoped.missing.map((check) => check.id)).toEqual(["A2"]);
  });

  it("ignores artifacts older than --newer-than", async () => {
    writeFullArtifactSet(projectDir);
    const stale = new Date("2026-01-01T00:00:00Z");
    utimesSync(
      join(projectDir, `${MEM_BASE}/result-qa-agent-s1.md`),
      stale,
      stale,
    );

    const result = await verifyRalphExecArtifacts({
      projectDir,
      newerThan: "2026-02-01T00:00:00Z",
      emitOnFail: false,
    });

    expect(result.ok).toBe(false);
    expect(result.missing.map((check) => check.id)).toEqual(["A3"]);
  });

  it("rejects an invalid --newer-than timestamp", async () => {
    await expect(
      verifyRalphExecArtifacts({ projectDir, newerThan: "yesterday" }),
    ).rejects.toThrow(/Invalid --newer-than/);
  });

  it("appends a gate.failed L1 event on failure when a session is active", async () => {
    activateWorkflowSession({
      projectDir,
      sid: "oma-ralph-test",
      workflow: "ralph",
    });

    const result = await verifyRalphExecArtifacts({ projectDir });

    expect(result.ok).toBe(false);
    expect(result.emitted).toBe(true);
    const events = readEvents(projectDir, "oma-ralph-test");
    const gateFailed = events.find((event) => event.kind === "gate.failed");
    expect(gateFailed?.payload).toMatchObject({
      workflow: "ralph",
      gate: "exec-artifacts",
    });
  });

  it("does not emit when no session is active", async () => {
    const result = await verifyRalphExecArtifacts({ projectDir });

    expect(result.ok).toBe(false);
    expect(result.emitted).toBe(false);
  });
});
