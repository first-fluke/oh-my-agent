import { describe, expect, it } from "vitest";
import type { Manifest, ManifestRun } from "./types.js";

describe("manifest contract (schema v1)", () => {
  it("round-trips a successful run through JSON", () => {
    const run: ManifestRun = {
      vendor: "codex",
      model: "gpt-image-2",
      strategy: "codex-exec-oauth",
      strategy_attempts: [
        { strategy: "codex-exec-oauth", status: "ok", duration_ms: 100 },
      ],
      files: ["codex-gpt-image-2.png"],
      duration_ms: 100,
      cost_usd: 0.04,
      status: "ok",
    };
    const manifest: Manifest = {
      schema_version: 1,
      timestamp: "2026-04-24T14:30:52+09:00",
      prompt: "test",
      options: { size: "1024x1024", quality: "auto", count: 1 },
      cost_estimate_usd: 0.03,
      runs: [run],
    };
    const round = JSON.parse(JSON.stringify(manifest)) as Manifest;
    expect(round.schema_version).toBe(1);
    expect(round.runs[0]?.strategy_attempts[0]?.status).toBe("ok");
  });

  it("allows prompt_sha256 instead of prompt", () => {
    const manifest: Manifest = {
      schema_version: 1,
      timestamp: "2026-04-24T14:30:52+09:00",
      prompt_sha256: "a".repeat(64),
      options: { size: "1024x1024", quality: "auto", count: 1 },
      cost_estimate_usd: 0,
      runs: [],
    };
    expect(manifest.prompt).toBeUndefined();
    expect(manifest.prompt_sha256).toHaveLength(64);
  });

  it("records failed runs with error kind and message", () => {
    const run: ManifestRun = {
      vendor: "gemini",
      model: "gemini-2.5-flash-image",
      strategy: "unknown",
      strategy_attempts: [
        { strategy: "stream", status: "failed", reason: "rate-limit" },
      ],
      files: [],
      duration_ms: 120,
      status: "failed",
      error: { kind: "rate-limit", message: "rate-limited" },
    };
    expect(run.error?.kind).toBe("rate-limit");
    expect(run.files).toHaveLength(0);
  });
});
