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
import { afterEach, describe, expect, it } from "vitest";
import {
  readVendorsFromConfig,
  writeVendorsToConfig,
} from "./skills-installer.js";

describe("readVendorsFromConfig", () => {
  const tempDirs: string[] = [];

  function createTemp(configContent?: string): string {
    const dir = mkdtempSync(join(tmpdir(), "oma-vendor-"));
    tempDirs.push(dir);
    if (configContent !== undefined) {
      mkdirSync(join(dir, ".agents"), { recursive: true });
      writeFileSync(join(dir, ".agents", "oma-config.yaml"), configContent);
    }
    return dir;
  }

  afterEach(() => {
    for (const dir of tempDirs) {
      rmSync(dir, { recursive: true, force: true });
    }
    tempDirs.length = 0;
  });

  // The fallback must list every vendor oma can link, extension vendors (pi,
  // opencode) included. They were absent until ALL_CLI_VENDORS was corrected,
  // which meant a config with no `vendors:` block never linked them and
  // AGENTS.md — shared by codex/cursor/qwen/pi — silently lost pi's section.
  const ALL = [
    "antigravity",
    "claude",
    "codex",
    "commandcode",
    "copilot",
    "cursor",
    "grok",
    "hermes",
    "kimi",
    "kiro",
    "opencode",
    "pi",
    "qwen",
    "zcode",
  ];

  it("returns all vendors when config does not exist", () => {
    const dir = createTemp();
    expect(readVendorsFromConfig(dir)).toEqual(ALL);
  });

  it("returns all vendors when no vendors field in config", () => {
    const dir = createTemp("language: en\ntimezone: Asia/Seoul\n");
    expect(readVendorsFromConfig(dir)).toEqual(ALL);
  });

  it("reads vendors from config", () => {
    const dir = createTemp("language: en\nvendors:\n  - claude\n  - gemini\n");
    const vendors = readVendorsFromConfig(dir);
    expect(vendors).toEqual(["claude", "gemini"]);
  });

  it("reads single vendor", () => {
    const dir = createTemp("language: en\nvendors:\n  - claude\n");
    const vendors = readVendorsFromConfig(dir);
    expect(vendors).toEqual(["claude"]);
  });
});

describe("writeVendorsToConfig", () => {
  const tempDirs: string[] = [];

  function createTemp(configContent: string): string {
    const dir = mkdtempSync(join(tmpdir(), "oma-vendor-"));
    tempDirs.push(dir);
    mkdirSync(join(dir, ".agents"), { recursive: true });
    writeFileSync(join(dir, ".agents", "oma-config.yaml"), configContent);
    return dir;
  }

  afterEach(() => {
    for (const dir of tempDirs) {
      rmSync(dir, { recursive: true, force: true });
    }
    tempDirs.length = 0;
  });

  it("appends vendors to config without existing vendors field", () => {
    const dir = createTemp("language: en\ntimezone: Asia/Seoul\n");
    writeVendorsToConfig(dir, ["claude", "qwen"]);

    const content = readFileSync(
      join(dir, ".agents", "oma-config.yaml"),
      "utf-8",
    );
    expect(content).toContain("vendors:");
    expect(content).toContain("  - claude");
    expect(content).toContain("  - qwen");
    expect(content).toContain("language: en");
  });

  it("replaces existing vendors field", () => {
    const dir = createTemp(
      "language: en\nvendors:\n  - claude\n  - codex\n  - gemini\n  - qwen\n",
    );
    writeVendorsToConfig(dir, ["claude"]);

    const content = readFileSync(
      join(dir, ".agents", "oma-config.yaml"),
      "utf-8",
    );
    expect(content).toContain("  - claude");
    expect(content).not.toContain("  - codex");
    expect(content).not.toContain("  - gemini");
    expect(content).not.toContain("  - qwen");
  });

  it("does nothing when config file does not exist", () => {
    const dir = mkdtempSync(join(tmpdir(), "oma-vendor-"));
    tempDirs.push(dir);

    writeVendorsToConfig(dir, ["claude"]);
    expect(existsSync(join(dir, ".agents", "oma-config.yaml"))).toBe(false);
  });

  it("roundtrips correctly", () => {
    const dir = createTemp("language: ko\n");
    const vendors = ["claude", "codex", "copilot", "qwen"] as const;

    writeVendorsToConfig(dir, [...vendors]);
    const result = readVendorsFromConfig(dir);

    expect(result).toEqual([...vendors]);
  });
});
