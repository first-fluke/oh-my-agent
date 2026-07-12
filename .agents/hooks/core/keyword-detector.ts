#!/usr/bin/env bun
/**
 * oh-my-agent — Prompt Hook (keyword detection)
 *
 * Works with: Claude Code (UserPromptSubmit), Codex CLI (UserPromptSubmit), and the other host CLIs in VENDORS
 *
 * Detects natural-language keywords in user prompts and injects
 * workflow instructions into the agent's context.
 *
 * stdin : JSON  — { prompt, sessionId|session_id, hook_event_name? }
 * stdout: JSON  — vendor-specific output with additionalContext
 * exit 0 = always (allow)
 */

import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
import { join } from "node:path";
import { agyConversationId, isAgyInput, readAgyPrompt } from "./agy-input.ts";
import { UNKNOWN_SESSION_ID, VENDORS } from "./constants.ts";
import { clearGrokContext } from "./grok-context.ts";
import { makePromptOutput } from "./hook-output.ts";
import { isRelayedAgentMessage, normalizePromptInput } from "./prompt-input.ts";
// triggers.json is imported statically: the bundler inlines it into the oma
// binary (bundled `oma hook` path needs no file on disk), while a standalone
// bun run resolves the sibling file next to this module (pi / direct run).
import embeddedTriggers from "./triggers.json" with { type: "json" };
import type {
  HandlerCtx,
  HandlerResult,
  HookInput,
  ModeState,
  Vendor,
} from "./types.ts";
import { getProjectDir, inferVendorFromScriptPath } from "./vendor-detect.ts";

// ── Unicode normalization ─────────────────────────────────────

/**
 * Normalize text for keyword matching.
 * NFKC converts fullwidth Latin characters produced by CJK IMEs
 * (e.g. ｐａｒａｌｌｅｌ → parallel) to their ASCII equivalents,
 * then lowercases the result.
 *
 * Placed here so that Task 3 (KEYWORD_SKIP_PREDICATES) and any
 * future layers can import and reuse the same normalization path.
 */
export function normalizeForMatching(text: string): string {
  return text.normalize("NFKC").toLowerCase();
}

// ── CLI Invocation Guard ──────────────────────────────────────

/**
 * Brands that count as CLI invocations: Oma plus the host LLM CLIs declared
 * in `VENDORS` (claude, codex, cursor, qwen, …). The vendor list is
 * the single source of truth for hook-supported runtimes; pulling from it
 * here keeps the brand set in sync when a new vendor is added.
 *
 * Third-party harnesses (omc, omx, omo) are intentionally NOT included: they
 * are separate projects, not host CLIs a user would invoke from an Oma
 * session. opencode is also not a supported vendor in this codebase.
 */
const CLI_INVOCATION_BRANDS = ["oma", ...VENDORS] as const;
const CLI_INVOCATION_SIGNALS = [
  "agent",
  "auto",
  "exec",
  "run",
  "spawn",
  String.raw`--\S+`,
  String.raw`\S+:\S+`,
] as const;

const BRANDS_RE_SOURCE = CLI_INVOCATION_BRANDS.join("|");
const SIGNALS_RE_SOURCE = CLI_INVOCATION_SIGNALS.join("|");

/**
 * Matches CLI invocations at the start of the prompt.
 *
 * All brand names require an explicit CLI signal after the brand. Brand-only
 * prefixes are NOT treated as CLI invocations because every brand name can
 * appear in natural-language usage ('claude, review this code', 'oma
 * 프로젝트의 brainstorm 알려줘', 'cursor in the editor moves'). Requiring
 * an explicit signal avoids false-positive skips on conversational prompts.
 *
 * Two accepted invocation shapes:
 *
 *   1. Slash form: '/oma:brainstorm', '/claude:exec'. The leading slash
 *      plus brand-colon prefix is a definitive CLI marker. Matches
 *      '/<brand>:'.
 *
 *   2. Bare form: '<brand>\s+<signal>' where <signal> is one of the
 *      enumerated subcommand verbs (agent / auto / exec / run / spawn),
 *      a --flag, or a colon-namespaced subcommand ('agent:spawn').
 *      Examples: 'oma agent:spawn brainstorm', 'claude --help',
 *      'codex exec --workflow ralph', 'cursor agent', 'qwen run'.
 */
export const CLI_INVOCATION_AT_START = new RegExp(
  `^\\s*(?:\\/(?:${BRANDS_RE_SOURCE}):|(?:${BRANDS_RE_SOURCE})\\s+(?:${SIGNALS_RE_SOURCE}))`,
  "i",
);

/**
 * Per-workflow skip predicates. A workflow listed here will be skipped when
 * its predicate returns true for the (already-normalized) cleaned text.
 * The map is intentionally empty at boot — populate it to add workflow-specific
 * overrides without restructuring the matching loop.
 */
export const KEYWORD_SKIP_PREDICATES: Record<
  string,
  (text: string) => boolean
> = {};

