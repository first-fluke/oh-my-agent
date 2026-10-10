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
import { agyConversationId, readAgyPrompt } from "./agy-input.ts";
import { UNKNOWN_SESSION_ID, VENDORS } from "./constants.ts";
import { makePromptOutput } from "./hook-output.ts";
import { isRelayedAgentMessage, normalizePromptInput } from "./prompt-input.ts";
// triggers.json is imported statically: the bundler inlines it into the oma
// binary (bundled `oma hook run` path needs no file on disk), while a standalone
// bun run resolves the sibling file next to this module (pi / direct run).
import embeddedTriggers from "./triggers.json" with { type: "json" };
import type {
  HandlerCtx,
  HandlerResult,
  HookInput,
  ModeState,
} from "./types.ts";
import { detectVendorFromInput, getProjectDir } from "./vendor-detect.ts";

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
// Require a resource and action so conversational mentions of OMA still trigger.
const OMA_RESOURCE_ACTION = String.raw`oma\s+(?:schedule|memory|model|state|goal|ralph|auth|dashboard|hook|skill|slide|image|video|vault|search|serena)\s+(?:create|list|delete|run|sync|daemon|service|retry|maintain|init|setup|status|import|gc|upgrade|check|probe|propose|get|activate|archive|purge|repair|verify|emit|decisions|inject-log|summary|heal-check|set|terminal|web|audit|lint|eval|optimize|preview|export|asset|style|vendor|provider|api|rss|reaper)(?=\s|$)`;

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
 *      Examples: 'oma agent spawn brainstorm', 'claude --help',
 *      'codex exec --workflow ralph', 'cursor agent', 'qwen run'.
 */
export const CLI_INVOCATION_AT_START = new RegExp(
  `^\\s*(?:${OMA_RESOURCE_ACTION}|\\/(?:${BRANDS_RE_SOURCE}):|(?:${BRANDS_RE_SOURCE})\\s+(?:${SIGNALS_RE_SOURCE}))`,
  "i",
);

/**
 * Per-workflow skip predicates. A workflow listed here will be skipped when
 * its predicate returns true for the (already-normalized) cleaned text.
 * Visual design requires a visual target; generic design verbs also describe
 * skill authoring, APIs, schemas, and other nonvisual work.
 */
export const KEYWORD_SKIP_PREDICATES: Record<
  string,
  (text: string) => boolean
> = {
  design: (text) => !hasVisualDesignContext(text),
};

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

function getSessionId(input: Record<string, unknown>): string {
  return (
    (input.sessionId as string) ||
    (input.session_id as string) ||
    agyConversationId(input) ||
    UNKNOWN_SESSION_ID
  );
}

// ── Config Loading ────────────────────────────────────────────

export interface TriggerWorkflowDef {
  persistent: boolean;
  keywords: Record<string, string[]>;
  patterns?: Record<string, string[]>;
  /**
   * Persistent workflows only: the subset of `keywords` that counts as an
   * EXPLICIT invocation (the workflow's own name, e.g. "ultrawork", "ralph").
   * Only an explicit match writes the persistent-mode state file the Stop
   * hook enforces; any other keyword/pattern match just injects the workflow
   * context as a suggestion. Every entry must also appear in `keywords`.
   */
  explicit?: string[];
}

export interface TriggerConfig {
  workflows: Record<string, TriggerWorkflowDef>;
  informationalPatterns: Record<string, string[]>;
  excludedWorkflows: string[];
  extensionRouting?: Record<string, string[]>;
}

/**
 * The embedded (bundler-inlined / sibling-resolved) triggers config. Read
 * only — handlers never mutate it, so it is shared instead of cloned per call.
 */
const TRIGGERS = embeddedTriggers as unknown as TriggerConfig;

// ── Pattern Builder ───────────────────────────────────────────

export function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Merge a language-keyed keyword/pattern bank into a single flat list:
 * universal ("*") + English + EVERY other language's entries, deduped
 * case-insensitively. Same rationale as RC4 (buildInformationalPatterns):
 * users prompt in whichever language they think in — `language` in
 * oma-config.yaml controls the RESPONSE language, not the prompt language —
 * so gating by config language silently disabled e.g. every Korean trigger
 * for `language: en` projects. A keyword written in language X can only
 * match a prompt that contains X-script text (current banks are en/ko/ja/zh;
 * if a Latin-script bank like es/fr is ever added, phrase distinctiveness is
 * the gate instead), so merging all languages cannot fire on unrelated
 * prompts. Shared by buildPatterns and buildRawPatterns — both keyword banks
 * and pattern banks use this exact `Record<string, string[]>` shape.
 */
