import { randomUUID } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { loadOmaConfig } from "../utils/config.js";

export interface ExecutionOptions {
  timeoutSeconds?: string | number;
  deadline?: string;
}

export type ExecutionStopReason = "cancelled" | "timed_out";
interface ExecutionEvent {
  schemaVersion: 1;
  executionId: string;
  sessionId: string;
  root: string;
  startedAt: number;
  deadline?: number;
  reason?: ExecutionStopReason;
  exitCode?: number;
  resources?: Array<{ kind: string; id: string }>;
}

export class ExecutionStoppedError extends Error {
  constructor(
    public readonly reason: ExecutionStopReason,
    public readonly exitCode: number,
  ) {
    super(`[session-execution] Execution ${reason}`);
  }
}

const executions = new Map<string, Set<SessionExecution>>();

function canonicalPath(value: string): string {
  try {
    return fs.realpathSync(value);
  } catch {
    return path.resolve(value);
  }
}

function executionStatePath(root: string, sessionId: string): string {
  return path.join(
    canonicalPath(root),
    ".agents",
    "state",
    "executions",
    `${encodeURIComponent(sessionId)}.jsonl`,
  );
}

/** Read-only status lookup also covers a supervisor that died at its deadline. */
export function sessionExecutionStopStatus(
  root: string,
  sessionId: string,
): ExecutionStopReason | undefined {
  const events = readEvents(executionStatePath(root, sessionId));
  const stopped = events.find((event) => event.reason);
  if (stopped?.reason) return stopped.reason;
  return events.some(
    (event) => event.deadline !== undefined && event.deadline <= Date.now(),
  )
    ? "timed_out"
    : undefined;
}

function readEvents(file: string): ExecutionEvent[] {
  if (!fs.existsSync(file)) return [];
  if (fs.lstatSync(file).isSymbolicLink())
    throw new Error(
      "[session-execution] Execution ledger must not be a symlink",
    );
  const events = fs
    .readFileSync(file, "utf8")
    .split("\n")
    .filter(Boolean)
    .map((line) => {
      let event: ExecutionEvent;
      try {
        event = JSON.parse(line) as ExecutionEvent;
      } catch {
        throw new Error(
          "[session-execution] Invalid persisted execution ledger JSON",
        );
      }
      if (
        event?.schemaVersion !== 1 ||
        typeof event.executionId !== "string" ||
        !/^[0-9a-f-]{36}$/.test(event.executionId) ||
        typeof event.sessionId !== "string" ||
        typeof event.root !== "string" ||
        !path.isAbsolute(event.root) ||
        executionStatePath(event.root, event.sessionId) !==
          canonicalPath(file) ||
        !Number.isFinite(event.startedAt) ||
        (event.deadline !== undefined && !Number.isFinite(event.deadline)) ||
        (event.reason !== undefined &&
          !["cancelled", "timed_out"].includes(event.reason))
      )
        throw new Error(
          "[session-execution] Invalid persisted execution state",
        );
      return event;
    });
  const header = events[0];
  if (
    !header ||
    events.some(
      (event) =>
        event.executionId !== header.executionId ||
        event.sessionId !== header.sessionId ||
        event.root !== header.root,
    )
  )
    throw new Error("[session-execution] Invalid or foreign execution ledger");
  return events;
}

function deadlineValue(value: string, label: string): number {
  if (
    !/^\d{4}-\d\d-\d\dT.*(?:Z|[+-]\d\d:\d\d)$/.test(value) ||
    !Number.isFinite(Date.parse(value))
  )
    throw new Error(
      `[session-execution] ${label} must be an ISO timestamp with a timezone`,
    );
  return Date.parse(value);
}

function executionLimit(
  timeout: unknown,
  timestamp: unknown,
): { duration?: number; absolute?: number } {
  if (timeout !== undefined && timestamp !== undefined)
    throw new Error(
      "[session-execution] Choose timeout_seconds or deadline, not both",
    );
  if (
    timeout !== undefined &&
    typeof timeout !== "number" &&
    typeof timeout !== "string"
  )
    throw new Error(
      "[session-execution] timeout_seconds must be a positive finite number",
    );
  if (timestamp !== undefined && typeof timestamp !== "string")
    throw new Error(
      "[session-execution] deadline must be an ISO timestamp with a timezone",
    );
  const duration = timeout === undefined ? undefined : Number(timeout);
  if (duration !== undefined && (!Number.isFinite(duration) || duration <= 0))
    throw new Error(
      "[session-execution] timeout_seconds must be a positive finite number",
    );
  return {
    duration,
    absolute:
      typeof timestamp === "string"
        ? deadlineValue(timestamp, "deadline")
        : undefined,
  };
}

