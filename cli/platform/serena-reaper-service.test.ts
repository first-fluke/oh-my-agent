import { existsSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { reaperServiceCommands } from "./serena-reaper/service-commands.js";
import {
  LAUNCHD_SERENA_REAPER_LABEL,
  renderSerenaReaperLaunchdPlist,
  renderSerenaReaperSystemdService,
  renderSerenaReaperSystemdTimer,
  renderSerenaReaperWindowsTaskXml,
  SERENA_REAPER_TASK_NAME,
  serenaReaperServicePath,
} from "./serena-reaper/service-files.js";
import {
  getSerenaReaperServicePresence,
  installSerenaReaperService,
  uninstallSerenaReaperService,
} from "./serena-reaper-service.js";

describe("serena-reaper service-files", () => {
  let homeDir: string;

  beforeEach(() => {
    homeDir = mkdtempSync(join(tmpdir(), "oma-sr-files-"));
  });

  afterEach(() => {
    rmSync(homeDir, { recursive: true, force: true });
  });

  describe("renderSerenaReaperLaunchdPlist", () => {
    it("uses StartInterval (not KeepAlive) for periodic execution", () => {
      const content = renderSerenaReaperLaunchdPlist({ homeDir });
      expect(content).toContain("<key>StartInterval</key>");
      expect(content).toContain("<integer>300</integer>");
      expect(content).not.toContain("<key>KeepAlive</key>");
    });

    it("includes the label dev.oma.serena-reaper", () => {
      const content = renderSerenaReaperLaunchdPlist({ homeDir });
      expect(content).toContain(LAUNCHD_SERENA_REAPER_LABEL);
    });

    it("runs serena reap --quiet through the oma that installed it", () => {
      const content = renderSerenaReaperLaunchdPlist({
        homeDir,
        invocation: ["/opt/node/bin/node", "/opt/oma/bin/cli.js"],
      });
      expect(content).toContain(
        "<array><string>/opt/node/bin/node</string><string>/opt/oma/bin/cli.js</string><string>serena</string><string>reap</string><string>--quiet</string></array>",
      );
      expect(content).not.toContain("/usr/bin/env");
    });

    it("includes PATH in EnvironmentVariables", () => {
      const content = renderSerenaReaperLaunchdPlist({ homeDir });
      expect(content).toContain("<key>PATH</key>");
    });
  });

  describe("renderSerenaReaperSystemdTimer", () => {
    it("uses OnBootSec and OnUnitActiveSec (periodic timer, not socket-activated)", () => {
      const content = renderSerenaReaperSystemdTimer();
      expect(content).toContain("OnBootSec=");
      expect(content).toContain("OnUnitActiveSec=");
      expect(content).toContain("300s");
    });

    it("references the companion .service unit", () => {
      const content = renderSerenaReaperSystemdTimer();
      expect(content).toContain("oma-serena-reaper.service");
    });

    it("installs into timers.target (not default.target)", () => {
      const content = renderSerenaReaperSystemdTimer();
      expect(content).toContain("WantedBy=timers.target");
    });
  });

  describe("renderSerenaReaperSystemdService", () => {
    it("is a oneshot service (not a daemon)", () => {
      const content = renderSerenaReaperSystemdService({ homeDir });
      expect(content).toContain("Type=oneshot");
    });

    it("runs serena reap --quiet through the oma that installed it", () => {
      const content = renderSerenaReaperSystemdService({
        homeDir,
        invocation: ["/opt/node/bin/node", "/opt/oma/bin/cli.js"],
      });
      expect(content).toContain(
        'ExecStart="/opt/node/bin/node" "/opt/oma/bin/cli.js" "serena" "reap" "--quiet"',
      );
    });
  });

  describe("renderSerenaReaperWindowsTaskXml", () => {
    it("uses TimeTrigger with a Repetition Interval (not LogonTrigger-only)", () => {
      const content = renderSerenaReaperWindowsTaskXml();
      expect(content).toContain("<TimeTrigger>");
      // Task Scheduler schema: <Repetition><Interval>PT5M</Interval></Repetition>
      expect(content).toContain("<Repetition>");
      expect(content).toContain("<Interval>PT5M</Interval>");
      expect(content).not.toContain("<LogonTrigger>");
    });

    it("runs serena reap --quiet through the oma that installed it", () => {
      const content = renderSerenaReaperWindowsTaskXml([
        "C:\\node.exe",
        "C:\\oma\\cli.js",
      ]);
      expect(content).toContain("<Command>C:\\node.exe</Command>");
      expect(content).toContain("serena reap --quiet");
    });

    it("uses IgnoreNew to prevent overlapping instances", () => {
      const content = renderSerenaReaperWindowsTaskXml();
      expect(content).toContain("IgnoreNew");
    });
  });
});

describe("serena-reaper service-commands", () => {
  it("darwin install plan: bootout (optional) + bootstrap + enable", () => {
    const commands = reaperServiceCommands({
      action: "install",
      platform: "darwin",
      servicePath: "/tmp/dev.oma.serena-reaper.plist",
    });
    expect(commands.some((c) => c.args.includes("bootout") && c.optional)).toBe(
      true,
    );
    expect(commands.some((c) => c.args.includes("bootstrap"))).toBe(true);
    expect(commands.some((c) => c.args.includes("enable"))).toBe(true);
    // Must NOT include kickstart (reaper does not need it; the timer handles scheduling)
  });

  it("darwin uninstall plan: disable (optional) + bootout (optional)", () => {
    const commands = reaperServiceCommands({
      action: "uninstall",
      platform: "darwin",
      servicePath: "/tmp/dev.oma.serena-reaper.plist",
    });
    expect(commands.some((c) => c.args.includes("disable"))).toBe(true);
    expect(commands.some((c) => c.args.includes("bootout"))).toBe(true);
    expect(commands.every((c) => c.optional)).toBe(true);
  });

  it("linux install plan: daemon-reload + enable --now (timer unit)", () => {
    const commands = reaperServiceCommands({
      action: "install",
      platform: "linux",
      servicePath: "/home/u/.config/systemd/user/oma-serena-reaper.timer",
    });
    expect(commands.some((c) => c.args.includes("daemon-reload"))).toBe(true);
    const enableCmd = commands.find((c) => c.args.includes("enable"));
    expect(enableCmd?.args).toContain("oma-serena-reaper.timer");
  });

  it("linux uninstall plan: disable + stop + daemon-reload", () => {
    const commands = reaperServiceCommands({
      action: "uninstall",
      platform: "linux",
      servicePath: "/home/u/.config/systemd/user/oma-serena-reaper.timer",
    });
    expect(commands.some((c) => c.args.includes("disable"))).toBe(true);
    expect(commands.some((c) => c.args.includes("stop"))).toBe(true);
    expect(commands.some((c) => c.args.includes("daemon-reload"))).toBe(true);
  });

  it("win32 install plan: schtasks /create", () => {
    const commands = reaperServiceCommands({
      action: "install",
      platform: "win32",
      servicePath: "C:\\Users\\u\\.serena\\oma-serena-reaper.task.xml",
    });
    expect(commands.some((c) => c.args.includes("/create"))).toBe(true);
    expect(commands.some((c) => c.args.includes(SERENA_REAPER_TASK_NAME))).toBe(
      true,
    );
  });

  it("win32 uninstall plan: schtasks /end + /delete (both optional)", () => {
    const commands = reaperServiceCommands({
      action: "uninstall",
      platform: "win32",
      servicePath: "C:\\Users\\u\\.serena\\oma-serena-reaper.task.xml",
    });
    expect(commands.some((c) => c.args.includes("/end"))).toBe(true);
    expect(commands.some((c) => c.args.includes("/delete"))).toBe(true);
    expect(commands.every((c) => c.optional)).toBe(true);
  });

  it("returns empty array for unsupported platforms", () => {
    const commands = reaperServiceCommands({
      action: "install",
      platform: "aix",
      servicePath: "/tmp/stub",
    });
    expect(commands).toEqual([]);
  });
});

describe("serenaReaperServicePath", () => {
  it("returns darwin launchd plist path", () => {
    const p = serenaReaperServicePath("/home/u", "darwin");
    expect(p).toMatch(/Library\/LaunchAgents\/dev\.oma\.serena-reaper\.plist$/);
  });

  it("returns linux systemd timer path", () => {
    const p = serenaReaperServicePath("/home/u", "linux");
    expect(p).toMatch(/systemd\/user\/oma-serena-reaper\.timer$/);
  });

  it("returns win32 task xml path", () => {
    const p = serenaReaperServicePath("C:\\Users\\u", "win32");
    expect(p).toMatch(/oma-serena-reaper\.task\.xml$/);
  });

  it("returns undefined for unsupported platforms", () => {
    expect(serenaReaperServicePath("/home/u", "aix")).toBeUndefined();
  });
});

describe("getSerenaReaperServicePresence", () => {
  let homeDir: string;

  beforeEach(() => {
    homeDir = mkdtempSync(join(tmpdir(), "oma-sr-presence-"));
  });

  afterEach(() => {
    rmSync(homeDir, { recursive: true, force: true });
  });

  it("reports darwin plist path and tracks installation", () => {
    const before = getSerenaReaperServicePresence({
      homeDir,
      platform: "darwin",
    });
    expect(before).toMatchObject({
      platform: "darwin",
      supported: true,
      installed: false,
    });
    expect(before.servicePath).toMatch(/dev\.oma\.serena-reaper\.plist$/);

    installSerenaReaperService({
      homeDir,
      platform: "darwin",
      runner: () => ({ status: 0 }),
    });

    const after = getSerenaReaperServicePresence({
      homeDir,
      platform: "darwin",
    });
    expect(after.installed).toBe(true);
  });

  it("marks unsupported platforms", () => {
    expect(
      getSerenaReaperServicePresence({ homeDir, platform: "aix" }),
    ).toMatchObject({ supported: false, installed: false });
  });

  it("supports win32 via a scheduled-task xml path", () => {
    const presence = getSerenaReaperServicePresence({
      homeDir,
      platform: "win32",
    });
    expect(presence.supported).toBe(true);
    expect(presence.servicePath).toMatch(/oma-serena-reaper\.task\.xml$/);
  });
});

describe("installSerenaReaperService", () => {
  let homeDir: string;

  beforeEach(() => {
    homeDir = mkdtempSync(join(tmpdir(), "oma-sr-install-"));
  });

  afterEach(() => {
    rmSync(homeDir, { recursive: true, force: true });
  });

  it("renders launchd plist with StartInterval on dry run", () => {
    const result = installSerenaReaperService({
      homeDir,
      platform: "darwin",
      dryRun: true,
    });
    expect(result).toMatchObject({
      action: "install",
      platform: "darwin",
      supported: true,
      wroteFile: false,
      activated: false,
    });
    expect(result.content).toContain("StartInterval");
    expect(result.content).toContain(LAUNCHD_SERENA_REAPER_LABEL);
    expect(result.commands).toEqual(
      expect.arrayContaining([expect.stringContaining("launchctl bootstrap")]),
    );
  });

  it("renders systemd timer on linux on dry run", () => {
    const result = installSerenaReaperService({
      homeDir,
      platform: "linux",
      dryRun: true,
    });
    expect(result.content).toContain("OnUnitActiveSec=");
    expect(result.content).toContain("300s");
    expect(result.commands).toEqual(
      expect.arrayContaining([expect.stringContaining("systemctl --user")]),
    );
  });

  it("writes file and runs activation commands on darwin (not dry run)", () => {
    const ran: string[] = [];
    const result = installSerenaReaperService({
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
    expect(ran.some((line) => line.includes("launchctl bootstrap"))).toBe(true);
  });

  it("falls back to legacy launchctl load -w when bootstrap fails (EIO)", () => {
    const ran: string[] = [];
    const result = installSerenaReaperService({
      homeDir,
      platform: "darwin",
      runner(command) {
        ran.push([command.bin, ...command.args].join(" "));
        if (command.args.includes("bootstrap")) {
          return { status: 5, error: "Input/output error" };
        }
        if (command.args.includes("load")) return { status: 0 };
        return { status: 0 };
      },
    });
    expect(result.activated).toBe(true);
    expect(ran.some((line) => line.includes("launchctl load -w"))).toBe(true);
  });

  it("writes two unit files on linux (timer + service)", () => {
    const result = installSerenaReaperService({
      homeDir,
      platform: "linux",
      runner: () => ({ status: 0 }),
    });
    expect(result.wroteFile).toBe(true);
    // The primary file (.timer) exists
    expect(existsSync(result.servicePath ?? "")).toBe(true);
    // The companion .service file exists next to it
    const servicePath = (result.servicePath ?? "").replace(
      /\.timer$/,
      ".service",
    );
    expect(existsSync(servicePath)).toBe(true);
  });

  it("is a no-op on unsupported platforms", () => {
    const result = installSerenaReaperService({ homeDir, platform: "aix" });
    expect(result).toMatchObject({ supported: false, wroteFile: false });
    expect(result.message).toContain("not supported");
  });

  it("renders Windows TimeTrigger XML on dry run", () => {
    const result = installSerenaReaperService({
      homeDir,
      platform: "win32",
      dryRun: true,
    });
    expect(result.supported).toBe(true);
    expect(result.content).toContain("<TimeTrigger>");
    expect(result.content).toContain("PT5M");
    expect(result.commands).toEqual(
      expect.arrayContaining([expect.stringContaining("schtasks /create")]),
    );
  });

  it("writes task xml and registers via schtasks on win32", () => {
    const ran: string[] = [];
    const result = installSerenaReaperService({
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
  });
});

describe("uninstallSerenaReaperService", () => {
  let homeDir: string;

  beforeEach(() => {
    homeDir = mkdtempSync(join(tmpdir(), "oma-sr-uninstall-"));
  });

  afterEach(() => {
    rmSync(homeDir, { recursive: true, force: true });
  });

  it("removes the plist and runs disable commands on darwin", () => {
    installSerenaReaperService({
      homeDir,
      platform: "darwin",
      runner: () => ({ status: 0 }),
    });

    const presence = getSerenaReaperServicePresence({
      homeDir,
      platform: "darwin",
    });
    expect(presence.installed).toBe(true);

    const ran: string[] = [];
    const result = uninstallSerenaReaperService({
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
    expect(existsSync(presence.servicePath ?? "")).toBe(false);
  });

  it("removes both timer and service units on linux", () => {
    const installed = installSerenaReaperService({
      homeDir,
      platform: "linux",
      runner: () => ({ status: 0 }),
    });
    const timerPath = installed.servicePath ?? "";
    const servicePath = timerPath.replace(/\.timer$/, ".service");
    expect(existsSync(timerPath)).toBe(true);
    expect(existsSync(servicePath)).toBe(true);

    uninstallSerenaReaperService({
      homeDir,
      platform: "linux",
      runner: () => ({ status: 0 }),
    });

    expect(existsSync(timerPath)).toBe(false);
    expect(existsSync(servicePath)).toBe(false);
  });

  it("deletes the scheduled task and removes the xml on win32", () => {
    const installed = installSerenaReaperService({
      homeDir,
      platform: "win32",
      runner: () => ({ status: 0 }),
    });

    const ran: string[] = [];
    const result = uninstallSerenaReaperService({
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
