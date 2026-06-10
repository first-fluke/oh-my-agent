// Hook router + merge — design 019, Section 2.
// This module owns routing (vendor × event → handler chain) and merge rules.

import { resolveGitRoot } from "../../../.agents/hooks/core/fs-utils.js";
import {
  makeBlockOutput,
  makePreToolOutput,
  makePromptOutput,
} from "../../../.agents/hooks/core/hook-output.js";
import * as keywordDetector from "../../../.agents/hooks/core/keyword-detector.js";
import * as persistentMode from "../../../.agents/hooks/core/persistent-mode.js";
import * as serenaPrimer from "../../../.agents/hooks/core/serena-primer.js";
import * as skillInjector from "../../../.agents/hooks/core/skill-injector.js";
import * as stateBoundary from "../../../.agents/hooks/core/state-boundary.js";
import * as testFilter from "../../../.agents/hooks/core/test-filter.js";
// Embedded variant route-tables. These JSON imports are INLINED into the bundle
// by `bun build`, so the route config travels with the oma binary — it does NOT
// depend on `<project>/.agents/hooks/variants/` existing (it never does in a
// normal install; the installer only uses variants to generate vendor settings).
import antigravityVariant from "../../../.agents/hooks/variants/antigravity.json" with {
  type: "json",
};
import claudeVariant from "../../../.agents/hooks/variants/claude.json" with {
  type: "json",
};
import codexVariant from "../../../.agents/hooks/variants/codex.json" with {
  type: "json",
};
import commandcodeVariant from "../../../.agents/hooks/variants/commandcode.json" with {
  type: "json",
};
import cursorVariant from "../../../.agents/hooks/variants/cursor.json" with {
  type: "json",
};
import geminiVariant from "../../../.agents/hooks/variants/gemini.json" with {
  type: "json",
};
import grokVariant from "../../../.agents/hooks/variants/grok.json" with {
  type: "json",
};
import kiroVariant from "../../../.agents/hooks/variants/kiro.json" with {
  type: "json",
};
import qwenVariant from "../../../.agents/hooks/variants/qwen.json" with {
  type: "json",
};
import { nativeEventToKind, normalizeInput } from "./adapters.js";
import type {
  HandlerCtx,
  HandlerResult,
  HookInput,
  HookRequest,
  HookResponse,
  Vendor,
} from "./types.js";

// ---------------------------------------------------------------------------
// Handler registry — maps handler id (variant JSON basename minus .ts) to run().
// ---------------------------------------------------------------------------

type RunFn = (
  input: HookInput,
  ctx: HandlerCtx,
) => Promise<HandlerResult | null>;

const HANDLER_REGISTRY: Readonly<Record<string, RunFn>> = {
  "keyword-detector": keywordDetector.run,
  "skill-injector": skillInjector.run,
  "serena-primer": serenaPrimer.run,
  "state-boundary": stateBoundary.run,
  "test-filter": testFilter.run,
  "persistent-mode": persistentMode.run,
};

// ---------------------------------------------------------------------------
// Default per-handler timeout — 5 seconds, matching the variant JSON default.
// ---------------------------------------------------------------------------
const DEFAULT_HANDLER_TIMEOUT_MS = 5_000;

// ---------------------------------------------------------------------------
// Embedded variant route-tables — bundled at build time (see imports above).
// ---------------------------------------------------------------------------

interface HookEntry {
  hook: string;
  matcher?: string;
  timeout?: number;
}

interface VariantJson {
  vendor: string;
  hookDir: string;
  events: Record<string, HookEntry | HookEntry[]>;
}

/**
 * Vendor → embedded variant config. Self-contained; no filesystem read.
 *
 * Exported as the canonical table of hook-model vendors `oma hook` can
 * dispatch for. Consumers (doctor wrapper checks, contract tests) derive
 * vendor/hookDir lists from this table instead of keeping their own copies.
 * A variant JSON without an entry here is dead config — the installer would
 * register its hooks but `oma hook` would dispatch an empty chain (this is
 * exactly how commandcode shipped broken). `vendor-wiring.test.ts` fails
 * when this table and `.agents/hooks/variants/*.json` drift.
 */
export const VARIANT_ROUTES: Readonly<Record<string, VariantJson>> = {
  antigravity: antigravityVariant as VariantJson,
  claude: claudeVariant as VariantJson,
  codex: codexVariant as VariantJson,
  commandcode: commandcodeVariant as VariantJson,
  cursor: cursorVariant as VariantJson,
  gemini: geminiVariant as VariantJson,
  grok: grokVariant as VariantJson,
  kiro: kiroVariant as VariantJson,
  qwen: qwenVariant as VariantJson,
};

/** Look up the embedded variant config for a vendor (null if unknown). */
function loadVariant(vendor: Vendor): VariantJson | null {
  return VARIANT_ROUTES[vendor] ?? null;
}

// ---------------------------------------------------------------------------
// Chain resolution — look up events[nativeEvent] in the variant JSON and
// produce an ordered array of { runFn, timeoutMs } tuples.
// ---------------------------------------------------------------------------

interface ResolvedHandler {
  id: string;
  run: RunFn;
  timeoutMs: number;
}

/**
 * Normalize a variant timeout value to milliseconds.
 * The schema defines timeout in seconds (1–30 range).
 * Gemini's variant JSON uses milliseconds (e.g. 5000) which violates the
 * schema but is handled here: values > 30 are treated as already-ms.
 */
function toMs(timeout: number): number {
  return timeout > 30 ? timeout : timeout * 1000;
}

