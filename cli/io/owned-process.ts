import { type ChildProcess, execFile, execFileSync } from "node:child_process";
import {
  type ProcessIdentity,
  processIsAlive,
  readProcessIdentity,
  type SubagentProcessRecord,
} from "./subagent-process.js";

export interface OwnedProcessStopResult {
  stopped: boolean;
  survivingPids: number[];
  survivingResources: string[];
  limitations: string[];
}

interface GroupMember {
  pid: number;
  ppid: number;
  started: string;
  executable: string;
  group: number;
  state: string;
}

/** POSIX detached children own a process group; Windows uses taskkill /T. */
export function ownedProcessSpawnOptions(): {
  detached: boolean;
  windowsHide: true;
} {
  return { detached: process.platform !== "win32", windowsHide: true };
}

function sameIdentity(a: ProcessIdentity, b: ProcessIdentity): boolean {
  return a.pid === b.pid && a.started === b.started && a.command === b.command;
}

function sameGroupMember(a: GroupMember, b: GroupMember): boolean {
  return (
    a.pid === b.pid &&
    a.group === b.group &&
    a.started === b.started &&
    a.executable === b.executable
  );
}

function readGroup(
  group: number,
  onError?: (reason: string) => void,
  candidates?: number[],
): GroupMember[] | undefined {
  try {
    const output = execFileSync(
      "ps",
      [
        ...(candidates ? ["-p", candidates.join(",")] : ["-A"]),
        "-o",
        "pid=,ppid=,pgid=,stat=,lstart=,comm=",
      ],
      {
        encoding: "utf8",
        timeout: 1000,
        maxBuffer: 4 * 1024 * 1024,
        stdio: ["ignore", "pipe", "ignore"],
      },
    );
    return output.split("\n").flatMap((line): GroupMember[] => {
      const match =
        /^\s*(\d+)\s+(\d+)\s+(\d+)\s+(\S+)\s+(\w{3}\s+\w{3}\s+\d+\s+[\d:]+\s+\d{4})\s+(.+)$/.exec(
          line,
        );
      if (
        !match ||
        Number(match[3]) !== group ||
        !match[4] ||
        !match[5] ||
        !match[6] ||
        match[4].startsWith("Z")
      )
        return [];
      return [
        {
          pid: Number(match[1]),
          ppid: Number(match[2]),
          group,
          state: match[4],
          started: match[5].replace(/\s+/g, " "),
          executable: match[6].trim(),
        },
      ];
    });
  } catch (error) {
    const failure = error as NodeJS.ErrnoException & {
      signal?: unknown;
      status?: unknown;
    };
    const field = (value: unknown) =>
      typeof value === "number"
        ? String(value)
        : typeof value === "string" && /^[A-Z0-9_]+$/.test(value)
          ? value
          : "unknown";
    onError?.(
      `ps snapshot failed (code=${field(failure.code)}, signal=${field(failure.signal)}, status=${field(failure.status)}).`,
    );
    return undefined;
  }
}

