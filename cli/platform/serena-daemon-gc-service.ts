import { spawnSync } from "node:child_process";
import {
  closeSync,
  existsSync,
  mkdirSync,
  openSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import { servicePathEnvironment } from "./serena-reaper/service-files.js";

const LABEL = "dev.oma.serena-daemon-gc";
const TASK_NAME = "OMA Serena Daemon GC";
const INTERVAL_SECONDS = 300;

type Runner = (bin: string, args: string[]) => boolean;

function defaultRunner(bin: string, args: string[]): boolean {
  return (
    spawnSync(bin, args, { stdio: "ignore", timeout: 10_000 }).status === 0
  );
}

function serviceActive(platform: NodeJS.Platform, runner: Runner): boolean {
  if (platform === "darwin") {
    const uid = typeof process.getuid === "function" ? process.getuid() : 0;
    return runner("launchctl", ["print", `gui/${uid}/${LABEL}`]);
  }
  if (platform === "linux") {
    return runner("systemctl", [
      "--user",
      "is-active",
      "--quiet",
      "oma-serena-daemon-gc.timer",
    ]);
  }
  if (platform === "win32") {
    return runner("schtasks", ["/query", "/tn", TASK_NAME]);
  }
  return false;
}

export function daemonGcServicePath(
  homeDir: string,
  platform: NodeJS.Platform,
): string | undefined {
  if (platform === "darwin") {
    return join(homeDir, "Library", "LaunchAgents", `${LABEL}.plist`);
  }
  if (platform === "linux") {
    return join(
      homeDir,
      ".config",
      "systemd",
      "user",
      "oma-serena-daemon-gc.timer",
    );
  }
  if (platform === "win32") {
    return join(homeDir, ".serena", "oma-serena-daemon-gc.task.xml");
  }
  return undefined;
}

export function renderDaemonGcLaunchdPlist(homeDir: string): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key><string>${LABEL}</string>
  <key>ProgramArguments</key>
  <array>
    <string>/usr/bin/env</string><string>oma</string><string>serena</string>
    <string>daemon:gc</string><string>--quiet</string>
  </array>
  <key>EnvironmentVariables</key>
  <dict><key>PATH</key><string>${servicePathEnvironment(homeDir)}</string></dict>
  <key>StartInterval</key><integer>${INTERVAL_SECONDS}</integer>
  <key>StandardOutPath</key><string>/tmp/oma-serena-daemon-gc.out.log</string>
  <key>StandardErrorPath</key><string>/tmp/oma-serena-daemon-gc.err.log</string>
</dict>
</plist>
`;
}

export function renderDaemonGcSystemdTimer(): string {
  return `[Unit]
Description=OMA Serena idle daemon cleanup

[Timer]
OnBootSec=60s
OnUnitActiveSec=${INTERVAL_SECONDS}s
Unit=oma-serena-daemon-gc.service

[Install]
WantedBy=timers.target
`;
}

export function renderDaemonGcSystemdService(homeDir: string): string {
  return `[Unit]
Description=OMA Serena idle daemon cleanup

[Service]
Type=oneshot
Environment=PATH=${servicePathEnvironment(homeDir)}
ExecStart=/usr/bin/env oma serena daemon:gc --quiet
`;
}

export function renderDaemonGcWindowsTaskXml(): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<Task version="1.2" xmlns="http://schemas.microsoft.com/windows/2004/02/mit/task">
  <RegistrationInfo><Description>OMA Serena idle daemon cleanup</Description></RegistrationInfo>
  <Triggers><TimeTrigger><Repetition><Interval>PT5M</Interval><StopAtDurationEnd>false</StopAtDurationEnd></Repetition><StartBoundary>2000-01-01T00:00:00</StartBoundary><Enabled>true</Enabled></TimeTrigger></Triggers>
  <Principals><Principal id="Author"><LogonType>InteractiveToken</LogonType><RunLevel>LeastPrivilege</RunLevel></Principal></Principals>
  <Settings><MultipleInstancesPolicy>IgnoreNew</MultipleInstancesPolicy><StartWhenAvailable>true</StartWhenAvailable></Settings>
  <Actions Context="Author"><Exec><Command>oma</Command><Arguments>serena daemon:gc --quiet</Arguments></Exec></Actions>
</Task>
`;
}

/** Install the idle-daemon timer once. A failed activation is retried next bridge start. */
export function ensureSerenaDaemonGcService(
  options: {
    homeDir?: string;
    platform?: NodeJS.Platform;
    runner?: Runner;
  } = {},
): boolean {
  const homeDir = options.homeDir ?? homedir();
  const platform = options.platform ?? process.platform;
  const runner = options.runner ?? defaultRunner;
  const path = daemonGcServicePath(homeDir, platform);
  if (!path) return false;
  if (existsSync(path) && serviceActive(platform, runner)) return true;

  mkdirSync(dirname(path), { recursive: true });
  const lockPath = `${path}.lock`;
  let lock: number;
  try {
    lock = openSync(lockPath, "wx");
  } catch {
    // A bridge may have died during installation. Reclaim only an old lock;
    // a fresh one belongs to a concurrent bridge.
    try {
      if (Date.now() - statSync(lockPath).mtimeMs <= 60_000) return false;
      rmSync(lockPath, { force: true });
      lock = openSync(lockPath, "wx");
    } catch {
      return false;
    }
  }

  try {
    if (existsSync(path)) {
      if (serviceActive(platform, runner)) return true;
      rmSync(path, { force: true });
      if (platform === "linux") {
        rmSync(path.replace(/\.timer$/, ".service"), { force: true });
      }
    }
    if (platform === "darwin") {
      writeFileSync(path, renderDaemonGcLaunchdPlist(homeDir));
      const uid = typeof process.getuid === "function" ? process.getuid() : 0;
      const domain = `gui/${uid}`;
      const bootstrapped = runner("launchctl", ["bootstrap", domain, path]);
      const activated =
        bootstrapped && runner("launchctl", ["enable", `${domain}/${LABEL}`]);
      if (activated) return true;
      if (bootstrapped) runner("launchctl", ["bootout", domain, path]);
      rmSync(path, { force: true });
      return false;
    }

    if (platform === "linux") {
      const unit = path.replace(/\.timer$/, ".service");
      writeFileSync(path, renderDaemonGcSystemdTimer());
      writeFileSync(unit, renderDaemonGcSystemdService(homeDir));
      const activated =
        runner("systemctl", ["--user", "daemon-reload"]) &&
        runner("systemctl", [
          "--user",
          "enable",
          "--now",
          "oma-serena-daemon-gc.timer",
        ]);
      if (activated) return true;
      rmSync(path, { force: true });
      rmSync(unit, { force: true });
      return false;
    }

    writeFileSync(path, renderDaemonGcWindowsTaskXml());
    if (runner("schtasks", ["/create", "/tn", TASK_NAME, "/xml", path, "/f"])) {
      return true;
    }
    rmSync(path, { force: true });
    return false;
  } catch {
    rmSync(path, { force: true });
    if (platform === "linux") {
      rmSync(path.replace(/\.timer$/, ".service"), { force: true });
    }
    return false;
  } finally {
    closeSync(lock);
    rmSync(lockPath, { force: true });
  }
}
