// Hook dispatch contracts — design 019 (hook → oma hook canonical ABI).
// Section 2: Interfaces & contracts.
//
// The canonical handler contracts (HookInput, HandlerResult, HandlerCtx,
// HookHandler) live in `.agents/hooks/core/types.ts` so that both this cli
// module AND the standalone pi subprocess scripts can import them without
// a `core → cli` circular dependency. This file re-exports them plus the
// cli-only dispatch envelope types (HookRequest, HookResponse).

// Re-export canonical handler contracts from core (single source of truth).
// NOTE: The Vendor type here includes "pi" (from core/constants VENDORS).
// The cli VENDORS array in cli/constants/vendors.ts intentionally excludes
// "pi" (pi uses in-process extension bridge), but the handler Vendor must
// include "pi" for dialect output in hook-output.ts.
export type {
  HandlerCtx,
  HandlerResult,
  HookHandler,
  HookInput,
  Vendor,
} from "../../../.agents/hooks/core/types.js";

// ---------------------------------------------------------------------------
// Dispatch envelope — carries the full context from the CLI entrypoint to the
// in-process router (runHookDispatch).
// ---------------------------------------------------------------------------

export interface HookRequest {
  /** Canonicalized vendor identity */
  vendor: import("../../../.agents/hooks/core/types.js").Vendor;
  /** Raw native event name from the vendor's hook registration (e.g. "UserPromptSubmit") */
  nativeEvent: string;
  /** Optional matcher / tool name forwarded from --matcher flag */
  matcher?: string;
  /** Raw stdin payload (unparsed JSON string from the vendor hook invocation) */
  rawStdin: string;
  /** Working directory of the hook invocation */
  cwd: string;
  /** Optional session id, extracted from the payload or forwarded externally */
  sid?: string;
}

export interface HookResponse {
  /**
   * Vendor-dialect string to write to stdout.
   * Empty string means no-op (write nothing — fail-open result or no handler matched).
   */
  output: string;
}
