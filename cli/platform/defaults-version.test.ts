import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { installConfigs, readDefaultsVersion } from "./skills-installer.js";

// ---------------------------------------------------------------------------
// defaults.yaml version handling
// ---------------------------------------------------------------------------

describe("readDefaultsVersion", () => {
  let tempDir: string;
  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), "oma-defaults-"));
  });
  afterEach(() => {
    rmSync(tempDir, { recursive: true, force: true });
  });

  it("returns the version string when present", () => {
    const filePath = join(tempDir, "defaults.yaml");
    writeFileSync(filePath, `version: "2.1.0"\nagent_defaults: {}\n`);
    expect(readDefaultsVersion(filePath)).toBe("2.1.0");
  });

  it("returns the version string when unquoted", () => {
    const filePath = join(tempDir, "defaults.yaml");
    writeFileSync(filePath, `version: 1.5.3\nagent_defaults: {}\n`);
    expect(readDefaultsVersion(filePath)).toBe("1.5.3");
  });

  it("returns null when version field is absent", () => {
    const filePath = join(tempDir, "defaults.yaml");
    writeFileSync(filePath, `agent_defaults:\n  backend: { model: "x" }\n`);
    expect(readDefaultsVersion(filePath)).toBeNull();
  });

  it("returns null when file does not exist", () => {
    expect(readDefaultsVersion(join(tempDir, "nope.yaml"))).toBeNull();
  });
});

describe("installConfigs — defaults.yaml upgrade semantics", () => {
  let sourceDir: string;
  let targetDir: string;
  let warnSpy: ReturnType<typeof vi.spyOn>;
  let logSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    sourceDir = mkdtempSync(join(tmpdir(), "oma-src-"));
    targetDir = mkdtempSync(join(tmpdir(), "oma-dst-"));
    mkdirSync(join(sourceDir, ".agents", "config"), { recursive: true });
    writeFileSync(
      join(sourceDir, ".agents", "config", "defaults.yaml"),
      `version: "2.1.0"\nagent_defaults:\n  backend: { model: "new/model" }\n`,
    );
    warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
  });

  afterEach(() => {
    rmSync(sourceDir, { recursive: true, force: true });
    rmSync(targetDir, { recursive: true, force: true });
    vi.restoreAllMocks();
  });

  it("copies defaults.yaml on fresh install (no target yet)", () => {
    installConfigs(sourceDir, targetDir);
    const copied = readFileSync(
      join(targetDir, ".agents", "config", "defaults.yaml"),
      "utf-8",
    );
    expect(copied).toContain('version: "2.1.0"');
    expect(copied).toContain("new/model");
  });

  it("warns on version mismatch but does not overwrite", () => {
    mkdirSync(join(targetDir, ".agents", "config"), { recursive: true });
    const stale = `version: "1.0.0"\nagent_defaults:\n  backend: { model: "old/model" }\n`;
    writeFileSync(join(targetDir, ".agents", "config", "defaults.yaml"), stale);

    installConfigs(sourceDir, targetDir);

    // File not overwritten
    const kept = readFileSync(
      join(targetDir, ".agents", "config", "defaults.yaml"),
      "utf-8",
    );
    expect(kept).toBe(stale);

    // Warning emitted
    expect(
      warnSpy.mock.calls.some((c) =>
        String(c[0]).includes("is 1.0.0; bundled is 2.1.0"),
      ),
    ).toBe(true);
  });

  it("overwrites defaults.yaml when updateDefaults is true", () => {
    mkdirSync(join(targetDir, ".agents", "config"), { recursive: true });
    writeFileSync(
      join(targetDir, ".agents", "config", "defaults.yaml"),
      `version: "1.0.0"\nagent_defaults: {}\n`,
    );

    installConfigs(sourceDir, targetDir, false, { updateDefaults: true });

    const kept = readFileSync(
      join(targetDir, ".agents", "config", "defaults.yaml"),
      "utf-8",
    );
    expect(kept).toContain('version: "2.1.0"');
    expect(kept).toContain("new/model");
    expect(
      logSpy.mock.calls.some((c) =>
        String(c[0]).includes("Updated .agents/config/defaults.yaml"),
      ),
    ).toBe(true);
  });

  it("does not warn when versions match", () => {
    mkdirSync(join(targetDir, ".agents", "config"), { recursive: true });
    writeFileSync(
      join(targetDir, ".agents", "config", "defaults.yaml"),
      `version: "2.1.0"\nagent_defaults:\n  backend: { model: "old/model" }\n`,
    );

    installConfigs(sourceDir, targetDir);

    expect(
      warnSpy.mock.calls.some((c) => String(c[0]).includes("defaults.yaml")),
    ).toBe(false);
  });

  it("user-editable files (models.yaml) are never overwritten", () => {
    // Add a models.yaml in source (shouldn't happen in real world,
    // but verifies the non-defaults path still preserves user files)
    writeFileSync(
      join(sourceDir, ".agents", "config", "models.yaml"),
      `models:\n  foo/bar: {}\n`,
    );
    mkdirSync(join(targetDir, ".agents", "config"), { recursive: true });
    const userContent = `models:\n  custom/model: {}\n`;
    writeFileSync(
      join(targetDir, ".agents", "config", "models.yaml"),
      userContent,
    );

    installConfigs(sourceDir, targetDir);

    const kept = readFileSync(
      join(targetDir, ".agents", "config", "models.yaml"),
      "utf-8",
    );
    expect(kept).toBe(userContent);
  });
});
