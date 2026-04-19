import { buildHeaders, httpFetch, USER_AGENTS as UA } from "../http.js";
import { detectJinaQuota, detectSignals } from "../signals.js";
import type {
  FetchContext,
  FetchResult,
  HttpResponse,
  SignalHit,
} from "../types.js";
import { classifyStatus, errorResult } from "./api/helpers.js";

/**
 * Probe strategy — fires multiple lightweight fetchers in parallel;
 * first success wins and cancels remaining attempts.
 */

const JINA_BASE = "https://r.jina.ai/";

interface ProbeAttempt {
  label: string;
  url: string;
  headers?: Record<string, string>;
}

function buildAttempts(target: URL): ProbeAttempt[] {
  const origin = `${target.protocol}//${target.hostname}`;
  const mobileHost = target.hostname.startsWith("m.")
    ? target.hostname
    : `m.${target.hostname.replace(/^www\./, "")}`;
  const mobileUrl = new URL(target.toString());
  mobileUrl.hostname = mobileHost;

  const attempts: ProbeAttempt[] = [
    {
      label: "jina",
      url: `${JINA_BASE}${target.toString()}`,
      headers: buildHeaders({ accept: "text/plain" }),
    },
    {
      label: "jina-json",
      url: `${JINA_BASE}${target.toString()}`,
      headers: buildHeaders({ accept: "application/json" }),
    },
    {
      label: "curl-desktop",
      url: target.toString(),
      headers: buildHeaders({
        userAgent: UA.desktopFirefox,
        referer: origin,
      }),
    },
    {
      label: "curl-mobile",
      url: mobileUrl.toString(),
      headers: buildHeaders({
        userAgent: UA.mobileSafari,
        referer: origin,
      }),
    },
    {
      label: "curl-googlebot",
      url: target.toString(),
      headers: buildHeaders({ userAgent: UA.googlebot }),
    },
  ];
  return attempts;
}

function jinaUrlDecode(label: string, raw: string): string {
  if (!label.startsWith("jina")) return raw;
  return raw;
}

interface ProbeSuccess {
  label: string;
  resp: HttpResponse;
  signals: SignalHit[];
}

export async function probeStrategy(
  url: URL,
  ctx: FetchContext,
): Promise<FetchResult> {
  const attempts = buildAttempts(url);
  const controller = new AbortController();
  if (ctx.signal) {
    if (ctx.signal.aborted) controller.abort(ctx.signal.reason);
    else
      ctx.signal.addEventListener("abort", () =>
        controller.abort(ctx.signal?.reason),
      );
  }

  const started = performance.now();
  const failures: StringMap<string> = {};
  let jinaQuotaHit: SignalHit | null = null;

  const runners = attempts.map(async (attempt): Promise<ProbeSuccess> => {
    const resp = await httpFetch(attempt.url, {
      headers: attempt.headers,
      timeoutMs: ctx.timeoutMs,
      signal: controller.signal,
      locale: ctx.locale,
    });
    const signals = detectSignals(resp);
    if (attempt.label.startsWith("jina")) {
      const quota = detectJinaQuota(resp);
      if (quota) {
        jinaQuotaHit = quota;
        throw new Error(`jina-quota:${quota.detail}`);
      }
    }
    if (!isProbeSuccessful(resp, signals)) {
      failures[attempt.label] =
        `status=${resp.status} size=${resp.text.length}`;
      throw new Error(`weak-response:${attempt.label}`);
    }
    return { label: attempt.label, resp, signals };
  });

  try {
    const winner = await Promise.any(runners);
    controller.abort();
    const elapsedMs = Math.round(performance.now() - started);
    return {
      url: url.toString(),
      status: classifyStatus(winner.resp, winner.signals),
      strategy: "probe",
      platform: winner.label,
      httpStatus: winner.resp.status,
      content: jinaUrlDecode(winner.label, winner.resp.text),
      contentType: winner.resp.headers.get("content-type") ?? undefined,
      elapsedMs,
      signals: jinaQuotaHit
        ? [...winner.signals, jinaQuotaHit]
        : winner.signals,
    };
  } catch (err) {
    const elapsedMs = Math.round(performance.now() - started);
    const detail = Object.entries(failures)
      .map(([k, v]) => `${k}:${v}`)
      .join(" ");
    if (jinaQuotaHit) {
      return {
        ...errorResult({
          url: url.toString(),
          error: new Error(`probe failed — ${detail}`),
          strategy: "probe",
        }),
        elapsedMs,
        signals: [jinaQuotaHit],
      };
    }
    return {
      ...errorResult({
        url: url.toString(),
        error: err instanceof AggregateError ? new Error(detail) : err,
        strategy: "probe",
      }),
      elapsedMs,
    };
  }
}

function isProbeSuccessful(resp: HttpResponse, signals: SignalHit[]): boolean {
  if (!resp.ok) return false;
  if (resp.text.length < 200) return false;
  if (
    signals.some(
      (s) =>
        s.kind === "waf-body" ||
        s.kind === "challenge-body" ||
        s.kind === "js-essential" ||
        s.kind === "http-status",
    )
  ) {
    return false;
  }
  return true;
}

type StringMap<T> = Record<string, T>;
