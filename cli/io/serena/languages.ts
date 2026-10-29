import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { type Document, isMap, isScalar, isSeq, parseDocument } from "yaml";
import {
  detectableLanguages,
  detectProjectLanguages,
} from "../project-languages.js";

// Maps oma skill names to the Serena language server keys they require.
// DELIBERATE EXCLUSION: "bash" (bash-language-server ~40 MB) is never auto-added
// here. It is low-value for the projects oma manages and adds ~40 MB of LSP memory
// per open project. Users may add it manually to project.yml; reconcile (additive)
// will preserve it if already present. See design 021, Track A.
const SKILL_LANGUAGE_MAP: Record<string, string[]> = {
  "oma-frontend": ["typescript"],
  "oma-mobile": ["dart"],
  "oma-tf-infra": ["terraform"],
  // oma-db manages SQL migrations and schema via Python tooling (e.g. Alembic, pgmypy).
  // SQL LSP is intentionally excluded — it is heavy/low-value for the typical oma-db workflow.
  "oma-db": ["python"],
};

const BACKEND_VARIANT_MAP: Record<string, string> = {
  python: "python",
  node: "typescript",
  rust: "rust",
};

// oma-mobile stack.yaml `language` → Serena language server. `flutter` and
// `react-native` are already covered by SKILL_LANGUAGE_MAP / oma-frontend;
// the native variants need their own LSP (kotlin ~ Android, swift ~ iOS).
const MOBILE_VARIANT_MAP: Record<string, string> = {
  kotlin: "kotlin",
  swift: "swift",
};

function readStackLanguage(stackYaml: string): string | undefined {
  try {
    const content = readFileSync(stackYaml, "utf-8");
    return content.match(/^language:\s*(.+)$/m)?.[1]?.trim();
  } catch {
    return undefined; // best-effort
  }
}

/**
 * Resolve Serena language server keys from selected skills and backend variant.
 */
export function resolveSerenaLanguages(
  selectedSkills: string[],
  backendVariant?: string,
): string[] {
  const languages = new Set<string>();

  for (const skill of selectedSkills) {
    const mapped = SKILL_LANGUAGE_MAP[skill];
    if (mapped) {
      for (const lang of mapped) languages.add(lang);
    }
  }

  if (
    selectedSkills.includes("oma-backend") &&
    backendVariant &&
    BACKEND_VARIANT_MAP[backendVariant]
  ) {
    languages.add(BACKEND_VARIANT_MAP[backendVariant]);
  }

  // Fallback: at least typescript
  if (languages.size === 0) {
    languages.add("typescript");
  }

  return [...languages];
}

/**
 * Infer Serena languages from installed skills directory.
 * Used during `oma update` when selections are not available.
 */
export function inferSerenaLanguages(cwd: string): string[] {
  const languages = new Set<string>();
  const skillsDir = join(cwd, ".agents", "skills");

  for (const [skill, langs] of Object.entries(SKILL_LANGUAGE_MAP)) {
    if (existsSync(join(skillsDir, skill))) {
      for (const lang of langs) languages.add(lang);
    }
  }

  // Check backend stack.yaml for language
  const stackYaml = join(skillsDir, "oma-backend", "stack", "stack.yaml");
  if (existsSync(stackYaml)) {
    const variant = readStackLanguage(stackYaml);
    const mapped = variant ? BACKEND_VARIANT_MAP[variant] : undefined;
    if (mapped) languages.add(mapped);
  } else if (existsSync(join(skillsDir, "oma-backend"))) {
    // backend exists but no stack — default to typescript
    languages.add("typescript");
  }

  // Check mobile stack.yaml for a native variant (kotlin-android / swift-ios).
  // Flutter's `dart` is already added via SKILL_LANGUAGE_MAP; the project-file
  // intersection in deriveSerenaLanguages prunes it from a Kotlin-only repo.
  const mobileStackYaml = join(skillsDir, "oma-mobile", "stack", "stack.yaml");
  if (existsSync(mobileStackYaml)) {
    const variant = readStackLanguage(mobileStackYaml);
    const mapped = variant ? MOBILE_VARIANT_MAP[variant] : undefined;
    if (mapped) languages.add(mapped);
  }

  if (languages.size === 0) {
    languages.add("typescript");
  }

  return [...languages];
}

