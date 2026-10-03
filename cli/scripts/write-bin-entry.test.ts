import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { BUNDLE_FILE, writeBinEntry } from "./write-bin-entry.mjs";

describe("write-bin-entry", () => {
  const roots: string[] = [];

  afterEach(() => {
    for (const root of roots) rmSync(root, { recursive: true, force: true });
    roots.length = 0;
  });

  function setup(bundleSource: string): { root: string; entry: string } {
    const root = mkdtempSync(join(tmpdir(), "oma-bin-entry-"));
    roots.push(root);
    writeFileSync(join(root, "package.json"), '{"type":"module"}\n');
    writeFileSync(join(root, BUNDLE_FILE), bundleSource);
    return { root, entry: writeBinEntry(root) };
  }

  function run(entry: string, root: string, args: string[] = []) {
    const env: NodeJS.ProcessEnv = {
      ...process.env,
      // Keep the default cache dir (os.tmpdir()) inside this test's root.
      TMPDIR: root,
      TEMP: root,
      TMP: root,
    };
    delete env.NODE_COMPILE_CACHE;
    delete env.NODE_DISABLE_COMPILE_CACHE;
    return spawnSync(process.execPath, [entry, ...args], {
      encoding: "utf8",
      env,
    });
  }

  it("runs the sibling bundle with the entry's argv and exit code", () => {
    const { root, entry } = setup(
      [
        "console.log(JSON.stringify({ argv1: process.argv[1], args: process.argv.slice(2) }));",
        "process.exitCode = 3;",
      ].join("\n"),
    );

    const result = run(entry, root, ["hook", "run"]);

    expect(result.stderr).toBe("");
    expect(result.status).toBe(3);
    expect(JSON.parse(result.stdout)).toEqual({
      argv1: entry,
      args: ["hook", "run"],
    });
  });

  it("enables the compile cache before the bundle loads", () => {
    const { root, entry } = setup(
      [
        'import module from "node:module";',
        "console.log(module.getCompileCacheDir?.() ?? '');",
      ].join("\n"),
    );

    const result = run(entry, root);

    expect(result.status).toBe(0);
    expect(result.stdout.trim()).toContain("node-compile-cache");
  });

  it.skipIf(process.platform === "win32")("writes an executable entry", () => {
    const { entry } = setup("");
    expect(statSync(entry).mode & 0o111).not.toBe(0);
  });
});