/**
 * Default predicate: skip ALL workflow triggers when the prompt starts with a
 * CLI invocation of `oma` or one of the host LLM CLIs in `VENDORS`. Applies
 * to every workflow unless an explicit per-workflow predicate in
 * KEYWORD_SKIP_PREDICATES overrides it.
 *
 * The regex is applied to the NFKC-lowercased `cleaned` text produced by
 * normalizeForMatching. All brand names are ASCII so NFKC has no effect on
 * them; the `^\s*` start-anchor is unaffected by normalization.
 */
export function shouldSkipAllWorkflows(text: string): boolean {
  return CLI_INVOCATION_AT_START.test(text);
}

// ── Guard 1: UserPromptSubmit-only trigger ────────────────────
// Hook event names that represent genuine user input (not agent responses)
const VALID_USER_EVENTS = new Set([
  "UserPromptSubmit",
  "user_prompt_submit", // Grok
  "userPromptSubmit", // Kiro
  "beforeSubmitPrompt", // Cursor
  "PreInvocation", // Antigravity CLI (agy)
]);

/**
 * Returns true if the hook input indicates this is a genuine user prompt,
 * not an agent-generated response. Prevents re-trigger loops.
 */
export function isGenuineUserPrompt(input: Record<string, unknown>): boolean {
  const event = input.hook_event_name as string | undefined;
  // If event is explicitly provided, validate it
  if (event !== undefined) {
    return VALID_USER_EVENTS.has(event);
  }
  // No event field — assume genuine (backward compat with vendors that omit it)
  return true;
}

// ── Guard: relayed inter-agent messages ──────────────────────
// Shared with skill-injector — see prompt-input.ts. Re-exported here so
// existing imports/tests keep resolving from this module.
export { isRelayedAgentMessage };

// ── Guard 3: Reinforcement suppression ───────────────────────

const REINFORCEMENT_WINDOW_MS = 60_000; // 60 seconds
const REINFORCEMENT_MAX_COUNT = 2; // allow up to 2, suppress 3rd+

export interface KeywordDetectorState {
  triggers: Record<
    string,
    {
      lastTriggeredAt: string; // ISO timestamp
      count: number;
    }
  >;
}

function getKwStateFilePath(projectDir: string): string {
  const dir = join(projectDir, ".agents", "state");
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  return join(dir, "keyword-detector-state.json");
}

/**
 * Load the keyword-detector reinforcement state from disk.
 * Resets gracefully if the file is missing or corrupt.
 */
export function loadKwState(projectDir: string): KeywordDetectorState {
  const filePath = getKwStateFilePath(projectDir);
  if (!existsSync(filePath)) return { triggers: {} };
  try {
    const raw = readFileSync(filePath, "utf-8");
    const parsed = JSON.parse(raw) as unknown;
    if (
      typeof parsed === "object" &&
      parsed !== null &&
      "triggers" in parsed &&
      typeof (parsed as Record<string, unknown>).triggers === "object"
    ) {
      return parsed as KeywordDetectorState;
    }
    return { triggers: {} };
  } catch {
    // Corrupt file — reset
    return { triggers: {} };
  }
}

/**
 * Save reinforcement state to disk.
 */
export function saveKwState(
  projectDir: string,
  state: KeywordDetectorState,
): void {
  try {
    const filePath = getKwStateFilePath(projectDir);
    writeFileSync(filePath, JSON.stringify(state, null, 2));
  } catch {
    // Non-fatal — reinforcement suppression is best-effort
  }
}

/**
 * Returns true if the keyword should be suppressed due to reinforcement loop.
 * A keyword is suppressed if it was triggered >= REINFORCEMENT_MAX_COUNT times
 * within the last REINFORCEMENT_WINDOW_MS milliseconds.
 */
export function isReinforcementSuppressed(
  state: KeywordDetectorState,
  keyword: string,
  nowMs?: number,
): boolean {
  const now = nowMs ?? Date.now();
  const entry = state.triggers[keyword];
  if (!entry) return false;
  const lastMs = new Date(entry.lastTriggeredAt).getTime();
  if (Number.isNaN(lastMs)) return false;
  const withinWindow = now - lastMs < REINFORCEMENT_WINDOW_MS;
  return withinWindow && entry.count >= REINFORCEMENT_MAX_COUNT;
}

/**
 * Record a keyword trigger in the reinforcement state.
 * Resets count if the previous trigger was outside the window.
 */
export function recordKwTrigger(
  state: KeywordDetectorState,
  keyword: string,
  nowMs?: number,
): KeywordDetectorState {
  const now = nowMs ?? Date.now();
  const entry = state.triggers[keyword];
  let count = 1;
  if (entry) {
    const lastMs = new Date(entry.lastTriggeredAt).getTime();
    const withinWindow =
      !Number.isNaN(lastMs) && now - lastMs < REINFORCEMENT_WINDOW_MS;
    count = withinWindow ? entry.count + 1 : 1;
  }
  return {
    ...state,
    triggers: {
      ...state.triggers,
      [keyword]: {
        lastTriggeredAt: new Date(now).toISOString(),
        count,
      },
    },
  };
}

// ── Vendor Detection ──────────────────────────────────────────

