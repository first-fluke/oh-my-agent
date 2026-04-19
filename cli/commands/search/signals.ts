import type { HttpResponse, SignalHit } from "./types.js";

/**
 * WAF / challenge / paywall detection.
 * Dated fingerprint strings carry provenance comments so stale markers can
 * be identified and refreshed as vendors rotate their protections.
 */

interface WafFingerprint {
  vendor: string;
  pattern: string | RegExp;
  since: string;
}

const WAF_BODY_FINGERPRINTS: WafFingerprint[] = [
  {
    vendor: "cloudflare",
    pattern: '<span id="challenge-error-text">',
    since: "2024-11-11",
  },
  {
    vendor: "cloudflare",
    pattern:
      ".loading-spinner{visibility:hidden}body.no-js .challenge-running{display:none}",
    since: "2024-05-13",
  },
  {
    vendor: "cloudfront",
    pattern: "AwsWafIntegration.forceRefreshToken",
    since: "2024-11-11",
  },
  {
    vendor: "perimeterx",
    pattern:
      '{return l.onPageView}}),Object.defineProperty(r,"perimeterxIdentifiers"',
    since: "2024-04-09",
  },
  {
    vendor: "datadome",
    pattern: /<script[^>]+src="[^"]*datadome[^"]*"/i,
    since: "2026-04",
  },
  {
    vendor: "akamai",
    pattern: /akamai-bot-manager/i,
    since: "2026-04",
  },
];

const WAF_HEADER_MARKERS: Array<{
  header: string;
  vendor: string;
}> = [
  { header: "cf-ray", vendor: "cloudflare" },
  { header: "cf-mitigated", vendor: "cloudflare" },
  { header: "x-amz-cf-id", vendor: "cloudfront" },
  { header: "x-datadome", vendor: "datadome" },
  { header: "x-akamai-transformed", vendor: "akamai" },
  { header: "server", vendor: "cloudflare" },
];

const WAF_COOKIE_MARKERS: Array<{
  name: string;
  vendor: string;
}> = [
  { name: "__cf_bm", vendor: "cloudflare" },
  { name: "cf_clearance", vendor: "cloudflare" },
  { name: "_abck", vendor: "akamai" },
  { name: "datadome", vendor: "datadome" },
  { name: "_px3", vendor: "perimeterx" },
];

const CHALLENGE_BODY_MARKERS: RegExp[] = [
  /please\s+enable\s+javascript/i,
  /checking\s+your\s+browser/i,
  /verify\s+you\s+are\s+human/i,
  /captcha/i,
  /unusual\s+traffic/i,
];

const PAYWALL_MARKERS: RegExp[] = [
  /please\s+log\s+in/i,
  /sign\s+in\s+to\s+continue/i,
  /subscribe\s+to\s+read/i,
  /subscribers\s+only/i,
  /로그인\s*후\s*이용/,
  /구독\s*후\s*이용/,
];

/**
 * JS-essential markers — when these appear, TLS impersonation alone
 * cannot succeed; escalate directly to a real browser.
 */
const JS_ESSENTIAL_MARKERS: string[] = ["behavioral-content", "sec-if-cpt"];

const JINA_QUOTA_MARKERS: RegExp[] = [
  /rate\s*limit/i,
  /exceeded\s+your\s+quota/i,
  /402\s+payment\s+required/i,
];

