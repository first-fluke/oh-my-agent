import { execFileSync } from "node:child_process";
import { planDispatch } from "../../io/runtime-dispatch.js";
import type { VendorConfig } from "../../platform/agent-config.js";
import { resolvePromptFlag } from "../../platform/agent-config.js";
import type { HarnessDispatchFn } from "./types.js";

function runInvocation(
  invocation: { command: string; args: string[]; env: NodeJS.ProcessEnv },
  workspace: string,
  prompt: string,
  promptFlag: string | null,
  timeoutMs: number,
): string {
  let promptIndex = -1;
  if (promptFlag !== null) {
    for (let index = 0; index < invocation.args.length - 1; index += 1) {
      if (
        invocation.args[index] === promptFlag &&
        invocation.args[index + 1] === prompt
      ) {
        promptIndex = index + 1;
        break;
      }
    }
  }
  const viaStdin = promptIndex >= 0 && prompt.startsWith("-");
  const args = viaStdin
    ? invocation.args.filter((_, index) => index !== promptIndex)
    : invocation.args;
  try {
    const output = execFileSync(invocation.command, args, {
      cwd: workspace,
      env: invocation.env,
      encoding: "utf-8",
      input: viaStdin ? prompt : undefined,
      stdio: viaStdin ? ["pipe", "pipe", "pipe"] : ["ignore", "pipe", "pipe"],
      maxBuffer: 64 * 1024 * 1024,
      timeout: timeoutMs,
    });
    const text = typeof output === "string" ? output : "";
    let envelope: { is_error?: boolean; result?: string } | undefined;
    if (text.trim().startsWith("{")) {
      try {
        envelope = JSON.parse(text) as {
          is_error?: boolean;
          result?: string;
        };
      } catch {
        envelope = undefined;
      }
    }
    if (envelope?.is_error) {
      throw new Error(
        envelope.result ?? "Agent vendor returned an error envelope",
      );
    }
    return text;
  } catch (error) {
    const failure = error as {
      status?: number;
      stderr?: unknown;
      stdout?: unknown;
    };
    const stderr =
      typeof failure.stderr === "string"
        ? failure.stderr.replace(/\s+/g, " ").trim().slice(0, 300)
        : "";
    throw new Error(
      `Harness dispatch failed (exit ${failure.status ?? "?"})${stderr ? `: ${stderr}` : ""}`,
      { cause: error },
    );
  }
}

export function buildHarnessDispatch(
  agent: string,
  vendor: string,
  vendorConfig: VendorConfig,
  timeoutMs: number,
): HarnessDispatchFn {
  const promptFlag = resolvePromptFlag(vendor, vendorConfig.prompt_flag);
  return ({ prompt, workspace }) => {
    const dispatch = planDispatch(
      agent,
      vendor,
      vendorConfig,
      promptFlag,
      prompt,
      process.env,
      { readOnly: false, workspace },
    );
    return runInvocation(
      dispatch.invocation,
      workspace,
      prompt,
      promptFlag,
      timeoutMs,
    );
  };
}