/** Undefined means inspection failed, so persisted ownership must be retained. */
export function ownedProcessHasLiveMembers(
  record: SubagentProcessRecord,
): boolean | undefined {
  if (process.platform === "win32") {
    return processIsAlive(record.process.pid) ? true : undefined;
  }
  if (record.processGroupId === record.process.pid) {
    const members = readGroup(record.processGroupId);
    return members ? members.length > 0 : undefined;
  }
  return processIsAlive(record.process.pid);
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function boundedMs(value: number | undefined): number {
  return Math.min(
    5000,
    Math.max(
      0,
      typeof value === "number" && Number.isFinite(value) ? value : 1000,
    ),
  );
}

function signal(pid: number, value: NodeJS.Signals): string | undefined {
  try {
    process.kill(pid, value);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ESRCH") return String(error);
  }
  return undefined;
}

function taskkill(pid: number, force: boolean): Promise<string | undefined> {
  return new Promise((resolve) => {
    execFile(
      "taskkill.exe",
      ["/PID", String(pid), "/T", ...(force ? ["/F"] : [])],
      { timeout: 1000, windowsHide: true },
      (error) => resolve(error ? String(error) : undefined),
    );
  });
}

/** Only for a captured ChildProcess whose identity could not be read at launch. */
export async function stopUnidentifiedOwnedChild(
  child: ChildProcess,
  options: { graceMs?: number; killWaitMs?: number } = {},
): Promise<OwnedProcessStopResult> {
  const limitations = [
    "Process identity unavailable; only the captured child handle was stopped. Descendant termination is unverified.",
  ];
  let exited = child.exitCode != null || child.signalCode != null;
  let wake: (() => void) | undefined;
  const onExit = () => {
    exited = true;
    wake?.();
  };
  child.once("exit", onExit);
  const waitForExit = async (ms: number) => {
    if (exited) return;
    await new Promise<void>((resolve) => {
      const timer = setTimeout(() => {
        wake = undefined;
        resolve();
      }, boundedMs(ms));
      wake = () => {
        clearTimeout(timer);
        wake = undefined;
        resolve();
      };
      if (exited) wake();
    });
  };
  try {
    if (!exited) {
      try {
        child.kill("SIGTERM");
      } catch (error) {
        limitations.push(String(error));
      }
      await waitForExit(options.graceMs ?? 1000);
    }
    if (!exited) {
      try {
        child.kill("SIGKILL");
      } catch (error) {
        limitations.push(String(error));
      }
      await waitForExit(options.killWaitMs ?? 1000);
    }
  } finally {
    child.removeListener("exit", onExit);
  }
  const pid = child.pid;
  const survivingPids = !exited && pid ? [pid] : [];
  return {
    stopped: false,
    survivingPids,
    survivingResources: [
      ...survivingPids.map((value) => `process:${value}`),
      ...(pid ? [`process-tree:${pid}`] : []),
    ],
    limitations,
  };
}

/** Stop computation only. Generated files and external resources remain intact. */
export async function stopOwnedProcess(
  record: SubagentProcessRecord,
  options: { graceMs?: number; killWaitMs?: number } = {},
): Promise<OwnedProcessStopResult> {
  const limitations: string[] = [];
  const uncertainResources: string[] = [];
  const external =
    record.externalResources?.map(
      (resource) => `${resource.provider}:${resource.id}`,
    ) ?? [];
  const result = (
    pids: number[],
    stopped = pids.length === 0,
  ): OwnedProcessStopResult => ({
    stopped,
    survivingPids: pids,
    survivingResources: [
      ...pids.map((pid) => `process:${pid}`),
      ...uncertainResources,
      ...external,
    ],
    limitations,
  });
  const pid = record.process.pid;
  if (!Number.isSafeInteger(pid) || pid <= 1 || pid === process.pid) {
    limitations.push("Invalid owned process identity; no signal sent.");
    return result([], false);
  }
  const graceMs = boundedMs(options.graceMs);
  const killWaitMs = boundedMs(options.killWaitMs);
  const current = readProcessIdentity(pid);
  const matches =
    !!current &&
    (sameIdentity(record.process, current) ||
      (record.runnerPid === process.pid &&
        current.ppid === process.pid &&
        current.started === record.process.started));
  const group = record.processGroupId;
  const isolatedGroup = process.platform !== "win32" && group === pid;

  if (isolatedGroup) {
    const inspect = () =>
      readGroup(group, (reason) => limitations.push(reason));
    const recoverInspection = async (
      known: GroupMember[],
      termSent: boolean,
    ) => {
      const candidates = [
        ...new Set([pid, ...known.map((member) => member.pid)]),
      ].slice(0, 64);
      const narrow = () =>
        readGroup(group, (reason) => limitations.push(reason), candidates);
      const owns = (member: GroupMember) =>
        known.some((saved) => sameGroupMember(saved, member)) ||
        (member.pid === pid &&
          member.started === record.process.started &&
          matches &&
          member.ppid === current?.ppid);
      // Census failure cannot abandon a leader whose identity is verified.
      // Before escalation, revalidate captured process identities and PGIDs.
      let verified = narrow();
      if (!termSent && (verified?.some(owns) || matches)) {
        const error = signal(-group, "SIGTERM");
        if (error) limitations.push(error);
        await delay(graceMs);
        verified = narrow();
      }
      if (verified?.some(owns)) {
        const error = signal(-group, "SIGKILL");
        if (error) limitations.push(error);
        await delay(killWaitMs);
      }
      const remaining = inspect();
      if (remaining) return result(remaining.map((member) => member.pid));
      uncertainResources.push(`process-group:${group}`);
      limitations.push(
        "Owned process group inspection unavailable after bounded shutdown; ownership retained.",
      );
      return result(
        narrow()
          ?.filter(owns)
          .map((member) => member.pid) ?? [],
        false,
      );
    };
    let members = inspect();
    if (!members) {
      limitations.push(
        "Cannot inspect the owned process group; termination is unverified.",
      );
      return recoverInspection([], false);
    }
    if (members.length === 0) return result([]);
    // Only the still-live creator may clean up its group after its leader exits.
    // An orphan reaper must first match the recorded leader identity.
    if (
      !matches &&
      !(record.runnerPid === process.pid && !processIsAlive(pid))
    ) {
      limitations.push(
        "Owned process identity changed; process group preserved.",
      );
      return result(
        members.map((member) => member.pid),
        false,
      );
    }
    let known = members;
    const termError = signal(-group, "SIGTERM");
    if (termError) limitations.push(termError);
    let until = Date.now() + graceMs;
    while (members.length > 0 && Date.now() < until) {
      await delay(Math.min(150, Math.max(1, until - Date.now())));
      const next = inspect();
      if (!next) {
        limitations.push("Cannot verify process group termination.");
        return recoverInspection(known, true);
      }
      if (
        next.length &&
        !next.some((member) =>
          known.some((saved) => sameGroupMember(saved, member)),
        )
      ) {
        limitations.push(
          "Process group ownership changed during graceful termination.",
        );
        return result(
          next.map((member) => member.pid),
          false,
        );
      }
      members = next;
      // Preserve identities of descendants created during graceful shutdown.
      known = [...known, ...members];
    }
    if (members.length === 0) return result([]);
    if (
      !members.some((member) =>
        known.some((saved) => sameGroupMember(saved, member)),
      )
    ) {
      limitations.push(
        "Process group ownership changed before forced termination.",
      );
      return result(
        members.map((member) => member.pid),
        false,
      );
    }
    const killError = signal(-group, "SIGKILL");
    if (killError) limitations.push(killError);
    until = Date.now() + killWaitMs;
    while (members.length > 0 && Date.now() < until) {
      await delay(Math.min(150, Math.max(1, until - Date.now())));
      const next = inspect();
      if (!next) {
        limitations.push("Cannot verify process group termination.");
        return recoverInspection(known, true);
      }
      members = next;
    }
    return result(members.map((member) => member.pid));
  }

  if (!matches) {
    if (!processIsAlive(pid)) return result([]);
    limitations.push(
      "Owned process identity unavailable or changed; process preserved.",
    );
    return result([pid], false);
  }
  if (process.platform === "win32") {
    // taskkill handles the tree, but CIM only verifies our recorded root. Report
    // this limit instead of asserting that detached descendants were observed.
    const error = await taskkill(pid, false);
    if (error) limitations.push(error);
    await delay(graceMs);
    const afterTerm = readProcessIdentity(pid);
    if (
      processIsAlive(pid) &&
      afterTerm &&
      sameIdentity(record.process, afterTerm)
    ) {
      const killError = await taskkill(pid, true);
      if (killError) limitations.push(killError);
      await delay(killWaitMs);
    }
    limitations.push(
      "Windows taskkill tree termination cannot verify detached descendants.",
    );
    const survivor = readProcessIdentity(pid);
    return result(
      processIsAlive(pid) && survivor && sameIdentity(record.process, survivor)
        ? [pid]
        : [],
      false,
    );
  }

  limitations.push(
    "No isolated process group recorded; only the owned PID can be stopped.",
  );
  const error = signal(pid, "SIGTERM");
  if (error) limitations.push(error);
  await delay(graceMs);
  const afterTerm = readProcessIdentity(pid);
  if (
    processIsAlive(pid) &&
    afterTerm &&
    sameIdentity(record.process, afterTerm)
  ) {
    const killError = signal(pid, "SIGKILL");
    if (killError) limitations.push(killError);
    await delay(killWaitMs);
  }
  const survivor = readProcessIdentity(pid);
  return result(
    processIsAlive(pid) && survivor && sameIdentity(record.process, survivor)
      ? [pid]
      : [],
  );
}
