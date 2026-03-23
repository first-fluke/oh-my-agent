// Claude Code Hook Types for oh-my-agent
// Shared across Claude Code, Codex CLI, and Gemini CLI

// --- Vendor Detection ---

export type Vendor = "claude" | "codex" | "gemini";

// --- Hook Input (unified) ---

export interface HookInput {
  prompt?: string;
  sessionId?: string;
  session_id?: string;
  // Codex: snake_case fields
  hook_event_name?: string;
  cwd?: string;
  // Gemini: AfterAgent fields
  prompt_response?: string;
  stop_hook_active?: boolean;
  // Claude: Stop fields
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
  }
}

export function makeBlockOutput(vendor: Vendor, reason: string): string {
  switch (vendor) {
    case "claude":
    case "codex":
      return JSON.stringify({ decision: "block", reason });
    case "gemini":
      // Gemini uses AfterAgent deny — same JSON shape
      return JSON.stringify({ decision: "block", reason });
  }
}

// --- Shared Types ---

export interface ModeState {
  workflow: string;
  sessionId: string;
  activatedAt: string;
  reinforcementCount: number;
}
