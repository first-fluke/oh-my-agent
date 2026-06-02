import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  DEFAULT_AGENTMEMORY_PORT,
  getAgentMemoryServicePresence,
  installAgentMemoryService,
  parsePositivePort,
  uninstallAgentMemoryService,
} from "./agentmemory-service.js";

describe("agentmemory-service", () => {
  let homeDir: string;

  beforeEach(() => {
    homeDir = mkdtempSync(join(tmpdir(), "oma-am-service-"));
  });

  afterEach(() => {
    rmSync(homeDir, { recursive: true, force: true });
  });

  describe("parsePositivePort", () => {
    it("returns null for undefined and the number otherwise", () => {
      expect(parsePositivePort(undefined)).toBeNull();
      expect(parsePositivePort(3200)).toBe(3200);
      expect(parsePositivePort("3201")).toBe(3201);
    });

    it("rejects out-of-range or non-integer ports", () => {
      expect(() => parsePositivePort(0)).toThrow(/invalid AgentMemory port/);
      expect(() => parsePositivePort(70000)).toThrow(
        /invalid AgentMemory port/,
      );
      expect(() => parsePositivePort("nope")).toThrow(/invalid AgentMemory/);
    });
  });

  describe("getAgentMemoryServicePresence", () => {
    it("reports the launchd path on darwin and tracks installation", () => {
      const before = getAgentMemoryServicePresence({
        homeDir,
        platform: "darwin",
      });
      expect(before).toMatchObject({
        platform: "darwin",
        supported: true,
        installed: false,
      });
      expect(before.servicePath).toMatch(/dev\.oma\.agentmemory\.plist$/);

      installAgentMemoryService({
        homeDir,
        platform: "darwin",
        runner: () => ({ status: 0 }),
      });
      const after = getAgentMemoryServicePresence({
        homeDir,
        platform: "darwin",
      });
      expect(after.installed).toBe(true);
    });

    it("marks unsupported platforms", () => {
      expect(
        getAgentMemoryServicePresence({ homeDir, platform: "aix" }),
      ).toMatchObject({ supported: false, installed: false });
    });

    it("supports win32 via a scheduled-task xml path", () => {
      const presence = getAgentMemoryServicePresence({
        homeDir,
        platform: "win32",
      });
      expect(presence.supported).toBe(true);
      expect(presence.servicePath).toMatch(/oma-agentmemory\.task\.xml$/);
    });
  });

  describe("installAgentMemoryService", () => {
    it("renders a launchd plist with the requested port on dry run", () => {
      const result = installAgentMemoryService({
        homeDir,
        platform: "darwin",
        dryRun: true,
        port: 3456,
      });
      expect(result).toMatchObject({
        action: "install",
        platform: "darwin",
        supported: true,
        wroteFile: false,
        activated: false,
      });
      expect(result.content).toContain("<key>III_REST_PORT</key>");
      expect(result.content).toContain("3456");
      expect(result.content).toContain("dev.oma.agentmemory");
      // Pins the cwd-relative ./data store to the config home (D: data home).
      expect(result.content).toContain("<key>WorkingDirectory</key>");
      expect(result.content).toMatch(
        /WorkingDirectory<\/key>\s*<string>.*\.agentmemory<\/string>/,
      );
      expect(result.commands).toEqual(
        expect.arrayContaining([
          expect.stringContaining("launchctl bootstrap"),
        ]),
      );
    });

    it("renders a systemd unit on linux with the default port", () => {
      const result = installAgentMemoryService({
        homeDir,
        platform: "linux",
        dryRun: true,
      });
      expect(result.content).toContain("[Service]");
      expect(result.content).toContain(
        `III_REST_PORT=${DEFAULT_AGENTMEMORY_PORT}`,
      );
      expect(result.commands).toEqual(
        expect.arrayContaining([expect.stringContaining("systemctl --user")]),
      );
    });

    it("writes the file and runs activation commands when not a dry run", () => {
      const ran: string[] = [];
      const result = installAgentMemoryService({
        homeDir,
        platform: "darwin",
        runner(command) {
          ran.push([command.bin, ...command.args].join(" "));
          return { status: 0 };
        },
      });
      expect(result.wroteFile).toBe(true);
      expect(result.activated).toBe(true);
      expect(existsSync(result.servicePath ?? "")).toBe(true);
      expect(ran.some((line) => line.includes("launchctl bootstrap"))).toBe(
        true,
      );
    });

    it("reports activation failure when a required command fails", () => {
      const result = installAgentMemoryService({
        homeDir,
        platform: "linux",
        runner(command) {
          // daemon-reload succeeds, enable fails.
          if (command.args.includes("enable")) {
            return { status: 1, error: "boom" };
          }
          return { status: 0 };
        },
      });
      expect(result.wroteFile).toBe(true);
      expect(result.activated).toBe(false);
      expect(result.commandError).toBe("boom");
      expect(result.message).toContain("activation failed");
    });

    it("falls back to legacy launchctl load -w when bootstrap fails (EIO)", () => {
      const ran: string[] = [];
      const result = installAgentMemoryService({
        homeDir,
        platform: "darwin",
        runner(command) {
          ran.push([command.bin, ...command.args].join(" "));
          // Modern bootstrap fails with EIO; legacy `load -w` succeeds.
          if (command.args.includes("bootstrap")) {
            return { status: 5, error: "Input/output error" };
          }
          if (command.args.includes("load")) return { status: 0 };
          return { status: 0 };
        },
      });
      expect(result.activated).toBe(true);
      expect(result.message).toContain("activated");
      expect(ran.some((line) => line.includes("launchctl load -w"))).toBe(true);
      expect(result.commands.some((c) => c.includes("load -w"))).toBe(true);
    });

    it("stays failed when both bootstrap and legacy load fail", () => {
      const result = installAgentMemoryService({
        homeDir,
        platform: "darwin",
        runner(command) {
          if (command.args.includes("bootout")) return { status: 0 };
          return { status: 5, error: "Input/output error" };
        },
      });
      expect(result.activated).toBe(false);
      expect(result.message).toContain("activation failed");
    });

    it("is a no-op on unsupported platforms", () => {
      const result = installAgentMemoryService({ homeDir, platform: "aix" });
      expect(result).toMatchObject({
        supported: false,
        wroteFile: false,
        activated: false,
      });
      expect(result.message).toContain("not supported");
    });

    it("renders a Windows Task Scheduler XML with cwd pin and port on dry run", () => {
      const result = installAgentMemoryService({
        homeDir,
        platform: "win32",
        dryRun: true,
        port: 3460,
      });
      expect(result).toMatchObject({ supported: true, wroteFile: false });
      expect(result.content).toContain("<WorkingDirectory>");
      expect(result.content).toContain(".agentmemory");
      expect(result.content).toContain("III_REST_PORT=3460");
      // IgnoreNew prevents the overlapping-engine race on Windows.
      expect(result.content).toContain("IgnoreNew");
      expect(result.commands).toEqual(
        expect.arrayContaining([
          expect.stringContaining(`schtasks /create /tn ${"OMA AgentMemory"}`),
          expect.stringContaining("schtasks /run /tn"),
        ]),
      );
    });

    it("writes the task xml and registers it via schtasks on win32", () => {
      const ran: string[] = [];
      const result = installAgentMemoryService({
        homeDir,
        platform: "win32",
        runner(command) {
          ran.push([command.bin, ...command.args].join(" "));
          return { status: 0 };
        },
      });
      expect(result.wroteFile).toBe(true);
      expect(result.activated).toBe(true);
      expect(existsSync(result.servicePath ?? "")).toBe(true);
      expect(ran.some((line) => line.includes("schtasks /create"))).toBe(true);
      expect(ran.some((line) => line.includes("schtasks /run"))).toBe(true);
    });
  });

  describe("uninstallAgentMemoryService", () => {
    it("removes the file and runs disable commands", () => {
      const installed = installAgentMemoryService({
        homeDir,
        platform: "darwin",
        runner: () => ({ status: 0 }),
      });
      expect(existsSync(installed.servicePath ?? "")).toBe(true);

      const ran: string[] = [];
      const result = uninstallAgentMemoryService({
        homeDir,
        platform: "darwin",
        runner(command) {
          ran.push([command.bin, ...command.args].join(" "));
          return { status: 0 };
        },
      });
      expect(result).toMatchObject({
        action: "uninstall",
        supported: true,
        removedFile: true,
      });
      expect(ran.some((line) => line.includes("launchctl disable"))).toBe(true);
      expect(existsSync(installed.servicePath ?? "")).toBe(false);
    });

    it("keeps optional command failures from blocking removal", () => {
      const servicePath = getAgentMemoryServicePresence({
        homeDir,
        platform: "linux",
      }).servicePath;
      const target = servicePath ?? join(homeDir, "svc");
      mkdirSync(dirname(target), { recursive: true });
      writeFileSync(target, "stub", "utf-8");

      const result = uninstallAgentMemoryService({
        homeDir,
        platform: "linux",
        runner(command) {
          // The disable command is optional; daemon-reload is required.
          if (command.args.includes("disable")) {
            return { status: 1, error: "already gone" };
          }
          return { status: 0 };
        },
      });
      expect(result.removedFile).toBe(true);
      expect(existsSync(servicePath ?? "")).toBe(false);
    });

    it("deletes the scheduled task and removes the xml on win32", () => {
      const installed = installAgentMemoryService({
        homeDir,
        platform: "win32",
        runner: () => ({ status: 0 }),
      });
      expect(existsSync(installed.servicePath ?? "")).toBe(true);

      const ran: string[] = [];
      const result = uninstallAgentMemoryService({
        homeDir,
        platform: "win32",
        runner(command) {
          ran.push([command.bin, ...command.args].join(" "));
          return { status: 0 };
        },
      });
      expect(result).toMatchObject({ supported: true, removedFile: true });
      expect(ran.some((line) => line.includes("schtasks /delete"))).toBe(true);
      expect(existsSync(installed.servicePath ?? "")).toBe(false);
    });
  });
});
