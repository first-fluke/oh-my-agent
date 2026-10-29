/**
 * Shared stdin parsing for the Antigravity CLI (agy) hook contract.
 *
 * agy's hooks (PreInvocation / PreToolUse / PostInvocation / Stop) deliver a
 * common envelope — `conversationId`, `workspacePaths`, `transcriptPath`,
 * `artifactDirectoryPath` — and, unlike every other vendor, DO NOT include the
 * user prompt or a `hook_event_name` field on stdin. The prompt must be
 * recovered from the transcript. Field names are camelCase.
 *
 * Ref: antigravity.google/docs/hooks — "Input/Output Contract".
 */
import { existsSync, readFileSync } from "node:fs";

/**
 * agy is identified by its stdin shape (no hook_event_name to key off): a
 * `workspacePaths` array plus a `conversationId` string. No other supported
 * vendor sends this pair.
 */
export function isAgyInput(input: Record<string, unknown>): boolean {
  return (
    Array.isArray(input.workspacePaths) &&
    typeof input.conversationId === "string"
  );
}

/** agy's project dir is the first mounted workspace path. */
export function agyProjectDir(input: Record<string, unknown>): string | null {
  const ws = input.workspacePaths;
  if (Array.isArray(ws) && typeof ws[0] === "string") return ws[0];
  return null;
}

/** agy's stable session identifier is the conversation UUID. */
export function agyConversationId(
  input: Record<string, unknown>,
): string | null {
  return typeof input.conversationId === "string" ? input.conversationId : null;
}

function resolveFullStepContent(
  transcriptPath: string,
  stepIndex: number | undefined,
  lineIndex: number,
  expectedType: string,
): string | null {
  const fullPath = transcriptPath.replace(
    /transcript\.jsonl$/,
    "transcript_full.jsonl",
  );
  if (fullPath === transcriptPath || !existsSync(fullPath)) return null;
  try {
    const lines = readFileSync(fullPath, "utf-8").split("\n");
    if (stepIndex !== undefined) {
      for (const rawLine of lines) {
        const trimmed = rawLine.trim();
        if (!trimmed) continue;
        try {
          const step = JSON.parse(trimmed) as Record<string, unknown>;
          if (
            step.step_index === stepIndex &&
            step.type === expectedType &&
            typeof step.content === "string"
          ) {
            return step.content;
          }
        } catch {
          // skip malformed line
        }
      }
    }
    const byLine = lines[lineIndex]?.trim();
    if (byLine) {
      const step = JSON.parse(byLine) as Record<string, unknown>;
      if (step.type === expectedType && typeof step.content === "string") {
        return step.content;
      }
    }
  } catch {
    // ignore unreadable full transcript
  }
  return null;
}

function isContentTruncated(step: Record<string, unknown>): boolean {
  return (
    Array.isArray(step.truncated_fields) &&
    step.truncated_fields.includes("content")
  );
}

function stripUserRequestEnvelope(raw: string): string {
  const match = raw.match(/<USER_REQUEST>\s*([\s\S]*?)\s*<\/USER_REQUEST>/);
  if (match?.[1] !== undefined) return match[1].trim();
  return raw
    .replace(/<ADDITIONAL_METADATA>[\s\S]*?<\/ADDITIONAL_METADATA>/g, "")
    .replace(/<USER_SETTINGS_CHANGE>[\s\S]*$/g, "")
    .trim();
}

/**
 * Recover the latest user prompt from an agy transcript.jsonl (falling back to
 * transcript_full.jsonl when `truncated_fields` marks `content` as truncated).
 *
 * Each transcript line is a JSON step; user turns have `type === "USER_INPUT"`
 * with the request wrapped as `<USER_REQUEST>…</USER_REQUEST>` inside `content`
 * (alongside metadata blocks we strip). Returns the most recent request text,
 * or "" when the transcript is missing/unreadable.
 */
