import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  renameSync,
  rmSync,
  statSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { hostname, tmpdir } from "node:os";
import { join, relative } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  type AgentRun,
  beginAgentRun,
  listAgentRuns,
  readAgentRun,
} from "./agent-results.js";
import { runtimeStateDir } from "./project-runtime.js";

const sourceReadHook = vi.hoisted(() => ({
  callback: undefined as ((file: string) => void) | undefined,
  directoryCallback: undefined as ((file: string) => void) | undefined,
}));
vi.mock("node:fs", async (importOriginal) => {
  const fs = await importOriginal<typeof import("node:fs")>();
  return {
    ...fs,
    readdirSync: (...args: Parameters<typeof fs.readdirSync>) => {
      sourceReadHook.directoryCallback?.(String(args[0]));
      return fs.readdirSync(...args);
    },
    readFileSync: (
      file: Parameters<typeof fs.readFileSync>[0],
      options?: Parameters<typeof fs.readFileSync>[1],
    ) => {
      sourceReadHook.callback?.(String(file));
      return fs.readFileSync(file, options);
    },
  };
});

import { migrateProjectRuntime } from "./project-runtime-migration.js";

const firstId = "11111111-1111-4111-8111-111111111111";
const secondId = "22222222-2222-4222-8222-222222222222";
describe("project runtime migration", () => {
  let fixture: string;
  let root: string;
  let stateHome: string;
  beforeEach(() => {
    fixture = mkdtempSync(join(tmpdir(), "oma-runtime-migration-"));
    root = join(fixture, "project");
    stateHome = join(fixture, "state-home");
    mkdirSync(root);
    process.env.OMA_STATE_HOME = stateHome;
    process.env.OMA_PROFILE = "0";
  });
  afterEach(() => {
    sourceReadHook.callback = undefined;
    sourceReadHook.directoryCallback = undefined;
    process.env.OMA_PROFILE = "0";
    rmSync(fixture, { recursive: true, force: true });
  });
  function source(area: string, name: string): string {
    return join(root, ".agents/state", area, name);
  }
  function put(area: string, name: string, value: unknown): string {
    const file = source(area, name);
    mkdirSync(join(file, ".."), { recursive: true });
    writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`);
    return file;
  }
  function run(patch: Partial<AgentRun> = {}): AgentRun {
    return {
      schemaVersion: 1,
      runId: firstId,
      sequence: 7,
      taskId: "task-1",
      sessionId: "session-1",
      agentId: "backend",
      vendor: "codex",
      workspace: root,
      artifactRoot: root,
      startedAt: "2026-09-10T00:00:00.000Z",
      finishedAt: "2026-09-10T00:01:00.000Z",
      status: "completed",
      exitCode: 0,
      before: "a".repeat(64),
      after: "a".repeat(64),
      checks: [],
      changedFiles: [],
      unresolved: [],
      artifacts: {},
      ...patch,
    };
  }
  function receipt(patch: Partial<AgentRun> = {}): AgentRun {
    const value = run(patch);
    put("agent-runs", `${value.runId}.json`, value);
    return value;
  }
  function output(value: AgentRun): string {
    const file = source("agent-runs", `${value.runId}.output.txt`);
    writeFileSync(file, "preserved output");
    value.output = { path: relative(root, file), bytes: 16, truncated: false };
    put("agent-runs", `${value.runId}.json`, value);
    return file;
  }
  const claim = {
    status: "completed",
    changedFiles: [],
    unresolved: [],
    artifacts: [],
  };
  const pin = { lineageId: "session-1", hash: "b".repeat(64) };
  function completedSessionFiles(patch: Partial<AgentRun> = {}): string[] {
    const value = receipt({ lineageId: "lineage-1", ...patch });
    return [
      source("agent-runs", `${firstId}.json`),
      output(value),
      put("agent-runs", `${firstId}.claim.json`, claim),
      put("agent-plans", "sessions/session-1.json", {
        ...pin,
        lineageId: "lineage-1",
      }),
      put("agent-plans", "lineages/lineage-1.json", {
        ...pin,
        lineageId: "lineage-1",
      }),
      put("agent-resume", "session-1.json", {
        sessionId: "session-1",
        tasks: [],
        ok: true,
      }),
    ];
  }

  it("copies completed receipts, companions, pins, and checkpoints without changing sources", async () => {
    const value = receipt();
    const outputFile = output(value);
    const claimFile = put("agent-runs", `${value.runId}.claim.json`, claim);
    const pinFile = put("agent-plans", "sessions/session-1.json", pin);
    put("agent-plans", "lineages/session-1.json", pin);
    put("agent-resume", "session-1.json", {
      sessionId: "session-1",
      tasks: [],
      ok: true,
    });
    put("agent-runs", "_sequence.json", 3);
    const sourceReceipt = readFileSync(
      source("agent-runs", `${value.runId}.json`),
    );
    const reports = await migrateProjectRuntime({ projectDir: root });
    expect(reports.every((item) => item.status === "copied")).toBe(true);
    const copied = readAgentRun(root, value.runId);
    expect(copied.output?.path).toBe(
      relative(
        root,
        join(runtimeStateDir(root, "agent-runs"), `${value.runId}.output.txt`),
      ),
    );
    expect(readFileSync(join(root, copied.output?.path ?? ""), "utf8")).toBe(
      "preserved output",
    );
    expect(readFileSync(source("agent-runs", `${value.runId}.json`))).toEqual(
      sourceReceipt,
    );
    expect(readFileSync(outputFile, "utf8")).toBe("preserved output");
    expect(JSON.parse(readFileSync(claimFile, "utf8"))).toEqual(claim);
    expect(
      readFileSync(
        join(runtimeStateDir(root, "agent-plans"), "sessions/session-1.json"),
      ),
    ).toEqual(readFileSync(pinFile));
    expect(
      JSON.parse(
        readFileSync(
          join(runtimeStateDir(root, "agent-runs"), "_sequence.json"),
          "utf8",
        ),
      ),
    ).toBe(7);
    if (process.platform !== "win32") {
      expect(statSync(runtimeStateDir(root, "agent-runs")).mode & 0o777).toBe(
        0o700,
      );
      expect(
        statSync(
          join(runtimeStateDir(root, "agent-runs"), `${value.runId}.json`),
        ).mode & 0o777,
      ).toBe(0o600);
    }
    const modified = statSync(
      join(runtimeStateDir(root, "agent-runs"), `${value.runId}.json`),
    ).mtimeMs;
    const repeated = await migrateProjectRuntime({ projectDir: root });
    expect(repeated.every((item) => item.status === "unchanged")).toBe(true);
    expect(
      statSync(join(runtimeStateDir(root, "agent-runs"), `${value.runId}.json`))
        .mtimeMs,
    ).toBe(modified);
  });

  it("makes dry-run plans without creating the HOME store or locks", async () => {
    receipt();
    const reports = await migrateProjectRuntime({
      projectDir: root,
      dryRun: true,
    });
    expect(reports.some((item) => item.status === "copied")).toBe(true);
    expect(reports.every((item) => item.reason?.startsWith("Dry run:"))).toBe(
      true,
    );
    expect(existsSync(stateHome)).toBe(false);
  });

  it("defers old runtime for a different profile without creating its state", async () => {
    receipt();
    process.env.OMA_PROFILE = "1";
    const reports = await migrateProjectRuntime({ projectDir: root });
    expect(reports.every((item) => item.status === "deferred")).toBe(true);
    expect(existsSync(stateHome)).toBe(false);
  });

  it("defers an unknown running owner and its references while copying independent completed runs", async () => {
    const active = receipt({
      status: "running",
      finishedAt: undefined,
      exitCode: undefined,
      lineageId: "active-lineage",
    });
    output(active);
    put("agent-runs", `${active.runId}.claim.json`, claim);
    put("agent-plans", "sessions/session-1.json", {
      lineageId: "active-lineage",
      hash: "b".repeat(64),
    });
    put("agent-plans", "lineages/active-lineage.json", {
      lineageId: "active-lineage",
      hash: "b".repeat(64),
    });
    put("agent-resume", "session-1.json", {
      sessionId: "session-1",
      tasks: [],
      ok: false,
    });
    receipt({ runId: secondId, sequence: 9, sessionId: "independent" });
    const reports = await migrateProjectRuntime({ projectDir: root });
    expect(
      reports
        .filter((item) => item.source.includes(firstId))
        .every((item) => item.status === "deferred"),
    ).toBe(true);
    expect(
      reports
        .filter((item) => item.area !== "agent-runs")
        .every((item) => item.status === "deferred"),
    ).toBe(true);
    expect(readAgentRun(root, secondId).status).toBe("completed");
    expect(() => readAgentRun(root, firstId)).toThrow();
  });

  it("defers only a live coordinator's session and preserves its lease", async () => {
    receipt();
    receipt({ runId: secondId, sessionId: "independent", sequence: 12 });
    const lease = put("agent-resume", "session-1.lease.json", {
      pid: process.pid,
      host: hostname(),
      token: "active",
    });
    const reports = await migrateProjectRuntime({ projectDir: root });
    expect(
      reports.find((item) => item.source.endsWith(`${firstId}.json`))?.status,
    ).toBe("deferred");
    expect(reports.find((item) => item.source === lease)?.status).toBe(
      "deferred",
    );
    expect(readAgentRun(root, secondId).runId).toBe(secondId);
    expect(JSON.parse(readFileSync(lease, "utf8")).token).toBe("active");
  });

  it("copies an inactive local lease and reports malformed lease metadata", async () => {
    put("agent-resume", "dead.lease.json", {
      pid: 2147483647,
      host: hostname(),
      token: "dead",
    });
    const bad = put("agent-resume", "bad.lease.json", { invalid: true });
    const reports = await migrateProjectRuntime({ projectDir: root });
    expect(
      reports.find((item) => item.source.endsWith("dead.lease.json"))?.status,
    ).toBe("copied");
    expect(reports.find((item) => item.source === bad)?.status).toBe(
      "conflict",
    );
  });

  it.each(["symlink", "oversize", "unreadable"])(
    "defers a session's whole runtime when its lease is %s",
    async (unsafe) => {
      const sessionFiles = completedSessionFiles();
      receipt({ runId: secondId, sessionId: "independent", sequence: 12 });
      const lease = source("agent-resume", "session-1.lease.json");
      if (unsafe === "symlink") {
        const target = join(fixture, "outside-lease.json");
        writeFileSync(target, "{}");
        symlinkSync(target, lease);
      } else if (unsafe === "oversize") {
        writeFileSync(lease, Buffer.alloc(5 * 1024 * 1024 + 1));
      } else {
        writeFileSync(lease, "{}");
        sourceReadHook.callback = (file) => {
          if (file === lease) throw new Error("EACCES: unreadable lease");
        };
      }
      const reports = await migrateProjectRuntime({ projectDir: root });
      expect(reports.find((item) => item.source === lease)?.status).toBe(
        "conflict",
      );
      for (const file of sessionFiles) {
        const report = reports.find((item) => item.source === file);
        expect(report?.status, file).toBe("deferred");
        expect(existsSync(report?.destination ?? ""), file).toBe(false);
        expect(existsSync(file), file).toBe(true);
      }
      expect(readAgentRun(root, secondId).runId).toBe(secondId);
    },
  );

  it.each(["symlink", "unreadable"])(
    "defers every runtime area when the resume directory is %s",
    async (unsafe) => {
      const sessionFiles = completedSessionFiles();
      receipt({ runId: secondId, sessionId: "independent", sequence: 12 });
      put("agent-runs", "_sequence.json", 12);
      const resume = source("agent-resume", "");
      if (unsafe === "symlink") {
        const original = join(fixture, "original-resume");
        renameSync(resume, original);
        symlinkSync(original, resume);
      } else {
        sourceReadHook.directoryCallback = (file) => {
          if (file === resume)
            throw new Error("EACCES: unreadable resume directory");
        };
      }
      const reports = await migrateProjectRuntime({ projectDir: root });
      expect(reports.find((item) => item.source === resume)?.status).toBe(
        "conflict",
      );
      expect(
        reports
          .filter((item) => item.source !== resume)
          .every((item) => item.status === "deferred"),
      ).toBe(true);
      for (const area of ["agent-runs", "agent-plans", "agent-resume"] as const)
        expect(existsSync(runtimeStateDir(root, area))).toBe(false);
      for (const file of sessionFiles) expect(existsSync(file)).toBe(true);
    },
  );

  it("preserves both sides of conflicting run bundles", async () => {
    const value = receipt();
    output(value);
    const destination = runtimeStateDir(root, "agent-runs");
    mkdirSync(destination, { recursive: true });
    const target = join(destination, `${firstId}.output.txt`);
    writeFileSync(target, "different canonical output");
    const reports = await migrateProjectRuntime({ projectDir: root });
    expect(
      reports
        .filter((item) => item.source.includes(firstId))
        .every((item) => item.status === "conflict"),
    ).toBe(true);
    expect(readFileSync(target, "utf8")).toBe("different canonical output");
    expect(existsSync(join(destination, `${firstId}.json`))).toBe(false);
    expect(
      readFileSync(source("agent-runs", `${firstId}.output.txt`), "utf8"),
    ).toBe("preserved output");
  });

  it("defers a run bundle when a claim writer changes the source after scanning", async () => {
    receipt();
    const claimFile = put("agent-runs", `${firstId}.claim.json`, claim);
    let reads = 0;
    sourceReadHook.callback = (file) => {
      if (file === claimFile && ++reads === 2)
        writeFileSync(
          claimFile,
          JSON.stringify({ ...claim, status: "failed" }),
        );
    };
    const reports = await migrateProjectRuntime({ projectDir: root });
    expect(
      reports
        .filter((item) => item.source.includes(firstId))
        .every((item) => item.status === "deferred"),
    ).toBe(true);
    expect(
      existsSync(join(runtimeStateDir(root, "agent-runs"), `${firstId}.json`)),
    ).toBe(false);
    expect(JSON.parse(readFileSync(claimFile, "utf8")).status).toBe("failed");
  });

  it("reconciles source, canonical, and receipt sequences before the next dispatch", async () => {
    receipt({ sequence: 20 });
    put("agent-runs", "_sequence.json", 30);
    const current = runtimeStateDir(root, "agent-runs");
    mkdirSync(current, { recursive: true });
    writeFileSync(join(current, "_sequence.json"), "10");
    writeFileSync(
      join(current, `${secondId}.json`),
      JSON.stringify(run({ runId: secondId, sequence: 40 })),
    );
    await migrateProjectRuntime({ projectDir: root });
    expect(
      JSON.parse(readFileSync(join(current, "_sequence.json"), "utf8")),
    ).toBe(40);
    expect(
      beginAgentRun({
        root,
        workspace: root,
        agentId: "backend",
        sessionId: "new-session",
        taskId: "new-task",
        vendor: "test",
      }).sequence,
    ).toBe(41);
    expect(
      readFileSync(source("agent-runs", "_sequence.json"), "utf8"),
    ).toContain("30");
  });

  it.each([
    { reason: "collides with another run", legacy: 7, current: 7 },
    {
      reason: "would replace a newer HOME run as last",
      legacy: 20,
      current: 3,
    },
  ])(
    "preserves last-run selection when a legacy sequence $reason",
    async ({ legacy, current }) => {
      const sessionFiles = completedSessionFiles({ sequence: legacy });
      const originalFiles = sessionFiles.map((file) => readFileSync(file));
      put("agent-runs", "_sequence.json", legacy);
      const destination = runtimeStateDir(root, "agent-runs");
      mkdirSync(destination, { recursive: true });
      const currentFile = join(destination, `${secondId}.json`);
      writeFileSync(
        currentFile,
        JSON.stringify(
          run({
            runId: secondId,
            sequence: current,
            sessionId: "new-home-session",
            startedAt: "2026-10-08T00:00:00.000Z",
            finishedAt: "2026-10-08T00:01:00.000Z",
          }),
        ),
      );
      writeFileSync(
        join(destination, "_sequence.json"),
        JSON.stringify(current),
      );
      const originalCurrent = readFileSync(currentFile);
      expect(listAgentRuns(root).at(-1)?.runId).toBe(secondId);

      const reports = await migrateProjectRuntime({ projectDir: root });

      for (const [index, file] of sessionFiles.entries()) {
        const report = reports.find((item) => item.source === file);
        expect(report?.status, file).toBe(
          report?.area === "agent-runs" ? "conflict" : "deferred",
        );
        expect(existsSync(report?.destination ?? ""), file).toBe(false);
        expect(readFileSync(file), file).toEqual(originalFiles[index]);
      }
      expect(readFileSync(currentFile)).toEqual(originalCurrent);
      expect(listAgentRuns(root).map((run) => run.runId)).toEqual([secondId]);
      expect(listAgentRuns(root).at(-1)?.runId).toBe(secondId);
    },
  );

  it("keeps an already migrated receipt unchanged after a new HOME run", async () => {
    receipt();
    await migrateProjectRuntime({ projectDir: root });
    const destination = runtimeStateDir(root, "agent-runs");
    writeFileSync(
      join(destination, `${secondId}.json`),
      JSON.stringify(
        run({
          runId: secondId,
          sequence: 8,
          startedAt: "2026-10-08T00:00:00.000Z",
          finishedAt: "2026-10-08T00:01:00.000Z",
        }),
      ),
    );
    writeFileSync(join(destination, "_sequence.json"), "8");
    const reports = await migrateProjectRuntime({ projectDir: root });
    expect(reports.every((item) => item.status === "unchanged")).toBe(true);
    expect(listAgentRuns(root).at(-1)?.runId).toBe(secondId);
  });

  it("reports conflicts for source symlinks and escaped output references", async () => {
    const value = receipt();
    value.output = { path: "../outside.txt", bytes: 1, truncated: false };
    put("agent-runs", `${firstId}.json`, value);
    symlinkSync(
      source("agent-runs", `${firstId}.json`),
      source("agent-runs", `${secondId}.json`),
    );
    const reports = await migrateProjectRuntime({ projectDir: root });
    expect(
      reports
        .filter(
          (item) =>
            item.source.includes(firstId) || item.source.includes(secondId),
        )
        .every((item) => item.status === "conflict"),
    ).toBe(true);
    expect(
      existsSync(join(runtimeStateDir(root, "agent-runs"), `${firstId}.json`)),
    ).toBe(false);
  });

  it("rejects symbolic destination ancestors before lock creation", async () => {
    receipt();
    const outside = join(fixture, "outside");
    mkdirSync(outside);
    symlinkSync(outside, stateHome);
    const reports = await migrateProjectRuntime({ projectDir: root });
    expect(reports.every((item) => item.status === "conflict")).toBe(true);
    expect(existsSync(join(outside, "u"))).toBe(false);
  });

  it("rejects another project's receipt and does not overwrite malformed canonical counters", async () => {
    receipt({ artifactRoot: join(fixture, "another-project") });
    put("agent-runs", "_sequence.json", 10);
    const current = runtimeStateDir(root, "agent-runs");
    mkdirSync(current, { recursive: true });
    writeFileSync(join(current, "_sequence.json"), "broken");
    const reports = await migrateProjectRuntime({ projectDir: root });
    expect(
      reports.find((item) => item.source.endsWith(`${firstId}.json`))?.status,
    ).toBe("conflict");
    expect(
      reports.find((item) => item.source.endsWith("_sequence.json"))?.status,
    ).toBe("conflict");
    expect(readFileSync(join(current, "_sequence.json"), "utf8")).toBe(
      "broken",
    );
  });
});
