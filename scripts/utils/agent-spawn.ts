import { spawnSync } from "node:child_process";
import { buildExternalInvocation } from "@cli/io/runtime-dispatch/invocations/external.ts";
import type { RuntimeVendor } from "@cli/io/runtime-dispatch/types.ts";
import {
  resolvePromptFlag,
  resolveVendor,
} from "@cli/platform/agent-config.ts";

/** Any dispatchable vendor (excludes the "unknown" runtime sentinel). */
export type AgentVendor = Exclude<RuntimeVendor, "unknown">;

export interface RunAgentOptions {
  vendor?: AgentVendor;
  prompt: string;
  cwd?: string;
  timeoutMs?: number;
}

/**
 * Run a vendor CLI headlessly and return its stdout.
 *
 * Reuses the cli's single source of truth — `resolveVendor` (cli-config.yaml +
 * defaults), `resolvePromptFlag`, and `buildExternalInvocation` — instead of a
 * hand-maintained per-vendor command map, so every vendor the cli can dispatch
 * works here too and there is no parallel list to drift.
 */
export function runAgent(options: RunAgentOptions): string {
  const override =
    options.vendor ??
    (process.env.OMA_DEFAULT_AGENT as AgentVendor | undefined);
  const { vendor, config } = resolveVendor("explore", override);
  const vendorConfig = config?.vendors?.[vendor] ?? {};
  const promptFlag = resolvePromptFlag(vendor, vendorConfig.prompt_flag);
  const { command, args, env } = buildExternalInvocation(
    vendor,
    vendorConfig,
    promptFlag,
    options.prompt,
  );

  const result = spawnSync(command, args, {
    encoding: "utf8",
    cwd: options.cwd,
    env,
    timeout: options.timeoutMs ?? 5 * 60 * 1000,
    maxBuffer: 32 * 1024 * 1024,
    stdio: ["ignore", "pipe", "inherit"],
  });

  if (result.error) {
    throw new Error(`Failed to run ${vendor}: ${result.error.message}`);
  }
  if (result.status !== 0) {
    throw new Error(`${vendor} exited with code ${result.status}`);
  }
  return unwrapVendorResponse(
    result.stdout.trim(),
    typeof vendorConfig.response_jq === "string"
      ? vendorConfig.response_jq
      : undefined,
  );
}

/**
 * Extract the model's own text from a vendor's JSON envelope.
 *
 * `buildExternalInvocation` appends the vendor's `output_format_flag` when one
 * is configured, so a vendor like claude (`--output-format json`) prints an
 * envelope — `{"type":"result","result":"<model text>",...}` — rather than the
 * text itself. cli-config.yaml declares where the text lives per vendor as
 * `response_jq` (`.result`, `.response`, `.output`). Callers want the text: the
 * SNS author/translator steps parse a JSON article out of it, and an
 * un-unwrapped envelope parses as a valid object with none of the expected
 * fields, so every attempt fails identically instead of flaking.
 *
 * Vendors without an envelope (antigravity, kiro) declare no `response_jq` and
 * their stdout is returned untouched. Anything unparseable or shaped
 * unexpectedly also falls through to the raw stdout, so unwrapping can only
 * ever remove a wrapper, never lose output.
 */
export function unwrapVendorResponse(
  stdout: string,
  responseJq?: string,
): string {
  const path = responseJq?.trim().replace(/^\./, "");
  if (!path) return stdout;
  const segments = path.split(".").filter(Boolean);
  if (segments.length === 0) return stdout;

  // Whole-stdout first (claude/cursor/qwen emit one object), then individual
  // lines newest-first for the vendors that stream JSONL (codex `--json`).
  const candidates = [stdout, ...stdout.split("\n").reverse()];
  for (const candidate of candidates) {
    const trimmed = candidate.trim();
    if (!trimmed.startsWith("{")) continue;
    let parsed: unknown;
    try {
      parsed = JSON.parse(trimmed);
    } catch {
      continue;
    }
    let value: unknown = parsed;
    for (const segment of segments) {
      if (typeof value !== "object" || value === null) {
        value = undefined;
        break;
      }
      value = (value as Record<string, unknown>)[segment];
    }
    if (typeof value === "string") return value.trim();
  }
  return stdout;
}
