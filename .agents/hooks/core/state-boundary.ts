#!/usr/bin/env bun
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { resolveGitRoot } from "./fs-utils.ts";
import { makePromptOutput } from "./hook-output.ts";
import { emitEvent, readEvents } from "./state-emit.ts";
import { getActiveSid, readIndex, setLastSession } from "./state-marker.ts";
import type { Vendor } from "./types.ts";
import { renderStateSnapshot } from "./vendor-renderer.ts";

function inferVendorFromScriptPath(): Vendor | null {
  const path = import.meta.filename;
  if (path.includes(`${join(".gemini", "antigravity-cli", "hooks")}`))
    return "antigravity";
  if (path.includes(`${join(".cursor", "hooks")}`)) return "cursor";
  if (path.includes(`${join(".qwen", "hooks")}`)) return "qwen";
  if (path.includes(`${join(".claude", "hooks")}`)) return "claude";
  if (path.includes(`${join(".gemini", "hooks")}`)) return "gemini";
  if (path.includes(`${join(".codex", "hooks")}`)) return "codex";
  if (path.includes(`${join(".grok", "hooks")}`)) return "grok";
  return null;
}

function detectVendor(input: Record<string, unknown>): Vendor {
  const event = input.hook_event_name as string | undefined;
  const hookEventName = input.hookEventName as string | undefined;
  const byScriptPath = inferVendorFromScriptPath();
  if (byScriptPath) return byScriptPath;

  if (process.env.GROK_WORKSPACE_ROOT || hookEventName?.includes("prompt")) {
    if (process.env.GROK_WORKSPACE_ROOT) return "grok";
  }

  if (event === "PreInvocation") return "antigravity";
  if (event === "BeforeAgent") return "gemini";
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

function getProjectDir(vendor: Vendor, input: Record<string, unknown>): string {
  let dir: string;
  switch (vendor) {
    case "codex":
    case "cursor":
      dir = (input.cwd as string) || process.cwd();
      break;
    case "gemini":
      dir = process.env.GEMINI_PROJECT_DIR || process.cwd();
      break;
    case "grok":
      dir =
        process.env.GROK_WORKSPACE_ROOT ||
        (input.cwd as string) ||
        process.cwd();
      break;
    case "antigravity":
      dir =
        (input.cwd as string) ||
        process.env.ANTIGRAVITY_PROJECT_DIR ||
        process.env.AGY_PROJECT_DIR ||
        process.cwd();
      break;
    case "qwen":
      dir = process.env.QWEN_PROJECT_DIR || process.cwd();
      break;
    default:
      dir = process.env.CLAUDE_PROJECT_DIR || process.cwd();
      break;
  }
  return resolveGitRoot(dir);
}

function getVendorSid(input: Record<string, unknown>): string {
  return (
    (input.sessionId as string) || (input.session_id as string) || "unknown"
  );
}

export async function onBoundary(
  projectDir: string,
  vendor: Vendor,
  vendorSid: string,
): Promise<string | null> {
  const idx = readIndex(projectDir);
  const previous = idx.lastSession;
  const boundary =
    !previous || previous.vendor !== vendor || previous.vendorSid !== vendorSid;

  if (!boundary) {
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
      reason: previous ? "vendor-session-transition" : "session-created",
      fromVendor: previous?.vendor ?? null,
      fromVendorSid: previous?.vendorSid ?? null,
      toVendor: vendor,
      toVendorSid: vendorSid,
      previousSid: sid,
    },
  });
  setLastSession(projectDir, vendor, vendorSid);

  return renderStateSnapshot({
    vendor,
    sid,
    reason: "vendor/session boundary",
    recentEvents: readEvents(projectDir, sid).slice(-10),
    facts: [],
  });
}

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
  const rendered = await onBoundary(projectDir, vendor, vendorSid);
  if (rendered) process.stdout.write(makePromptOutput(vendor, rendered));
}

if (import.meta.main) {
  main().catch((e) => {
    const msg = e instanceof Error ? e.message : String(e);
    process.stderr.write(`[oma] state-boundary failed: ${msg}\n`);
    process.exit(0);
  });
}
