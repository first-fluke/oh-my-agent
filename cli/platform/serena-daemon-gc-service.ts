import { spawn, spawnSync } from "node:child_process";
import {
  closeSync,
  existsSync,
  mkdirSync,
  openSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import { isDaemonGcWatcherRunning } from "../io/serena-daemon.js";
import { omaHome } from "../utils/oma-home.js";
import {
  currentOmaInvocation,
  launchdProgramArguments,
  pinnedServicePath,
  systemdExecStart,
  windowsTaskExec,
} from "./oma-invocation.js";
import { servicePathEnvironment } from "./serena-reaper/service-files.js";

const LABEL = "dev.oma.serena-daemon-gc";
const TASK_NAME = "OMA Serena Daemon GC";
const INTERVAL_SECONDS = 300;
/** Canonical spelling; the colon form stopped routing when paths were standardized. */
export const GC_ARGS = ["serena", "daemon", "gc", "--quiet"];

function boundGcArgs(homeDir?: string): string[] {
  return [
    "--oma-home",
    omaHome(process.env, homeDir),
    ...(process.env.OMA_STATE_HOME === undefined
      ? []
      : ["--oma-state-home", process.env.OMA_STATE_HOME]),
    ...GC_ARGS,
  ];
}

type Runner = (bin: string, args: string[]) => boolean;

function defaultRunner(bin: string, args: string[]): boolean {
  return (
    spawnSync(bin, args, {
      stdio: "ignore",
      timeout: 10_000,
      windowsHide: true,
    }).status === 0
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

export function renderDaemonGcLaunchdPlist(
  homeDir: string,
  invocation: readonly string[] = currentOmaInvocation(),
): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key><string>${LABEL}</string>
  <key>ProgramArguments</key>
  <array>${launchdProgramArguments(invocation, boundGcArgs(homeDir))}</array>
  <key>EnvironmentVariables</key>
  <dict><key>PATH</key><string>${pinnedServicePath(invocation, servicePathEnvironment(homeDir))}</string></dict>
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

export function renderDaemonGcSystemdService(
  homeDir: string,
  invocation: readonly string[] = currentOmaInvocation(),
): string {
  return `[Unit]
Description=OMA Serena idle daemon cleanup

[Service]
Type=oneshot
Environment=PATH=${pinnedServicePath(invocation, servicePathEnvironment(homeDir))}
ExecStart=${systemdExecStart(invocation, boundGcArgs(homeDir))}
`;
}

export function renderDaemonGcWindowsTaskXml(
  invocation: readonly string[] = currentOmaInvocation(),
  homeDir?: string,
): string {
  const exec = windowsTaskExec(invocation, boundGcArgs(homeDir));
  return `<?xml version="1.0" encoding="UTF-16"?>
<Task version="1.2" xmlns="http://schemas.microsoft.com/windows/2004/02/mit/task">
  <RegistrationInfo><Description>OMA Serena idle daemon cleanup</Description></RegistrationInfo>
  <Triggers><TimeTrigger><Repetition><Interval>PT5M</Interval><StopAtDurationEnd>false</StopAtDurationEnd></Repetition><StartBoundary>2000-01-01T00:00:00</StartBoundary><Enabled>true</Enabled></TimeTrigger></Triggers>
  <Principals><Principal id="Author"><LogonType>InteractiveToken</LogonType><RunLevel>LeastPrivilege</RunLevel></Principal></Principals>
  <Settings><MultipleInstancesPolicy>IgnoreNew</MultipleInstancesPolicy><DisallowStartIfOnBatteries>false</DisallowStartIfOnBatteries><StopIfGoingOnBatteries>false</StopIfGoingOnBatteries><StartWhenAvailable>true</StartWhenAvailable><ExecutionTimeLimit>PT5M</ExecutionTimeLimit></Settings>
  <Actions Context="Author"><Exec><Command>${exec.command}</Command><Arguments>${exec.arguments}</Arguments></Exec></Actions>
</Task>
`;
}

const WINDOWS_SCHTASKS_TR_MAX_CHARS = 261;

function quoteWindowsArg(arg: string): string {
  return /[\s"]/.test(arg)
    ? `"${arg.replace(/(\\*)"/g, '$1$1\\"').replace(/(\\+)$/, "$1$1")}"`
    : arg;
}

/** Command line for `schtasks /create /sc minute /mo 5 /tr ...` fallback. */
function windowsSimpleTaskRun(
  invocation: readonly string[],
  homeDir: string,
): string {
  const [command = "oma", ...rest] = invocation;
  return [
    quoteWindowsArg(command),
    ...rest.map((arg) => quoteWindowsArg(arg)),
    ...boundGcArgs(homeDir).map((arg) => quoteWindowsArg(arg)),
  ].join(" ");
}

function writeServiceFile(
  file: string,
  content: string,
  platform: NodeJS.Platform,
): void {
  if (platform === "win32" && file.endsWith(".xml")) {
    // schtasks /create /xml expects UTF-16LE with BOM when encoding="UTF-16".
    const bom = Buffer.from([0xff, 0xfe]);
    writeFileSync(file, Buffer.concat([bom, Buffer.from(content, "utf16le")]));
    return;
  }
  writeFileSync(file, content);
}

function readServiceFile(file: string, platform: NodeJS.Platform): string {
  if (platform === "win32" && file.endsWith(".xml")) {
    const raw = readFileSync(file);
    if (raw.length >= 2 && raw[0] === 0xff && raw[1] === 0xfe) {
      return raw.subarray(2).toString("utf16le");
    }
    return raw.toString("utf8");
  }
  return readFileSync(file, "utf8");
}

/** Every file the service consists of, with the content it should have. */
function serviceFiles(
  path: string,
  homeDir: string,
  platform: NodeJS.Platform,
  invocation: readonly string[],
): Array<[string, string]> {
  if (platform === "darwin") {
    return [[path, renderDaemonGcLaunchdPlist(homeDir, invocation)]];
  }
  if (platform === "linux") {
    return [
      [path, renderDaemonGcSystemdTimer()],
      [
        path.replace(/\.timer$/, ".service"),
        renderDaemonGcSystemdService(homeDir, invocation),
      ],
    ];
  }
  return [[path, renderDaemonGcWindowsTaskXml(invocation, homeDir)]];
}

function filesCurrent(
  files: Array<[string, string]>,
  platform: NodeJS.Platform,
): boolean {
  return files.every(([file, content]) => {
    try {
      return readServiceFile(file, platform) === content;
    } catch {
      return false;
    }
  });
}

/**
 * Install the idle-daemon timer, or repoint one installed by another oma.
 * A failed activation is retried next bridge start.
 */
export function ensureSerenaDaemonGcService(
  options: {
    homeDir?: string;
    platform?: NodeJS.Platform;
    runner?: Runner;
    /** Command the timer runs; defaults to the oma executing this call. */
    invocation?: readonly string[];
  } = {},
): boolean {
  const homeDir = options.homeDir ?? homedir();
  const platform = options.platform ?? process.platform;
  const runner = options.runner ?? defaultRunner;
  const path = daemonGcServicePath(homeDir, platform);
  if (!path) return false;
  const invocation = options.invocation ?? currentOmaInvocation();
  const files = serviceFiles(path, homeDir, platform, invocation);
  if (filesCurrent(files, platform) && serviceActive(platform, runner))
    return true;

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

  const uid = typeof process.getuid === "function" ? process.getuid() : 0;
  const domain = `gui/${uid}`;
  const removeFiles = () => {
    for (const [file] of files) rmSync(file, { force: true });
  };

  try {
    if (existsSync(path)) {
      if (filesCurrent(files, platform) && serviceActive(platform, runner))
        return true;
      // A loaded launchd job keeps its old arguments and refuses a second
      // bootstrap, so unload it before writing the replacement.
      if (platform === "darwin" && serviceActive(platform, runner)) {
        runner("launchctl", ["bootout", `${domain}/${LABEL}`]);
      }
      removeFiles();
    }
    for (const [file, content] of files) {
      writeServiceFile(file, content, platform);
    }

    if (platform === "darwin") {
      const bootstrapped = runner("launchctl", ["bootstrap", domain, path]);
      const activated =
        bootstrapped && runner("launchctl", ["enable", `${domain}/${LABEL}`]);
      if (activated) return true;
      if (bootstrapped) runner("launchctl", ["bootout", domain, path]);
      removeFiles();
      return false;
    }

    if (platform === "linux") {
      const activated =
        runner("systemctl", ["--user", "daemon-reload"]) &&
        runner("systemctl", [
          "--user",
          "enable",
          "--now",
          "oma-serena-daemon-gc.timer",
        ]);
      if (activated) return true;
      removeFiles();
      return false;
    }

    if (runner("schtasks", ["/create", "/tn", TASK_NAME, "/xml", path, "/f"])) {
      return true;
    }
    // Non-elevated Windows shells often reject XML import with <Principals>;
    // retry with the plain minute trigger when the command fits schtasks' /tr cap.
    const tr = windowsSimpleTaskRun(invocation, homeDir);
    if (
      tr.length <= WINDOWS_SCHTASKS_TR_MAX_CHARS &&
      runner("schtasks", [
        "/create",
        "/sc",
        "minute",
        "/mo",
        "5",
        "/tn",
        TASK_NAME,
        "/tr",
        tr,
        "/f",
      ])
    ) {
      return true;
    }
    removeFiles();
    return false;
  } catch {
    removeFiles();
    return false;
  } finally {
    closeSync(lock);
    rmSync(lockPath, { force: true });
  }
}

export type WatcherSpawner = (
  command: string,
  args: readonly string[],
) => boolean;

function defaultWatcherSpawner(
  command: string,
  args: readonly string[],
): boolean {
  try {
    const child = spawn(command, [...args], {
      detached: true,
      stdio: "ignore",
      windowsHide: true,
    });
    child.once("error", () => {});
    if (typeof child.pid !== "number") return false;
    child.unref();
    return true;
  } catch {
    return false;
  }
}

/**
 * Fallback for machines where the OS scheduler is unavailable or blocked:
 * launch a single detached, self-terminating `oma serena daemon gc --watch`
 * process that sweeps idle daemons every 5 minutes and exits once none remain.
 */
export function ensureSerenaDaemonGcWatcher(
  options: {
    homeDir?: string;
    invocation?: readonly string[];
    isRunning?: () => boolean;
    spawnWatcher?: WatcherSpawner;
  } = {},
): boolean {
  const isRunning = options.isRunning ?? isDaemonGcWatcherRunning;
  if (isRunning()) return true;

  const homeDir = options.homeDir ?? homedir();
  const [command, ...prefixArgs] = options.invocation ?? currentOmaInvocation();
  if (!command) return false;
  const args = [...prefixArgs, ...boundGcArgs(homeDir), "--watch"];
  const spawnWatcher = options.spawnWatcher ?? defaultWatcherSpawner;
  return spawnWatcher(command, args);
}
