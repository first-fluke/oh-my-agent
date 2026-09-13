import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  getProtectedTextCapability,
  type ProtectedTextInvocation,
  prepareProtectedTextWorkspace,
  protectTextInvocation,
  resolveProtectedTextEffort,
} from "../../../io/protected-text.js";
import { type Invocation, planDispatch } from "../../../io/runtime-dispatch.js";
import {
  resolvePromptFlag,
  resolveVendor,
} from "../../../platform/agent-config.js";
import { evalDispatchTimeoutMs } from "../eval/dispatch.js";
import { redactEvolutionText } from "./evolution-memory.js";

export function evolutionErrorMessage(error: unknown): string {
  // child_process error.message can contain the entire prompt/argv.
  const value = error as { status?: number; code?: string; stderr?: unknown };
  if (
    value &&
    (value.status !== undefined ||
      value.code !== undefined ||
      value.stderr !== undefined)
  ) {
    return `Evolution subprocess failed (exit ${value.status ?? "unknown"}, code ${value.code ?? "unknown"}).`;
  }
  return redactEvolutionText(
    error instanceof Error ? error.message : String(error),
  ).slice(0, 500);
}

/** Compile supplied evidence through the vendor's protected text capability. */
export function protectEvolutionInvocation(
  invocation: Invocation,
  vendor: string,
  prompt: string,
  effort?: string,
): ProtectedTextInvocation {
  return protectTextInvocation(
    invocation,
    vendor,
    prompt,
    evalDispatchTimeoutMs(),
    effort,
  );
}

export function readEvolutionOutput(output: string): string {
  const trimmed = output.trim();
  if (!trimmed.startsWith("{")) return output;
  let envelope: Record<string, unknown>;
  try {
    envelope = JSON.parse(trimmed);
  } catch {
    return output;
  }
  if (envelope.is_error === true)
    throw new Error("Evolution provider returned an error response.");
  return typeof envelope.result === "string" ? envelope.result : output;
}

export function runEvolutionPrompt(prompt: string): string {
  const { vendor, config } = resolveVendor("opt-agent");
  const capability = getProtectedTextCapability(vendor);
  if (!capability.supported) throw new Error(capability.reason);
  const vendorConfig = config?.vendors?.[vendor] ?? {};
  const plan = planDispatch(
    "opt-agent",
    vendor,
    vendorConfig,
    resolvePromptFlag(vendor, vendorConfig.prompt_flag),
    prompt,
    process.env,
    { readOnly: true },
  );
  const invocation = protectEvolutionInvocation(
    plan.invocation,
    vendor,
    prompt,
    resolveProtectedTextEffort("opt-agent"),
  );
  const cwd = mkdtempSync(join(tmpdir(), "oma-evolution-"));
  let cleanup = () => {};
  try {
    const prepared = prepareProtectedTextWorkspace(invocation);
    cleanup = prepared.cleanup;
    const output = execFileSync(
      prepared.invocation.command,
      prepared.invocation.args,
      {
        cwd,
        env: prepared.invocation.env,
        encoding: "utf-8",
        input: invocation.input,
        stdio: ["pipe", "pipe", "pipe"],
        timeout: evalDispatchTimeoutMs() + 1_000,
        maxBuffer: 16 * 1024 * 1024,
      },
    );
    const text = typeof output === "string" ? output : "";
    return invocation.outputKind === "text" ? text : readEvolutionOutput(text);
  } finally {
    cleanup();
    rmSync(cwd, { recursive: true, force: true });
  }
}