function detectVendor(input: Record<string, unknown>): Vendor {
  const event = input.hook_event_name as string | undefined;
  const hookEventName = input.hookEventName as string | undefined;
  const byScriptPath = inferVendorFromScriptPath(import.meta.filename);
  if (byScriptPath) return byScriptPath;

  // agy (Antigravity) sends no hook_event_name; detect by its stdin shape.
  if (isAgyInput(input)) return "antigravity";

  // Grok uses hookEventName (e.g. "user_prompt_submit") + GROK_* env vars
  if (process.env.GROK_WORKSPACE_ROOT || hookEventName?.includes("prompt")) {
    // Prefer explicit grok signal; fall through to other checks only if ambiguous
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
  if (event === "UserPromptSubmit") {
    // Codex uses snake_case session_id, Claude uses camelCase sessionId
    if ("session_id" in input && !("sessionId" in input)) return "codex";
  }
  // Qwen Code sets QWEN_PROJECT_DIR; Claude sets CLAUDE_PROJECT_DIR
  if (process.env.QWEN_PROJECT_DIR) return "qwen";
  return "claude";
}

function getSessionId(input: Record<string, unknown>): string {
  return (
    (input.sessionId as string) ||
    (input.session_id as string) ||
    agyConversationId(input) ||
    UNKNOWN_SESSION_ID
  );
}

// ── Config Loading ────────────────────────────────────────────

interface TriggerConfig {
  workflows: Record<
    string,
    {
      persistent: boolean;
      keywords: Record<string, string[]>;
      patterns?: Record<string, string[]>;
    }
  >;
  informationalPatterns: Record<string, string[]>;
  excludedWorkflows: string[];
  cjkScripts: string[];
  extensionRouting?: Record<string, string[]>;
}

/** Load the triggers config from the embedded (bundler-inlined / sibling-resolved) JSON. */
function loadConfig(): TriggerConfig {
  return structuredClone(embeddedTriggers) as TriggerConfig;
}

function detectLanguage(projectDir: string): string {
  const prefsPath = join(projectDir, ".agents", "oma-config.yaml");
  if (!existsSync(prefsPath)) return "en";
  try {
    const content = readFileSync(prefsPath, "utf-8");
    const match = content.match(/^language:\s*(\S+)/m);
    return match?.[1] ?? "en";
  } catch {
    return "en";
  }
}

// ── Pattern Builder ───────────────────────────────────────────

export function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Merge a language-keyed keyword/pattern bank into a single flat list:
 * universal ("*") + English (the universal default) + the configured
 * language's own entries (skipped when lang === "en" to avoid duplicates).
 * Shared by buildPatterns and buildRawPatterns — both keyword banks and
 * pattern banks use this exact `Record<string, string[]>` shape.
 */
export function collectLangEntries(
  bank: Record<string, string[]>,
  lang: string,
): string[] {
  return [
    ...(bank["*"] ?? []),
    ...(bank.en ?? []),
    ...(lang !== "en" ? (bank[lang] ?? []) : []),
  ];
}

/**
 * Keyword-plus-compiled-regex pair. Kept 1:1 with the literal keyword string
 * (as authored in triggers.json) so callers that need the ACTUAL matched
 * keyword text — e.g. specificity ranking — don't have to re-derive it from
 * match[0], which would require re-deriving buildPatterns' word-boundary
 * peeling logic (fragile, and wrong for CJK where no boundary is added).
 */
export interface KeywordPatternEntry {
  regex: RegExp;
  keyword: string;
}

export function buildPatternEntries(
  keywords: Record<string, string[]>,
  lang: string,
  cjkScripts: string[],
): KeywordPatternEntry[] {
  return collectLangEntries(keywords, lang).map((kw) => {
    const escaped = escapeRegex(kw).replace(/\s+/g, "\\s+");
    const regex =
      cjkScripts.includes(lang) || /[^\p{ASCII}]/u.test(kw)
        ? new RegExp(escaped, "i")
        : new RegExp(`(?:^|[^\\w-])${escaped}(?:$|[^\\w-])`, "i");
    return { regex, keyword: kw };
  });
}

export function buildPatterns(
  keywords: Record<string, string[]>,
  lang: string,
  cjkScripts: string[],
): RegExp[] {
  return buildPatternEntries(keywords, lang, cjkScripts).map((e) => e.regex);
}

/**
 * Raw-pattern-plus-source pair — mirrors KeywordPatternEntry for the
 * `patterns` (intent regex) field. `source` is the raw regex string itself:
 * unlike keyword entries, a raw pattern has no fixed "keyword" — its
 * specificity is however much text it actually matched (match[0]).
 */
export interface RawPatternEntry {
  regex: RegExp;
  source: string;
}

export function buildRawPatternEntries(
  patterns: Record<string, string[]> | undefined,
  lang: string,
): RawPatternEntry[] {
  if (!patterns) return [];
  const compiled: RawPatternEntry[] = [];
  for (const raw of collectLangEntries(patterns, lang)) {
    try {
      compiled.push({ regex: new RegExp(raw, "iu"), source: raw });
    } catch {
      // Skip invalid regex — surfaces during config edit, not at runtime
    }
  }
  return compiled;
}

/**
 * Build raw regex patterns from a workflow's `patterns` field.
 * Unlike buildPatterns, these strings are compiled directly without
 * escaping or word-boundary wrapping — pattern authors are responsible
 * for boundary handling. Invalid patterns are skipped silently.
 */
export function buildRawPatterns(
  patterns: Record<string, string[]> | undefined,
  lang: string,
): RegExp[] {
  return buildRawPatternEntries(patterns, lang).map((e) => e.regex);
}

export function buildInformationalPatterns(config: TriggerConfig): RegExp[] {
  // RC4: suppression patterns are merged across ALL languages, never gated by
  // the configured language. Users prompt in whichever language they think in
  // (`language` in oma-config.yaml controls the RESPONSE language, not the
  // prompt language), so gating by config language silently disabled e.g. the
  // Korean suppression patterns for every `language: en` project. A pattern
  // written in language X can only match a prompt that contains X-script
  // text, so loading all languages cannot suppress unrelated prompts.
  const patterns = Object.values(config.informationalPatterns).flat();
  return patterns.map((p) => {
    if (/[^\p{ASCII}]/u.test(p)) return new RegExp(escapeRegex(p), "i");
    return new RegExp(`(?:^|[^\\w-])${escapeRegex(p)}(?:$|[^\\w-])`, "i");
  });
}

// ── Filters ───────────────────────────────────────────────────

export function isInformationalContext(
  prompt: string,
  matchIndex: number,
  infoPatterns: RegExp[],
): boolean {
  const windowStart = Math.max(0, matchIndex - 60);
  const window = prompt.slice(windowStart, matchIndex + 60);
  return infoPatterns.some((p) => p.test(window));
}

/**
 * For persistent workflows (orchestrate, ultrawork, work, ralph),
 * only match keywords in the first N chars of the user's prompt.
 * Keywords deep in the prompt are likely from pasted content, not user intent.
 */
const PERSISTENT_MATCH_LIMIT = 200;

export function isPastedContent(
  matchIndex: number,
  isPersistent: boolean,
  promptLength: number,
): boolean {
  if (!isPersistent) return false;
  if (promptLength <= PERSISTENT_MATCH_LIMIT) return false;
  return matchIndex > PERSISTENT_MATCH_LIMIT;
}

/**
 * RC3 — technical-reference guard. A workflow keyword that is part of a
 * compound technical token is a reference to an ARTIFACT (CLI subcommand,
 * file, property, path segment), not a request to run the workflow:
 *
 *   `oma ralph:verify`            keyword + ':' + word  (CLI subcommand)
 *   `ralph.md`, `ralph.exec-tier` keyword + '.' + word  (file / property)
 *   `.agents/workflows/ralph`     word + '/' + keyword  (path segment)
 *
 * Sentence punctuation is NOT technical: "run ralph." has no word char after
 * the '.', and "ralph: do this" has none after the ':'. A mid-text slash
 * invocation ("run /ralph") has no word char before the '/', so it still
 * triggers. Matching is done on the cleaned text the patterns ran against;
 * backtick-wrapped tokens are already removed by stripCodeBlocks before this
 * guard is consulted.
 */
export function isTechnicalReference(
  text: string,
  matchIndex: number,
  matchText: string,
): boolean {
  // buildPatterns boundaries capture one non-word char on each side of the
  // keyword (unless the match touches ^ or $) — peel them off to locate the
  // keyword span itself. CJK keywords compile without boundaries (lead/trail
  // stay 0).
  const lead = /^[^\w-]/.test(matchText) ? 1 : 0;
  const trail = /[^\w-]$/.test(matchText) ? 1 : 0;
  const kStart = matchIndex + lead;
  const kEnd = matchIndex + matchText.length - trail;
  const prev = kStart > 0 ? (text[kStart - 1] ?? "") : "";
  const prev2 = kStart > 1 ? (text[kStart - 2] ?? "") : "";
  const next = text[kEnd] ?? "";
  const next2 = text[kEnd + 1] ?? "";
  if ((next === ":" || next === ".") && /\w/.test(next2)) return true;
  if (prev === "/" && /\w/.test(prev2)) return true;
  return false;
}

/**
 * Check if the prompt's first line looks like an analytical/research question.
 * Questions about analysis, comparison, or references are not action requests.
 */
const QUESTION_PATTERNS: RegExp[] = [
  // Korean question patterns
  /^.*참고할/,
  /^.*비교해/,
  /^.*분석해/,
  /^.*분석도/,
  /^.*있냐/,
  /^.*있나\?/,
  /^.*있는지/,
  /^.*있을까/,
  /^.*볼만한/,
  /^.*쓸만한/,
  /^.*뭐가\s*있/,
  /^.*어떤\s*(게|것|거)\s*있/,
  /^.*차이가?\s*뭐/,
  // Korean meta-continuation patterns (referring to prior discussion)
  /^.*그것도/,
  /^.*보강할/,
  // English question patterns
  /^.*\bis there\b/i,
  /^.*\bare there\b/i,
  /^.*\banything worth\b/i,
  /^.*\bwhat.*(feature|difference|reference)/i,
  /^.*\bcompare\b/i,
];

/**
 * Content-agnostic interrogative test. A first line that BOTH leads with an
 * interrogative word AND ends with '?' is a question *about* something, not a
 * command — regardless of the topic. This generalises to any subject
 * (including workflow names) without enumerating topic words, unlike
 * QUESTION_PATTERNS which match specific phrasings.
 */
// The '?' terminator is the strong gate, so the interrogative word can be a
// loose contains — suppressing a question that merely contains a workflow name
// is exactly the desired behaviour.
const INTERROGATIVE_WORD =
  /(?:왜|어째서|어떻게|무슨|무엇|뭐|뭔|뭣|어디|언제|누가|누구|어느|\bwhy\b|\bwhats?\b|\bhow\b|\bwhen\b|\bwhere\b|\bwhich\b|\bwhose\b)/i;

function isInterrogativeSentence(line: string): boolean {
  return /\?\s*$/.test(line) && INTERROGATIVE_WORD.test(line);
}

export function isAnalyticalQuestion(prompt: string): boolean {
  const firstLine = (prompt.split("\n")[0] ?? "").trim();
  return (
    isInterrogativeSentence(firstLine) ||
    QUESTION_PATTERNS.some((p) => p.test(firstLine))
  );
}

export function stripCodeBlocks(text: string): string {
  return text
    .replace(/(`{3,})[^\n]*\n[\s\S]*?\1/g, "") // multiline fenced blocks (3+ backticks, matched closing)
    .replace(/(`{3,})[^\n]*\n[\s\S]*/g, "") // unclosed fenced blocks (strip to end)
    .replace(/`{3,}[^`]*`{3,}/g, "") // single-line fenced blocks (```...```)
    .replace(/`[^`\n]+`/g, "") // inline code (no newlines allowed)
    .replace(/"[^"\n]*"/g, ""); // quoted strings
}

// System echo block patterns — strip pasted hook self-output to prevent
// re-trigger loops where the user pastes back oma's own context messages.
const SYSTEM_ECHO_LINE_PATTERNS: RegExp[] = [
  /^.*\[OMA WORKFLOW:[^\]]*\].*$/gim,
  /^.*\[OMA PERSISTENT MODE:[^\]]*\].*$/gim,
  /^.*\[OMA AGENT HINT:[^\]]*\].*$/gim,
  /^.*\[MAGIC KEYWORD:[^\]]*\].*$/gim,
  /^.*\[MAGIC KEYWORDS? DETECTED:[^\]]*\].*$/gim,
  /^.*Stop hook (?:blocking error|feedback|stopped continuation).*$/gim,
  /^.*PreToolUse:[^\n]*hook additional context:.*$/gim,
  /^.*PostToolUse:[^\n]*hook additional context:.*$/gim,
  /^.*hookSpecificOutput.*$/gim,
  /^.*The \/[a-z-]+ workflow is still active.*$/gim,
];

