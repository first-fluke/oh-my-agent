// cli/commands/model/probe.test.ts

import * as childProcess from "node:child_process";
import { describe, expect, it, vi } from "vitest";
import { classifyProbeError, describeProbeStatus, probeSlug } from "./probe.js";

vi.mock("node:child_process", () => ({
  spawnSync: vi.fn(),
}));

function mockSpawn(
  overrides: Partial<ReturnType<typeof childProcess.spawnSync>>,
): void {
  vi.mocked(childProcess.spawnSync).mockReturnValueOnce({
    stdout: "",
    stderr: "",
    status: 0,
    error: undefined,
    pid: 1234,
    signal: null,
    output: [],
    ...overrides,
  } as unknown as ReturnType<typeof childProcess.spawnSync>);
}

// ---------------------------------------------------------------------------
// classifyProbeError
// ---------------------------------------------------------------------------

describe("classifyProbeError", () => {
  it("returns accepted when exit code is 0", () => {
    expect(classifyProbeError("some output", 0)).toBe("accepted");
  });

  it("classifies auth_required on 'unauthorized'", () => {
    expect(classifyProbeError("Error: Unauthorized", 1)).toBe("auth_required");
  });

  it("classifies auth_required on 'not logged in'", () => {
    expect(classifyProbeError("you are not logged in", 1)).toBe(
      "auth_required",
    );
  });

  it("classifies auth_required on 'sign in'", () => {
    expect(classifyProbeError("Please sign in to continue", 1)).toBe(
      "auth_required",
    );
  });

  it("classifies auth_required on 401 pattern", () => {
    expect(classifyProbeError("HTTP 401 Unauthorized", 1)).toBe(
      "auth_required",
    );
  });

  it("classifies quota_exceeded on 'rate limit'", () => {
    expect(classifyProbeError("rate limit exceeded", 1)).toBe("quota_exceeded");
  });

  it("classifies quota_exceeded on 'quota'", () => {
    expect(classifyProbeError("quota exceeded for this month", 1)).toBe(
      "quota_exceeded",
    );
  });

  it("classifies quota_exceeded on 429 pattern", () => {
    expect(classifyProbeError("HTTP 429 Too Many Requests", 1)).toBe(
      "quota_exceeded",
    );
  });

  it("classifies rejected on 'model not found'", () => {
    expect(classifyProbeError("model not found: claude-opus-99", 1)).toBe(
      "rejected",
    );
  });

  it("classifies rejected on 'invalid model'", () => {
    expect(classifyProbeError("invalid model specified", 1)).toBe("rejected");
  });

  it("classifies rejected on 'unsupported model'", () => {
    expect(classifyProbeError("unsupported model: gpt-99", 1)).toBe("rejected");
  });

  it("classifies unknown on non-zero exit with unrecognized output", () => {
    expect(classifyProbeError("some unexpected error occurred", 1)).toBe(
      "unknown",
    );
  });

  it("classifies unknown on null exit code with empty output", () => {
    expect(classifyProbeError("", null)).toBe("unknown");
  });

  it("auth_required takes precedence over rejected patterns when both match", () => {
    // Auth pattern checked before rejected
    expect(classifyProbeError("unauthorized access: model not found", 1)).toBe(
      "auth_required",
    );
  });
});

// ---------------------------------------------------------------------------
// probeSlug — CLI dispatch
// ---------------------------------------------------------------------------

