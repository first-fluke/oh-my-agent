/**
 * Tests for schedule/runner.ts
 *
 * Covers:
 * - Happy path: mocked spawn success -> result file written + lastFiredAt updated
 * - recurring:false (--once) self-remove after successful run
 * - LOUD-FAIL on auth-expiry: exit!=0 + stderr "re-auth required: <vendor>"
 * - Missing job: exit!=0 + stderr message
 * - promptPath usage: spawns with @<path>
 */

import * as path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// ---------------------------------------------------------------------------
// Hoisted mocks
// ---------------------------------------------------------------------------

const mockFsFunctions = vi.hoisted(() => ({
  existsSync: vi.fn(),
  readFileSync: vi.fn(),
  writeFileSync: vi.fn(),
  mkdirSync: vi.fn(),
  chmodSync: vi.fn(),
  unlinkSync: vi.fn(),
  readdirSync: vi.fn(),
}));

const mockSpawnSync = vi.hoisted(() => vi.fn());
const mockExecSync = vi.hoisted(() => vi.fn());

vi.mock("node:fs", async () => ({
  default: mockFsFunctions,
  ...mockFsFunctions,
}));

vi.mock("node:child_process", () => ({
  spawnSync: mockSpawnSync,
  execSync: mockExecSync,
}));

const FAKE_HOME = "/fake/home";
vi.mock("node:os", async (importOriginal) => {
  const original = await importOriginal<typeof import("node:os")>();
  return {
    ...original,
    homedir: vi.fn(() => FAKE_HOME),
  };
});

// Mock manifest module — we control what getJobById / updateJob / removeJob do
const mockGetJobById = vi.hoisted(() => vi.fn());
const mockUpdateJob = vi.hoisted(() => vi.fn());
const mockRemoveJob = vi.hoisted(() => vi.fn());
const mockGetRunsDir = vi.hoisted(() => vi.fn());
const mockGetScheduleDir = vi.hoisted(() => vi.fn());
const mockGetEnvFilePath = vi.hoisted(() =>
  vi.fn((id: string) => `/fake/home/.agents/schedule/env/${id}`),
);

vi.mock("./manifest.js", () => ({
  getJobById: mockGetJobById,
  updateJob: mockUpdateJob,
  removeJob: mockRemoveJob,
  getRunsDir: mockGetRunsDir,
  getScheduleDir: mockGetScheduleDir,
  getEnvFilePath: mockGetEnvFilePath,
}));

// Mock port / selectAdapter — we control OS adapter
const mockPortRemove = vi.hoisted(() => vi.fn());
vi.mock("./port.js", () => ({
  selectAdapter: vi.fn(async () => ({
    remove: mockPortRemove,
    upsert: vi.fn(),
    listLabels: vi.fn(async () => []),
    isAvailable: vi.fn(async () => true),
  })),
}));

import { runScheduledJob } from "./runner.js";

const JOB_ID = "sch_testjob00001";
const RUNS_DIR = path.join(FAKE_HOME, ".agents", "schedule", "runs", JOB_ID);
const SCHEDULE_DIR = path.join(FAKE_HOME, ".agents", "schedule");

function makeSampleJob(overrides?: Record<string, unknown>) {
  return {
    id: JOB_ID,
    cron: "0 9 * * *",
    agentId: "qa-reviewer",
    prompt: "Run a review",
    promptPath: null,
    vendor: "codex",
    workspace: "/projects/my-app",
    projectLabel: "my-app",
    recurring: true,
    maxAgeDays: 0,
    capturedEnvRef: null,
    createdAt: "2026-06-16T00:00:00.000Z",
    lastFiredAt: null,
    osBackend: "launchd",
    osJobLabel: `dev.oma.${JOB_ID}`,
    ...overrides,
  };
}

