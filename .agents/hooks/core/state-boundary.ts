#!/usr/bin/env bun
import { readFileSync } from "node:fs";
import { basename } from "node:path";
import { recallFacts } from "./agentmemory-client.ts";
import { agyConversationId, isAgyInput } from "./agy-input.ts";
import { syncGrokContext } from "./grok-context.ts";
import { makePromptOutput } from "./hook-output.ts";
import { writeInjectLog } from "./inject-log.ts";
import { normalizePromptInput } from "./prompt-input.ts";
import { emitEvent, type OmaEvent, readEvents } from "./state-emit.ts";
import { getActiveSid, readIndex, setLastSession } from "./state-marker.ts";
import type { HandlerCtx, HandlerResult, HookInput, Vendor } from "./types.ts";
import { getProjectDir, inferVendorFromScriptPath } from "./vendor-detect.ts";
import { type MemoryFact, renderStateSnapshot } from "./vendor-renderer.ts";

function detectVendor(input: Record<string, unknown>): Vendor {
  const event = input.hook_event_name as string | undefined;
  const hookEventName = input.hookEventName as string | undefined;
  const byScriptPath = inferVendorFromScriptPath(import.meta.filename);
  if (byScriptPath) return byScriptPath;

  // agy (Antigravity) sends no hook_event_name; detect by its stdin shape.
  if (isAgyInput(input)) return "antigravity";

  if (process.env.GROK_WORKSPACE_ROOT || hookEventName?.includes("prompt")) {
    if (process.env.GROK_WORKSPACE_ROOT) return "grok";
  }

  if (
    process.env.KIRO_PROJECT_DIR ||
    event === "userPromptSubmit" ||
    hookEventName === "userPromptSubmit"
  ) {
    return "kiro";
  }

  if (event === "PreInvocation") return "antigravity";
  if (event === "beforeSubmitPrompt") return "cursor";
  if (
    event === "UserPromptSubmit" &&
    "session_id" in input &&
    !("sessionId" in input)
  ) {
    return "codex";
  }
  if (process.env.QWEN_PROJECT_DIR) return "qwen";
  return "claude";
}

function getVendorSid(input: Record<string, unknown>): string {
  return (
    (input.sessionId as string) ||
    (input.session_id as string) ||
    agyConversationId(input) ||
    "unknown"
  );
}

/**
 * Build a recall query for boundary rehydration. The current user prompt is the
 * strongest intent signal, so it leads the query; the project name plus the most
 * recent decision subjects/summaries and workflow phase supplement it for
 * continuity when the prompt is terse. Returns "" when nothing meaningful is
 * available (recall is then skipped, keeping the snapshot to local events only).
 */
export function buildRecallQuery(
  projectDir: string,
  recentEvents: OmaEvent[],
  promptText?: string,
): string {
  const terms: string[] = [];
  const prompt = (promptText ?? "").trim();
  // Lead with the prompt (capped) so it dominates the semantic match; the rest
  // is continuity context the search can still use within the length budget.
  if (prompt) terms.push(prompt.slice(0, 300));
  terms.push(basename(projectDir));
  // Most recent first so the freshest decisions dominate the supplement.
  for (const event of [...recentEvents].reverse()) {
    const payload = event.payload ?? {};
    const pick = (key: string): void => {
      const value = payload[key];
      if (typeof value === "string" && value.trim()) terms.push(value.trim());
    };
    if (event.kind === "decision.made") {
      pick("subject");
      pick("decision");
    } else if (event.kind === "blocker.raised") {
      pick("summary");
    } else if (event.kind === "workflow.phase") {
      pick("phase");
    }
  }
  // Cap query length so we send a focused signal, not the whole timeline.
  return terms.slice(0, 8).join(" ").slice(0, 400).trim();
}

