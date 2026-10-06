import { join } from "node:path";
import { servicePathEnvironment } from "../agentmemory/service-files.js";
import {
  currentOmaInvocation,
  launchdProgramArguments,
  pinnedServicePath,
  systemdExecStart,
  windowsTaskExec,
} from "../oma-invocation.js";

const REAP_ARGS = ["serena", "reap", "--quiet"];

/**
 * Serena Reaper periodic scheduler service-file rendering.
 *
 * Unlike the AgentMemory daemon (KeepAlive), the reaper is a PERIODIC task:
 *   - launchd: StartInterval (no KeepAlive)
 *   - systemd: .timer + oneshot .service pair
 *   - Windows: Task Scheduler TimeTrigger with repetition interval
 *
 * Design: docs/plans/designs/021-serena-memory-reaper.md §2.4
 */

export const LAUNCHD_SERENA_REAPER_LABEL = "dev.oma.serena-reaper";
export const SERENA_REAPER_TASK_NAME = "OMA Serena Reaper";

/** Default run interval: every 5 minutes. */
const REAPER_INTERVAL_SECONDS = 300;

/** PT5M in ISO 8601 duration format for Windows Task Scheduler. */
const REAPER_INTERVAL_PT = "PT5M";

export function serenaReaperServicePath(
  homeDir: string,
  platform: NodeJS.Platform,
): string | undefined {
  if (platform === "darwin") {
    return join(
      homeDir,
      "Library",
      "LaunchAgents",
      `${LAUNCHD_SERENA_REAPER_LABEL}.plist`,
    );
  }
  if (platform === "linux") {
    // systemd needs two unit files; we return the .timer path as the primary
    // (service-commands uses the derived .service path internally).
    return join(
      homeDir,
      ".config",
      "systemd",
      "user",
      "oma-serena-reaper.timer",
    );
  }
  if (platform === "win32") {
    return join(homeDir, ".serena", "oma-serena-reaper.task.xml");
  }
  return undefined;
}

/** Derive the companion .service unit path from the .timer path. */
export function serenaReaperSystemdServicePath(timerPath: string): string {
  return timerPath.replace(/\.timer$/, ".service");
}

/**
 * launchd plist for periodic reaper.
 * Uses StartInterval (seconds) — no KeepAlive (task is oneshot, not a daemon).
 */
export function renderSerenaReaperLaunchdPlist(args: {
  homeDir: string;
  invocation?: readonly string[];
}): string {
  const invocation = args.invocation ?? currentOmaInvocation();
  return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key>
  <string>${LAUNCHD_SERENA_REAPER_LABEL}</string>
  <key>ProgramArguments</key>
  <array>${launchdProgramArguments(invocation, REAP_ARGS)}</array>
  <key>EnvironmentVariables</key>
  <dict>
    <key>PATH</key>
    <string>${pinnedServicePath(invocation, servicePathEnvironment(args.homeDir))}</string>
  </dict>
  <key>StartInterval</key>
  <integer>${REAPER_INTERVAL_SECONDS}</integer>
  <key>StandardOutPath</key>
  <string>/tmp/oma-serena-reaper.out.log</string>
  <key>StandardErrorPath</key>
  <string>/tmp/oma-serena-reaper.err.log</string>
</dict>
</plist>
`;
}

/**
 * systemd .timer unit (periodic, not socket-activated).
 * OnBootSec gives an initial delay; OnUnitActiveSec repeats at the interval.
 */
export function renderSerenaReaperSystemdTimer(): string {
  return `[Unit]
Description=OMA Serena Reaper — periodic LSP idle-shutdown timer

[Timer]
OnBootSec=60s
OnUnitActiveSec=${REAPER_INTERVAL_SECONDS}s
Unit=oma-serena-reaper.service

[Install]
WantedBy=timers.target
`;
}

/**
 * systemd oneshot .service unit.
 * Type=oneshot: systemd waits for the process to exit before marking it done.
 * RemainAfterExit=no: the service is not kept "active" between invocations.
 */
export function renderSerenaReaperSystemdService(args: {
  homeDir: string;
  invocation?: readonly string[];
}): string {
  const invocation = args.invocation ?? currentOmaInvocation();
  return `[Unit]
Description=OMA Serena Reaper — LSP idle-shutdown

[Service]
Type=oneshot
Environment=PATH=${pinnedServicePath(invocation, servicePathEnvironment(args.homeDir))}
ExecStart=${systemdExecStart(invocation, REAP_ARGS)}
StandardOutput=journal
StandardError=journal
`;
}

/**
 * Windows Task Scheduler XML with a TimeTrigger + repetition interval.
 * Uses RepetitionInterval (PT5M) so the task repeats without needing logon.
 */
export function renderSerenaReaperWindowsTaskXml(
  invocation: readonly string[] = currentOmaInvocation(),
): string {
  const exec = windowsTaskExec(invocation, REAP_ARGS);
  return `<?xml version="1.0" encoding="UTF-16"?>
<Task version="1.2" xmlns="http://schemas.microsoft.com/windows/2004/02/mit/task">
  <RegistrationInfo>
    <Description>OMA Serena Reaper — periodic LSP idle-shutdown</Description>
  </RegistrationInfo>
  <Triggers>
    <TimeTrigger>
      <Repetition>
        <Interval>${REAPER_INTERVAL_PT}</Interval>
        <StopAtDurationEnd>false</StopAtDurationEnd>
      </Repetition>
      <StartBoundary>2000-01-01T00:00:00</StartBoundary>
      <Enabled>true</Enabled>
    </TimeTrigger>
  </Triggers>
  <Principals>
    <Principal id="Author">
      <LogonType>InteractiveToken</LogonType>
      <RunLevel>LeastPrivilege</RunLevel>
    </Principal>
  </Principals>
  <Settings>
    <MultipleInstancesPolicy>IgnoreNew</MultipleInstancesPolicy>
    <DisallowStartIfOnBatteries>false</DisallowStartIfOnBatteries>
    <StopIfGoingOnBatteries>false</StopIfGoingOnBatteries>
    <StartWhenAvailable>true</StartWhenAvailable>
    <ExecutionTimeLimit>PT5M</ExecutionTimeLimit>
  </Settings>
  <Actions Context="Author">
    <Exec>
      <Command>${exec.command}</Command>
      <Arguments>${exec.arguments}</Arguments>
    </Exec>
  </Actions>
</Task>
`;
}

export { servicePathEnvironment };
