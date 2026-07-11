import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  installPretendardFont,
  isPretendardFontPresent,
  isRemotionBrowserReady,
  PRETENDARD_FONT_RELATIVE,
  PRETENDARD_FONT_URL,
} from "./remotion-project.js";

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

// The doctor's one-time Pretendard fetch (determinism boundary). The network is
// always mocked here: success writes the woff2 into public/fonts/, and any
// network failure degrades gracefully (ok:false result, no file, no throw).
describe("installPretendardFont", () => {
  let root: string | null = null;

  afterEach(() => {
    if (root) {
      rmSync(root, { recursive: true, force: true });
      root = null;
    }
  });

  it("is a no-op when the font is already present", async () => {
    root = mkdtempSync(path.join(tmpdir(), "oma-remotion-"));
    const dest = path.join(root, PRETENDARD_FONT_RELATIVE);
    mkdirSync(path.dirname(dest), { recursive: true });
    writeFileSync(dest, Buffer.alloc(16));
    const fetchImpl = vi.fn();
    const result = await installPretendardFont(
      root,
      fetchImpl as unknown as typeof fetch,
    );
    expect(result.ok).toBe(true);
    expect(result.detail).toBe("already present");
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("downloads the pinned woff2 into public/fonts/ on success", async () => {
    root = mkdtempSync(path.join(tmpdir(), "oma-remotion-"));
    const bytes = Buffer.from("woff2-bytes");
    const fetchImpl = vi
      .fn()
      .mockResolvedValue(new Response(bytes, { status: 200 }));
    const result = await installPretendardFont(
      root,
      fetchImpl as unknown as typeof fetch,
    );
    expect(fetchImpl).toHaveBeenCalledWith(
      PRETENDARD_FONT_URL,
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
    );
    expect(result.ok).toBe(true);
    expect(isPretendardFontPresent(root)).toBe(true);
  });

  it("warns and continues (no throw, no file) on a network failure", async () => {
    root = mkdtempSync(path.join(tmpdir(), "oma-remotion-"));
    const fetchImpl = vi.fn().mockRejectedValue(new Error("offline"));
    const result = await installPretendardFont(
      root,
      fetchImpl as unknown as typeof fetch,
    );
    expect(result.ok).toBe(false);
    expect(result.detail).toContain("system fonts");
    expect(isPretendardFontPresent(root)).toBe(false);
    expect(existsSync(path.join(root, PRETENDARD_FONT_RELATIVE))).toBe(false);
  });

  it("reports a non-2xx response as a graceful failure", async () => {
    root = mkdtempSync(path.join(tmpdir(), "oma-remotion-"));
    const fetchImpl = vi
      .fn()
      .mockResolvedValue(new Response("not found", { status: 404 }));
    const result = await installPretendardFont(
      root,
      fetchImpl as unknown as typeof fetch,
    );
    expect(result.ok).toBe(false);
    expect(result.detail).toContain("HTTP 404");
    expect(isPretendardFontPresent(root)).toBe(false);
  });
});