/**
 * Resolve the language servers this project should actually run.
 *
 * Skill-derived languages (`skillLanguages`) describe what the user might work
 * on; the project's files describe what they DO work on. A repo with the
 * `oma-mobile` skill installed but no `.dart` file has no use for a Dart LSP —
 * yet it paid ~15 MB plus startup latency for one in every concurrent agent
 * session, since every session spawns its own serena process tree.
 *
 * The two signals are NOT symmetric, and treating them as such backfires:
 * detection alone would hand a Flutter repo kotlin, swift, and ruby servers off
 * the back of its `android/`, `ios/`, and `Podfile` scaffolding — three LSPs
 * nobody asked for, making memory worse. So:
 *
 *   - ADDING a language stays skill-driven, intersected with what is present.
 *   - REMOVING is detection-driven, and only for languages oma can positively
 *     detect. `prunable` therefore holds detectable-but-absent languages, which
 *     leaves alone both hand-added entries oma has no detector for (bash) and
 *     languages the project genuinely contains.
 *
 * When detection finds nothing (empty scaffold, unreadable tree) the
 * skill-derived set passes through unfiltered and nothing is pruned — there is
 * no evidence to act on.
 */
export function deriveSerenaLanguages(
  cwd: string,
  skillLanguages: string[],
): { languages: string[]; prunable?: Set<string> } {
  const detected = new Set(detectProjectLanguages(cwd));
  if (detected.size === 0) return { languages: skillLanguages };

  const present = skillLanguages.filter((lang) =>
    detected.has(lang.toLowerCase()),
  );
  // No overlap at all means the skill set and the codebase disagree completely
  // (e.g. skills not installed yet). Trust neither enough to prune.
  if (present.length === 0) return { languages: skillLanguages };

  const prunable = new Set(
    [...detectableLanguages()].filter((lang) => !detected.has(lang)),
  );

  return { languages: present, prunable };
}

// ---------------------------------------------------------------------------
// Language reconcile (additive merge — Track A, Task 10)
// ---------------------------------------------------------------------------

/**
 * Advisory item returned by advisoryHeavyLanguages.
 * Consumed by the doctor command (cli/commands/doctor/serena-reap.ts — BE-3).
 */
export interface SerenaLanguageAdvisory {
  language: string;
  reason: string;
  suggestion: string;
}

/**
 * Languages that are considered heavy or low-value when not skill-derived.
 * Used to surface advisory findings in `oma doctor` (see T2-2 in design 021).
 * Key = language name as it appears in project.yml; value = approximate RSS.
 */
const HEAVY_UNMAPPED_LANGUAGES: Record<string, string> = {
  // bash-language-server is ~40 MB. Serena may add it via autogenerate (file scan)
  // if the project.yml ever lacks an explicit languages list. oma never adds it
  // (see SKILL_LANGUAGE_MAP deliberate exclusion above), but leftover entries from
  // serena autogenerate or manual edits are surfaced here.
  bash: "~40 MB",
};

/**
 * Serena renamed the project.yml language list from `languages` to
 * `language_servers` in 1.6.2, and the two versions are mutually incompatible
 * in one direction:
 *
 *   - ≥1.6.2 reads `language_servers`, and promotes `languages` only when the
 *     new key is ABSENT (`ProjectConfig.RENAMED_FIELDS`). Either key works.
 *   - 1.6.1 knows only `languages` and treats it as a required field, so a file
 *     carrying just `language_servers` makes it die with `KeyError: 'languages'`
 *     before the MCP server ever starts.
 *
 * That asymmetry bites on any machine running both — e.g. an IDE wired to
 * `uvx --from git+…serena` (tracking main) beside oma's `uv tool install`
 * (stable). The newer one rewrites project.yml under the new name and the older
 * one can no longer start in that project at all.
 *
 * So oma keeps every language key that is present in sync, and repairs a file
 * that has only the new key by adding the legacy one back. Both keys side by
 * side is a configuration both versions accept. New files oma writes carry
 * `languages` alone, which is the universally readable form.
 */
