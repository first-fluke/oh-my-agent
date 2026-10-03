import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  mergeBase,
  parseJsonForMerge,
  parseTomlForMerge,
  readJsonForMerge,
  readJsonMergeBaseOrWarn,
  readTomlForMerge,
} from "./merge-read.js";

let dir: string;

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "oma-merge-read-"));
});

afterEach(() => {
  rmSync(dir, { recursive: true, force: true });
  vi.restoreAllMocks();
});

describe("parseJsonForMerge", () => {
  it("parses strict JSON objects", () => {
    expect(parseJsonForMerge('{"a":1}')).toEqual({
      status: "ok",
      value: { a: 1 },
    });
  });

  it("accepts trailing commas and comments, keeping every key", () => {
    const read = parseJsonForMerge(
      '{\n  // team settings\n  "permissions": { "allow": ["Bash(npm test)"], },\n  "env": { "X": "1" },\n}\n',
    );
    expect(read).toEqual({
      status: "ok",
      value: { permissions: { allow: ["Bash(npm test)"] }, env: { X: "1" } },
    });
  });

  it("reports truncated JSON as invalid instead of an empty object", () => {
    const read = parseJsonForMerge('{ "mcpServers": { "github": ');
    expect(read.status).toBe("invalid");
    expect(mergeBase(read)).toBeNull();
  });

  it("rejects a non-object root", () => {
    expect(parseJsonForMerge("[1, 2]").status).toBe("invalid");
  });

  it("treats an empty file as an empty object", () => {
    expect(parseJsonForMerge("  \n")).toEqual({ status: "ok", value: {} });
  });
});

describe("parseTomlForMerge", () => {
  it("parses TOML tables", () => {
    expect(parseTomlForMerge('model = "gpt-5"\n')).toEqual({
      status: "ok",
      value: { model: "gpt-5" },
    });
  });

  it("reports broken TOML as invalid", () => {
    expect(parseTomlForMerge("[mcp_servers.x\n").status).toBe("invalid");
  });
});

describe("file readers", () => {
  it("distinguishes a missing file (merge into {}) from an invalid one", () => {
    const missing = join(dir, "missing.json");
    expect(readJsonForMerge(missing)).toEqual({ status: "missing" });
    expect(mergeBase(readJsonForMerge(missing))).toEqual({});

    const broken = join(dir, "broken.toml");
    writeFileSync(broken, "a = \n");
    expect(readTomlForMerge(broken).status).toBe("invalid");
  });

  it("warns once per path and returns null for an invalid file", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const broken = join(dir, "settings.json");
    writeFileSync(broken, "{ nope");

    expect(readJsonMergeBaseOrWarn(broken)).toBeNull();
    expect(readJsonMergeBaseOrWarn(broken)).toBeNull();

    expect(warn).toHaveBeenCalledTimes(1);
    expect(String(warn.mock.calls[0]?.[0])).toContain(broken);
  });
});
