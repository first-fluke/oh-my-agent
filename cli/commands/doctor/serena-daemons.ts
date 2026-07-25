import {
  DAEMON_IDLE_GRACE_MS,
  type DaemonRecord,
  pruneRegistry,
  readRegistry,
} from "../bridge/daemon.js";

/**
 * Doctor view of the shared serena daemon fleet (`oma bridge`).
 *
 * Diagnostic-only, with one deliberate exception: registrations whose process
 * is already dead are pruned while collecting — reporting a stale record as a
 * running daemon would be a lie, and pruning is exactly what the next bridge
 * start would do anyway.
 */

export interface SerenaDaemonSummary {
  root: string;
  context: string;
  port: number;
  pid: number;
  /** Clients whose process is still alive right now. */
  liveClients: number;
  /** Minutes since the last client detached; undefined while clients remain. */
  idleMinutes?: number;
  /** True when past the idle grace — the next bridge start will reclaim it. */
  pendingReclaim: boolean;
}

export interface SerenaDaemonDoctorCheck {
  daemons: SerenaDaemonSummary[];
  /** Registrations whose daemon process was found dead and removed. */
  prunedCount: number;
  issues: string[];
}

function isAlive(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

function summarize(record: DaemonRecord, nowMs: number): SerenaDaemonSummary {
  const liveClients = (record.clients ?? []).filter(isAlive).length;

  let idleMinutes: number | undefined;
  let pendingReclaim = false;
  if (liveClients === 0 && record.idleSince) {
    const idleMs = nowMs - Date.parse(record.idleSince);
    if (!Number.isNaN(idleMs)) {
      idleMinutes = Math.max(0, Math.floor(idleMs / 60_000));
      pendingReclaim = idleMs >= DAEMON_IDLE_GRACE_MS;
    }
  }

  return {
    root: record.root,
    context: record.context,
    port: record.port,
    pid: record.pid,
    liveClients,
    idleMinutes,
    pendingReclaim,
  };
}

export function collectSerenaDaemonCheck(
  nowMs = Date.now(),
): SerenaDaemonDoctorCheck {
  const prunedCount = pruneRegistry().length;

  const daemons = Object.values(readRegistry()).map((record) =>
    summarize(record, nowMs),
  );

  const issues: string[] = [];
  const overdue = daemons.filter((daemon) => daemon.pendingReclaim);
  if (overdue.length > 0) {
    // Informational rather than actionable-by-hand: reclamation is automatic
    // on the next bridge start, but a machine where no session ever starts
    // again would keep these alive, so doctor surfaces them.
    issues.push(
      `${overdue.length} idle serena daemon(s) past the reclaim grace — freed on the next session start, or kill the pid to free now`,
    );
  }

  return { daemons, prunedCount, issues };
}
