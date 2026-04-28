#!/usr/bin/env bun
/**
 * oh-my-agent — Skill Injector Hook (UserPromptSubmit)
 *
 * Works with: Claude Code, Codex CLI, Gemini CLI, Cursor, Qwen Code.
 *
 * Discovers `.agents/skills/<name>/` directories (requires `SKILL.md` to exist),
 * looks up multilingual triggers from `triggers.json` (`skills` section),
 * matches the user prompt, and injects top-N skill references.
 *
 * Runs after keyword-detector on UserPromptSubmit. Skips injection when a
 * persistent workflow is active (those modes own the session context).
 */

import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { basename, dirname, join } from "node:path";
import { makePromptOutput, resolveGitRoot, type Vendor } from "./types.ts";

const MAX_SKILLS = 3;
const SESSION_TTL_MS = 60 * 60 * 1000;
const DEFAULT_CJK_SCRIPTS = ["ko", "ja", "zh"];

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
    if ("session_id" in input && !("sessionId" in input)) return "codex";
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

interface SkillsTriggerConfig {
  skills?: Record<string, { keywords: Record<string, string[]> }>;
  cjkScripts?: string[];
}

function loadTriggersConfig(): SkillsTriggerConfig {
  const configPath = join(dirname(import.meta.path), "triggers.json");
  if (!existsSync(configPath)) return {};
  try {
    return JSON.parse(readFileSync(configPath, "utf-8"));
  } catch {
    return {};
  }
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

// ── Pattern Building ──────────────────────────────────────────

export function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function buildTriggerPatterns(
  triggers: string[],
  lang: string,
  cjkScripts: string[],
): RegExp[] {
  return triggers.map((kw) => {
    const escaped = escapeRegex(kw).replace(/\s+/g, "\\s+");
    if (cjkScripts.includes(lang) || /[^\p{ASCII}]/u.test(kw)) {
      return new RegExp(escaped, "i");
    }
    return new RegExp(`\\b${escaped}\\b`, "i");
  });
}

// ── Skill Discovery ───────────────────────────────────────────

export interface SkillEntry {
  name: string;
  absolutePath: string;
  relPath: string;
}

export function discoverSkills(projectDir: string): SkillEntry[] {
  const skillsDir = join(projectDir, ".agents", "skills");
  if (!existsSync(skillsDir)) return [];

  const out: SkillEntry[] = [];
  let entries: ReturnType<typeof readdirSync>;
  try {
    entries = readdirSync(skillsDir, { withFileTypes: true });
  } catch {
    return out;
  }

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    if (entry.name.startsWith("_")) continue;

    const skillPath = join(skillsDir, entry.name, "SKILL.md");
    if (!existsSync(skillPath)) continue;

    out.push({
      name: entry.name,
      absolutePath: skillPath,
      relPath: join(".agents", "skills", entry.name, "SKILL.md"),
    });
  }
  return out;
}

// ── Matching ──────────────────────────────────────────────────

export interface SkillMatch {
  name: string;
  relPath: string;
  score: number;
  matchedTriggers: string[];
}

export function matchSkills(
  prompt: string,
  lang: string,
  skills: SkillEntry[],
  config: SkillsTriggerConfig,
): SkillMatch[] {
  const cjkScripts = config.cjkScripts ?? DEFAULT_CJK_SCRIPTS;
  const matches: SkillMatch[] = [];

  for (const skill of skills) {
    const jsonEntry = config.skills?.[skill.name];
    if (!jsonEntry) continue;

    const jsonTriggers = [
      ...(jsonEntry.keywords["*"] ?? []),
      ...(jsonEntry.keywords.en ?? []),
      ...(lang !== "en" ? (jsonEntry.keywords[lang] ?? []) : []),
    ];

    const seen = new Set<string>();
    const allTriggers: string[] = [];
    for (const t of jsonTriggers) {
      const key = t.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      allTriggers.push(t);
    }
    if (allTriggers.length === 0) continue;

    const patterns = buildTriggerPatterns(allTriggers, lang, cjkScripts);
    const matched: string[] = [];
    let score = 0;

    for (let i = 0; i < patterns.length; i++) {
      if (patterns[i].test(prompt)) {
        matched.push(allTriggers[i]);
        score += 10;
      }
    }

    if (score > 0) {
      matches.push({
        name: skill.name,
        relPath: skill.relPath,
        score,
        matchedTriggers: matched,
      });
    }
  }

  matches.sort((a, b) =>
    b.score !== a.score ? b.score - a.score : a.name.localeCompare(b.name),
  );
  return matches.slice(0, MAX_SKILLS);
}

// ── Session Dedup State ───────────────────────────────────────

interface SessionState {
  sessions: Record<string, { injected: string[]; timestamp: number }>;
}

