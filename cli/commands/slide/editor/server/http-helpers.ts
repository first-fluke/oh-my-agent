/**
 * editor/server/http-helpers.ts — JSON/text response and body-parsing helpers.
 */

import type { IncomingMessage, ServerResponse } from "node:http";

const MAX_BODY_BYTES = 5 * 1024 * 1024; // 5 MB JSON body cap

// ─── HTTP response helpers ─────────────────────────────────────────────────────

export function sendJson(
  res: ServerResponse,
  code: number,
  data: unknown,
): void {
  res.writeHead(code, { "Content-Type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(data));
}

export function sendText(
  res: ServerResponse,
  code: number,
  contentType: string,
  body: string,
): void {
  res.writeHead(code, { "Content-Type": contentType });
  res.end(body);
}

/**
 * Collect and JSON-parse a request body, with a size cap.
 */
export function readJsonBody(req: IncomingMessage): Promise<unknown> {
  return new Promise((resolve, reject) => {
    let raw = "";
    let size = 0;
    req.on("data", (chunk: Buffer) => {
      size += chunk.length;
      if (size > MAX_BODY_BYTES) {
        reject(new Error("request body too large"));
        req.destroy();
        return;
      }
      raw += chunk.toString();
    });
    req.on("end", () => {
      if (!raw.trim()) {
        resolve({});
        return;
      }
      try {
        resolve(JSON.parse(raw));
      } catch {
        reject(new Error("invalid JSON body"));
      }
    });
    req.on("error", reject);
  });
}
