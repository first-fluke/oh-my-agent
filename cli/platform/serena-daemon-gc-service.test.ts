import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  rmSync,
  utimesSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  daemonGcServicePath,
  ensureSerenaDaemonGcService,
  renderDaemonGcLaunchdPlist,
  renderDaemonGcSystemdService,
  renderDaemonGcSystemdTimer,
  renderDaemonGcWindowsTaskXml,
} from "./serena-daemon-gc-service.js";

describe("Serena daemon cleanup schedule", () => {
  let homeDir: string;

  beforeEach(() => {
    homeDir = mkdtempSync(join(tmpdir(), "oma-serena-gc-"));
  });

  afterEach(() => {
    rmSync(homeDir, { recursive: true, force: true });
  });

  it("runs independently of the optional LSP reaper on macOS", () => {
    const plist = renderDaemonGcLaunchdPlist(homeDir);
    expect(plist).toContain("dev.oma.serena-daemon-gc");
    expect(plist).toContain("<string>daemon:gc</string>");
    expect(plist).toContain("<key>StartInterval</key><integer>300</integer>");
    expect(plist).not.toContain("<key>KeepAlive</key>");
    expect(plist).not.toContain("serena reap");
  });

  it("uses the same cleanup command on Linux and Windows", () => {
    expect(renderDaemonGcSystemdTimer()).toContain("OnUnitActiveSec=300s");
    expect(renderDaemonGcSystemdService(homeDir)).toContain(
      "oma serena daemon:gc --quiet",
    );
    expect(renderDaemonGcWindowsTaskXml()).toContain(
      "serena daemon:gc --quiet",
    );
  });

  it("installs once and leaves the timer for future idle periods", () => {
    const runner = vi.fn(() => true);
    const options = { homeDir, platform: "darwin" as const, runner };
    expect(ensureSerenaDaemonGcService(options)).toBe(true);
    expect(ensureSerenaDaemonGcService(options)).toBe(true);
    expect(runner).toHaveBeenCalledTimes(3);
    expect(runner).toHaveBeenCalledWith(
      "launchctl",
      expect.arrayContaining(["bootstrap"]),
    );
    expect(existsSync(daemonGcServicePath(homeDir, "darwin") ?? "")).toBe(true);
  });

  it("removes a failed install so the next bridge can retry", () => {
    const path = daemonGcServicePath(homeDir, "darwin") ?? "";
    const options = {
      homeDir,
      platform: "darwin" as const,
      runner: () => false,
    };
    expect(ensureSerenaDaemonGcService(options)).toBe(false);
    expect(existsSync(path)).toBe(false);
    expect(existsSync(`${path}.lock`)).toBe(false);
  });

  it("recovers a lock left by a bridge that died during installation", () => {
    const path = daemonGcServicePath(homeDir, "darwin") ?? "";
    mkdirSync(join(homeDir, "Library", "LaunchAgents"), { recursive: true });
    writeFileSync(`${path}.lock`, "");
    const old = new Date(Date.now() - 61_000);
    utimesSync(`${path}.lock`, old, old);

    expect(
      ensureSerenaDaemonGcService({
        homeDir,
        platform: "darwin",
        runner: () => true,
      }),
    ).toBe(true);
    expect(existsSync(`${path}.lock`)).toBe(false);
  });

  it("reinstalls a service file left before activation", () => {
    const path = daemonGcServicePath(homeDir, "darwin") ?? "";
    mkdirSync(join(homeDir, "Library", "LaunchAgents"), { recursive: true });
    writeFileSync(path, "incomplete plist");
    const runner = vi.fn(
      (_bin: string, args: string[]) => !args.includes("print"),
    );

    expect(
      ensureSerenaDaemonGcService({ homeDir, platform: "darwin", runner }),
    ).toBe(true);
    expect(runner).toHaveBeenCalledWith(
      "launchctl",
      expect.arrayContaining(["bootstrap"]),
    );
    expect(existsSync(path)).toBe(true);
  });

  it("rolls back launchd when bootstrap succeeds but enable fails", () => {
    const runner = vi.fn(
      (_bin: string, args: string[]) => !args.includes("enable"),
    );
    const path = daemonGcServicePath(homeDir, "darwin") ?? "";

    expect(
      ensureSerenaDaemonGcService({ homeDir, platform: "darwin", runner }),
    ).toBe(false);
    expect(runner).toHaveBeenCalledWith(
      "launchctl",
      expect.arrayContaining(["bootout"]),
    );
    expect(existsSync(path)).toBe(false);
  });

  it("does not leave a service file when the activation runner throws", () => {
    const path = daemonGcServicePath(homeDir, "darwin") ?? "";
    expect(
      ensureSerenaDaemonGcService({
        homeDir,
        platform: "darwin",
        runner: () => {
          throw new Error("launchctl unavailable");
        },
      }),
    ).toBe(false);
    expect(existsSync(path)).toBe(false);
    expect(existsSync(`${path}.lock`)).toBe(false);
  });

  it("installs a Linux user timer and companion service", () => {
    const runner = vi.fn(() => true);
    expect(
      ensureSerenaDaemonGcService({ homeDir, platform: "linux", runner }),
    ).toBe(true);
    const timer = daemonGcServicePath(homeDir, "linux") ?? "";
    expect(existsSync(timer)).toBe(true);
    expect(existsSync(timer.replace(/\.timer$/, ".service"))).toBe(true);
    expect(runner).toHaveBeenCalledWith("systemctl", [
      "--user",
      "enable",
      "--now",
      "oma-serena-daemon-gc.timer",
    ]);
  });
});
