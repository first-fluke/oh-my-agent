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
interface SubagentProcessRecord {
  schemaVersion: 1;
  root: string;
  runnerPid: number;
  process: ProcessIdentity;
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
): void {
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
  };
  try {
    atomicWriteFileSync(`${pidFile}.json`, `${JSON.stringify(record)}\n`);
  } catch {
    /* A metadata failure must not strand an already-started child. */
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
