import { execFileSync } from "node:child_process";
import { readFileSync, realpathSync, rmSync } from "node:fs";
import { resolve } from "node:path";
import { atomicWriteFileSync } from "../utils/safe-write.js";

export interface ProcessIdentity {
  pid: number;
  ppid: number;
  started: string;
  command: string;
}
export interface ExternalResourceIdentity {
  provider: string;
  id: string;
}
export interface SubagentProcessMetadata {
  runId?: string;
  sessionId?: string;
  generatedPaths?: string[];
  isolatedProcessGroup?: boolean;
  externalResources?: ExternalResourceIdentity[];
}
export interface SubagentProcessRecord {
  schemaVersion: 1;
  root: string;
  runnerPid: number;
  process: ProcessIdentity;
  processGroupId?: number;
  runId?: string;
  sessionId?: string;
  generatedPaths?: string[];
  externalResources?: ExternalResourceIdentity[];
}
const validPid = (pid: number) => Number.isSafeInteger(pid) && pid > 1;
const canonicalRoot = (root: string) => {
  try {
    return realpathSync(root);
  } catch {
    return resolve(root);
  }
};

/** ps is unavailable on some platforms; absence of identity means preserve. */
export function readProcessIdentity(pid: number): ProcessIdentity | undefined {
  if (!validPid(pid)) return undefined;
  try {
    if (process.platform === "win32") {
      const output = execFileSync(
        "powershell.exe",
        [
          "-NoProfile",
          "-NonInteractive",
          "-Command",
          `$p = Get-CimInstance Win32_Process -Filter 'ProcessId = ${pid}'; if ($p) { @{pid=$p.ProcessId;ppid=$p.ParentProcessId;started=$p.CreationDate.ToUniversalTime().ToString('o');command=$p.CommandLine} | ConvertTo-Json -Compress }`,
        ],
        {
          encoding: "utf8",
          timeout: 1000,
          stdio: ["ignore", "pipe", "ignore"],
        },
      );
      const identity = JSON.parse(output) as ProcessIdentity;
      return identity.pid === pid &&
        validPid(identity.ppid) &&
        typeof identity.started === "string" &&
        typeof identity.command === "string"
        ? identity
        : undefined;
    }
    const output = execFileSync(
      "ps",
      ["-p", String(pid), "-o", "pid=,ppid=,lstart=,command="],
      { encoding: "utf8", timeout: 1000, stdio: ["ignore", "pipe", "ignore"] },
    );
    const match =
      /^\s*(\d+)\s+(\d+)\s+(\w{3}\s+\w{3}\s+\d+\s+[\d:]+\s+\d{4})\s+([^\r\n]+)\s*$/.exec(
        output,
      );
    if (!match || Number(match[1]) !== pid || !match[3] || !match[4])
      return undefined;
    return {
      pid,
      ppid: Number(match[2]),
      started: match[3].replace(/\s+/g, " "),
      command: match[4].trim(),
    };
  } catch {
    return undefined;
  }
}

export function processIsAlive(pid: number): boolean {
  if (!validPid(pid)) return false;
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    return (error as NodeJS.ErrnoException).code !== "ESRCH";
  }
}

export function recordSubagentProcess(
  pidFile: string,
  pid: number,
  root: string,
  metadata: SubagentProcessMetadata = {},
): SubagentProcessRecord | undefined {
  // Remove an older identity first, including when the new child exits too fast
  // to inspect or the platform cannot supply a trustworthy process snapshot.
  forgetSubagentProcess(pidFile);
  const identity = readProcessIdentity(pid);
  if (!identity || identity.ppid !== process.pid) return;
  const record: SubagentProcessRecord = {
    schemaVersion: 1,
    root: canonicalRoot(root),
    runnerPid: process.pid,
    process: identity,
    runId: metadata.runId,
    sessionId: metadata.sessionId,
    generatedPaths: metadata.generatedPaths?.map((file) => resolve(file)),
    externalResources: metadata.externalResources?.map(({ provider, id }) => ({
      provider,
      id,
    })),
  };
  if (metadata.isolatedProcessGroup && process.platform !== "win32") {
    try {
      const group = Number(
        execFileSync("ps", ["-p", String(pid), "-o", "pgid="], {
          encoding: "utf8",
          timeout: 1000,
          stdio: ["ignore", "pipe", "ignore"],
        }).trim(),
      );
      if (group === pid) record.processGroupId = group;
    } catch {
      /* A missing group identity permits only verified PID cancellation. */
    }
  }
  try {
    atomicWriteFileSync(`${pidFile}.json`, `${JSON.stringify(record)}\n`, {
      mode: 0o600,
    });
    if (
      metadata.runId ||
      metadata.generatedPaths ||
      metadata.externalResources
    ) {
      // This evidence survives removal of active-process ownership metadata.
      // Raw argv may contain prompts or credentials; never retain it here.
      const { command: _command, ...processEvidence } = record.process;
      atomicWriteFileSync(
        `${pidFile}.resources.json`,
        `${JSON.stringify({ ...record, process: processEvidence })}\n`,
        { mode: 0o600 },
      );
    }
  } catch {
    /* A metadata failure must not strand an already-started child. */
  }
  return record;
}

export function readSubagentProcessRecord(
  pidFile: string,
  root: string,
): SubagentProcessRecord | undefined {
  try {
    const record = JSON.parse(
      readFileSync(`${pidFile}.json`, "utf8"),
    ) as SubagentProcessRecord;
    return record.schemaVersion === 1 &&
      record.root === canonicalRoot(root) &&
      validPid(record.runnerPid) &&
      validPid(record.process?.pid) &&
      typeof record.process.started === "string" &&
      typeof record.process.command === "string"
      ? record
      : undefined;
  } catch {
    return undefined;
  }
}

export function forgetSubagentProcess(pidFile: string): void {
  try {
    rmSync(`${pidFile}.json`, { force: true });
  } catch {
    /* Best effort. */
  }
}

/** Only a recorded child from this project whose supervisor died is reapable. */
export function isOwnedOrphan(
  pidFile: string,
  pid: number,
  root: string,
): boolean {
  if (!validPid(pid)) return false;
  try {
    const record: SubagentProcessRecord = JSON.parse(
      readFileSync(`${pidFile}.json`, "utf8"),
    );
    if (
      record.schemaVersion !== 1 ||
      record.root !== canonicalRoot(root) ||
      !validPid(record.runnerPid) ||
      record.process?.pid !== pid ||
      processIsAlive(record.runnerPid)
    )
      return false;
    const current = readProcessIdentity(pid);
    return (
      !!current &&
      current.ppid === 1 &&
      current.started === record.process.started &&
      current.command === record.process.command
    );
  } catch {
    return false;
  }
}