describe("probeSlug", () => {
  it("returns accepted when CLI exits 0", async () => {
    mockSpawn({ status: 0, stdout: "pong", stderr: "" });

    const result = await probeSlug("anthropic/claude-opus-4-7");
    expect(result.status).toBe("accepted");
    expect(result.slug).toBe("anthropic/claude-opus-4-7");
    expect(result.cli).toBe("claude");
    expect(result.cliModel).toBe("claude-opus-4-7");
    expect(result.durationMs).toBeGreaterThanOrEqual(0);
  });

  it("maps anthropic owner to claude CLI", async () => {
    mockSpawn({ status: 0 });

    const result = await probeSlug("anthropic/some-model");
    expect(result.cli).toBe("claude");
    expect(result.cliModel).toBe("some-model");
  });

  it("maps openai owner to codex CLI", async () => {
    mockSpawn({ status: 0 });

    const result = await probeSlug("openai/gpt-5");
    expect(result.cli).toBe("codex");
    expect(result.cliModel).toBe("gpt-5");
  });

  it("maps google owner to gemini CLI", async () => {
    mockSpawn({ status: 0 });

    const result = await probeSlug("google/gemini-3-pro");
    expect(result.cli).toBe("gemini");
    expect(result.cliModel).toBe("gemini-3-pro");
  });

  it("maps qwen owner to qwen CLI", async () => {
    mockSpawn({ status: 0 });

    const result = await probeSlug("qwen/qwen3-coder-plus");
    expect(result.cli).toBe("qwen");
    expect(result.cliModel).toBe("qwen3-coder-plus");
  });

  it("maps cursor owner to cursor CLI", async () => {
    mockSpawn({ status: 0 });

    const result = await probeSlug("cursor/composer-2-fast");
    expect(result.cli).toBe("cursor");
    expect(result.cliModel).toBe("composer-2-fast");
  });

  it("returns auth_required when CLI outputs 'unauthorized'", async () => {
    mockSpawn({ status: 1, stderr: "Error: Unauthorized" });

    const result = await probeSlug("anthropic/claude-opus-4-7");
    expect(result.status).toBe("auth_required");
    expect(result.stderr).toContain("Unauthorized");
  });

  it("returns rejected when CLI outputs 'model not found'", async () => {
    mockSpawn({ status: 1, stderr: "model not found: claude-opus-99" });

    const result = await probeSlug("anthropic/claude-opus-99");
    expect(result.status).toBe("rejected");
  });

  it("returns quota_exceeded when CLI outputs 'rate limit'", async () => {
    mockSpawn({ status: 1, stderr: "rate limit exceeded, try again later" });

    const result = await probeSlug("anthropic/claude-opus-4-7");
    expect(result.status).toBe("quota_exceeded");
  });

  it("returns unknown when CLI not found (ENOENT)", async () => {
    const enoentError = Object.assign(new Error("spawn claude ENOENT"), {
      code: "ENOENT",
    });
    vi.mocked(childProcess.spawnSync).mockReturnValueOnce({
      stdout: "",
      stderr: "",
      status: null,
      error: enoentError,
      pid: 0,
      signal: null,
      output: [],
    } as unknown as ReturnType<typeof childProcess.spawnSync>);

    const result = await probeSlug("anthropic/claude-opus-4-7");
    expect(result.status).toBe("unknown");
    expect(result.stderr).toContain("ENOENT");
  });

  it("returns unknown when CLI times out", async () => {
    const timeoutError = Object.assign(
      new Error("spawnSync claude ETIMEDOUT"),
      {
        code: "ETIMEDOUT",
      },
    );
    vi.mocked(childProcess.spawnSync).mockReturnValueOnce({
      stdout: "",
      stderr: "",
      status: null,
      error: timeoutError,
      pid: 0,
      signal: null,
      output: [],
    } as unknown as ReturnType<typeof childProcess.spawnSync>);

    const result = await probeSlug("anthropic/claude-opus-4-7");
    expect(result.status).toBe("unknown");
    expect(result.stderr).toMatch(/timed out/i);
  });

  it("returns unknown status for unrecognized output", async () => {
    mockSpawn({ status: 1, stderr: "something went completely wrong" });

    const result = await probeSlug("anthropic/claude-opus-4-7");
    expect(result.status).toBe("unknown");
  });

  it("handles slug with no slash gracefully", async () => {
    mockSpawn({ status: 0 });

    const result = await probeSlug("bare-slug");
    expect(result.slug).toBe("bare-slug");
    expect(result.cliModel).toBe("bare-slug");
  });
});

