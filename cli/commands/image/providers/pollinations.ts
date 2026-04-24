import { writeFile } from "node:fs/promises";
import path from "node:path";
import type { ImageConfig } from "../config.js";
import type {
  GenerateInput,
  GenerateResult,
  HealthResult,
  VendorError,
  VendorProvider,
} from "../types.js";

// Endpoint uses the OpenAI-compatible /v1/images/generations surface.
// Legacy image.pollinations.ai/prompt/ ignores the model= parameter entirely —
// we avoid it on purpose. API key is required (sk_ for server, pk_ for client).
const API_URL = "https://gen.pollinations.ai/v1/images/generations";
const DEFAULT_MODEL = "flux";

// Freely-usable models (no pollen credit required as of 2026-04 probing).
const FREE_MODELS = ["flux", "zimage"] as const;
// Pollen-gated models — require positive balance on the Pollinations account.
const CREDIT_MODELS = [
  "qwen-image",
  "wan-image",
  "gptimage",
  "gptimage-large",
  "gpt-image-2",
  "klein",
  "kontext",
] as const;

export class PollinationsProvider implements VendorProvider {
  readonly name = "pollinations";

  constructor(private config?: ImageConfig) {}

  async health(): Promise<HealthResult> {
    const apiKey = process.env.POLLINATIONS_API_KEY;
    if (!apiKey) {
      return {
        ok: false,
        reason: "not-authenticated",
        hint: "Set POLLINATIONS_API_KEY",
        setup: {
          url: "https://enter.pollinations.ai/sign-in",
          envVar: "POLLINATIONS_API_KEY",
          steps: [
            "Sign in with Google/GitHub (free).",
            "Open 'API Keys' → 'Create secret key' → copy `sk_...`.",
            'export POLLINATIONS_API_KEY="sk_..."',
            "Free models without pollen credits: flux, zimage.",
          ],
        },
      };
    }
    return {
      ok: true,
      supportedModels: [...FREE_MODELS, ...CREDIT_MODELS],
      estimatedCostPerImage: { low: 0, medium: 0, high: 0, auto: 0 },
      detail: `free tier (${FREE_MODELS.join(", ")} no-credit; others need pollen balance)`,
    };
  }

  async generate(input: GenerateInput): Promise<GenerateResult[]> {
    const apiKey = process.env.POLLINATIONS_API_KEY;
    if (!apiKey) {
      throw {
        kind: "auth-required",
        hint: "Set POLLINATIONS_API_KEY",
      } as VendorError;
    }
    const model =
      input.model ?? this.config?.vendors.pollinations?.model ?? DEFAULT_MODEL;
    const timeoutMs = (input.timeoutSec ?? 180) * 1000;

    const results: GenerateResult[] = [];
    for (let i = 0; i < input.n; i += 1) {
      const started = Date.now();
      const bytes = await generateOne({
        apiKey,
        model,
        prompt: input.prompt,
        size: normalizeSize(input.size),
        signal: input.signal,
        timeoutMs,
      });
      const ext = bytes[0] === 0x89 ? "png" : "jpg";
      const name =
        input.n === 1
          ? `${this.name}-${model}.${ext}`
          : `${this.name}-${model}-${i + 1}.${ext}`;
      const filePath = path.join(input.outDir, name);
      await writeFile(filePath, bytes);
      results.push({
        vendor: this.name,
        model,
        strategy: "pollinations-api",
        strategyAttempts: [
          {
            strategy: "pollinations-api",
            status: "ok",
            duration_ms: Date.now() - started,
          },
        ],
        filePath,
        mime: ext === "png" ? "image/png" : ("image/jpeg" as "image/png"),
        durationMs: Date.now() - started,
        costUsd: 0,
      });
    }
    return results;
  }
}

interface GenerateOneArgs {
  apiKey: string;
  model: string;
  prompt: string;
  size: string;
  signal: AbortSignal;
  timeoutMs: number;
}

async function generateOne(args: GenerateOneArgs): Promise<Buffer> {
  const timeoutController = new AbortController();
  const timer = setTimeout(() => timeoutController.abort(), args.timeoutMs);
  const signal = anySignal([args.signal, timeoutController.signal]);
  try {
    const res = await fetch(API_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${args.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: args.model,
        prompt: args.prompt,
        n: 1,
        size: args.size,
        response_format: "b64_json",
      }),
      signal,
    });

    if (res.status === 401) {
      throw {
        kind: "auth-required",
        hint: "POLLINATIONS_API_KEY invalid or revoked",
      } as VendorError;
    }
    if (res.status === 429) {
      const retry = Number(res.headers.get("retry-after") ?? "0") || undefined;
      throw { kind: "rate-limit", retry_after_sec: retry } as VendorError;
    }
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      const msg = (() => {
        try {
          return JSON.parse(body).error?.message ?? body;
        } catch {
          return body;
        }
      })();
      if (/insufficient balance|pollen/i.test(msg)) {
        throw {
          kind: "invalid-input",
          field: "model",
          reason: `${args.model} requires Pollinations pollen credits. Try model=flux or model=zimage (free).`,
        } as VendorError;
      }
      throw {
        kind: "other",
        cause: new Error(`HTTP ${res.status}: ${String(msg).slice(0, 400)}`),
      } as VendorError;
    }

    const json = (await res.json()) as {
      data?: Array<{ b64_json?: string; url?: string }>;
    };
    const first = json.data?.[0];
    if (first?.b64_json) return Buffer.from(first.b64_json, "base64");
    if (first?.url) {
      const imgRes = await fetch(first.url, { signal });
      if (!imgRes.ok) {
        throw {
          kind: "other",
          cause: new Error(`Failed to fetch image URL: ${imgRes.status}`),
        } as VendorError;
      }
      return Buffer.from(await imgRes.arrayBuffer());
    }
    throw {
      kind: "other",
      cause: new Error("No image data in response"),
    } as VendorError;
  } catch (err) {
    if (err && typeof err === "object" && "kind" in err) throw err;
    if ((err as Error).name === "AbortError") {
      if (timeoutController.signal.aborted) {
        throw { kind: "timeout", after_ms: args.timeoutMs } as VendorError;
      }
      throw { kind: "other", cause: err } as VendorError;
    }
    throw { kind: "network", retryable: true, cause: err } as VendorError;
  } finally {
    clearTimeout(timer);
  }
}

function normalizeSize(size: string): string {
  if (size === "auto" || !/^\d+x\d+$/.test(size)) return "1024x1024";
  return size;
}

function anySignal(signals: AbortSignal[]): AbortSignal {
  const controller = new AbortController();
  for (const s of signals) {
    if (s.aborted) {
      controller.abort();
      break;
    }
    s.addEventListener("abort", () => controller.abort(), { once: true });
  }
  return controller.signal;
}
