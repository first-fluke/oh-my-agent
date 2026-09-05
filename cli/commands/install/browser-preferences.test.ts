import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, expect, it } from "vitest";
import { loadDevToolsBrowsers } from "../../utils/config.js";
import { saveDevToolsBrowsers } from "./browser-preferences.js";

let root: string;
let path: string;
beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), "oma-browser-prefs-"));
  mkdirSync(join(root, ".agents"));
  path = join(root, ".agents", "oma-config.yaml");
});
afterEach(() => rmSync(root, { recursive: true, force: true }));

it("persists multiple selections while preserving comments and sibling preferences", () => {
  writeFileSync(
    path,
    "# user preferences\nlanguage: ko\nmcp:\n  custom: true # keep\n  devtools_browsers: [chrome]\n",
  );
  saveDevToolsBrowsers(root, ["aside", "firefox"]);
  expect(loadDevToolsBrowsers(root)).toEqual(["aside", "firefox"]);
  expect(readFileSync(path, "utf-8")).toContain("custom: true # keep");
  expect(readFileSync(path, "utf-8")).toContain("# user preferences");
  saveDevToolsBrowsers(root, []);
  expect(loadDevToolsBrowsers(root)).toEqual([]);
});

it("distinguishes an unset preference from an explicit empty selection", () => {
  writeFileSync(path, "language: ko\n");
  expect(loadDevToolsBrowsers(root)).toBeUndefined();
  saveDevToolsBrowsers(root, ["aside"]);
  expect(loadDevToolsBrowsers(root)).toEqual(["aside"]);
});

it("does not overwrite invalid YAML", () => {
  writeFileSync(path, "mcp: [broken");
  expect(() => saveDevToolsBrowsers(root, ["aside"])).toThrow();
  expect(readFileSync(path, "utf-8")).toBe("mcp: [broken");
});
