import type { HttpRequestInit, HttpResponse } from "./types.js";

export const USER_AGENTS = {
  desktopFirefox:
    "Mozilla/5.0 (X11; Linux x86_64; rv:129.0) Gecko/20100101 Firefox/129.0",
  desktopChrome:
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
  mobileSafari:
    "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
  googlebot:
    "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)",
} as const;

export type UserAgentKey = keyof typeof USER_AGENTS;

export function buildHeaders(init?: {
  userAgent?: string;
  locale?: string;
  accept?: string;
  referer?: string;
  extra?: Record<string, string>;
}): Record<string, string> {
  const locale = init?.locale ?? "en-US,en;q=0.9";
  const [primary] = locale.split(",");
  const acceptLanguage = primary?.includes(";q=")
    ? locale
    : `${locale},${(primary ?? "en").split("-")[0]};q=0.9`;

  const headers: Record<string, string> = {
    "User-Agent": init?.userAgent ?? USER_AGENTS.desktopFirefox,
    Accept:
      init?.accept ??
      "text/html,application/xhtml+xml,application/xml;q=0.9,application/json;q=0.8,*/*;q=0.7",
    "Accept-Language": acceptLanguage,
    "Accept-Encoding": "gzip, deflate, br",
  };
  if (init?.referer) headers.Referer = init.referer;
  if (init?.extra) Object.assign(headers, init.extra);
  return headers;
}

export async function httpFetch(
  url: string | URL,
  init: HttpRequestInit = {},
): Promise<HttpResponse> {
  const { timeoutMs = 15000, signal: externalSignal, locale, ...rest } = init;
  const target = typeof url === "string" ? url : url.toString();

  const controller = new AbortController();
  const onExternalAbort = () => controller.abort(externalSignal?.reason);
  if (externalSignal) {
    if (externalSignal.aborted) controller.abort(externalSignal.reason);
    else externalSignal.addEventListener("abort", onExternalAbort);
  }
  const timer = setTimeout(
    () => controller.abort(new Error(`Timeout after ${timeoutMs}ms`)),
    timeoutMs,
  );

  const headers = new Headers(rest.headers);
  if (!headers.has("User-Agent")) {
    const base = buildHeaders({ locale });
    for (const [k, v] of Object.entries(base)) {
      if (!headers.has(k)) headers.set(k, v);
    }
  }

  const started = performance.now();
  try {
    const resp = await fetch(target, {
      ...rest,
      headers,
      signal: controller.signal,
    });
    const text = await resp.text();
    return {
      ok: resp.ok,
      status: resp.status,
      headers: resp.headers,
      url: resp.url || target,
      text,
      elapsedMs: Math.round(performance.now() - started),
      redirected: resp.redirected,
    };
  } finally {
    clearTimeout(timer);
    if (externalSignal)
      externalSignal.removeEventListener("abort", onExternalAbort);
  }
}

/**
 * HEAD-only probe — skips body download when only the status code
 * is needed. Saves bandwidth on presence checks.
 */
export async function httpHead(
  url: string | URL,
  init: HttpRequestInit = {},
): Promise<Omit<HttpResponse, "text"> & { text: "" }> {
  const resp = await httpFetch(url, { ...init, method: "HEAD" });
  return { ...resp, text: "" };
}

export function isJsonResponse(resp: HttpResponse): boolean {
  const ct = resp.headers.get("content-type") ?? "";
  return ct.includes("json");
}

export function isHtmlResponse(resp: HttpResponse): boolean {
  const ct = resp.headers.get("content-type") ?? "";
  return ct.includes("html") || ct.includes("xhtml");
}

export function safeJsonParse<T = unknown>(raw: string): T | null {
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}
