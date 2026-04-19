/**
 * Shared types for `oma search` mechanical primitives.
 */

export type Strategy = "api" | "probe" | "impersonate" | "browser" | "archive";

export type FetchStatus =
  | "ok"
  | "blocked"
  | "not-found"
  | "invalid-input"
  | "auth-required"
  | "timeout"
  | "error";

export type ArchiveProvenance = "amp" | "archive-today" | "wayback";

export interface SignalHit {
  kind:
    | "http-status"
    | "waf-header"
    | "waf-cookie"
    | "waf-body"
    | "challenge-body"
    | "rate-limit"
    | "spa-empty"
    | "redirect-loop"
    | "paywall"
    | "jina-quota"
    | "js-essential";
  detail: string;
  vendor?: string;
  since?: string;
}

export interface FetchResult {
  url: string;
  status: FetchStatus;
  strategy: Strategy;
  platform?: string;
  provenance?: ArchiveProvenance;
  httpStatus?: number;
  content: string;
  contentType?: string;
  elapsedMs: number;
  signals: SignalHit[];
  metadata?: ExtractedMetadata;
  attempts?: StrategyAttempt[];
  error?: string;
}

export interface StrategyAttempt {
  strategy: Strategy;
  platform?: string;
  status: FetchStatus;
  httpStatus?: number;
  elapsedMs: number;
  signals: SignalHit[];
  error?: string;
}

export interface ExtractedMetadata {
  ogp?: Record<string, string>;
  jsonLd?: unknown[];
  description?: string;
  title?: string;
  alternate?: Array<{ type: string; href: string; title?: string }>;
}

export interface HttpRequestInit extends Omit<RequestInit, "signal"> {
  timeoutMs?: number;
  signal?: AbortSignal;
  locale?: string;
}

export interface HttpResponse {
  ok: boolean;
  status: number;
  headers: Headers;
  url: string;
  text: string;
  elapsedMs: number;
  redirected: boolean;
}

export interface PlatformHandler {
  id: string;
  match: (url: URL) => boolean;
  fetch: (url: URL, ctx: FetchContext) => Promise<FetchResult>;
  keywordSearch?: (query: string, ctx: FetchContext) => Promise<FetchResult>;
}

export interface FetchContext {
  timeoutMs: number;
  locale: string;
  userAgent?: string;
  signal?: AbortSignal;
}
