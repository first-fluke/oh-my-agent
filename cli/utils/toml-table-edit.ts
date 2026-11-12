/**
 * Surgical edits to `[<prefix>."<key>"]` tables in a TOML file another tool
 * owns (Codex `config.toml`, Grok `trusted_folders.toml`, …).
 *
 * Those files are large, hand- or host-edited, and carry comments and layout
 * a parse → stringify round trip would destroy. So only the lines of the
 * affected tables change: a field is replaced or inserted inside its existing
 * table, and a missing table is appended at the end. The result is then
 * parsed again and compared with the original document plus exactly the
 * intended values; any difference (a key spelled as a dotted key or inline
 * table, an escape the header matcher does not read, …) rejects the edit and
 * the caller leaves the file untouched.
 */

import { isDeepStrictEqual } from "node:util";
import { parse as parseToml } from "smol-toml";
import { isRecord } from "./type-guards.js";

export interface TomlField {
  name: string;
  /** Parsed value the field must end up with. */
  value: string | number | boolean;
  /** Only add the field when absent; never overwrite an existing value. */
  onlyIfMissing?: boolean;
}

export interface TomlTableEdit {
  /** Dotted table prefix of bare keys, e.g. `projects`, `hooks.state`. */
  prefix: string;
  /** Final, quoted key segment. */
  key: string;
  fields: TomlField[];
  /**
   * Leave the table alone when its current fields say so (an explicit user
   * decision). Receives the parsed fields of the existing table.
   */
  skip?: (current: Record<string, unknown>) => boolean;
}

export type TomlEditOutcome = "changed" | "unchanged" | "skipped";

export type TomlTableEditResult =
  | { ok: true; text: string; outcomes: TomlEditOutcome[] }
  | { ok: false; reason: string };

const ANY_HEADER = /^\s*\[/;

function headerPattern(prefix: string): RegExp {
  const segments = prefix
    .split(".")
    .map((segment) => segment.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
    .join("\\s*\\.\\s*");
  return new RegExp(
    `^\\s*\\[\\s*${segments}\\s*\\.\\s*("(?:[^"\\\\]|\\\\.)*")\\s*\\]\\s*(?:#.*)?$`,
  );
}

function headerKey(line: string, pattern: RegExp): string | undefined {
  const quoted = pattern.exec(line)?.[1];
  if (!quoted) return undefined;
  try {
    const key: unknown = JSON.parse(quoted);
    return typeof key === "string" ? key : undefined;
  } catch {
    return undefined;
  }
}

function fieldPattern(name: string): RegExp {
  return new RegExp(`^\\s*${name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s*=`);
}

function parseLine(line: string): Record<string, unknown> | undefined {
  try {
    const parsed: unknown = parseToml(line);
    return isRecord(parsed) ? parsed : undefined;
  } catch {
    return undefined;
  }
}

function tomlLiteral(value: string | number | boolean): string {
  return typeof value === "string" ? JSON.stringify(value) : String(value);
}

function tableFields(body: string[]): Record<string, unknown> {
  const fields: Record<string, unknown> = {};
  for (const line of body) {
    if (!line.includes("=")) continue;
    const parsed = parseLine(line);
    if (parsed) Object.assign(fields, parsed);
  }
  return fields;
}

function applyEdit(lines: string[], edit: TomlTableEdit): TomlEditOutcome {
  const pattern = headerPattern(edit.prefix);
  const start = lines.findIndex(
    (line) => headerKey(line, pattern) === edit.key,
  );
  if (start === -1) {
    while (lines.length > 0 && lines[lines.length - 1]?.trim() === "") {
      lines.pop();
    }
    if (lines.length > 0) lines.push("");
    lines.push(`[${edit.prefix}.${JSON.stringify(edit.key)}]`);
    for (const field of edit.fields) {
      lines.push(`${field.name} = ${tomlLiteral(field.value)}`);
    }
    return "changed";
  }
  let end = start + 1;
  while (end < lines.length && !ANY_HEADER.test(lines[end] ?? "")) end++;
  const current = tableFields(lines.slice(start + 1, end));
  if (edit.skip?.(current)) return "skipped";
  let changed = false;
  for (const field of edit.fields) {
    const assignment = `${field.name} = ${tomlLiteral(field.value)}`;
    const matcher = fieldPattern(field.name);
    let index = -1;
    for (let i = start + 1; i < end; i++) {
      if (matcher.test(lines[i] ?? "")) {
        index = i;
        break;
      }
    }
    if (index === -1) {
      lines.splice(start + 1, 0, assignment);
      end++;
      changed = true;
      continue;
    }
    if (field.onlyIfMissing) continue;
    if (isDeepStrictEqual(current[field.name], field.value)) continue;
    lines[index] = assignment;
    changed = true;
  }
  return changed ? "changed" : "unchanged";
}

function setPath(
  root: Record<string, unknown>,
  path: string[],
  value: unknown,
): void {
  let node = root;
  for (const segment of path.slice(0, -1)) {
    if (!isRecord(node[segment])) node[segment] = {};
    node = node[segment] as Record<string, unknown>;
  }
  const last = path[path.length - 1];
  if (last !== undefined) node[last] = value;
}

function getPath(root: unknown, path: string[]): unknown {
  let node = root;
  for (const segment of path) {
    if (!isRecord(node)) return undefined;
    node = node[segment];
  }
  return node;
}

/**
 * Apply `edits` to TOML `original`. Returns the new text and one outcome per
 * edit, or `ok: false` when the original does not parse or the edited text
 * would not equal the original plus exactly the intended values.
 */
export function editTomlTables(
  original: string,
  edits: TomlTableEdit[],
): TomlTableEditResult {
  let expected: Record<string, unknown>;
  try {
    expected = parseToml(original) as Record<string, unknown>;
  } catch {
    return { ok: false, reason: "not valid TOML" };
  }
  const lines = original.split("\n");
  if (lines[lines.length - 1] === "") lines.pop();

  const outcomes = edits.map((edit) => {
    const outcome = applyEdit(lines, edit);
    if (outcome === "changed") {
      const tablePath = [...edit.prefix.split("."), edit.key];
      for (const field of edit.fields) {
        const fieldPath = [...tablePath, field.name];
        if (field.onlyIfMissing && getPath(expected, fieldPath) !== undefined) {
          continue;
        }
        setPath(expected, fieldPath, field.value);
      }
    }
    return outcome;
  });

  const text = lines.length > 0 ? `${lines.join("\n")}\n` : "";
  if (!outcomes.includes("changed")) {
    return { ok: true, text: original, outcomes };
  }
  try {
    if (!isDeepStrictEqual(parseToml(text), expected)) {
      return { ok: false, reason: "edit would not round-trip" };
    }
  } catch {
    return { ok: false, reason: "edit would not round-trip" };
  }
  return { ok: true, text, outcomes };
}
