// Hook-runtime types shared across Claude Code, Codex CLI, Cursor,
// and the other host CLIs in VENDORS. Functions live in `fs-utils.ts` and
// `hook-output.ts`; this file is types-only. The `Vendor` type is derived
// from the `VENDORS` runtime constant in `constants.ts` so the two stay
// in sync.
//
// This file is the SSOT for canonical handler contracts (HookInput,
// HandlerResult, HandlerCtx, HookHandler). It is self-contained — no imports
// from `cli/` — so that both `cli/` and the `.agents/hooks/core/` standalone
// scripts can import from here without creating a circular dependency.
// `cli/commands/hook/types.ts` re-exports these symbols plus the transport
// envelope types (HookRequest, HookResponse, HookTransport).

import type { VENDORS } from "./constants.ts";

export type Vendor = (typeof VENDORS)[number];

/**
 * Raw stdin shape delivered by the vendor hook registration.
 * Handlers receive this as `Record<string, unknown>` from stdin; this
 * interface documents the common fields. Not to be confused with the
 * canonical normalized `HookInput` below.
 */
export interface RawHookInput {
  prompt?: string;
  sessionId?: string;
  session_id?: string;
  hook_event_name?: string;
  cwd?: string;
  workspace_roots?: string[];
  // Stop/AfterAgent response text fields (used for re-trigger suppression).
  prompt_response?: string;
  stop_hook_active?: boolean;
  // Claude/Qwen: Stop fields
  stopReason?: string;
}

/**
 * Optional goal contract for a persistent workflow (design-prime-agent-adoption
 * Track B). Written by `oma goal:set`; read by the persistent-mode Stop hook.
 */
export interface ModeGoal {
  /** Human description of the objective. Informational only. */
  description?: string;
  budget?: {
    /**
     * Wall-clock budget in minutes, measured from `activatedAt`. When
     * exceeded the Stop hook deactivates the workflow and allows an honest
     * partial stop (machine verdict, not model discretion).
     */
    wallClockMinutes?: number;
  };
  completion?: {
    /**
     * Deterministic stop gate. MUST be an allowlist keyword ("typecheck" |
     * "test" | "lint") that maps to an existing package.json script; the hook
     * runs it as an argv array with no shell. Free-form strings are NEVER
     * executed — this value lives in an agent-writable state file, so
     * executing it verbatim would be an arbitrary-command-execution path
     * that bypasses the PreToolUse permission layer.
     */
    gate?: string;
  };
}

export interface ModeState {
  workflow: string;
  sessionId: string;
  activatedAt: string;
  reinforcementCount: number;
  /**
   * L1 session id (`oma-…`) recorded at activation so the Stop hook can emit
   * gate.passed / gate.failed events onto the same events.jsonl trail.
   */
  omaSid?: string;
  goal?: ModeGoal;
}

// ---------------------------------------------------------------------------
// Canonical handler contracts — design 019 (hook → oma hook canonical ABI).
// These are the types every centralized handler must use. They are canonical
// here (not in cli/) so that the standalone pi subprocess scripts can import
// them without depending on cli/.
// ---------------------------------------------------------------------------

/**
 * HookInput — normalised event payload delivered to each handler.
 * Discriminated on `kind`; produced by adapters.ts normalizeInput().
 */
export type HookInput =
  | {
      kind: "prompt";
      prompt: string;
      cwd: string;
      /**
       * SessionStart trigger source (claude: startup|resume|clear|compact).
       * `compact` lets session-once handlers (serena-primer, state-boundary)
       * force re-injection: compaction keeps the session id, so their normal
       * dedup would otherwise skip exactly the turn that lost the context.
       */
      source?: string;
    }
  | {
      kind: "pre_tool";
      toolName: string;
      toolInput: Record<string, unknown>;
      cwd: string;
    }
  | {
      kind: "post_tool";
      toolName: string;
      toolInput: Record<string, unknown>;
      /** Vendor tool result payload (claude: `tool_response`), when provided. */
      toolResponse?: Record<string, unknown>;
      cwd: string;
    }
  | {
      kind: "stop";
      cwd: string;
      /**
       * Assistant response / transcript text from the stop payload, if any.
       * Carries deactivation phrases ("workflow done") so persistent-mode can
       * deactivate via the central `oma hook` path, matching the standalone path.
       */
      responseText?: string;
    };

/**
 * HandlerResult — what a single handler may return.
 *
 * Forward-compatible with pi's .on() interception result:
 *   context  ↔  systemPrompt inject  (pi: before_agent_start → { systemPrompt })
 *   mutate   ↔  event.input rewrite  (pi: tool_call event.input mutation)
 *   block    ↔  block                (pi: block decision on tool_call / stop)
 */
export type HandlerResult =
  | { type: "context"; additionalContext: string }
  | { type: "mutate"; updatedInput: Record<string, unknown> }
  | { type: "block"; reason: string };

/** Context passed to every handler alongside the normalized HookInput. */
export interface HandlerCtx {
  vendor: Vendor;
  cwd: string;
  sid?: string;
}

/** Interface every centralized handler must implement. */
export interface HookHandler {
  id: string;
  run(input: HookInput, ctx: HandlerCtx): Promise<HandlerResult | null>;
}
