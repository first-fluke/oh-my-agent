import { timingSafeEqual } from "node:crypto";

/**
 * Request checks shared by the loopback-only HTTP servers (web dashboard,
 * slide editor). Binding 127.0.0.1 alone does not stop a web page: it can
 * still send CORS "simple" requests to the port, and a DNS-rebound hostname
 * makes the browser treat the server as same-origin with the attacker page.
 */

const LOOPBACK_HOSTNAMES = ["127.0.0.1", "localhost", "[::1]"] as const;

function isLoopbackHostname(hostname: string): boolean {
  return (LOOPBACK_HOSTNAMES as readonly string[]).includes(hostname);
}

/**
 * True when the Host header names this server. A DNS-rebinding attack
 * reaches 127.0.0.1 with the attacker's hostname in Host, so anything else
 * must be refused before a token or data is served.
 */
export function isLoopbackHost(
  host: string | undefined,
  port: number,
): boolean {
  if (!host) return false;
  const normalized = host.trim().toLowerCase();
  return LOOPBACK_HOSTNAMES.some(
    (name) =>
      normalized === `${name}:${port}` || (port === 80 && normalized === name),
  );
}

/**
 * True when the request has no Origin (non-browser clients, same-origin
 * navigations) or a loopback Origin for this port. `null` origins (sandboxed
 * frames, file: pages) are rejected.
 */
export function isLoopbackOrigin(
  origin: string | undefined,
  port: number,
): boolean {
  if (origin === undefined) return true;
  try {
    const parsed = new URL(origin);
    const parsedPort = parsed.port || (parsed.protocol === "http:" ? "80" : "");
    return (
      parsed.protocol === "http:" &&
      parsedPort === String(port) &&
      isLoopbackHostname(parsed.hostname)
    );
  } catch {
    return false;
  }
}

/** Constant-time comparison of a per-run secret against a request value. */
export function tokensMatch(
  expected: string,
  provided: string | null | undefined,
): boolean {
  if (!provided) return false;
  const expectedBytes = Buffer.from(expected);
  const providedBytes = Buffer.from(provided);
  return (
    expectedBytes.length === providedBytes.length &&
    timingSafeEqual(expectedBytes, providedBytes)
  );
}

/**
 * True for `application/json` (parameters such as charset allowed). Browsers
 * only send this type cross-origin after a CORS preflight, so requiring it
 * keeps `text/plain` simple requests from reaching JSON handlers.
 */
export function isJsonContentType(contentType: string | undefined): boolean {
  return (
    contentType?.split(";")[0]?.trim().toLowerCase() === "application/json"
  );
}

/** Inject a per-run token for the page's own same-origin requests. */
export function injectWindowToken(
  html: string,
  globalName: string,
  token: string,
): string {
  const script = `<script>window.${globalName}=${JSON.stringify(token)};</script>`;
  return html.replace("</head>", `${script}\n</head>`);
}