export async function onBoundary(
  projectDir: string,
  vendor: Vendor,
  vendorSid: string,
  promptText?: string,
): Promise<string | null> {
  const idx = readIndex(projectDir);
  const previous = idx.lastSession;
  const boundary =
    !previous || previous.vendor !== vendor || previous.vendorSid !== vendorSid;
  const statelessTurnFlush = vendor === "kiro" && vendorSid === "unknown";

  if (!boundary && !statelessTurnFlush) {
    setLastSession(projectDir, vendor, vendorSid);
    return null;
  }

  const sid = getActiveSid(idx);
  if (!sid) {
    setLastSession(projectDir, vendor, vendorSid);
    return null;
  }

  await emitEvent(projectDir, sid, {
    kind: "boundary",
    vendor,
    vendorSid,
    payload: {
      reason: !boundary
        ? "stateless-vendor-turn"
        : previous
          ? "vendor-session-transition"
          : "session-created",
      fromVendor: previous?.vendor ?? null,
      fromVendorSid: previous?.vendorSid ?? null,
      toVendor: vendor,
      toVendorSid: vendorSid,
      previousSid: sid,
    },
  });
  setLastSession(projectDir, vendor, vendorSid);

  const recentEvents = readEvents(projectDir, sid).slice(-10);
  // L2/L3 rehydration: recall enriched facts from AgentMemory for this working
  // context. Best-effort — returns [] when the daemon is down or recall times
  // out, so the snapshot degrades to local L1 events only (design D33/D34).
  const recallQuery = buildRecallQuery(projectDir, recentEvents, promptText);
  const facts: MemoryFact[] = recallQuery
    ? await recallFacts(recallQuery, 5)
    : [];
  const rendered = renderStateSnapshot({
    vendor,
    sid,
    reason: "vendor/session boundary",
    recentEvents,
    facts,
  });

  // D52: forensic inject audit trail (best-effort, redacted, user-only perms).
  writeInjectLog(projectDir, sid, {
    boundaryAt: new Date().toISOString(),
    fromVendor: previous?.vendor ?? null,
    fromVendorSid: previous?.vendorSid ?? null,
    toVendor: vendor,
    toVendorSid: vendorSid,
    recallQuery: recallQuery || null,
    facts,
    rendered,
  });

  // Grok ignores prompt-hook stdout, so mirror the snapshot to its session-start
  // context file (CLAUDE.local.md). Loaded on the next Grok session = close-reopen
  // resume on Grok. Best-effort; L1 events remain the SSOT.
  if (vendor === "grok") syncGrokContext(projectDir, rendered);

  return rendered;
}

// ── Pure handler (canonical ABI) ─────────────────────────────

/**
 * Pure decision function — the single logic source for state-boundary injection.
 *
 * Returns a `context` HandlerResult when a boundary snapshot should be injected,
 * or `null` when no boundary is detected (same session, no active L1 sid).
 * `ctx.cwd` must be the resolved git-root project directory; `ctx.sid` is the
 * vendor session id (NOT the L1 oma sid — the L1 sid is read from disk).
 */
export async function run(
  input: HookInput,
  ctx: HandlerCtx,
): Promise<HandlerResult | null> {
  if (input.kind !== "prompt") return null;

  const { vendor, cwd: projectDir, sid: vendorSid = "unknown" } = ctx;
  // input.kind === "prompt" is guaranteed by the guard above; the user prompt is
  // the primary recall signal for boundary rehydration.
  const rendered = await onBoundary(
    projectDir,
    vendor,
    vendorSid,
    input.prompt,
  );
  if (!rendered) return null;
  return { type: "context", additionalContext: rendered };
}

// ── Standalone entry (direct bun invocation / vendor hook subprocess) ──

async function main() {
  const raw = readFileSync(0, "utf-8");
  let input: Record<string, unknown>;
  try {
    input = JSON.parse(raw);
  } catch {
    process.exit(0);
  }

  const vendor = detectVendor(input);
  const projectDir = getProjectDir(vendor, input);
  const vendorSid = getVendorSid(input);

  // Delegate to run() — single logic source.
  const hookInput: HookInput = {
    kind: "prompt",
    prompt: normalizePromptInput(input.prompt),
    cwd: projectDir,
  };
  const ctxVal: HandlerCtx = { vendor, cwd: projectDir, sid: vendorSid };

  const result = await run(hookInput, ctxVal);
  if (result && result.type === "context") {
    process.stdout.write(makePromptOutput(vendor, result.additionalContext));
  }
}

if (import.meta.main) {
  main().catch((e) => {
    const msg = e instanceof Error ? e.message : String(e);
    process.stderr.write(`[oma] state-boundary failed: ${msg}\n`);
    process.exit(0);
  });
}
