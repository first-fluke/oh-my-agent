#!/usr/bin/env bun
/**
 * oh-my-agent — Prompt Hook (keyword detection)
 *
 * Works with: Claude Code (UserPromptSubmit), Codex CLI (UserPromptSubmit), Gemini CLI (BeforeAgent)
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
import { VENDORS } from "./constants.ts";
import { resolveGitRoot } from "./fs-utils.ts";
import { makePromptOutput } from "./hook-output.ts";
import type { ModeState, Vendor } from "./types.ts";

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
 * in `VENDORS` (claude, codex, cursor, gemini, qwen). The vendor list is
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
 *      'codex exec --workflow ralph', 'gemini agent', 'cursor agent',
 *      'qwen run'.
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
  "beforeSubmitPrompt", // Cursor
  "BeforeAgent", // Gemini (fires before agent processes user prompt)
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

function inferVendorFromScriptPath(): Vendor | null {
  const path = import.meta.filename;
  if (path.includes(`${join(".cursor", "hooks")}`)) return "cursor";
  if (path.includes(`${join(".qwen", "hooks")}`)) return "qwen";
  if (path.includes(`${join(".claude", "hooks")}`)) return "claude";
  if (path.includes(`${join(".gemini", "hooks")}`)) return "gemini";
  if (path.includes(`${join(".codex", "hooks")}`)) return "codex";
  return null;
}

function detectVendor(input: Record<string, unknown>): Vendor {
  const event = input.hook_event_name as string | undefined;
  const byScriptPath = inferVendorFromScriptPath();
  if (byScriptPath) return byScriptPath;
  if (event === "BeforeAgent") return "gemini";
  if (event === "beforeSubmitPrompt") return "cursor";
  if (event === "UserPromptSubmit") {
    // Codex uses snake_case session_id, Claude uses camelCase sessionId
    if ("session_id" in input && !("sessionId" in input)) return "codex";
  }
  // Qwen Code sets QWEN_PROJECT_DIR; Claude sets CLAUDE_PROJECT_DIR
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
    case "qwen":
      dir = process.env.QWEN_PROJECT_DIR || process.cwd();
      break;
    default:
      dir = process.env.CLAUDE_PROJECT_DIR || process.cwd();
      break;
  }
  return resolveGitRoot(dir);
}

function getSessionId(input: Record<string, unknown>): string {
  return (
    (input.sessionId as string) || (input.session_id as string) || "unknown"
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

function loadConfig(): TriggerConfig {
  const configPath = join(import.meta.dirname, "triggers.json");
  return JSON.parse(readFileSync(configPath, "utf-8"));
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

export function buildPatterns(
  keywords: Record<string, string[]>,
  lang: string,
  cjkScripts: string[],
): RegExp[] {
  const allKeywords = [
    ...(keywords["*"] ?? []),
    ...(keywords.en ?? []),
    ...(lang !== "en" ? (keywords[lang] ?? []) : []),
  ];

  return allKeywords.map((kw) => {
    const escaped = escapeRegex(kw).replace(/\s+/g, "\\s+");
    if (cjkScripts.includes(lang) || /[^\p{ASCII}]/u.test(kw)) {
      return new RegExp(escaped, "i");
    }
    return new RegExp(`(?:^|[^\\w-])${escaped}(?:$|[^\\w-])`, "i");
  });
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
  if (!patterns) return [];
  const all = [
    ...(patterns["*"] ?? []),
    ...(patterns.en ?? []),
    ...(lang !== "en" ? (patterns[lang] ?? []) : []),
  ];
  const compiled: RegExp[] = [];
  for (const raw of all) {
    try {
      compiled.push(new RegExp(raw, "iu"));
    } catch {
      // Skip invalid regex — surfaces during config edit, not at runtime
    }
  }
  return compiled;
}

function buildInformationalPatterns(
  config: TriggerConfig,
  lang: string,
): RegExp[] {
  const patterns = [
    ...(config.informationalPatterns["*"] ?? []),
    ...(config.informationalPatterns.en ?? []),
  ];
  if (lang !== "en") {
    patterns.push(...(config.informationalPatterns[lang] ?? []));
  }
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

export function isAnalyticalQuestion(prompt: string): boolean {
  const firstLine = (prompt.split("\n")[0] ?? "").trim();
  return QUESTION_PATTERNS.some((p) => p.test(firstLine));
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

// ── Main ──────────────────────────────────────────────────────

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
  const prompt = (input.prompt as string) ?? "";

  if (!prompt.trim()) process.exit(0);
  if (startsWithSlashCommand(prompt)) process.exit(0);

  const config = loadConfig();
  const lang = detectLanguage(projectDir);

  // Check for deactivation request before workflow detection
  if (isDeactivationRequest(prompt, lang)) {
    deactivateAllPersistentModes(projectDir, sessionId);
    process.exit(0);
  }
  const infoPatterns = buildInformationalPatterns(config, lang);
  // Guard 2: Strip code blocks, inline code, and pasted system-echo blocks
  // before scanning for keywords. System echo stripping prevents oma's own
  // hook outputs (when pasted back into the prompt) from re-triggering.
  // NFKC normalization collapses fullwidth Latin from CJK IMEs onto ASCII
  // so keyword regexes cannot be silently bypassed by ｐａｒａｌｌｅｌ-style input.
  const cleaned = normalizeForMatching(
    stripSystemEchoes(stripCodeBlocks(prompt)),
  );
  const excluded = new Set(config.excludedWorkflows);

  // Guard 3: Load reinforcement suppression state
  const kwState = loadKwState(projectDir);

  // Skip persistent workflows entirely if the prompt is an analytical question
  const analytical = isAnalyticalQuestion(cleaned);

  for (const [workflow, def] of Object.entries(config.workflows)) {
    if (excluded.has(workflow)) continue;

    // Global CLI-invocation guard: prompts that start with a CLI invocation
    // of `oma` or a `VENDORS` entry are tool invocations, not natural-language
    // workflow requests. Skip silently to avoid false-positive matches.
    if (shouldSkipAllWorkflows(cleaned)) continue;

    // Per-workflow override: if a predicate is registered for this specific
    // workflow, evaluate it and skip just this workflow when it returns true.
    const workflowPredicate = KEYWORD_SKIP_PREDICATES[workflow];
    if (workflowPredicate?.(cleaned)) continue;

    // Analytical questions should never trigger persistent workflows
    if (analytical && def.persistent) continue;

    const patterns = [
      ...buildPatterns(def.keywords, lang, config.cjkScripts),
      ...buildRawPatterns(def.patterns, lang),
    ];

    for (const pattern of patterns) {
      const match = pattern.exec(cleaned);
      if (!match) continue;
      if (isInformationalContext(cleaned, match.index, infoPatterns)) continue;
      // Keywords deep in long prompts are likely pasted content, not user intent
      if (isPastedContent(match.index, def.persistent, cleaned.length))
        continue;

      // Guard 3: Suppress if same workflow triggered too many times in 60s
      if (isReinforcementSuppressed(kwState, workflow)) continue;

      if (def.persistent) {
        activateMode(projectDir, workflow, sessionId);
      }
      // Record this trigger for reinforcement tracking
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

      const context = contextLines.join("\n");

      process.stdout.write(makePromptOutput(vendor, context));
      process.exit(0);
    }
  }

  process.exit(0);
}

if (import.meta.main) {
  main().catch(() => process.exit(0));
}
