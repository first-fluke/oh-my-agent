import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import type {
  MemoryCommandStatus,
  MemoryServiceCommand,
  MemoryServiceCommandPlanOptions,
  MemoryServiceCommandResult,
  MemoryServiceCommandRunOptions,
  MemoryServiceOptions,
  MemoryServicePresence,
  MemoryServiceResult,
  MemoryServiceUninstallOptions,
} from "../types/memory.js";

/**
 * AgentMemory daemon service generator (D43).
 *
 * Owns the launchd plist / systemd user unit rendering, service-file path
 * resolution, and the activation commands run on install/uninstall. Extracted
 * from `commands/memory/memory.ts` so the platform concern lives in one place
 * (design doc 013, "Files to Create: cli/platform/agentmemory-service.ts").
 */

export const DEFAULT_AGENTMEMORY_PORT = 3111;
export const LAUNCHD_AGENTMEMORY_LABEL = "dev.oma.agentmemory";
export const WINDOWS_TASK_NAME = "OMA AgentMemory";

export function parsePositivePort(
  value: number | string | undefined,
): number | null {
  if (value === undefined) return null;
  const port = typeof value === "number" ? value : Number(value);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error(`invalid AgentMemory port: ${value}`);
  }
  return port;
}

export function defaultServiceCommandRunner(
  command: MemoryServiceCommand,
): MemoryCommandStatus {
  const result = spawnSync(command.bin, command.args, {
    encoding: "utf-8",
    stdio: "pipe",
    timeout: 10000,
  });
  return {
    status: result.status,
    error: result.error?.message ?? result.stderr?.trim() ?? undefined,
  };
}

function servicePathEnvironment(homeDir: string): string {
  return [
    join(homeDir, ".bun", "bin"),
    join(homeDir, ".local", "bin"),
    "/opt/homebrew/bin",
    "/usr/local/bin",
    "/usr/bin",
    "/bin",
    "/usr/sbin",
    "/sbin",
  ].join(":");
}

