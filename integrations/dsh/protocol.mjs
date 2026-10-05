import { isDeepStrictEqual } from "node:util";

const aliases = {
  bash: "Bash",
  read: "Read",
  write: "Write",
  edit: "Edit",
  grep: "Grep",
  glob: "Glob",
};

export function hookPayload(event, agent, execution, result) {
  const payload = {
    cwd: agent.session.header.cwd,
    session_id: agent.id ?? agent.session.header.id,
    hook_event_name: event,
  };
  if (execution) {
    payload.tool_name = Object.hasOwn(aliases, execution.name)
      ? aliases[execution.name]
      : execution.name;
    payload.tool_input = execution.arguments;
    payload.tool_use_id = execution.callId;
  }
  if (result) {
    payload.tool_response = result.isError
      ? { isError: true, error: result.error, content: result.content }
      : { isError: false, value: result.value, content: result.content };
  }
  if (event === "Stop") payload.stop_hook_active = false;
  return payload;
}

export function decodeOutput(stdout, event) {
  if (!stdout.trim()) return {};
  const output = JSON.parse(stdout);
  if (!output || typeof output !== "object" || Array.isArray(output)) {
    throw new Error("OMA hook returned a non-object response");
  }
  const specific = output.hookSpecificOutput ?? {};
  if (typeof specific !== "object" || Array.isArray(specific)) {
    throw new Error("OMA hook returned invalid hookSpecificOutput");
  }
  if (specific.hookEventName && specific.hookEventName !== event) {
    throw new Error("OMA hook response names a different event");
  }
  return output;
}

export function hookContext(output) {
  return [
    output.additionalContext,
    output.hookSpecificOutput?.additionalContext,
    output.systemMessage,
  ]
    .filter((value) => typeof value === "string" && value.trim())
    .join("\n\n");
}

export function preDecision(output, argumentsValue) {
  const specific = output.hookSpecificOutput ?? {};
  const reason = [specific.permissionDecisionReason, output.reason].find(
    (value) => typeof value === "string" && value.trim(),
  );
  if (
    specific.permissionDecision === "deny" ||
    output.decision === "block" ||
    output.continue === false
  ) {
    return { kind: "deny", reason: reason || "Blocked by an OMA hook." };
  }
  const updatedInput = Object.hasOwn(specific, "updatedInput")
    ? specific.updatedInput
    : output.updatedInput;
  if (
    updatedInput !== undefined &&
    !isDeepStrictEqual(updatedInput, argumentsValue)
  ) {
    return {
      kind: "deny",
      reason: `OMA requested changed tool input. DSH 0.2.0-rc.2 freezes arguments before hooks; retry the tool with this required input: ${JSON.stringify(updatedInput)}`,
    };
  }
  if (specific.permissionDecision === "ask") {
    return { kind: "ask", ...(reason ? { reason } : {}) };
  }
  return undefined;
}

export function stopReason(output) {
  if (output.decision === "block" || output.continue === false) {
    return typeof output.reason === "string" && output.reason.trim()
      ? output.reason
      : "An OMA stop hook requires follow-up work.";
  }
  return undefined;
}

export function postContext(output) {
  return [hookContext(output), stopReason(output)].filter(Boolean).join("\n\n");
}
