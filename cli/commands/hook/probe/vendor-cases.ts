// commandcode is deliberately absent: its hook surface has no prompt event
// (only PreToolUse/PostToolUse/Stop per commandcode.ai/docs/hooks/reference),
// and the probe exercises the prompt-injection flow.
export type ProbeVendor =
  | "antigravity"
  | "claude"
  | "codex"
  | "cursor"
  | "gemini"
  | "grok"
  | "kiro"
  | "qwen";

export const PROBE_VENDORS: ProbeVendor[] = [
  "claude",
  "codex",
  "cursor",
  "gemini",
  "grok",
  "kiro",
  "qwen",
  "antigravity",
];

export interface VendorCase {
  promptEvent: string;
  expectedHookEvent: string;
  injectionFields: string[];
  usesHookSpecificOutput: boolean;
  build(
    projectDir: string,
    vendorSid: string,
    prompt: string,
  ): {
    input: Record<string, unknown>;
    env: Record<string, string>;
  };
}

export const VENDOR_CASES: Record<ProbeVendor, VendorCase> = {
  antigravity: {
    promptEvent: "PreInvocation",
    expectedHookEvent: "PreInvocation",
    injectionFields: ["injectSteps[].ephemeralMessage"],
    usesHookSpecificOutput: false,
    build: (projectDir, vendorSid, prompt) => ({
      input: {
        hook_event_name: "PreInvocation",
        sessionId: vendorSid,
        cwd: projectDir,
        prompt,
      },
      env: { ANTIGRAVITY_PROJECT_DIR: projectDir },
    }),
  },
  claude: {
    promptEvent: "UserPromptSubmit",
    expectedHookEvent: "UserPromptSubmit",
    injectionFields: ["additionalContext"],
    usesHookSpecificOutput: false,
    build: (projectDir, vendorSid, prompt) => ({
      input: {
        hook_event_name: "UserPromptSubmit",
        sessionId: vendorSid,
        prompt,
      },
      env: { CLAUDE_PROJECT_DIR: projectDir },
    }),
  },
  codex: {
    promptEvent: "UserPromptSubmit",
    expectedHookEvent: "UserPromptSubmit",
    injectionFields: ["hookSpecificOutput.additionalContext"],
    usesHookSpecificOutput: true,
    build: (projectDir, vendorSid, prompt) => ({
      input: {
        hook_event_name: "UserPromptSubmit",
        session_id: vendorSid,
        cwd: projectDir,
        prompt,
      },
      env: {},
    }),
  },
  cursor: {
    promptEvent: "beforeSubmitPrompt",
    expectedHookEvent: "UserPromptSubmit",
    injectionFields: ["additionalContext", "additional_context"],
    usesHookSpecificOutput: false,
    build: (projectDir, vendorSid, prompt) => ({
      input: {
        hook_event_name: "beforeSubmitPrompt",
        sessionId: vendorSid,
        cwd: projectDir,
        prompt,
      },
      env: {},
    }),
  },
  gemini: {
    promptEvent: "BeforeAgent",
    expectedHookEvent: "BeforeAgent",
    injectionFields: ["hookSpecificOutput.additionalContext"],
    usesHookSpecificOutput: true,
    build: (projectDir, vendorSid, prompt) => ({
      input: {
        hook_event_name: "BeforeAgent",
        sessionId: vendorSid,
        prompt,
      },
      env: { GEMINI_PROJECT_DIR: projectDir },
    }),
  },
  grok: {
    promptEvent: "UserPromptSubmit",
    expectedHookEvent: "UserPromptSubmit",
    injectionFields: ["additionalContext"],
    usesHookSpecificOutput: false,
    build: (projectDir, vendorSid, prompt) => ({
      input: {
        hookEventName: "user_prompt_submit",
        sessionId: vendorSid,
        cwd: projectDir,
        workspaceRoot: projectDir,
        prompt,
      },
      env: { GROK_WORKSPACE_ROOT: projectDir },
    }),
  },
  kiro: {
    promptEvent: "userPromptSubmit",
    expectedHookEvent: "userPromptSubmit",
    injectionFields: ["additionalContext"],
    usesHookSpecificOutput: false,
    build: (projectDir, vendorSid, prompt) => ({
      input: {
        hook_event_name: "userPromptSubmit",
        sessionId: vendorSid,
        cwd: projectDir,
        prompt,
      },
      env: { KIRO_PROJECT_DIR: projectDir },
    }),
  },
  qwen: {
    promptEvent: "UserPromptSubmit",
    expectedHookEvent: "UserPromptSubmit",
    injectionFields: ["hookSpecificOutput.additionalContext"],
    usesHookSpecificOutput: true,
    build: (projectDir, vendorSid, prompt) => ({
      input: {
        hook_event_name: "UserPromptSubmit",
        sessionId: vendorSid,
        prompt,
      },
      env: { QWEN_PROJECT_DIR: projectDir },
    }),
  },
};
