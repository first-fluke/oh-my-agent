import { tmpdir } from "node:os";
import path from "node:path";
import { formatSessionId, getSessionMeta } from "../../io/memory.js";
import {
  type ExecutionOptions,
  SessionExecution,
} from "../../io/session-execution.js";
import { registerSignalCleanup } from "../../utils/process-signals.js";

/** Register cancellation before setup or dispatch can start. */
export function beginSessionExecution(
  sessionId: string,
  root: string,
  options: ExecutionOptions = {},
) {
  const execution = new SessionExecution(sessionId, root, options);
  const unregister = registerSignalCleanup(
    () => execution.stop("cancelled", 130),
    () => execution.stop("cancelled", 143),
  );
  const dispose = execution.dispose.bind(execution);
  execution.dispose = () => {
    unregister();
    dispose();
  };
  return execution;
}

export function isProcessRunning(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

export function resolveSessionId(): string {
  const meta = getSessionMeta(process.cwd());
  if (meta.id && meta.status !== "completed" && meta.status !== "failed") {
    return meta.id;
  }

  return formatSessionId(new Date());
}

export function buildTempFile(
  prefix: string,
  sessionId: string,
  suffix: string,
): string {
  return path.join(tmpdir(), `${prefix}-${sessionId}.${suffix}`);
}
