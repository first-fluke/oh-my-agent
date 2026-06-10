/**
 * URL reference resolution for the docs resolver.
 *
 * Design: docs/plans/designs/008-oma-docs.md § Resolver
 */

import { http } from "../../../io/http.js";

// ---------------------------------------------------------------------------
// URL resolution
// ---------------------------------------------------------------------------

const RFC1918_RE = /^(10\.|172\.(1[6-9]|2\d|3[01])\.|192\.168\.)/;
const LOCALHOST_RE = /^(localhost|127\.|0\.0\.0\.0)/;
const INTERNAL_HOST_RE = /\.(local|internal)$/;

function isInternalUrl(urlStr: string): boolean {
  let host: string;
  try {
    host = new URL(urlStr).hostname;
  } catch {
    return false;
  }
  return (
    LOCALHOST_RE.test(host) ||
    RFC1918_RE.test(host) ||
    INTERNAL_HOST_RE.test(host)
  );
}

export async function resolveUrl(
  target: string,
): Promise<{ ok: boolean; skipped?: boolean; reason?: string }> {
  if (isInternalUrl(target)) {
    return { ok: false, skipped: true, reason: "internal-host" };
  }

  try {
    const response = await http.head(target, {
      timeout: 5_000,
      maxRedirects: 5,
      validateStatus: () => true, // handle all status codes manually
    });

    const status = response.status;
    if (status === 200 || (status >= 300 && status < 400)) {
      return { ok: true };
    }
    if (status === 404 || status === 410) {
      return { ok: false, reason: `url_${status}` };
    }
    if (status === 401 || status === 403) {
      return { ok: false, skipped: true, reason: "auth-required" };
    }
    // 5xx or unexpected
    return { ok: false, skipped: true, reason: `unreachable (HTTP ${status})` };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (
      message.includes("timeout") ||
      message.includes("ECONNREFUSED") ||
      message.includes("ENOTFOUND")
    ) {
      return { ok: false, skipped: true, reason: "unreachable" };
    }
    return { ok: false, skipped: true, reason: `unreachable (${message})` };
  }
}
