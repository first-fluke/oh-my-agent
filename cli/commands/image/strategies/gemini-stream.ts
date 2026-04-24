import { spawn } from "node:child_process";
import { writeFile } from "node:fs/promises";
import path from "node:path";
import type {
  GenerateInput,
  GenerateResult,
  StrategyAttempt,
  VendorError,
} from "../types.js";

export interface StrategyContext {
  vendorName: string;
  model: string;
  timeoutMs: number;
}

export interface GeminiStrategy {
  name: "mcp" | "stream" | "api";
  precheck(): Promise<{ ok: boolean; reason?: string }>;
  run(input: GenerateInput, ctx: StrategyContext): Promise<GenerateResult[]>;
}

// NOTE: As of Gemini CLI 0.38, `gemini -p --output-format stream-json` runs the
// full agent loop and does NOT emit raw inlineData image bytes in the stream.
// The stream contains tool_use / tool_result events from the agent's own skill
// routing (which ironically can recurse into oma-image itself). Until Gemini CLI
// exposes a non-agentic image-generation surface, this strategy is disabled at
// precheck time so the runner falls through to `api`. The parser below
// (`extractImageFromStream`) remains unit-tested because it will still be needed
// the day Gemini exposes inlineData via stdout.
export const geminiStreamStrategy: GeminiStrategy = {
  name: "stream",
  async precheck() {
    return {
      ok: false,
      reason: "gemini -p does not emit raw image bytes (agentic loop)",
    };
  },
  async run(input, ctx): Promise<GenerateResult[]> {
    const results: GenerateResult[] = [];
    const attempts: StrategyAttempt[] = [{ strategy: "stream", status: "ok" }];
    for (let i = 0; i < input.n; i += 1) {
      const started = Date.now();
      const bytes = await invokeStream({
        prompt: input.prompt,
        model: ctx.model,
        size: input.size,
        signal: input.signal,
        timeoutMs: ctx.timeoutMs,
      });
      const name =
        input.n === 1
          ? `${ctx.vendorName}-${ctx.model}.png`
          : `${ctx.vendorName}-${ctx.model}-${i + 1}.png`;
      const filePath = path.join(input.outDir, name);
      await writeFile(filePath, bytes);
      results.push({
        vendor: ctx.vendorName,
        model: ctx.model,
        strategy: "stream",
        strategyAttempts: attempts,
        filePath,
        mime: "image/png",
        durationMs: Date.now() - started,
      });
    }
    return results;
  },
};

async function invokeStream(args: {
  prompt: string;
  model: string;
  size: string;
  signal: AbortSignal;
  timeoutMs: number;
}): Promise<Buffer> {
  return new Promise<Buffer>((resolve, reject) => {
    const cliArgs = [
      "-p",
      `Generate an image. Model: ${args.model}. Size: ${args.size}. Prompt: ${args.prompt}`,
      "--output-format",
      "stream-json",
      "--approval-mode",
      "yolo",
    ];
    const child = spawn("gemini", cliArgs, {
      stdio: ["ignore", "pipe", "pipe"],
      signal: args.signal,
    });
    let stdout = "";
    let stderr = "";
    child.stdout?.on("data", (c: Buffer) => {
      stdout += c.toString();
    });
    child.stderr?.on("data", (c: Buffer) => {
      stderr += c.toString();
    });
    const timer = setTimeout(() => {
      child.kill("SIGTERM");
      reject({ kind: "timeout", after_ms: args.timeoutMs } as VendorError);
    }, args.timeoutMs);
    timer.unref?.();
    child.on("error", (err) => {
      clearTimeout(timer);
      reject({ kind: "network", retryable: true, cause: err } as VendorError);
    });
    child.on("close", (code) => {
      clearTimeout(timer);
      if (code !== 0) {
        const blob = `${stdout}\n${stderr}`.toLowerCase();
        if (/not.?auth|login/.test(blob))
          reject({
            kind: "auth-required",
            hint: "Run: gemini auth",
          } as VendorError);
        else if (/content.?policy|safety|refus/.test(blob))
          reject({
            kind: "safety-refused",
            message: blob.slice(0, 400),
          } as VendorError);
        else if (/rate[- ]?limit|429/.test(blob))
          reject({ kind: "rate-limit" } as VendorError);
        else
          reject({
            kind: "other",
            cause: new Error(stderr || stdout),
          } as VendorError);
        return;
      }
      try {
        const bytes = extractImageFromStream(stdout);
        if (!bytes) {
          reject({
            kind: "other",
            cause: new Error("No inlineData image found in stream"),
          } as VendorError);
          return;
        }
        resolve(bytes);
      } catch (err) {
        reject({ kind: "other", cause: err } as VendorError);
      }
    });
  });
}

export function extractImageFromStream(stdout: string): Buffer | null {
  const lines = stdout.split(/\r?\n/).filter((l) => l.trim().length > 0);
  for (const line of lines) {
    let obj: unknown;
    try {
      obj = JSON.parse(line);
    } catch {
      continue;
    }
    const bytes = findInlineImage(obj);
    if (bytes) return bytes;
  }
  return null;
}

function findInlineImage(obj: unknown): Buffer | null {
  if (!obj || typeof obj !== "object") return null;
  const o = obj as Record<string, unknown>;
  const inline = o.inlineData ?? o.inline_data;
  if (inline && typeof inline === "object") {
    const i = inline as Record<string, unknown>;
    const mime = (i.mimeType ?? i.mime_type) as string | undefined;
    const data = i.data as string | undefined;
    if (typeof data === "string" && mime?.startsWith("image/")) {
      return Buffer.from(data, "base64");
    }
  }
  for (const v of Object.values(o)) {
    const found = findInlineImage(v);
    if (found) return found;
  }
  return null;
}
