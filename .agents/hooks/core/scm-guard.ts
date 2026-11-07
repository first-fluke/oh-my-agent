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
//  - Escape hatch: `OMA_SCM_ALLOW_SECRETS=1` as an env-assignment prefix of the
//    very `git add` segment being guarded (e.g.
//    `OMA_SCM_ALLOW_SECRETS=1 git add file`) bypasses the guard for THAT
//    segment only, mirroring SKILL.md Guardrail 0 (explicit user override —
//    surface once, then proceed). The token elsewhere (another segment, an
//    echo/comment, or a pathspec argument) never disables scanning.

import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { makePreToolDenyOutput } from "./hook-output.ts";
import type {
  HandlerCtx,
  HandlerResult,
  HookConfig,
  HookInput,
  Vendor,
} from "./types.ts";
import { detectVendorFromInput, getProjectDir } from "./vendor-detect.ts";

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

const MAIN_CONFIG_RELPATH = join(".agents", "oma-config.yaml");
const SKILL_CONFIG_RELPATH = join(
  ".agents",
  "skills",
  "oma-scm",
  "config",
  "commit-config.yaml",
);

// --- Config loading (regex-based, consistent with core's yaml handling) ---

/**
 * Extract a top-level or indented yaml string-list section (`key:` followed by `- "item"`
 * lines) without a yaml dependency — core handlers must stay standalone.
 */
