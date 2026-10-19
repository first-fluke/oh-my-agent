import {
  existsSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { homedir } from "node:os";
import { join, resolve } from "node:path";
import { parseDocument } from "yaml";
import {
  OMA_SERENA_BASE_CONTEXTS,
  OMA_SERENA_CONTEXT,
  OMA_SERENA_FIXED_TOOLS,
} from "../vendors/serena.js";
import {
  type LanguageEntry,
  type ReconcileLanguagesOptions,
  readLanguageList,
  reconcileSerenaLanguages,
  renderLanguageList,
} from "./serena/languages.js";
import { DART_PROJECT_TOOL, ensureSerenaAdapter } from "./serena-adapter.js";
import { reconcileSerenaRuntimeSettings } from "./serena-runtime-settings.js";

export {
  ensureSerenaBinary,
  isSerenaBinaryAvailable,
  isUvAvailable,
  SERENA_INSTALL_HINT,
  type SerenaBinaryOutcome,
} from "./serena/binary.js";
export {
  advisoryHeavyLanguages,
  deriveSerenaLanguages,
  inferSerenaLanguages,
  parseProjectYmlLanguages,
  resolveSerenaLanguages,
  type SerenaLanguageAdvisory,
} from "./serena/languages.js";
export type { ReconcileLanguagesOptions };
export { reconcileSerenaLanguages };

const SERENA_CONFIG_PATH = join(homedir(), ".serena", "serena_config.yml");

/**
 * Floor for Serena's global `default_max_tool_answer_chars`.
 *
 * Serena tools accept per-call `max_answer_chars` (default -1 → this global).
 * The bridge raises tiny search_for_pattern caps (e.g. 3000) before forwarding.
 * This global floor fixes missing or legacy-low global
 * defaults that reject moderate search hits (~25k+) with
 * "The answer is too long". Serena's own template uses 150_000.
 */
export const SERENA_DEFAULT_MAX_TOOL_ANSWER_CHARS = 150_000;
/** Raise the global default only when it is missing or below this floor. */
export const SERENA_MAX_TOOL_ANSWER_CHARS_FLOOR = 50_000;

/** Serena tools that belong to its memory/onboarding state plane. */
export const SERENA_STATE_TOOLS = [
  "write_memory",
  "read_memory",
  "list_memories",
  "delete_memory",
  "rename_memory",
  "edit_memory",
  "onboarding",
  "check_onboarding_performed",
] as const;

export type SerenaContextsOutcome = {
  changed: string[];
  failed: string[];
};

export const OMA_SERENA_CONTEXT_YML = [
  "description: Shared OMA code-intelligence context",
  "prompt: |",
  "  Serena is OMA's code-intelligence layer.",
  "  Always use Serena for code discovery and search. Use native search only",
  "  when Serena is unavailable or times out, or for plain non-code reads.",
  "  Use Serena's symbol-aware editing tools after locating code when appropriate.",
  "  OMA owns workflow and coordination state; do not request memory or onboarding tools.",
  "excluded_tools: []",
  "included_optional_tools: []",
  "fixed_tools:",
  ...OMA_SERENA_FIXED_TOOLS.map((tool) => `- ${tool}`),
  "tool_description_overrides: {}",
  "single_project: true",
  "structured_tool_output: false",
  "",
].join("\n");

/**
 * Install one deterministic OMA-owned Serena context for every supported
 * client. Its fixed allowlist retains code search, diagnostics, and symbolic
 * editing while removing memory/onboarding from MCP registration entirely.
 */
export function ensureOmaSerenaContexts(
  adapter = ensureSerenaAdapter(),
): SerenaContextsOutcome {
  const changed: string[] = [];
  const failed: string[] = [];
  if (adapter.status === "unsupported" || adapter.status === "error") {
    failed.push(`Dart adapter: ${adapter.error ?? adapter.status}`);
  }
  const serenaHome =
    process.env.SERENA_HOME?.trim() || join(homedir(), ".serena");
  const contextsDir = join(serenaHome, "contexts");
  const contextPath = join(contextsDir, `${OMA_SERENA_CONTEXT}.yml`);
  let contextReady = false;
  const desired =
    adapter.status === "ready"
      ? OMA_SERENA_CONTEXT_YML.replace(
          "fixed_tools:\n",
          `fixed_tools:\n- ${DART_PROJECT_TOOL}\n`,
        )
      : OMA_SERENA_CONTEXT_YML;

  try {
    mkdirSync(contextsDir, { recursive: true });
    const current = existsSync(contextPath)
      ? readFileSync(contextPath, "utf-8")
      : null;
    if (current !== desired) {
      writeFileSync(contextPath, desired, "utf-8");
      changed.push(OMA_SERENA_CONTEXT);
    }
    contextReady = true;
  } catch {
    failed.push(OMA_SERENA_CONTEXT);
  }

  for (const baseContext of contextReady ? OMA_SERENA_BASE_CONTEXTS : []) {
    const legacyPath = join(contextsDir, `oma-${baseContext}.yml`);
    if (!existsSync(legacyPath)) continue;
    try {
      rmSync(legacyPath);
      if (!changed.includes(OMA_SERENA_CONTEXT)) {
        changed.push(OMA_SERENA_CONTEXT);
      }
    } catch {
      failed.push(`oma-${baseContext}`);
    }
  }

  return { changed, failed };
}

/**
 * Hard-exclude Serena's state tools in a Serena YAML configuration.
 *
 * Serena 1.7.0's `no-memories` mode updates its internal active-tool list but
 * still advertises the memory tools through MCP `tools/list`. OMA applies this
 * reconciler to its client contexts (the authoritative registration layer)
 * and to project.yml as defense in depth.
 */
export function reconcileSerenaToolExclusions(
  existingYml: string,
): string | null {
  const yml = existingYml.replace(
    /^excluded_tools:[ \t]+$/m,
    "excluded_tools:",
  );
  const doc = parseDocument(yml);
  if (doc.errors.length > 0) return null;

  if (!doc.has("excluded_tools")) {
    const block = `excluded_tools:\n${SERENA_STATE_TOOLS.map((tool) => `- ${tool}`).join("\n")}\n`;
    return `${block}\n${yml}`;
  }

  const list = readLanguageList(yml, doc, "excluded_tools", true);
  if (!list) return null;
  const names = new Set(list.entries.map((entry) => entry.name));
  const missing: LanguageEntry[] = SERENA_STATE_TOOLS.filter(
    (tool) => !names.has(tool),
  ).map((tool) => ({ name: tool, raw: tool }));
  if (missing.length === 0) return yml === existingYml ? null : yml;

  const next = [...list.entries, ...missing];
  const replacement =
    list.flow && list.entries.length === 0
      ? `\n${next.map((entry) => `- ${entry.raw}`).join("\n")}`
      : renderLanguageList(list, next);
  const updated = yml.slice(0, list.start) + replacement + yml.slice(list.end);
  return updated === existingYml ? null : updated;
}

/**
 * IO wrapper — reads the existing project.yml, calls reconcileSerenaLanguages,
 * and writes back only if there is a change.
 * Returns true when the file was updated, false when already up-to-date.
 */
export function reconcileSerenaProjectConfig(
  cwd: string,
  derivedLanguages: string[],
  opts: ReconcileLanguagesOptions = {},
): boolean {
  const projectYml = join(cwd, ".serena", "project.yml");

  if (!existsSync(projectYml)) return false;

  const existing = readFileSync(projectYml, "utf-8");
  const languageUpdated =
    reconcileSerenaLanguages(existing, derivedLanguages, opts) ?? existing;
  const exclusionsUpdated =
    reconcileSerenaToolExclusions(languageUpdated) ?? languageUpdated;
  const updated =
    reconcileSerenaRuntimeSettings(exclusionsUpdated, cwd) ?? exclusionsUpdated;

  if (updated === existing) return false;

  writeFileSync(projectYml, updated);
  return true;
}

/**
 * True when `cwd` must never be set up as a Serena project.
 *
 * `$HOME` is the install root of `oma install --global`, but it is not a
 * codebase. Treating it as one has three distinct costs:
 *
 *   - `~/.serena/project.yml` lands in the directory serena keeps its own GLOBAL
 *     config in, so the two are no longer separable.
 *   - `--project-from-cwd` walks UP from the session's working directory looking
 *     for `.serena/project.yml` or `.git`. Once that file exists at `$HOME`,
 *     every non-git directory under it silently activates the entire home
 *     directory as its project.
 *   - language detection scans up to 20k files under `$HOME` and picks up
 *     whatever happens to live there, booting language servers nobody asked for.
 *
 * The same reasoning applies to a project-mode install run from `$HOME`, so the
 * guard is keyed on the path rather than on the install mode. Callers that know
 * they are in global mode should skip the whole setup earlier — this is the
 * backstop that keeps any future caller from re-introducing the damage.
 */
export function isForbiddenSerenaProjectRoot(cwd: string): boolean {
  return resolve(cwd) === resolve(homedir());
}

/**
 * Ensure `~/.serena/serena_config.yml` has a usable
 * `default_max_tool_answer_chars`.
 *
 * - Missing key → append Serena's default (150_000).
 * - Present but below {@link SERENA_MAX_TOOL_ANSWER_CHARS_FLOOR} → raise to
 *   {@link SERENA_DEFAULT_MAX_TOOL_ANSWER_CHARS}.
 * - Present and ≥ floor → leave alone (respect intentional higher/equal caps).
 *
 * Comment-preserving: only rewrites the target key line (or appends one).
 * Returns true when the file was modified.
 */
export function ensureSerenaDefaultMaxAnswerChars(): boolean {
  if (!existsSync(SERENA_CONFIG_PATH)) return false;

  try {
    const content = readFileSync(SERENA_CONFIG_PATH, "utf-8");
    const keyRe =
      /^([ \t]*default_max_tool_answer_chars:[ \t]*)(-?\d+)[ \t]*$/m;
    const match = content.match(keyRe);

    if (match) {
      const current = Number(match[2]);
      if (
        Number.isFinite(current) &&
        current >= SERENA_MAX_TOOL_ANSWER_CHARS_FLOOR
      ) {
        return false;
      }
      const updated = content.replace(
        keyRe,
        `$1${SERENA_DEFAULT_MAX_TOOL_ANSWER_CHARS}`,
      );
      if (updated === content) return false;
      writeFileSync(SERENA_CONFIG_PATH, updated);
      return true;
    }

    const suffix = content.endsWith("\n") ? "" : "\n";
    writeFileSync(
      SERENA_CONFIG_PATH,
      `${content}${suffix}default_max_tool_answer_chars: ${SERENA_DEFAULT_MAX_TOOL_ANSWER_CHARS}\n`,
    );
    return true;
  } catch {
    return false;
  }
}

/**
 * Register the project path in ~/.serena/serena_config.yml if not already present.
 */
export function ensureSerenaRegistered(cwd: string): boolean {
  const projectPath = resolve(cwd);

  if (isForbiddenSerenaProjectRoot(projectPath)) {
    return false;
  }

  if (!existsSync(SERENA_CONFIG_PATH)) {
    return false;
  }

  try {
    const content = readFileSync(SERENA_CONFIG_PATH, "utf-8");

    // Parse existing projects list
    const projectsMatch = content.match(
      /^(projects:\s*\n)((?:\s*-\s*.+\n?)*)/m,
    );
    if (!projectsMatch) {
      return false;
    }

    const projectLines =
      (projectsMatch[2] ?? "").match(/^\s*-\s*(.+)$/gm) || [];
    const existingPaths = projectLines.map((line) =>
      resolve(line.replace(/^\s*-\s*/, "").trim()),
    );

    if (existingPaths.includes(projectPath)) {
      return false; // already registered
    }

    // Insert new project entry at the end of the projects list
    const insertPos = (projectsMatch.index ?? 0) + projectsMatch[0].length;
    const newEntry = `- ${projectPath}\n`;
    const newContent =
      content.slice(0, insertPos) + newEntry + content.slice(insertPos);

    writeFileSync(SERENA_CONFIG_PATH, newContent);
    return true;
  } catch {
    return false;
  }
}

/**
 * Remove `target` from the `projects:` list in ~/.serena/serena_config.yml.
 * Returns true when an entry was actually removed.
 *
 * Only the bytes of the matching list lines are rewritten; serena's own
 * config file is heavily commented and must survive untouched.
 */
export function unregisterSerenaProject(target: string): boolean {
  if (!existsSync(SERENA_CONFIG_PATH)) return false;

  const wanted = resolve(target);

  try {
    const content = readFileSync(SERENA_CONFIG_PATH, "utf-8");

    const projectsMatch = content.match(
      /^(projects:\s*\n)((?:\s*-\s*.+\n?)*)/m,
    );
    if (!projectsMatch) return false;

    const block = projectsMatch[2] ?? "";
    const kept = block
      .split("\n")
      .filter((line) => {
        const entry = /^\s*-\s*(.+)$/.exec(line);
        if (!entry?.[1]) return true; // trailing empty segment — preserve
        return resolve(entry[1].trim()) !== wanted;
      })
      .join("\n");

    if (kept === block) return false;

    const blockStart =
      (projectsMatch.index ?? 0) + (projectsMatch[1] ?? "").length;
    const updated =
      content.slice(0, blockStart) +
      kept +
      content.slice(blockStart + block.length);

    writeFileSync(SERENA_CONFIG_PATH, updated);
    return true;
  } catch {
    return false;
  }
}

const DEFAULT_PROJECT_YML = (languages: string[], projectName: string) =>
  `languages:
${languages.map((l) => `- ${l}`).join("\n")}

encoding: "utf-8"
ignore_all_files_in_gitignore: true
ignored_paths:
- .serena/cache
read_only: false
excluded_tools:
${SERENA_STATE_TOOLS.map((tool) => `- ${tool}`).join("\n")}
initial_prompt: ""
project_name: "${projectName}"
included_optional_tools: []
base_modes:
default_modes:
fixed_tools: []
symbol_info_budget:
language_backend:
read_only_memory_patterns: []
line_ending:
ignored_memory_patterns: []
ls_specific_settings: {}
`;

/**
 * Create .serena/project.yml and directory structure if not present.
 * When project.yml already exists, performs an additive language reconcile
 * (merges skill-derived languages in, never removes existing entries).
 *
 * Returns:
 *   "created"    — file did not exist and was created
 *   "reconciled" — file existed and new languages were merged in
 *   "unchanged"  — file existed and was already up-to-date
 *   "skipped"    — cwd is not a legal project root (see
 *                  {@link isForbiddenSerenaProjectRoot}); nothing was written
 */
export function ensureSerenaProjectConfig(
  cwd: string,
  languages: string[],
  opts: ReconcileLanguagesOptions = {},
): "created" | "reconciled" | "unchanged" | "skipped" {
  if (isForbiddenSerenaProjectRoot(cwd)) return "skipped";

  const serenaDir = join(cwd, ".serena");
  const projectYml = join(serenaDir, "project.yml");

  if (existsSync(projectYml)) {
    const changed = reconcileSerenaProjectConfig(cwd, languages, opts);
    return changed ? "reconciled" : "unchanged";
  }

  const projectName =
    cwd.split("/").pop() || cwd.split("\\").pop() || "project";

  mkdirSync(serenaDir, { recursive: true });
  const content = DEFAULT_PROJECT_YML(languages, projectName);
  writeFileSync(
    projectYml,
    reconcileSerenaRuntimeSettings(content, cwd) ?? content,
  );

  // Ensure .gitignore
  const gitignorePath = join(serenaDir, ".gitignore");
  if (!existsSync(gitignorePath)) {
    writeFileSync(gitignorePath, "/cache\n");
  }

  // Serena-owned project knowledge (not OMA workflow coordination state).
  const memoriesDir = join(serenaDir, "memories");
  mkdirSync(memoriesDir, { recursive: true });
  const gitkeep = join(memoriesDir, ".gitkeep");
  if (!existsSync(gitkeep)) {
    writeFileSync(gitkeep, "");
  }

  return "created";
}

/**
 * Ensure the project is set up for Serena:
 * 1. Create .serena/project.yml if missing (or reconcile languages if it exists)
 * 2. Register in ~/.serena/serena_config.yml if missing
 * 3. Ensure global `default_max_tool_answer_chars` is not missing/too low
 *
 * Returns:
 *   configured  — "created" | "reconciled" | "unchanged" | "skipped" (project.yml outcome)
 *   registered  — true when the project was newly registered in serena_config.yml
 *   maxAnswerChars  — true when global default_max_tool_answer_chars was written
 *
 * Steps 1–2 decline for a forbidden root (see
 * {@link isForbiddenSerenaProjectRoot}), yielding `{ configured: "skipped",
 * registered: false }`. Step 3 still runs (global config is independent of cwd).
 */
export function ensureSerenaProject(
  cwd: string,
  languages: string[],
  opts: ReconcileLanguagesOptions = {},
): {
  configured: "created" | "reconciled" | "unchanged" | "skipped";
  registered: boolean;
  maxAnswerChars: boolean;
} {
  const configured = ensureSerenaProjectConfig(cwd, languages, opts);
  const registered = ensureSerenaRegistered(cwd);
  const maxAnswerChars = ensureSerenaDefaultMaxAnswerChars();
  return { configured, registered, maxAnswerChars };
}