/**
 * Strip pasted system-echo blocks (oma's own hook outputs) so meta-discussion
 * about workflows doesn't re-trigger via paste-back. Operates line-by-line
 * to preserve surrounding user text.
 */
export function stripSystemEchoes(text: string): string {
  let cleaned = text;
  for (const pattern of SYSTEM_ECHO_LINE_PATTERNS) {
    cleaned = cleaned.replace(pattern, "");
  }
  return cleaned;
}

export function startsWithSlashCommand(prompt: string): boolean {
  return /^\/[a-zA-Z][\w-]*/.test(prompt.trim());
}

// ── Extension Detection ──────────────────────────────────────

const EXCLUDE_EXTS = new Set([
  "md",
  "json",
  "yaml",
  "yml",
  "txt",
  "env",
  "git",
  "lock",
  "log",
  "toml",
  "cfg",
  "ini",
  "conf",
  "png",
  "jpg",
  "jpeg",
  "gif",
  "ico",
  "webp",
  "woff",
  "woff2",
  "ttf",
  "eot",
  "map",
  "d",
]);

export function detectExtensions(prompt: string): string[] {
  const extPattern = /\.([a-zA-Z]{1,12})\b/g;
  const extensions = new Set<string>();
  for (const match of prompt.matchAll(extPattern)) {
    const ext = match[1]?.toLowerCase();
    if (ext && !EXCLUDE_EXTS.has(ext)) {
      extensions.add(ext);
    }
  }
  return [...extensions];
}

