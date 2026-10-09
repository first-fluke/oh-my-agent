/**
 * Tests for schedule/manifest.ts
 *
 * Covers:
 * - manifest roundtrip (write->read)
 * - prompt XOR promptPath invariant
 * - 0600 file permissions
 * - projectLabel derivation
 * - ID generation format
 * - cron validation
 */

import * as path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// ---------------------------------------------------------------------------
// Module-level mocks — must use vi.hoisted so factories run before imports
// ---------------------------------------------------------------------------

const mockFsFunctions = vi.hoisted(() => ({
  existsSync: vi.fn(),
  readFileSync: vi.fn(),
  writeFileSync: vi.fn(),
  mkdirSync: vi.fn(),
  chmodSync: vi.fn(),
  unlinkSync: vi.fn(),
  readdirSync: vi.fn(),
  renameSync: vi.fn(),
  rmSync: vi.fn(),
}));

vi.mock("../../io/schedule/lock.ts", () => ({
  withScheduleLock: (_directory: string, action: () => unknown) => action(),
}));

const mockExecSync = vi.hoisted(() => vi.fn());

vi.mock("node:fs", async () => ({
  default: mockFsFunctions,
  ...mockFsFunctions,
}));

vi.mock("node:child_process", () => ({
  execSync: mockExecSync,
  spawnSync: vi.fn(),
}));

// Mock node:os homedir at module level (ESM requires vi.mock, not vi.spyOn)
const FAKE_HOME = "/fake/home";
vi.mock("node:os", async (importOriginal) => {
  const original = await importOriginal<typeof import("node:os")>();
  return {
    ...original,
    homedir: vi.fn(() => FAKE_HOME),
  };
});

// Import under test AFTER mocks are set up
import {
  addJob,
  deriveProjectLabel,
  generateJobId,
  getManifestPath,
  getScheduleDir,
  readManifest,
  removeJob,
  type ScheduleJob,
  updateJob,
  validateCronExpression,
  writeManifest,
} from "./manifest.js";

const SCHEDULE_DIR = path.join(FAKE_HOME, ".oma", "schedule");
const MANIFEST_PATH = path.join(SCHEDULE_DIR, "schedules.json");

function makeEmptyManifest() {
  return JSON.stringify({ version: 1, jobs: [] }, null, 2);
}

function makeSampleJob(overrides?: Partial<ScheduleJob>): ScheduleJob {
  return {
    id: "sch_aaaaaa111111",
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
    osJobLabel: "dev.oma.sch_aaaaaa111111",
    ...overrides,
  };
}