export function collectLangEntries(bank: Record<string, string[]>): string[] {
  const ordered = [
    ...(bank["*"] ?? []),
    ...(bank.en ?? []),
    ...Object.entries(bank)
      .filter(([key]) => key !== "*" && key !== "en")
      .flatMap(([, entries]) => entries),
  ];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const entry of ordered) {
    const key = entry.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(entry);
  }
  return out;
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

/**
 * Compile one literal keyword. The boundary choice depends only on the
 * keyword itself, never on the configured response language: ASCII keywords
 * get hyphen-rejecting word boundaries, keywords containing non-ASCII text
 * (CJK, accented Latin, Cyrillic) match as substrings because those scripts
 * attach particles/inflections directly to the word. Gating this on
 * `language: ko|ja|zh` used to strip the boundaries from EVERY ASCII keyword
 * in CJK-configured projects, so "network" fired `work` and "preview" fired
 * `review`. Hangul/kana/Han are not `\w`, so a boundary-wrapped ASCII keyword
 * still matches when a CJK particle follows it ("ralph로").
 */
export function compileKeyword(kw: string): RegExp {
  const escaped = escapeRegex(kw).replace(/\s+/g, "\\s+");
  return /[^\p{ASCII}]/u.test(kw)
    ? new RegExp(escaped, "i")
    : new RegExp(`(?:^|[^\\w-])${escaped}(?:$|[^\\w-])`, "i");
}

export function buildPatternEntries(
  keywords: Record<string, string[]>,
): KeywordPatternEntry[] {
  return collectLangEntries(keywords).map((kw) => ({
    regex: compileKeyword(kw),
    keyword: kw,
  }));
}

export function buildPatterns(keywords: Record<string, string[]>): RegExp[] {
  return buildPatternEntries(keywords).map((e) => e.regex);
}

// These words name the act of designing, but do not identify a visual target.
// Keep the remaining visual vocabulary in triggers.json as the shared source.
const GENERIC_DESIGN_KEYWORDS = new Set([
  "design",
  "디자인",
  "디자인해줘",
  "디자인 만들어줘",
  "デザイン",
  "デザインして",
  "デザインを作って",
  "设计",
  "设计一下",
  "做个设计",
  "diseño",
  "diseña",
  "crea un diseño",
  "haz el diseño",
  "fais le design",
  "crée un design",
  "gestalte",
  "erstelle ein design",
  "mach das design",
  "faça o design",
  "crie um design",
  "monte o design",
  "дизайн",
  "сделай дизайн",
  "создай дизайн",
  "оформи",
  "ontwerp",
  "ontwerp dit",
  "maak een ontwerp",
  "projekt",
  "zaprojektuj",
  "stwórz projekt",
  "zrób design",
]);

const VISUAL_DESIGN_PATTERNS = [
  /\bdesign\s+(?:(?:a|an|the|this|our|new)\s+)?(?:ui|ux)\b(?=\s*(?:$|[.!?,;]|\b(?:for|of|to|and)\b))/,
  ...buildPatternEntries(TRIGGERS.workflows.design?.keywords ?? {})
    .filter(
      ({ keyword }) => !GENERIC_DESIGN_KEYWORDS.has(keyword.toLowerCase()),
    )
    .map(({ regex }) => regex),
  ...buildPatterns({
    en: ["screen", "page", "website", "interface"],
    ko: ["화면", "페이지", "웹사이트", "UI를", "UX를"],
    ja: ["画面", "ページ"],
    zh: ["页面", "界面"],
  }),
];