export function resolveAgentFromExtensions(
  extensions: string[],
  routing: Record<string, string[]>,
): string | null {
  if (extensions.length === 0) return null;

  const scores = new Map<string, number>();
  for (const ext of extensions) {
    for (const [agent, agentExts] of Object.entries(routing)) {
      if (agentExts.includes(ext)) {
        scores.set(agent, (scores.get(agent) ?? 0) + 1);
      }
    }
  }
  if (scores.size === 0) return null;

  let best: string | null = null;
  let bestScore = 0;
  for (const [agent, score] of scores) {
    if (score > bestScore) {
      bestScore = score;
      best = agent;
    }
  }
  return best;
}

// ── State Management ──────────────────────────────────────────

function getStateDir(projectDir: string): string {
  const dir = join(projectDir, ".agents", "state");
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  return dir;
}

function activateMode(
  projectDir: string,
  workflow: string,
  sessionId: string,
): void {
  // Never persist a workflow under the unresolved-session fallback id: such a
  // file cannot be isolated per session and would cross-contaminate any later
  // session that also resolves to UNKNOWN_SESSION_ID. The workflow context is
  // still injected by the caller — it just won't be enforced across stops.
  if (sessionId === UNKNOWN_SESSION_ID) return;
  const state: ModeState = {
    workflow,
    sessionId,
    activatedAt: new Date().toISOString(),
    reinforcementCount: 0,
  };
  writeFileSync(
    join(getStateDir(projectDir), `${workflow}-state-${sessionId}.json`),
    JSON.stringify(state, null, 2),
  );
}