const LANGUAGE_KEYS = ["language_servers", "languages"] as const;

/** The key whose list is authoritative, preferring serena's current name. */
function languageKey(doc: Document): (typeof LANGUAGE_KEYS)[number] | null {
  for (const key of LANGUAGE_KEYS) {
    if (doc.has(key)) return key;
  }
  return null;
}

/** One entry of the language list, with any comment attached to it. */
export interface LanguageEntry {
  /** Lower-cased value, for comparison. */
  name: string;
  /** Value exactly as written. */
  raw: string;
  /** Trailing `# …` comment content, without the marker. */
  comment?: string;
}

/**
 * The language list located in the source text.
 *
 * `start`/`end` are byte offsets of the sequence node itself, so a caller can
 * splice a rebuilt list in without disturbing a single byte elsewhere in the
 * file. Re-serializing the whole `Document` would be simpler but is not
 * faithful: it re-folds long scalars and collapses blank lines, which rewrites
 * hundreds of unrelated lines in a real project.yml.
 */
export interface LanguageList {
  /** Top-level YAML key this list belongs to. */
  key: string;
  entries: LanguageEntry[];
  /** Flow style (`["ts"]`) vs block style (`- ts`). */
  flow: boolean;
  /** Indentation of block-style entries, e.g. `""` or `"  "`. */
  indent: string;
  /** Offset of the key's own line, for inserting a sibling block. */
  keyLineStart: number;
  start: number;
  end: number;
}

/**
 * Every language list in the file, authoritative one first. A file may legally
 * carry both keys — that is in fact the cross-version-safe shape — and oma
 * keeps them in sync rather than picking one and letting the other rot.
 */
function readLanguageLists(yml: string): LanguageList[] {
  const doc = parseDocument(yml);
  if (doc.errors.length > 0) return [];

  const primary = languageKey(doc);
  if (!primary) return [];

  const ordered = [
    primary,
    ...LANGUAGE_KEYS.filter((key) => key !== primary && doc.has(key)),
  ];

  const lists: LanguageList[] = [];
  for (const key of ordered) {
    const list = readLanguageList(yml, doc, key);
    if (!list) return []; // any unreadable list disqualifies the whole rewrite
    lists.push(list);
  }
  return lists;
}

/** Source offset of a top-level key's own token, e.g. the `l` of `languages:`. */
function findKeyOffset(doc: Document, key: string): number | null {
  if (!isMap(doc.contents)) return null;
  for (const pair of doc.contents.items) {
    const node = pair.key;
    if (isScalar(node) && String(node.value) === key && node.range) {
      return node.range[0];
    }
  }
  return null;
}

