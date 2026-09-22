// PreToolUse hook — Deny native code search when a code-intelligence provider
// (Serena / Gortex) is configured, so the CLAUDE.md "Code Search" rule is
// enforced mechanically instead of relying on model compliance.
// Works with: Claude Code, Codex CLI, Cursor, Grok, Kimi, Kiro, Qwen Code.
//
// Scope decisions:
//  - Native searches confined to provider-excluded or external paths pass.
//    Other `Grep` / `Glob` calls use the provider. `Read` / `LS`
//    style tools are never touched — the provider contract is about discovery,
//    not reading.
//  - Shell commands are denied only when a segment's leading command is a
//    recursive code search: `rg` / `ag` / `ack` / `fd`, `grep` with a
//    recursive flag, `find` with a name/path predicate, or `git grep`.
//    Non-recursive `grep` (filtering a pipe / a single file) and `find` without
//    a name predicate pass through — they are not discovery.
//  - Gating: only fires when `providers.code_intelligence` resolves (yaml or
//    `.serena/project.yml`) and `providers.code_intelligence_guard` is not
//    `off`. The hook cannot observe whether the MCP server is actually up, so
//    the deny reason names the escape hatch.
//  - Escape hatch: a shell command containing `OMA_CI_ALLOW_NATIVE=1` bypasses
//    the guard (mirrors scm-guard's `OMA_SCM_ALLOW_SECRETS=1`). Grep/Glob have
//    no argument to carry a token, so the fallback for those is the shell path.

import { readFileSync } from "node:fs";
import { isAbsolute, resolve } from "node:path";
import {
  type CodeIntelligenceProvider,
  detectCodeIntelligenceGuardMode,
  detectCodeIntelligenceProvider,
} from "./code-intelligence-primer.ts";
import {
  isExcludedSearchScope,
  searchPathRoot,
} from "./code-intelligence-scope.ts";
import { makePreToolDenyOutput } from "./hook-output.ts";
import type { HandlerCtx, HandlerResult, HookInput, Vendor } from "./types.ts";
import { getProjectDir } from "./vendor-detect.ts";

export const BYPASS_TOKEN = "OMA_CI_ALLOW_NATIVE=1";

// --- Tool classification ---

/**
 * Native search tools a provider replaces. Claude Code names only: the other
 * wired vendors register this handler under their shell-tool matcher, so their
 * native search tools (e.g. Qwen `grep_search`) never reach the chain and are
 * deliberately not listed — enforcement there is the shell branch only.
 */
const GREP_TOOLS = new Set(["Grep"]);
const GLOB_TOOLS = new Set(["Glob"]);

/** Shell tools across the wired vendors (same set as scm-guard / test-filter). */
const SHELL_TOOLS = new Set([
  "Bash",
  "run_shell_command",
  "Shell",
  "execute_bash",
]);

// --- Shell command parsing ---

const RECURSIVE_SEARCHERS = new Set(["rg", "ag", "ack", "fd", "fdfind"]);
const GREP_BINARIES = new Set(["grep", "egrep", "fgrep", "ggrep"]);
const FIND_NAME_PREDICATES = new Set([
  "-name",
  "-iname",
  "-path",
  "-ipath",
  "-regex",
  "-iregex",
  "-wholename",
  "-iwholename",
]);

