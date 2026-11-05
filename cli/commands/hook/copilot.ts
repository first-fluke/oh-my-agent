import { basename, dirname, resolve } from "node:path";
import type { Vendor as CoreVendor } from "../../../.agents/hooks/core/types.js";
import { shellQuote } from "../../platform/hooks-composer/hook-command.js";
import type { HandlerResult, HookInput, Vendor } from "./types.js";

/** Keep protected standalone core definitions behind the CLI runtime adapter. */
export function coreHookVendor(vendor: Vendor): CoreVendor {
  return vendor === "copilot" ? "claude" : vendor;
}

const TOOL_NAMES: Readonly<Record<string, string>> = {
  bash: "Bash",
  powershell: "Bash",
  view: "Read",
  create: "Write",
  edit: "Edit",
  str_replace_editor: "Edit",
  apply_patch: "Edit",
  grep: "Grep",
  rg: "Grep",
  glob: "Glob",
};

export function copilotToolName(name: string): string {
  return TOOL_NAMES[name] ?? name;
}

/** Core handler mutations reference Claude's wrapper path; Copilot owns its own. */
function copilotArguments(
  input: Record<string, unknown>,
): Record<string, unknown> {
  const updated = { ...input };
  if (typeof updated.command === "string") {
    let command = updated.command;
    const wrapper = process.env.OMA_HOOK_WRAPPER;
    // The invoked wrapper identifies the install that owns the script. It
    // also preserves custom hook directories and global ~/.copilot paths.
    const hookDir =
      wrapper && basename(wrapper) === "oma-hook.sh"
        ? dirname(resolve(wrapper))
        : undefined;
    if (hookDir) {
      command = command.replace(
        /(["'])(?:[^"'\r\n]*\/)?\.claude\/hooks\/((?:oma\/)?filter-test-output\.sh)\1/g,
        (_match, _quote: string, suffix: string) =>
          shellQuote(`${hookDir}/${suffix}`),
      );
    }
    updated.command = command.replaceAll(
      ".claude/hooks/",
      hookDir ? `${shellQuote(hookDir)}/` : ".github/hooks/",
    );
  }
  return updated;
}

/** Config-file prompt-submission hooks have no consumed output channel. */
export function renderCopilotHookResult(
  result: HandlerResult,
  kind: HookInput["kind"],
  nativeEvent: string,
): string {
  if (result.type === "context") {
    return kind === "post_tool" ||
      nativeEvent === "SessionStart" ||
      nativeEvent === "sessionStart"
      ? JSON.stringify({ additionalContext: result.additionalContext })
      : "";
  }
  if (result.type === "mutate") {
    return kind === "pre_tool"
      ? JSON.stringify({ modifiedArgs: copilotArguments(result.updatedInput) })
      : "";
  }
  if (kind === "pre_tool") {
    return JSON.stringify({
      permissionDecision: "deny",
      permissionDecisionReason: result.reason,
    });
  }
  if (kind === "post_tool") {
    return JSON.stringify({ additionalContext: result.reason });
  }
  return JSON.stringify({ decision: "block", reason: result.reason });
}
