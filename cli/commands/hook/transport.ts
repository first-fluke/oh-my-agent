// Transport layer for hook dispatch — design 019, Section 2.7 + 2.8.
// HookTransport interface + InProcessTransport (real wiring, calls runHookDispatch).
// SocketTransport is type-only — no implementation until daemon (YAGNI).
// selectTransport() factory provides the hybrid-ABI selection seam (design 019 §2.7).

import path from "node:path";
import { runHookDispatch } from "./dispatch.js";
import type { HookRequest, HookResponse, HookTransport } from "./types.js";

// Re-export the interface so consumers can import it from one place.
export type { HookTransport };

// ---------------------------------------------------------------------------
// InProcessTransport — calls runHookDispatch in the same process.
// This is the only transport used in the one-shot `oma hook run` path today.
// ---------------------------------------------------------------------------

export class InProcessTransport implements HookTransport {
  async dispatch(req: HookRequest): Promise<HookResponse> {
    return runHookDispatch(req);
  }
}

// ---------------------------------------------------------------------------
// SocketTransport — type-only declaration until the daemon is implemented.
// Keeping this as an interface (zero runtime cost) so future task arcs can
// implement the daemon socket path without changing the HookTransport contract.
// ---------------------------------------------------------------------------

// TODO(daemon phase): implement SocketTransport class when daemon is ready.
export interface SocketTransport extends HookTransport {
  /** Path to the per-project UNIX domain socket created by the daemon. */
  socketPath: string;
}

// ---------------------------------------------------------------------------
// selectTransport — hybrid-ABI factory (design 019, §2.7 + §2.8 + edge case 4.2).
//
// Selection algorithm:
//   1. Resolve socket path: OMA_HOOK_SOCKET env var → per-project default.
//   2. Probe the socket with a 200 ms connect-timeout.
//      - If probe succeeds → connect to SocketTransport (future daemon phase).
//      - If probe fails (ENOENT, ECONNREFUSED, timeout, any error) → fall back
//        to InProcessTransport (fail-open, edge case 4.2: stale socket).
//   3. Today SocketTransport has no implementation, so the probe scaffold
//      always falls back to InProcessTransport. The seam is ready for wiring.
// ---------------------------------------------------------------------------

export interface SelectTransportOpts {
  /** Override the socket path; defaults to OMA_HOOK_SOCKET env or per-project default. */
  socketPath?: string;
  /** Connect timeout in ms (default 200). */
  connectTimeoutMs?: number;
  /** Working directory used to derive the per-project default socket path. */
  cwd?: string;
}

/**
 * Resolve the per-project default UNIX domain socket path.
 * Convention: <cwd>/.agents/.run/oma-hook.sock
 */
function defaultSocketPath(cwd?: string): string {
  const base = cwd ?? process.cwd();
  return path.join(base, ".agents", ".run", "oma-hook.sock");
}

/**
 * Probe whether a daemon is listening on the given socket path.
 * Returns true if a connection can be established within timeoutMs.
 *
 * Today this always returns false because SocketTransport is not implemented.
 * The shape is kept so the daemon phase can replace the body without changing
 * callers.
 *
 * TODO(daemon phase): connect to SocketTransport when implemented — replace
 * this stub with a real net.createConnection probe.
 */
async function probeDaemonSocket(
  _socketPath: string,
  _timeoutMs: number,
): Promise<boolean> {
  // Stub: daemon not yet implemented → always fall back to InProcessTransport.
  return false;
}

/**
 * Select the appropriate HookTransport for the current invocation.
 *
 * Today always returns InProcessTransport. When the daemon lands, the probe
 * will return true and callers will receive a SocketTransport instance
 * without any change to this call site.
 */
export async function selectTransport(
  opts?: SelectTransportOpts,
): Promise<HookTransport> {
  const socketPath =
    opts?.socketPath ??
    process.env.OMA_HOOK_SOCKET ??
    defaultSocketPath(opts?.cwd);
  const timeoutMs = opts?.connectTimeoutMs ?? 200;

  let daemonAvailable = false;
  try {
    daemonAvailable = await probeDaemonSocket(socketPath, timeoutMs);
  } catch {
    // Any unexpected probe error → fail-open to InProcessTransport (edge case 4.2).
    daemonAvailable = false;
  }

  if (daemonAvailable) {
    // TODO(daemon phase): return new SocketTransport(socketPath) when implemented.
    // Unreachable today because probeDaemonSocket always returns false.
  }

  return new InProcessTransport();
}
