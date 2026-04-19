/**
 * Fetch pipeline — auto-escalation state machine.
 *
 * Strategy order: api → probe → impersonate → browser (→ archive fallback).
 * Escalation signals:
 *   - 429/503 → jitter retry 1x before escalating
 *   - 403/406/WAF markers → skip to impersonate
 *   - JS-essential signals → skip from impersonate straight to browser
 *   - Paywall/auth-required → terminate early (no strategy helps)
 *
 * Result adoption priority: accuracy > freshness > completeness >
 * structure > cost. In practice we return the first successful
 * result; archive hits always tag provenance so consumers can
 * deprioritize cached content.
 */

import { hasPaywall, hasRateLimit } from "./signals.js";
import { apiStrategy } from "./strategies/api/index.js";
import { archiveStrategy } from "./strategies/archive.js";
import { browserStrategy } from "./strategies/browser.js";
import { impersonateStrategy } from "./strategies/impersonate.js";
import { probeStrategy } from "./strategies/probe.js";
import type { FetchContext, FetchResult, Strategy } from "./types.js";

const DEFAULT_ORDER: Strategy[] = [
  "api",
  "probe",
  "impersonate",
  "browser",
  "archive",
];

export interface PipelineOptions {
  only?: Strategy[];
  skip?: Strategy[];
  retryOnRateLimit?: boolean;
  includeArchive?: boolean;
}

function selectOrder(options: PipelineOptions): Strategy[] {
  if (options.only?.length) return options.only;
  let order = DEFAULT_ORDER.slice();
  if (!options.includeArchive) {
    order = order.filter((s) => s !== "archive");
  }
  if (options.skip?.length) {
    order = order.filter((s) => !options.skip?.includes(s));
  }
  return order;
}

async function runStrategy(
  strategy: Strategy,
  url: URL,
  ctx: FetchContext,
): Promise<FetchResult | null> {
  switch (strategy) {
    case "api":
      return (await apiStrategy(url, ctx)) ?? null;
    case "probe":
      return probeStrategy(url, ctx);
    case "impersonate":
      return impersonateStrategy(url, ctx);
    case "browser":
      return browserStrategy(url, ctx);
    case "archive":
      return archiveStrategy(url, ctx);
  }
}

function shouldAcceptResult(result: FetchResult): boolean {
  if (result.status === "ok") return true;
  if (result.status === "auth-required" && hasPaywall(result.signals)) {
    return true; // terminate with auth-required; no strategy will help
  }
  return false;
}

function shouldTerminateEarly(result: FetchResult): boolean {
  return (
    result.status === "auth-required" ||
    result.status === "invalid-input" ||
    result.status === "not-found"
  );
}

async function jitterDelay(retryAfterMs: number): Promise<void> {
  const jitter = Math.floor(Math.random() * 500);
  await new Promise((resolve) => setTimeout(resolve, retryAfterMs + jitter));
}

function parseRetryAfter(signals: FetchResult["signals"]): number {
  const hit = signals.find((s) => s.kind === "rate-limit");
  if (!hit) return 1500;
  const match = hit.detail.match(/retry-after=(\d+)/);
  if (!match?.[1]) return 1500;
  const seconds = Number.parseInt(match[1], 10);
  if (Number.isNaN(seconds) || seconds > 10) return 1500;
  return seconds * 1000;
}

export async function runPipeline(
  url: URL,
  ctx: FetchContext,
  options: PipelineOptions = {},
): Promise<FetchResult> {
  const order = selectOrder(options);
  const attempts: FetchResult["attempts"] = [];
  const retriedStrategies = new Set<Strategy>();
  let lastResult: FetchResult | null = null;
  let jsEssentialSignalSeen = false;

  for (const strategy of order) {
    if (ctx.signal?.aborted) break;

    // JS-essential fast-forward: skip impersonate if we know it's futile.
    if (jsEssentialSignalSeen && strategy === "impersonate") continue;

    const result = await runStrategy(strategy, url, ctx);
    if (!result) continue;

    attempts.push({
      strategy,
      platform: result.platform,
      status: result.status,
      httpStatus: result.httpStatus,
      elapsedMs: result.elapsedMs,
      signals: result.signals,
      error: result.error,
    });

    if (result.signals.some((s) => s.kind === "js-essential")) {
      jsEssentialSignalSeen = true;
    }

    if (shouldAcceptResult(result)) {
      result.attempts = attempts;
      return result;
    }
    if (shouldTerminateEarly(result)) {
      result.attempts = attempts;
      return result;
    }
    if (
      options.retryOnRateLimit !== false &&
      hasRateLimit(result.signals) &&
      !retriedStrategies.has(strategy)
    ) {
      retriedStrategies.add(strategy);
      await jitterDelay(parseRetryAfter(result.signals));
      const retried = await runStrategy(strategy, url, ctx);
      if (retried) {
        attempts.push({
          strategy,
          platform: retried.platform,
          status: retried.status,
          httpStatus: retried.httpStatus,
          elapsedMs: retried.elapsedMs,
          signals: retried.signals,
          error: retried.error,
        });
        if (shouldAcceptResult(retried)) {
          retried.attempts = attempts;
          return retried;
        }
        lastResult = retried;
        continue;
      }
    }
    lastResult = result;
  }

  // All strategies failed — try archive sidecar if allowed and not already run.
  if (!order.includes("archive") && options.includeArchive !== false) {
    const sidecar = await archiveStrategy(url, ctx);
    attempts.push({
      strategy: "archive",
      platform: sidecar.platform,
      status: sidecar.status,
      httpStatus: sidecar.httpStatus,
      elapsedMs: sidecar.elapsedMs,
      signals: sidecar.signals,
      error: sidecar.error,
    });
    if (shouldAcceptResult(sidecar)) {
      sidecar.attempts = attempts;
      return sidecar;
    }
    lastResult = sidecar;
  }

  if (lastResult) {
    lastResult.attempts = attempts;
    return lastResult;
  }
  return {
    url: url.toString(),
    status: "error",
    strategy: order[0] ?? "probe",
    content: "",
    elapsedMs: 0,
    signals: [],
    attempts,
    error: "all strategies failed",
  };
}
