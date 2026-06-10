/**
 * editor/server/sse.ts — SSE progress channel for the slide editor server.
 */

import type { IncomingMessage, ServerResponse } from "node:http";

// ─── SSE channel ─────────────────────────────────────────────────────────────

export interface SseClient {
  res: ServerResponse;
  editId: string;
}

/**
 * Active SSE clients (typically one at a time from the editor UI).
 */
export const sseClients = new Set<SseClient>();

export function broadcastSse(event: string, data: string) {
  for (const client of sseClients) {
    try {
      client.res.write(`event: ${event}\ndata: ${data}\n\n`);
    } catch {
      sseClients.delete(client);
    }
  }
}

export const handleEvents = (
  req: IncomingMessage,
  res: ServerResponse,
): void => {
  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
    "X-Accel-Buffering": "no",
  });

  const client: SseClient = { res, editId: String(Date.now()) };
  sseClients.add(client);

  // Heartbeat every 15 s to prevent proxy timeouts
  const heartbeat = setInterval(() => {
    try {
      res.write(": heartbeat\n\n");
    } catch {
      clearInterval(heartbeat);
      sseClients.delete(client);
    }
  }, 15_000);

  const cleanup = () => {
    clearInterval(heartbeat);
    sseClients.delete(client);
  };
  req.on("close", cleanup);
  res.on("close", cleanup);
};
