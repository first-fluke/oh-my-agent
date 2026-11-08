import { cpSync, existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { STANDALONE_HOOK_SCRIPTS } from "../../constants/standalone-hooks.js";
import {
  OPENCODE_BRIDGE_SOURCE,
  OPENCODE_PACKAGE_ENTRY_SOURCE,
} from "../opencode-plugin-composer.js";
import {
  emitOpencodePackage,
  OPENCODE_PACKAGE_NAME,
} from "./opencode-package.js";

const REPO_ROOT = resolve(import.meta.dirname, "../../..");
const fixture = resolve(import.meta.dirname, "__fixtures__/repo");
const roots: string[] = [];

function scratch(): string {
  const root = mkdtempSync(join(tmpdir(), "oma-opencode-package-"));
  roots.push(root);
  return root;
}

afterEach(() => {
  for (const root of roots.splice(0)) {
    rmSync(root, { recursive: true, force: true });
  }
});

describe("emitOpencodePackage", () => {
  it("emits the SSOT bridge, one handler entry per standalone script and the filter script", () => {
    const output = join(scratch(), "opencode-package");
    const report = emitOpencodePackage(REPO_ROOT, output);

    expect(report.target).toBe("opencode-package");
    expect(readFileSync(join(output, "oma.ts"), "utf-8")).toBe(
      readFileSync(join(REPO_ROOT, OPENCODE_BRIDGE_SOURCE), "utf-8"),
    );
    expect(readFileSync(join(output, "index.ts"), "utf-8")).toBe(
      readFileSync(join(REPO_ROOT, OPENCODE_PACKAGE_ENTRY_SOURCE), "utf-8"),
    );
    for (const script of Object.keys(STANDALONE_HOOK_SCRIPTS)) {
      const entry = readFileSync(join(output, script), "utf-8");
      expect(entry, script).toContain('"--vendor", "opencode"');
      expect(entry, script).toContain(`"--script", ${JSON.stringify(script)}`);
      // Dispatch goes through the installed CLI and must not fail closed.
      expect(entry, script).toContain("standalone dispatch unavailable");
    }
    expect(existsSync(join(output, "filter-test-output.sh"))).toBe(true);
    expect(report.files).toEqual([
      "index.ts",
      "oma.ts",
      ...Object.keys(STANDALONE_HOOK_SCRIPTS),
      "filter-test-output.sh",
      "README.md",
    ]);
    // Nothing from the SSOT core tree leaks in besides the files above.
    expect(existsSync(join(output, "triggers.json"))).toBe(false);
  });

  it("writes a publishable manifest whose entry point is the bridge", () => {
    const output = join(scratch(), "opencode-package");
    const report = emitOpencodePackage(REPO_ROOT, output);
    const manifest = JSON.parse(readFileSync(report.manifestPath, "utf-8"));
    const root = JSON.parse(
      readFileSync(join(REPO_ROOT, "package.json"), "utf-8"),
    );

    expect(manifest).toMatchObject({
      name: OPENCODE_PACKAGE_NAME,
      version: root.version,
      // The workspace root declares no license; the emitter defaults to MIT
      // like pi-package.
      license: root.license ?? "MIT",
      type: "module",
      main: "./index.ts",
      exports: { ".": "./index.ts" },
      keywords: expect.arrayContaining(["opencode", "kilo"]),
    });
    expect(manifest.files).toEqual([
      "index.ts",
      "oma.ts",
      ...Object.keys(STANDALONE_HOOK_SCRIPTS),
      "filter-test-output.sh",
      "README.md",
    ]);
    // The bridge is dependency-free; the package must stay that way.
    expect(manifest).not.toHaveProperty("dependencies");
    expect(manifest).not.toHaveProperty("peerDependencies");
    expect(manifest).not.toHaveProperty("private");
    expect(manifest).not.toHaveProperty("workspaces");
  });

  it("ships an entry serving the v2 definition and the V1 server() object form", () => {
    const output = join(scratch(), "opencode-package");
    emitOpencodePackage(REPO_ROOT, output);
    const entry = readFileSync(join(output, "index.ts"), "utf-8");
    // One default export: OpenCode 2.x reads `{ id, setup }`; Kilo / OpenCode
    // 1.18.29+ require an object with `server()` — the unchanged bridge.
    expect(entry).toContain('id: "oh-my-agent"');
    expect(entry).toContain("async setup(");
    expect(entry).toContain("server: legacy");
    expect(entry).not.toContain("export const plugin");
    expect(entry).toContain('import legacy from "./oma.ts"');
    for (const hook of [
      '"prompt"',
      '"context"',
      '"execute.before"',
      '"experimental.idle"',
    ]) {
      expect(entry, hook).toContain(hook);
    }
    expect(entry).not.toMatch(/from ["']@opencode/);
  });

  it("documents both hosts and the plugin config key in the README", () => {
    const output = join(scratch(), "opencode-package");
    emitOpencodePackage(REPO_ROOT, output);
    const readme = readFileSync(join(output, "README.md"), "utf-8");
    expect(readme).toContain(`"plugin": ["${OPENCODE_PACKAGE_NAME}"]`);
    expect(readme).toContain(".opencode/opencode.json");
    expect(readme).toContain(".kilo/kilo.json");
  });

  it("falls back to repo metadata defaults when the source has no bridge or core tree", () => {
    const root = scratch();
    const source = join(root, "source");
    cpSync(fixture, source, { recursive: true });
    const output = join(root, "opencode-package");
    const report = emitOpencodePackage(source, output);
    // Handler entries are generated from the CLI constants, not copied, so
    // they are present even without an SSOT hooks tree; the bridge and the
    // filter script are not.
    expect(report.files).not.toContain("oma.ts");
    expect(report.files).not.toContain("index.ts");
    expect(report.files).not.toContain("filter-test-output.sh");
    expect(existsSync(join(output, "keyword-detector.ts"))).toBe(true);
    expect(JSON.parse(readFileSync(report.manifestPath, "utf-8")).version).toBe(
      "0.0.1",
    );
  });

  it("is idempotent: a second emit is byte-identical", () => {
    const output = join(scratch(), "opencode-package");
    emitOpencodePackage(REPO_ROOT, output);
    const first = readFileSync(join(output, "package.json"), "utf-8");
    emitOpencodePackage(REPO_ROOT, output);
    expect(readFileSync(join(output, "package.json"), "utf-8")).toBe(first);
  });
});
