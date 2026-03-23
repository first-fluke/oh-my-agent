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

import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { parse } from "yaml";
import { type Vendor, type ModeState, makePromptOutput } from "./types.ts";

// ── Vendor Detection ──────────────────────────────────────────

function detectVendor(input: Record<string, unknown>): Vendor {
  const event = input.hook_event_name as string | undefined;
  if (event === "BeforeAgent") return "gemini";
  if (event === "UserPromptSubmit") {
    // Codex uses snake_case session_id, Claude uses camelCase sessionId
    if ("session_id" in input && !("sessionId" in input)) return "codex";
  }
  return "claude";
}

function getProjectDir(
  vendor: Vendor,
  input: Record<string, unknown>,
): string {
  switch (vendor) {
    case "codex":
      return (input.cwd as string) || process.cwd();
    case "gemini":
      return process.env.GEMINI_PROJECT_DIR || process.cwd();
    default:
      return process.env.CLAUDE_PROJECT_DIR || process.cwd();
  }
}

function getSessionId(input: Record<string, unknown>): string {
  return (
    (input.sessionId as string) ||
    (input.session_id as string) ||
    "unknown"
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
}

function loadConfig(): TriggerConfig {
  const configPath = join(dirname(import.meta.path), "triggers.json");
  return JSON.parse(readFileSync(configPath, "utf-8"));
}

function detectLanguage(projectDir: string): string {
  const prefsPath = join(
    projectDir,
    ".agents",
    "config",
    "user-preferences.yaml",
  );
  if (!existsSync(prefsPath)) return "en";
  try {
    const prefs = parse(readFileSync(prefsPath, "utf-8"));
    return prefs?.language ?? "en";
  } catch {
    return "en";
  }
}

// ── Pattern Builder ───────────────────────────────────────────

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function buildPatterns(
  keywords: Record<string, string[]>,
  lang: string,
  cjkScripts: string[],
): RegExp[] {
  const allKeywords = [
    ...(keywords["*"] ?? []),
    ...(keywords["en"] ?? []),
    ...(lang !== "en" ? (keywords[lang] ?? []) : []),
  ];

  return allKeywords.map((kw) => {
    const escaped = escapeRegex(kw).replace(/\s+/g, "\\s+");
    if (cjkScripts.includes(lang) || /[^\x00-\x7F]/.test(kw)) {
      return new RegExp(escaped, "i");
    }
    return new RegExp(`\\b${escaped}\\b`, "i");
  });
}

function buildInformationalPatterns(
  config: TriggerConfig,
  lang: string,
): RegExp[] {
  const patterns = [...(config.informationalPatterns["en"] ?? [])];
  if (lang !== "en") {
    patterns.push(...(config.informationalPatterns[lang] ?? []));
  }
  return [
    ...patterns.map((p) => {
      if (/[^\x00-\x7F]/.test(p)) return new RegExp(escapeRegex(p), "i");
      return new RegExp(`\\b${escapeRegex(p)}\\b`, "i");
    }),
    /\?$/,
  ];
}

// ── Filters ───────────────────────────────────────────────────

function isInformationalContext(
  prompt: string,
  matchIndex: number,
  infoPatterns: RegExp[],
): boolean {
  const windowStart = Math.max(0, matchIndex - 60);
  const window = prompt.slice(windowStart, matchIndex + 60);
  return infoPatterns.some((p) => p.test(window));
}

function stripCodeBlocks(text: string): string {
  return text.replace(/```[\s\S]*?```/g, "").replace(/`[^`]+`/g, "");
}

function startsWithSlashCommand(prompt: string): boolean {
  return /^\/[a-zA-Z][\w-]*/.test(prompt.trim());
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
    join(getStateDir(projectDir), `${workflow}-state.json`),
    JSON.stringify(state, null, 2),
  );
}

const PERSISTENT_WORKFLOWS = new Set([
  "ultrawork",
  "orchestrate",
  "coordinate",
]);

// ── Main ──────────────────────────────────────────────────────

async function main() {
  const raw = readFileSync("/dev/stdin", "utf-8");
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

  const config = loadConfig();
  const lang = detectLanguage(projectDir);
  const infoPatterns = buildInformationalPatterns(config, lang);
  const cleaned = stripCodeBlocks(prompt);
  const excluded = new Set(config.excludedWorkflows);

  for (const [workflow, def] of Object.entries(config.workflows)) {
    if (excluded.has(workflow)) continue;

    const patterns = buildPatterns(def.keywords, lang, config.cjkScripts);

    for (const pattern of patterns) {
      const match = pattern.exec(cleaned);
      if (!match) continue;
      if (isInformationalContext(cleaned, match.index, infoPatterns)) continue;

      if (def.persistent) {
        activateMode(projectDir, workflow, sessionId);
      }

      const context = [
        `[OMA WORKFLOW: ${workflow.toUpperCase()}]`,
        `User intent matches the /${workflow} workflow.`,
        `Read and follow \`.agents/workflows/${workflow}.md\` step by step.`,
        `User request: ${prompt}`,
        `IMPORTANT: Start the workflow IMMEDIATELY. Do not ask for confirmation.`,
      ].join("\n");

      process.stdout.write(makePromptOutput(vendor, context));
      process.exit(0);
    }
  }

  process.exit(0);
}

main().catch(() => process.exit(0));
