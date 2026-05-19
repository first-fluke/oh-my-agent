import * as childProcess from "node:child_process";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { fetchCursorModels } from "./cursor.js";

vi.mock("node:child_process", () => ({
  spawnSync: vi.fn(),
}));

const SAMPLE_STDOUT = `Available models

auto - Auto
composer-2-fast - Composer 2 Fast (default)
composer-2 - Composer 2
composer-2.5 - Composer 2.5
composer-2.5-fast - Composer 2.5 Fast
gpt-5.5-high - GPT-5.5 1M High
`;

function mockSpawnResult(
  overrides: Partial<ReturnType<typeof childProcess.spawnSync>> = {},
) {
  return {
    stdout: "",
    stderr: "",
    status: 0,
    error: undefined,
    pid: 1234,
    signal: null,
    output: [],
    ...overrides,
  } as unknown as ReturnType<typeof childProcess.spawnSync>;
}

describe("fetchCursorModels", () => {
  beforeEach(() => {
    vi.mocked(childProcess.spawnSync).mockReset();
  });

  it("parses normal cursor agent models output correctly", () => {
    vi.mocked(childProcess.spawnSync).mockReturnValueOnce(
      mockSpawnResult({ stdout: SAMPLE_STDOUT }),
    );

    const result = fetchCursorModels();
    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error("expected ok");

    expect(childProcess.spawnSync).toHaveBeenCalledWith(
      "cursor",
      ["agent", "models"],
      expect.objectContaining({ encoding: "utf-8" }),
    );

    const slugs = result.models.map((m) => m.slug);
    expect(slugs).toContain("cursor/auto");
    expect(slugs).toContain("cursor/composer-2-fast");
    expect(slugs).toContain("cursor/composer-2");
    expect(slugs).toContain("cursor/composer-2.5");
    expect(slugs).toContain("cursor/composer-2.5-fast");
    expect(slugs).toContain("cursor/gpt-5.5-high");
    expect(slugs).toHaveLength(6);
  });

  it("falls back to cursor agent --list-models when models subcommand fails", () => {
    vi.mocked(childProcess.spawnSync)
      .mockReturnValueOnce(
        mockSpawnResult({
          stdout: "",
          stderr: "unknown command",
          status: 1,
        }),
      )
      .mockReturnValueOnce(mockSpawnResult({ stdout: SAMPLE_STDOUT }));

    const result = fetchCursorModels();
    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error("expected ok");

    expect(childProcess.spawnSync).toHaveBeenNthCalledWith(
      1,
      "cursor",
      ["agent", "models"],
      expect.any(Object),
    );
    expect(childProcess.spawnSync).toHaveBeenNthCalledWith(
      2,
      "cursor",
      ["agent", "--list-models"],
      expect.any(Object),
    );
  });

  it("returns ok:false on ENOENT (cursor not installed)", () => {
    const enoentError = Object.assign(new Error("spawn cursor ENOENT"), {
      code: "ENOENT",
    });
    vi.mocked(childProcess.spawnSync).mockReturnValue(
      mockSpawnResult({
        stdout: "",
        stderr: "",
        status: null,
        error: enoentError,
        pid: 0,
      }),
    );

    const result = fetchCursorModels();
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("expected not ok");
    expect(result.error).toContain("ENOENT");
  });

  it("returns ok:false when both model commands exit non-zero", () => {
    vi.mocked(childProcess.spawnSync)
      .mockReturnValueOnce(
        mockSpawnResult({
          stdout: "",
          stderr: "error: unknown option",
          status: 1,
        }),
      )
      .mockReturnValueOnce(
        mockSpawnResult({
          stdout: "",
          stderr: "error: unknown option",
          status: 1,
        }),
      );

    const result = fetchCursorModels();
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("expected not ok");
    expect(result.error).toContain("status 1");
  });

  it("returns ok:false when both commands return empty stdout", () => {
    vi.mocked(childProcess.spawnSync)
      .mockReturnValueOnce(mockSpawnResult({ stdout: "" }))
      .mockReturnValueOnce(mockSpawnResult({ stdout: "" }));

    const result = fetchCursorModels();
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("expected not ok");
    expect(result.error).toMatch(/empty/i);
  });

  it("returns ok:false when stdout has only header with no models", () => {
    vi.mocked(childProcess.spawnSync)
      .mockReturnValueOnce(mockSpawnResult({ stdout: "Available models\n\n" }))
      .mockReturnValueOnce(mockSpawnResult({ stdout: "Available models\n\n" }));

    const result = fetchCursorModels();
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("expected not ok");
    expect(result.error).toMatch(/No models found/i);
  });

  it("normalizes slugs with cursor/ prefix", () => {
    vi.mocked(childProcess.spawnSync).mockReturnValueOnce(
      mockSpawnResult({
        stdout: "Available models\n\ncustom-model-1 - Custom Model 1\n",
      }),
    );

    const result = fetchCursorModels();
    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error("expected ok");
    expect(result.models[0]?.slug).toBe("cursor/custom-model-1");
  });
});
