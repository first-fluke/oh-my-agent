#!/usr/bin/env bun
/**
 * oh-my-agent — HUD Statusline
 *
 * Lightweight status display for Claude Code's statusLine feature.
 * Shows: OMA label, model, context usage, session cost, rate limits, lines changed, active workflow.
 *
 * stdin: JSON from Claude Code (model, context_window, cwd, transcript_path)
 * stdout: ANSI-colored status text
 */

import { existsSync, readdirSync, readFileSync } from "node:fs";
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

interface RateLimit {
  used_percentage?: number;
  resets_at?: string;
}

interface StatuslineStdin {
  cwd?: string;
  model?: { id?: string; display_name?: string };
  context_window?: {
    context_window_size?: number;
    used_percentage?: number;
  };
  cost?: {
    total_cost_usd?: number;
    total_lines_added?: number;
    total_lines_removed?: number;
    total_duration_ms?: number;
  };
  rate_limits?: {
    five_hour?: RateLimit;
    seven_day?: RateLimit;
  };
}

function readStdin(): StatuslineStdin {
  try {
    return JSON.parse(readFileSync(0, "utf-8"));
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

// ── Rate Limit Helpers ───────────────────────────────────────

function formatCountdown(resetsAt: string): string {
  const remaining = new Date(resetsAt).getTime() - Date.now();
  if (remaining <= 0) return "";
  const h = Math.floor(remaining / 3_600_000);
  const m = Math.floor((remaining % 3_600_000) / 60_000);
  return h > 0 ? `${h}h${m}m` : `${m}m`;
}

function formatRateLimit(label: string, rl?: RateLimit): string | null {
  if (!rl || rl.used_percentage == null) return null;
  const pct = Math.round(rl.used_percentage);
  const countdown = rl.resets_at ? formatCountdown(rl.resets_at) : "";
  const text = countdown
    ? `${label}:${pct}%(${countdown})`
    : `${label}:${pct}%`;
  return colorByThreshold(pct, text);
}

// ── Main ──────────────────────────────────────────────────────

function main() {
  const input = readStdin();
  const projectDir =
    process.env.CLAUDE_PROJECT_DIR || input.cwd || process.cwd();
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

  // 4. Session cost
  const cost = input.cost?.total_cost_usd;
  if (cost != null && cost > 0) {
    parts.push(dim(`$${cost.toFixed(2)}`));
  }

  // 5. Rate limits (5h / 7d)
  const rl5 = formatRateLimit("5h", input.rate_limits?.five_hour);
  const rl7 = formatRateLimit("7d", input.rate_limits?.seven_day);
  if (rl5 || rl7) {
    parts.push([rl5, rl7].filter(Boolean).join(dim(" ")));
  }

  // 6. Lines changed
  const added = input.cost?.total_lines_added;
  const removed = input.cost?.total_lines_removed;
  if (added || removed) {
    const diffParts: string[] = [];
    if (added) diffParts.push(green(`+${added}`));
    if (removed) diffParts.push(red(`-${removed}`));
    parts.push(diffParts.join(dim("/")));
  }

  // 7. Active workflow
  const workflow = getActiveWorkflow(projectDir);
  if (workflow) {
    const label = `${workflow.workflow}:${workflow.reinforcementCount}`;
    parts.push(yellow(label));
  }

  process.stdout.write(parts.join(dim(" │ ")));
}

main();
