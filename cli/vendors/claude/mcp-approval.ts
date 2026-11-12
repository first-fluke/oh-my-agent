/**
 * Claude Code `.mcp.json` approval state for the oma-managed code-intelligence
 * server.
 *
 * Claude Code asks before it starts a project server from `.mcp.json` ("N new
 * MCP servers found in this project — select any you wish to enable") and
 * stores the answer in `<project>/.claude/settings.local.json`:
 * `enabledMcpjsonServers` for the selected servers, `disabledMcpjsonServers`
 * for the rest. Dismissing that dialog with Esc rejects EVERY pending server,
 * and a rejection outranks any approval, so one keypress on the first launch
 * after `oma install` leaves serena off for good (`claude mcp list` shows
 * "Rejected (see disabledMcpjsonServers in settings)").
 *
 * oma still steers the agent to that server — the primer, and the
 * code-intelligence guard that denies native Grep/Glob — so a rejected
 * provider strands code search. Choosing the provider in `oma-config`
 * (`providers.code_intelligence`) is the user's consent to run it, so link
 * moves it from the rejected list to the approved one. Other `.mcp.json`
 * servers stay the user's decision; to opt out of the provider itself, change
 * `providers.code_intelligence` / `code_intelligence_guard` instead.
 *
 * Only an existing `settings.local.json` is edited: Claude Code creates that
 * file (and keeps it out of git) when it records an answer, and a rejection
 * can only live there.
 */

import { join } from "node:path";
import { readJsonForMerge } from "../../utils/merge-read.js";

/** `<project>/.claude/settings.local.json`, where Claude records the answer. */
export function claudeLocalSettingsPath(projectRoot: string): string {
  return join(projectRoot, ".claude", "settings.local.json");
}

/**
 * Claude Code accepts a bare server-name string for either list and coerces
 * it to a one-element array; anything else is not a list it reads.
 */
function serverList(value: unknown): string[] | undefined {
  if (Array.isArray(value)) {
    return value.filter((entry): entry is string => typeof entry === "string");
  }
  if (typeof value === "string") return [value];
  return undefined;
}

/**
 * Approve `server` in a parsed `.claude/settings.local.json`: drop it from
 * `disabledMcpjsonServers` and add it to `enabledMcpjsonServers` (unless
 * `enableAllProjectMcpServers` already approves every project server).
 * Mutates `settings`.
 */
export function approveClaudeMcpServer(
  settings: Record<string, unknown>,
  server: string,
): { changed: boolean; wasRejected: boolean } {
  let changed = false;
  let wasRejected = false;

  const disabled = serverList(settings.disabledMcpjsonServers);
  if (disabled?.includes(server)) {
    const rest = disabled.filter((name) => name !== server);
    if (rest.length > 0) settings.disabledMcpjsonServers = rest;
    else delete settings.disabledMcpjsonServers;
    changed = true;
    wasRejected = true;
  }

  if (settings.enableAllProjectMcpServers !== true) {
    const enabled = serverList(settings.enabledMcpjsonServers) ?? [];
    if (!enabled.includes(server)) {
      settings.enabledMcpjsonServers = [...enabled, server];
      changed = true;
    }
  }

  return { changed, wasRejected };
}

/**
 * Whether the project's local Claude settings reject `server`. `oma update`
 * uses it to reconcile even when the install is already current.
 */
export function isClaudeMcpServerRejected(
  projectRoot: string,
  server: string,
): boolean {
  const read = readJsonForMerge(claudeLocalSettingsPath(projectRoot));
  if (read.status !== "ok") return false;
  return (
    serverList(read.value.disabledMcpjsonServers)?.includes(server) ?? false
  );
}