function agentMemoryServicePath(
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

export function getAgentMemoryServicePresence(
  args: { homeDir?: string; platform?: NodeJS.Platform } = {},
): MemoryServicePresence {
  const homeDir = args.homeDir ?? homedir();
  const platform = args.platform ?? process.platform;
  const servicePath = agentMemoryServicePath(homeDir, platform);
  return {
    platform,
    supported: servicePath !== undefined,
    servicePath,
    installed: servicePath ? existsSync(servicePath) : false,
  };
}

function agentMemoryDataHome(homeDir: string): string {
  return join(homeDir, ".agentmemory");
}

function renderLaunchdService(args: { homeDir: string; port: number }): string {
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
    <string>/usr/bin/env</string>
    <string>agentmemory</string>
  </array>
  <key>WorkingDirectory</key>
  <string>${agentMemoryDataHome(args.homeDir)}</string>
  <key>EnvironmentVariables</key>
  <dict>
    <key>PATH</key>
    <string>${servicePathEnvironment(args.homeDir)}</string>
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

function renderSystemdService(args: { homeDir: string; port: number }): string {
  // WorkingDirectory pins AgentMemory's cwd-relative `./data/` store.
  return `[Unit]
Description=OMA AgentMemory daemon
After=network.target

[Service]
Type=simple
WorkingDirectory=${agentMemoryDataHome(args.homeDir)}
Environment=PATH=${servicePathEnvironment(args.homeDir)}
Environment=III_REST_PORT=${args.port}
ExecStart=/usr/bin/env agentmemory
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
function renderWindowsTaskXml(args: { homeDir: string; port: number }): string {
  const dataHome = agentMemoryDataHome(args.homeDir);
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
      <Command>cmd</Command>
      <Arguments>/c set "III_REST_PORT=${args.port}" &amp;&amp; agentmemory</Arguments>
      <WorkingDirectory>${dataHome}</WorkingDirectory>
    </Exec>
  </Actions>
</Task>
`;
}

function serviceDomain(): string {
  const uid = typeof process.getuid === "function" ? process.getuid() : 0;
  return `gui/${uid}`;
}

function serviceCommands(
  args: MemoryServiceCommandPlanOptions,
): MemoryServiceCommand[] {
  if (args.platform === "darwin") {
    const domain = serviceDomain();
    const serviceId = `${domain}/${LAUNCHD_AGENTMEMORY_LABEL}`;
    return args.action === "install"
      ? [
          {
            bin: "launchctl",
            args: ["bootout", domain, args.servicePath],
            optional: true,
          },
          { bin: "launchctl", args: ["bootstrap", domain, args.servicePath] },
          { bin: "launchctl", args: ["enable", serviceId] },
          { bin: "launchctl", args: ["kickstart", "-k", serviceId] },
        ]
      : [
          { bin: "launchctl", args: ["disable", serviceId], optional: true },
          {
            bin: "launchctl",
            args: ["bootout", domain, args.servicePath],
            optional: true,
          },
        ];
  }

  if (args.platform === "linux") {
    return args.action === "install"
      ? [
          { bin: "systemctl", args: ["--user", "daemon-reload"] },
          {
            bin: "systemctl",
            args: ["--user", "enable", "--now", "oma-agentmemory.service"],
          },
        ]
      : [
          {
            bin: "systemctl",
            args: ["--user", "disable", "--now", "oma-agentmemory.service"],
            optional: true,
          },
          { bin: "systemctl", args: ["--user", "daemon-reload"] },
        ];
  }

  if (args.platform === "win32") {
    return args.action === "install"
      ? [
          {
            bin: "schtasks",
            args: [
              "/create",
              "/tn",
              WINDOWS_TASK_NAME,
              "/xml",
              args.servicePath,
              "/f",
            ],
          },
          {
            bin: "schtasks",
            args: ["/run", "/tn", WINDOWS_TASK_NAME],
          },
        ]
      : [
          {
            bin: "schtasks",
            args: ["/end", "/tn", WINDOWS_TASK_NAME],
            optional: true,
          },
          {
            bin: "schtasks",
            args: ["/delete", "/tn", WINDOWS_TASK_NAME, "/f"],
            optional: true,
          },
        ];
  }

  return [];
}

function formatServiceCommand(command: MemoryServiceCommand): string {
  return [command.bin, ...command.args].join(" ");
}

function runServiceCommands(
  args: MemoryServiceCommandRunOptions,
): MemoryServiceCommandResult {
  for (const command of args.commands) {
    const result = args.runner(command);
    if (result.status === 0 || command.optional) continue;
    return {
      activated: false,
      commandExitCode: result.status,
      commandError: result.error,
    };
  }

  return { activated: true };
}

export function installAgentMemoryService(
  args: MemoryServiceOptions = {},
): MemoryServiceResult {
  const homeDir = args.homeDir ?? homedir();
  const platform = args.platform ?? process.platform;
  const port = parsePositivePort(args.port) ?? DEFAULT_AGENTMEMORY_PORT;
  const servicePath = agentMemoryServicePath(homeDir, platform);
  const content =
    platform === "darwin"
      ? renderLaunchdService({ homeDir, port })
      : platform === "linux"
        ? renderSystemdService({ homeDir, port })
        : platform === "win32"
          ? renderWindowsTaskXml({ homeDir, port })
          : undefined;
  const commands =
    servicePath === undefined
      ? []
      : serviceCommands({ action: "install", platform, servicePath });
  const commandLines = commands.map(formatServiceCommand);

  const runner = args.runner ?? defaultServiceCommandRunner;
  let wroteFile = false;
  let activated = false;
  let commandExitCode: number | null | undefined;
  let commandError: string | undefined;
  if (servicePath && content && !args.dryRun) {
    mkdirSync(dirname(servicePath), { recursive: true, mode: 0o700 });
    writeFileSync(servicePath, content, { encoding: "utf-8", mode: 0o600 });
    wroteFile = true;

    const commandResult = runServiceCommands({ commands, runner });
    activated = commandResult.activated;
    commandExitCode = commandResult.commandExitCode;
    commandError = commandResult.commandError;

    // `launchctl bootstrap` returns EIO (5) in some macOS session contexts
    // (background jobs, certain Aqua/login states). The legacy `load -w` API is
    // deprecated but still works there, so fall back to it before giving up.
    if (!activated && platform === "darwin") {
      const legacy = runner({
        bin: "launchctl",
        args: ["load", "-w", servicePath],
      });
      commandLines.push(`launchctl load -w ${servicePath}`);
      if (legacy.status === 0) {
        activated = true;
        commandExitCode = 0;
        commandError = undefined;
      }
    }
  }

  return {
    action: "install",
    platform,
    supported: servicePath !== undefined,
    dryRun: args.dryRun === true,
    servicePath,
    wroteFile,
    removedFile: false,
    activated,
    commands: commandLines,
    commandExitCode,
    commandError,
    content: args.dryRun ? content : undefined,
    message:
      servicePath === undefined
        ? `AgentMemory service install is not supported on ${platform}`
        : args.dryRun
          ? "AgentMemory service file would be written and activated"
          : activated
            ? "AgentMemory service installed and activated"
            : "AgentMemory service file installed but activation failed",
  };
}

export function uninstallAgentMemoryService(
  args: MemoryServiceUninstallOptions = {},
): MemoryServiceResult {
  const homeDir = args.homeDir ?? homedir();
  const platform = args.platform ?? process.platform;
  const servicePath = agentMemoryServicePath(homeDir, platform);
  const commands =
    servicePath === undefined
      ? []
      : serviceCommands({ action: "uninstall", platform, servicePath });
  const commandLines = commands.map(formatServiceCommand);

  let removedFile = false;
  let activated = false;
  let commandExitCode: number | null | undefined;
  let commandError: string | undefined;

  if (servicePath && !args.dryRun) {
    const runner = args.runner ?? defaultServiceCommandRunner;
    const commandResult = runServiceCommands({ commands, runner });
    activated = commandResult.activated;
    commandExitCode = commandResult.commandExitCode;
    commandError = commandResult.commandError;

    // Best-effort legacy unload to match the `load -w` install fallback; the
    // modern `bootout` may EIO in the same contexts (see installer note).
    if (platform === "darwin") {
      runner({ bin: "launchctl", args: ["unload", "-w", servicePath] });
      commandLines.push(`launchctl unload -w ${servicePath}`);
    }

    if (existsSync(servicePath)) {
      rmSync(servicePath, { force: true });
      removedFile = true;
    }
  }

  return {
    action: "uninstall",
    platform,
    supported: servicePath !== undefined,
    dryRun: args.dryRun === true,
    servicePath,
    wroteFile: false,
    removedFile,
    activated,
    commands: commandLines,
    commandExitCode,
    commandError,
    message:
      servicePath === undefined
        ? `AgentMemory service uninstall is not supported on ${platform}`
        : args.dryRun
          ? "AgentMemory service would be disabled and removed"
          : commandError
            ? "AgentMemory service file removed but disable failed"
            : "AgentMemory service disabled and removed",
  };
}
