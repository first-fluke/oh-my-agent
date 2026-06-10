import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { sessionsDir } from "../../../state/events.js";
import { collectArchivedState } from "./sessions.js";
import type { InjectLogEntryRef, InjectLogView } from "./types.js";

/** Locate the inject-log dir for a sid, live first then archived (D52). */
function resolveInjectLogDir(projectDir: string, sid: string): string | null {
  const live = join(sessionsDir(projectDir), sid, "inject-log");
  if (existsSync(live)) return live;
  const archived = collectArchivedState(projectDir).sessions.find(
    (session) => session.sid === sid,
  );
  if (archived) {
    const dir = join(archived.archivePath, "inject-log");
    if (existsSync(dir)) return dir;
  }
  return null;
}

export function listInjectLogs(
  sid: string,
  projectDir = process.cwd(),
): InjectLogEntryRef[] {
  const dir = resolveInjectLogDir(projectDir, sid);
  if (!dir) return [];
  return readdirSync(dir)
    .filter((name) => name.endsWith(".md"))
    .sort()
    .map((file) => ({ file, path: join(dir, file) }));
}

export function viewInjectLog(
  sid: string,
  options: { entry?: string; projectDir?: string } = {},
): InjectLogView {
  const projectDir = options.projectDir ?? process.cwd();
  const dir = resolveInjectLogDir(projectDir, sid);
  const entries = listInjectLogs(sid, projectDir);
  if (!options.entry) return { sid, dir, entries };

  // Match by exact filename or the bare timestamp slug.
  const match = entries.find(
    (entry) =>
      entry.file === options.entry || entry.file === `${options.entry}.md`,
  );
  const content = match ? readFileSync(match.path, "utf-8") : undefined;
  return { sid, dir, entries, content };
}