export function readAgyPrompt(
  transcriptPath: unknown,
  fallbackLastUserInput?: unknown,
): string {
  if (typeof transcriptPath === "string" && existsSync(transcriptPath)) {
    let content = "";
    let stepIndex: number | undefined;
    let lineIndex = -1;
    let truncated = false;
    try {
      const lines = readFileSync(transcriptPath, "utf-8").split("\n");
      for (let i = 0; i < lines.length; i++) {
        const trimmed = lines[i]?.trim();
        if (!trimmed) continue;
        try {
          const step = JSON.parse(trimmed) as Record<string, unknown>;
          if (step.type === "USER_INPUT" && typeof step.content === "string") {
            content = step.content; // keep the last USER_INPUT
            stepIndex =
              typeof step.step_index === "number" ? step.step_index : undefined;
            lineIndex = i;
            truncated = isContentTruncated(step);
          }
        } catch {
          // skip malformed transcript line
        }
      }
    } catch {
      content = "";
    }
    if (truncated && lineIndex >= 0) {
      const full = resolveFullStepContent(
        transcriptPath,
        stepIndex,
        lineIndex,
        "USER_INPUT",
      );
      if (full !== null) content = full;
    }
    const stripped = stripUserRequestEnvelope(content);
    if (stripped) return stripped;
  }
  if (
    typeof fallbackLastUserInput === "string" &&
    fallbackLastUserInput.trim()
  ) {
    return stripUserRequestEnvelope(fallbackLastUserInput);
  }
  return "";
}

/**
 * Recover the latest assistant response text from an agy transcript.jsonl
 * (after the last USER_INPUT turn), falling back to transcript_full.jsonl when
 * `truncated_fields` includes `"content"`.
 *
 * Used by the Stop hook so `"workflow done"` deactivation works on agy (whose
 * Stop stdin payload does not carry the model response directly).
 */
export function readAgyResponse(transcriptPath: unknown): string {
  if (typeof transcriptPath !== "string" || !existsSync(transcriptPath)) {
    return "";
  }
  let content = "";
  let stepIndex: number | undefined;
  let lineIndex = -1;
  let truncated = false;
  try {
    const lines = readFileSync(transcriptPath, "utf-8").split("\n");
    for (let i = 0; i < lines.length; i++) {
      const trimmed = lines[i]?.trim();
      if (!trimmed) continue;
      try {
        const step = JSON.parse(trimmed) as Record<string, unknown>;
        if (step.type === "USER_INPUT") {
          content = "";
          stepIndex = undefined;
          lineIndex = -1;
          truncated = false;
        } else if (
          step.type === "PLANNER_RESPONSE" &&
          typeof step.content === "string" &&
          step.content.trim()
        ) {
          content = step.content;
          stepIndex =
            typeof step.step_index === "number" ? step.step_index : undefined;
          lineIndex = i;
          truncated = isContentTruncated(step);
        }
      } catch {
        // skip malformed transcript line
      }
    }
  } catch {
    return "";
  }
  if (truncated && lineIndex >= 0) {
    const full = resolveFullStepContent(
      transcriptPath,
      stepIndex,
      lineIndex,
      "PLANNER_RESPONSE",
    );
    if (full !== null) content = full;
  }
  return content.trim();
}

const NON_BLOCKING_STOP_REASONS = new Set([
  "USER_CANCELED",
  "ERROR",
  "MAX_FORCED_INVOCATIONS",
  "MAX_TOKEN_BUDGET_EXCEEDED",
]);

/**
 * True when an agy Stop payload indicates user cancellation, an executor error,
 * or an exhausted forced-continuation/token budget — cases where a Stop hook
 * must NOT force `decision: "continue"`.
 */
export function isAgyNonBlockingStopReason(
  input: Record<string, unknown>,
): boolean {
  if (
    typeof input.terminationReason === "string" &&
    NON_BLOCKING_STOP_REASONS.has(input.terminationReason)
  ) {
    return true;
  }
  if (typeof input.error === "string" && input.error.trim().length > 0) {
    return true;
  }
  return false;
}
