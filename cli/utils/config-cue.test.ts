import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("./cue.js", () => ({
  evaluateCueFile: vi.fn(),
}));

const { evaluateCueFile } = await import("./cue.js");
const { loadDevToolsBrowsers, loadOmaConfig } = await import("./config.js");

describe("loadOmaConfig CUE priority and fallback", () => {
  let dir: string;

  beforeEach(() => {
    vi.clearAllMocks();
    dir = mkdtempSync(join(tmpdir(), "oma-cue-test-"));
    mkdirSync(join(dir, ".agents"), { recursive: true });
  });

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  it("prioritizes oma-config.cue over oma-config.yaml when both exist", () => {
    writeFileSync(
      join(dir, ".agents", "oma-config.cue"),
      'language: "ko"\nmodel_preset: "antigravity"\n',
    );
    writeFileSync(
      join(dir, ".agents", "oma-config.yaml"),
      "language: en\nmodel_preset: claude\n",
    );

    vi.mocked(evaluateCueFile).mockReturnValue({
      success: true,
      data: { language: "ko", model_preset: "antigravity" },
    });

    const config = loadOmaConfig(dir);
    expect(config).not.toBeNull();
    expect(config?.language).toBe("ko");
    expect(config?.model_preset).toBe("antigravity");
    expect(evaluateCueFile).toHaveBeenCalledWith(
      join(dir, ".agents", "oma-config.cue"),
    );
  });

  it("uses YAML fields that are absent from the preferred CUE config", () => {
    writeFileSync(
      join(dir, ".agents", "oma-config.cue"),
      'language: "ko"\nmodel_preset: "auto"\n',
    );
    writeFileSync(
      join(dir, ".agents", "oma-config.yaml"),
      "language: en\nmcp:\n  devtools_browsers: [aside]\n",
    );

    vi.mocked(evaluateCueFile).mockReturnValue({
      success: true,
      data: { language: "ko", model_preset: "auto" },
    });

    expect(loadDevToolsBrowsers(dir)).toEqual(["aside"]);
    expect(loadOmaConfig(dir)?.language).toBe("ko");
  });

  it("falls back to oma-config.yaml when cue CLI is missing", () => {
    writeFileSync(join(dir, ".agents", "oma-config.cue"), 'language: "ko"\n');
    writeFileSync(
      join(dir, ".agents", "oma-config.yaml"),
      "language: en\nmodel_preset: claude\n",
    );

    vi.mocked(evaluateCueFile).mockReturnValue({
      success: false,
      missingCli: true,
      error: "'cue' command not found in PATH",
    });

    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

    const config = loadOmaConfig(dir);
    expect(config).not.toBeNull();
    expect(config?.language).toBe("en");
    expect(config?.model_preset).toBe("claude");
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining("Falling back to oma-config.yaml"),
    );

    warnSpy.mockRestore();
  });

  it("falls back to oma-config.yaml when cue evaluation fails with error", () => {
    writeFileSync(
      join(dir, ".agents", "oma-config.cue"),
      "invalid cue content",
    );
    writeFileSync(
      join(dir, ".agents", "oma-config.yaml"),
      "language: ja\nmodel_preset: codex\n",
    );

    vi.mocked(evaluateCueFile).mockReturnValue({
      success: false,
      error: "syntax error on line 1",
    });

    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

    const config = loadOmaConfig(dir);
    expect(config).not.toBeNull();
    expect(config?.language).toBe("ja");
    expect(config?.model_preset).toBe("codex");

    warnSpy.mockRestore();
  });

  it("returns null when only oma-config.cue exists and evaluation fails", () => {
    writeFileSync(
      join(dir, ".agents", "oma-config.cue"),
      "invalid cue content",
    );

    vi.mocked(evaluateCueFile).mockReturnValue({
      success: false,
      missingCli: true,
      error: "cue not found",
    });

    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

    const config = loadOmaConfig(dir);
    expect(config).toBeNull();

    warnSpy.mockRestore();
  });

  it("loads oma-config.yaml when oma-config.cue is absent", () => {
    writeFileSync(
      join(dir, ".agents", "oma-config.yaml"),
      "language: fr\nmodel_preset: qwen\n",
    );

    const config = loadOmaConfig(dir);
    expect(config).not.toBeNull();
    expect(config?.language).toBe("fr");
    expect(config?.model_preset).toBe("qwen");
    expect(evaluateCueFile).not.toHaveBeenCalled();
  });
});
