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
import { dirname, join } from "node:path";
import {
  type ModeState,
  makePromptOutput,
  resolveGitRoot,
  type Vendor,
} from "./types.ts";

// ── Guard 1: UserPromptSubmit-only trigger ────────────────────
// Hook event names that represent genuine user input (not agent responses)
const VALID_USER_EVENTS = new Set([
  "UserPromptSubmit",
  "beforeSubmitPrompt", // Cursor
  "BeforeAgent",        // Gemini (fires before agent processes user prompt)
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
    const withinWindow = !Number.isNaN(lastMs) && now - lastMs < REINFORCEMENT_WINDOW_MS;
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
  const path = import.meta.path;
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
    }
  >;
  informationalPatterns: Record<string, string[]>;
  excludedWorkflows: string[];
  cjkScripts: string[];
  extensionRouting?: Record<string, string[]>;
}

function loadConfig(): TriggerConfig {
  const configPath = join(dirname(import.meta.path), "triggers.json");
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
    return new RegExp(`\\b${escaped}\\b`, "i");
  });
}

function buildInformationalPatterns(
  config: TriggerConfig,
  lang: string,
): RegExp[] {
  const patterns = [...(config.informationalPatterns.en ?? [])];
  if (lang !== "en") {
    patterns.push(...(config.informationalPatterns[lang] ?? []));
  }
  return patterns.map((p) => {
    if (/[^\p{ASCII}]/u.test(p)) return new RegExp(escapeRegex(p), "i");
    return new RegExp(`\\b${escapeRegex(p)}\\b`, "i");
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
  /^.*있냐/,
  /^.*있나\?/,
  /^.*있는지/,
  /^.*있을까/,
  /^.*볼만한/,
  /^.*쓸만한/,
  /^.*뭐가\s*있/,
  /^.*어떤\s*(게|것|거)\s*있/,
  /^.*차이가?\s*뭐/,
  // English question patterns
  /^.*\bis there\b/i,
  /^.*\bare there\b/i,
  /^.*\banything worth\b/i,
  /^.*\bwhat.*(feature|difference|reference)/i,
  /^.*\bcompare\b/i,
];

export function isAnalyticalQuestion(prompt: string): boolean {
  const firstLine = prompt.split("\n")[0].trim();
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
    const ext = match[1].toLowerCase();
    if (!EXCLUDE_EXTS.has(ext)) {
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
  const lower = prompt.toLowerCase();
  return phrases.some((phrase) => lower.includes(phrase.toLowerCase()));
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
  const raw = readFileSync("/dev/stdin", "utf-8");
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
  // Guard 2: Strip code blocks and inline code before scanning for keywords
  const cleaned = stripCodeBlocks(prompt);
  const excluded = new Set(config.excludedWorkflows);

  // Guard 3: Load reinforcement suppression state
  const kwState = loadKwState(projectDir);

  // Skip persistent workflows entirely if the prompt is an analytical question
  const analytical = isAnalyticalQuestion(cleaned);

  for (const [workflow, def] of Object.entries(config.workflows)) {
    if (excluded.has(workflow)) continue;

    // Analytical questions should never trigger persistent workflows
    if (analytical && def.persistent) continue;

    const patterns = buildPatterns(def.keywords, lang, config.cjkScripts);

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
