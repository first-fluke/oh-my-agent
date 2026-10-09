import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
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
    vi.stubEnv("OMA_HOME", "/storage/oma");
    vi.stubEnv("OMA_STATE_HOME", undefined);
  });

  afterEach(() => {
    rmSync(homeDir, { recursive: true, force: true });
    vi.unstubAllEnvs();
  });

  const invocation = ["/opt/node/bin/node", "/opt/oma/bin/cli.js"];

  it("runs independently of the optional LSP reaper on macOS", () => {
    const plist = renderDaemonGcLaunchdPlist(homeDir, invocation);
    expect(plist).toContain("dev.oma.serena-daemon-gc");
    expect(plist).toContain("<string>daemon</string><string>gc</string>");
    expect(plist).toContain("<key>StartInterval</key><integer>300</integer>");
    expect(plist).not.toContain("<key>KeepAlive</key>");
    expect(plist).not.toContain("serena reap");
  });

  // A service PATH has no version-manager shims, so `/usr/bin/env oma` could
  // run a stale global oma instead of the one that installed the timer.
  it("pins the oma that installed it instead of resolving oma on PATH", () => {
    const plist = renderDaemonGcLaunchdPlist(homeDir, invocation);
    expect(plist).toContain(
      "<array><string>/opt/node/bin/node</string><string>/opt/oma/bin/cli.js</string><string>--oma-home</string><string>/storage/oma</string><string>serena</string><string>daemon</string><string>gc</string><string>--quiet</string></array>",
    );
    expect(plist).not.toContain("/usr/bin/env");
    expect(plist).toContain("<string>/opt/node/bin:");
    expect(renderDaemonGcLaunchdPlist(homeDir, ["/a&b/node", "/x"])).toContain(
      "<string>/a&amp;b/node</string>",
    );
  });

  it("uses the same pinned cleanup command on Linux and Windows", () => {
    expect(renderDaemonGcSystemdTimer()).toContain("OnUnitActiveSec=300s");
    expect(renderDaemonGcSystemdService(homeDir, invocation)).toContain(
      'ExecStart="/opt/node/bin/node" "/opt/oma/bin/cli.js" "--oma-home" "/storage/oma" "serena" "daemon" "gc" "--quiet"',
    );
    const xml = renderDaemonGcWindowsTaskXml([
      "C:\\node.exe",
      "C:\\oma\\cli.js",
    ]);
    expect(xml).toContain("<Command>C:\\node.exe</Command>");
    expect(xml).toContain(
      "<Arguments>&quot;C:\\oma\\cli.js&quot; --oma-home /storage/oma serena daemon gc --quiet</Arguments>",
    );
  });

  it("falls back to a PATH lookup when the entry script is unknown", () => {
    expect(renderDaemonGcSystemdService(homeDir, ["oma"])).toContain(
      'ExecStart=/usr/bin/env "oma" "--oma-home" "/storage/oma" "serena" "daemon" "gc" "--quiet"',
    );
  });

  it("pins an explicit profile override before the cleanup command", () => {
    vi.stubEnv("OMA_STATE_HOME", "/storage/profiles");
    expect(renderDaemonGcSystemdService(homeDir, invocation)).toContain(
      '"--oma-state-home" "/storage/profiles" "serena"',
    );
  });

  it("replaces an active timer that runs a different oma", () => {
    const path = daemonGcServicePath(homeDir, "darwin") ?? "";
    mkdirSync(join(homeDir, "Library", "LaunchAgents"), { recursive: true });
    writeFileSync(
      path,
      renderDaemonGcLaunchdPlist(homeDir, ["/old/node", "/old/cli.js"]),
    );
    const runner = vi.fn(() => true);

    expect(
      ensureSerenaDaemonGcService({
        homeDir,
        platform: "darwin",
        runner,
        invocation,
      }),
    ).toBe(true);
    const calls = runner.mock.calls.map((call) => (call as string[][])[1]?.[0]);
    expect(calls.indexOf("bootout")).toBeGreaterThan(-1);
    expect(calls.indexOf("bootout")).toBeLessThan(calls.indexOf("bootstrap"));
    expect(readFileSync(path, "utf8")).toBe(
      renderDaemonGcLaunchdPlist(homeDir, invocation),
    );
  });

  it("leaves a current, active timer alone", () => {
    const runner = vi.fn(() => true);
    const options = {
      homeDir,
      platform: "darwin" as const,
      runner,
      invocation,
    };
    expect(ensureSerenaDaemonGcService(options)).toBe(true);
    runner.mockClear();
    expect(ensureSerenaDaemonGcService(options)).toBe(true);
    expect(runner).toHaveBeenCalledTimes(1);
    expect(runner).toHaveBeenCalledWith(
      "launchctl",
      expect.arrayContaining(["print"]),
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
