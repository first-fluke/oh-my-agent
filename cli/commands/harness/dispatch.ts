import { execFileSync } from "node:child_process";
import { planDispatch } from "../../io/runtime-dispatch.js";
import type { VendorConfig } from "../../platform/agent-config.js";
import { resolvePromptFlag } from "../../platform/agent-config.js";
import { buildHarnessEnvironment } from "./execution.js";
import type { HarnessDispatchFn } from "./types.js";

/** stderr kept per arm; enough to trace a failure without storing transcripts. */
export const HARNESS_STDERR_LIMIT = 8 * 1024;

export interface HarnessDispatchFailure {
  output: string;
  stderr: string;
  stderrTruncated: boolean;
  exitCode: number | null;
  signal: string | null;
  timedOut: boolean;
}

/** A failed vendor process with its observable remains attached. */
export class HarnessDispatchError
  extends Error
  implements HarnessDispatchFailure
{
  readonly output: string;
  readonly stderr: string;
  readonly stderrTruncated: boolean;
  readonly exitCode: number | null;
  readonly signal: string | null;
  readonly timedOut: boolean;
  constructor(
    message: string,
    failure: HarnessDispatchFailure,
    cause?: unknown,
  ) {
    super(message, cause === undefined ? undefined : { cause });
    this.name = "HarnessDispatchError";
    this.output = failure.output;
    this.stderr = failure.stderr;
    this.stderrTruncated = failure.stderrTruncated;
    this.exitCode = failure.exitCode;
    this.signal = failure.signal;
    this.timedOut = failure.timedOut;
  }
}

function boundedText(value: unknown): { text: string; truncated: boolean } {
  const text =
    typeof value === "string"
      ? value
      : Buffer.isBuffer(value)
        ? value.toString("utf-8")
        : "";
  return text.length > HARNESS_STDERR_LIMIT
    ? { text: text.slice(-HARNESS_STDERR_LIMIT), truncated: true }
    : { text, truncated: false };
}

export function runHarnessInvocation(
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
      throw new HarnessDispatchError(
        envelope.result ?? "Agent vendor returned an error envelope",
        {
          output: text,
          stderr: "",
          stderrTruncated: false,
          exitCode: 0,
          signal: null,
          timedOut: false,
        },
      );
    }
    return text;
  } catch (error) {
    if (error instanceof HarnessDispatchError) throw error;
    const failure = error as {
      status?: number | null;
      signal?: string | null;
      code?: string;
      killed?: boolean;
      stderr?: unknown;
      stdout?: unknown;
    };
    const stderr = boundedText(failure.stderr);
    const stdout = boundedText(failure.stdout);
    const timedOut = failure.code === "ETIMEDOUT" || failure.killed === true;
    const summary = stderr.text.replace(/\s+/g, " ").trim().slice(0, 300);
    throw new HarnessDispatchError(
      `Harness dispatch failed (${timedOut ? "timed out" : `exit ${failure.status ?? "?"}`})${summary ? `: ${summary}` : ""}`,
      {
        output:
          typeof failure.stdout === "string" ? failure.stdout : stdout.text,
        stderr: stderr.text,
        stderrTruncated: stderr.truncated,
        exitCode: typeof failure.status === "number" ? failure.status : null,
        signal: typeof failure.signal === "string" ? failure.signal : null,
        timedOut,
      },
      error,
    );
  }
}

export function buildHarnessDispatch(
  agent: string,
  vendor: string,
  vendorConfig: VendorConfig,
  timeoutMs: number,
  sourceEnv: NodeJS.ProcessEnv = process.env,
): HarnessDispatchFn {
  const promptFlag = resolvePromptFlag(vendor, vendorConfig.prompt_flag);
  return ({ prompt, workspace }) => {
    const dispatch = planDispatch(
      agent,
      vendor,
      vendorConfig,
      promptFlag,
      prompt,
      sourceEnv,
      { readOnly: false, workspace },
    );
    // Both arms receive the same allowlisted environment; vendor memory is off.
    const { env } = buildHarnessEnvironment(
      vendor,
      sourceEnv,
      dispatch.invocation.env,
    );
    return runHarnessInvocation(
      { ...dispatch.invocation, env },
      workspace,
      prompt,
      promptFlag,
      timeoutMs,
    );
  };
}
