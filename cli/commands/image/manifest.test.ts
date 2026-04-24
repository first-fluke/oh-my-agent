import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { isoWithOffset, writeManifest } from "./manifest.js";
import type { ManifestRun } from "./types.js";

describe("writeManifest", () => {
  let tmp: string;
  beforeEach(() => {
    tmp = mkdtempSync(path.join(os.tmpdir(), "oma-image-man-"));
  });
  afterEach(() => {
    rmSync(tmp, { recursive: true, force: true });
  });

  const runs: ManifestRun[] = [
    {
      vendor: "codex",
      model: "gpt-image-2",
      strategy: "codex-exec-oauth",
      strategy_attempts: [
        { strategy: "codex-exec-oauth", status: "ok", duration_ms: 12340 },
      ],
      files: ["codex-gpt-image-2.png"],
      duration_ms: 12340,
      status: "ok",
    },
  ];

  it("writes a schema-1 manifest with raw prompt by default", async () => {
    const p = await writeManifest({
      outDir: tmp,
      runId: { timestamp: "20260424-143052", shortid: "ab12cd" },
      prompt: "a red apple",
      includePrompt: true,
      options: { size: "1024x1024", quality: "auto", count: 1 },
      costEstimate: 0.03,
      runs,
      startedAt: Date.now(),
    });
    expect(p).toBe(path.join(tmp, "manifest.json"));
    const parsed = JSON.parse(readFileSync(p, "utf8"));
    expect(parsed.schema_version).toBe(1);
    expect(parsed.prompt).toBe("a red apple");
    expect(parsed.prompt_sha256).toBeUndefined();
    expect(parsed.cost_estimate_usd).toBe(0.03);
    expect(parsed.runs[0].strategy_attempts[0].status).toBe("ok");
  });

  it("replaces prompt with prompt_sha256 when opted out", async () => {
    const p = await writeManifest({
      outDir: tmp,
      runId: { timestamp: "20260424-143052", shortid: "ab12cd" },
      prompt: "secret prompt",
      includePrompt: false,
      options: { size: "1024x1024", quality: "auto", count: 1 },
      costEstimate: 0,
      runs,
      startedAt: Date.now(),
    });
    const parsed = JSON.parse(readFileSync(p, "utf8"));
    expect(parsed.prompt).toBeUndefined();
    expect(parsed.prompt_sha256).toMatch(/^[a-f0-9]{64}$/);
  });
});

describe("isoWithOffset", () => {
  it("produces ISO string with timezone offset", () => {
    const d = new Date(2026, 3, 24, 14, 30, 52);
    const out = isoWithOffset(d);
    expect(out).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}[+-]\d{2}:\d{2}$/);
  });
});
