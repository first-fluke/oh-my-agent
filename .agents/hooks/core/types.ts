// Claude Code Hook Types for oh-my-agent
// Shared across Claude Code, Codex CLI, Gemini CLI, and Qwen Code

import { existsSync } from "node:fs";
import { dirname, join } from "node:path";

// --- Project Root Resolution ---

/**
 * Walk up from startDir to find the git repository root.
 * This prevents CLAUDE_PROJECT_DIR pointing to a subdirectory
 * (e.g. packages/i18n during a build) from creating state files
 * in the wrong location.
 */
const MAX_DEPTH = 20;

export function resolveGitRoot(startDir: string): string {
  let dir = startDir;
  for (let i = 0; i < MAX_DEPTH; i++) {
    if (existsSync(join(dir, ".git"))) return dir;
    const parent = dirname(dir);
    if (parent === dir) return startDir;
    dir = parent;
  }
  return startDir;
}

// --- Vendor Detection ---

export type Vendor = "claude" | "codex" | "gemini" | "qwen";

// --- Hook Input (unified) ---

export interface HookInput {
  prompt?: string;
  sessionId?: string;
  session_id?: string;
  hook_event_name?: string;
  cwd?: string;
  // Gemini: AfterAgent fields
  prompt_response?: string;
  stop_hook_active?: boolean;
  // Claude/Qwen: Stop fields
  stopReason?: string;
}

// --- Hook Output Builders ---

export function makePromptOutput(
  vendor: Vendor,
  additionalContext: string,
): string {
  switch (vendor) {
    case "claude":
      return JSON.stringify({ additionalContext });
    case "codex":
      return JSON.stringify({
        hookSpecificOutput: {
          hookEventName: "UserPromptSubmit",
          additionalContext,
        },
      });
    case "gemini":
      return JSON.stringify({
        hookSpecificOutput: {
          hookEventName: "BeforeAgent",
          additionalContext,
        },
      });
    case "qwen":
      // Qwen Code fork uses hookSpecificOutput (same as Codex)
      return JSON.stringify({
        hookSpecificOutput: {
          hookEventName: "UserPromptSubmit",
          additionalContext,
        },
      });
  }
}

export function makeBlockOutput(vendor: Vendor, reason: string): string {
  switch (vendor) {
    case "claude":
    case "codex":
    case "qwen":
      return JSON.stringify({ decision: "block", reason });
    case "gemini":
      // Gemini AfterAgent uses "deny" to reject response and force retry
      return JSON.stringify({ decision: "deny", reason });
  }
}

// --- PreToolUse Output Builder ---

export function makePreToolOutput(
  vendor: Vendor,
  updatedInput: Record<string, unknown>,
): string {
  switch (vendor) {
    case "gemini":
      return JSON.stringify({
        decision: "rewrite",
        tool_input: updatedInput,
      });
    case "claude":
    case "codex":
    case "qwen":
      return JSON.stringify({
        hookSpecificOutput: {
          hookEventName: "PreToolUse",
          updatedInput,
        },
      });
  }
}

// --- Shared Types ---

export interface ModeState {
  workflow: string;
  sessionId: string;
  activatedAt: string;
  reinforcementCount: number;
}
