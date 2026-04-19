import { httpFetch } from "../http.js";
import { detectSignals } from "../signals.js";
import type { ArchiveProvenance, FetchContext, FetchResult } from "../types.js";
import { classifyStatus, errorResult } from "./api/helpers.js";

/**
 * Archive strategy — Google AMP cache, archive.today, Wayback Machine.
 * Google Cache was shut down in July 2024 — AMP + archive.today + Wayback replace it.
 */

const ARCHIVE_TODAY_DOMAINS = [
  "archive.ph",
  "archive.is",
  "archive.md",
  "archive.vn",
  "archive.li",
];

function ampUrl(target: URL): string {
  const dashed = target.hostname.replace(/\./g, "-");
  return `https://${dashed}.cdn.ampproject.org/c/s/${target.hostname}${target.pathname}${target.search}`;
}

async function tryAmp(
  target: URL,
  ctx: FetchContext,
): Promise<FetchResult | null> {
  try {
    const url = ampUrl(target);
    const resp = await httpFetch(url, {
      timeoutMs: ctx.timeoutMs,
      locale: ctx.locale,
      signal: ctx.signal,
    });
    if (!resp.ok || resp.text.length < 200) return null;
    const signals = detectSignals(resp);
    return {
      url: target.toString(),
      status: classifyStatus(resp, signals),
      strategy: "archive",
      provenance: "amp" as ArchiveProvenance,
      platform: "amp",
      httpStatus: resp.status,
      content: resp.text,
      contentType: resp.headers.get("content-type") ?? undefined,
      elapsedMs: resp.elapsedMs,
      signals,
    };
  } catch {
    return null;
  }
}

async function tryArchiveToday(
  target: URL,
  ctx: FetchContext,
): Promise<FetchResult | null> {
  for (const domain of ARCHIVE_TODAY_DOMAINS) {
    if (ctx.signal?.aborted) break;
    try {
      const url = `https://${domain}/newest/${target.toString()}`;
      const resp = await httpFetch(url, {
        timeoutMs: ctx.timeoutMs,
        locale: ctx.locale,
        signal: ctx.signal,
      });
      if (!resp.ok || resp.text.length < 200) continue;
      const signals = detectSignals(resp);
      return {
        url: target.toString(),
        status: classifyStatus(resp, signals),
        strategy: "archive",
        provenance: "archive-today" as ArchiveProvenance,
        platform: domain,
        httpStatus: resp.status,
        content: resp.text,
        contentType: resp.headers.get("content-type") ?? undefined,
        elapsedMs: resp.elapsedMs,
        signals,
      };
    } catch {}
  }
  return null;
}

async function tryWayback(
  target: URL,
  ctx: FetchContext,
): Promise<FetchResult | null> {
  try {
    const availability = await httpFetch(
      `https://archive.org/wayback/available?url=${encodeURIComponent(target.toString())}`,
      {
        timeoutMs: ctx.timeoutMs,
        locale: ctx.locale,
        signal: ctx.signal,
      },
    );
    if (!availability.ok) return null;
    const data = JSON.parse(availability.text) as {
      archived_snapshots?: { closest?: { url?: string; available?: boolean } };
    };
    const snapshot = data.archived_snapshots?.closest;
    if (!snapshot?.available || !snapshot.url) return null;
    const resp = await httpFetch(snapshot.url, {
      timeoutMs: ctx.timeoutMs,
      locale: ctx.locale,
      signal: ctx.signal,
    });
    if (!resp.ok || resp.text.length < 200) return null;
    const signals = detectSignals(resp);
    return {
      url: target.toString(),
      status: classifyStatus(resp, signals),
      strategy: "archive",
      provenance: "wayback" as ArchiveProvenance,
      platform: "wayback",
      httpStatus: resp.status,
      content: resp.text,
      contentType: resp.headers.get("content-type") ?? undefined,
      elapsedMs: resp.elapsedMs,
      signals,
    };
  } catch {
    return null;
  }
}

export async function archiveStrategy(
  url: URL,
  ctx: FetchContext,
): Promise<FetchResult> {
  const attempts: Array<() => Promise<FetchResult | null>> = [
    () => tryAmp(url, ctx),
    () => tryArchiveToday(url, ctx),
    () => tryWayback(url, ctx),
  ];
  const started = performance.now();
  for (const attempt of attempts) {
    if (ctx.signal?.aborted) break;
    const result = await attempt();
    if (result) return result;
  }
  return {
    ...errorResult({
      url: url.toString(),
      strategy: "archive",
      error: new Error("all archive sources exhausted"),
    }),
    elapsedMs: Math.round(performance.now() - started),
  };
}