function resolveChain(vendor: Vendor, nativeEvent: string): ResolvedHandler[] {
  const variant = loadVariant(vendor);
  if (!variant) {
    process.stderr.write(
      `[oma hook] warn: no embedded variant route-table for vendor="${vendor}" — empty chain\n`,
    );
    return [];
  }

  const entry = variant.events[nativeEvent];
  if (!entry) return [];

  const entries: HookEntry[] = Array.isArray(entry) ? entry : [entry];
  const chain: ResolvedHandler[] = [];

  for (const e of entries) {
    const id = e.hook.replace(/\.ts$/, "");
    const runFn = HANDLER_REGISTRY[id];
    if (!runFn) {
      process.stderr.write(
        `[oma hook] warn: unknown handler id "${id}" in variant "${vendor}/${nativeEvent}" — skipping\n`,
      );
      continue;
    }
    const timeoutMs =
      e.timeout !== undefined ? toMs(e.timeout) : DEFAULT_HANDLER_TIMEOUT_MS;
    chain.push({ id, run: runFn, timeoutMs });
  }

  return chain;
}

// ---------------------------------------------------------------------------
// Per-handler timeout + isolation wrapper.
// ---------------------------------------------------------------------------

async function runWithTimeout(
  handler: ResolvedHandler,
  input: HookInput,
  ctx: HandlerCtx,
): Promise<HandlerResult | null> {
  // Capture the timer handle so we can clear it once the race settles. If the
  // handler wins (the common case), an uncleared setTimeout keeps Node's event
  // loop alive until it fires — adding ~timeoutMs to EVERY invocation's exit.
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timer = setTimeout(
      () =>
        reject(
          new Error(
            `handler "${handler.id}" timed out after ${handler.timeoutMs}ms`,
          ),
        ),
      handler.timeoutMs,
    );
  });

  try {
    return await Promise.race([handler.run(input, ctx), timeoutPromise]);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    process.stderr.write(`[oma hook] warn: ${msg} — skipping (fail-open)\n`);
    return null;
  } finally {
    clearTimeout(timer);
  }
}

// ---------------------------------------------------------------------------
// runChain — execute the handler chain with merge rules per kind.
//
// Merge rules (design 019 §2):
//   prompt   : concat all `context.additionalContext` in order, joined by "\n\n".
//   pre_tool : first `block` short-circuits; else apply `mutate.updatedInput`
//              sequentially (last wins); return accumulated mutate or null if none.
//   stop     : any `block` → return block; else null.
// ---------------------------------------------------------------------------

export async function runChain(
  handlers: ResolvedHandler[],
  input: HookInput,
  ctx: HandlerCtx,
): Promise<HandlerResult | null> {
  const kind = input.kind;

  if (kind === "prompt") {
    const contextParts: string[] = [];
    for (const handler of handlers) {
      const result = await runWithTimeout(handler, input, ctx);
      if (result?.type === "context") {
        contextParts.push(result.additionalContext);
      }
    }
    if (contextParts.length === 0) return null;
    return { type: "context", additionalContext: contextParts.join("\n\n") };
  }

  if (kind === "pre_tool") {
    let lastMutate: (HandlerResult & { type: "mutate" }) | null = null;
    for (const handler of handlers) {
      const result = await runWithTimeout(handler, input, ctx);
      if (!result) continue;
      if (result.type === "block") return result; // short-circuit
      if (result.type === "mutate") lastMutate = result;
    }
    return lastMutate;
  }

  if (kind === "stop") {
    for (const handler of handlers) {
      const result = await runWithTimeout(handler, input, ctx);
      if (result?.type === "block") return result;
    }
    return null;
  }

  return null;
}

// ---------------------------------------------------------------------------
// runHookDispatch — central dispatch entry point called by InProcessTransport.
// ---------------------------------------------------------------------------

export async function runHookDispatch(req: HookRequest): Promise<HookResponse> {
  const { vendor, nativeEvent, rawStdin, cwd, sid } = req;

  // Per-vendor normalization of the raw stdin payload into a canonical HookInput.
  // Warn early if the event has no mapped kind so drift is visible in logs.
  const kind = nativeEventToKind(vendor, nativeEvent);
  if (!kind) {
    process.stderr.write(
      `[oma hook] warn: unmapped event kind for vendor="${vendor}" event="${nativeEvent}" — no handler registered, empty chain (fail-open)\n`,
    );
    return { output: "" };
  }

  const input = normalizeInput(vendor, nativeEvent, rawStdin);

  if (!input) {
    // Malformed payload — fail-open.
    return { output: "" };
  }

  // Resolve the project root by walking up to the git root from the
  // payload-provided cwd (authoritative — the vendor reports where the session
  // runs), falling back to the wrapper's process cwd. State files resolve here.
  const projectRoot = resolveGitRoot(input.cwd || cwd);

  const chain = resolveChain(vendor, nativeEvent);
  if (chain.length === 0) {
    return { output: "" };
  }

  const ctx: HandlerCtx = { vendor, cwd: projectRoot, sid };

  const merged = await runChain(chain, input, ctx);

  // Dialect render — translate the merged HandlerResult into the vendor-native
  // stdout shape via hook-output.ts.  Each vendor expects a slightly different
  // JSON (or plain-text for kiro prompts) envelope; centralizing the translation
  // here keeps individual handlers vendor-agnostic.
  if (!merged) {
    return { output: "" };
  }

  let output: string;
  switch (merged.type) {
    case "context":
      output = makePromptOutput(vendor, merged.additionalContext);
      break;
    case "mutate":
      output = makePreToolOutput(vendor, merged.updatedInput);
      break;
    case "block":
      output = makeBlockOutput(vendor, merged.reason);
      break;
  }

  return { output };
}
