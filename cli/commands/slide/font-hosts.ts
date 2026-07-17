/**
 * font-hosts.ts — shared font-CDN allowlist for oma slide.
 *
 * Deck HTML is agent-generated / import-pptx-ingested and therefore
 * attacker-influenceable, so any URL it carries is untrusted. Validate and
 * export render contexts block ALL network requests by default; the only
 * exception is this small allowlist of known public font CDNs — otherwise
 * Google Fonts / jsdelivr Pretendard links would be aborted, geometry would
 * be measured against fallback fonts, and exports would render without the
 * chosen typeface.
 *
 * Restricting to known public font CDNs (https only) closes the SSRF vector:
 * no internal/metadata endpoints, no loopback/link-local hosts.
 *
 * Consumers:
 *   - bundle.ts   --inline-fonts fetch guard
 *   - validate.ts / export/{png,pdf,pptx}.ts request interceptors
 */

export const ALLOWED_FONT_HOSTS: ReadonlySet<string> = new Set<string>([
  "fonts.googleapis.com",
  "fonts.gstatic.com",
  "fonts.bunny.net",
  "use.typekit.net",
  "cdn.jsdelivr.net",
]);

/**
 * Return true only for an https URL whose host is an allowlisted font CDN.
 */
export function isAllowedFontUrl(href: string): boolean {
  let url: URL;
  try {
    url = new URL(href);
  } catch {
    return false;
  }
  return url.protocol === "https:" && ALLOWED_FONT_HOSTS.has(url.hostname);
}

const LOCAL_HOSTNAMES: ReadonlySet<string> = new Set<string>([
  "127.0.0.1",
  "localhost",
  "[::1]",
]);

/**
 * Return true only for URLs a render context may load without touching the
 * network: file:/data: URLs and http(s) on an exact loopback hostname.
 *
 * Parses with `new URL()` — a prefix check like startsWith("http://127.0.0.1")
 * would also accept "http://127.0.0.1.evil.com" (attacker-controlled DNS) and
 * "http://127.0.0.1@evil.com" (userinfo), reopening the SSRF/exfil vector the
 * interceptors exist to close.
 */
export function isLocalUrl(url: string): boolean {
  if (url.startsWith("data:")) return true;
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return false;
  }
  if (parsed.protocol === "file:") return true;
  return (
    (parsed.protocol === "http:" || parsed.protocol === "https:") &&
    LOCAL_HOSTNAMES.has(parsed.hostname)
  );
}
