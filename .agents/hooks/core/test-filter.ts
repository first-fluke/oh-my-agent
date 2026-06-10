// PreToolUse hook — Filter test output to show only failures
// Works with: Claude Code, Codex CLI, Gemini CLI, Qwen Code

import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { resolveGitRoot } from "./fs-utils.ts";
import { makePreToolOutput } from "./hook-output.ts";
import type { HandlerCtx, HandlerResult, HookInput, Vendor } from "./types.ts";

// --- Vendor detection (same logic as keyword-detector.ts) ---

function detectVendor(input: Record<string, unknown>): Vendor {
  const event = input.hook_event_name as string | undefined;
  const _hookEventName = input.hookEventName as string | undefined;

  // pi spawns this script from `.pi/extensions/oma/`; trust the script path.
  if (import.meta.filename.includes(`${join(".pi", "extensions")}`))
    return "pi";

  if (process.env.GROK_WORKSPACE_ROOT) return "grok";
  if (process.env.KIRO_PROJECT_DIR) return "kiro";

  if (event === "BeforeTool") return "gemini";
  if (event === "preToolUse" || _hookEventName === "preToolUse") return "kiro";
  if (event === "PreToolUse" && process.env.ANTIGRAVITY_PROJECT_DIR)
    return "antigravity";
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
    case "antigravity":
      dir =
        (input.cwd as string) ||
        process.env.ANTIGRAVITY_PROJECT_DIR ||
        process.env.AGY_PROJECT_DIR ||
        process.cwd();
      break;
    case "qwen":
      dir = process.env.QWEN_PROJECT_DIR || process.cwd();
      break;
    case "grok":
      dir =
        process.env.GROK_WORKSPACE_ROOT ||
        (input.cwd as string) ||
        process.cwd();
      break;
    case "kiro":
      dir =
        process.env.KIRO_PROJECT_DIR || (input.cwd as string) || process.cwd();
      break;
    default:
      dir = process.env.CLAUDE_PROJECT_DIR || process.cwd();
      break;
  }
  return resolveGitRoot(dir);
}

/**
 * Vendor → hooks directory (relative to the project root) where
 * `filter-test-output.sh` is materialized by the installer.
 *
 * MUST mirror the `hookDir` field of `.agents/hooks/variants/<vendor>.json`.
 * This switch cannot import the variant JSONs (pi spawns this script as a
 * standalone subprocess from a directory where variants are not copied), so
 * the mapping is duplicated here and locked by a contract test
 * (`cli/commands/hook/vendor-wiring.test.ts`).
 */
export function getHookDir(vendor: Vendor): string {
  switch (vendor) {
    case "claude":
      return ".claude/hooks";
    case "codex":
      return ".codex/hooks";
    case "commandcode":
      return ".commandcode/hooks";
    case "cursor":
      return ".cursor/hooks";
    case "gemini":
      return ".gemini/hooks";
    case "antigravity":
      return ".gemini/antigravity-cli/hooks";
    case "qwen":
      return ".qwen/hooks";
    case "grok":
      return ".grok/hooks";
    case "kiro":
      return ".kiro/hooks";
    case "pi":
      // pi keeps the core scripts (and filter-test-output.sh) inside the
      // bridge's directory extension, not a dedicated hooks dir.
      return join(".pi", "extensions", "oma");
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
 * `ctx.cwd` must be the resolved git-root project directory.
 */
export async function run(
  input: HookInput,
  ctx: HandlerCtx,
): Promise<HandlerResult | null> {
  if (input.kind !== "pre_tool") return null;

  const { toolName, toolInput, cwd: projectDir } = input;
  const { vendor } = ctx;

  // Gemini uses run_shell_command; Claude-family uses Bash.
  if (toolName !== "Bash" && toolName !== "run_shell_command") return null;

  const command = toolInput.command as string | undefined;
  if (!command) return null;

  const isTestCommand = TEST_PATTERNS.some((p) => p.test(command));
  if (!isTestCommand) return null;

  const isExcluded = EXCLUDE_PATTERNS.some((p) => p.test(command));
  if (isExcluded) return null;

  const filterScript = join(
    projectDir,
    getHookDir(vendor),
    "filter-test-output.sh",
  );
  if (!existsSync(filterScript)) return null;

  const filteredCmd = `set -o pipefail; (${command}) 2>&1 | bash "${filterScript}"`;
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

  const vendor = detectVendor(parsed);
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
