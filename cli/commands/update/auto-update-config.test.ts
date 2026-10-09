import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { evaluateCueFile } from "../../utils/cue.js";
import { resolveAutoUpdateCli } from "./auto-update-config.js";

vi.mock("../../utils/cue.js", () => ({ evaluateCueFile: vi.fn() }));

describe("resolveAutoUpdateCli", () => {
  let tempDir: string;

  beforeEach(() => {
    vi.mocked(evaluateCueFile).mockReset();
    tempDir = mkdtempSync(join(tmpdir(), "oma-auto-update-test-"));
    mkdirSync(join(tempDir, ".agents"), { recursive: true });
    vi.stubEnv("OMA_HOME", join(tempDir, "global"));
  });

  afterEach(() => {
    rmSync(tempDir, { recursive: true, force: true });
    vi.unstubAllEnvs();
  });

  it("prioritizes oma-config.cue over oma-config.yaml", () => {
    vi.mocked(evaluateCueFile).mockReturnValue({
      success: true,
      data: { auto_update_cli: false },
    });
    writeFileSync(
      join(tempDir, ".agents", "oma-config.cue"),
      "package config\nauto_update_cli: false\n",
    );
    writeFileSync(
      join(tempDir, ".agents", "oma-config.yaml"),
      "auto_update_cli: true\n",
    );

    expect(resolveAutoUpdateCli(tempDir)).toBe(false);
  });

  it("falls back to oma-config.yaml when oma-config.cue is absent", () => {
    writeFileSync(
      join(tempDir, ".agents", "oma-config.yaml"),
      "auto_update_cli: false\n",
    );

    expect(resolveAutoUpdateCli(tempDir)).toBe(false);
  });

  it("defaults to true when no config files set auto_update_cli", () => {
    expect(resolveAutoUpdateCli(tempDir)).toBe(true);
  });
  it("reads custom-home defaults and lets project settings override them", () => {
    const global = join(tempDir, "global", ".agents");
    mkdirSync(global, { recursive: true });
    writeFileSync(join(global, "oma-config.yaml"), "auto_update_cli: false\n");
    expect(resolveAutoUpdateCli(tempDir)).toBe(false);
    writeFileSync(
      join(tempDir, ".agents", "oma-config.yaml"),
      "auto_update_cli: true\n",
    );
    expect(resolveAutoUpdateCli(tempDir)).toBe(true);
  });
  it("uses shared YAML when the CUE executable is unavailable", () => {
    vi.mocked(evaluateCueFile).mockReturnValue({
      success: false,
      missingCli: true,
    });
    writeFileSync(
      join(tempDir, ".agents", "oma-config.cue"),
      "auto_update_cli: true",
    );
    writeFileSync(
      join(tempDir, ".agents", "oma-config.yaml"),
      "auto_update_cli: false",
    );
    expect(resolveAutoUpdateCli(tempDir)).toBe(false);
  });
});