async function activateL1WorkflowSession(
  projectDir: string,
  workflow: string,
  vendor: string,
  vendorSid: string,
  category = "main",
): Promise<string | null> {
  try {
    const [{ setActiveSession }, { createEventId, emitEvent }] =
      await Promise.all([
        import("./state-marker.ts"),
        import("./state-emit.ts"),
      ]);
    const sid = `oma-${createEventId()}`;
    setActiveSession(projectDir, category, sid);
    await emitEvent(projectDir, sid, {
      kind: "session.created",
      vendor,
      vendorSid,
      payload: { workflow, category },
    });
    return sid;
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    process.stderr.write(`[oma] L1 session activation failed: ${msg}\n`);
    return null;
  }
}

// ── Deactivation Detection ───────────────────────────────────

export const DEACTIVATION_PHRASES: Record<string, string[]> = {
  en: ["workflow done", "workflow complete", "workflow finished"],
  ko: ["워크플로우 완료", "워크플로우 종료", "워크플로우 끝"],
  ja: ["ワークフロー完了", "ワークフロー終了"],
  zh: ["工作流完成", "工作流结束"],
  es: ["flujo completado", "flujo terminado"],
  fr: ["flux terminé", "flux complété"],
  de: ["workflow abgeschlossen", "workflow fertig"],
  pt: ["fluxo concluído", "fluxo terminado"],
  ru: ["воркфлоу завершён", "рабочий процесс завершён"],
  nl: ["workflow voltooid", "workflow klaar"],
  pl: ["workflow zakończony", "workflow ukończony"],
};

export function isDeactivationRequest(prompt: string, lang: string): boolean {
  const phrases = [
    ...(DEACTIVATION_PHRASES.en ?? []),
    ...(lang !== "en" ? (DEACTIVATION_PHRASES[lang] ?? []) : []),
  ];
  const normalized = normalizeForMatching(prompt);
  return phrases.some((phrase) =>
    normalized.includes(normalizeForMatching(phrase)),
  );
}

export function deactivateAllPersistentModes(
  projectDir: string,
  sessionId?: string,
): void {
  const stateDir = join(projectDir, ".agents", "state");
  if (!existsSync(stateDir)) return;
  try {
    const files = readdirSync(stateDir);
    for (const file of files) {
      // Match session-scoped state files: {workflow}-state-{sessionId}.json
      if (sessionId) {
        if (file.endsWith(`-state-${sessionId}.json`)) {
          unlinkSync(join(stateDir, file));
        }
      } else if (/-state-/.test(file) && file.endsWith(".json")) {
        unlinkSync(join(stateDir, file));
      }
    }
  } catch {
    // ignore cleanup errors
  }
}

// ── Specificity ranking ───────────────────────────────────────

/**
 * One surviving pattern match for one workflow, carrying everything the
 * ranking rules in `pickWinningCandidate` need. Built once per successful
 * `pattern.exec()` across ALL workflows in `config.workflows` — the matching
 * loop no longer returns on the first hit; it collects every candidate
 * first and lets specificity decide the winner.
 */
export interface WorkflowCandidate {
  workflow: string;
  persistent: boolean;
  /** Index of the match within the cleaned (stripped/normalized) text. */
  matchIndex: number;
  matchText: string;
  /** Position re-located in the ORIGINAL prompt — used for tie-break #3. */
  origIndex: number;
  /** Length of the specific text that matched (trimmed keyword or, for a
   * `patterns` intent-regex hit, the trimmed match[0] span) — rule #1. */
  keywordLength: number;
  /** Whether the specificity text contains whitespace — rule #2. */
  isMultiWord: boolean;
  /** Index of this workflow in triggers.json `workflows` — rule #4 (final
   * tiebreak, preserves the pre-ranking first-declared-wins behavior). */
  declarationIndex: number;
  /** True if any suppression filter (RC3 technical-reference is a hard drop
   * and never reaches this point; informational-context / pasted-content /
   * reinforcement) applies to this specific match. */
  suppressed: boolean;
}