// ---------------------------------------------------------------------------
// probeSlug — spawnSync argv assertions (regression guard for exact args)
// ---------------------------------------------------------------------------

describe("probeSlug spawnSync argv", () => {
  it("invokes claude with correct argv for anthropic slug", async () => {
    mockSpawn({ status: 0 });
    await probeSlug("anthropic/claude-x");
    expect(childProcess.spawnSync).toHaveBeenLastCalledWith(
      "claude",
      ["-p", "ping", "--model", "claude-x"],
      expect.objectContaining({ encoding: "utf-8" }),
    );
  });

  it("invokes codex with correct argv for openai slug", async () => {
    mockSpawn({ status: 0 });
    await probeSlug("openai/gpt-x");
    expect(childProcess.spawnSync).toHaveBeenLastCalledWith(
      "codex",
      ["exec", "-m", "gpt-x", "ping"],
      expect.objectContaining({ encoding: "utf-8" }),
    );
  });

  it("invokes gemini with correct argv for google slug", async () => {
    mockSpawn({ status: 0 });
    await probeSlug("google/gemini-x");
    expect(childProcess.spawnSync).toHaveBeenLastCalledWith(
      "gemini",
      ["-p", "ping", "--model", "gemini-x"],
      expect.objectContaining({ encoding: "utf-8" }),
    );
  });

  it("invokes qwen with correct argv for qwen slug", async () => {
    mockSpawn({ status: 0 });
    await probeSlug("qwen/qwen-x");
    expect(childProcess.spawnSync).toHaveBeenLastCalledWith(
      "qwen",
      ["-p", "ping", "-m", "qwen-x"],
      expect.objectContaining({ encoding: "utf-8" }),
    );
  });

  it("invokes cursor with --yolo and --trust flags for cursor slug", async () => {
    mockSpawn({ status: 0 });
    await probeSlug("cursor/composer-x");
    expect(childProcess.spawnSync).toHaveBeenLastCalledWith(
      "cursor",
      ["agent", "-p", "--yolo", "--trust", "--model", "composer-x", "ping"],
      expect.objectContaining({ encoding: "utf-8" }),
    );
  });
});

// ---------------------------------------------------------------------------
// describeProbeStatus
// ---------------------------------------------------------------------------

describe("describeProbeStatus", () => {
  const base = {
    slug: "anthropic/claude-opus-4-7",
    cli: "claude",
    cliModel: "claude-opus-4-7",
    durationMs: 1200,
  };

  it("describes accepted with duration", () => {
    const result = describeProbeStatus({ ...base, status: "accepted" });
    expect(result).toContain("accepted");
    expect(result).toContain("1200ms");
  });

  it("describes rejected with hyphen-form suggestion", () => {
    const result = describeProbeStatus({
      ...base,
      slug: "anthropic/claude-opus-4.7",
      status: "rejected",
    });
    expect(result).toContain("rejected");
    expect(result).toContain("claude-opus-4-7");
  });

  it("describes auth_required", () => {
    const result = describeProbeStatus({ ...base, status: "auth_required" });
    expect(result).toContain("auth_required");
  });

  it("describes quota_exceeded", () => {
    const result = describeProbeStatus({ ...base, status: "quota_exceeded" });
    expect(result).toContain("quota_exceeded");
  });

  it("describes unknown with stderr details", () => {
    const result = describeProbeStatus({
      ...base,
      status: "unknown",
      stderr: "connection refused",
    });
    expect(result).toContain("unknown");
    expect(result).toContain("connection refused");
  });

  it("describes unknown without stderr", () => {
    const result = describeProbeStatus({ ...base, status: "unknown" });
    expect(result).toContain("unknown");
    expect(result).toContain("no details");
  });
});
