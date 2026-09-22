/**
 * schedule/adapters/systemd.ts
 *
 * SystemdAdapter — Linux systemd --user backend for oma schedule.
 *
 * upsert : write ~/.config/systemd/user/<label>.service + <label>.timer
 *          then systemctl --user daemon-reload + enable --now <label>.timer
 * remove : systemctl --user disable --now <label>.timer + delete unit files
 *          + daemon-reload
 * listLabels : glob ~/.config/systemd/user/dev.oma.*.timer → strip .timer
 * isAvailable : process.platform === "linux" AND systemctl --user works
 *
 * ExecStart always uses an absolute oma binary path so systemd (which runs
 * with a minimal PATH for user units) can locate the binary.
 *
 * Per docs/plans/contracts/schedule-scheduler-port.md §2
 */

import { execFileSync } from "node:child_process";
import * as fs from "node:fs";
import { homedir } from "node:os";
import * as path from "node:path";
import type { ScheduledJobSpec, SchedulerPort } from "../port.js";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getSystemdUserDir(): string {
  return path.join(homedir(), ".config", "systemd", "user");
}

function unitPath(label: string, ext: "service" | "timer"): string {
  return path.join(getSystemdUserDir(), `${label}.${ext}`);
}

/**
 * Sanitize a label for use as a systemd unit name.
 * Replaces characters not allowed in unit filenames with underscores.
 * dev.oma.<id> uses only safe chars; kept stable across calls.
 */
function sanitizeUnitName(label: string): string {
  // Systemd unit names allow [a-zA-Z0-9:@_.-]. Replace anything else.
  return label.replace(/[^a-zA-Z0-9:@_.\\-]/g, "_");
}

/**
 * Resolve the absolute path to the oma binary.
 * systemd user units run without a login shell and with a restricted PATH,
 * so a bare "oma" would not be found. We resolve at registration time.
 */
