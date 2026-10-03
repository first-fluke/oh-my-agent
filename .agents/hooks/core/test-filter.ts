// PreToolUse hook — Filter test output to show only failures
// Works with: Claude Code, Codex CLI, Qwen Code

import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { makePreToolOutput } from "./hook-output.ts";
import type { HandlerCtx, HandlerResult, HookInput } from "./types.ts";
import {
  detectVendorFromInput,
  getHookDir,
  getProjectDir,
} from "./vendor-detect.ts";

// --- Test runner patterns ---

const TEST_PATTERNS = [
  // JS/TS
  /\bvitest\b/,
  /\bjest\b/,
  /\bmocha\b/,
  /\bnpm\s+(run\s+)?test\b/,
  /\bbun\s+(run\s+)?test\b/,
  /\byarn\s+test\b/,
  /\bpnpm\s+(run\s+)?test\b/,
  // Python
  /\bpytest\b/,
  /\bpython\s+-m\s+unittest\b/,
  // Go / Rust
  /\bgo\s+test\b/,
  /\bcargo\s+test\b/,
  // Flutter / Dart
  /\bflutter\s+test\b/,
  /\bdart\s+test\b/,
  // Swift / .NET / JVM
  /\bswift\s+test\b/,
  /\bdotnet\s+test\b/,
  /\b(gradle|gradlew|\.\/gradlew)\s+test\b/,
  /\bmvn\s+test\b/,
  // Ruby / Elixir / PHP
  /\brspec\b/,
  /\bmix\s+test\b/,
  /\bphpunit\b/,
];

// Commands that mention test runners but aren't running tests
const EXCLUDE_PATTERNS = [
  /\b(install|add|remove|uninstall|init)\b/,
  /\b(cat|head|tail|less|more|wc)\b.*\.(test|spec)\./,
];

// --- Hook input ---

interface PreToolUseInput {
  tool_name: string;
  tool_input: {
    command?: string;
    [key: string]: unknown;
  };
  hook_event_name?: string;
  session_id?: string;
  sessionId?: string;
  cwd?: string;
  // Index signature so the typed payload is accepted by the vendor-agnostic
  // helpers detectVendor()/getProjectDir() which take Record<string, unknown>.
  [key: string]: unknown;
}

// ── Pure handler (canonical ABI) ─────────────────────────────

/**
 * Pure decision function — the single logic source for test-filter.
 *
 * Returns a `mutate` HandlerResult when a test command should be piped through
 * the failure-filter script, or `null` when the input is not a test command /
 * the filter script is not installed.
 * `ctx.cwd` must be the resolved project root (see fs-utils resolveProjectRoot).
 */
export async function run(
  input: HookInput,
  ctx: HandlerCtx,
): Promise<HandlerResult | null> {
  if (input.kind !== "pre_tool") return null;

  const { toolName, toolInput } = input;
  const { vendor } = ctx;
  // Filter scripts live under the project root. ctx.cwd is the resolved root
  // even after the session cd's into a subdirectory; input.cwd is not.
  const projectDir = ctx.cwd || input.cwd;

  // Claude-family uses Bash; some CLIs use run_shell_command; Cursor names its
  // terminal tool "Shell" (matches cursor.json's preToolUse matcher); Kiro's
  // canonical shell tool is execute_bash (the agent-JSON matcher name).
  if (
    toolName !== "Bash" &&
    toolName !== "run_shell_command" &&
    toolName !== "Shell" &&
    toolName !== "execute_bash"
  )
    return null;

  const command = toolInput.command as string | undefined;
  if (!command) return null;

  // The rewrite below is Bash-only (`set -o pipefail`, subshell, pipe to
  // bash). On Windows the host shell is PowerShell/cmd, which fails to parse
  // it before the test runner even starts (#618). Losing the failure filter
  // is acceptable; breaking `npm test` is not.
  if (process.platform === "win32") return null;

  // Hook re-entry guard: a command already piping through the filter script
  // must pass through unchanged, not get wrapped a second time (#618).
  if (command.includes("filter-test-output.sh")) return null;

  const isTestCommand = TEST_PATTERNS.some((p) => p.test(command));
  if (!isTestCommand) return null;

  const isExcluded = EXCLUDE_PATTERNS.some((p) => p.test(command));
  if (isExcluded) return null;

  // Resolve the filter script: vendor hook dir first, then the opencode
  // bridge dir (opencode has no core Vendor identity — its subprocess payload
  // detects as claude, whose hook dir is absent in opencode-only installs),
  // then the SSOT core dir as the last resort.
  const filterScript = [
    getHookDir(vendor),
    join(".opencode", "plugins", "oma"),
    join(".agents", "hooks", "core"),
  ]
    .map((dir) => join(projectDir, dir, "filter-test-output.sh"))
    .find((p) => existsSync(p));
  if (!filterScript) return null;

  // The original command sits on its own lines inside the subshell: a
  // trailing `# comment` would otherwise swallow the closing paren, and a
  // heredoc's terminator must stay alone on its line (`EOF)` never matches).
  const filteredCmd = `set -o pipefail; (\n${command}\n) 2>&1 | bash "${filterScript}"`;
  const updatedInput: Record<string, unknown> = {
    ...toolInput,
    command: filteredCmd,
  };

  return { type: "mutate", updatedInput };
}

// ── Standalone entry (pi subprocess / direct bun invocation) ──

function main() {
  // Use fd 0 (sync) instead of Bun.stdin.text() — works under both Bun and
  // Node, and avoids stdin-buffering timing differences between hosts.
  // Fallback: when OMA_HOOK_INPUT_FILE is set, read from that file. This
  // makes the hook testable from environments (vitest worker pools under
  // bun) where piping stdin to a child process is unreliable.
  const inputFile = process.env.OMA_HOOK_INPUT_FILE;
  const raw = inputFile
    ? readFileSync(inputFile, "utf-8")
    : readFileSync(0, "utf-8");
  if (!raw.trim()) process.exit(0);

  const parsed: PreToolUseInput = JSON.parse(raw);

  const vendor = detectVendorFromInput(parsed, "tool", import.meta.filename);
  const projectDir = getProjectDir(vendor, parsed);

  // Build canonical HookInput and delegate to run() — single logic source.
  const toolInput: Record<string, unknown> = {
    ...(parsed.tool_input ?? {}),
  };
  const hookInput: HookInput = {
    kind: "pre_tool",
    toolName: parsed.tool_name,
    toolInput,
    cwd: projectDir,
  };
  const ctx: HandlerCtx = { vendor, cwd: projectDir };

  run(hookInput, ctx)
    .then((result) => {
      if (result && result.type === "mutate") {
        console.log(makePreToolOutput(vendor, result.updatedInput));
      }
      process.exit(0);
    })
    .catch(() => process.exit(0));
}

if (import.meta.main) {
  main();
}
