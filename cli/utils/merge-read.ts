import { existsSync, readFileSync } from "node:fs";
import {
  type ParseError,
  parse as parseJsonc,
  printParseErrorCode,
} from "jsonc-parser";
import pc from "picocolors";
import { parse as parseToml } from "smol-toml";
import { isRecord } from "./type-guards.js";

/**
 * A user- or vendor-owned config file that oma is about to merge into.
 *
 * `invalid` means the file exists but does not parse to an object. Callers
 * must then leave the file untouched: treating it as `{}` and writing the merge
 * result back silently erases every setting the user had in it (permissions,
 * env, hooks, MCP servers).
 */
export type MergeRead =
  | { status: "missing" }
  | { status: "ok"; value: Record<string, unknown> }
  | { status: "invalid"; reason: string };

/**
 * Parse JSON text oma is about to merge into. Strict JSON first; text that only
 * parses as JSONC (comments, trailing commas) is accepted too, so one stray
 * comma cannot cost the user their settings. The merge result is written back
 * as strict JSON, and safe-write keeps the previous bytes as a backup.
 */
export function parseJsonForMerge(text: string): MergeRead {
  if (!text.trim()) return { status: "ok", value: {} };
  try {
    const parsed: unknown = JSON.parse(text);
    return isRecord(parsed)
      ? { status: "ok", value: parsed }
      : { status: "invalid", reason: "top-level value is not an object" };
  } catch {
    const errors: ParseError[] = [];
    const parsed: unknown = parseJsonc(text, errors, {
      allowTrailingComma: true,
    });
    if (errors.length === 0 && isRecord(parsed)) {
      return { status: "ok", value: parsed };
    }
    const first = errors[0];
    return {
      status: "invalid",
      reason: first
        ? `${printParseErrorCode(first.error)} at offset ${first.offset}`
        : "top-level value is not an object",
    };
  }
}

/** Parse TOML text oma is about to merge into (no lenient mode exists). */
export function parseTomlForMerge(text: string): MergeRead {
  if (!text.trim()) return { status: "ok", value: {} };
  try {
    const parsed: unknown = parseToml(text);
    return isRecord(parsed)
      ? { status: "ok", value: parsed }
      : { status: "invalid", reason: "top-level value is not a table" };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      status: "invalid",
      reason: message.split("\n")[0] ?? "invalid TOML",
    };
  }
}

function readForMerge(
  path: string,
  parse: (text: string) => MergeRead,
): MergeRead {
  if (!existsSync(path)) return { status: "missing" };
  let text: string;
  try {
    text = readFileSync(path, "utf-8");
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code;
    return { status: "invalid", reason: `unreadable (${code ?? "error"})` };
  }
  return parse(text);
}

/** Read a JSON file for a merge: `missing`, `ok`, or `invalid` (never `{}` on error). */
export function readJsonForMerge(path: string): MergeRead {
  return readForMerge(path, parseJsonForMerge);
}

/** Read a TOML file for a merge: `missing`, `ok`, or `invalid` (never `{}` on error). */
export function readTomlForMerge(path: string): MergeRead {
  return readForMerge(path, parseTomlForMerge);
}

/**
 * The object to merge into, or `null` when the file must be left untouched.
 * A missing file merges into `{}`.
 */
export function mergeBase(read: MergeRead): Record<string, unknown> | null {
  if (read.status === "invalid") return null;
  return read.status === "missing" ? {} : read.value;
}

// Several writers in one link pass can touch the same file (hook merge, then
// settings); one warning per file per process is enough.
const warnedPaths = new Set<string>();

/**
 * Tell the user oma skipped a config file it could not parse. Printed even in
 * quiet install/update runs: a silently skipped vendor config reads as
 * configured.
 */
export function warnUnmergeable(path: string, reason: string): void {
  if (warnedPaths.has(path)) return;
  warnedPaths.add(path);
  console.warn(
    `${pc.yellow("⚠")} Skipped ${path}: could not parse it (${reason}). oma left the file unchanged — fix it, then re-run ${pc.cyan("oma link")}.`,
  );
}

/**
 * Read for a merge and warn on `invalid`. Returns the merge base, or `null`
 * when the caller must skip its write.
 */
export function readJsonMergeBaseOrWarn(
  path: string,
): Record<string, unknown> | null {
  const read = readJsonForMerge(path);
  if (read.status === "invalid") warnUnmergeable(path, read.reason);
  return mergeBase(read);
}

/** TOML twin of {@link readJsonMergeBaseOrWarn}. */
export function readTomlMergeBaseOrWarn(
  path: string,
): Record<string, unknown> | null {
  const read = readTomlForMerge(path);
  if (read.status === "invalid") warnUnmergeable(path, read.reason);
  return mergeBase(read);
}
