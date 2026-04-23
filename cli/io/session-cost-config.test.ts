/**
 * Filesystem-based integration tests for loadQuotaCap.
 *
 * Verifies that the cap resolver honors all three candidate paths with the
 * correct precedence:
 *   1. .agents/oma-config.yaml                (canonical, wins)
 *   2. .agents/config/user-preferences.yaml   (legacy)
 *   3. .agents/config/defaults.yaml           (shipped SSOT fallback)
 *
 * Uses real tmpdir + process.chdir rather than the mocked fs in
 * session-cost.test.ts so the true findFileUp / readFileSync path is exercised.
 */

import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { loadQuotaCap } from "./session-cost.js";

describe("loadQuotaCap — config precedence", () => {
  let tempDir: string;
  let originalCwd: string;

  beforeEach(() => {
    originalCwd = process.cwd();
    tempDir = mkdtempSync(join(tmpdir(), "oma-quota-cfg-"));
    mkdirSync(join(tempDir, ".agents", "config"), { recursive: true });
    process.chdir(tempDir);
  });

  afterEach(() => {
    process.chdir(originalCwd);
    rmSync(tempDir, { recursive: true, force: true });
  });

  it("reads quota_cap from .agents/oma-config.yaml", () => {
    writeFileSync(
      join(tempDir, ".agents", "oma-config.yaml"),
      `session:\n  quota_cap:\n    tokens: 500000\n    spawn_count: 25\n`,
    );
    const cap = loadQuotaCap(tempDir);
    expect(cap).toEqual({ tokens: 500000, spawnCount: 25 });
  });

  it("prefers oma-config.yaml over legacy user-preferences.yaml", () => {
    writeFileSync(
      join(tempDir, ".agents", "config", "user-preferences.yaml"),
      `session:\n  quota_cap:\n    tokens: 100\n`,
    );
    writeFileSync(
      join(tempDir, ".agents", "oma-config.yaml"),
      `session:\n  quota_cap:\n    tokens: 999\n`,
    );
    const cap = loadQuotaCap(tempDir);
    expect(cap?.tokens).toBe(999);
  });

  it("falls back to legacy user-preferences.yaml when oma-config lacks cap", () => {
    writeFileSync(
      join(tempDir, ".agents", "oma-config.yaml"),
      `language: en\n`,
    );
    writeFileSync(
      join(tempDir, ".agents", "config", "user-preferences.yaml"),
      `session:\n  quota_cap:\n    spawn_count: 42\n`,
    );
    const cap = loadQuotaCap(tempDir);
    expect(cap).toEqual({ spawnCount: 42 });
  });

  it("falls back to defaults.yaml when neither user file has a cap", () => {
    writeFileSync(
      join(tempDir, ".agents", "config", "defaults.yaml"),
      `session:\n  quota_cap:\n    tokens: 77\n`,
    );
    const cap = loadQuotaCap(tempDir);
    expect(cap?.tokens).toBe(77);
  });

  it("returns null when no cap is configured anywhere", () => {
    writeFileSync(
      join(tempDir, ".agents", "oma-config.yaml"),
      `language: en\n`,
    );
    expect(loadQuotaCap(tempDir)).toBeNull();
  });
});
