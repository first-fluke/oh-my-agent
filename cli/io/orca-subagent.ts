import { randomUUID } from "node:crypto";
import fs from "node:fs";

const REFRESH_MS = 2_000;
const REQUEST_TIMEOUT_MS = 750;

// These are parent adapters, not restrictions on the spawned vendor. Orca
// 1.4.201 only maintains child rosters for these two hook sources. Sending a
// different parent's events through /hook/codex would relabel its state.
const PARENT_HOOK_SOURCES: Readonly<Record<string, string>> = {
  claude: "claude",
  codex: "codex",
};

function readEndpoint(endpointPath: string): Record<string, string> {
  const values: Record<string, string> = {};
  try {
    for (const line of fs.readFileSync(endpointPath, "utf8").split(/\r?\n/)) {
      const match = /^(?:set\s+|export\s+)?(ORCA_AGENT_HOOK_\w+)=(.*)$/i.exec(
        line.trim(),
      );
      if (match?.[1] && match[2] !== undefined) values[match[1]] = match[2];
    }
  } catch {
    // Orca is optional, including while its endpoint is unavailable.
  }
  return values;
}

export interface OrcaSubagent {
  childEnv: NodeJS.ProcessEnv;
  start(): void;
  stop(): Promise<void>;
}

/** Prefer the generic host protocol, with legacy Claude/Codex compatibility. */
export function createOrcaSubagent(
  runtimeVendor: string,
  agentId: string,
  vendor: string,
  childEnv: NodeJS.ProcessEnv,
  parentEnv: NodeJS.ProcessEnv = process.env,
): OrcaSubagent | undefined {
  const parent = { ...parentEnv };
  const source = Object.hasOwn(PARENT_HOOK_SOURCES, runtimeVendor)
    ? PARENT_HOOK_SOURCES[runtimeVendor]
    : undefined;
  const endpointPath = parent.ORCA_AGENT_HOOK_ENDPOINT;
  if (
    parent.OMA_ORCA_SUBAGENTS === "0" ||
    !parent.ORCA_PANE_KEY ||
    !parent.ORCA_TAB_ID ||
    !endpointPath
  )
    return undefined;
  const generic = readEndpoint(endpointPath).ORCA_AGENT_HOOK_SUBAGENTS === "1";
  if (!generic && !source) return undefined;

  // The runner owns the parent's hook identity. An external CLI must not send
  // SessionStart/Stop for the parent pane or inherit its hook credentials.
  const isolatedEnv = { ...childEnv };
  for (const key of Object.keys(isolatedEnv)) {
    if (
      key.startsWith("ORCA_AGENT_HOOK_") ||
      ["ORCA_PANE_KEY", "ORCA_TAB_ID", "ORCA_AGENT_LAUNCH_TOKEN"].includes(key)
    )
      delete isolatedEnv[key];
  }
  const id = `oma-${randomUUID()}`;
  let timer: ReturnType<typeof setInterval> | undefined;
  let pending: Promise<void> = Promise.resolve();
  let busy = false;
  let started = false;
  let stopped = false;
  let stopPromise: Promise<void> | undefined;

  const send = async (event: "SubagentStart" | "SubagentStop") => {
    try {
      // Re-read on every send: Orca rotates its port/token after a restart.
      // Parse data only; never source an endpoint file as shell code.
      const values = readEndpoint(endpointPath);
      if (generic && values.ORCA_AGENT_HOOK_SUBAGENTS !== "1") return;
      const port = values.ORCA_AGENT_HOOK_PORT;
      const token = values.ORCA_AGENT_HOOK_TOKEN;
      if (
        !port ||
        !/^\d{1,5}$/.test(port) ||
        +port < 1 ||
        +port > 65535 ||
        !token
      )
        return;
      // Only the local listener is supported; never forward credentials to a URL from disk.
      const response = await fetch(
        `http://127.0.0.1:${port}/hook/${generic ? "subagent" : source}`,
        {
          method: "POST",
          redirect: "error",
          signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
          headers: {
            "Content-Type": "application/json",
            "X-Orca-Agent-Hook-Token": token,
          },
          body: JSON.stringify({
            paneKey: parent.ORCA_PANE_KEY,
            tabId: parent.ORCA_TAB_ID,
            worktreeId: parent.ORCA_WORKTREE_ID,
            launchToken: parent.ORCA_AGENT_LAUNCH_TOKEN ?? "",
            env: values.ORCA_AGENT_HOOK_ENV,
            version: values.ORCA_AGENT_HOOK_VERSION,
            payload: generic
              ? {
                  action: event === "SubagentStart" ? "start" : "stop",
                  id,
                  parentType: runtimeVendor,
                  agentType: `${vendor}:${agentId}`.slice(0, 64),
                }
              : {
                  hook_event_name: event,
                  agent_id: id,
                  agent_type: `${vendor}:${agentId}`.slice(0, 64),
                },
          }),
        },
      );
      await response.body?.cancel();
    } catch {
      // Status reporting must not fail or delay the agent task indefinitely.
    }
  };

  const refresh = () => {
    if (busy || stopped) return;
    busy = true;
    pending = send("SubagentStart").finally(() => {
      busy = false;
    });
  };

  return {
    childEnv: isolatedEnv,
    start() {
      if (started || stopped) return;
      started = true;
      refresh();
      // Parent Stop can clear hook-only children. Reassert this runner's own
      // live child, also recovering from Orca restarts without writing rollouts.
      timer = setInterval(refresh, REFRESH_MS);
      timer.unref();
    },
    stop() {
      if (stopPromise) return stopPromise;
      stopped = true;
      if (timer) clearInterval(timer);
      // Serialize Stop after in-flight Start so a late response cannot resurrect a row.
      stopPromise = pending.then(() =>
        started ? send("SubagentStop") : undefined,
      );
      return stopPromise;
    },
  };
}
