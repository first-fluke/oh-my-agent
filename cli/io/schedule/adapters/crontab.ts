/**
 * schedule/adapters/crontab.ts
 *
 * CrontabAdapter -- POSIX crontab fallback for oma schedule.
 *
 * Manages ONLY lines inside a clearly-marked block in the user's crontab:
 *   # BEGIN oma-schedule
 *   ... oma-managed entries ...
 *   # END oma-schedule
 *
 * Lines outside the marker block are NEVER read, modified, or removed.
 *
 * upsert : read crontab -l, parse/replace marker block, reinstall via stdin
 * remove : drop matching # oma:<label> line from marker block, reinstall
 * listLabels : parse # oma:<label> comments inside the marker block
 * isAvailable : `crontab` binary is present on PATH
 *
 * Job line format inside the marker block:
 *   <cron> <absOma> schedule:run <id> # oma:<label>
 *
 * Per docs/plans/contracts/schedule-scheduler-port.md §2
 */

import { execFileSync } from "node:child_process";
import * as path from "node:path";
import type { ScheduledJobSpec, SchedulerPort } from "../port.js";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const MARKER_BEGIN = "# BEGIN oma-schedule";
const MARKER_END = "# END oma-schedule";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Resolve the absolute path to the oma binary.
 * cron executes jobs with a minimal environment and a restricted PATH,
 * so we must embed an absolute path to ensure oma is found at fire time.
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
 * Read the current crontab content.
 * Returns an empty string if the user has no crontab yet.
 */
function readCrontab(): string {
  try {
    return execFileSync("crontab", ["-l"], {
      encoding: "utf-8",
      stdio: ["ignore", "pipe", "pipe"],
    });
  } catch {
    // "no crontab for user" exits non-zero -- treat as empty
    return "";
  }
}

/**
 * Install (replace) the user's crontab by piping content directly to
 * crontab stdin. No temp file is written to disk.
 */
function writeCrontab(content: string): void {
  execFileSync("crontab", ["-"], {
    encoding: "utf-8",
    input: content,
    stdio: ["pipe", "pipe", "pipe"],
  });
}

/**
 * Parse the crontab content into three parts:
 *   before: lines before the marker block (including non-oma content)
 *   block:  lines inside the marker block (excluding the markers themselves)
 *   after:  lines after the marker block
 *
 * If no marker block exists, block is empty and after is empty.
 */
interface CrontabParts {
  before: string[];
  block: string[];
  after: string[];
}

function parseCrontab(content: string): CrontabParts {
  const lines = content.split("\n");
  const before: string[] = [];
  const block: string[] = [];
  const after: string[] = [];

  let inBlock = false;
  let foundEnd = false;

  for (const line of lines) {
    if (line === MARKER_BEGIN) {
      inBlock = true;
      continue;
    }
    if (line === MARKER_END) {
      inBlock = false;
      foundEnd = true;
      continue;
    }
    if (inBlock) {
      block.push(line);
    } else if (foundEnd) {
      after.push(line);
    } else {
      before.push(line);
    }
  }

  return { before, block, after };
}

/**
 * Re-assemble crontab content from the three parts + updated block.
 */
function assembleCrontab(
  before: string[],
  block: string[],
  after: string[],
): string {
  const sections: string[] = [];

  if (before.length > 0) {
    sections.push(before.join("\n"));
  }

  // Always emit the marker block (even if empty, for future adds)
  sections.push([MARKER_BEGIN, ...block, MARKER_END].join("\n"));

  if (after.length > 0) {
    sections.push(after.join("\n"));
  }

  const assembled = sections.join("\n");
  // Ensure a trailing newline
  return assembled.endsWith("\n") ? assembled : `${assembled}\n`;
}

/**
 * Extract the oma label from a cron job line comment.
 * Returns null if the line does not have an oma label comment.
 */
function extractLabel(line: string): string | null {
  const match = /# oma:(\S+)$/.exec(line);
  return match?.[1] ?? null;
}

// ---------------------------------------------------------------------------
// CrontabAdapter
// ---------------------------------------------------------------------------

export class CrontabAdapter implements SchedulerPort {
  async isAvailable(): Promise<boolean> {
    try {
      execFileSync("sh", ["-c", "command -v crontab"], {
        encoding: "utf-8",
        stdio: ["ignore", "pipe", "ignore"],
      });
      return true;
    } catch {
      return false;
    }
  }

  async readCommand(label: string): Promise<string[] | null> {
    try {
      const { block } = parseCrontab(readCrontab());
      const line = block.find((l) => extractLabel(l) === label);
      if (!line) return null;
      // `<cron 5 fields> <argv...> # oma:<label>` → argv
      const tokens = line
        .replace(/\s*# oma:\S+$/, "")
        .trim()
        .split(/\s+/);
      const argv = tokens.slice(5);
      return argv.length > 0 ? argv : null;
    } catch {
      return null;
    }
  }

  async upsert(spec: ScheduledJobSpec): Promise<void> {
    const absOma = resolveOmaBinary();

    // Build the resolved command: replace bare "oma" with absolute path
    const resolvedCommand =
      spec.command[0] === "oma"
        ? [absOma, ...spec.command.slice(1)]
        : spec.command;

    const jobLine = `${spec.cron} ${resolvedCommand.join(" ")} # oma:${spec.label}`;

    const rawCrontab = readCrontab();
    const { before, block, after } = parseCrontab(rawCrontab);

    // Replace any existing line for this label (idempotent)
    const filteredBlock = block.filter(
      (line) => extractLabel(line) !== spec.label,
    );
    filteredBlock.push(jobLine);

    const newContent = assembleCrontab(before, filteredBlock, after);
    writeCrontab(newContent);
  }

  async remove(label: string): Promise<void> {
    const rawCrontab = readCrontab();
    const { before, block, after } = parseCrontab(rawCrontab);

    const filteredBlock = block.filter((line) => extractLabel(line) !== label);

    const newContent = assembleCrontab(before, filteredBlock, after);
    writeCrontab(newContent);
  }

  async listLabels(): Promise<string[]> {
    const rawCrontab = readCrontab();
    const { block } = parseCrontab(rawCrontab);

    const labels: string[] = [];
    for (const line of block) {
      const label = extractLabel(line);
      if (label) labels.push(label);
    }
    return labels;
  }
}
