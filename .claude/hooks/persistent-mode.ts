#!/usr/bin/env bun
/**
 * oh-my-agent — Stop Hook (Persistent Mode)
 *
 * Works with: Claude Code (Stop), Codex CLI (Stop), Gemini CLI (AfterAgent)
 *
 * Prevents the agent from stopping while a long-running workflow
 * (ultrawork, orchestrate, coordinate) is active.
 *
 * stdin : JSON  — { sessionId|session_id, hook_event_name?, ... }
 * stdout: JSON  — { decision: "block", reason } | {}
 * exit 0 = allow stop
 * exit 2 = block stop
 */

import { readFileSync, writeFileSync, unlinkSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { type Vendor, type ModeState, makeBlockOutput } from "./types.ts";

const MAX_REINFORCEMENTS = 20;
const STALE_HOURS = 2;

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
    return ["ultrawork", "orchestrate", "coordinate"];
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
  switch (vendor) {
    case "codex":
      return (input.cwd as string) || process.cwd();
    case "gemini":
      return process.env.GEMINI_PROJECT_DIR || process.cwd();
    case "qwen":
      return process.env.QWEN_PROJECT_DIR || process.cwd();
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

// ── State ─────────────────────────────────────────────────────

function getStateDir(projectDir: string): string {
  return join(projectDir, ".agents", "state");
}

function readModeState(
  projectDir: string,
  workflow: string,
): ModeState | null {
  const path = join(getStateDir(projectDir), `${workflow}-state.json`);
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

export function deactivate(projectDir: string, workflow: string): void {
  const path = join(getStateDir(projectDir), `${workflow}-state.json`);
  if (existsSync(path)) unlinkSync(path);
}

function incrementReinforcement(
  projectDir: string,
  workflow: string,
  state: ModeState,
): void {
  state.reinforcementCount += 1;
  writeFileSync(
    join(getStateDir(projectDir), `${workflow}-state.json`),
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

  const persistentWorkflows = loadPersistentWorkflows();

  for (const workflow of persistentWorkflows) {
    const state = readModeState(projectDir, workflow);
    if (!state) continue;

    if (isStale(state) || state.reinforcementCount >= MAX_REINFORCEMENTS) {
      deactivate(projectDir, workflow);
      continue;
    }

    if (state.sessionId !== sessionId) {
      deactivate(projectDir, workflow);
      continue;
    }

    incrementReinforcement(projectDir, workflow, state);

    const reason = [
      `[OMA PERSISTENT MODE: ${workflow.toUpperCase()}]`,
      `The /${workflow} workflow is still active (reinforcement ${state.reinforcementCount}/${MAX_REINFORCEMENTS}).`,
      `Continue executing the workflow. If all tasks are genuinely complete, run:`,
      `  "워크플로우 완료" or "workflow done"`,
      `to deactivate persistent mode.`,
    ].join("\n");

    process.stdout.write(makeBlockOutput(vendor, reason));
    process.exit(2);
  }

  process.exit(0);
}

if (import.meta.main) {
  main().catch(() => process.exit(0));
}