/** Append-only constraints prevent concurrent retries from extending a session. */
export class SessionExecution {
  readonly stateFile: string;
  private executionId: string;
  private readonly sessionId: string;
  private readonly root: string;
  private deadlineMs?: number;
  get deadline(): number | undefined {
    return this.deadlineMs;
  }
  private timer?: ReturnType<typeof setTimeout>;
  private watchers: fs.FSWatcher[] = [];
  private listeners = new Set<(error: ExecutionStoppedError) => void>();
  private stopped?: ExecutionStoppedError;
  private readonly abortController = new AbortController();
  get signal(): AbortSignal {
    return this.abortController.signal;
  }
  private readonly stateFiles: string[];

  constructor(
    sessionId: string,
    root: string,
    options: ExecutionOptions = {},
    env: NodeJS.ProcessEnv = process.env,
  ) {
    const enteredAt = Date.now();
    this.root = canonicalPath(root);
    this.sessionId = sessionId;
    this.stateFile = executionStatePath(this.root, sessionId);
    const inheritedFile = env.OMA_EXECUTION_STATE
      ? path.resolve(env.OMA_EXECUTION_STATE)
      : undefined;
    if (inheritedFile && !env.OMA_EXECUTION_ID)
      throw new Error(
        "[session-execution] Inherited execution ledger requires OMA_EXECUTION_ID",
      );
    const inheritedEvents = inheritedFile ? readEvents(inheritedFile) : [];
    if (
      inheritedFile &&
      (!inheritedEvents[0] ||
        inheritedEvents[0].executionId !== env.OMA_EXECUTION_ID)
    )
      throw new Error(
        "[session-execution] Inherited execution ledger has a foreign execution identity",
      );
    this.stateFiles = [
      ...new Set([this.stateFile, ...(inheritedFile ? [inheritedFile] : [])]),
    ];
    let events = this.stateFiles.flatMap(readEvents);
    const localHeader = readEvents(this.stateFile)[0];
    if (
      localHeader &&
      inheritedEvents[0] &&
      localHeader.executionId !== inheritedEvents[0].executionId
    )
      throw new Error(
        "[session-execution] Session belongs to a different execution",
      );
    this.executionId =
      localHeader?.executionId ??
      inheritedEvents[0]?.executionId ??
      randomUUID();
    const config = loadOmaConfig(root) as {
      session?: { execution?: { timeout_seconds?: number; deadline?: string } };
    } | null;
    const configured = config?.session?.execution ?? {};
    if (
      config?.session?.execution !== undefined &&
      (configured === null ||
        typeof configured !== "object" ||
        (configured.timeout_seconds === undefined &&
          configured.deadline === undefined))
    )
      throw new Error(
        "[session-execution] execution requires timeout_seconds or deadline",
      );
    const limits = [
      executionLimit(configured.timeout_seconds, configured.deadline),
      executionLimit(options.timeoutSeconds, options.deadline),
    ];
    if (!localHeader) {
      fs.mkdirSync(path.dirname(this.stateFile), { recursive: true });
      let fd: number | undefined;
      try {
        fd = fs.openSync(this.stateFile, "wx", 0o600);
        fs.writeFileSync(
          fd,
          `${JSON.stringify({ schemaVersion: 1, executionId: this.executionId, sessionId, root: this.root, startedAt: events.length ? Math.min(...events.map((event) => event.startedAt)) : enteredAt })}\n`,
        );
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code !== "EEXIST") throw error;
      } finally {
        if (fd !== undefined) fs.closeSync(fd);
      }
      const established = readEvents(this.stateFile)[0];
      if (
        !established ||
        (inheritedEvents[0] && established.executionId !== this.executionId)
      )
        throw new Error(
          "[session-execution] Concurrent session has a foreign execution identity",
        );
      this.executionId = established.executionId;
      events = this.stateFiles.flatMap(readEvents);
    }
    const startedAt = events.length
      ? Math.min(...events.map((event) => event.startedAt))
      : Date.now();
    const requested = limits.flatMap((limit) =>
      limit.absolute !== undefined
        ? [limit.absolute]
        : limit.duration !== undefined
          ? [startedAt + limit.duration * 1000]
          : [],
    );
    if (
      requested.some(
        (deadline) =>
          !Number.isFinite(deadline) || Math.abs(deadline) > 8.64e15,
      )
    )
      throw new Error(
        "[session-execution] Deadline is outside the supported timestamp range",
      );
    const inherited = env.OMA_EXECUTION_DEADLINE
      ? deadlineValue(env.OMA_EXECUTION_DEADLINE, "OMA_EXECUTION_DEADLINE")
      : undefined;
    const deadlines = [
      ...events.map((event) => event.deadline),
      ...requested,
      inherited,
    ].filter((value): value is number => value !== undefined);
    this.deadlineMs = deadlines.length ? Math.min(...deadlines) : undefined;
    if (
      this.deadline !== undefined &&
      !events.some((event) => event.deadline === this.deadline)
    )
      this.append({ startedAt, deadline: this.deadline });
    this.assertActive();
    if (this.deadline !== undefined) this.scheduleDeadline();
    for (const file of this.stateFiles) {
      const peers = executions.get(file) ?? new Set<SessionExecution>();
      for (const peer of peers) {
        try {
          peer.assertActive();
        } catch {
          /* The peer's stop listener handles shutdown. */
        }
      }
      peers.add(this);
      executions.set(file, peers);
    }
    // Watch existing ledgers instead of polling. Admission also re-reads them.
    if (typeof fs.watch === "function") {
      for (const file of this.stateFiles) {
        if (!fs.existsSync(file)) continue;
        const watcher = fs.watch(file, { persistent: false }, () => {
          try {
            this.assertActive();
          } catch (error) {
            if (error instanceof ExecutionStoppedError) this.notify(error);
            else this.stop("cancelled", 1);
          }
        });
        watcher.on("error", () => this.stop("cancelled", 1));
        this.watchers.push(watcher);
      }
    }
  }

  private append(
    event: Omit<
      ExecutionEvent,
      "schemaVersion" | "executionId" | "sessionId" | "root"
    >,
  ): void {
    fs.mkdirSync(path.dirname(this.stateFile), { recursive: true });
    fs.appendFileSync(
      this.stateFile,
      `${JSON.stringify({ ...event, schemaVersion: 1, executionId: this.executionId, sessionId: this.sessionId, root: this.root })}\n`,
      {
        mode: 0o600,
      },
    );
  }

  private scheduleDeadline(): void {
    const remaining = (this.deadline ?? 0) - Date.now();
    this.timer = setTimeout(
      () => {
        if ((this.deadline ?? 0) > Date.now()) this.scheduleDeadline();
        else this.stop("timed_out", 124);
      },
      Math.max(0, Math.min(remaining, 2_147_483_647)),
    );
    this.timer.unref();
  }

  private notify(error: ExecutionStoppedError): void {
    if (this.stopped) return;
    this.stopped = error;
    this.abortController.abort(error);
    if (this.timer) clearTimeout(this.timer);
    for (const listener of this.listeners) listener(error);
  }

  assertActive(): void {
    if (this.stopped) throw this.stopped;
    const events = this.stateFiles.flatMap(readEvents);
    const stopped = events.find((event) => event.reason);
    if (stopped?.reason) {
      const error = new ExecutionStoppedError(
        stopped.reason,
        stopped.exitCode ?? (stopped.reason === "timed_out" ? 124 : 130),
      );
      this.stop(error.reason, error.exitCode);
      throw error;
    }
    const deadlines = events
      .map((event) => event.deadline)
      .filter((value): value is number => value !== undefined);
    if (this.deadline !== undefined) deadlines.push(this.deadline);
    const earliest = deadlines.length ? Math.min(...deadlines) : undefined;
    if (earliest !== undefined && earliest !== this.deadlineMs) {
      this.deadlineMs = earliest;
      if (this.timer) clearTimeout(this.timer);
      this.scheduleDeadline();
    }
    if (earliest !== undefined && earliest <= Date.now()) {
      this.stop("timed_out", 124);
      throw this.stopped;
    }
  }

  stop(reason: ExecutionStopReason, exitCode: number): void {
    if (this.stopped) return;
    try {
      this.append({ startedAt: Date.now(), reason, exitCode });
    } catch (error) {
      console.error(
        `[session-execution] Could not persist stop: ${String(error)}`,
      );
    }
    this.notify(new ExecutionStoppedError(reason, exitCode));
    for (const file of this.stateFiles) {
      for (const peer of executions.get(file) ?? []) {
        if (peer === this) continue;
        try {
          peer.assertActive();
        } catch {
          /* Stop listeners own shutdown. */
        }
      }
    }
  }

  onStop(listener: (error: ExecutionStoppedError) => void): () => void {
    this.listeners.add(listener);
    if (this.stopped) listener(this.stopped);
    return () => this.listeners.delete(listener);
  }

  recordResources(resources: Array<{ kind: string; id: string }>): void {
    this.append({ startedAt: Date.now(), resources });
  }

  childEnv(base: NodeJS.ProcessEnv = process.env): NodeJS.ProcessEnv {
    this.assertActive();
    return {
      ...base,
      OMA_EXECUTION_STATE: this.stateFile,
      OMA_EXECUTION_ID: this.executionId,
      ...(this.deadline === undefined
        ? {}
        : { OMA_EXECUTION_DEADLINE: new Date(this.deadline).toISOString() }),
    };
  }

  async wait<T>(promise: Promise<T>): Promise<T> {
    this.assertActive();
    let unsubscribe = () => {};
    try {
      return await Promise.race([
        promise,
        new Promise<never>((_, reject) => {
          unsubscribe = this.onStop(reject);
        }),
      ]);
    } finally {
      unsubscribe();
    }
  }

  dispose(): void {
    if (this.timer) clearTimeout(this.timer);
    for (const watcher of this.watchers) watcher.close();
    this.listeners.clear();
    for (const file of this.stateFiles) {
      const peers = executions.get(file);
      peers?.delete(this);
      if (!peers?.size) executions.delete(file);
    }
  }
}
