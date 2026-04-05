#!/usr/bin/env bun
/**
 * oh-my-agent — HUD Statusline
 *
 * Lightweight status display for Claude Code's statusLine feature.
 * Shows: OMA label, active workflow, model, context usage.
 *
 * stdin: JSON from Claude Code (model, context_window, cwd, transcript_path)
 * stdout: ANSI-colored status text
 */

import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join } from "node:path";
import type { ModeState } from "./types.ts";

// ── ANSI Colors ───────────────────────────────────────────────

const dim = (s: string) => `\x1b[2m${s}\x1b[22m`;
const bold = (s: string) => `\x1b[1m${s}\x1b[22m`;
const green = (s: string) => `\x1b[32m${s}\x1b[39m`;
const yellow = (s: string) => `\x1b[33m${s}\x1b[39m`;
const red = (s: string) => `\x1b[31m${s}\x1b[39m`;
const cyan = (s: string) => `\x1b[36m${s}\x1b[39m`;

function colorByThreshold(value: number, text: string): string {
  if (value >= 85) return red(text);
  if (value >= 70) return yellow(text);
  return green(text);
}

// ── Stdin Parsing ─────────────────────────────────────────────

interface StatuslineStdin {
  cwd?: string;
  model?: { id?: string; display_name?: string };
  context_window?: {
    context_window_size?: number;
    used_percentage?: number;
  };
}

function readStdin(): StatuslineStdin {
  try {
    return JSON.parse(readFileSync("/dev/stdin", "utf-8"));
  } catch {
    return {};
  }
}

// ── Active Workflow Detection ─────────────────────────────────

function getActiveWorkflow(projectDir: string): ModeState | null {
  const stateDir = join(projectDir, ".agents", "state");
  if (!existsSync(stateDir)) return null;

  try {
    for (const file of readdirSync(stateDir)) {
      if (!file.endsWith(".json") || !file.includes("-state-")) continue;
      const content = readFileSync(join(stateDir, file), "utf-8");
      const state: ModeState = JSON.parse(content);

      // Skip stale (>2h)
      const elapsed = Date.now() - new Date(state.activatedAt).getTime();
      if (elapsed > 2 * 60 * 60 * 1000) continue;

      return state;
    }
  } catch {
    // ignore
  }
  return null;
}

// ── Model Name Shortener ──────────────────────────────────────

function shortModel(model?: { id?: string; display_name?: string }): string {
  const name = model?.display_name || model?.id || "";
  if (!name) return "";
  // "Claude Opus 4.6 (1M context)" → "Opus 4.6"
  const match = name.match(/(Opus|Sonnet|Haiku)[\s.]*([\d.]*)/i);
  if (match) return `${match[1]}${match[2] ? ` ${match[2]}` : ""}`;
  return name.split("/").pop()?.slice(0, 15) || "";
}

// ── Main ──────────────────────────────────────────────────────

function main() {
  const input = readStdin();
  const projectDir = process.env.CLAUDE_PROJECT_DIR || input.cwd || process.cwd();
  const parts: string[] = [];

  // 1. OMA label
  parts.push(bold(cyan("[OMA]")));

  // 2. Model
  const model = shortModel(input.model);
  if (model) parts.push(dim(model));

  // 3. Context %
  const ctxPct = input.context_window?.used_percentage;
  if (ctxPct != null) {
    parts.push(colorByThreshold(ctxPct, `ctx:${Math.round(ctxPct)}%`));
  }

  // 4. Active workflow
  const workflow = getActiveWorkflow(projectDir);
  if (workflow) {
    const label = `${workflow.workflow}:${workflow.reinforcementCount}`;
    parts.push(yellow(label));
  }

  process.stdout.write(parts.join(dim(" │ ")));
}

main();
