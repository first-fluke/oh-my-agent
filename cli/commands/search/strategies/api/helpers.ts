import { httpFetch } from "../../http.js";
import { detectSignals } from "../../signals.js";
import type {
  FetchContext,
  FetchResult,
  FetchStatus,
  HttpResponse,
  SignalHit,
} from "../../types.js";

export interface ApiHandlerOptions {
  platform: string;
  url: URL;
  fetchUrl: string;
  method?: "GET" | "HEAD";
  headers?: Record<string, string>;
  ctx: FetchContext;
  expectJson?: boolean;
  mapBody?: (raw: string, resp: HttpResponse) => string;
}

export async function apiFetch(
  options: ApiHandlerOptions,
): Promise<FetchResult> {
  const {
    platform,
    url,
    fetchUrl,
    method = "GET",
    headers,
    ctx,
    expectJson = false,
    mapBody,
  } = options;

  try {
    const resp = await httpFetch(fetchUrl, {
      method,
      headers,
      timeoutMs: ctx.timeoutMs,
      locale: ctx.locale,
      signal: ctx.signal,
    });
    const signals = detectSignals(resp);
    const status = classifyStatus(resp, signals);
    return {
      url: url.toString(),
      status,
      strategy: "api",
      platform,
      httpStatus: resp.status,
      content: mapBody ? mapBody(resp.text, resp) : resp.text,
      contentType: resp.headers.get("content-type") ?? undefined,
      elapsedMs: resp.elapsedMs,
      signals,
      ...(expectJson && !resp.headers.get("content-type")?.includes("json")
        ? {
            error: "Expected JSON response but content-type is different",
          }
        : {}),
    };
  } catch (err) {
    return errorResult({
      url: url.toString(),
      platform,
      error: err,
    });
  }
}

export function classifyStatus(
  resp: HttpResponse,
  signals: SignalHit[],
): FetchStatus {
  if (signals.some((s) => s.kind === "paywall")) return "auth-required";
  // waf-header / waf-cookie alone are CDN-presence hints, not blocks —
  // Cloudflare-fronted APIs (Stack Exchange, npm) emit cf-ray on success too.
  if (
    signals.some((s) => s.kind === "waf-body" || s.kind === "challenge-body")
  ) {
    return "blocked";
  }
  if (resp.status === 404 || resp.status === 410) return "not-found";
  if (resp.status === 401 || resp.status === 407) return "auth-required";
  if (resp.status === 429 || resp.status === 503) return "blocked";
  if (resp.status >= 500) return "error";
  if (resp.status >= 400) return "error";
  if (!resp.text && resp.status !== 204) return "error";
  return "ok";
}

export function errorResult(opts: {
  url: string;
  platform?: string;
  error: unknown;
  strategy?: FetchResult["strategy"];
}): FetchResult {
  const message =
    opts.error instanceof Error ? opts.error.message : String(opts.error);
  const isTimeout = /timeout/i.test(message);
  return {
    url: opts.url,
    status: isTimeout ? "timeout" : "error",
    strategy: opts.strategy ?? "api",
    ...(opts.platform ? { platform: opts.platform } : {}),
    content: "",
    elapsedMs: 0,
    signals: [],
    error: message,
  };
}

export function invalidInputResult(opts: {
  url: string;
  platform: string;
  reason: string;
}): FetchResult {
  return {
    url: opts.url,
    status: "invalid-input",
    strategy: "api",
    platform: opts.platform,
    content: "",
    elapsedMs: 0,
    signals: [],
    error: opts.reason,
  };
}

export function extractPath(url: URL, prefix: string): string | null {
  const normalized = url.pathname.replace(/^\/+|\/+$/g, "");
  if (!normalized.startsWith(prefix)) return null;
  const rest = normalized.slice(prefix.length).replace(/^\/+/, "");
  return rest || null;
}

export function firstSegment(url: URL): string | null {
  const segments = url.pathname.split("/").filter(Boolean);
  return segments[0] ?? null;
}
