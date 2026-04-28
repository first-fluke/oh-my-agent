// PreToolUse hook — Filter test output to show only failures
// Works with: Claude Code, Codex CLI, Gemini CLI, Qwen Code

import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { makePreToolOutput, resolveGitRoot, type Vendor } from "./types.ts";

// --- Vendor detection (same logic as keyword-detector.ts) ---

function detectVendor(input: Record<string, unknown>): Vendor {
  const event = input.hook_event_name as string | undefined;
  if (event === "BeforeTool") return "gemini";
  if (event === "PreToolUse") {
    if ("session_id" in input && !("sessionId" in input)) return "codex";
  }
  if (process.env.QWEN_PROJECT_DIR) return "qwen";
  return "claude";
}

function getProjectDir(vendor: Vendor, input: Record<string, unknown>): string {
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

function getHookDir(vendor: Vendor): string {
  switch (vendor) {
    case "codex":
      return ".codex/hooks";
    case "gemini":
      return ".gemini/hooks";
    case "qwen":
      return ".qwen/hooks";
    default:
      return ".claude/hooks";
  }
}

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
}

// --- Main ---

if (process.env.OMA_HOOK_DEBUG) {
  process.stderr.write(
    `[test-filter] entry. OMA_HOOK_INPUT_FILE=${process.env.OMA_HOOK_INPUT_FILE ?? "<unset>"}\n`,
  );
}

// Use fd 0 (sync) instead of Bun.stdin.text() — works under both Bun and
// Node, and avoids stdin-buffering timing differences between hosts.
// Fallback: when OMA_HOOK_INPUT_FILE is set, read from that file. This
// makes the hook testable from environments (vitest worker pools under
// bun) where piping stdin to a child process is unreliable.
const inputFile = process.env.OMA_HOOK_INPUT_FILE;
const raw = inputFile
  ? readFileSync(inputFile, "utf-8")
  : readFileSync(0, "utf-8");
if (process.env.OMA_HOOK_DEBUG) {
  process.stderr.write(
    `[test-filter] read raw len=${raw.length}, inputFile=${inputFile ?? "<stdin>"}\n`,
  );
}
if (!raw.trim()) {
  if (process.env.OMA_HOOK_DEBUG) {
    process.stderr.write(
      `[test-filter debug] empty input. inputFile=${inputFile ?? "<stdin>"}\n`,
    );
  }
  process.exit(0);
}

const input: PreToolUseInput = JSON.parse(raw);
if (process.env.OMA_HOOK_DEBUG) {
  process.stderr.write(
    `[test-filter] parsed. tool_name=${input.tool_name} command=${input.tool_input?.command}\n`,
  );
}

// Gemini uses run_shell_command; Claude-family uses Bash.
if (input.tool_name !== "Bash" && input.tool_name !== "run_shell_command") {
  process.exit(0);
}

const command = input.tool_input?.command;
if (!command) process.exit(0);

// Check if this is a test command
const isTestCommand = TEST_PATTERNS.some((p) => p.test(command));
if (process.env.OMA_HOOK_DEBUG) {
  process.stderr.write(
    `[test-filter] isTestCommand=${isTestCommand} command=${command}\n`,
  );
}
if (!isTestCommand) process.exit(0);

// Skip if it's a non-test use of test tool names (install, cat, etc.)
const isExcluded = EXCLUDE_PATTERNS.some((p) => p.test(command));
if (isExcluded) process.exit(0);

// Detect vendor and resolve project dir
const vendor = detectVendor(input);
const projectDir = getProjectDir(vendor, input);
const filterScript = join(
  projectDir,
  getHookDir(vendor),
  "filter-test-output.sh",
);
if (process.env.OMA_HOOK_DEBUG) {
  process.stderr.write(
    `[test-filter] vendor=${vendor} filterScript=${filterScript} exists=${existsSync(filterScript)}\n`,
  );
}

// Skip filtering if the script doesn't exist (hooks not fully installed)
if (!existsSync(filterScript)) process.exit(0);

// Rewrite command to pipe through filter
const filteredCmd = `set -o pipefail; (${command}) 2>&1 | bash "${filterScript}"`;

// Return updated input with all original fields preserved
const updatedInput: Record<string, unknown> = {
  ...input.tool_input,
  command: filteredCmd,
};

console.log(makePreToolOutput(vendor, updatedInput));