function tokenize(segment: string): string[] {
  return (segment.match(/"[^"]*"|'[^']*'|\S+/g) ?? []).map((t) =>
    t.replace(/^["']|["']$/g, ""),
  );
}

function commandSegments(command: string): string[] {
  // Preserve quoted regex alternation, semicolons and spaces.
  return command.match(/(?:"[^"]*"|'[^']*'|[^;|&\n])+/g) ?? [];
}

/**
 * Strip leading env assignments / wrappers (`FOO=1`, `sudo`, `command`,
 * `env`, `time`, `nice`) so the actual binary is at index 0.
 */
function stripPrefixes(tokens: string[]): string[] {
  let i = 0;
  while (i < tokens.length) {
    const t = tokens[i] ?? "";
    if (/^[A-Za-z_][A-Za-z0-9_]*=/.test(t)) {
      i++;
      continue;
    }
    if (
      t === "sudo" ||
      t === "command" ||
      t === "env" ||
      t === "time" ||
      t === "nice"
    ) {
      i++;
      // skip their own short options (e.g. `sudo -u root`, `env -i`)
      while (i < tokens.length && (tokens[i] ?? "").startsWith("-")) i++;
      continue;
    }
    break;
  }
  return tokens.slice(i);
}

function basename(path: string): string {
  const idx = path.lastIndexOf("/");
  return idx === -1 ? path : path.slice(idx + 1);
}

function grepIsRecursive(args: string[]): boolean {
  for (const a of args) {
    if (a === "--") break;
    if (a === "--recursive" || a === "--dereference-recursive") return true;
    // Combined short flags: `-r`, `-rn`, `-Rin`, `-nri` … (not `--` long opts)
    if (/^-[A-Za-z]+$/.test(a) && /[rR]/.test(a)) return true;
  }
  return false;
}

function findHasNamePredicate(args: string[]): boolean {
  return args.some((a) => FIND_NAME_PREDICATES.has(a));
}

/**
 * Returns the leading search command of the first shell segment that performs
 * a recursive code search, or null when the command is not a search.
 * Exported for tests.
 */
export function detectNativeSearchCommand(command: string): string | null {
  const segments = commandSegments(command);
  for (const segment of segments) {
    const tokens = stripPrefixes(tokenize(segment.trim()));
    if (tokens.length === 0) continue;
    const bin = basename(tokens[0] ?? "");
    const args = tokens.slice(1);

    if (RECURSIVE_SEARCHERS.has(bin)) return bin;
    if (GREP_BINARIES.has(bin) && grepIsRecursive(args)) return bin;
    if (bin === "find" && findHasNamePredicate(args)) return bin;
    if (bin === "git" && args[0] === "grep") return "git grep";
  }
  return null;
}

// Options with values must not be mistaken for patterns or search roots.
const VALUE_OPTIONS = new Set([
  "-e",
  "-f",
  "-g",
  "-t",
  "-T",
  "-A",
  "-B",
  "-C",
  "-m",
  "-j",
  "-E",
  "--regexp",
  "--file",
  "--glob",
  "--iglob",
  "--type",
  "--type-not",
  "--after-context",
  "--before-context",
  "--context",
  "--max-count",
  "--max-depth",
  "--maxdepth",
  "--max-filesize",
  "--encoding",
  "--threads",
  "--color",
  "--colors",
  "--sort",
  "--sortr",
  "--ignore-file",
  "--include",
  "--exclude",
  "--exclude-dir",
  "--extension",
  "-d",
  "--search-path",
  "--base-directory",
]);
const FD_VALUE_OPTIONS = new Set([
  "-e",
  "--extension",
  "-t",
  "--type",
  "-E",
  "--exclude",
  "-d",
  "--max-depth",
  "--color",
  "-j",
  "--threads",
]);
const FLAG_OPTIONS = new Set([
  "--hidden",
  "--no-ignore",
  "--no-ignore-vcs",
  "--no-ignore-parent",
  "--no-ignore-global",
  "--files",
  "--files-with-matches",
  "--files-without-match",
  "--line-number",
  "--ignore-case",
  "--smart-case",
  "--fixed-strings",
  "--recursive",
  "--dereference-recursive",
  "--heading",
  "--no-heading",
  "--count",
  "--only-matching",
  "--follow",
  "--null",
]);

function searchRoots(bin: string, args: string[]): string[] | null {
  if (bin === "git") return null; // revisions/pathspec magic need the explicit fallback
  if (bin === "find") {
    if (
      args.some((arg) => ["-exec", "-execdir", "-ok", "-okdir"].includes(arg))
    )
      return null;
    const roots: string[] = [];
    for (const arg of args) {
      if (arg.startsWith("-") || arg === "(") break;
      roots.push(arg);
    }
    return roots;
  }
  const positional: string[] = [];
  let hasPattern = false;
  let filesOnly = false;
  let options = true;
  const fd = bin === "fd" || bin === "fdfind";
  const grep = GREP_BINARIES.has(bin);
  const valueOptions = fd ? FD_VALUE_OPTIONS : VALUE_OPTIONS;
  for (let i = 0; i < args.length; i++) {
    const arg = args[i] ?? "";
    if (options && arg === "--") {
      options = false;
      continue;
    }
    if (options && arg.startsWith("-")) {
      if (bin === "ag" || bin === "ack") return null;
      const option = arg.split("=", 1)[0] ?? arg;
      if (option === "--search-path" || option === "--base-directory")
        return null;
      if (option === "--files" && bin === "rg") filesOnly = true;
      if (grep && /^-[EF]+$/.test(arg)) continue;
      if (fd && /^-[fFHILlis0]+$/.test(arg)) continue;
      if (valueOptions.has(option)) {
        if (["-e", "-f", "--regexp", "--file"].includes(option) && !fd)
          hasPattern = true;
        if (!arg.includes("=")) i++;
      } else if (
        FLAG_OPTIONS.has(option) ||
        (!fd && /^-[nivwoxlLcrRshuUqFa0]+$/.test(arg))
      ) {
        // Flags with no following value.
      } else if (!fd && /^-[efgABCmjtT].+/.test(arg)) {
        if (/^-[ef]/.test(arg)) hasPattern = true;
      } else {
        return null; // Unknown options may consume the apparent path.
      }
    } else {
      positional.push(arg);
    }
  }
  if (!hasPattern && !filesOnly) positional.shift();
  return positional;
}

function shellSearchRoots(
  command: string,
  projectDir: string,
): string[] | null {
  // Do not guess expansions, redirections, subshells or changing directories.
  if (/[$`<>\\()]/.test(command)) return null;
  const roots: string[] = [];
  for (const segment of commandSegments(command)) {
    const tokens = stripPrefixes(tokenize(segment.trim()));
    const bin = basename(tokens[0] ?? "");
    if (["cd", "pushd", "popd"].includes(bin)) return null;
    if (!detectNativeSearchCommand(segment)) continue;
    const paths = searchRoots(bin, tokens.slice(1));
    if (!paths?.length) return null;
    for (const path of paths) {
      const literal = searchPathRoot(path);
      if (!literal) return null;
      roots.push(resolve(projectDir, literal));
    }
  }
  return roots;
}

// --- Deny reasons ---

function providerLabel(provider: CodeIntelligenceProvider): string {
  return provider === "gortex" ? "Gortex" : "Serena";
}

function replacementFor(
  provider: CodeIntelligenceProvider,
  kind: "grep" | "glob" | "shell",
): string {
  if (provider === "gortex") {
    return "the Gortex MCP search/navigation tools";
  }
  switch (kind) {
    case "grep":
      return "`mcp__serena__search_for_pattern` (or `find_symbol` / `get_symbols_overview` for symbols)";
    case "glob":
      return "`mcp__serena__find_file`";
    case "shell":
      return "`mcp__serena__search_for_pattern` for content and `mcp__serena__find_file` for paths";
  }
}

function denyReason(
  provider: CodeIntelligenceProvider,
  kind: "grep" | "glob" | "shell",
  detail: string,
): string {
  const label = providerLabel(provider);
  return (
    `[oma code-intelligence-guard] Blocked ${detail}: ${label} is the configured code-intelligence provider ` +
    `(providers.code_intelligence in .agents/oma-config.yaml). Use ${replacementFor(provider, kind)} instead; ` +
    `load the deferred ${label} tools first if needed. ` +
    `Searches scoped entirely to confirmed provider exclusions or external paths are allowed. ` +
    `If ${label} is unavailable, timed out, or cannot search the requested path (including unrecognized exclusions), run the search through the shell tool ` +
    `with the command prefixed by ${BYPASS_TOKEN}. ` +
    `Set providers.code_intelligence_guard: off to disable this guard.`
  );
}

// ── Pure handler (canonical ABI) ─────────────────────────────

/**
 * Pure decision function — denies native code search when a code-intelligence
 * provider is configured. Returns a `block` HandlerResult, else `null`
 * (fail-open: no provider, guard off, non-search tool/command, bypass token).
 */
export async function run(
  input: HookInput,
  _ctx: HandlerCtx,
): Promise<HandlerResult | null> {
  if (input.kind !== "pre_tool") return null;

  const { toolName, toolInput, cwd: projectDir } = input;

  const isGrep = GREP_TOOLS.has(toolName);
  const isGlob = GLOB_TOOLS.has(toolName);
  const isShell = SHELL_TOOLS.has(toolName);
  if (!isGrep && !isGlob && !isShell) return null;

  let searchBin: string | null = null;
  if (isShell) {
    const command = toolInput.command as string | undefined;
    if (!command) return null;
    if (command.includes(BYPASS_TOKEN)) return null;
    searchBin = detectNativeSearchCommand(command);
    if (!searchBin) return null;
  }

  // Config reads happen after the cheap tool/command checks so the common
  // (non-search) path never touches the filesystem.
  const provider = detectCodeIntelligenceProvider(projectDir);
  if (!provider) return null;
  if (detectCodeIntelligenceGuardMode(projectDir) === "off") return null;

  let roots: string[] | null = null;
  if (isShell) {
    roots = shellSearchRoots(toolInput.command as string, projectDir);
  } else if (isGlob && typeof toolInput.pattern === "string") {
    const base =
      typeof toolInput.path === "string" ? toolInput.path : projectDir;
    const target = isAbsolute(toolInput.pattern)
      ? toolInput.pattern
      : `${resolve(projectDir, base)}/${toolInput.pattern}`;
    const root = searchPathRoot(target);
    if (root) roots = [root];
  } else if (typeof toolInput.path === "string") {
    roots = [toolInput.path];
  }
  if (roots && isExcludedSearchScope(provider, projectDir, roots)) return null;

  if (isGrep) {
    return {
      type: "block",
      reason: denyReason(provider, "grep", `native \`${toolName}\``),
    };
  }
  if (isGlob) {
    return {
      type: "block",
      reason: denyReason(provider, "glob", `native \`${toolName}\``),
    };
  }
  return {
    type: "block",
    reason: denyReason(provider, "shell", `shell search \`${searchBin}\``),
  };
}

// ── Standalone entry (pi subprocess / direct bun invocation) ──

interface PreToolUseInput {
  tool_name: string;
  tool_input: {
    command?: string;
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

function main() {
  const inputFile = process.env.OMA_HOOK_INPUT_FILE;
  const raw = inputFile
    ? readFileSync(inputFile, "utf-8")
    : readFileSync(0, "utf-8");
  if (!raw.trim()) process.exit(0);

  const parsed: PreToolUseInput = JSON.parse(raw);
  // Standalone path is vendor-agnostic here; claude covers the common dialect.
  const vendor: Vendor = "claude";
  const projectDir = getProjectDir(vendor, parsed);

  const hookInput: HookInput = {
    kind: "pre_tool",
    toolName: parsed.tool_name,
    toolInput: { ...(parsed.tool_input ?? {}) },
    cwd: projectDir,
  };

  run(hookInput, { vendor, cwd: projectDir })
    .then((result) => {
      if (result && result.type === "block") {
        console.log(makePreToolDenyOutput(vendor, result.reason));
      }
      process.exit(0);
    })
    .catch(() => process.exit(0));
}

if (import.meta.main) {
  main();
}
