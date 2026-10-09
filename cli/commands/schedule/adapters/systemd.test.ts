/**
 * Tests for schedule/adapters/systemd.ts
 *
 * Covers:
 * - isAvailable: true on linux when systemctl --user works, false on other platforms
 * - upsert: writes .service + .timer with absolute ExecStart; calls daemon-reload + enable --now
 * - remove: calls disable --now, deletes unit files, daemon-reload
 * - listLabels: globs ~/.config/systemd/user/dev.oma.*.timer -> strips .timer
 * - cronToOnCalendar: common cron shapes correctly translated
 */

import * as path from "node:path";
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
  readFileSync: vi.fn(),
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

import { cronToOnCalendar, SystemdAdapter } from "./systemd.js";

const UNIT_DIR = path.join(FAKE_HOME, ".config", "systemd", "user");
const JOB_ID = "sch_testjob00001";
const LABEL = `dev.oma.${JOB_ID}`;
const WORKSPACE = "/projects/my-app";

const sampleSpec = {
  id: JOB_ID,
  cron: "0 9 * * *",
  command: ["oma", "schedule:run", JOB_ID],
  label: LABEL,
  workspace: WORKSPACE,
};

describe("SystemdAdapter", () => {
  let adapter: SystemdAdapter;

  beforeEach(() => {
    adapter = new SystemdAdapter();
    vi.clearAllMocks();
    // Default: dirs exist
    mockFsFunctions.existsSync.mockReturnValue(true);
    // execFileSync("sh",["-c","command -v oma"]) resolves; systemctl calls succeed
    mockExecFileSync.mockImplementation((file: string, args: string[]) => {
      if (file === "sh" && args[1]?.includes("command -v oma")) {
        return "/usr/local/bin/oma\n";
      }
      return "";
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
  });

  // ---------------------------------------------------------------------------
  // isAvailable
  // ---------------------------------------------------------------------------

  describe("isAvailable", () => {
    it("returns false on non-linux platforms", async () => {
      const orig = process.platform;
      Object.defineProperty(process, "platform", { value: "darwin" });
      expect(await adapter.isAvailable()).toBe(false);
      Object.defineProperty(process, "platform", { value: orig });
    });

    it("returns true on linux when systemctl --user succeeds", async () => {
      const orig = process.platform;
      Object.defineProperty(process, "platform", { value: "linux" });
      mockExecFileSync.mockImplementation(() => "");
      expect(await adapter.isAvailable()).toBe(true);
      Object.defineProperty(process, "platform", { value: orig });
    });

    it("returns true on linux when systemctl --user exits with non-zero but not DBUS error", async () => {
      const orig = process.platform;
      Object.defineProperty(process, "platform", { value: "linux" });
      mockExecFileSync.mockImplementation(() => {
        throw new Error("exit code 3");
      });
      expect(await adapter.isAvailable()).toBe(true);
      Object.defineProperty(process, "platform", { value: orig });
    });

    it("returns false on linux when DBUS is unavailable", async () => {
      const orig = process.platform;
      Object.defineProperty(process, "platform", { value: "linux" });
      mockExecFileSync.mockImplementation(() => {
        throw new Error(
          "Failed to connect to bus: DBUS_SESSION_BUS_ADDRESS not set",
        );
      });
      expect(await adapter.isAvailable()).toBe(false);
      Object.defineProperty(process, "platform", { value: orig });
    });
  });

  // ---------------------------------------------------------------------------
  // upsert
  // ---------------------------------------------------------------------------

  describe("upsert", () => {
    it("preserves storage roots containing spaces, dollars, and systemd specifiers", async () => {
      const root = "/tmp/OMA 100%/$private";
      vi.stubEnv("OMA_HOME", root);
      const command = [
        "/usr/local/bin/oma",
        "schedule",
        "run",
        JOB_ID,
        "--oma-home",
        root,
      ];
      await adapter.upsert({ ...sampleSpec, command });
      const service = mockFsFunctions.writeFileSync.mock.calls.find((call) =>
        String(call[0]).endsWith(".service"),
      )?.[1] as string;
      expect(service).toContain('"/tmp/OMA 100%%/$$private"');
      expect(service).toContain(
        `StandardOutput=append:/tmp/OMA 100%%/$private/schedule/runs/${JOB_ID}/stdout.log`,
      );
      mockFsFunctions.readFileSync.mockReturnValue(service);
      expect(await adapter.readCommand(LABEL)).toEqual(command);
    });
    it("writes .service and .timer unit files", async () => {
      await adapter.upsert(sampleSpec);

      const writeCalls = mockFsFunctions.writeFileSync.mock.calls as [
        string,
        string,
        { mode: number },
      ][];
      const paths = writeCalls.map((c) => c[0]);
      expect(paths).toContain(path.join(UNIT_DIR, `${LABEL}.service`));
      expect(paths).toContain(path.join(UNIT_DIR, `${LABEL}.timer`));
    });

    it("service ExecStart uses absolute oma path (not bare 'oma')", async () => {
      await adapter.upsert(sampleSpec);

      const serviceCall = (
        mockFsFunctions.writeFileSync.mock.calls as [string, string][]
      ).find((c) => c[0].endsWith(".service"));
      const content = serviceCall?.[1] ?? "";

      expect(content).toContain("ExecStart=");
      expect(content).toContain("/usr/local/bin/oma");
      expect(content).toContain("schedule:run");
      expect(content).toContain(JOB_ID);
      // bare "oma" must NOT appear as first token in ExecStart
      expect(content).not.toMatch(/ExecStart=oma\s/);
    });

    it("service WorkingDirectory matches spec.workspace", async () => {
      await adapter.upsert(sampleSpec);

      const serviceCall = (
        mockFsFunctions.writeFileSync.mock.calls as [string, string][]
      ).find((c) => c[0].endsWith(".service"));
      const content = serviceCall?.[1] ?? "";

      expect(content).toContain(`WorkingDirectory=${WORKSPACE}`);
    });

    it("service Environment line contains PATH", async () => {
      await adapter.upsert(sampleSpec);

      const serviceCall = (
        mockFsFunctions.writeFileSync.mock.calls as [string, string][]
      ).find((c) => c[0].endsWith(".service"));
      const content = serviceCall?.[1] ?? "";

      expect(content).toMatch(/Environment=PATH=.*\/usr\/local\/bin/);
    });

    it("timer OnCalendar reflects translated cron", async () => {
      await adapter.upsert(sampleSpec);

      const timerCall = (
        mockFsFunctions.writeFileSync.mock.calls as [string, string][]
      ).find((c) => c[0].endsWith(".timer"));
      const content = timerCall?.[1] ?? "";

      expect(content).toContain("OnCalendar=");
      // "0 9 * * *" -> "*-*-* 09:00:00"
      expect(content).toContain("OnCalendar=*-*-* 09:00:00");
    });

    it("timer has Persistent=true", async () => {
      await adapter.upsert(sampleSpec);

      const timerCall = (
        mockFsFunctions.writeFileSync.mock.calls as [string, string][]
      ).find((c) => c[0].endsWith(".timer"));
      const content = timerCall?.[1] ?? "";

      expect(content).toContain("Persistent=true");
    });

    it("calls execFileSync systemctl --user daemon-reload then enable --now", async () => {
      await adapter.upsert(sampleSpec);

      const calls = mockExecFileSync.mock.calls as [string, string[]][];
      const daemonReload = calls.find(
        (c) =>
          c[0] === "systemctl" &&
          c[1].includes("--user") &&
          c[1].includes("daemon-reload"),
      );
      const enableNow = calls.find(
        (c) =>
          c[0] === "systemctl" &&
          c[1].includes("--user") &&
          c[1].includes("enable") &&
          c[1].includes("--now"),
      );
      expect(daemonReload).toBeDefined();
      expect(enableNow).toBeDefined();
      // The timer name must be in the enable --now args
      const enableArgs = enableNow?.[1] ?? [];
      expect(enableArgs.some((a: string) => a.includes(`${LABEL}.timer`))).toBe(
        true,
      );
    });

    it("creates unit dir if it does not exist", async () => {
      mockFsFunctions.existsSync.mockImplementation(
        (p: string) => p !== UNIT_DIR,
      );

      await adapter.upsert(sampleSpec);

      expect(mockFsFunctions.mkdirSync).toHaveBeenCalledWith(UNIT_DIR, {
        recursive: true,
      });
    });
  });

  // ---------------------------------------------------------------------------
  // remove
  // ---------------------------------------------------------------------------

  describe("remove", () => {
    it("calls execFileSync systemctl --user disable --now <label>.timer", async () => {
      await adapter.remove(LABEL);

      const calls = mockExecFileSync.mock.calls as [string, string[]][];
      const disableCall = calls.find(
        (c) =>
          c[0] === "systemctl" &&
          c[1].includes("--user") &&
          c[1].includes("disable") &&
          c[1].includes("--now"),
      );
      expect(disableCall).toBeDefined();
      const disableArgs = disableCall?.[1] ?? [];
      expect(
        disableArgs.some((a: string) => a.includes(`${LABEL}.timer`)),
      ).toBe(true);
    });

    it("deletes .service and .timer files if they exist", async () => {
      mockFsFunctions.existsSync.mockReturnValue(true);

      await adapter.remove(LABEL);

      const unlinkPaths = (
        mockFsFunctions.unlinkSync.mock.calls as [string][]
      ).map((c) => c[0]);
      expect(unlinkPaths).toContain(path.join(UNIT_DIR, `${LABEL}.service`));
      expect(unlinkPaths).toContain(path.join(UNIT_DIR, `${LABEL}.timer`));
    });

    it("does not throw if unit files do not exist (no-op)", async () => {
      mockFsFunctions.existsSync.mockReturnValue(false);
      mockExecFileSync.mockImplementation(() => {
        throw new Error("not found");
      });

      await expect(adapter.remove(LABEL)).resolves.not.toThrow();
      expect(mockFsFunctions.unlinkSync).not.toHaveBeenCalled();
    });

    it("calls daemon-reload after removing units", async () => {
      await adapter.remove(LABEL);

      const calls = mockExecFileSync.mock.calls as [string, string[]][];
      const reload = calls.find(
        (c) =>
          c[0] === "systemctl" &&
          c[1].includes("--user") &&
          c[1].includes("daemon-reload"),
      );
      expect(reload).toBeDefined();
    });
  });

  // ---------------------------------------------------------------------------
  // listLabels
  // ---------------------------------------------------------------------------

  describe("listLabels", () => {
    it("returns oma-managed labels from ~/.config/systemd/user/*.timer", async () => {
      mockFsFunctions.readdirSync.mockReturnValue([
        "dev.oma.sch_aaa.timer",
        "dev.oma.sch_bbb.timer",
        "dev.oma.sch_aaa.service",
        "other.service",
      ]);

      const labels = await adapter.listLabels();
      expect(labels).toContain("dev.oma.sch_aaa");
      expect(labels).toContain("dev.oma.sch_bbb");
      expect(labels).not.toContain("other");
    });

    it("returns empty array when unit dir does not exist", async () => {
      mockFsFunctions.existsSync.mockReturnValue(false);

      const labels = await adapter.listLabels();
      expect(labels).toEqual([]);
    });

    it("returns empty array when no oma timers exist", async () => {
      mockFsFunctions.readdirSync.mockReturnValue([
        "other.timer",
        "unrelated.service",
      ]);

      const labels = await adapter.listLabels();
      expect(labels).toEqual([]);
    });
  });
});

// ---------------------------------------------------------------------------
// cronToOnCalendar -- unit tests
// ---------------------------------------------------------------------------

describe("cronToOnCalendar", () => {
  it("translates '0 9 * * *' (daily at 09:00) correctly", () => {
    expect(cronToOnCalendar("0 9 * * *")).toBe("*-*-* 09:00:00");
  });

  it("translates '*/5 * * * *' (every 5 minutes) correctly", () => {
    expect(cronToOnCalendar("*/5 * * * *")).toBe("*-*-* *:*/5:00");
  });

  it("translates '30 6 * * 1' (Monday at 06:30) with dow name", () => {
    const result = cronToOnCalendar("30 6 * * 1");
    expect(result).toContain("Mon");
    expect(result).toContain("06:30:00");
  });

  it("translates '0 0 1 * *' (first of month at midnight)", () => {
    expect(cronToOnCalendar("0 0 1 * *")).toBe("*-*-1 00:00:00");
  });

  it("translates '0 12 * 6 *' (noon in June)", () => {
    expect(cronToOnCalendar("0 12 * 6 *")).toBe("*-6-* 12:00:00");
  });

  it("translates list dow '0 9 * * 1,3,5' (Mon/Wed/Fri)", () => {
    const result = cronToOnCalendar("0 9 * * 1,3,5");
    // Should contain all three days
    expect(result).toContain("Mon");
    expect(result).toContain("09:00:00");
  });

  it("translates range dom '0 8 1-5 * *'", () => {
    // range 1-5 in dom
    const result = cronToOnCalendar("0 8 1-5 * *");
    expect(result).toContain("1..5");
    expect(result).toContain("08:00:00");
  });

  it("throws on unsupported range+step pattern", () => {
    expect(() => cronToOnCalendar("0 9 * * 1-5/2")).toThrow(/range\+step/);
  });

  it("throws on invalid cron (wrong number of fields)", () => {
    expect(() => cronToOnCalendar("0 9 *")).toThrow(/5 fields/);
  });
});
