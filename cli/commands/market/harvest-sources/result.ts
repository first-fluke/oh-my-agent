/**
 * Result type + shared helpers for the per-source fetchers: `SourceResult`,
 * the common `FetchArgs` shape, ok/fail constructors, vs-entity labelling,
 * and the direct-fetch primitive.
 */

import type { SourceItem } from "../shared/schema.js";

export interface SourceResult {
  source: string;
  items: SourceItem[];
  failed: boolean;
  reason?: string;
}

export interface FetchArgs {
  source: string;
  query: string;
  window: string;
  limit: number;
  timeoutMs: number;
  vsLabel?: string;
  sites?: string[];
}

export type SourceFetcher = (args: FetchArgs) => Promise<SourceResult>;

export function ok(source: string, items: SourceItem[]): SourceResult {
  return { source, items, failed: false };
}

export function fail(source: string, reason: string): SourceResult {
  return { source, items: [], failed: true, reason };
}

/** HTTP status → a human reason string, normalizing the common 429 case. */
export function httpReason(status: number): string {
  return status === 429 ? "rate-limited (429)" : `HTTP ${status}`;
}

/** Append a `vs-entity:<label>` tag to every item's metadata labels. */
export function applyVsLabel(
  items: SourceItem[],
  vsLabel?: string,
): SourceItem[] {
  if (!vsLabel) return items;
  return items.map((item) => ({
    ...item,
    metadata: {
      ...item.metadata,
      labels: [...(item.metadata.labels ?? []), `vs-entity:${vsLabel}`],
    },
  }));
}

/** Direct fetch with User-Agent and optional AbortSignal. */
export async function directFetch(
  url: string,
  timeoutMs: number,
  extraHeaders: Record<string, string> = {},
): Promise<{ ok: boolean; status: number; data: unknown }> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const resp = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent": "oma-market/0.1",
        Accept: "application/json",
        ...extraHeaders,
      },
    });
    clearTimeout(timer);
    if (!resp.ok) return { ok: false, status: resp.status, data: null };
    const data = (await resp.json()) as unknown;
    return { ok: true, status: resp.status, data };
  } catch {
    clearTimeout(timer);
    return { ok: false, status: 0, data: null };
  }
}
