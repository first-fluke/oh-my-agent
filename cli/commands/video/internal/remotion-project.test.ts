import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { isRemotionBrowserReady } from "./remotion-project.js";

// Regression: isRemotionBrowserReady must verify the actual Chrome Headless
// Shell *binary*, not just the download directory. Remotion's `browser ensure`
// can leave a partial extraction (ABOUT + LICENSE only, no binary) that still
// creates the dir — the old dir-existence check reported a false "ready" and
// the render then died at internalOpenBrowser.
describe("isRemotionBrowserReady binary verification", () => {
  let root: string | null = null;

  afterEach(() => {
    if (root) {
      rmSync(root, { recursive: true, force: true });
      root = null;
    }
  });

  // Mirrors the real layout: .../chrome-headless-shell/<platform>/chrome-headless-shell-<platform>/
  function extractedDir(projectDir: string): string {
    return path.join(
      projectDir,
      "node_modules",
      ".remotion",
      "chrome-headless-shell",
      "mac-arm64",
      "chrome-headless-shell-mac-arm64",
    );
  }

  it("returns false for a partial extraction (metadata files only, no binary)", () => {
    root = mkdtempSync(path.join(tmpdir(), "oma-remotion-"));
    const dir = extractedDir(root);
    mkdirSync(dir, { recursive: true });
    writeFileSync(path.join(dir, "ABOUT"), "about");
    writeFileSync(path.join(dir, "LICENSE.headless_shell"), "license");
    expect(isRemotionBrowserReady(root)).toBe(false);
  });

  it("returns true when the platform binary is present and >1MB", () => {
    root = mkdtempSync(path.join(tmpdir(), "oma-remotion-"));
    const dir = extractedDir(root);
    mkdirSync(dir, { recursive: true });
    const name =
      process.platform === "win32"
        ? "chrome-headless-shell.exe"
        : "chrome-headless-shell";
    writeFileSync(path.join(dir, name), Buffer.alloc(2_000_000));
    expect(isRemotionBrowserReady(root)).toBe(true);
  });

  it("returns false when a binary exists but is suspiciously small", () => {
    root = mkdtempSync(path.join(tmpdir(), "oma-remotion-"));
    const dir = extractedDir(root);
    mkdirSync(dir, { recursive: true });
    const name =
      process.platform === "win32"
        ? "chrome-headless-shell.exe"
        : "chrome-headless-shell";
    writeFileSync(path.join(dir, name), Buffer.alloc(1024));
    expect(isRemotionBrowserReady(root)).toBe(false);
  });

  it("returns false when the download directory is absent", () => {
    root = mkdtempSync(path.join(tmpdir(), "oma-remotion-"));
    expect(isRemotionBrowserReady(root)).toBe(false);
  });
});
