import { httpFetch } from "../../http.js";
import { detectSignals } from "../../signals.js";
import type {
  FetchContext,
  FetchResult,
  PlatformHandler,
} from "../../types.js";
import { classifyStatus, errorResult, invalidInputResult } from "./helpers.js";

const TWITTER_HOSTS = new Set([
  "x.com",
  "www.x.com",
  "twitter.com",
  "www.twitter.com",
]);
const SYNDICATION_BASE = "https://syndication.twitter.com";
const OEMBED_BASE = "https://publish.twitter.com/oembed";

interface TwitterTarget {
  kind: "handle" | "status";
  handle?: string;
  statusId?: string;
}

function parseTarget(url: URL): TwitterTarget | null {
  const segments = url.pathname.split("/").filter(Boolean);
  if (segments.length === 0) return null;

  const first = segments[0];
  if (!first || first === "i" || first === "home") return null;

  const statusIdx = segments.indexOf("status");
  if (statusIdx !== -1 && segments[statusIdx + 1]) {
    const raw = segments[statusIdx + 1];
    if (raw && /^\d+$/.test(raw)) {
      return { kind: "status", handle: first, statusId: raw };
    }
  }
  return { kind: "handle", handle: first };
}

async function fetchTimeline(
  target: TwitterTarget,
  url: URL,
  ctx: FetchContext,
): Promise<FetchResult> {
  if (!target.handle) {
    return invalidInputResult({
      url: url.toString(),
      platform: "twitter",
      reason: "No handle in URL",
    });
  }
  const syndicationUrl = `${SYNDICATION_BASE}/srv/timeline-profile/screen-name/${target.handle}`;
  try {
    const resp = await httpFetch(syndicationUrl, {
      timeoutMs: ctx.timeoutMs,
      locale: ctx.locale,
      signal: ctx.signal,
    });
    const signals = detectSignals(resp);
    const extracted = extractNextData(resp.text) ?? resp.text;
    return {
      url: url.toString(),
      status: classifyStatus(resp, signals),
      strategy: "api",
      platform: "twitter",
      httpStatus: resp.status,
      content: extracted,
      contentType: "application/json",
      elapsedMs: resp.elapsedMs,
      signals,
    };
  } catch (err) {
    return errorResult({
      url: url.toString(),
      platform: "twitter",
      error: err,
    });
  }
}

async function fetchStatus(
  target: TwitterTarget,
  url: URL,
  ctx: FetchContext,
): Promise<FetchResult> {
  if (!target.handle || !target.statusId) {
    return invalidInputResult({
      url: url.toString(),
      platform: "twitter",
      reason: "Status URL must contain handle and id",
    });
  }
  const oembedUrl = `${OEMBED_BASE}?url=${encodeURIComponent(
    `https://twitter.com/${target.handle}/status/${target.statusId}`,
  )}&omit_script=1&dnt=1`;
  try {
    const resp = await httpFetch(oembedUrl, {
      timeoutMs: ctx.timeoutMs,
      locale: ctx.locale,
      signal: ctx.signal,
    });
    const signals = detectSignals(resp);
    return {
      url: url.toString(),
      status: classifyStatus(resp, signals),
      strategy: "api",
      platform: "twitter",
      httpStatus: resp.status,
      content: resp.text,
      contentType: resp.headers.get("content-type") ?? "application/json",
      elapsedMs: resp.elapsedMs,
      signals,
    };
  } catch (err) {
    return errorResult({
      url: url.toString(),
      platform: "twitter",
      error: err,
    });
  }
}

function extractNextData(html: string): string | null {
  const match = html.match(
    /<script[^>]+id=["']__NEXT_DATA__["'][^>]*>([\s\S]*?)<\/script>/,
  );
  return match?.[1] ?? null;
}

export const twitter: PlatformHandler = {
  id: "twitter",
  match(url) {
    return TWITTER_HOSTS.has(url.hostname);
  },
  async fetch(url, ctx) {
    const target = parseTarget(url);
    if (!target) {
      return invalidInputResult({
        url: url.toString(),
        platform: "twitter",
        reason: "Cannot parse handle or status from URL",
      });
    }
    return target.kind === "status"
      ? fetchStatus(target, url, ctx)
      : fetchTimeline(target, url, ctx);
  },
};
