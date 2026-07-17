// PreToolUse hook — Block staging of likely-secret files (oma-scm enforcement).
// Enforces `forbidden_patterns` from oma-scm's commit-config.yaml mechanically:
// before this hook the pattern list was advisory-only (model compliance).
// Works with: Claude Code, Codex CLI, Cursor, Grok, Kimi, Kiro, Qwen Code.
//
// Scope decisions:
//  - Only `git add` segments are guarded. Untracked secrets must pass through
//    `git add` to ever reach a commit (`git commit <path>` / `-a` only touch
//    already-tracked files), so staging is the single choke point.
//  - Broad staging (`git add -A` / `git add .`) is NOT blocked here: the rule
//    ("never without explicit permission") depends on user consent the hook
//    cannot observe. It stays an agent-level guardrail.
//  - Escape hatch: a command containing `OMA_SCM_ALLOW_SECRETS=1` bypasses the
//    guard, mirroring SKILL.md Guardrail 0 (explicit user override — surface
//    once, then proceed).

import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { makePreToolDenyOutput } from "./hook-output.ts";
import type { HandlerCtx, HandlerResult, HookInput, Vendor } from "./types.ts";
import { getProjectDir } from "./vendor-detect.ts";

// --- Defaults (mirror .agents/skills/oma-scm/config/commit-config.yaml) ---
// Used when the config file is absent (global installs without project config,
// or repos that removed the skill). Keep in sync with the yaml SSOT.

const DEFAULT_FORBIDDEN_PATTERNS = [
  "*.env",
  "*.env.*",
  "credentials.json",
  "secrets.yaml",
  "*.pem",
  "*.key",
  ".env.local",
  "*.p12",
  "*.pfx",
  "id_rsa*",
  "id_ed25519*",
  ".npmrc",
  "service-account*.json",
  "*.keystore",
  "*.jks",
  "*.tfvars",
  "*.tfstate",
  "*.tfstate.*",
  ".netrc",
  ".pypirc",
];

const DEFAULT_ALLOWED_EXCEPTIONS = ["*.example", "*.sample", "*.template"];

const BYPASS_TOKEN = "OMA_SCM_ALLOW_SECRETS=1";

const CONFIG_RELPATH = join(
  ".agents",
  "skills",
  "oma-scm",
  "config",
  "commit-config.yaml",
);

// --- Config loading (regex-based, consistent with core's yaml handling) ---

/**
 * Extract a top-level yaml string-list section (`key:` followed by `- "item"`
 * lines) without a yaml dependency — core handlers must stay standalone.
 */
export function extractYamlList(content: string, key: string): string[] | null {
  const lines = content.split(/\r?\n/);
  const start = lines.findIndex((l) => new RegExp(`^${key}:\\s*$`).test(l));
  if (start === -1) return null;
  const items: string[] = [];
  for (let i = start + 1; i < lines.length; i++) {
    const line = lines[i] ?? "";
    if (/^\s*(#|$)/.test(line)) continue; // comments / blanks inside the list
    const item = line.match(/^\s+-\s+["']?([^"']+)["']?\s*$/)?.[1];
    if (!item) break; // end of the list block
    items.push(item);
  }
  return items;
}

interface GuardConfig {
  forbidden: string[];
  exceptions: string[];
}

function loadGuardConfig(projectDir: string): GuardConfig {
  const configPath = join(projectDir, CONFIG_RELPATH);
  if (!existsSync(configPath)) {
    return {
      forbidden: DEFAULT_FORBIDDEN_PATTERNS,
      exceptions: DEFAULT_ALLOWED_EXCEPTIONS,
    };
  }
  try {
    const content = readFileSync(configPath, "utf-8");
    return {
      forbidden:
        extractYamlList(content, "forbidden_patterns") ??
        DEFAULT_FORBIDDEN_PATTERNS,
      exceptions:
        extractYamlList(content, "allowed_exceptions") ??
        DEFAULT_ALLOWED_EXCEPTIONS,
    };
  } catch {
    return {
      forbidden: DEFAULT_FORBIDDEN_PATTERNS,
      exceptions: DEFAULT_ALLOWED_EXCEPTIONS,
    };
  }
}

// --- Glob matching (basename semantics, like .gitignore basename patterns) ---

function globToRegExp(pattern: string): RegExp {
  const escaped = pattern
    .replace(/[.+^${}()|[\]\\]/g, "\\$&")
    .replace(/\*/g, "[^/]*")
    .replace(/\?/g, "[^/]");
  return new RegExp(`^${escaped}$`);
}

function basename(path: string): string {
  const trimmed = path.replace(/\/+$/, "");
  const idx = trimmed.lastIndexOf("/");
  return idx === -1 ? trimmed : trimmed.slice(idx + 1);
}

export function matchesForbidden(path: string, config: GuardConfig): boolean {
  const name = basename(path);
  if (!name) return false;
  if (config.exceptions.some((p) => globToRegExp(p).test(name))) return false;
  return config.forbidden.some((p) => globToRegExp(p).test(name));
}

// --- Command parsing ---

/**
 * Extract candidate pathspec tokens from every `git add` segment of a shell
 * command. Naive quoting-aware-ish tokenizer: segments split on shell control
 * operators; option tokens (`-…`) and the `--` separator are skipped.
 */
export function extractGitAddPaths(command: string): string[] {
  const paths: string[] = [];
  const segments = command.split(/&&|\|\||;|\||\n/);
  for (const segment of segments) {
    const m = segment.match(/\bgit\s+(?:[-\w]+=\S+\s+)*add\b(.*)$/);
    if (!m) continue;
    const rest = m[1] ?? "";
    // Tokenize, honoring simple single/double quotes.
    const tokens = rest.match(/"[^"]*"|'[^']*'|\S+/g) ?? [];
    for (const raw of tokens) {
      const token = raw.replace(/^["']|["']$/g, "");
      if (token === "--") continue;
      if (token.startsWith("-")) continue; // options (incl. -A/--all; see header)
      paths.push(token);
    }
  }
  return paths;
}

// ── Pure handler (canonical ABI) ─────────────────────────────

/**
 * Pure decision function — blocks `git add` of likely-secret files.
 * Returns a `block` HandlerResult when a staged path matches
 * `forbidden_patterns` (minus `allowed_exceptions`), else `null` (fail-open).
 */
export async function run(
  input: HookInput,
  _ctx: HandlerCtx,
): Promise<HandlerResult | null> {
  if (input.kind !== "pre_tool") return null;

  const { toolName, toolInput, cwd: projectDir } = input;

  if (
    toolName !== "Bash" &&
    toolName !== "run_shell_command" &&
    toolName !== "Shell" &&
    toolName !== "execute_bash"
  )
    return null;

  const command = toolInput.command as string | undefined;
  if (!command) return null;
  if (!/\bgit\b/.test(command)) return null;
  if (command.includes(BYPASS_TOKEN)) return null;

  const candidates = extractGitAddPaths(command);
  if (candidates.length === 0) return null;

  const config = loadGuardConfig(projectDir);
  const flagged = candidates.filter((p) => matchesForbidden(p, config));
  if (flagged.length === 0) return null;

  return {
    type: "block",
    reason:
      `[oma scm-guard] Blocked: staging likely-secret file(s): ${flagged.join(", ")} ` +
      `(matched forbidden_patterns in ${CONFIG_RELPATH}). ` +
      `Surface this to the user; if they explicitly approve committing these files, ` +
      `re-run the command prefixed with ${BYPASS_TOKEN}.`,
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
