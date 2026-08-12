/**
 * Append template keys missing from the user's oma-config.yaml.
 *
 * `oma update` preserves the user's config byte-for-byte; this pass runs
 * afterwards and appends only top-level keys that the shipped template
 * defines but the user file lacks. Keys the user already has — modified or
 * not — are never touched, so the existing content stays byte-identical.
 */
import { parse as parseYaml, stringify as stringifyYaml } from "yaml";

export interface ConfigMergeResult {
  content: string;
  addedKeys: string[];
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

const UPDATE_HEADER =
  "Added by oma update — new config keys (template defaults; edit freely)";

/**
 * @param headerComment Comment introducing the appended block. Migrations pass
 * their own so the file records which change put the keys there.
 */
export function appendMissingConfigKeys(
  userRaw: string,
  templateRaw: string,
  headerComment: string = UPDATE_HEADER,
): ConfigMergeResult {
  const noop: ConfigMergeResult = { content: userRaw, addedKeys: [] };

  let user: Record<string, unknown>;
  let template: Record<string, unknown>;
  try {
    const parsedTemplate = parseYaml(templateRaw);
    if (!isPlainObject(parsedTemplate)) return noop;
    template = parsedTemplate;

    const parsedUser = parseYaml(userRaw);
    if (parsedUser === null || parsedUser === undefined) {
      user = {};
    } else if (isPlainObject(parsedUser)) {
      user = parsedUser;
    } else {
      return noop;
    }
  } catch {
    // Malformed YAML on either side — leave the user's file untouched
    return noop;
  }

  const missing: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(template)) {
    if (!(key in user)) missing[key] = value;
  }
  const addedKeys = Object.keys(missing);
  if (addedKeys.length === 0) return noop;

  const base =
    userRaw.length === 0 || userRaw.endsWith("\n") ? userRaw : `${userRaw}\n`;
  const block = `\n# ${headerComment}\n${stringifyYaml(missing)}`;
  return { content: base + block, addedKeys };
}

/**
 * Append child entries under one top-level section, creating the section when
 * the user does not have it yet.
 *
 * `appendMissingConfigKeys` works at the top level only: a user who already has
 * `models:` gets nothing, and a second `models:` block appended at the bottom
 * would be a duplicate key that fails to parse. This walks to the end of the
 * existing block and splices the new entries in, so everything the user already
 * wrote — keys, comments, ordering, blank lines — stays byte-identical.
 *
 * `addedKeys` is the list of entry keys written, not the section name.
 * Returns a no-op result when the file is malformed, when the section holds
 * something other than a mapping, or when the splice would not parse back.
 */
export function appendSectionEntries(
  userRaw: string,
  section: string,
  entries: Record<string, unknown>,
  headerComment: string = UPDATE_HEADER,
): ConfigMergeResult {
  const noop: ConfigMergeResult = { content: userRaw, addedKeys: [] };
  const entryKeys = Object.keys(entries);
  if (entryKeys.length === 0) return noop;

  let user: Record<string, unknown>;
  try {
    const parsed = parseYaml(userRaw);
    if (parsed === null || parsed === undefined) user = {};
    else if (isPlainObject(parsed)) user = parsed;
    else return noop;
  } catch {
    return noop;
  }

  if (!(section in user)) {
    const created = appendMissingConfigKeys(
      userRaw,
      stringifyYaml({ [section]: entries }),
      headerComment,
    );
    if (created.addedKeys.length === 0) return noop;
    return { content: created.content, addedKeys: entryKeys };
  }

  const existing = user[section];
  // A null section is an empty mapping waiting to be filled; a scalar or a
  // sequence is something else entirely and is not ours to rewrite.
  if (existing !== null && !isPlainObject(existing)) return noop;

  const spliced = spliceIntoSection(userRaw, section, entries, headerComment);
  if (spliced === null) return noop;

  // The splice is line arithmetic, so prove the result still parses and still
  // carries every entry before handing it back to be written.
  try {
    const reparsed = parseYaml(spliced);
    if (!isPlainObject(reparsed)) return noop;
    const merged = reparsed[section];
    if (!isPlainObject(merged)) return noop;
    if (!entryKeys.every((key) => key in merged)) return noop;
  } catch {
    return noop;
  }

  return { content: spliced, addedKeys: entryKeys };
}

/**
 * Insert `entries` after the last line belonging to `section`'s block.
 * Returns null when the section header is not a plain `key:` line — an inline
 * flow mapping (`models: {}`) has no block to append to.
 */
function spliceIntoSection(
  userRaw: string,
  section: string,
  entries: Record<string, unknown>,
  headerComment: string,
): string | null {
  const lines = userRaw.split("\n");
  const headerPattern = new RegExp(`^${escapeRegExp(section)}:[ \t]*(#.*)?$`);

  const sectionIndex = lines.findIndex((line) => headerPattern.test(line));
  if (sectionIndex === -1) return null;

  let insertAfter = sectionIndex;
  for (let i = sectionIndex + 1; i < lines.length; i++) {
    const line = lines[i] ?? "";
    if (line.trim() === "") continue;
    // The first line back at column 0 ends the block.
    if (!/^[ \t]/.test(line)) break;
    insertAfter = i;
  }

  const body = stringifyYaml(entries, { indent: 2, lineWidth: 0 })
    .replace(/\n+$/, "")
    .split("\n")
    .map((line) => (line === "" ? line : `  ${line}`));

  lines.splice(insertAfter + 1, 0, `  # ${headerComment}`, ...body);
  return lines.join("\n");
}