function resolveOmaBinary(): string {
  try {
    const found = execFileSync("sh", ["-c", "command -v oma"], {
      encoding: "utf-8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
    if (found && path.isAbsolute(found)) return found;
  } catch {
    // fall through
  }
  return process.execPath;
}

/**
 * Build an augmented PATH string for the systemd unit Environment= directive.
 * Covers common install locations that won't be in systemd's default PATH.
 */
function buildJobPath(binDir: string): string {
  const dirs = [
    binDir,
    "/usr/local/bin",
    path.join(homedir(), ".bun", "bin"),
    path.join(homedir(), ".local", "bin"),
    "/usr/bin",
    "/bin",
    "/usr/sbin",
    "/sbin",
  ];
  return [...new Set(dirs)].join(":");
}

// ---------------------------------------------------------------------------
// cron → OnCalendar translator
//
// Supports the common shapes used in oma schedule:
//   *          → *          (every value)
//   N          → N          (exact value)
//   N,M,...    → N,M,...    (list — systemd OnCalendar supports comma lists)
//   */N        → */N        (step — systemd supports this in OnCalendar)
//   M-N        → M..N       (range in OnCalendar uses .. notation)
//
// OnCalendar format: DayOfWeek Year-Month-Day Hour:Minute:Second
// We produce: DayOfWeek-less form "* Month-Dom Hour:Minute:00"
// and fold day-of-week into a separate "DayOfWeek" prefix when non-*.
//
// Unsupported: combined range+step (M-N/S), non-standard @reboot/@yearly etc.
// ---------------------------------------------------------------------------

/**
 * Translate a cron field to its systemd OnCalendar equivalent fragment.
 * Returns the translated fragment string.
 * Throws for shapes we cannot express in OnCalendar.
 */
function translateCronField(
  field: string,
  kind: "minute" | "hour" | "dom" | "month" | "dow",
): string {
  if (field === "*") return "*";

  // Step on wildcard: */N
  const stepStar = /^\*\/(\d+)$/.exec(field);
  if (stepStar) {
    return `*/${stepStar[1]}`;
  }

  // Range+step: M-N/S — not expressible in a single OnCalendar token; throw
  if (/^\d+-\d+\/\d+$/.test(field)) {
    throw new Error(
      `SystemdAdapter: cron field "${field}" (range+step) cannot be ` +
        `translated to OnCalendar. Simplify the cron expression.`,
    );
  }

  // Range: M-N → M..N (systemd uses ".." for ranges in OnCalendar)
  const range = /^(\d+)-(\d+)$/.exec(field);
  if (range) {
    return `${range[1]}..${range[2]}`;
  }

  // List: a,b,c — systemd OnCalendar natively supports comma-separated lists
  if (field.includes(",")) {
    // Validate each part is a plain number (no nested ranges/steps in lists)
    const parts = field.split(",");
    for (const part of parts) {
      if (!/^\d+$/.test(part)) {
        throw new Error(
          `SystemdAdapter: cron list field "${field}" contains non-numeric ` +
            `part "${part}". Only plain number lists are supported.`,
        );
      }
    }
    return field; // pass through as-is
  }

  // Single number
  if (/^\d+$/.test(field)) {
    return field;
  }

  throw new Error(
    `SystemdAdapter: unsupported cron field "${field}" for ${kind}. ` +
      `Cannot translate to OnCalendar.`,
  );
}

/**
 * Convert a 5-field cron expression to a systemd OnCalendar string.
 *
 * Cron field order: minute hour dom month dow
 * OnCalendar syntax: [DayOfWeek] [Year-]Month-Day Hour:Minute[:Second]
 *
 * Returns a value suitable for the OnCalendar= directive in a .timer unit.
 */
export function cronToOnCalendar(cron: string): string {
  const parts = cron.trim().split(/\s+/);
  if (parts.length !== 5) {
    throw new Error(
      `SystemdAdapter: invalid cron expression "${cron}". ` +
        `Expected 5 fields (minute hour dom month dow).`,
    );
  }

  const [minuteStr, hourStr, domStr, monthStr, dowStr] = parts as [
    string,
    string,
    string,
    string,
    string,
  ];

  const minute = translateCronField(minuteStr, "minute");
  const hour = translateCronField(hourStr, "hour");
  const dom = translateCronField(domStr, "dom");
  const month = translateCronField(monthStr, "month");
  const dow = translateCronField(dowStr, "dow");

  // Build OnCalendar value:
  // If dow is *, omit the DayOfWeek prefix: "* Month-Dom Hour:Minute:00"
  // If dow is specified, systemd uses abbreviated names or numbers:
  //   0,7=Sun, 1=Mon, … 6=Sat. Systemd accepts numbers in OnCalendar.
  // systemd OnCalendar requires zero-padded HH:MM:SS time; date components
  // (month/dom) are left as-is. Pad only simple numeric time tokens — leave
  // "*", "*/N", lists, and ranges untouched.
  const padTime = (t: string): string =>
    /^\d+$/.test(t) ? t.padStart(2, "0") : t;
  const datePart = `${month}-${dom}`;
  const timePart = `${padTime(hour)}:${padTime(minute)}:00`;

  if (dow === "*") {
    return `*-${datePart} ${timePart}`;
  }
  // Map dow numbers to systemd weekday abbreviations
  const dowMap: Record<string, string> = {
    "0": "Sun",
    "1": "Mon",
    "2": "Tue",
    "3": "Wed",
    "4": "Thu",
    "5": "Fri",
    "6": "Sat",
    "7": "Sun",
  };
  // Handle simple numeric dow (single, list, range, step)
  // For a list/range of days, translate each number
  const translatedDow = dow.replace(/\d+/g, (n) => dowMap[n] ?? n);
  return `${translatedDow} *-${datePart} ${timePart}`;
}

function buildServiceContent(
  spec: ScheduledJobSpec,
  absOma: string,
  jobPath: string,
): string {
  // Build ExecStart: resolve "oma" in command[0] to absolute path
  const resolvedCommand =
    spec.command[0] === "oma"
      ? [absOma, ...spec.command.slice(1)]
      : spec.command;
  const execStart = resolvedCommand.join(" ");

  return `[Unit]
Description=oma schedule job ${spec.id}
After=network.target

[Service]
Type=oneshot
ExecStart=${execStart}
WorkingDirectory=${spec.workspace}
Environment=PATH=${jobPath}
StandardOutput=append:${path.join(homedir(), ".agents", "schedule", "runs", spec.id, "stdout.log")}
StandardError=append:${path.join(homedir(), ".agents", "schedule", "runs", spec.id, "stderr.log")}

[Install]
WantedBy=default.target
`;
}

function buildTimerContent(spec: ScheduledJobSpec, unitName: string): string {
  const onCalendar = cronToOnCalendar(spec.cron);

  return `[Unit]
Description=oma schedule timer for job ${spec.id}

[Timer]
OnCalendar=${onCalendar}
Persistent=true
Unit=${unitName}.service

[Install]
WantedBy=timers.target
`;
}

// ---------------------------------------------------------------------------
// SystemdAdapter
// ---------------------------------------------------------------------------

export class SystemdAdapter implements SchedulerPort {
  async isAvailable(): Promise<boolean> {
    if (process.platform !== "linux") return false;
    // Probe systemctl --user to verify user bus is accessible
    try {
      execFileSync("systemctl", ["--user", "status"], {
        encoding: "utf-8",
        stdio: ["ignore", "ignore", "ignore"],
      });
      return true;
    } catch (err) {
      // systemctl --user exits non-zero when no user session bus exists
      // but still returns usable output. Check if it's a "no D-Bus" failure.
      if (err instanceof Error && err.message.includes("DBUS")) {
        return false;
      }
      // exit code 3 = "no units running" which is fine — bus exists
      return true;
    }
  }

  async upsert(spec: ScheduledJobSpec): Promise<void> {
    const unitDir = getSystemdUserDir();
    if (!fs.existsSync(unitDir)) {
      fs.mkdirSync(unitDir, { recursive: true });
    }

    // Ensure run log dir exists
    const runDir = path.join(homedir(), ".agents", "schedule", "runs", spec.id);
    if (!fs.existsSync(runDir)) {
      fs.mkdirSync(runDir, { recursive: true });
    }

    const absOma = resolveOmaBinary();
    const jobPath = buildJobPath(path.dirname(absOma));
    const unitName = sanitizeUnitName(spec.label);

    const serviceContent = buildServiceContent(spec, absOma, jobPath);
    const timerContent = buildTimerContent(spec, unitName);

    fs.writeFileSync(unitPath(unitName, "service"), serviceContent, {
      mode: 0o644,
    });
    fs.writeFileSync(unitPath(unitName, "timer"), timerContent, {
      mode: 0o644,
    });

    execFileSync("systemctl", ["--user", "daemon-reload"], {
      encoding: "utf-8",
    });
    execFileSync(
      "systemctl",
      ["--user", "enable", "--now", `${unitName}.timer`],
      {
        encoding: "utf-8",
      },
    );
  }

  async remove(label: string): Promise<void> {
    const unitName = sanitizeUnitName(label);

    try {
      execFileSync(
        "systemctl",
        ["--user", "disable", "--now", `${unitName}.timer`],
        {
          encoding: "utf-8",
          stdio: ["ignore", "ignore", "ignore"],
        },
      );
    } catch {
      // Not loaded or does not exist — no-op
    }

    const svcPath = unitPath(unitName, "service");
    const tmrPath = unitPath(unitName, "timer");

    if (fs.existsSync(svcPath)) fs.unlinkSync(svcPath);
    if (fs.existsSync(tmrPath)) fs.unlinkSync(tmrPath);

    try {
      execFileSync("systemctl", ["--user", "daemon-reload"], {
        encoding: "utf-8",
      });
    } catch {
      // Best-effort
    }
  }

  async readCommand(label: string): Promise<string[] | null> {
    const servicePath = unitPath(label, "service");
    if (!fs.existsSync(servicePath)) return null;
    try {
      const line = fs
        .readFileSync(servicePath, "utf-8")
        .split("\n")
        .find((l) => l.startsWith("ExecStart="));
      if (!line) return null;
      const argv = line.slice("ExecStart=".length).trim().split(/\s+/);
      return argv.length > 0 && argv[0] ? argv : null;
    } catch {
      return null;
    }
  }

  async listLabels(): Promise<string[]> {
    const unitDir = getSystemdUserDir();
    if (!fs.existsSync(unitDir)) return [];

    const files = fs
      .readdirSync(unitDir)
      .filter((f) => f.startsWith("dev.oma.") && f.endsWith(".timer"));

    return files.map((f) => f.replace(/\.timer$/, ""));
  }
}
