import { lstatSync, readFileSync, unlinkSync } from "node:fs";

export const SERENA_LOCK_STALE_MS = 60_000;

/** Keep in-progress PID writes held and reclaim abandoned empty locks. */
export function isSerenaLockActive(path: string): boolean {
  try {
    const previous = lstatSync(path);
    if (!previous.isFile()) throw new Error("Invalid Serena lock file");
    const content = readFileSync(path, "utf8");
    if (content.trim() === "") {
      // Exclusive creation precedes the PID write; a fresh empty file is held.
      if (Date.now() - previous.mtimeMs <= SERENA_LOCK_STALE_MS) return true;
      const current = lstatSync(path);
      if (
        !current.isFile() ||
        current.dev !== previous.dev ||
        current.ino !== previous.ino ||
        current.mtimeMs !== previous.mtimeMs ||
        current.ctimeMs !== previous.ctimeMs ||
        readFileSync(path, "utf8") !== content
      )
        return true;
      unlinkSync(path);
      return false;
    }
    const pid = Number(content);
    if (!Number.isSafeInteger(pid) || pid <= 0)
      throw new Error("Invalid process ID");
    try {
      process.kill(pid, 0);
      return true;
    } catch (error) {
      return (error as NodeJS.ErrnoException).code !== "ESRCH";
    }
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return false;
    throw error;
  }
}
