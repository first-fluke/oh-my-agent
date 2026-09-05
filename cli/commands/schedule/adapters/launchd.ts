/**
 * schedule/adapters/launchd.ts
 *
 * LaunchdAdapter — macOS launchd backend for oma schedule.
 *
 * upsert : write ~/Library/LaunchAgents/dev.oma.<id>.plist + launchctl bootstrap
 * remove : launchctl bootout + delete plist
 * listLabels : glob ~/Library/LaunchAgents/dev.oma.*.plist
 * isAvailable : process.platform === "darwin"
 *
 * plist ProgramArguments is always ["oma","schedule","run","<id>"]
 * cron → StartCalendarInterval conversion included.
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

function getLaunchAgentsDir(): string {
  return path.join(homedir(), "Library", "LaunchAgents");
}

function plistPath(label: string): string {
  return path.join(getLaunchAgentsDir(), `${label}.plist`);
}

/** Convert a 5-field cron expression to StartCalendarInterval dict(s).
 *
 * StartCalendarInterval keys: Minute Hour Day Month Weekday
 * We expand list-fields and ranges so launchd gets explicit dicts.
 * '*' means "omit the key" (launchd fires on every value).
 *
 * Returns an array of dicts (multiple entries for list/range fields).
 */
function cronToStartCalendarInterval(
  cron: string,
): Array<Record<string, number>> {
  const [minuteStr, hourStr, domStr, monthStr, dowStr] = cron
    .trim()
    .split(/\s+/) as [string, string, string, string, string];

  function expandField(
    field: string,
    min: number,
    max: number,
  ): number[] | null {
    if (field === "*") return null; // omit key

    // Step: */n
    const stepStar = /^\*\/(\d+)$/.exec(field);
    if (stepStar) {
      const step = Number(stepStar[1]);
      const vals: number[] = [];
      for (let i = min; i <= max; i += step) vals.push(i);
      return vals;
    }
    // Range: m-n
    const range = /^(\d+)-(\d+)$/.exec(field);
    if (range) {
      const lo = Number(range[1]);
      const hi = Number(range[2]);
      const vals: number[] = [];
      for (let i = lo; i <= hi; i++) vals.push(i);
      return vals;
    }
    // Step on range: m-n/s
    const rangeStep = /^(\d+)-(\d+)\/(\d+)$/.exec(field);
    if (rangeStep) {
      const lo = Number(rangeStep[1]);
      const hi = Number(rangeStep[2]);
      const step = Number(rangeStep[3]);
      const vals: number[] = [];
      for (let i = lo; i <= hi; i += step) vals.push(i);
      return vals;
    }
    // List: a,b,c
    if (field.includes(",")) {
      const vals: number[] = [];
      for (const part of field.split(",")) {
        const expanded = expandField(part, min, max);
        if (expanded) vals.push(...expanded);
        else {
          // '*' inside a list is unusual but map to all values
          for (let i = min; i <= max; i++) vals.push(i);
        }
      }
      return [...new Set(vals)].sort((a, b) => a - b);
    }
    // Single number
    return [Number(field)];
  }

  const minutes = expandField(minuteStr, 0, 59);
  const hours = expandField(hourStr, 0, 23);
  const doms = expandField(domStr, 1, 31);
  const months = expandField(monthStr, 1, 12);
  const dows = expandField(dowStr, 0, 7);

  // Build the cross-product of all non-null fields
  type Combo = Record<string, number>;
  let combos: Combo[] = [{}];

  function merge(
    existing: Combo[],
    key: string,
    values: number[] | null,
  ): Combo[] {
    if (values === null) return existing; // omit this key
    const result: Combo[] = [];
    for (const combo of existing) {
      for (const v of values) {
        result.push({ ...combo, [key]: v });
      }
    }
    return result;
  }

  combos = merge(combos, "Minute", minutes);
  combos = merge(combos, "Hour", hours);
  combos = merge(combos, "Day", doms);
  combos = merge(combos, "Month", months);
  combos = merge(combos, "Weekday", dows);

  const CAP = 1000;
  if (combos.length > CAP) {
    throw new Error(
      `LaunchdAdapter: cron expression "${cron}" expands to ${combos.length} ` +
        `StartCalendarInterval dicts (limit: ${CAP}). Simplify the expression.`,
    );
  }

  return combos;
}

/**
 * Resolve the absolute path to the oma binary.
 *
 * launchd executes ProgramArguments WITHOUT a shell and with a minimal default
 * PATH (/usr/bin:/bin:/usr/sbin:/sbin), so a bare "oma" — installed under
 * /opt/homebrew/bin, /usr/local/bin, or ~/.bun/bin on typical setups — would
 * not resolve and the job would silently never fire. Resolve to an absolute
 * path at registration time, where the user's interactive PATH is available.
 */