describe("schedule/manifest.ts", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("OMA_HOME", path.join(FAKE_HOME, ".oma"));
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
  });

  // ---------------------------------------------------------------------------
  // Path helpers
  // ---------------------------------------------------------------------------

  describe("getScheduleDir", () => {
    it("returns ~/.oma/schedule", () => {
      expect(getScheduleDir()).toBe(SCHEDULE_DIR);
    });

    it("uses OMA_HOME independently of project/profile storage", () => {
      vi.stubEnv("OMA_HOME", "/custom/oma");
      vi.stubEnv("OMA_STATE_HOME", "/custom/profile");
      expect(getScheduleDir()).toBe("/custom/oma/schedule");
      expect(getManifestPath()).toBe("/custom/oma/schedule/schedules.json");
    });
  });

  describe("getManifestPath", () => {
    it("returns schedules.json inside schedule dir", () => {
      expect(getManifestPath()).toBe(MANIFEST_PATH);
    });
  });

  // ---------------------------------------------------------------------------
  // readManifest / writeManifest roundtrip
  // ---------------------------------------------------------------------------

  describe("readManifest / writeManifest roundtrip", () => {
    it("reads an existing manifest correctly", () => {
      const job = makeSampleJob();
      const content = JSON.stringify({ version: 1, jobs: [job] }, null, 2);

      mockFsFunctions.existsSync.mockImplementation(
        (p: string) => p === SCHEDULE_DIR || p === MANIFEST_PATH,
      );
      mockFsFunctions.readFileSync.mockReturnValue(content);

      const manifest = readManifest();
      expect(manifest.version).toBe(1);
      expect(manifest.jobs).toHaveLength(1);
      expect(manifest.jobs[0]?.id).toBe("sch_aaaaaa111111");
    });

    it("creates an empty manifest when file does not exist", () => {
      mockFsFunctions.existsSync.mockImplementation(
        (p: string) => p === SCHEDULE_DIR,
      );
      mockFsFunctions.readFileSync.mockReturnValue(makeEmptyManifest());

      const manifest = readManifest();
      expect(manifest.jobs).toHaveLength(0);
      // Should have written the empty file with 0600
      expect(mockFsFunctions.writeFileSync).toHaveBeenCalledWith(
        expect.stringContaining(`${MANIFEST_PATH}.`),
        makeEmptyManifest(),
        { mode: 0o600, flag: "wx" },
      );
    });

    it("creates schedule directory with 0700 when it does not exist", () => {
      mockFsFunctions.existsSync.mockReturnValue(false);
      mockFsFunctions.readFileSync.mockReturnValue(makeEmptyManifest());

      readManifest();

      expect(mockFsFunctions.mkdirSync).toHaveBeenCalledWith(SCHEDULE_DIR, {
        recursive: true,
        mode: 0o700,
      });
    });

    it("writes manifest with 0600 mode", () => {
      mockFsFunctions.existsSync.mockReturnValue(true);

      const manifest = { version: 1 as const, jobs: [makeSampleJob()] };
      writeManifest(manifest);

      expect(mockFsFunctions.writeFileSync).toHaveBeenCalledWith(
        expect.stringContaining(`${MANIFEST_PATH}.`),
        JSON.stringify(manifest, null, 2),
        { mode: 0o600, flag: "wx" },
      );
      expect(mockFsFunctions.renameSync).toHaveBeenCalledWith(
        expect.stringContaining(`${MANIFEST_PATH}.`),
        MANIFEST_PATH,
      );
    });
  });

  // ---------------------------------------------------------------------------
  // addJob / removeJob / updateJob
  // ---------------------------------------------------------------------------

  describe("addJob", () => {
    it("appends a job to the manifest", () => {
      mockFsFunctions.existsSync.mockReturnValue(true);
      mockFsFunctions.readFileSync.mockReturnValue(makeEmptyManifest());

      const job = makeSampleJob();
      addJob(job);

      const writeCall = mockFsFunctions.writeFileSync.mock.calls.find(
        (c: unknown[]) =>
          typeof c[0] === "string" && c[0].startsWith(`${MANIFEST_PATH}.`),
      ) as [string, string] | undefined;
      expect(writeCall).toBeDefined();
      const parsed = JSON.parse(writeCall?.[1] ?? "{}") as {
        jobs: ScheduleJob[];
      };
      expect(parsed.jobs).toHaveLength(1);
      expect(parsed.jobs[0]?.id).toBe("sch_aaaaaa111111");
    });
  });

  describe("removeJob", () => {
    it("removes a job by id", () => {
      const job = makeSampleJob();
      const content = JSON.stringify({ version: 1, jobs: [job] }, null, 2);

      mockFsFunctions.existsSync.mockReturnValue(true);
      mockFsFunctions.readFileSync.mockReturnValue(content);

      const result = removeJob("sch_aaaaaa111111");
      expect(result).toBe(true);

      const writeCall = mockFsFunctions.writeFileSync.mock.calls.find(
        (c: unknown[]) =>
          typeof c[0] === "string" && c[0].startsWith(`${MANIFEST_PATH}.`),
      ) as [string, string] | undefined;
      const parsed = JSON.parse(writeCall?.[1] ?? "{}") as {
        jobs: ScheduleJob[];
      };
      expect(parsed.jobs).toHaveLength(0);
    });

    it("returns false when job not found", () => {
      mockFsFunctions.existsSync.mockReturnValue(true);
      mockFsFunctions.readFileSync.mockReturnValue(makeEmptyManifest());

      const result = removeJob("sch_nonexistent");
      expect(result).toBe(false);
    });
  });

  describe("updateJob", () => {
    it("updates lastFiredAt on an existing job", () => {
      const job = makeSampleJob();
      const content = JSON.stringify({ version: 1, jobs: [job] }, null, 2);

      mockFsFunctions.existsSync.mockReturnValue(true);
      mockFsFunctions.readFileSync.mockReturnValue(content);

      const ts = "2026-06-16T10:00:00.000Z";
      updateJob("sch_aaaaaa111111", { lastFiredAt: ts });

      const writeCall = mockFsFunctions.writeFileSync.mock.calls.find(
        (c: unknown[]) =>
          typeof c[0] === "string" && c[0].startsWith(`${MANIFEST_PATH}.`),
      ) as [string, string] | undefined;
      const parsed = JSON.parse(writeCall?.[1] ?? "{}") as {
        jobs: ScheduleJob[];
      };
      expect(parsed.jobs[0]?.lastFiredAt).toBe(ts);
    });

    it("returns null when job not found", () => {
      mockFsFunctions.existsSync.mockReturnValue(true);
      mockFsFunctions.readFileSync.mockReturnValue(makeEmptyManifest());

      const result = updateJob("sch_missing", { lastFiredAt: "now" });
      expect(result).toBeNull();
    });
  });

  // ---------------------------------------------------------------------------
  // prompt XOR promptPath invariant (enforced at schema level)
  // ---------------------------------------------------------------------------

  describe("prompt XOR promptPath invariant", () => {
    it("allows prompt with null promptPath", () => {
      mockFsFunctions.existsSync.mockReturnValue(true);
      mockFsFunctions.readFileSync.mockReturnValue(makeEmptyManifest());

      const job = makeSampleJob({ prompt: "do stuff", promptPath: null });
      expect(() => addJob(job)).not.toThrow();
    });

    it("allows promptPath with null prompt", () => {
      mockFsFunctions.existsSync.mockReturnValue(true);
      mockFsFunctions.readFileSync.mockReturnValue(makeEmptyManifest());

      const job = makeSampleJob({
        prompt: null,
        promptPath: "/path/to/prompt.md",
      });
      expect(() => addJob(job)).not.toThrow();
    });
  });

  // ---------------------------------------------------------------------------
  // ID generation
  // ---------------------------------------------------------------------------

  describe("generateJobId", () => {
    it('returns an id starting with "sch_"', () => {
      const id = generateJobId();
      expect(id).toMatch(/^sch_/);
    });

    it("has 12 base32 chars after the prefix", () => {
      const id = generateJobId();
      const suffix = id.slice(4);
      expect(suffix).toHaveLength(12);
      expect(suffix).toMatch(/^[a-z2-7]+$/);
    });

    it("generates unique ids", () => {
      const ids = new Set(Array.from({ length: 50 }, () => generateJobId()));
      expect(ids.size).toBe(50);
    });
  });

  // ---------------------------------------------------------------------------
  // projectLabel derivation
  // ---------------------------------------------------------------------------

  describe("deriveProjectLabel", () => {
    it("returns git root basename when in a git repo", () => {
      mockExecSync.mockReturnValue("/abs/path/my-project\n");
      expect(deriveProjectLabel("/abs/path/my-project/src")).toBe("my-project");
    });

    it("falls back to directory basename when git fails", () => {
      mockExecSync.mockImplementation(() => {
        throw new Error("not a git repo");
      });
      expect(deriveProjectLabel("/home/user/my-workspace")).toBe(
        "my-workspace",
      );
    });
  });

  // ---------------------------------------------------------------------------
  // cron validation
  // ---------------------------------------------------------------------------

  describe("validateCronExpression", () => {
    it.each([
      ["0 9 * * *", "every day at 9am"],
      ["*/5 * * * *", "every 5 minutes"],
      ["0 0 1 1 *", "new year midnight"],
      ["0 9,17 * * 1-5", "weekdays at 9 and 17"],
    ])("accepts valid expression: %s (%s)", (expr) => {
      expect(() => validateCronExpression(expr)).not.toThrow();
    });

    it.each([
      ["not a cron", "wrong number of fields"],
      ["60 9 * * *", "minute out of range"],
      ["0 24 * * *", "hour out of range"],
      ["0 9 0 * *", "day-of-month out of range"],
      ["0 9 * 0 *", "month out of range (0)"],
    ])("rejects invalid expression: %s (%s)", (expr) => {
      expect(() => validateCronExpression(expr)).toThrow();
    });

    it("rejects expressions with fewer than 5 fields", () => {
      expect(() => validateCronExpression("0 9 * *")).toThrow(/5 fields/);
    });

    it("rejects expressions with more than 5 fields", () => {
      expect(() => validateCronExpression("0 9 * * * *")).toThrow(/5 fields/);
    });
  });
});
