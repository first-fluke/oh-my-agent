import { writeFile } from "node:fs/promises";
import path from "node:path";
import type { ImageConfig } from "../config.js";
import { buildOutputFilename, shortId } from "../naming.js";
import type {
  GenerateInput,
  GenerateResult,
  HealthResult,
  ImageMime,
  VendorError,
  VendorProvider,
} from "../types.js";

const DEFAULT_ENDPOINT = "https://api.minimax.io/v1/image_generation";
const MODELS = ["image-01", "image-01-live"] as const;

/** MiniMax image generation over the regional HTTP API. */
export class MiniMaxProvider implements VendorProvider {
  readonly name = "minimax";

  constructor(private readonly config?: ImageConfig) {}

  async health(): Promise<HealthResult> {
    if (!process.env.MINIMAX_API_KEY) {
      return {
        ok: false,
        reason: "not-authenticated",
        hint: "Set MINIMAX_API_KEY",
        setup: {
          url: "https://platform.minimax.io/docs",
          envVar: "MINIMAX_API_KEY",
          steps: [
            "Create a MiniMax API key in the MiniMax console.",
            'export MINIMAX_API_KEY="..."',
          ],
        },
      };
    }
    return {
      ok: true,
      supportedModels: [...MODELS],
      estimatedCostPerImage: { low: 0, medium: 0, high: 0, auto: 0 },
      detail: "MiniMax image generation API",
    };
  }

  async generate(input: GenerateInput): Promise<GenerateResult[]> {
    const apiKey = process.env.MINIMAX_API_KEY;
    if (!apiKey) {
      throw {
        kind: "auth-required",
        hint: "Set MINIMAX_API_KEY",
      } as VendorError;
    }
    const configured = this.config?.vendors.minimax as
      | (ImageConfig["vendors"][string] & {
          base_url?: string;
          baseUrl?: string;
        })
      | undefined;
    const model = input.model ?? configured?.model ?? MODELS[0];
    const endpoint =
      process.env.MINIMAX_BASE_URL ??
      configured?.base_url ??
      configured?.baseUrl ??
      DEFAULT_ENDPOINT;
    const timeoutMs = (input.timeoutSec ?? 180) * 1000;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    const signal = anySignal([input.signal, controller.signal]);
    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model,
          prompt: input.prompt,
          ...(aspectRatio(input.size)
            ? { aspect_ratio: aspectRatio(input.size) }
            : {}),
          n: input.n,
          response_format: "url",
        }),
        signal,
      });

      if (response.status === 401 || response.status === 403) {
        throw {
          kind: "auth-required",
          hint: "MINIMAX_API_KEY is invalid or unauthorized",
        } as VendorError;
      }
      if (response.status === 429) {
        const retry =
          Number(response.headers.get("retry-after") ?? "0") || undefined;
        throw { kind: "rate-limit", retry_after_sec: retry } as VendorError;
      }
      if (!response.ok) {
        const message = await response.text().catch(() => "");
        throw {
          kind: response.status >= 500 ? "network" : "invalid-input",
          ...(response.status >= 500
            ? { retryable: true, cause: new Error(`HTTP ${response.status}`) }
            : { field: "request", reason: message.slice(0, 400) }),
        } as VendorError;
      }

      const json = (await response.json()) as {
        data?: {
          image_urls?: string[];
          image_base64?: string[];
          images?: string[];
        };
        base_resp?: { status_code?: number; status_msg?: string };
      };
      if (json.base_resp?.status_code && json.base_resp.status_code !== 0) {
        throw {
          kind: "other",
          cause: new Error(
            json.base_resp.status_msg ?? "MiniMax request failed",
          ),
        } as VendorError;
      }
      const urls = json.data?.image_urls ?? [];
      const base64 = json.data?.image_base64 ?? json.data?.images ?? [];
      if (urls.length === 0 && base64.length === 0) {
        throw {
          kind: "other",
          cause: new Error("No image data in MiniMax response"),
        } as VendorError;
      }

      const started = Date.now();
      const runShortid = input.runShortid ?? shortId();
      const results: GenerateResult[] = [];
      for (let i = 0; i < input.n; i += 1) {
        let bytes: Buffer;
        const encoded = base64[i];
        const url = urls[i];
        if (encoded) {
          bytes = Buffer.from(
            encoded.replace(/^data:[^;]+;base64,/, ""),
            "base64",
          );
        } else if (url) {
          const image = await fetch(url, { signal });
          if (!image.ok)
            throw {
              kind: "network",
              retryable: true,
              cause: new Error(`Image download failed: ${image.status}`),
            } as VendorError;
          bytes = Buffer.from(await image.arrayBuffer());
        } else {
          break;
        }
        const detected = detectMime(bytes);
        const filePath = path.join(
          input.outDir,
          buildOutputFilename({
            vendor: this.name,
            model,
            runShortid,
            index: i,
            total: input.n,
            ext: detected.ext,
          }),
        );
        await writeFile(filePath, bytes);
        results.push({
          vendor: this.name,
          model,
          strategy: "minimax-api",
          strategyAttempts: [{ strategy: "minimax-api", status: "ok" }],
          filePath,
          mime: detected.mime,
          durationMs: Date.now() - started,
          costUsd: 0,
        });
      }
      return results;
    } catch (err) {
      if (err && typeof err === "object" && "kind" in err) throw err;
      if ((err as Error).name === "AbortError") {
        if (controller.signal.aborted)
          throw { kind: "timeout", after_ms: timeoutMs } as VendorError;
        throw { kind: "other", cause: err } as VendorError;
      }
      throw { kind: "network", retryable: true, cause: err } as VendorError;
    } finally {
      clearTimeout(timer);
    }
  }
}

function aspectRatio(size: string): string | undefined {
  const match = /^(\d+)x(\d+)$/.exec(size);
  if (!match) return undefined;
  const width = Number(match[1]);
  const height = Number(match[2]);
  const gcd = (a: number, b: number): number => (b ? gcd(b, a % b) : a);
  const divisor = gcd(width, height);
  return `${width / divisor}:${height / divisor}`;
}

function detectMime(bytes: Buffer): { ext: string; mime: ImageMime } {
  if (bytes[0] === 0x89 && bytes[1] === 0x50)
    return { ext: "png", mime: "image/png" };
  if (
    bytes[0] === 0x52 &&
    bytes[1] === 0x49 &&
    bytes.subarray(8, 12).toString() === "WEBP"
  )
    return { ext: "webp", mime: "image/webp" };
  if (bytes[0] === 0x47 && bytes[1] === 0x49)
    return { ext: "gif", mime: "image/gif" };
  return { ext: "jpg", mime: "image/jpeg" };
}

function anySignal(signals: AbortSignal[]): AbortSignal {
  const native = (
    AbortSignal as typeof AbortSignal & {
      any?: (s: AbortSignal[]) => AbortSignal;
    }
  ).any;
  if (native) return native(signals);
  const controller = new AbortController();
  for (const signal of signals) {
    if (signal.aborted) controller.abort(signal.reason);
    else
      signal.addEventListener("abort", () => controller.abort(signal.reason), {
        once: true,
      });
  }
  return controller.signal;
}
