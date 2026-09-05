import { existsSync, readFileSync } from "node:fs";
import {
  applyEdits,
  modify,
  type ParseError,
  parse as parseJsonc,
} from "jsonc-parser";
import { parse as parseToml, stringify as stringifyToml } from "smol-toml";
import { parseDocument } from "yaml";
import { isRecord } from "../utils/type-guards.js";
import type { BrowserMcpTarget } from "./browser-mcp-targets.js";

/** Path edits retain JSONC/YAML comments and every unrelated setting. */
export function browserMcpDocument(target: BrowserMcpTarget) {
  const original = existsSync(target.path)
    ? readFileSync(target.path, "utf-8")
    : "";
  const yaml = target.format === "yaml" ? parseDocument(original) : undefined;
  if (yaml?.errors.length)
    throw new Error(
      `Invalid YAML in ${target.path}: ${yaml.errors[0]?.message}`,
    );
  const errors: ParseError[] = [];
  const parsed: unknown = yaml
    ? (yaml.toJS() ?? {})
    : !original.trim()
      ? {}
      : target.format === "toml"
        ? parseToml(original)
        : target.format === "jsonc"
          ? parseJsonc(original, errors, { allowTrailingComma: true })
          : JSON.parse(original);
  if (errors.length || !isRecord(parsed))
    throw new Error(`Invalid ${target.format} object in ${target.path}`);
  const data = parsed;
  let content = original.trim() ? original : "{}\n";
  let changed = false;
  function get(keys: string[]): unknown {
    let current: unknown = data;
    for (const key of keys) {
      if (current === undefined) return undefined;
      if (!isRecord(current))
        throw new Error(
          `Expected an object at ${keys.join(".")} in ${target.path}`,
        );
      current = current[key];
    }
    return current;
  }
  function set(keys: string[], value: unknown): void {
    if (JSON.stringify(get(keys)) === JSON.stringify(value)) return;
    let parent = data;
    for (const key of keys.slice(0, -1)) {
      parent[key] ??= {};
      if (!isRecord(parent[key]))
        throw new Error(`Expected ${key} to be an object in ${target.path}`);
      parent = parent[key];
    }
    const key = keys.at(-1);
    if (key === undefined) throw new Error("A config edit requires a key");
    if (value === undefined) delete parent[key];
    else parent[key] = value;
    if (yaml) {
      if (value === undefined) yaml.deleteIn(keys);
      else yaml.setIn(keys, value);
    } else if (target.format !== "toml") {
      content = applyEdits(
        content,
        modify(content, keys, value, {
          formattingOptions: { insertSpaces: true, tabSize: 2 },
        }),
      );
    }
    changed = true;
  }
  return {
    get,
    set,
    result: () =>
      changed
        ? {
            path: target.path,
            content: yaml
              ? yaml.toString()
              : target.format === "toml"
                ? `${stringifyToml(data as Parameters<typeof stringifyToml>[0])}\n`
                : content,
          }
        : undefined,
  };
}
