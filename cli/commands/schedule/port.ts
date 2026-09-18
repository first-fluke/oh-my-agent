/**
 * schedule/port.ts
 *
 * SchedulerPort interface + adapter selection.
 *
 * Adapter priority: darwin→Launchd; linux→Systemd (if --user bus available) else Crontab;
 * win32→Schtasks; other→Crontab fallback.
 * S1 implements LaunchdAdapter; S2 adds SystemdAdapter, CrontabAdapter, SchtasksAdapter.
 *
 * Per docs/plans/contracts/schedule-scheduler-port.md §2
 */

// ---------------------------------------------------------------------------
// Shared spec type
// ---------------------------------------------------------------------------

export interface ScheduledJobSpec {
  /** manifest job.id */
  id: string;
  /** 5-field cron expression */
  cron: string;
  /** argv for the OS job — always ["oma","schedule","run","<id>"] */
  command: string[];
  /** osJobLabel */
  label: string;
  /** absolute path used as cwd when the OS fires the job */
  workspace: string;
}

// ---------------------------------------------------------------------------
// Port interface
// ---------------------------------------------------------------------------

export interface SchedulerPort {
  /** Register (or idempotently update) a job in the OS scheduler. */
  upsert(spec: ScheduledJobSpec): Promise<void>;
  /** Remove a job from the OS scheduler by its OS label. No-op if absent. */
  remove(label: string): Promise<void>;
  /** Return the set of oma-managed OS labels currently registered. */
  listLabels(): Promise<string[]>;
  /** True iff this adapter can run on the current host. */
  isAvailable(): Promise<boolean>;
  /**
   * Return the argv the OS scheduler currently has registered for a label
   * (absolute binary first), or null when the job is absent or unreadable.
   * Optional: adapters that cannot read their registration back omit it and
   * stale detection is skipped for them.
   */
  readCommand?(label: string): Promise<string[] | null>;
}

/** The logical argv every OS registration must carry for a manifest job. */
export function expectedScheduleCommand(id: string): string[] {
  return ["oma", "schedule", "run", id];
}

/**
 * True when an OS registration exists but its command tail no longer matches
 * what the current CLI accepts (e.g. a pre-rename `schedule:run <id>`
 * registration). The binary path (argv[0]) is machine-specific and ignored.
 */
export function isStaleScheduleCommand(
  registered: string[] | null | undefined,
  id: string,
): boolean {
  if (!registered) return false;
  const expectedTail = expectedScheduleCommand(id).slice(1);
  const tail = registered.slice(1);
  return (
    tail.length !== expectedTail.length ||
    tail.some((arg, i) => arg !== expectedTail[i])
  );
}

// ---------------------------------------------------------------------------
// Adapter selection
// ---------------------------------------------------------------------------

/**
 * Returns the best available SchedulerPort for the current host.
 *
 * Priority:
 *   darwin  → LaunchdAdapter
 *   linux   → SystemdAdapter (if --user bus available) else CrontabAdapter
 *   win32   → SchtasksAdapter
 *   other   → CrontabAdapter (POSIX fallback)
 *
 * If no adapter is available on this host, throws a clear error.
 */
export async function selectAdapter(): Promise<SchedulerPort> {
  // macOS: launchd is always available
  if (process.platform === "darwin") {
    const { LaunchdAdapter } = await import("./adapters/launchd.js");
    return new LaunchdAdapter();
  }

  // Windows: schtasks
  if (process.platform === "win32") {
    const { SchtasksAdapter } = await import("./adapters/schtasks.js");
    return new SchtasksAdapter();
  }

  // Linux: prefer systemd --user, fall back to crontab
  if (process.platform === "linux") {
    const { SystemdAdapter } = await import("./adapters/systemd.js");
    const systemd = new SystemdAdapter();
    if (await systemd.isAvailable()) return systemd;

    const { CrontabAdapter } = await import("./adapters/crontab.js");
    const crontab = new CrontabAdapter();
    if (await crontab.isAvailable()) return crontab;

    throw new Error(
      "No supported scheduler backend found on this Linux host. " +
        "Neither systemd --user nor crontab is available.",
    );
  }

  // Other POSIX platforms: crontab fallback
  const { CrontabAdapter } = await import("./adapters/crontab.js");
  const crontab = new CrontabAdapter();
  if (await crontab.isAvailable()) return crontab;

  throw new Error(
    "No supported scheduler backend found on this host. " +
      "Supported: macOS (launchd), Linux (systemd --user / crontab), Windows (schtasks).",
  );
}