export function detectSignals(resp: HttpResponse): SignalHit[] {
  const hits: SignalHit[] = [];
  const body = resp.text;
  const lowerBody = body.toLowerCase();

  if (resp.status === 429 || resp.status === 503) {
    const retryAfter = resp.headers.get("retry-after") ?? undefined;
    hits.push({
      kind: "rate-limit",
      detail: retryAfter
        ? `retry-after=${retryAfter}`
        : `status=${resp.status}`,
    });
  }

  if (resp.status === 403 || resp.status === 406 || resp.status === 430) {
    hits.push({ kind: "http-status", detail: `blocked status=${resp.status}` });
  }

  for (const marker of WAF_HEADER_MARKERS) {
    const value = resp.headers.get(marker.header);
    if (!value) continue;
    if (marker.header === "server" && !/cloudflare/i.test(value)) continue;
    hits.push({
      kind: "waf-header",
      detail: `${marker.header}=${value}`,
      vendor: marker.vendor,
    });
  }

  const setCookie =
    resp.headers.get("set-cookie") ?? resp.headers.get("cookie") ?? "";
  for (const marker of WAF_COOKIE_MARKERS) {
    if (setCookie.includes(`${marker.name}=`)) {
      hits.push({
        kind: "waf-cookie",
        detail: marker.name,
        vendor: marker.vendor,
      });
    }
  }

  if (body.length > 0) {
    for (const fp of WAF_BODY_FINGERPRINTS) {
      const matched =
        typeof fp.pattern === "string"
          ? body.includes(fp.pattern)
          : fp.pattern.test(body);
      if (matched) {
        hits.push({
          kind: "waf-body",
          detail:
            typeof fp.pattern === "string"
              ? fp.pattern.slice(0, 48)
              : fp.pattern.source,
          vendor: fp.vendor,
          since: fp.since,
        });
      }
    }
    for (const marker of CHALLENGE_BODY_MARKERS) {
      if (marker.test(body)) {
        hits.push({ kind: "challenge-body", detail: marker.source });
        break;
      }
    }
    for (const marker of PAYWALL_MARKERS) {
      if (marker.test(body)) {
        hits.push({ kind: "paywall", detail: marker.source });
        break;
      }
    }
    for (const marker of JS_ESSENTIAL_MARKERS) {
      if (lowerBody.includes(marker)) {
        hits.push({ kind: "js-essential", detail: marker });
      }
    }
  }

  if (isSpaEmpty(body)) {
    hits.push({
      kind: "spa-empty",
      detail: `body-size=${body.length}`,
    });
  }

  return hits;
}

export function isSpaEmpty(body: string): boolean {
  const trimmed = body.trim();
  if (trimmed.length >= 200) return false;
  if (!trimmed) return true;
  return /<div\s+id=["']root["']\s*>\s*<\/div>/i.test(trimmed);
}

/**
 * Jina Reader emits 402/429 when quota is exceeded. Separate detection
 * so the pipeline knows to bypass Jina rather than general probe failure.
 */
export function detectJinaQuota(resp: HttpResponse): SignalHit | null {
  if (resp.status === 402 || resp.status === 429) {
    return {
      kind: "jina-quota",
      detail: `jina-status=${resp.status}`,
    };
  }
  for (const marker of JINA_QUOTA_MARKERS) {
    if (marker.test(resp.text)) {
      return { kind: "jina-quota", detail: marker.source };
    }
  }
  return null;
}

export function hasBlockingSignals(hits: SignalHit[]): boolean {
  // `waf-header` and `waf-cookie` on their own only indicate CDN/WAF presence;
  // Cloudflare-fronted sites (Stack Overflow, npm, GitHub) emit cf-ray on every
  // successful response. Treat them as blocking only when paired with a
  // challenge body or non-2xx status (covered by `http-status`).
  return hits.some(
    (h) =>
      h.kind === "waf-body" ||
      h.kind === "challenge-body" ||
      h.kind === "http-status",
  );
}

export function hasJsEssential(hits: SignalHit[]): boolean {
  return hits.some((h) => h.kind === "js-essential");
}

export function hasPaywall(hits: SignalHit[]): boolean {
  return hits.some((h) => h.kind === "paywall");
}

export function hasRateLimit(hits: SignalHit[]): boolean {
  return hits.some((h) => h.kind === "rate-limit");
}

export function isSuccessfulContent(
  resp: HttpResponse,
  hits: SignalHit[],
  minSize = 200,
): boolean {
  if (!resp.ok) return false;
  if (resp.text.length < minSize) return false;
  if (hasBlockingSignals(hits)) return false;
  if (hasJsEssential(hits)) return false;
  return true;
}
