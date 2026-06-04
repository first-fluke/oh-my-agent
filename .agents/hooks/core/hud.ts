#!/usr/bin/env bun
/**
 * oh-my-agent — HUD
 *
 * Lightweight status display. Two modes:
 *
 *   - Claude Code / agy (statusLine): stdin = vendor payload, stdout = ANSI
 *     text consumed by the native status-line renderer. Field names line up
 *     across both vendors; vendor-specific extras are best-effort.
 *   - Gemini CLI (SessionStart, AfterTool, AfterAgent hooks): stdin = Gemini
 *     hook payload, stdout = `{}` (protocol no-op), side effect = best-effort
 *     bottom-row bar written to /dev/tty.
 *
 * Vendor is inferred from the installed script path:
 *   `.gemini/hooks/` → gemini bar mode
 *   `.claude/hooks/` or `.gemini/antigravity-cli/hooks/` → claude statusline mode
 *
 * Set `OMA_HUD_DEBUG=1` to dump the raw stdin payload to
 * `<hookDir>/../last-hud-input.json` for schema reverse-engineering.
 */

import {
  closeSync,
  existsSync,
  openSync,
  readdirSync,
  readFileSync,
  writeFileSync,
  writeSync,
} from "node:fs";
import { join, sep } from "node:path";
import type { ModeState } from "./types.ts";

type HudVendor = "claude" | "gemini";

function inferVendor(): HudVendor {
  const path = import.meta.filename ?? "";
  // Strict match on `/.gemini/hooks/` so agy (`/.gemini/antigravity-cli/hooks/`)
  // falls through to claude — agy's StatusLine uses Claude's stdout protocol.
  if (path.includes(`${sep}.gemini${sep}hooks${sep}`)) return "gemini";
  return "claude";
}

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

// ── Stdin ─────────────────────────────────────────────────────

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
    // agy 1.0.0 StatusLine adds these — Claude does not.
    total_input_tokens?: number;
    total_output_tokens?: number;
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
  // Qwen Code statusLine fields (git branch + line metrics live under
  // different keys than Claude/agy). Schema: qwen-code statusLine docs.
  git?: { branch?: string };
  metrics?: {
    files?: { total_lines_added?: number; total_lines_removed?: number };
  };
  // agy StatusLine fields (snake_case; Antigravity hides $cost / rate-limits).
  // Schema: antigravity.google StatusLine "Available JSON fields".
  agent_state?: string;
  sandbox?: { enabled?: boolean; allow_network?: boolean };
  product?: string;
  conversation_id?: string;
  workspace?: { current_dir?: string; project_dir?: string };
  vcs?: { type?: string; branch?: string; client?: string; dirty?: boolean };
  agent?: { name?: string };
  subagents?: Array<{ name?: string; role?: string; status?: string }>;
  background_tasks?: Array<{ name?: string; status?: string; index?: number }>;
  pending_input_count?: number;
  tool_confirmation_pending?: boolean;
  terminal_width?: number;
}

interface GeminiHookInput {
  hook_event_name?: string;
  cwd?: string;
  tool_name?: string;
  tool_response?: { exit_code?: number; success?: boolean } | unknown;
  prompt?: string;
  prompt_response?: string;
  source?: string;
}

