// Subagents a host session has started and not yet stopped.
//
// The host reports SubagentStart and SubagentStop to `oma hook run`. Each open
// subagent is one file, so parallel starts and stops need no lock. The record
// is kept outside the session event log because a host session can run
// subagents without an active OMA workflow session.

import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { join } from "node:path";

const OPEN_SUBAGENTS_RELDIR = join(".agents", "state", "open-subagents");

/** A start without a stop is dropped after this long (host crash, lost event). */
export const OPEN_SUBAGENT_MAX_AGE_MS = 2 * 60 * 60 * 1000;

/** Claude Code's built-in agents that have no edit tools. */
const NON_EDITING_AGENT_TYPES = new Set(["Explore", "Plan"]);

export interface OpenSubagent {
  agentId: string;
  agentType: string;
  /** Host session that started the subagent, when the host reported one. */
  vendorSid?: string;
  startedAt: string;
}

function recordPath(projectDir: string, agentId: string): string {
  const name = agentId.replace(/[^A-Za-z0-9_.-]/g, "_").slice(0, 120);
  return join(projectDir, OPEN_SUBAGENTS_RELDIR, `${name || "_"}.json`);
}

export function recordSubagentStart(
  projectDir: string,
  subagent: Omit<OpenSubagent, "startedAt">,
  now: Date = new Date(),
): void {
  // Never seed `.agents/` in a directory that is not an OMA project: a stray
  // one would be resolved as a project root by later commands.
  if (!existsSync(join(projectDir, ".agents"))) return;
  mkdirSync(join(projectDir, OPEN_SUBAGENTS_RELDIR), { recursive: true });
  const record: OpenSubagent = { ...subagent, startedAt: now.toISOString() };
  writeFileSync(
    recordPath(projectDir, subagent.agentId),
    `${JSON.stringify(record)}\n`,
    { mode: 0o600 },
  );
}

export function recordSubagentStop(projectDir: string, agentId: string): void {
  rmSync(recordPath(projectDir, agentId), { force: true });
}

/**
 * Open subagents that can edit the working tree. Records of another host
 * session are skipped when both session ids are known; expired and unreadable
 * records are removed.
 */
export function listOpenSubagents(
  projectDir: string,
  vendorSid?: string,
  nowMs: number = Date.now(),
): OpenSubagent[] {
  const dir = join(projectDir, OPEN_SUBAGENTS_RELDIR);
  if (!existsSync(dir)) return [];
  const open: OpenSubagent[] = [];
  for (const entry of readdirSync(dir)) {
    if (!entry.endsWith(".json")) continue;
    const path = join(dir, entry);
    let record: OpenSubagent;
    try {
      record = JSON.parse(readFileSync(path, "utf-8")) as OpenSubagent;
    } catch {
      rmSync(path, { force: true });
      continue;
    }
    const age = nowMs - Date.parse(record.startedAt);
    if (!(age < OPEN_SUBAGENT_MAX_AGE_MS)) {
      rmSync(path, { force: true });
      continue;
    }
    if (vendorSid && record.vendorSid && record.vendorSid !== vendorSid)
      continue;
    if (NON_EDITING_AGENT_TYPES.has(record.agentType)) continue;
    open.push(record);
  }
  return open;
}
