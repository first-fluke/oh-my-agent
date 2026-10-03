/**
 * editor/server/security.ts — request gate for the slide editor server.
 *
 * POST /edit spawns an agent, so every request must prove it comes from the
 * editor page this process served:
 *   - Host must name this loopback server (blocks DNS rebinding).
 *   - A present Origin must be this loopback server (blocks cross-site pages,
 *     including `text/plain` "simple" requests that skip CORS preflight).
 *   - Every route except the editor page needs the per-run token, which is
 *     only reachable by reading that page same-origin.
 *   - POST bodies must be `application/json`.
 */

import { randomBytes } from "node:crypto";
import type { IncomingMessage } from "node:http";
import {
  isJsonContentType,
  isLoopbackHost,
  isLoopbackOrigin,
  tokensMatch,
} from "../../../../utils/loopback-http.js";

export const EDITOR_TOKEN_HEADER = "x-oma-slide-token";
export const EDITOR_TOKEN_GLOBAL = "__OMA_SLIDE_EDITOR_TOKEN__";

export function createEditorToken(): string {
  return randomBytes(32).toString("base64url");
}

/** Token from the header (fetch) or `?token=` (EventSource, iframe src). */
export function requestToken(req: IncomingMessage, url: URL): string | null {
  const header = req.headers[EDITOR_TOKEN_HEADER];
  const value = Array.isArray(header) ? header[0] : header;
  return value ?? url.searchParams.get("token");
}

export interface EditorRequestDenial {
  status: number;
  error: string;
}

export function checkEditorRequest(
  req: IncomingMessage,
  url: URL,
  opts: { port: number; token: string },
): EditorRequestDenial | null {
  if (!isLoopbackHost(req.headers.host, opts.port)) {
    return { status: 421, error: "unexpected Host header" };
  }
  if (!isLoopbackOrigin(req.headers.origin, opts.port)) {
    return { status: 403, error: "cross-origin request rejected" };
  }
  const method = req.method ?? "GET";
  const isEditorPage = method === "GET" && url.pathname === "/";
  if (!isEditorPage && !tokensMatch(opts.token, requestToken(req, url))) {
    return { status: 401, error: "missing or invalid editor token" };
  }
  if (method === "POST" && !isJsonContentType(req.headers["content-type"])) {
    return { status: 415, error: "Content-Type must be application/json" };
  }
  return null;
}
