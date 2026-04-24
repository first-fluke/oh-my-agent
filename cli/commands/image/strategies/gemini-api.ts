import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { buildOutputFilename, shortId } from "../naming.js";
import type {
  GenerateInput,
  GenerateResult,
  ReferenceImage,
  StrategyAttempt,
  VendorError,
} from "../types.js";
import type { GeminiStrategy, StrategyContext } from "./gemini-stream.js";

interface InlinePart {
  inlineData?: { mimeType?: string; data?: string };
  inline_data?: { mime_type?: string; data?: string };
}

interface RequestPart {
  text?: string;
  inlineData?: { mimeType: string; data: string };
}

export async function buildReferenceParts(
  refs: readonly ReferenceImage[],
): Promise<RequestPart[]> {
  const parts: RequestPart[] = [];
  for (const r of refs) {
    const buf = await readFile(r.path);
    parts.push({
      inlineData: { mimeType: r.mime, data: buf.toString("base64") },
    });
  }
  return parts;
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

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(ctx.model)}:generateContent?key=${encodeURIComponent(apiKey)}`;
    const results: GenerateResult[] = [];
    const attempts: StrategyAttempt[] = [{ strategy: "api", status: "ok" }];

    const refs = input.referenceImages ?? [];
    const referenceParts =
      refs.length > 0 ? await buildReferenceParts(refs) : [];
    const runShortid = input.runShortid ?? shortId();

    for (let i = 0; i < input.n; i += 1) {
      const started = Date.now();
      const textPart: RequestPart = {
        text: `${input.prompt}\n(image generation, size=${input.size}, quality=${input.quality})`,
      };
      const parts: RequestPart[] = [...referenceParts, textPart];
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [
            {
              role: "user",
              parts,
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
      const name = buildOutputFilename({
        vendor: ctx.vendorName,
        model: ctx.model,
        runShortid,
        index: i,
        total: input.n,
        ext: "png",
      });
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