/**
 * Pick the winning candidate among all workflow matches collected for a
 * prompt, or `null` if none survive.
 *
 * Ranking order (only consulted on a tie with the previous rule):
 *   1. Longest matched keyword/phrase wins — "deepsec pr review" (18 chars)
 *      beats "review" (6 chars) even though "review" also literally matches
 *      as a substring of the same sentence.
 *   2. A multi-word/compound match beats a single-word match of equal
 *      length (defensive tiebreak; rule 1 already separates most real
 *      cases since compound phrases are almost always longer).
 *   3. Earliest match position in the ORIGINAL prompt wins — mirrors the
 *      existing "keyword near the front = command position" heuristic used
 *      elsewhere in this file (RC2 pasted-content guard).
 *   4. Final tiebreak: declaration order in triggers.json `workflows` —
 *      i.e. the original pre-ranking first-match-wins behavior, kept only
 *      as a last resort when two workflows are otherwise indistinguishable.
 *
 * DESIGN DECISION (round-1 trigger demotion, part A): suppression is
 * evaluated PER CANDIDATE, not globally. A candidate flagged `suppressed`
 * (by the informational-context window, the persistent-mode pasted-content
 * limit, or reinforcement) is simply removed from the ranking pool — it
 * does NOT veto a *different*, unsuppressed candidate from a more generic
 * workflow. Reasoning: every existing suppression filter in this file
 * already operates locally, on one match at a time (a suppressed hit in one
 * workflow's pattern loop has always fallen through to the next
 * pattern/workflow, never blocking unrelated matches elsewhere in the same
 * prompt) — ranking preserves that locality instead of upgrading it into a
 * prompt-wide veto. The alternative (any suppressed specific match blocks
 * the whole prompt from firing anything) would silence genuine, independent
 * requests that merely share a sentence with a meta-mention of a more
 * specific workflow. See triggers-corpus.json for a case that locks this in:
 * a prompt that asks an informational "what is X" question about a specific
 * workflow AND, separately, makes a genuine generic request — the generic
 * request still fires.
 */
export function pickWinningCandidate(
  candidates: WorkflowCandidate[],
): WorkflowCandidate | null {
  const eligible = candidates.filter((c) => !c.suppressed);
  if (eligible.length === 0) return null;
  eligible.sort((a, b) => {
    if (b.keywordLength !== a.keywordLength) {
      return b.keywordLength - a.keywordLength;
    }
    if (a.isMultiWord !== b.isMultiWord) {
      return a.isMultiWord ? -1 : 1;
    }
    if (a.origIndex !== b.origIndex) {
      return a.origIndex - b.origIndex;
    }
    return a.declarationIndex - b.declarationIndex;
  });
  return eligible[0] ?? null;
}

// ── Pure handler (canonical ABI) ─────────────────────────────

/**
 * Pure decision function — the single logic source for keyword detection.
 *
 * Called in-process by `oma hook` dispatch (Task 3+) and by the standalone
 * `main()` entry below (pi subprocess path). Both paths share exactly this
 * code; no business logic is duplicated.
 *
 * Returns a `context` HandlerResult when a workflow keyword matches, or
 * `null` when no match / early-exit condition (no stdout side-effect here).
 *
 * NOTE: `ctx.cwd` is expected to be the resolved git-root project directory,
 * as computed by `getProjectDir()` in the standalone path.
 */