describe("schedule/runner.ts — runScheduledJob", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset process.exitCode before each test
    process.exitCode = 0;

    // Default: runs dir doesn't exist yet (will be created)
    mockFsFunctions.existsSync.mockReturnValue(false);
    mockFsFunctions.mkdirSync.mockReturnValue(undefined);
    mockFsFunctions.writeFileSync.mockReturnValue(undefined);

    // Default manifest returns sample job
    mockGetJobById.mockReturnValue(makeSampleJob());
    mockGetRunsDir.mockReturnValue(RUNS_DIR);
    mockGetScheduleDir.mockReturnValue(SCHEDULE_DIR);
    mockUpdateJob.mockReturnValue(null);
    mockRemoveJob.mockReturnValue(true);
    mockPortRemove.mockResolvedValue(undefined);

    // Default spawn: success
    mockSpawnSync.mockReturnValue({
      status: 0,
      stdout: "agent completed successfully",
      stderr: "",
      error: null,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    process.exitCode = 0;
  });

  // ---------------------------------------------------------------------------
  // Happy path
  // ---------------------------------------------------------------------------

  describe("happy path", () => {
    it("writes a result file under runs/<id>/", async () => {
      await runScheduledJob(JOB_ID);

      expect(mockFsFunctions.writeFileSync).toHaveBeenCalledWith(
        expect.stringContaining(RUNS_DIR),
        expect.stringContaining(`# Schedule Run: ${JOB_ID}`),
        { mode: 0o600 },
      );
    });

    it("updates lastFiredAt after a successful run", async () => {
      await runScheduledJob(JOB_ID);

      expect(mockUpdateJob).toHaveBeenCalledWith(
        JOB_ID,
        expect.objectContaining({ lastFiredAt: expect.any(String) }),
      );
      const callArg = mockUpdateJob.mock.calls[0] as [
        string,
        { lastFiredAt: string },
      ];
      const ts = callArg[1].lastFiredAt;
      // Should be a valid ISO timestamp
      expect(new Date(ts).toISOString()).toBe(ts);
    });

    it("invokes spawnSync with correct oma agent spawn args", async () => {
      await runScheduledJob(JOB_ID);

      expect(mockSpawnSync).toHaveBeenCalledWith(
        expect.any(String), // oma binary path
        expect.arrayContaining(["agent", "spawn", "qa-reviewer"]),
        expect.objectContaining({ encoding: "utf-8" }),
      );

      const callArgs = mockSpawnSync.mock.calls[0] as [
        string,
        string[],
        object,
      ];
      const spawnArgv = callArgs[1];
      expect(spawnArgv.slice(0, 2)).toEqual(["agent", "spawn"]);
      expect(spawnArgv[2]).toBe("qa-reviewer");
      expect(spawnArgv[3]).toBe("Run a review"); // inline prompt
      // vendor flag
      expect(spawnArgv).toContain("--vendor");
      expect(spawnArgv).toContain("codex");
      // workspace flag
      expect(spawnArgv).toContain("--workspace");
      expect(spawnArgv).toContain("/projects/my-app");
    });

    it("does not remove job when recurring=true after success", async () => {
      await runScheduledJob(JOB_ID);

      expect(mockRemoveJob).not.toHaveBeenCalled();
      expect(mockPortRemove).not.toHaveBeenCalled();
    });

    it("uses @promptPath when job has a promptPath", async () => {
      const promptPath = "/abs/path/my-prompt.md";
      mockGetJobById.mockReturnValue(
        makeSampleJob({ prompt: null, promptPath }),
      );

      await runScheduledJob(JOB_ID);

      const callArgs = mockSpawnSync.mock.calls[0] as [
        string,
        string[],
        object,
      ];
      const spawnArgv = callArgs[1];
      expect(spawnArgv[3]).toBe(`@${promptPath}`);
    });

    it("does not pass -m flag when vendor is null", async () => {
      mockGetJobById.mockReturnValue(makeSampleJob({ vendor: null }));

      await runScheduledJob(JOB_ID);

      const callArgs = mockSpawnSync.mock.calls[0] as [
        string,
        string[],
        object,
      ];
      const spawnArgv = callArgs[1];
      expect(spawnArgv).not.toContain("--vendor");
    });
  });

  // ---------------------------------------------------------------------------
  // recurring:false (--once) self-remove
  // ---------------------------------------------------------------------------

  describe("once / recurring:false self-remove", () => {
    it("removes the OS job and manifest entry after successful --once run", async () => {
      mockGetJobById.mockReturnValue(makeSampleJob({ recurring: false }));

      await runScheduledJob(JOB_ID);

      expect(mockPortRemove).toHaveBeenCalledWith(`dev.oma.${JOB_ID}`);
      expect(mockRemoveJob).toHaveBeenCalledWith(JOB_ID);
    });

    it("still removes manifest even if OS adapter remove throws", async () => {
      mockGetJobById.mockReturnValue(makeSampleJob({ recurring: false }));
      mockPortRemove.mockRejectedValue(new Error("launchctl failed"));

      await runScheduledJob(JOB_ID);

      // manifest removal must still happen
      expect(mockRemoveJob).toHaveBeenCalledWith(JOB_ID);
    });
  });

  // ---------------------------------------------------------------------------
  // maxAgeDays expiry
  // ---------------------------------------------------------------------------

  describe("maxAgeDays expiry", () => {
    it("self-removes a recurring job past its maxAgeDays window without firing", async () => {
      mockGetJobById.mockReturnValue(
        makeSampleJob({
          recurring: true,
          maxAgeDays: 7,
          // far in the past relative to the test clock (2026-06-16)
          createdAt: "2026-01-01T00:00:00.000Z",
        }),
      );

      await runScheduledJob(JOB_ID);

      // Expired: removed from OS + manifest, and agent:spawn never invoked.
      expect(mockPortRemove).toHaveBeenCalledWith(`dev.oma.${JOB_ID}`);
      expect(mockRemoveJob).toHaveBeenCalledWith(JOB_ID);
      expect(mockSpawnSync).not.toHaveBeenCalled();
      expect(process.exitCode).not.toBe(1);
    });

    it("does NOT expire a recurring job still within its window", async () => {
      mockGetJobById.mockReturnValue(
        makeSampleJob({
          recurring: true,
          maxAgeDays: 3650, // 10y window — not yet expired
          createdAt: "2026-06-15T00:00:00.000Z",
        }),
      );
      mockSpawnSync.mockReturnValue({
        status: 0,
        stdout: "ok",
        stderr: "",
        error: null,
      });

      await runScheduledJob(JOB_ID);

      // Still active: it fired and was NOT removed.
      expect(mockSpawnSync).toHaveBeenCalled();
      expect(mockRemoveJob).not.toHaveBeenCalled();
    });

    it("ignores maxAgeDays=0 (indefinite) — never expires", async () => {
      mockGetJobById.mockReturnValue(
        makeSampleJob({
          recurring: true,
          maxAgeDays: 0,
          createdAt: "2020-01-01T00:00:00.000Z",
        }),
      );
      mockSpawnSync.mockReturnValue({
        status: 0,
        stdout: "ok",
        stderr: "",
        error: null,
      });

      await runScheduledJob(JOB_ID);

      expect(mockSpawnSync).toHaveBeenCalled();
      expect(mockRemoveJob).not.toHaveBeenCalled();
    });
  });

  // ---------------------------------------------------------------------------
  // Missing job
  // ---------------------------------------------------------------------------

  describe("missing job", () => {
    it("exits with non-zero code when job id not found", async () => {
      mockGetJobById.mockReturnValue(undefined);

      const stderrSpy = vi
        .spyOn(process.stderr, "write")
        .mockImplementation(() => true);

      await runScheduledJob("sch_nonexistent");

      expect(process.exitCode).toBe(1);
      expect(stderrSpy).toHaveBeenCalledWith(
        expect.stringContaining("not found in manifest"),
      );
    });
  });

  // ---------------------------------------------------------------------------
  // LOUD-FAIL on auth-expiry
  // ---------------------------------------------------------------------------

  describe("loud-fail on auth-expiry", () => {
    const authExpiredOutputs = [
      "Error 401 Unauthorized",
      "Authentication failed: token expired",
      "Session expired, please sign in again",
      "Not logged in",
    ];

    it.each(authExpiredOutputs)(
      'exits non-zero and writes "re-auth required" to stderr for: %s',
      async (errorOutput) => {
        mockSpawnSync.mockReturnValue({
          status: 1,
          stdout: errorOutput,
          stderr: "",
          error: null,
        });

        const stderrSpy = vi
          .spyOn(process.stderr, "write")
          .mockImplementation(() => true);

        await runScheduledJob(JOB_ID);

        expect(process.exitCode).toBe(1);
        expect(stderrSpy).toHaveBeenCalledWith(
          expect.stringContaining("re-auth required: codex"),
        );
      },
    );

    it("does NOT self-remove a recurring job on auth failure", async () => {
      mockSpawnSync.mockReturnValue({
        status: 1,
        stdout: "401 Unauthorized",
        stderr: "",
        error: null,
      });

      vi.spyOn(process.stderr, "write").mockImplementation(() => true);

      await runScheduledJob(JOB_ID);

      expect(mockRemoveJob).not.toHaveBeenCalled();
      expect(mockPortRemove).not.toHaveBeenCalled();
    });

    it("reports re-auth with vendor=unknown when vendor is null", async () => {
      mockGetJobById.mockReturnValue(makeSampleJob({ vendor: null }));
      mockSpawnSync.mockReturnValue({
        status: 1,
        stdout: "401 Unauthorized",
        stderr: "",
        error: null,
      });

      const stderrSpy = vi
        .spyOn(process.stderr, "write")
        .mockImplementation(() => true);

      await runScheduledJob(JOB_ID);

      expect(stderrSpy).toHaveBeenCalledWith(
        expect.stringContaining("re-auth required: unknown"),
      );
    });
  });

  // ---------------------------------------------------------------------------
  // Non-auth non-zero exit
  // ---------------------------------------------------------------------------

  describe("non-auth failure", () => {
    it("exits non-zero but does NOT write re-auth message", async () => {
      mockSpawnSync.mockReturnValue({
        status: 2,
        stdout: "something went wrong with the task",
        stderr: "",
        error: null,
      });

      const stderrSpy = vi
        .spyOn(process.stderr, "write")
        .mockImplementation(() => true);

      await runScheduledJob(JOB_ID);

      expect(process.exitCode).toBe(1);
      // Should NOT see re-auth message
      const reAuthCalled = stderrSpy.mock.calls.some(
        (c: unknown[]) =>
          typeof c[0] === "string" && c[0].includes("re-auth required"),
      );
      expect(reAuthCalled).toBe(false);
    });
  });
});
