import { mkdtempSync, rmSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { resolveOutDir } from "./path-guard.js";

// Normalize Windows backslashes for cross-platform path string checks.
const n = (s: string) => s.replace(/\\/g, "/");

describe("resolveOutDir", () => {
  let tmp: string;
  const runId = { timestamp: "20260424-143052", shortid: "ab12cd" };

  beforeEach(() => {
    tmp = mkdtempSync(path.join(os.tmpdir(), "oma-image-pg-"));
  });
  afterEach(() => {
    rmSync(tmp, { recursive: true, force: true });
  });

  it("creates a single-vendor folder inside default base", () => {
    const out = resolveOutDir({
      allowExternal: false,
      defaultBase: "results",
      runId,
      compare: false,
      singleFolderPattern: "{timestamp}-{shortid}",
      compareFolderPattern: "{timestamp}-{shortid}-compare",
      cwd: tmp,
    });
    expect(n(out).endsWith("results/20260424-143052-ab12cd")).toBe(true);
  });

  it("creates a compare folder when compare=true", () => {
    const out = resolveOutDir({
      allowExternal: false,
      defaultBase: "results",
      runId,
      compare: true,
      singleFolderPattern: "{timestamp}-{shortid}",
      compareFolderPattern: "{timestamp}-{shortid}-compare",
      cwd: tmp,
    });
    expect(n(out).endsWith("20260424-143052-ab12cd-compare")).toBe(true);
  });

  it("rejects --out paths outside $PWD without --allow-external-out", () => {
    expect(() =>
      resolveOutDir({
        outFlag: "/tmp/foreign-path",
        allowExternal: false,
        defaultBase: "results",
        runId,
        compare: false,
        singleFolderPattern: "{timestamp}-{shortid}",
        compareFolderPattern: "{timestamp}-{shortid}-compare",
        cwd: tmp,
      }),
    ).toThrow(/outside \$PWD/);
  });

  it("allows external paths when --allow-external-out is set", () => {
    const external = path.join(os.tmpdir(), `oma-image-ext-${Date.now()}`);
    const out = resolveOutDir({
      outFlag: external,
      allowExternal: true,
      defaultBase: "results",
      runId,
      compare: false,
      singleFolderPattern: "{timestamp}-{shortid}",
      compareFolderPattern: "{timestamp}-{shortid}-compare",
      cwd: tmp,
    });
    expect(out).toBe(path.resolve(external));
    rmSync(external, { recursive: true, force: true });
  });

  it("resolves relative --out inside $PWD", () => {
    const out = resolveOutDir({
      outFlag: "sub/dir",
      allowExternal: false,
      defaultBase: "ignored",
      runId,
      compare: false,
      singleFolderPattern: "{timestamp}-{shortid}",
      compareFolderPattern: "{timestamp}-{shortid}-compare",
      cwd: tmp,
    });
    expect(out).toBe(path.resolve(tmp, "sub/dir"));
  });
});