/** @internal shared with the contexts reconciler. */
export function readLanguageList(
  yml: string,
  doc: Document,
  key: string,
  allowEmpty = false,
): LanguageList | null {
  const seq = doc.get(key, true);
  if (!isSeq(seq) || !seq.range) return null;

  const keyOffset = findKeyOffset(doc, key);
  if (keyOffset === null) return null;
  const keyLineStart = yml.lastIndexOf("\n", keyOffset - 1) + 1;

  const entries: LanguageEntry[] = [];
  let firstStart = seq.range[0];
  let lastValueEnd = seq.range[1];

  for (const [index, item] of seq.items.entries()) {
    if (!isScalar(item) || !item.range) return null; // nested structure — hands off
    // A comment on its own line above an entry lives outside the span this
    // function reports, so rewriting the list could orphan or duplicate it.
    // Rare enough (serena's own template has none) to simply decline.
    if (item.commentBefore) return null;
    const raw = String(item.value ?? "").trim();
    if (!raw) return null;
    entries.push({
      name: raw.toLowerCase(),
      raw,
      comment: item.comment ?? undefined,
    });
    if (index === 0) firstStart = item.range[0];
    lastValueEnd = item.range[1];
  }

  if (entries.length === 0 && !allowEmpty) return null;

  if (seq.flow) {
    const [start, end] = seq.range;
    return { key, entries, flow: true, indent: "", keyLineStart, start, end };
  }

  // Block style: span from the start of the first entry's LINE (so the `- `
  // marker and indentation are inside the splice) to the end of the last
  // entry's line (so a trailing `# comment` is replaced rather than
  // duplicated). Deliberately excludes the sequence node's own trailing
  // whitespace, which `range[1]` swallows along with any following blank line.
  const start = yml.lastIndexOf("\n", firstStart - 1) + 1;
  const indent = /^[ \t]*/.exec(yml.slice(start, firstStart))?.[0] ?? "";

  const lineBreak = yml.indexOf("\n", lastValueEnd);
  const end = lineBreak === -1 ? yml.length : lineBreak;

  return { key, entries, flow: false, indent, keyLineStart, start, end };
}

/** Render a language list back to source text in its original style. @internal */
export function renderLanguageList(
  list: LanguageList,
  entries: LanguageEntry[],
): string {
  if (list.flow) {
    return `[${entries.map((entry) => JSON.stringify(entry.raw)).join(", ")}]`;
  }
  return entries
    .map((entry) => {
      const trailing = entry.comment ? ` #${entry.comment}` : "";
      return `${list.indent}- ${entry.raw}${trailing}`;
    })
    .join("\n");
}

export interface ReconcileLanguagesOptions {
  /**
   * Languages that may be REMOVED when absent from `derivedLanguages` —
   * populated by {@link deriveSerenaLanguages} with the languages oma can
   * detect but did not find in the project. Everything else is preserved:
   * entries oma has no detector for (bash, hand-added exotica) and entries the
   * project genuinely contains. Omit it for additive-only reconcile.
   */
  prunable?: Set<string>;
}

/**
 * Pure function — merge derived languages into existing YAML content.
 *
 * Rules:
 * - The authoritative list is the one under serena's current key; every other
 *   language key present is rewritten to match, and a file carrying only
 *   `language_servers` gains a `languages` mirror so serena 1.6.1 can still
 *   read it (see {@link LANGUAGE_KEYS}).
 * - Adds derived languages that are missing (case-insensitive comparison).
 * - Removes entries only when `opts.prunable` says oma can detect that language
 *   and the project no longer contains it. Never empties the list.
 * - Returns the updated YAML string, or null when no change is needed (idempotent).
 * - Only the bytes of the language lists themselves are rewritten. Comments
 *   attached to a surviving entry (`- typescript # pinned`) ride along with it.
 *
 * Malformed YAML is left alone — better to skip a reconcile than to clobber a
 * file the user is mid-edit on. serena reports the parse error itself.
 *
 * Blocking autogenerate: by always writing an explicit, non-empty list, oma
 * ensures serena's `ProjectConfig.autogenerate` (broad file scan) never fires.
 */
