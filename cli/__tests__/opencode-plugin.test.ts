import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import {
  installOpencodePlugin,
  OPENCODE_PLUGIN_DIR,
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

  it("bridge source documents non-blocking / best-effort Stop semantics", () => {
    const bridgeSrc = readFileSync(
      join(REPO_ROOT, ".agents", "hooks", "variants", "opencode", "oma.ts"),
      "utf-8",
    );
    // The BEST-EFFORT comment is the machine-checkable contract.
    expect(bridgeSrc).toContain("BEST-EFFORT");
  });
});