function resolveOmaBinary(): string {
  try {
    const found = execFileSync("sh", ["-c", "command -v oma"], {
      encoding: "utf-8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
    if (found && path.isAbsolute(found)) return found;
  } catch {
    // fall through to execPath
  }
  // Single-file bun/node executable: execPath is the oma binary itself.
  return process.execPath;
}

/**
 * PATH injected into the launchd job's EnvironmentVariables so the oma process
 * AND every vendor CLI it spawns (claude/codex/antigravity/...) are discoverable under
 * launchd's otherwise-minimal environment.
 */
function buildJobPath(binDir: string): string {
  const dirs = [
    binDir,
    "/usr/local/bin",
    "/opt/homebrew/bin",
    path.join(homedir(), ".bun", "bin"),
    path.join(homedir(), ".local", "bin"),
    "/usr/bin",
    "/bin",
    "/usr/sbin",
    "/sbin",
  ];
  // De-dup while preserving order.
  return [...new Set(dirs)].join(":");
}

function buildPlistXml(spec: ScheduledJobSpec): string {
  const intervals = cronToStartCalendarInterval(spec.cron);

  const firstInterval = intervals[0];
  const intervalXml =
    intervals.length === 1 && firstInterval
      ? dictXml(firstInterval)
      : `<array>\n${intervals.map((d) => `      ${dictXml(d)}`).join("\n")}\n    </array>`;

  // The logical command is ["oma","schedule","run","<id>"]; resolve the bare "oma"
  // entry point to an absolute path so launchd (minimal PATH, no shell) can run it.
  const resolvedCommand =
    spec.command[0] === "oma"
      ? [resolveOmaBinary(), ...spec.command.slice(1)]
      : spec.command;

  const programArguments = resolvedCommand
    .map((arg) => `      <string>${escapeXml(arg)}</string>`)
    .join("\n");

  const jobPath = buildJobPath(path.dirname(resolvedCommand[0] ?? ""));

  return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN"
  "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key>
  <string>${escapeXml(spec.label)}</string>
  <key>ProgramArguments</key>
  <array>
${programArguments}
  </array>
  <key>EnvironmentVariables</key>
  <dict>
    <key>PATH</key>
    <string>${escapeXml(jobPath)}</string>
  </dict>
  <key>StartCalendarInterval</key>
    ${intervalXml}
  <key>WorkingDirectory</key>
  <string>${escapeXml(spec.workspace)}</string>
  <key>StandardOutPath</key>
  <string>${escapeXml(path.join(homedir(), ".agents", "schedule", "runs", spec.id, "stdout.log"))}</string>
  <key>StandardErrorPath</key>
  <string>${escapeXml(path.join(homedir(), ".agents", "schedule", "runs", spec.id, "stderr.log"))}</string>
  <key>RunAtLoad</key>
  <false/>
</dict>
</plist>
`;
}

function dictXml(obj: Record<string, number>): string {
  const entries = Object.entries(obj)
    .map(([k, v]) => `<key>${k}</key><integer>${v}</integer>`)
    .join("");
  return `<dict>${entries}</dict>`;
}

function escapeXml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function getCurrentUid(): string {
  try {
    return execFileSync("id", ["-u"], { encoding: "utf-8" }).trim();
  } catch {
    return String(process.getuid?.() ?? 501);
  }
}

// ---------------------------------------------------------------------------
// LaunchdAdapter
// ---------------------------------------------------------------------------

export class LaunchdAdapter implements SchedulerPort {
  async isAvailable(): Promise<boolean> {
    return process.platform === "darwin";
  }

  async upsert(spec: ScheduledJobSpec): Promise<void> {
    const laDir = getLaunchAgentsDir();
    if (!fs.existsSync(laDir)) {
      fs.mkdirSync(laDir, { recursive: true });
    }

    // Ensure run log dir exists
    const runDir = path.join(homedir(), ".agents", "schedule", "runs", spec.id);
    if (!fs.existsSync(runDir)) {
      fs.mkdirSync(runDir, { recursive: true });
    }

    const plistXml = buildPlistXml(spec);
    const pPath = plistPath(spec.label);
    fs.writeFileSync(pPath, plistXml, { mode: 0o644 });

    const uid = getCurrentUid();
    const target = `gui/${uid}`;

    // If already loaded, bootout first (idempotent upsert)
    try {
      execFileSync("launchctl", ["bootout", target, pPath], {
        encoding: "utf-8",
        stdio: ["ignore", "pipe", "ignore"],
      });
    } catch {
      // Not currently loaded — this is fine
    }

    execFileSync("launchctl", ["bootstrap", target, pPath], {
      encoding: "utf-8",
    });
  }

  async remove(label: string): Promise<void> {
    const pPath = plistPath(label);
    const uid = getCurrentUid();
    const target = `gui/${uid}`;

    try {
      execFileSync("launchctl", ["bootout", `${target}/${label}`], {
        encoding: "utf-8",
        stdio: ["ignore", "pipe", "ignore"],
      });
    } catch {
      // Not loaded — no-op
    }

    if (fs.existsSync(pPath)) {
      fs.unlinkSync(pPath);
    }
  }

  async listLabels(): Promise<string[]> {
    const laDir = getLaunchAgentsDir();
    if (!fs.existsSync(laDir)) return [];

    const files = fs
      .readdirSync(laDir)
      .filter((f) => f.startsWith("dev.oma.") && f.endsWith(".plist"));

    return files.map((f) => f.replace(/\.plist$/, ""));
  }
}