export function reconcileSerenaLanguages(
  existingYml: string,
  derivedLanguages: string[],
  opts: ReconcileLanguagesOptions = {},
): string | null {
  if (derivedLanguages.length === 0) return null;

  const lists = readLanguageLists(existingYml);
  const primary = lists[0];

  if (!primary) {
    // Unparseable file — don't touch it.
    if (parseDocument(existingYml).errors.length > 0) return null;

    // No usable list — prepend one so autogenerate never fires. The legacy key
    // is accepted natively by serena 1.6.1 and promoted by ≥1.6.2.
    const block = `languages:\n${derivedLanguages.map((l) => `- ${l}`).join("\n")}\n`;
    return `${block}\n${existingYml}`;
  }

  const derivedLower = new Set(derivedLanguages.map((l) => l.toLowerCase()));
  const { prunable } = opts;

  const kept = primary.entries.filter((entry) => {
    if (derivedLower.has(entry.name)) return true;
    if (!prunable) return true; // additive-only mode
    return !prunable.has(entry.name); // undetectable languages stay
  });

  const keptNames = new Set(kept.map((entry) => entry.name));
  const added: LanguageEntry[] = derivedLanguages
    .filter((lang) => !keptNames.has(lang.toLowerCase()))
    .map((lang) => ({ name: lang.toLowerCase(), raw: lang }));

  const next = [...kept, ...added];
  if (next.length === 0) return null; // never empty the list

  // A file with only the new key is unreadable to serena 1.6.1, so mirror the
  // list under the legacy name as well.
  const needsLegacyMirror = !lists.some((list) => list.key === "languages");

  const primaryUnchanged =
    kept.length === primary.entries.length && added.length === 0;
  const mirrorsMatch = lists
    .slice(1)
    .every(
      (list) =>
        list.entries.length === next.length &&
        list.entries.every((entry, i) => entry.name === next[i]?.name),
    );
  if (primaryUnchanged && mirrorsMatch && !needsLegacyMirror) return null;

  // Splice back to front so earlier offsets stay valid.
  let updated = existingYml;
  for (const list of [...lists].sort((a, b) => b.start - a.start)) {
    updated =
      updated.slice(0, list.start) +
      renderLanguageList(list, next) +
      updated.slice(list.end);
  }

  if (needsLegacyMirror) {
    const mirror = `languages:\n${next.map((entry) => `- ${entry.raw}`).join("\n")}\n`;
    updated =
      updated.slice(0, primary.keyLineStart) +
      mirror +
      updated.slice(primary.keyLineStart);
  }

  return updated === existingYml ? null : updated;
}

/**
 * Pure function — given the languages currently in project.yml and the
 * skill-derived set, returns advisory findings for languages that are:
 *   (a) not skill-derived, AND
 *   (b) heavy or low-value (e.g. bash-language-server ~40 MB).
 *
 * Does NOT remove any language — removal is a manual user action.
 * BE-3 is responsible for surfacing these findings in `oma doctor` output via
 * `cli/commands/doctor/serena-reap.ts`.
 *
 * @param projectYmlLanguages - languages list as found in .serena/project.yml
 * @param derivedLanguages    - languages oma would derive from installed skills
 * @returns advisory findings, empty array when nothing to report
 */
export function advisoryHeavyLanguages(
  projectYmlLanguages: string[],
  derivedLanguages: string[],
): SerenaLanguageAdvisory[] {
  const derivedLower = new Set(derivedLanguages.map((l) => l.toLowerCase()));
  const advisories: SerenaLanguageAdvisory[] = [];

  for (const lang of projectYmlLanguages) {
    const key = lang.toLowerCase();
    if (derivedLower.has(key)) continue; // skill-derived — expected
    const rss = HEAVY_UNMAPPED_LANGUAGES[key];
    if (!rss) continue; // not a known heavy language — no advisory

    advisories.push({
      language: lang,
      reason: `"${lang}" (${rss} LSP memory) is present in project.yml but not derived from any installed oma skill.`,
      suggestion: `Remove "- ${lang}" from .serena/project.yml to reclaim ~${rss} of memory per open project, or install the skill that requires it.`,
    });
  }

  return advisories;
}

/**
 * Parse the language list from a .serena/project.yml content string, reading
 * whichever key the file uses (`language_servers` on serena ≥1.6.2, `languages`
 * before it). Convenience helper for consumers (e.g. doctor command) that
 * already hold the file content and need the list without re-reading the file.
 */
export function parseProjectYmlLanguages(ymlContent: string): string[] {
  const doc = parseDocument(ymlContent);
  if (doc.errors.length > 0) return [];

  const key = languageKey(doc);
  const seq = key ? doc.get(key, true) : null;
  if (!isSeq(seq)) return [];

  return seq.items
    .map((item) => (isScalar(item) ? String(item.value ?? "").trim() : ""))
    .filter((name) => name.length > 0);
}
