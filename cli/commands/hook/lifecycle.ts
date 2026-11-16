import { resolveProjectRoot } from "../../../.agents/hooks/core/fs-utils.js";
import {
  recordSubagentStart,
  recordSubagentStop,
} from "../../../.agents/hooks/core/open-subagents.js";
import { isLifecycleHookEvent } from "../../platform/hooks-composer/lifecycle.js";
import { emitEvent, getActiveSid, readIndex } from "../../state/events.js";
import type { HookRequest } from "./types.js";

/** Observe native child activity without treating a child stop as parent completion. */
export function recordLifecycleHook(req: HookRequest): boolean {
  if (!isLifecycleHookEvent(req.vendor, req.nativeEvent)) return false;
  let payload: Record<string, unknown>;
  try {
    const parsed: unknown = JSON.parse(req.rawStdin);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed))
      return true;
    payload = parsed as Record<string, unknown>;
  } catch {
    return true;
  }
  const projectRoot = resolveProjectRoot(
    typeof payload.cwd === "string" ? payload.cwd : req.cwd,
  );
  const text = (camel: string, snake: string): string | undefined => {
    const value = payload[camel] ?? payload[snake];
    return typeof value === "string" ? value : undefined;
  };
  const started = req.nativeEvent.toLowerCase().endsWith("start");
  const agentId = text("agentId", "agent_id");
  // The open-subagent record does not depend on an active OMA session: the
  // commit guard reads it in any host session.
  if (agentId) {
    try {
      if (started) {
        recordSubagentStart(projectRoot, {
          agentId,
          agentType: text("agentType", "agent_type") ?? "subagent",
          vendorSid: req.sid ?? text("sessionId", "session_id"),
        });
      } else {
        recordSubagentStop(projectRoot, agentId);
      }
    } catch {
      // Observation only: a failed record must not fail the host's hook.
    }
  }
  const sid = getActiveSid(readIndex(projectRoot));
  if (!sid) return true;
  emitEvent(projectRoot, sid, {
    kind: started ? "subagent.started" : "subagent.stopped",
    vendor: req.vendor,
    vendorSid: req.sid ?? text("sessionId", "session_id"),
    payload: {
      nativeEvent: req.nativeEvent,
      agentId,
      agentType: text("agentType", "agent_type"),
      agentName: text("agentName", "agent_name"),
      parentAgentId: text("parentAgentId", "parent_agent_id"),
    },
  });
  return true;
}