function hasVisualDesignContext(text: string): boolean {
  if (/(?:^|\s)\/design(?![\w-])/.test(text)) return true;
  return VISUAL_DESIGN_PATTERNS.some((pattern) => {
    const match = pattern.exec(text);
    return match !== null && !isTechnicalReference(text, match.index, match[0]);
  });
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
): RawPatternEntry[] {
  if (!patterns) return [];
  const compiled: RawPatternEntry[] = [];
  for (const raw of collectLangEntries(patterns)) {
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
): RegExp[] {
  return buildRawPatternEntries(patterns).map((e) => e.regex);
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
  if (infoPatterns.some((p) => p.test(window))) return true;
  if (
    /\?\s*$/.test(prompt.trim()) &&
    infoPatterns.some((p) => p.test(prompt))
  ) {
    return true;
  }
  return false;
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
 *   `oma ralph verify`            keyword + ':' + word  (CLI subcommand)
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
  // keyword token itself.
  const m = matchText.match(/^([^\w-]?)(.*?)([^\w-]?)$/);
  const leadingNonWord = m?.[1]?.length ?? 0;
  const token = m?.[2] ?? matchText;
  const tokenStart = matchIndex + leadingNonWord;
  const tokenEnd = tokenStart + token.length;

  const charBefore = tokenStart > 0 ? text[tokenStart - 1] : "";
  const charAfter = tokenEnd < text.length ? text[tokenEnd] : "";

  // 1. Path segment: preceded by '/' AND a word char before that slash
  //    (excludes leading-slash invocations like "/ralph" where charBefore-1 is start or space).
  if (
    charBefore === "/" &&
    tokenStart >= 2 &&
    /[\w-]/.test(text[tokenStart - 2] ?? "")
  ) {
    return true;
  }

  // 2. CLI subcommand: followed by ':' AND a word char after that colon
  //    (excludes prose colons like "ralph: do this" where charAfter+1 is space).
  if (
    charAfter === ":" &&
    tokenEnd + 1 < text.length &&
    /[\w-]/.test(text[tokenEnd + 1] ?? "")
  ) {
    return true;
  }

  // 3. File extension or property: followed by '.' AND a word char after that dot
  //    (excludes sentence-ending periods like "run ralph." where charAfter+1 is space/end).
  if (
    charAfter === "." &&
    tokenEnd + 1 < text.length &&
    /[\w-]/.test(text[tokenEnd + 1] ?? "")
  ) {
    return true;
  }

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
  /^.*(버그|문제|오류|에러)\s*(임|인가|인가요|야|이야|인지|\?)/,
  /^.*(이거|이것|그거|그것)(도|는)?\s*(버그|문제|오류|에러)/,
  // Korean meta-continuation patterns (referring to prior discussion)
  /^.*그것도/,
  /^.*보강할/,
  // English question patterns
  /^.*\bis there\b/i,
  /^.*\bare there\b/i,
  /^.*\banything worth\b/i,
  /^.*\bwhat.*(feature|difference|reference)/i,
  /^.*\bcompare\b/i,
  /^.*\b(is this|is it|is that)\s+(a\s+)?(bug|issue|problem|error)\b/i,
];

/**
 * Content-agnostic interrogative test. A line that BOTH leads with an
 * interrogative word AND ends with '?' is a question *about* something, not a
 * command — regardless of the topic. This generalises to any subject
 * (including workflow names) without enumerating topic words, unlike
 * QUESTION_PATTERNS which match specific phrasings.
 */
// The '?' terminator is the strong gate, so the interrogative word can be a
// loose contains — suppressing a question that merely contains a workflow name
// is exactly the desired behaviour.
const INTERROGATIVE_WORD =
  /(?:왜|어째서|어떻게|무슨|무엇|뭐|뭔|뭣|어디|언제|누가|누구|어느|버그|문제|에러|맞나|인가|인지|맞아|인가요|\bwhy\b|\bwhats?\b|\bhow\b|\bwhen\b|\bwhere\b|\bwhich\b|\bwhose\b|\bbug\b|\bissue\b|\bproblem\b|\berror\b)/i;

function isInterrogativeSentence(line: string): boolean {
  return /\?\s*$/.test(line) && INTERROGATIVE_WORD.test(line);
}

function firstAndLastLines(prompt: string): [string, string] {
  const lines = prompt
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
  return [lines[0] ?? "", lines[lines.length - 1] ?? ""];
}

export function isAnalyticalQuestion(prompt: string): boolean {
  const [firstLine, lastLine] = firstAndLastLines(prompt);
  return (
    isInterrogativeSentence(firstLine) ||
    isInterrogativeSentence(lastLine) ||
    QUESTION_PATTERNS.some((p) => p.test(firstLine) || p.test(lastLine))
  );
}

/**
 * True when the first or last line ends with '?'. Broader than
 * isAnalyticalQuestion: it also covers yes/no questions with no interrogative
 * word ("Does this work on Windows?", "계속해줄래?"). Used only to keep
 * NATURAL-LANGUAGE matches of persistent workflows from firing — an explicit
 * invocation phrased politely ("ultrawork로 해줄래?") still activates.
 * Callers pass NFKC-normalized text, so a fullwidth '？' is already '?'.
 */
export function hasQuestionLine(prompt: string): boolean {
  return firstAndLastLines(prompt).some((line) => /\?\s*$/.test(line));
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
  omaSid?: string | null,
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
    ...(omaSid ? { omaSid } : {}),
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
    const [
      { setActiveSession },
      { createSessionId, emitEvent, vendorHomePayload },
    ] = await Promise.all([
      import("./state-marker.ts"),
      import("./state-emit.ts"),
    ]);
    const sid = createSessionId();
    setActiveSession(projectDir, category, sid);
    await emitEvent(projectDir, sid, {
      kind: "session.created",
      vendor,
      vendorSid,
      payload: { workflow, category, ...vendorHomePayload(vendor) },
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

export function isDeactivationRequest(prompt: string): boolean {
  // All languages merged, never gated by config language (same rationale as
  // collectLangEntries): a user prompting in Korean must be able to say
  // "워크플로우 완료" even when `language: en`. A phrase only matches a prompt
  // actually written in that language, so merging cannot misfire.
  const phrases = Object.values(DEACTIVATION_PHRASES).flat();
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
   * reinforcement / question-gated natural language) applies to this match. */
  suppressed: boolean;
  /** True when the matched keyword is one of the workflow's `explicit`
   * invocations — rule #0, and the only way to activate persistent mode. */
  explicit?: boolean;
}

/**
 * Pick the winning candidate among all workflow matches collected for a
 * prompt, or `null` if none survive.
 *
 * Ranking order (only consulted on a tie with the previous rule):
 *   0. An explicit invocation (the workflow's own name, `explicit` in
 *      triggers.json) beats any natural-language match: "orchestrate this
 *      step by step" names orchestrate even though "step by step" is longer.
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
    if (Boolean(a.explicit) !== Boolean(b.explicit)) {
      return a.explicit ? -1 : 1;
    }
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

// ── Compiled trigger cache ────────────────────────────────────

interface CompiledWorkflow {
  workflow: string;
  def: TriggerWorkflowDef;
  declarationIndex: number;
  /** Lowercased `explicit` invocations (persistent workflows only). */
  explicit: ReadonlySet<string>;
  keywordEntries: KeywordPatternEntry[];
  rawEntries: RawPatternEntry[];
}

interface CompiledTriggers {
  workflows: CompiledWorkflow[];
  infoPatterns: RegExp[];
  excluded: ReadonlySet<string>;
}

// Regexes are compiled without the `g` flag, so exec() is stateless and the
// compiled set can be shared across run() calls (the in-process `oma hook
// run` path and long-lived test workers call run() many times).
const compiledCache = new WeakMap<TriggerConfig, CompiledTriggers>();

export function compileTriggers(config: TriggerConfig): CompiledTriggers {
  const cached = compiledCache.get(config);
  if (cached) return cached;
  const compiled: CompiledTriggers = {
    workflows: Object.entries(config.workflows).map(
      ([workflow, def], declarationIndex) => ({
        workflow,
        def,
        declarationIndex,
        explicit: new Set(
          (def.persistent ? (def.explicit ?? []) : []).map((kw) =>
            kw.toLowerCase(),
          ),
        ),
        keywordEntries: buildPatternEntries(def.keywords),
        rawEntries: buildRawPatternEntries(def.patterns),
      }),
    ),
    infoPatterns: buildInformationalPatterns(config),
    excluded: new Set(config.excludedWorkflows),
  };
  compiledCache.set(config, compiled);
  return compiled;
}

/**
 * Injected context for a winning match. Explicit invocations and
 * non-persistent workflows start immediately; a persistent workflow inferred
 * from natural language is only suggested — persistent mode is not active, so
 * the agent decides whether the request really calls for it.
 */
export function buildWorkflowContext(
  workflow: string,
  options: { persistent: boolean; explicit: boolean; explicitExample?: string },
): string[] {
  const header = `[OMA WORKFLOW: ${workflow.toUpperCase()}]`;
  const doc = `\`.agents/workflows/${workflow}.md\``;
  if (options.persistent && !options.explicit) {
    const example = options.explicitExample
      ? ` (e.g. "${options.explicitExample}")`
      : "";
    return [
      header,
      `User intent may match the /${workflow} workflow (inferred from natural language, not an explicit invocation).`,
      `If the request clearly calls for it, read and follow ${doc}; otherwise handle the request directly.`,
      `Persistent mode was NOT activated: it starts only when the user names the workflow explicitly${example}.`,
    ];
  }
  return [
    header,
    `User intent matches the /${workflow} workflow.`,
    `Read and follow ${doc} step by step.`,
    `IMPORTANT: Start the workflow IMMEDIATELY. Do not ask for confirmation.`,
  ];
}

// ── Pure handler (canonical ABI) ─────────────────────────────

/**
 * Pure decision function — the single logic source for keyword detection.
 *
 * Called in-process by `oma hook run` dispatch (Task 3+) and by the standalone
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

  const config = TRIGGERS;

  // Check for deactivation request before workflow detection
  if (isDeactivationRequest(prompt)) {
    deactivateAllPersistentModes(projectDir, sessionId);
    return null;
  }

  const compiled = compileTriggers(config);
  const { infoPatterns } = compiled;
  // Guard 2: Strip code blocks, inline code, and pasted system-echo blocks
  // before scanning for keywords. NFKC normalization collapses fullwidth Latin.
  const cleaned = normalizeForMatching(
    stripSystemEchoes(stripCodeBlocks(prompt)),
  );

  // Guard 3: Load reinforcement suppression state
  const kwState = loadKwState(projectDir);

  // Skip persistent workflows entirely if the prompt is an analytical question
  const analytical = isAnalyticalQuestion(cleaned);
  // Yes/no questions ("Does this work on Windows?") keep natural-language
  // persistent matches from firing; explicit invocations are exempt.
  const questionLike = hasQuestionLine(cleaned);

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

  for (const {
    workflow,
    def,
    declarationIndex,
    explicit: explicitKeywords,
    keywordEntries,
    rawEntries,
  } of compiled.workflows) {
    if (compiled.excluded.has(workflow)) continue;

    const workflowPredicate = KEYWORD_SKIP_PREDICATES[workflow];
    if (workflowPredicate?.(cleaned)) continue;

    if (analytical && def.persistent) continue;

    const reinforced = isReinforcementSuppressed(kwState, workflow);

    const considerMatch = (
      regex: RegExp,
      specificityText: string,
      explicit: boolean,
    ) => {
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
      // A persistent workflow inferred from natural language inside a
      // question is not a request to start it.
      const questionGated = def.persistent && !explicit && questionLike;

      candidates.push({
        workflow,
        persistent: def.persistent,
        matchIndex: match.index,
        matchText: match[0],
        origIndex: posIndex,
        keywordLength: text.length,
        isMultiWord: /\s/.test(text),
        declarationIndex,
        suppressed: informational || pasted || reinforced || questionGated,
        explicit,
      });
    };

    for (const { regex, keyword } of keywordEntries) {
      considerMatch(
        regex,
        keyword,
        explicitKeywords.has(keyword.toLowerCase()),
      );
    }
    for (const { regex, source } of rawEntries) {
      considerMatch(regex, source, false);
    }
  }

  const winner = pickWinningCandidate(candidates);
  if (!winner) return null;

  const { workflow } = winner;
  const explicit = winner.explicit === true;

  // Activate the L1 session first so its sid can be recorded in the
  // persistent-mode state file (the Stop hook emits gate events under it).
  const omaSid = await activateL1WorkflowSession(
    projectDir,
    workflow,
    vendor,
    sessionId,
  );
  // Only an explicit invocation enables persistent mode (the Stop hook blocks
  // while the state file exists). Natural-language matches such as "keep
  // going" or "implement the login feature" only suggest the workflow.
  if (winner.persistent && explicit) {
    activateMode(projectDir, workflow, sessionId, omaSid);
  }
  const updatedState = recordKwTrigger(kwState, workflow);
  saveKwState(projectDir, updatedState);

  const contextLines = buildWorkflowContext(workflow, {
    persistent: winner.persistent,
    explicit,
    explicitExample: config.workflows[workflow]?.explicit?.[0],
  });

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

  const vendor = detectVendorFromInput(input, "prompt", import.meta.filename);
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