export async function run(
  input: HookInput,
  ctx: HandlerCtx,
): Promise<HandlerResult | null> {
  if (input.kind !== "prompt") return null;

  const { prompt } = input;
  const { vendor, cwd: projectDir, sid: sessionId = "unknown" } = ctx;

  if (!prompt.trim()) return null;
  if (startsWithSlashCommand(prompt)) return null;
  // Relayed inter-agent messages carry another agent's text, not a user
  // request — their content must not drive workflow keyword detection.
  if (isRelayedAgentMessage(prompt)) return null;

  const config = loadConfig();
  const lang = detectLanguage(projectDir);

  // Check for deactivation request before workflow detection
  if (isDeactivationRequest(prompt, lang)) {
    deactivateAllPersistentModes(projectDir, sessionId);
    // Grok's resume context lives in a session-start file, not L1 stdout — clear it.
    if (vendor === "grok") clearGrokContext(projectDir);
    return null;
  }

  const infoPatterns = buildInformationalPatterns(config);
  // Guard 2: Strip code blocks, inline code, and pasted system-echo blocks
  // before scanning for keywords. NFKC normalization collapses fullwidth Latin.
  const cleaned = normalizeForMatching(
    stripSystemEchoes(stripCodeBlocks(prompt)),
  );
  const excluded = new Set(config.excludedWorkflows);

  // Guard 3: Load reinforcement suppression state
  const kwState = loadKwState(projectDir);

  // Skip persistent workflows entirely if the prompt is an analytical question
  const analytical = isAnalyticalQuestion(cleaned);

  // shouldSkipAllWorkflows does not depend on the workflow being evaluated —
  // hoisted out of the loop (was re-checked on every iteration pre-ranking).
  if (shouldSkipAllWorkflows(cleaned)) return null;

  // Position guard must reflect the user's ACTUAL prompt, not the
  // content-stripped text. stripCodeBlocks/stripSystemEchoes remove quoted
  // and code spans, which shrinks the text and pulls keywords toward the
  // front — defeating the "deep in a long prompt = not an instruction"
  // heuristic (a keyword genuinely at char 245 of a discussion can appear
  // at char 179 after stripping, slipping under PERSISTENT_MATCH_LIMIT).
  const origPrompt = normalizeForMatching(prompt);

  // Collect every surviving match across every workflow first — specificity
  // ranking (see pickWinningCandidate) decides the winner, replacing the old
  // declaration-order first-match-wins loop.
  const candidates: WorkflowCandidate[] = [];
  const workflowEntries = Object.entries(config.workflows);

  for (
    let declarationIndex = 0;
    declarationIndex < workflowEntries.length;
    declarationIndex++
  ) {
    const entry = workflowEntries[declarationIndex];
    if (!entry) continue;
    const [workflow, def] = entry;
    if (excluded.has(workflow)) continue;

    const workflowPredicate = KEYWORD_SKIP_PREDICATES[workflow];
    if (workflowPredicate?.(cleaned)) continue;

    if (analytical && def.persistent) continue;

    const reinforced = isReinforcementSuppressed(kwState, workflow);

    const considerMatch = (regex: RegExp, specificityText: string) => {
      const match = regex.exec(cleaned);
      if (!match) return;
      // RC3: compound technical tokens (ralph:verify, ralph.md,
      // workflows/ralph) reference the workflow as an artifact, not a run
      // request — dropped entirely, never becomes a candidate.
      if (isTechnicalReference(cleaned, match.index, match[0])) return;

      // Re-locate the matched keyword in the original prompt for the
      // pasted-content position guard.
      const origIndex = origPrompt.indexOf(match[0]);
      const posIndex = origIndex >= 0 ? origIndex : match.index;
      const informational = isInformationalContext(
        cleaned,
        match.index,
        infoPatterns,
      );
      const pasted = isPastedContent(
        posIndex,
        def.persistent,
        origPrompt.length,
      );
      const text = specificityText.trim();

      candidates.push({
        workflow,
        persistent: def.persistent,
        matchIndex: match.index,
        matchText: match[0],
        origIndex: posIndex,
        keywordLength: text.length,
        isMultiWord: /\s/.test(text),
        declarationIndex,
        suppressed: informational || pasted || reinforced,
      });
    };

    for (const { regex, keyword } of buildPatternEntries(
      def.keywords,
      lang,
      config.cjkScripts,
    )) {
      considerMatch(regex, keyword);
    }
    for (const { regex, source } of buildRawPatternEntries(
      def.patterns,
      lang,
    )) {
      considerMatch(regex, source);
    }
  }

  const winner = pickWinningCandidate(candidates);
  if (!winner) return null;

  const { workflow } = winner;

  if (winner.persistent) {
    activateMode(projectDir, workflow, sessionId);
  }
  await activateL1WorkflowSession(projectDir, workflow, vendor, sessionId);
  const updatedState = recordKwTrigger(kwState, workflow);
  saveKwState(projectDir, updatedState);

  const contextLines = [
    `[OMA WORKFLOW: ${workflow.toUpperCase()}]`,
    `User intent matches the /${workflow} workflow.`,
    `Read and follow \`.agents/workflows/${workflow}.md\` step by step.`,
    `User request: ${prompt}`,
    `IMPORTANT: Start the workflow IMMEDIATELY. Do not ask for confirmation.`,
  ];

  if (config.extensionRouting) {
    const extensions = detectExtensions(prompt);
    const agent = resolveAgentFromExtensions(
      extensions,
      config.extensionRouting,
    );
    if (agent) {
      contextLines.push(`[OMA AGENT HINT: ${agent}]`);
    }
  }

  return { type: "context", additionalContext: contextLines.join("\n") };
}

// ── Standalone entry (pi subprocess / direct bun invocation) ──

async function main() {
  const raw = readFileSync(0, "utf-8");
  let input: Record<string, unknown>;
  try {
    input = JSON.parse(raw);
  } catch {
    process.exit(0);
  }

  // Guard 1: Only process genuine user prompts — skip agent-generated content
  if (!isGenuineUserPrompt(input)) process.exit(0);

  const vendor = detectVendor(input);
  const projectDir = getProjectDir(vendor, input);
  const sessionId = getSessionId(input);
  let prompt = normalizePromptInput(input.prompt);

  // agy's PreInvocation stdin carries no `prompt` — recover the user request
  // from the transcript. PreInvocation fires before every model call, so only
  // act on the first invocation of a turn (invocationNum) to avoid re-running
  // keyword detection mid-turn.
  if (vendor === "antigravity" && !prompt) {
    const invocationNum = input.invocationNum;
    if (typeof invocationNum === "number" && invocationNum > 1) process.exit(0);
    prompt = readAgyPrompt(input.transcriptPath);
  }

  // Build canonical inputs and delegate to run() — single logic source.
  const hookInput: HookInput = { kind: "prompt", prompt, cwd: projectDir };
  const ctx: HandlerCtx = { vendor, cwd: projectDir, sid: sessionId };

  const result = await run(hookInput, ctx);
  if (result && result.type === "context") {
    process.stdout.write(makePromptOutput(vendor, result.additionalContext));
  }
  process.exit(0);
}

if (import.meta.main) {
  main().catch(() => process.exit(0));
}