function getStatePath(projectDir: string): string {
  return join(projectDir, ".agents", "state", "skill-sessions.json");
}

function readState(projectDir: string): SessionState {
  const p = getStatePath(projectDir);
  if (!existsSync(p)) return { sessions: {} };
  try {
    const parsed = JSON.parse(readFileSync(p, "utf-8"));
    if (parsed && typeof parsed === "object" && parsed.sessions) {
      return parsed as SessionState;
    }
  } catch {
    // corrupted — reset
  }
  return { sessions: {} };
}

function writeState(projectDir: string, state: SessionState): void {
  const p = getStatePath(projectDir);
  try {
    mkdirSync(dirname(p), { recursive: true });
    writeFileSync(p, JSON.stringify(state, null, 2));
  } catch {
    // dedup failing open is acceptable
  }
}

export function filterFreshMatches(
  matches: SkillMatch[],
  projectDir: string,
  sessionId: string,
  now: number = Date.now(),
): { fresh: SkillMatch[]; nextState: SessionState } {
  const state = readState(projectDir);

  for (const [id, sess] of Object.entries(state.sessions)) {
    if (now - sess.timestamp > SESSION_TTL_MS) {
      delete state.sessions[id];
    }
  }

  const current = state.sessions[sessionId];
  const alreadyInjected = new Set(
    current && now - current.timestamp <= SESSION_TTL_MS
      ? current.injected
      : [],
  );

  const fresh = matches.filter((m) => !alreadyInjected.has(m.relPath));

  if (fresh.length > 0) {
    const existing = state.sessions[sessionId]?.injected ?? [];
    state.sessions[sessionId] = {
      injected: [...new Set([...existing, ...fresh.map((m) => m.relPath)])],
      timestamp: now,
    };
  }

  return { fresh, nextState: state };
}

// ── Workflow Guard ────────────────────────────────────────────

export function isPersistentWorkflowActive(
  projectDir: string,
  sessionId: string,
): boolean {
  const stateDir = join(projectDir, ".agents", "state");
  if (!existsSync(stateDir)) return false;
  try {
    const files = readdirSync(stateDir);
    return files.some(
      (f) =>
        f.endsWith(`-state-${sessionId}.json`) && f !== "skill-sessions.json",
    );
  } catch {
    return false;
  }
}

// ── Prompt Sanitation ─────────────────────────────────────────

export function startsWithSlashCommand(prompt: string): boolean {
  return /^\/[a-zA-Z][\w-]*/.test(prompt.trim());
}

export function stripCodeBlocks(text: string): string {
  return text
    .replace(/(`{3,})[^\n]*\n[\s\S]*?\1/g, "")
    .replace(/(`{3,})[^\n]*\n[\s\S]*/g, "")
    .replace(/`{3,}[^`]*`{3,}/g, "")
    .replace(/`[^`\n]+`/g, "")
    .replace(/"[^"\n]*"/g, "");
}

// ── Context Formatting ────────────────────────────────────────

export function formatContext(matches: SkillMatch[]): string {
  const lines = [
    `[OMA SKILLS DETECTED: ${matches.map((m) => m.name).join(", ")}]`,
    "User intent matches the following skills:",
    "",
  ];
  for (const m of matches) {
    lines.push(`- **${m.name}** — \`${m.relPath}\``);
    lines.push(`  Matched triggers: ${m.matchedTriggers.join(", ")}`);
  }
  lines.push("");
  lines.push(
    "Read the relevant SKILL.md before invoking. These suggestions are advisory — apply judgement.",
  );
  return lines.join("\n");
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

  const vendor = detectVendor(input);
  const projectDir = getProjectDir(vendor, input);
  const sessionId = getSessionId(input);
  const prompt = (input.prompt as string) ?? "";

  if (!prompt.trim()) process.exit(0);
  if (startsWithSlashCommand(prompt)) process.exit(0);
  if (isPersistentWorkflowActive(projectDir, sessionId)) process.exit(0);

  const lang = detectLanguage(projectDir);
  const config = loadTriggersConfig();
  const cleaned = stripCodeBlocks(prompt);
  const skills = discoverSkills(projectDir);

  const matches = matchSkills(cleaned, lang, skills, config);
  if (matches.length === 0) process.exit(0);

  const { fresh, nextState } = filterFreshMatches(
    matches,
    projectDir,
    sessionId,
  );
  if (fresh.length === 0) process.exit(0);

  writeState(projectDir, nextState);
  process.stdout.write(makePromptOutput(vendor, formatContext(fresh)));
  process.exit(0);
}

if (import.meta.main) {
  main().catch(() => process.exit(0));
}

// Avoid unused-import lint for basename when testing subsets of this module.
void basename;
