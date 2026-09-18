/**
 * Tests for schedule/adapters/launchd.ts
 *
 * Covers:
 * - upsert: writes plist with correct ProgramArguments + launchctl bootstrap
 * - remove: launchctl bootout + plist deletion
 * - listLabels: glob ~/Library/LaunchAgents/dev.oma.*.plist
 * - isAvailable: process.platform === "darwin"
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

import { LaunchdAdapter } from "./launchd.js";

const LA_DIR = path.join(FAKE_HOME, "Library", "LaunchAgents");
const JOB_ID = "sch_testjob00001";
const LABEL = `dev.oma.${JOB_ID}`;
const PLIST_PATH = path.join(LA_DIR, `${LABEL}.plist`);
const WORKSPACE = "/projects/my-app";

const sampleSpec = {
  id: JOB_ID,
  cron: "0 9 * * *",
  command: ["oma", "schedule:run", JOB_ID],
  label: LABEL,
  workspace: WORKSPACE,
};

describe("LaunchdAdapter", () => {
  let adapter: LaunchdAdapter;

  beforeEach(() => {
    adapter = new LaunchdAdapter();
    vi.clearAllMocks();
    // Default: dirs exist
    mockFsFunctions.existsSync.mockReturnValue(true);
    // execFileSync("sh",["-c","command -v oma"]) resolves to absolute path;
    // execFileSync("id",["-u"]) returns uid; launchctl calls succeed.
    mockExecFileSync.mockImplementation((file: string, args: string[]) => {
      if (file === "sh" && args[1]?.includes("command -v oma")) {
        return "/usr/local/bin/oma\n";
      }
      if (file === "id" && args[0] === "-u") {
        return "501\n";
      }
      return "";
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ---------------------------------------------------------------------------
  // isAvailable
  // ---------------------------------------------------------------------------

  describe("isAvailable", () => {
    it("returns true on darwin", async () => {
      const orig = process.platform;
      Object.defineProperty(process, "platform", { value: "darwin" });
      expect(await adapter.isAvailable()).toBe(true);
      Object.defineProperty(process, "platform", { value: orig });
    });

    it("returns false on linux", async () => {
      const orig = process.platform;
      Object.defineProperty(process, "platform", { value: "linux" });
      expect(await adapter.isAvailable()).toBe(false);
      Object.defineProperty(process, "platform", { value: orig });
    });
  });

  // ---------------------------------------------------------------------------
  // upsert
  // ---------------------------------------------------------------------------

  describe("upsert", () => {
    it("writes a plist file to ~/Library/LaunchAgents/", async () => {
      await adapter.upsert(sampleSpec);

      expect(mockFsFunctions.writeFileSync).toHaveBeenCalledWith(
        PLIST_PATH,
        expect.any(String),
        { mode: 0o644 },
      );
    });

    it("plist contains ProgramArguments with resolved oma binary, schedule:run, <id>", async () => {
      await adapter.upsert(sampleSpec);

      const writeCall = mockFsFunctions.writeFileSync.mock.calls.find(
        (c: unknown[]) => c[0] === PLIST_PATH,
      ) as [string, string] | undefined;
      const plistContent = writeCall?.[1] ?? "";

      expect(plistContent).toContain("<key>ProgramArguments</key>");
      // Bare "oma" is resolved to an absolute path so launchd (minimal PATH,
      // no shell) can find it; the bare form must NOT survive.
      expect(plistContent).not.toContain("<string>oma</string>");
      expect(plistContent).toContain("<string>/usr/local/bin/oma</string>");
      expect(plistContent).toContain("<string>schedule:run</string>");
      expect(plistContent).toContain(`<string>${JOB_ID}</string>`);
    });

    it("plist injects an EnvironmentVariables PATH covering the binary dir", async () => {
      await adapter.upsert(sampleSpec);

      const writeCall = mockFsFunctions.writeFileSync.mock.calls.find(
        (c: unknown[]) => c[0] === PLIST_PATH,
      ) as [string, string] | undefined;
      const plistContent = writeCall?.[1] ?? "";

      expect(plistContent).toContain("<key>EnvironmentVariables</key>");
      expect(plistContent).toContain("<key>PATH</key>");
      expect(plistContent).toMatch(
        /<key>PATH<\/key>\s*<string>[^<]*\/usr\/local\/bin[^<]*<\/string>/,
      );
    });

    it("calls execFileSync launchctl bootstrap with gui/<uid> and plist path", async () => {
      // bootout throws (not currently loaded), bootstrap succeeds
      mockExecFileSync.mockImplementation((file: string, args: string[]) => {
        if (file === "sh" && args[1]?.includes("command -v oma")) {
          return "/usr/local/bin/oma\n";
        }
        if (file === "id" && args[0] === "-u") return "501\n";
        if (file === "launchctl" && args[0] === "bootout") {
          throw new Error("not loaded");
        }
        return "";
      });

      await adapter.upsert(sampleSpec);

      const bootstrapCall = mockExecFileSync.mock.calls.find(
        (c: unknown[]) =>
          c[0] === "launchctl" &&
          Array.isArray(c[1]) &&
          (c[1] as string[])[0] === "bootstrap",
      ) as [string, string[]] | undefined;

      expect(bootstrapCall).toBeDefined();
      // args[1] = target ("gui/501"), args[2] = plist path
      expect(bootstrapCall?.[1][1]).toBe("gui/501");
      expect(bootstrapCall?.[1][2]).toBe(PLIST_PATH);
    });

    it("plist contains StartCalendarInterval with correct minute and hour", async () => {
      await adapter.upsert(sampleSpec);

      const writeCall = mockFsFunctions.writeFileSync.mock.calls.find(
        (c: unknown[]) => c[0] === PLIST_PATH,
      ) as [string, string] | undefined;
      const plistContent = writeCall?.[1] ?? "";

      expect(plistContent).toContain("<key>StartCalendarInterval</key>");
      // cron "0 9 * * *" -> Minute=0, Hour=9
      expect(plistContent).toContain("<key>Minute</key><integer>0</integer>");
      expect(plistContent).toContain("<key>Hour</key><integer>9</integer>");
    });

    it("plist WorkingDirectory matches spec.workspace", async () => {
      await adapter.upsert(sampleSpec);

      const writeCall = mockFsFunctions.writeFileSync.mock.calls.find(
        (c: unknown[]) => c[0] === PLIST_PATH,
      ) as [string, string] | undefined;
      const plistContent = writeCall?.[1] ?? "";

      expect(plistContent).toContain(
        `<key>WorkingDirectory</key>\n  <string>${WORKSPACE}</string>`,
      );
    });

    it("creates LaunchAgents dir if it does not exist", async () => {
      mockFsFunctions.existsSync.mockImplementation(
        (p: string) => p !== LA_DIR,
      );

      await adapter.upsert(sampleSpec);

      expect(mockFsFunctions.mkdirSync).toHaveBeenCalledWith(LA_DIR, {
        recursive: true,
      });
    });
  });

  // ---------------------------------------------------------------------------
  // remove
  // ---------------------------------------------------------------------------

  describe("remove", () => {
    it("calls execFileSync launchctl bootout with the label in the target arg", async () => {
      await adapter.remove(LABEL);

      const bootoutCall = mockExecFileSync.mock.calls.find(
        (c: unknown[]) =>
          c[0] === "launchctl" &&
          Array.isArray(c[1]) &&
          (c[1] as string[])[0] === "bootout",
      ) as [string, string[]] | undefined;

      expect(bootoutCall).toBeDefined();
      // target arg is "gui/<uid>/<label>"
      const targetArg = bootoutCall?.[1]?.[1] ?? "";
      expect(targetArg).toContain(LABEL);
    });

    it("deletes the plist file if it exists", async () => {
      mockFsFunctions.existsSync.mockImplementation(
        (p: string) => p === PLIST_PATH,
      );

      await adapter.remove(LABEL);

      expect(mockFsFunctions.unlinkSync).toHaveBeenCalledWith(PLIST_PATH);
    });

    it("does not throw if plist does not exist (no-op)", async () => {
      mockFsFunctions.existsSync.mockReturnValue(false);
      mockExecFileSync.mockImplementation(() => {
        throw new Error("not loaded");
      });

      await expect(adapter.remove(LABEL)).resolves.not.toThrow();
      expect(mockFsFunctions.unlinkSync).not.toHaveBeenCalled();
    });
  });

  // ---------------------------------------------------------------------------
  // listLabels
  // ---------------------------------------------------------------------------

  describe("listLabels", () => {
    it("returns oma-managed labels from ~/Library/LaunchAgents/", async () => {
      mockFsFunctions.readdirSync.mockReturnValue([
        "dev.oma.sch_aaa.plist",
        "dev.oma.sch_bbb.plist",
        "com.other.app.plist",
      ]);

      const labels = await adapter.listLabels();

      expect(labels).toContain("dev.oma.sch_aaa");
      expect(labels).toContain("dev.oma.sch_bbb");
      expect(labels).not.toContain("com.other.app");
    });

    it("returns empty array when LaunchAgents dir does not exist", async () => {
      mockFsFunctions.existsSync.mockReturnValue(false);

      const labels = await adapter.listLabels();
      expect(labels).toEqual([]);
    });

    it("returns empty array when no oma plists exist", async () => {
      mockFsFunctions.readdirSync.mockReturnValue([
        "com.apple.something.plist",
        "com.other.app.plist",
      ]);

      const labels = await adapter.listLabels();
      expect(labels).toEqual([]);
    });
  });
});

describe("LaunchdAdapter.readCommand", () => {
  it("returns the registered ProgramArguments, XML-unescaped", async () => {
    mockFsFunctions.existsSync.mockReturnValue(true);
    mockFsFunctions.readFileSync.mockReturnValue(`<?xml version="1.0"?>
<plist version="1.0">
<dict>
  <key>Label</key>
  <string>${LABEL}</string>
  <key>ProgramArguments</key>
  <array>
      <string>/Users/me/.bun/bin/oma</string>
      <string>schedule:run</string>
      <string>${JOB_ID}</string>
  </array>
  <key>WorkingDirectory</key>
  <string>/p&amp;q</string>
</dict>
</plist>`);

    const adapter = new LaunchdAdapter();
    expect(await adapter.readCommand(LABEL)).toEqual([
      "/Users/me/.bun/bin/oma",
      "schedule:run",
      JOB_ID,
    ]);
    expect(mockFsFunctions.readFileSync).toHaveBeenCalledWith(
      PLIST_PATH,
      "utf-8",
    );
  });

  it("returns null when the plist is absent", async () => {
    mockFsFunctions.existsSync.mockReturnValue(false);
    const adapter = new LaunchdAdapter();
    expect(await adapter.readCommand(LABEL)).toBeNull();
  });
});
