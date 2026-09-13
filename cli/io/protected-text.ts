import { CODEX_TEXT_BRIDGE } from "./protected-codex.js";
import { stageCodexConfigHome } from "./protected-codex-home.js";
import { ConfigError } from "./runtime-dispatch/config-error.js";
import { resolveAgentPlan } from "./runtime-dispatch/resolve-plan.js";
import type { Invocation } from "./runtime-dispatch.js";

export interface ProtectedTextCapability {
  supported: boolean;
  profile?: "claude-text-v1" | "codex-app-server-text-v1";
  reason?: string;
}

/** Capability describes an implemented profile; runtime/protocol failure is fatal. */
export function getProtectedTextCapability(
  vendor: string,
): ProtectedTextCapability {
  if (vendor === "claude")
    return { supported: true, profile: "claude-text-v1" };
  if (vendor === "codex")
    return { supported: true, profile: "codex-app-server-text-v1" };
  return {
    supported: false,
    reason: `Protected text dispatch is unavailable for ${vendor}: no verified tool-free transport is implemented.`,
  };
}

export interface ProtectedTextInvocation extends Invocation {
  input?: string;
  outputKind: "text" | "vendor-envelope";
  protectedProfile: NonNullable<ProtectedTextCapability["profile"]>;
}

/** Prepare per-call native state; the caller must always run cleanup. */
export function prepareProtectedTextWorkspace<
  T extends Invocation & { protectedProfile?: string },
>(invocation: T): { invocation: T; cleanup: () => void } {
  if (invocation.protectedProfile !== "codex-app-server-text-v1") {
    return { invocation, cleanup: () => {} };
  }
  const staged = stageCodexConfigHome(invocation.env);
  return {
    invocation: { ...invocation, env: staged.env },
    cleanup: staged.cleanup,
  };
}

function selectedArgs(args: string[], flags: string[]): string[] {
  const selected: string[] = [];
  for (let index = 0; index < args.length; index++) {
    if (flags.includes(args[index] as string) && args[index + 1]) {
      selected.push(args[index] as string, args[++index] as string);
    }
  }
  return selected;
}

/** Preserve per-agent effort even when the protected runtime uses a fresh cwd. */
export function resolveProtectedTextEffort(
  agentId: string,
): string | undefined {
  try {
    return resolveAgentPlan(agentId).effort;
  } catch (error) {
    if (error instanceof ConfigError) return undefined;
    throw error;
  }
}

/** Rebuild from permitted model settings; never forward personas, hooks, or tool flags. */
export function protectTextInvocation(
  invocation: Invocation,
  vendor: string,
  prompt: string,
  timeoutMs = 120_000,
  effort?: string,
): ProtectedTextInvocation {
  const capability = getProtectedTextCapability(vendor);
  if (!capability.supported || !capability.profile)
    throw new Error(capability.reason);
  const env: NodeJS.ProcessEnv = { ...invocation.env, OMA_NO_AGENTMEMORY: "1" };
  if (capability.profile === "claude-text-v1") {
    return {
      command: invocation.command,
      args: [
        "--print",
        ...selectedArgs(invocation.args, [
          "--model",
          "--effort",
          "--fallback-model",
        ]),
        "--safe-mode",
        "--restricted",
        "--strict-mcp-config",
        "--mcp-config",
        '{"mcpServers":{}}',
        "--disable-slash-commands",
        "--tools",
        "",
        "--no-session-persistence",
        "--output-format",
        "json",
      ],
      env: { ...env, CLAUDE_CODE_SAFE_MODE: "1" },
      input: prompt,
      outputKind: "vendor-envelope",
      protectedProfile: capability.profile,
    };
  }
  const modelArgs = selectedArgs(invocation.args, ["--model", "-m"]);
  const model = modelArgs.at(-1);
  // Prevent inherited JavaScript startup injection in the constant bridge and CLI
  // launcher. Workspace preparation references native config/auth in a fresh
  // CODEX_HOME before execution; no credential bytes are read or copied.
  delete env.NODE_OPTIONS;
  delete env.BUN_OPTIONS;
  return {
    command: process.execPath,
    args: ["--eval", CODEX_TEXT_BRIDGE],
    env,
    input: JSON.stringify({
      command: invocation.command,
      model,
      effort,
      prompt,
      timeoutMs,
    }),
    outputKind: "text",
    protectedProfile: capability.profile,
  };
}
