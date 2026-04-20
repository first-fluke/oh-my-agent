import { tmpdir } from "node:os";
import path from "node:path";
import { formatSessionId, getSessionMeta } from "../../io/memory.js";

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
