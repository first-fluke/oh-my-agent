import { resolveProjectRoot } from "../../../.agents/hooks/core/fs-utils.js";
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
  const sid = getActiveSid(readIndex(projectRoot));
  if (!sid) return true;
  const text = (camel: string, snake: string): string | undefined => {
    const value = payload[camel] ?? payload[snake];
    return typeof value === "string" ? value : undefined;
  };
  emitEvent(projectRoot, sid, {
    kind: req.nativeEvent.toLowerCase().endsWith("start")
      ? "subagent.started"
      : "subagent.stopped",
    vendor: req.vendor,
    vendorSid: req.sid ?? text("sessionId", "session_id"),
    payload: {
      nativeEvent: req.nativeEvent,
      agentId: text("agentId", "agent_id"),
      agentType: text("agentType", "agent_type"),
      agentName: text("agentName", "agent_name"),
      parentAgentId: text("parentAgentId", "parent_agent_id"),
    },
  });
  return true;
}