export function extractYamlList(content: string, key: string): string[] | null {
  const lines = content.split(/\r?\n/);
  const start = lines.findIndex((l) => new RegExp(`^\\s*${key}:\\s*$`).test(l));
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

function stringList(value: unknown): string[] | null {
  if (!Array.isArray(value)) return null;
  const items = value.filter(
    (item): item is string => typeof item === "string" && item.length > 0,
  );
  return items.length > 0 ? items : null;
}

/** `scm.forbidden_patterns` from the config `oma hook run` loaded, if set. */
function guardConfigFromConfig(config: HookConfig): GuardConfig | null {
  const scm = config.scm;
  if (!scm || typeof scm !== "object" || Array.isArray(scm)) return null;
  const block = scm as Record<string, unknown>;
  const forbidden = stringList(block.forbidden_patterns);
  if (!forbidden) return null;
  return {
    forbidden,
    exceptions:
      stringList(block.allowed_exceptions) ?? DEFAULT_ALLOWED_EXCEPTIONS,
  };
}

function loadGuardConfig(projectDir: string, config?: HookConfig): GuardConfig {
  // The dispatcher's config (CUE / local overlay aware) replaces the
  // oma-config.yaml read; the skill config and built-in defaults still back it.
  const fromConfig = config ? guardConfigFromConfig(config) : null;
  if (fromConfig) return fromConfig;
  const pathsToTry = [
    ...(config ? [] : [join(projectDir, MAIN_CONFIG_RELPATH)]),
    join(projectDir, SKILL_CONFIG_RELPATH),
  ];

  for (const configPath of pathsToTry) {
    if (!existsSync(configPath)) continue;
    try {
      const content = readFileSync(configPath, "utf-8");
      const forbidden = extractYamlList(content, "forbidden_patterns");
      if (forbidden && forbidden.length > 0) {
        return {
          forbidden,
          exceptions:
            extractYamlList(content, "allowed_exceptions") ??
            DEFAULT_ALLOWED_EXCEPTIONS,
        };
      }
    } catch {
      // Continue to next path or default
    }
  }

  return {
    forbidden: DEFAULT_FORBIDDEN_PATTERNS,
    exceptions: DEFAULT_ALLOWED_EXCEPTIONS,
  };
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
  // Windows pathspecs use `\` separators; normalize so basename-exact
  // patterns (credentials.json, .npmrc, …) match `config\credentials.json`.
  const normalized = path.replace(/\\/g, "/");
  const trimmed = normalized.replace(/\/+$/, "");
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

const SEGMENT_SPLIT_RE = /&&|\|\||;|\||\n/;
const GIT_ADD_RE = /\bgit\s+(?:[-\w]+=\S+\s+)*add\b(.*)$/;
// Bypass is granted only when the segment STARTS with an env-assignment chain
// containing the token, immediately followed by the `git … add` invocation.
// A token in an argument position (`echo OMA_SCM_ALLOW_SECRETS=1 git add …`),
// in another segment, or after the paths does not match this anchor.
const BYPASS_PREFIX_RE = new RegExp(
  `^(?:[-\\w]+=\\S+\\s+)*${BYPASS_TOKEN}\\s+(?:[-\\w]+=\\S+\\s+)*git\\s+(?:[-\\w]+=\\S+\\s+)*add\\b`,
);

export interface GitAddSegment {
  paths: string[];
  /** True only when the bypass token env-prefixes this very `git add`. */
  bypassed: boolean;
}

/**
 * Parse every `git add` segment of a shell command. Naive quoting-aware-ish
 * tokenizer: segments split on shell control operators; option tokens (`-…`)
 * and the `--` separator are skipped. Each segment reports whether the bypass
 * token is an env-assignment prefix of that segment's own `git add`.
 */
export function extractGitAddSegments(command: string): GitAddSegment[] {
  const result: GitAddSegment[] = [];
  for (const segment of command.split(SEGMENT_SPLIT_RE)) {
    const m = segment.match(GIT_ADD_RE);
    if (!m) continue;
    const rest = m[1] ?? "";
    // Tokenize, honoring simple single/double quotes.
    const tokens = rest.match(/"[^"]*"|'[^']*'|\S+/g) ?? [];
    const paths: string[] = [];
    for (const raw of tokens) {
      const token = raw.replace(/^["']|["']$/g, "");
      if (token === "--") continue;
      if (token.startsWith("-")) continue; // options (incl. -A/--all; see header)
      paths.push(token);
    }
    result.push({ paths, bypassed: BYPASS_PREFIX_RE.test(segment.trim()) });
  }
  return result;
}

/**
 * Extract candidate pathspec tokens from every `git add` segment of a shell
 * command (including bypassed segments; callers decide what to scan).
 */
export function extractGitAddPaths(command: string): string[] {
  return extractGitAddSegments(command).flatMap((segment) => segment.paths);
}

// ── Pure handler (canonical ABI) ─────────────────────────────

/**
 * Pure decision function — blocks `git add` of likely-secret files.
 * Returns a `block` HandlerResult when a staged path matches
 * `forbidden_patterns` (minus `allowed_exceptions`), else `null` (fail-open).
 */
export async function run(
  input: HookInput,
  ctx: HandlerCtx,
): Promise<HandlerResult | null> {
  if (input.kind !== "pre_tool") return null;

  const { toolName, toolInput } = input;
  // Config resolves at the project root, not the session's current directory.
  const projectDir = ctx.cwd || input.cwd;

  if (
    toolName !== "Bash" &&
    toolName !== "run_shell_command" &&
    toolName !== "Shell" &&
    toolName !== "execute_bash" &&
    toolName !== "run_command"
  )
    return null;

  const command = (toolInput.command ?? toolInput.CommandLine) as
    | string
    | undefined;
  if (!command) return null;
  if (!/\bgit\b/.test(command)) return null;

  // The bypass applies per segment: only the `git add` env-prefixed by the
  // token is exempt; every other segment is still scanned.
  const candidates = extractGitAddSegments(command)
    .filter((segment) => !segment.bypassed)
    .flatMap((segment) => segment.paths);
  if (candidates.length === 0) return null;

  const config = loadGuardConfig(projectDir, ctx.config);
  const flagged = candidates.filter((p) => matchesForbidden(p, config));
  if (flagged.length === 0) return null;

  return {
    type: "block",
    reason:
      `[oma scm-guard] Blocked: staging likely-secret file(s): ${flagged.join(", ")} ` +
      `(matched forbidden_patterns in ${MAIN_CONFIG_RELPATH}). ` +
      `Surface this to the user; if they explicitly approve committing these files, ` +
      `re-run the git add segment prefixed with ${BYPASS_TOKEN} ` +
      `(the bypass applies only to that segment).`,
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
  const vendor: Vendor = detectVendorFromInput(
    parsed,
    "tool",
    import.meta.filename,
  );
  const projectDir = getProjectDir(vendor, parsed);
  const toolCall = parsed.toolCall as
    | { name?: string; args?: Record<string, unknown> }
    | undefined;
  const toolName =
    parsed.tool_name ||
    (typeof toolCall?.name === "string" ? toolCall.name : "");
  const rawInput =
    parsed.tool_input ??
    (toolCall?.args && typeof toolCall.args === "object" ? toolCall.args : {});

  const hookInput: HookInput = {
    kind: "pre_tool",
    toolName,
    toolInput: { ...rawInput },
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
