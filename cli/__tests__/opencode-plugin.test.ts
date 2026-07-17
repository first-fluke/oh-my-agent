import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import {
  installOpencodePlugin,
  OPENCODE_PLUGIN_DIR,
  OPENCODE_PLUGIN_ENTRY,
  registerOpencodePlugin,
} from "../platform/opencode-plugin-composer.js";

const REPO_ROOT = join(__dirname, "../..");

describe("installOpencodePlugin", () => {
  let target: string;

  beforeEach(() => {
    target = mkdtempSync(join(tmpdir(), "oma-opencode-"));
  });

  afterAll(() => {
    // Individual test bodies clean up their own temp dirs.
  });

  it("materializes the bridge entry point and core scripts", () => {
    installOpencodePlugin(REPO_ROOT, target);
    const pluginDir = join(target, OPENCODE_PLUGIN_DIR);

    for (const f of [
      "oma.ts",
      "keyword-detector.ts",
      "skill-injector.ts",
      "test-filter.ts",
      "filter-test-output.sh",
      "triggers.json",
    ]) {
      expect(existsSync(join(pluginDir, f)), `missing ${f}`).toBe(true);
    }
    rmSync(target, { recursive: true, force: true });
  });

  it("copies bridge to correct dir: .opencode/plugins/oma/oma.ts", () => {
    installOpencodePlugin(REPO_ROOT, target);
    const bridgePath = join(target, OPENCODE_PLUGIN_DIR, "oma.ts");
    expect(existsSync(bridgePath)).toBe(true);
    rmSync(target, { recursive: true, force: true });
  });

  it("is idempotent across repeated installs", () => {
    installOpencodePlugin(REPO_ROOT, target);
    expect(() => installOpencodePlugin(REPO_ROOT, target)).not.toThrow();
    expect(existsSync(join(target, OPENCODE_PLUGIN_DIR, "oma.ts"))).toBe(true);
    rmSync(target, { recursive: true, force: true });
  });

  it("second install produces byte-identical bridge content", () => {
    installOpencodePlugin(REPO_ROOT, target);
    const bridgePath = join(target, OPENCODE_PLUGIN_DIR, "oma.ts");
    const first = readFileSync(bridgePath, "utf-8");

    installOpencodePlugin(REPO_ROOT, target);
    const second = readFileSync(bridgePath, "utf-8");

    expect(first).toBe(second);
    rmSync(target, { recursive: true, force: true });
  });
});

describe("opencode bridge source — locked event names", () => {
  it("bridge source contains chat.message handler", () => {
    const bridgeSrc = readFileSync(
      join(REPO_ROOT, ".agents", "hooks", "variants", "opencode", "oma.ts"),
      "utf-8",
    );
    expect(bridgeSrc).toContain('"chat.message"');
  });

  it("bridge source contains tool.execute.before handler", () => {
    const bridgeSrc = readFileSync(
      join(REPO_ROOT, ".agents", "hooks", "variants", "opencode", "oma.ts"),
      "utf-8",
    );
    expect(bridgeSrc).toContain('"tool.execute.before"');
  });

  it("bridge source contains session.idle handler", () => {
    const bridgeSrc = readFileSync(
      join(REPO_ROOT, ".agents", "hooks", "variants", "opencode", "oma.ts"),
      "utf-8",
    );
    expect(bridgeSrc).toContain('"session.idle"');
  });

  it("bridge source runs scm-guard before test-filter and throws on deny", () => {
    const bridgeSrc = readFileSync(
      join(REPO_ROOT, ".agents", "hooks", "variants", "opencode", "oma.ts"),
      "utf-8",
    );
    // Throwing is opencode's documented block mechanism for
    // tool.execute.before; the guard must run before the test-filter rewrite.
    expect(bridgeSrc).toContain('"scm-guard.ts"');
    expect(bridgeSrc).toContain("throw new Error(denyReason)");
    expect(bridgeSrc.indexOf('"scm-guard.ts"')).toBeLessThan(
      bridgeSrc.indexOf('"test-filter.ts"'),
    );
  });

  it("bridge source documents non-blocking / best-effort Stop semantics", () => {
    const bridgeSrc = readFileSync(
      join(REPO_ROOT, ".agents", "hooks", "variants", "opencode", "oma.ts"),
      "utf-8",
    );
    // The BEST-EFFORT comment is the machine-checkable contract.
    expect(bridgeSrc).toContain("BEST-EFFORT");
  });
});

// Regression (issue #571): the nested bridge is invisible to opencode's flat
// plugin auto-discovery, so link must register it explicitly in opencode.jsonc.
describe("registerOpencodePlugin", () => {
  let target: string;

  beforeEach(() => {
    target = mkdtempSync(join(tmpdir(), "oma-opencode-cfg-"));
  });

  function readConfig(t: string): Record<string, unknown> {
    return JSON.parse(
      readFileSync(join(t, ".opencode", "opencode.jsonc"), "utf-8"),
    );
  }

  it("creates opencode.jsonc with the bridge entry and $schema", () => {
    registerOpencodePlugin(target);
    const cfg = readConfig(target);
    expect(cfg.plugin).toEqual([OPENCODE_PLUGIN_ENTRY]);
    expect(cfg.$schema).toBe("https://opencode.ai/config.json");
    rmSync(target, { recursive: true, force: true });
  });

  it("is idempotent — no duplicate entries, byte-identical on rerun", () => {
    registerOpencodePlugin(target);
    const first = readFileSync(
      join(target, ".opencode", "opencode.jsonc"),
      "utf-8",
    );
    registerOpencodePlugin(target);
    const second = readFileSync(
      join(target, ".opencode", "opencode.jsonc"),
      "utf-8",
    );
    expect(second).toBe(first);
    expect(readConfig(target).plugin).toEqual([OPENCODE_PLUGIN_ENTRY]);
    rmSync(target, { recursive: true, force: true });
  });

  it("preserves existing config keys and other plugin entries", () => {
    mkdirSync(join(target, ".opencode"), { recursive: true });
    writeFileSync(
      join(target, ".opencode", "opencode.jsonc"),
      [
        "{",
        "  // user config",
        '  "$schema": "https://opencode.ai/config.json",',
        '  "theme": "opencode",',
        '  "plugin": ["some-npm-plugin"],',
        "}",
      ].join("\n"),
    );
    registerOpencodePlugin(target);
    const cfg = readConfig(target);
    expect(cfg.theme).toBe("opencode");
    expect(cfg.plugin).toEqual(["some-npm-plugin", OPENCODE_PLUGIN_ENTRY]);
    rmSync(target, { recursive: true, force: true });
  });

  it("updates opencode.json in place when it already exists", () => {
    mkdirSync(join(target, ".opencode"), { recursive: true });
    writeFileSync(
      join(target, ".opencode", "opencode.json"),
      JSON.stringify({ plugin: [] }),
    );
    registerOpencodePlugin(target);
    // Should NOT create a competing .jsonc; it updates the existing .json.
    expect(existsSync(join(target, ".opencode", "opencode.jsonc"))).toBe(false);
    const cfg = JSON.parse(
      readFileSync(join(target, ".opencode", "opencode.json"), "utf-8"),
    );
    expect(cfg.plugin).toEqual([OPENCODE_PLUGIN_ENTRY]);
    rmSync(target, { recursive: true, force: true });
  });
});
