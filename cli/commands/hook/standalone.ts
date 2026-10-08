import { resolveProjectRoot } from "../../../.agents/hooks/core/fs-utils.js";
import {
  makeBlockOutput,
  makePostToolBlockOutput,
  makePreToolDenyOutput,
  makePreToolOutput,
  makePromptOutput,
} from "../../../.agents/hooks/core/hook-output.js";
import {
  isStandaloneHookScript,
  STANDALONE_HOOK_SCRIPTS,
  STANDALONE_HOOK_VENDORS,
} from "../../constants/standalone-hooks.js";
import { withSelectedHookMemory } from "../../state/hook-memory.js";
import {
  extractSessionId,
  nativeEventToKind,
  normalizeInput,
} from "./adapters.js";
import { HANDLER_REGISTRY, runChain } from "./dispatch.js";
import { resolveHookConfig } from "./hook-config.js";
import type {
  HandlerCtx,
  HookInput,
  HookRequest,
  HookResponse,
} from "./types.js";

export type StandaloneHookRequest = Omit<
  HookRequest,
  "nativeEvent" | "vendor"
> & {
  vendor: HookRequest["vendor"] | "opencode";
  script: string;
  nativeEvent?: string;
};

const DEFAULT_EVENTS: Record<HookInput["kind"], string> = {
  prompt: "UserPromptSubmit",
  pre_tool: "PreToolUse",
  post_tool: "PostToolUse",
  stop: "Stop",
};

/** Single allowlisted handler for bridges that still invoke Bun script files. */
export async function runStandaloneHookScript(
  req: StandaloneHookRequest,
): Promise<HookResponse> {
  const { vendor, script, rawStdin } = req;
  if (
    !STANDALONE_HOOK_VENDORS.some((candidate) => candidate === vendor) ||
    !isStandaloneHookScript(script)
  ) {
    return { output: "" };
  }
  // OpenCode's existing bridge consumes the Claude JSON dialect. Its vendor
  // identity is outside the protected core Vendor enum.
  const handlerVendor = vendor === "opencode" ? "claude" : vendor;

  let payload: Record<string, unknown>;
  try {
    const parsed: unknown = JSON.parse(rawStdin);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return { output: "" };
    }
    payload = parsed as Record<string, unknown>;
  } catch {
    return { output: "" };
  }

  const kinds: readonly HookInput["kind"][] = STANDALONE_HOOK_SCRIPTS[script];
  const toolCall = payload.toolCall as { name?: unknown } | undefined;
  const defaultKind =
    kinds.includes("post_tool") && kinds.includes("stop")
      ? typeof payload.tool_name === "string" ||
        typeof toolCall?.name === "string"
        ? "post_tool"
        : "stop"
      : kinds[0];
  if (!defaultKind) return { output: "" };
  const suppliedEvent =
    req.nativeEvent ?? payload.hook_event_name ?? payload.hookEventName;
  const nativeEvent =
    typeof suppliedEvent === "string"
      ? suppliedEvent
      : vendor === "antigravity" && defaultKind === "prompt"
        ? "PreInvocation"
        : DEFAULT_EVENTS[defaultKind];
  const kind = nativeEventToKind(handlerVendor, nativeEvent);
  if (!kind || !kinds.includes(kind)) return { output: "" };

  const input = normalizeInput(handlerVendor, nativeEvent, rawStdin);
  if (!input) return { output: "" };
  const projectRoot = resolveProjectRoot(input.cwd || req.cwd);
  const { config, memory } = resolveHookConfig(projectRoot);
  const ctx: HandlerCtx = {
    vendor: handlerVendor,
    cwd: projectRoot,
    sid: req.sid ?? extractSessionId(handlerVendor, rawStdin),
    ...(config ? { config } : {}),
  };
  const id = script.slice(0, -3);
  const run = HANDLER_REGISTRY[id];
  if (!run) return { output: "" };
  const result = await withSelectedHookMemory(
    projectRoot,
    () =>
      runChain(
        [{ id, run, timeoutMs: kind === "stop" ? 30_000 : 5_000 }],
        input,
        ctx,
      ),
    memory,
  );

  if (!result) {
    return {
      output: vendor === "antigravity" && kind === "post_tool" ? "{}" : "",
    };
  }
  switch (result.type) {
    case "context":
      return {
        output: makePromptOutput(
          handlerVendor,
          result.additionalContext,
          kind === "post_tool" ? nativeEvent : "UserPromptSubmit",
        ),
      };
    case "mutate":
      return { output: makePreToolOutput(handlerVendor, result.updatedInput) };
    case "block":
      return {
        output:
          kind === "pre_tool"
            ? makePreToolDenyOutput(
                // pi's checked-in tool_call bridge reads hookSpecificOutput.
                handlerVendor === "pi" ? "claude" : handlerVendor,
                result.reason,
              )
            : kind === "post_tool"
              ? makePostToolBlockOutput(handlerVendor, result.reason)
              : makeBlockOutput(handlerVendor, result.reason),
      };
  }
}
