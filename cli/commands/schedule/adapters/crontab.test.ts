/**
 * Tests for schedule/adapters/crontab.ts
 *
 * Covers:
 * - isAvailable: true when `crontab` binary is present, false otherwise
 * - upsert: inserts marker block + job line with # oma:<label>, preserves non-oma lines
 *   idempotent (second upsert replaces existing line), reinstalls via crontab - (stdin)
 * - remove: drops only the matching # oma:<label> line; non-oma lines untouched
 * - listLabels: parses # oma:<label> comments inside the marker block only
 *
 * All child_process calls now go through execFileSync (no shell interpolation).
 * writeCrontab uses execFileSync("crontab",["-"],{input}) -- no temp file.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// ---------------------------------------------------------------------------
// Hoisted mocks
// ---------------------------------------------------------------------------

const mockFsFunctions = vi.hoisted(() => ({
  existsSync: vi.fn(),
  writeFileSync: vi.fn(),
  unlinkSync: vi.fn(),
  readdirSync: vi.fn(),
  mkdirSync: vi.fn(),
}));

const mockExecFileSync = vi.hoisted(() => vi.fn());

vi.mock("node:fs", async () => ({
  default: mockFsFunctions,
  ...mockFsFunctions,
}));

vi.mock("node:child_process", () => ({
  execFileSync: mockExecFileSync,
  spawnSync: vi.fn(),
}));

const FAKE_HOME = "/fake/home";
vi.mock("node:os", async (importOriginal) => {
  const original = await importOriginal<typeof import("node:os")>();
  return {
    ...original,
    homedir: vi.fn(() => FAKE_HOME),
  };
});

import { CrontabAdapter } from "./crontab.js";

const JOB_ID = "sch_testjob00001";
const LABEL = `dev.oma.${JOB_ID}`;
const WORKSPACE = "/projects/my-app";
const ABS_OMA = "/usr/local/bin/oma";

const sampleSpec = {
  id: JOB_ID,
  cron: "0 9 * * *",
  command: ["oma", "schedule:run", JOB_ID],
  label: LABEL,
  workspace: WORKSPACE,
};

const MARKER_BEGIN = "# BEGIN oma-schedule";
const MARKER_END = "# END oma-schedule";

describe("CrontabAdapter", () => {
  let adapter: CrontabAdapter;

  beforeEach(() => {
    adapter = new CrontabAdapter();
    vi.clearAllMocks();

    // Default: no existing crontab
    mockExecFileSync.mockImplementation((file: string, args: string[]) => {
      // isAvailable: sh -c "command -v crontab"
      if (file === "sh" && args[1]?.includes("command -v crontab")) {
        return "/usr/bin/crontab\n";
      }
      // resolveOmaBinary: sh -c "command -v oma"
      if (file === "sh" && args[1]?.includes("command -v oma")) {
        return `${ABS_OMA}\n`;
      }
      // readCrontab: crontab -l
      if (file === "crontab" && args[0] === "-l") {
        throw new Error("no crontab for user");
      }
      // writeCrontab: crontab - (stdin)
      if (file === "crontab" && args[0] === "-") {
        return "";
      }
      return "";
    });
    // temp file write mock (should no longer be called, but keep for safety)
    mockFsFunctions.writeFileSync.mockReturnValue(undefined);
    mockFsFunctions.unlinkSync.mockReturnValue(undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ---------------------------------------------------------------------------
  // isAvailable
  // ---------------------------------------------------------------------------

  describe("isAvailable", () => {
    it("returns true when crontab binary is present", async () => {
      mockExecFileSync.mockImplementation((file: string, args: string[]) => {
        if (file === "sh" && args[1]?.includes("command -v crontab")) {
          return "/usr/bin/crontab\n";
        }
        return "";
      });
      expect(await adapter.isAvailable()).toBe(true);
    });

    it("returns false when crontab binary is absent", async () => {
      mockExecFileSync.mockImplementation(() => {
        throw new Error("not found");
      });
      expect(await adapter.isAvailable()).toBe(false);
    });
  });

  // ---------------------------------------------------------------------------
  // upsert
  // ---------------------------------------------------------------------------

  describe("upsert", () => {
    it("preserves a quoted root with spaces, shell text, and cron percent signs", async () => {
      const root = "/tmp/OMA 100%/'$(ignored)'";
      const command = [ABS_OMA, "schedule", "run", JOB_ID, "--oma-home", root];
      let content = "";
      mockExecFileSync.mockImplementation(
        (file: string, args: string[], options: { input?: string } = {}) => {
          if (file === "crontab" && args[0] === "-")
            content = options.input ?? "";
          if (file === "crontab" && args[0] === "-l") return content;
          return ABS_OMA;
        },
      );
      await adapter.upsert({ ...sampleSpec, command });
      expect(content).toContain("100\\%");
      expect(await adapter.readCommand(LABEL)).toEqual(command);
    });
    it("writes a marker block with the job line when no crontab exists", async () => {
      await adapter.upsert(sampleSpec);

      // writeCrontab calls execFileSync("crontab",["-"],{input: content})
      const writeCall = mockExecFileSync.mock.calls.find(
        (c: unknown[]) =>
          c[0] === "crontab" &&
          Array.isArray(c[1]) &&
          (c[1] as string[])[0] === "-",
      ) as [string, string[], { input: string }] | undefined;
      const content = writeCall?.[2]?.input ?? "";

      expect(content).toContain(MARKER_BEGIN);
      expect(content).toContain(MARKER_END);
      expect(content).toContain(`# oma:${LABEL}`);
    });

    it("job line contains absolute oma path (not bare 'oma')", async () => {
      await adapter.upsert(sampleSpec);

      const writeCall = mockExecFileSync.mock.calls.find(
        (c: unknown[]) =>
          c[0] === "crontab" &&
          Array.isArray(c[1]) &&
          (c[1] as string[])[0] === "-",
      ) as [string, string[], { input: string }] | undefined;
      const content = writeCall?.[2]?.input ?? "";

      // The line must use the absolute path
      expect(content).toContain(ABS_OMA);
      // The bare token "oma " must not be the binary name on any job line
      const jobLine = content
        .split("\n")
        .find((l) => l.includes(`# oma:${LABEL}`));
      expect(jobLine).toBeDefined();
      expect(jobLine).toContain(ABS_OMA);
      expect(jobLine).toContain("schedule:run");
      expect(jobLine).toContain(JOB_ID);
    });

    it("preserves pre-existing non-oma crontab lines", async () => {
      const existingCron = "# user comment\n0 0 * * * /usr/bin/backup.sh\n";
      mockExecFileSync.mockImplementation((file: string, args: string[]) => {
        if (file === "sh" && args[1]?.includes("command -v oma")) {
          return `${ABS_OMA}\n`;
        }
        if (file === "crontab" && args[0] === "-l") {
          return existingCron;
        }
        return "";
      });

      await adapter.upsert(sampleSpec);

      const writeCall = mockExecFileSync.mock.calls.find(
        (c: unknown[]) =>
          c[0] === "crontab" &&
          Array.isArray(c[1]) &&
          (c[1] as string[])[0] === "-",
      ) as [string, string[], { input: string }] | undefined;
      const content = writeCall?.[2]?.input ?? "";

      expect(content).toContain("# user comment");
      expect(content).toContain("/usr/bin/backup.sh");
      expect(content).toContain(MARKER_BEGIN);
      expect(content).toContain(`# oma:${LABEL}`);
    });

    it("is idempotent: second upsert replaces the existing line", async () => {
      const existingJob = `0 9 * * * ${ABS_OMA} schedule:run ${JOB_ID} # oma:${LABEL}`;
      const existingCron = `${MARKER_BEGIN}\n${existingJob}\n${MARKER_END}\n`;

      mockExecFileSync.mockImplementation((file: string, args: string[]) => {
        if (file === "sh" && args[1]?.includes("command -v oma")) {
          return `${ABS_OMA}\n`;
        }
        if (file === "crontab" && args[0] === "-l") {
          return existingCron;
        }
        return "";
      });

      await adapter.upsert(sampleSpec);

      const writeCall = mockExecFileSync.mock.calls.find(
        (c: unknown[]) =>
          c[0] === "crontab" &&
          Array.isArray(c[1]) &&
          (c[1] as string[])[0] === "-",
      ) as [string, string[], { input: string }] | undefined;
      const content = writeCall?.[2]?.input ?? "";

      // Label should appear exactly once
      const matches = content
        .split("\n")
        .filter((l) => l.includes(`# oma:${LABEL}`));
      expect(matches).toHaveLength(1);
    });

    it("reinstalls via execFileSync crontab ['-'] with input (no temp file)", async () => {
      await adapter.upsert(sampleSpec);

      // Verify execFileSync was called with crontab, ["-"], and an input option
      const writeCall = mockExecFileSync.mock.calls.find(
        (c: unknown[]) =>
          c[0] === "crontab" &&
          Array.isArray(c[1]) &&
          (c[1] as string[])[0] === "-",
      );
      expect(writeCall).toBeDefined();
      // No temp files should have been written
      expect(mockFsFunctions.writeFileSync).not.toHaveBeenCalled();
    });
  });

  // ---------------------------------------------------------------------------
  // remove
  // ---------------------------------------------------------------------------

  describe("remove", () => {
    it("drops the matching line but keeps other oma lines and non-oma lines", async () => {
      const otherId = "sch_other0000002";
      const otherLabel = `dev.oma.${otherId}`;
      const existingCron = [
        "# user comment",
        "0 0 * * * /usr/bin/backup.sh",
        MARKER_BEGIN,
        `0 9 * * * ${ABS_OMA} schedule:run ${JOB_ID} # oma:${LABEL}`,
        `0 10 * * * ${ABS_OMA} schedule:run ${otherId} # oma:${otherLabel}`,
        MARKER_END,
      ].join("\n");

      mockExecFileSync.mockImplementation((file: string, args: string[]) => {
        if (file === "sh" && args[1]?.includes("command -v oma")) {
          return `${ABS_OMA}\n`;
        }
        if (file === "crontab" && args[0] === "-l") {
          return existingCron;
        }
        return "";
      });

      await adapter.remove(LABEL);

      const writeCall = mockExecFileSync.mock.calls.find(
        (c: unknown[]) =>
          c[0] === "crontab" &&
          Array.isArray(c[1]) &&
          (c[1] as string[])[0] === "-",
      ) as [string, string[], { input: string }] | undefined;
      const content = writeCall?.[2]?.input ?? "";

      expect(content).not.toContain(`# oma:${LABEL}`);
      expect(content).toContain(`# oma:${otherLabel}`);
      expect(content).toContain("# user comment");
      expect(content).toContain("/usr/bin/backup.sh");
    });

    it("does not throw if label is not in crontab (no-op)", async () => {
      const existingCron = `${MARKER_BEGIN}\n${MARKER_END}\n`;
      mockExecFileSync.mockImplementation((file: string, args: string[]) => {
        if (file === "crontab" && args[0] === "-l") {
          return existingCron;
        }
        return "";
      });

      await expect(adapter.remove(LABEL)).resolves.not.toThrow();
    });
  });

  // ---------------------------------------------------------------------------
  // listLabels
  // ---------------------------------------------------------------------------

  describe("listLabels", () => {
    it("returns labels from # oma:<label> comments in the marker block", async () => {
      const label2 = "dev.oma.sch_other000002";
      const cron = [
        "# user line",
        MARKER_BEGIN,
        `0 9 * * * ${ABS_OMA} schedule:run ${JOB_ID} # oma:${LABEL}`,
        `0 10 * * * ${ABS_OMA} schedule:run other # oma:${label2}`,
        MARKER_END,
      ].join("\n");

      mockExecFileSync.mockImplementation((file: string, args: string[]) => {
        if (file === "crontab" && args[0] === "-l") {
          return cron;
        }
        return "";
      });

      const labels = await adapter.listLabels();
      expect(labels).toContain(LABEL);
      expect(labels).toContain(label2);
    });

    it("does not return labels from outside the marker block", async () => {
      const outsideLabel = "dev.oma.outside_label";
      const cron = [
        `0 9 * * * ${ABS_OMA} schedule:run outside # oma:${outsideLabel}`,
        MARKER_BEGIN,
        MARKER_END,
      ].join("\n");

      mockExecFileSync.mockImplementation((file: string, args: string[]) => {
        if (file === "crontab" && args[0] === "-l") {
          return cron;
        }
        return "";
      });

      const labels = await adapter.listLabels();
      expect(labels).not.toContain(outsideLabel);
    });

    it("returns empty array when no crontab exists", async () => {
      // default mock throws for crontab -l
      const labels = await adapter.listLabels();
      expect(labels).toEqual([]);
    });

    it("returns empty array when marker block exists but is empty", async () => {
      const cron = `${MARKER_BEGIN}\n${MARKER_END}\n`;
      mockExecFileSync.mockImplementation((file: string, args: string[]) => {
        if (file === "crontab" && args[0] === "-l") {
          return cron;
        }
        return "";
      });

      const labels = await adapter.listLabels();
      expect(labels).toEqual([]);
    });
  });
});
