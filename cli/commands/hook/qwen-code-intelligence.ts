import { createHash } from "node:crypto";
import { mkdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import {
  detectCodeIntelligenceProvider,
  primerContext,
} from "../../../.agents/hooks/core/code-intelligence-primer.js";
import { atomicWriteFileSync } from "../../utils/safe-write.js";
import { isRecord } from "../../utils/type-guards.js";
import type {
  HandlerCtx,
  HandlerResult,
  HookInput,
  HookRequest,
} from "./types.js";

interface State {
  primed?: boolean;
  used?: boolean;
  failed?: boolean;
  redirected?: boolean;
}

const FALLBACK =
  "Serena failed in this session. Use native tools for the remaining work. Do not retry failed or timed-out Serena calls in this session.";
const DISCOVERY =
  'If Serena tools are deferred, call tool_search with query "select:mcp__serena__initial_instructions,mcp__serena__find_symbol,mcp__serena__search_for_pattern,mcp__serena__find_file". Call the loaded tools on the following turn; tool_search only loads their schemas. Read initial_instructions once unless already provided, then use Serena for code discovery.';
const REDIRECT = `${DISCOVERY} If Serena is unavailable or times out, use native tools and report that fallback. This reminder interrupts native search only once per session/agent; retrying native search remains possible.`;

function readState(path: string | undefined): State {
  if (!path) return {};
  try {
    const data: unknown = JSON.parse(readFileSync(path, "utf8"));
    if (!isRecord(data)) return {};
    return {
      primed: data.primed === true,
      used: data.used === true,
      failed: data.failed === true,
      redirected: data.redirected === true,
    };
  } catch {
    return {};
  }
}

function saveState(path: string | undefined, state: State): boolean {
  if (!path) return false;
  try {
    mkdirSync(dirname(path), { recursive: true });
    atomicWriteFileSync(path, JSON.stringify(state));
    return true;
  } catch {
    return false;
  }
}

/** Restrict intervention to recognizable native search, leaving file reads,
 * verification commands and explicitly documentation-only queries alone.
 */
function isNativeCodeSearch(input: HookInput): boolean {
  if (input.kind !== "pre_tool") return false;
  const { toolName, toolInput } = input;
  if (toolName === "grep_search" || toolName === "glob") {
    const scope =
      toolInput.include ??
      toolInput.glob ??
      (toolName === "glob" ? toolInput.pattern : undefined);
    if (typeof scope === "string" && /\.(?:md|mdx|txt|rst)$/.test(scope))
      return false;
    return true;
  }
  if (toolName !== "run_shell_command" || typeof toolInput.command !== "string")
    return false;
  const command = toolInput.command.trim();
  // Deliberately do not try to parse arbitrary shell programs or wrappers.
  if (!/^(?:rg|grep|find)(?:\s|$)/.test(command)) return false;
  if (/\s--(?:help|version)(?:\s|$)/.test(command)) return false;
  if (/\.(?:md|mdx|txt|rst)["']?\s*$/.test(command)) return false;
  return true;
}

/** Bind native metadata without extending the shared .agents hook ABI. */
export function qwenCodeIntelligenceHandler(req: HookRequest) {
  let payload: Record<string, unknown> = {};
  try {
    const parsed: unknown = JSON.parse(req.rawStdin);
    if (isRecord(parsed)) payload = parsed;
  } catch {
    /* Dispatch rejects malformed JSON before running handlers. */
  }

  return async (
    input: HookInput,
    ctx: HandlerCtx,
  ): Promise<HandlerResult | null> => {
    const provider = detectCodeIntelligenceProvider(ctx.cwd);
    if (!provider) return null;
    const sid =
      typeof payload.session_id === "string" ? payload.session_id : ctx.sid;
    const agentId =
      typeof payload.agent_id === "string" ? payload.agent_id : "parent";
    // Never deduplicate unrelated sessions under a shared "unknown" key.
    const key =
      sid && sid !== "unknown"
        ? createHash("sha256")
            .update(JSON.stringify([sid, agentId]))
            .digest("hex")
        : undefined;
    const path = key
      ? join(ctx.cwd, ".agents/state/qwen-code-intelligence", `${key}.json`)
      : undefined;
    const state = readState(path);
    const context = (additionalContext: string): HandlerResult => ({
      type: "context",
      additionalContext,
    });

    if (input.kind === "prompt") {
      const lifecycle =
        req.nativeEvent === "SessionStart" ||
        req.nativeEvent === "SubagentStart";
      if (!lifecycle && state.primed) return null;
      state.primed = true;
      saveState(path, state);
      return context(
        [
          primerContext(provider),
          provider === "serena" ? (state.failed ? FALLBACK : DISCOVERY) : "",
        ]
          .filter(Boolean)
          .join("\n"),
      );
    }

    if (provider !== "serena") return null;
    if (
      input.kind === "post_tool" &&
      /^mcp__serena__.+$/.test(input.toolName)
    ) {
      const response = input.toolResponse;
      const failed =
        req.nativeEvent === "PostToolUseFailure" ||
        response?.isError === true ||
        !!response?.error;
      if (failed) state.failed = true;
      else state.used = true;
      saveState(path, state);
      return failed ? context(FALLBACK) : null;
    }

    if (
      isNativeCodeSearch(input) &&
      !state.used &&
      !state.failed &&
      !state.redirected
    ) {
      state.redirected = true;
      // Persist before denying: a missing identity or unwritable state must
      // never trap the model in repeated denials. No implicit permission allow.
      if (saveState(path, state)) return { type: "block", reason: REDIRECT };
    }
    return null;
  };
}
