#!/usr/bin/env bun
/**
 * oh-my-agent — Stop Hook (Persistent Mode)
 *
 * Works with: Claude Code (Stop), Codex CLI (Stop), Gemini CLI (AfterAgent)
 *
 * Prevents the agent from stopping while a long-running workflow
 * (ultrawork, orchestrate, work) is active.
 *
 * stdin : JSON  — { sessionId|session_id, hook_event_name?, ... }
 * stdout: JSON  — { decision: "block", reason } | {}
 * exit 0 = allow stop
 * exit 2 = block stop
 */

import { readFileSync, writeFileSync, unlinkSync, existsSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { type Vendor, type ModeState, makeBlockOutput, resolveGitRoot } from "./types.ts";
import { DEACTIVATION_PHRASES, isDeactivationRequest } from "./keyword-detector.ts";

const MAX_REINFORCEMENTS = 5;
const STALE_HOURS = 2;

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

// ── Config Loading ────────────────────────────────────────────

interface TriggerConfig {
  workflows: Record<string, { persistent: boolean }>;
}

function loadPersistentWorkflows(): string[] {
  const configPath = join(dirname(import.meta.path), "triggers.json");
  try {
    const config: TriggerConfig = JSON.parse(readFileSync(configPath, "utf-8"));
    return Object.entries(config.workflows)
      .filter(([, def]) => def.persistent)
      .map(([name]) => name);
  } catch {
    return ["ultrawork", "orchestrate", "work"];
  }
}

// ── Vendor Detection ──────────────────────────────────────────

function detectVendor(input: Record<string, unknown>): Vendor {
  const event = input.hook_event_name as string | undefined;
  if (event === "AfterAgent") return "gemini";
  if (event === "Stop") {
    if ("session_id" in input && !("sessionId" in input)) return "codex";
  }
  if (process.env.QWEN_PROJECT_DIR) return "qwen";
  return "claude";
}

function getProjectDir(
  vendor: Vendor,
  input: Record<string, unknown>,
): string {
  let dir: string;
  switch (vendor) {
    case "codex":
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
    (input.sessionId as string) ||
    (input.session_id as string) ||
    "unknown"
  );
}

// ── State ─────────────────────────────────────────────────────

function getStateDir(projectDir: string): string {
  return join(projectDir, ".agents", "state");
}

function readModeState(
  projectDir: string,
  workflow: string,
  sessionId: string,
): ModeState | null {
  const path = join(getStateDir(projectDir), `${workflow}-state-${sessionId}.json`);
  if (!existsSync(path)) return null;
  try {
    return JSON.parse(readFileSync(path, "utf-8")) as ModeState;
  } catch {
    return null;
  }
}

export function isStale(state: ModeState): boolean {
  const elapsed = Date.now() - new Date(state.activatedAt).getTime();
  return elapsed > STALE_HOURS * 60 * 60 * 1000;
}

export function deactivate(projectDir: string, workflow: string, sessionId: string): void {
  const path = join(getStateDir(projectDir), `${workflow}-state-${sessionId}.json`);
  if (existsSync(path)) unlinkSync(path);
}

function incrementReinforcement(
  projectDir: string,
  workflow: string,
  sessionId: string,
  state: ModeState,
): void {
  state.reinforcementCount += 1;
  writeFileSync(
    join(getStateDir(projectDir), `${workflow}-state-${sessionId}.json`),
    JSON.stringify(state, null, 2),
  );
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

  const vendor = detectVendor(input);
  const projectDir = getProjectDir(vendor, input);
  const sessionId = getSessionId(input);
  const lang = detectLanguage(projectDir);

  // Check all text fields in stdin for deactivation phrases.
  // The assistant may have included "workflow done" in its response,
  // or it may appear in transcript/content fields depending on vendor.
  const textToCheck = [
    input.prompt_response,  // Gemini AfterAgent
    input.response,
    input.content,
    input.message,
    input.transcript,
  ]
    .filter((v): v is string => typeof v === "string")
    .join(" ");

  if (textToCheck && isDeactivationRequest(textToCheck, lang)) {
    // Deactivate all persistent workflows for this session
    const stateDir = join(projectDir, ".agents", "state");
    if (existsSync(stateDir)) {
      try {
        const suffix = `-state-${sessionId}.json`;
        for (const file of readdirSync(stateDir)) {
          if (file.endsWith(suffix)) {
            unlinkSync(join(stateDir, file));
          }
        }
      } catch { /* ignore */ }
    }
    process.exit(0);
  }

  const persistentWorkflows = loadPersistentWorkflows();

  for (const workflow of persistentWorkflows) {
    const state = readModeState(projectDir, workflow, sessionId);
    if (!state) continue;

    if (isStale(state) || state.reinforcementCount >= MAX_REINFORCEMENTS) {
      deactivate(projectDir, workflow, sessionId);
      continue;
    }

    incrementReinforcement(projectDir, workflow, sessionId, state);

    const stateFile = `.agents/state/${workflow}-state-${sessionId}.json`;
    const reason = [
      `[OMA PERSISTENT MODE: ${workflow.toUpperCase()}]`,
      `The /${workflow} workflow is still active (reinforcement ${state.reinforcementCount}/${MAX_REINFORCEMENTS}).`,
      `Continue executing the workflow. If all tasks are genuinely complete:`,
      `  1. Delete the state file: Bash \`rm ${stateFile}\``,
      `  2. Or ask the user to say "워크플로우 완료" / "workflow done"`,
    ].join("\n");

    writeBlockAndExit(vendor, reason);
  }

  process.exit(0);
}

export function writeBlockAndExit(vendor: Vendor, reason: string): never {
  process.stderr.write(reason);
  process.stdout.write(makeBlockOutput(vendor, reason));
  process.exit(2);
}

if (import.meta.main) {
  main().catch(() => process.exit(0));
}
