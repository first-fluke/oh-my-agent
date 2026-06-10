/**
 * editor/server/ports.ts — bind host + port probing for the slide editor server.
 */

import { createServer as createNetServer } from "node:net";

// ─── Constants ────────────────────────────────────────────────────────────────

export const DEFAULT_PORT = 3737;
export const BIND_HOST = "127.0.0.1";

// ─── Port probe ───────────────────────────────────────────────────────────────

/**
 * Check if a TCP port on 127.0.0.1 is free.
 */
export function isPortFree(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const server = createNetServer();
    server.once("error", () => resolve(false));
    server.once("listening", () => {
      server.close(() => resolve(true));
    });
    server.listen(port, BIND_HOST);
  });
}

/**
 * Find a free port starting from `start`, probing up to `maxAttempts` times.
 */
export async function probeFreePort(
  start: number,
  maxAttempts = 20,
): Promise<number> {
  for (let i = 0; i < maxAttempts; i++) {
    const port = start + i;
    if (await isPortFree(port)) return port;
  }
  throw new Error(
    `No free port found in range [${start}, ${start + maxAttempts - 1}]`,
  );
}
