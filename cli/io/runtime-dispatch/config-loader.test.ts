import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { ConfigError } from "./config-error.js";
import { loadUserConfig } from "./config-loader.js";

describe("loadUserConfig", () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), "oma-config-loader-"));
    mkdirSync(join(tempDir, ".agents"), { recursive: true });
  });

  afterEach(() => {
    rmSync(tempDir, { recursive: true, force: true });
  });

  it("returns empty object when .agents/oma-config.yaml is missing", () => {
    expect(loadUserConfig(tempDir)).toEqual({});
  });

  it("parses valid YAML into a partial OmaConfig", () => {
    writeFileSync(
      join(tempDir, ".agents", "oma-config.yaml"),
      "language: ko\nmodel_preset: codex\n",
    );
    const config = loadUserConfig(tempDir);
    expect(config.language).toBe("ko");
    expect(config.model_preset).toBe("codex");
  });

  it("returns {} when YAML root is not an object (e.g. a list)", () => {
    writeFileSync(
      join(tempDir, ".agents", "oma-config.yaml"),
      "- a\n- b\n- c\n",
    );
    expect(loadUserConfig(tempDir)).toEqual({});
  });

  it("throws ConfigError with file:line:col for invalid YAML", () => {
    const filePath = join(tempDir, ".agents", "oma-config.yaml");
    // Unclosed flow mapping → parser reports a linePos
    writeFileSync(filePath, "language: ko\nagents:\n  backend: { model: ");

    let caught: unknown;
    try {
      loadUserConfig(tempDir);
    } catch (err) {
      caught = err;
    }

    expect(caught).toBeInstanceOf(ConfigError);
    const err = caught as ConfigError;
    expect(err.message).toContain(filePath);
    // file:line:col format must include at least one numeric pair
    expect(err.message).toMatch(/\.yaml:\d+:\d+/);
  });

  it("walks up the directory tree to find .agents/oma-config.yaml", () => {
    const nested = join(tempDir, "src", "deep", "nested");
    mkdirSync(nested, { recursive: true });
    writeFileSync(
      join(tempDir, ".agents", "oma-config.yaml"),
      "language: en\nmodel_preset: claude\n",
    );
    const config = loadUserConfig(nested);
    expect(config.model_preset).toBe("claude");
  });

  // -------------------------------------------------------------------------
  // Hard-error on legacy preset names (added in migration 010)
  // -------------------------------------------------------------------------

  const legacyCases: Array<[string, string]> = [
    ["claude-only", "claude"],
    ["codex-only", "codex"],
    ["gemini-only", "antigravity"],
    ["qwen-only", "qwen"],
    ["cursor-only", "cursor"],
  ];

  for (const [legacy, canonical] of legacyCases) {
    it(`throws ConfigError when model_preset is legacy "${legacy}"`, () => {
      const filePath = join(tempDir, ".agents", "oma-config.yaml");
      writeFileSync(filePath, `language: en\nmodel_preset: ${legacy}\n`);

      let caught: unknown;
      try {
        loadUserConfig(tempDir);
      } catch (err) {
        caught = err;
      }

      expect(caught).toBeInstanceOf(ConfigError);
      const err = caught as ConfigError;
      expect(err.message).toContain(`Legacy preset name "${legacy}"`);
      expect(err.message).toContain(`Rename it to "${canonical}"`);
      expect(err.message).toContain("oma update");
      expect(err.message).toContain(filePath);
    });
  }
});