function readStdin(): StatuslineStdin {
  const raw = (() => {
    try {
      return readFileSync(0, "utf-8");
    } catch {
      return "";
    }
  })();
  maybeDumpDebugPayload(raw);
  try {
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

function readRaw(): unknown {
  const raw = (() => {
    try {
      return readFileSync(0, "utf-8");
    } catch {
      return "";
    }
  })();
  maybeDumpDebugPayload(raw);
  try {
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

/**
 * When `OMA_HUD_DEBUG=1`, capture the raw stdin payload to a sibling file so
 * vendor-specific schemas can be reverse-engineered (notably agy's StatusLine,
 * which has no public docs at v1.0.0). Best-effort — failures are swallowed.
 */
function maybeDumpDebugPayload(raw: string): void {
  if (process.env.OMA_HUD_DEBUG !== "1" || !raw) return;
  try {
    const target = join(
      import.meta.dirname ?? process.cwd(),
      "..",
      "last-hud-input.json",
    );
    writeFileSync(target, `${raw.trim()}\n`, "utf-8");
  } catch {
    // intentionally silent
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

export function shortModel(model?: {
  id?: string;
  display_name?: string;
}): string {
  const name = model?.display_name || model?.id || "";
  if (!name) return "";
  // Claude: "Claude Opus 4.6 (1M context)" → "Opus 4.6"
  const claude = name.match(/(Opus|Sonnet|Haiku)[\s.]*([\d.]*)/i);
  if (claude) return `${claude[1]}${claude[2] ? ` ${claude[2]}` : ""}`;
  // Gemini / agy: "Gemini 3.5 Flash (High)" → "Gemini 3.5 Flash"
  const gemini = name.match(
    /(Gemini)\s+([\d.]+)\s+(Pro|Flash|Ultra|Nano|Thinking)/i,
  );
  if (gemini) return `${gemini[1]} ${gemini[2]} ${gemini[3]}`;
  return name.split("/").pop()?.slice(0, 20) || "";
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

function formatTokens(n: number): string {
  if (n < 1000) return `${n}`;
  if (n < 1_000_000) return `${(n / 1000).toFixed(n < 10_000 ? 1 : 0)}k`;
  return `${(n / 1_000_000).toFixed(1)}M`;
}

// ── Gemini bar (DECSTBM-free best-effort bottom row) ──────────

/**
 * Write `line` to the controlling TTY at the bottom row, then restore the
 * cursor so the host CLI's render is not visibly disturbed. Best-effort:
 * silently no-ops in environments without /dev/tty (CI, piped runs); when
 * the host CLI repaints, the bar is overwritten until the next event.
 * Intentionally avoids DECSTBM scroll-region changes so scrollback survives
 * a mid-write hook kill.
 */
function paintBottomBar(line: string): void {
  let fd: number | null = null;
  try {
    fd = openSync("/dev/tty", "w");
    const SAVE = "\x1b7"; // DECSC: save cursor + attrs
    const RESTORE = "\x1b8"; // DECRC: restore cursor + attrs
    const TO_BOTTOM = "\x1b[999;1H"; // clamp to last row, col 1
    const CLEAR_LINE = "\x1b[2K";
    writeSync(fd, `${SAVE}${TO_BOTTOM}${CLEAR_LINE}\r${line}${RESTORE}`);
  } catch {
    // No tty available — silent.
  } finally {
    if (fd !== null) {
      try {
        closeSync(fd);
      } catch {
        // ignore close failures
      }
    }
  }
}

export function buildGeminiBar(
  input: GeminiHookInput,
  projectDir: string,
): string {
  const parts: string[] = [bold(cyan("[OMA]"))];

  const event = input.hook_event_name;
  if (event) parts.push(dim(event));

  const workflow = getActiveWorkflow(projectDir);
  if (workflow) {
    parts.push(yellow(`${workflow.workflow}:${workflow.reinforcementCount}`));
  }

  if (input.tool_name) {
    const resp = input.tool_response as { exit_code?: number } | undefined;
    const failed = typeof resp?.exit_code === "number" && resp.exit_code !== 0;
    const label = `tool:${input.tool_name}`;
    parts.push(failed ? red(label) : green(label));
  }

  const now = new Date();
  const hh = String(now.getHours()).padStart(2, "0");
  const mm = String(now.getMinutes()).padStart(2, "0");
  parts.push(dim(`${hh}:${mm}`));

  return parts.join(dim(" │ "));
}

// ── Claude / agy statusline ───────────────────────────────────

export function buildClaudeStatusline(input: StatuslineStdin): string {
  const projectDir =
    process.env.CLAUDE_PROJECT_DIR ||
    input.cwd ||
    input.workspace?.current_dir ||
    process.cwd();
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

  // 4. Session cost (Claude)
  const cost = input.cost?.total_cost_usd;
  if (cost != null && cost > 0) {
    parts.push(dim(`$${cost.toFixed(2)}`));
  }

  // 5. Rate limits (Claude)
  const rl5 = formatRateLimit("5h", input.rate_limits?.five_hour);
  const rl7 = formatRateLimit("7d", input.rate_limits?.seven_day);
  if (rl5 || rl7) {
    parts.push([rl5, rl7].filter(Boolean).join(dim(" ")));
  }

  // 6. Lines changed (vendor-provided only; agy doesn't track this and we
  //    intentionally don't synthesize from git — keep what the vendor knows).
  const added =
    input.cost?.total_lines_added ?? input.metrics?.files?.total_lines_added;
  const removed =
    input.cost?.total_lines_removed ??
    input.metrics?.files?.total_lines_removed;
  if (added || removed) {
    const diffParts: string[] = [];
    if (added) diffParts.push(green(`+${added}`));
    if (removed) diffParts.push(red(`-${removed}`));
    parts.push(diffParts.join(dim("/")));
  }

  // 7. agy StatusLine signals (presence-guarded; Claude payloads omit these).
  //    git branch (+dirty marker), live agent state, active subagents,
  //    background tasks, queued inputs, and a pending tool-confirmation flag.
  const branch = input.vcs?.branch ?? input.git?.branch;
  if (branch) {
    parts.push(dim(`⎇ ${branch}${input.vcs?.dirty ? "*" : ""}`));
  }
  if (input.agent_state && input.agent_state !== "idle") {
    parts.push(yellow(input.agent_state));
  }
  const subagentCount = input.subagents?.length ?? 0;
  if (subagentCount > 0) {
    parts.push(cyan(`subagents:${subagentCount}`));
  }
  const backgroundCount = input.background_tasks?.length ?? 0;
  if (backgroundCount > 0) {
    parts.push(yellow(`bg:${backgroundCount}`));
  }
  if (
    typeof input.pending_input_count === "number" &&
    input.pending_input_count > 0
  ) {
    parts.push(dim(`queue:${input.pending_input_count}`));
  }
  if (input.tool_confirmation_pending) {
    parts.push(yellow("confirm?"));
  }
  if (input.sandbox?.enabled) {
    parts.push(dim("sandbox"));
  }

  // 8. Active workflow
  const workflow = getActiveWorkflow(projectDir);
  if (workflow) {
    parts.push(yellow(`${workflow.workflow}:${workflow.reinforcementCount}`));
  }

  // 9. Tokens (agy exposes these; Claude usually does not). Keep this last
  // because the token string is visually noisy and mostly informational.
  const inTok = input.context_window?.total_input_tokens ?? 0;
  const outTok = input.context_window?.total_output_tokens ?? 0;
  if (inTok > 0 || outTok > 0) {
    parts.push(dim(`tok:${formatTokens(inTok)}↑${formatTokens(outTok)}↓`));
  }

  return parts.join(dim(" │ "));
}

// ── Main ──────────────────────────────────────────────────────

function main() {
  const vendor = inferVendor();

  if (vendor === "gemini") {
    const raw = readRaw() as GeminiHookInput;
    const projectDir =
      process.env.GEMINI_PROJECT_DIR ||
      process.env.ANTIGRAVITY_PROJECT_DIR ||
      raw.cwd ||
      process.cwd();
    paintBottomBar(buildGeminiBar(raw, projectDir));
    // Gemini hook protocol: empty object = no-op, do not influence the agent.
    process.stdout.write("{}");
    return;
  }

  process.stdout.write(buildClaudeStatusline(readStdin()));
}

main();
