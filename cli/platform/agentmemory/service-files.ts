import { join } from "node:path";

/**
 * AgentMemory service-file rendering: per-platform service path resolution
 * and the launchd plist / systemd user unit / Windows scheduled-task XML
 * templates. Split out of `platform/agentmemory-service.ts` (D43) so the
 * orchestration layer stays template-free.
 */

export const LAUNCHD_AGENTMEMORY_LABEL = "dev.oma.agentmemory";

export function servicePathEnvironment(
  homeDir: string,
  runtimePath?: string,
  platform: NodeJS.Platform = process.platform,
): string {
  const defaults = [
    join(homeDir, ".bun", "bin"),
    join(homeDir, ".local", "bin"),
    "/opt/homebrew/bin",
    "/usr/local/bin",
    "/usr/bin",
    "/bin",
    "/usr/sbin",
    "/sbin",
  ];
  if (runtimePath === undefined) return defaults.join(":");
  const separator = platform === "win32" ? ";" : ":";
  const fallback = platform === "win32" ? defaults.slice(0, 2) : defaults;
  return [
    ...new Set([...runtimePath.split(separator).filter(Boolean), ...fallback]),
  ].join(separator);
}

export function agentMemoryServicePath(
  homeDir: string,
  platform: NodeJS.Platform,
): string | undefined {
  if (platform === "darwin") {
    return join(
      homeDir,
      "Library",
      "LaunchAgents",
      "dev.oma.agentmemory.plist",
    );
  }
  if (platform === "linux") {
    return join(
      homeDir,
      ".config",
      "systemd",
      "user",
      "oma-agentmemory.service",
    );
  }
  if (platform === "win32") {
    // The scheduled-task XML registered with schtasks; the task itself is named
    // by WINDOWS_TASK_NAME.
    return join(homeDir, ".agentmemory", "oma-agentmemory.task.xml");
  }
  return undefined;
}

function agentMemoryDataHome(homeDir: string): string {
  return join(homeDir, ".agentmemory");
}

function escapeXml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

function quoteSystemd(value: string): string {
  return `"${value.replaceAll("\\", "\\\\").replaceAll('"', '\\"').replaceAll("%", "%%").replaceAll("\n", "\\n").replaceAll("\r", "\\r").replaceAll("\t", "\\t")}"`;
}

function quotePowerShell(value: string): string {
  return `'${value.replaceAll("'", "''")}'`;
}

export function renderLaunchdService(args: {
  homeDir: string;
  port: number;
  executable?: string;
  runtimePath?: string;
}): string {
  // AgentMemory's iii-engine writes its store to a cwd-relative `./data/`, so
  // pin WorkingDirectory to the config home (launchd otherwise defaults to `/`).
  return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key>
  <string>${LAUNCHD_AGENTMEMORY_LABEL}</string>
  <key>ProgramArguments</key>
  <array>
${args.executable ? `    <string>${escapeXml(args.executable)}</string>` : "    <string>/usr/bin/env</string>\n    <string>agentmemory</string>"}
  </array>
  <key>WorkingDirectory</key>
  <string>${agentMemoryDataHome(args.homeDir)}</string>
  <key>EnvironmentVariables</key>
  <dict>
    <key>PATH</key>
    <string>${escapeXml(servicePathEnvironment(args.homeDir, args.runtimePath, "darwin"))}</string>
    <key>III_REST_PORT</key>
    <string>${args.port}</string>
  </dict>
  <key>RunAtLoad</key>
  <true/>
  <key>KeepAlive</key>
  <true/>
  <key>StandardOutPath</key>
  <string>/tmp/oma-agentmemory.out.log</string>
  <key>StandardErrorPath</key>
  <string>/tmp/oma-agentmemory.err.log</string>
</dict>
</plist>
`;
}

export function renderSystemdService(args: {
  homeDir: string;
  port: number;
  executable?: string;
  runtimePath?: string;
}): string {
  // WorkingDirectory pins AgentMemory's cwd-relative `./data/` store.
  return `[Unit]
Description=OMA AgentMemory daemon
After=network.target

[Service]
Type=simple
WorkingDirectory=${agentMemoryDataHome(args.homeDir)}
Environment=${args.runtimePath === undefined ? `PATH=${servicePathEnvironment(args.homeDir)}` : quoteSystemd(`PATH=${servicePathEnvironment(args.homeDir, args.runtimePath, "linux")}`)}
Environment=III_REST_PORT=${args.port}
ExecStart=${args.executable ? quoteSystemd(args.executable.replaceAll("$", "$$$$")) : "/usr/bin/env agentmemory"}
Restart=on-failure
RestartSec=2

[Install]
WantedBy=default.target
`;
}

// Windows Task Scheduler definition. Task Scheduler has no per-task env block,
// so III_REST_PORT is set inline via cmd; WorkingDirectory pins the cwd-relative
// ./data store to the AgentMemory home, and MultipleInstancesPolicy=IgnoreNew
// prevents the overlapping-engine race that produces 404s.
export function renderWindowsTaskXml(args: {
  homeDir: string;
  port: number;
  executable?: string;
  runtimePath?: string;
}): string {
  const dataHome = agentMemoryDataHome(args.homeDir);
  // Encoded PowerShell keeps PATH values literal; cmd.exe expands %NAME% even
  // inside quotes. The default task retains its existing cmd invocation.
  const encodedCommand =
    args.runtimePath === undefined
      ? undefined
      : Buffer.from(
          [
            `$env:PATH = ${quotePowerShell(servicePathEnvironment(args.homeDir, args.runtimePath, "win32"))}`,
            `$env:III_REST_PORT = '${args.port}'`,
            `& ${quotePowerShell(args.executable ?? "agentmemory")}`,
            "exit $LASTEXITCODE",
          ].join("; "),
          "utf16le",
        ).toString("base64");
  return `<?xml version="1.0" encoding="UTF-16"?>
<Task version="1.2" xmlns="http://schemas.microsoft.com/windows/2004/02/mit/task">
  <RegistrationInfo>
    <Description>OMA AgentMemory daemon</Description>
  </RegistrationInfo>
  <Triggers>
    <LogonTrigger>
      <Enabled>true</Enabled>
    </LogonTrigger>
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
    <ExecutionTimeLimit>PT0S</ExecutionTimeLimit>
    <RestartOnFailure>
      <Interval>PT10S</Interval>
      <Count>3</Count>
    </RestartOnFailure>
  </Settings>
  <Actions Context="Author">
    <Exec>
      <Command>${encodedCommand ? "powershell.exe" : "cmd"}</Command>
      <Arguments>${encodedCommand ? `-NoProfile -NonInteractive -EncodedCommand ${encodedCommand}` : `/c set "III_REST_PORT=${args.port}" &amp;&amp; ${args.executable ? escapeXml(`"${args.executable}"`) : "agentmemory"}`}</Arguments>
      <WorkingDirectory>${dataHome}</WorkingDirectory>
    </Exec>
  </Actions>
</Task>
`;
}
