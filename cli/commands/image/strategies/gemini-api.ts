import { writeFile } from "node:fs/promises";
import path from "node:path";
import type {
  GenerateInput,
  GenerateResult,
  StrategyAttempt,
  VendorError,
} from "../types.js";
import type { GeminiStrategy, StrategyContext } from "./gemini-stream.js";

interface InlinePart {
  inlineData?: { mimeType?: string; data?: string };
  inline_data?: { mime_type?: string; data?: string };
}

export const geminiApiStrategy: GeminiStrategy = {
  name: "api",
  async precheck() {
    if (!process.env.GEMINI_API_KEY) {
      return { ok: false, reason: "GEMINI_API_KEY not set" };
    }
    return { ok: true };
  },
  async run(
    input: GenerateInput,
    ctx: StrategyContext,
  ): Promise<GenerateResult[]> {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw {
        kind: "auth-required",
        hint: "Set GEMINI_API_KEY",
      } as VendorError;
    }

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(ctx.model)}:generateContent?key=${apiKey}`;
    const results: GenerateResult[] = [];
    const attempts: StrategyAttempt[] = [{ strategy: "api", status: "ok" }];

    for (let i = 0; i < input.n; i += 1) {
      const started = Date.now();
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [
            {
              role: "user",
              parts: [
                {
                  text: `${input.prompt}\n(image generation, size=${input.size}, quality=${input.quality})`,
                },
              ],
            },
          ],
        }),
        signal: input.signal,
      });
      if (res.status === 429) {
        const retry =
          Number(res.headers.get("retry-after") ?? "0") || undefined;
        throw { kind: "rate-limit", retry_after_sec: retry } as VendorError;
      }
      if (!res.ok) {
        const text = await res.text();
        throw {
          kind: "other",
          cause: new Error(`HTTP ${res.status}: ${text.slice(0, 400)}`),
        } as VendorError;
      }
      const body = (await res.json()) as {
        candidates?: Array<{ content?: { parts?: InlinePart[] } }>;
      };
      const part = (body.candidates ?? [])
        .flatMap((c) => c.content?.parts ?? [])
        .find((p) => (p.inlineData ?? p.inline_data)?.data);
      const raw = (part?.inlineData ?? part?.inline_data)?.data;
      if (!raw) {
        throw {
          kind: "other",
          cause: new Error("No inlineData image in response"),
        } as VendorError;
      }
      const name =
        input.n === 1
          ? `${ctx.vendorName}-${ctx.model}.png`
          : `${ctx.vendorName}-${ctx.model}-${i + 1}.png`;
      const filePath = path.join(input.outDir, name);
      await writeFile(filePath, Buffer.from(raw, "base64"));
      results.push({
        vendor: ctx.vendorName,
        model: ctx.model,
        strategy: "api",
        strategyAttempts: attempts,
        filePath,
        mime: "image/png",
        durationMs: Date.now() - started,
      });
    }
    return results;
  },
};
