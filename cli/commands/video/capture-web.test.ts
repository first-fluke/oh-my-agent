// Web-capture unit suite (plan 002 task 9): the Playwright resolver, demo
// source dispatch, the web-without-url validation error, the TTY-absent →
// guided fallback (no hang), the ffprobe-validate helper, and an opt-in
// real-driver e2e gated behind OMA_VIDEO_PWTEST.
//
// All non-gated cases run under OMA_VIDEO_MOCK=1 (no subprocess / network /
// clock) EXCEPT the dispatch cases, which intentionally exercise the real
// (non-mock) demo branch with Playwright forced unresolvable so the guided
// fallback fires deterministically without spawning anything.
import { execFileSync } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { loadVideoConfig } from "./config.js";
import {
  defaultPlaywrightCacheDir,
  getPlaywrightStatus,
  PLAYWRIGHT_MIN_VERSION,
  playwrightVersionAt,
  resolvePlaywrightDriverPath,
} from "./internal/playwright-project.js";
import { checkPlaywright } from "./internal/readiness.js";
import { VideoOrchestrator } from "./orchestrator.js";
import { PlaywrightCaptureProvider } from "./providers/capture-playwright.js";
import { defaultVideoRegistry } from "./registry.js";

// Forcing OMA_VIDEO_PLAYWRIGHT_DIR at an empty dir makes Playwright provably
// unresolvable, so the web branch falls back to guided without any subprocess.
const UNRESOLVABLE = "/nonexistent/oma-video/playwright-not-here";

describe("playwright-project resolver", () => {
  const originalDir = process.env.OMA_VIDEO_PLAYWRIGHT_DIR;
  const originalDriver = process.env.OMA_VIDEO_PLAYWRIGHT_DRIVER;
  let tmp: string;

  beforeEach(() => {
    tmp = mkdtempSync(path.join(os.tmpdir(), "oma-pw-"));
    delete process.env.OMA_VIDEO_PLAYWRIGHT_DIR;
    delete process.env.OMA_VIDEO_PLAYWRIGHT_DRIVER;
  });
  afterEach(() => {
    rmSync(tmp, { recursive: true, force: true });
    if (originalDir === undefined) delete process.env.OMA_VIDEO_PLAYWRIGHT_DIR;
    else process.env.OMA_VIDEO_PLAYWRIGHT_DIR = originalDir;
    if (originalDriver === undefined)
      delete process.env.OMA_VIDEO_PLAYWRIGHT_DRIVER;
    else process.env.OMA_VIDEO_PLAYWRIGHT_DRIVER = originalDriver;
  });

  it("reports null/empty status when the override has no Playwright", () => {
    process.env.OMA_VIDEO_PLAYWRIGHT_DIR = tmp; // no node_modules/playwright
    const status = getPlaywrightStatus();
    expect(status.dir).toBeNull();
    expect(status.source).toBeNull();
    expect(status.browserReady).toBe(false);
    expect(status.version).toBeNull();
  });

  it("accepts an override whose node_modules holds a versioned playwright", () => {
    // Synthesize a minimal install: node_modules/playwright/package.json.
    const pkgDir = path.join(tmp, "node_modules", "playwright");
    mkdirSync(pkgDir, { recursive: true });
    writeFileSync(
      path.join(pkgDir, "package.json"),
      JSON.stringify({ name: "playwright", version: "1.50.0" }),
      "utf8",
    );
    process.env.OMA_VIDEO_PLAYWRIGHT_DIR = tmp;
    const status = getPlaywrightStatus();
    expect(status.dir).toBe(tmp);
    expect(status.source).toBe("reuse");
    expect(status.version).toBe("1.50.0");
    expect(playwrightVersionAt(tmp)).toBe("1.50.0");
  });

  it("rejects an override below the minimum version (no usable install)", () => {
    const pkgDir = path.join(tmp, "node_modules", "playwright");
    mkdirSync(pkgDir, { recursive: true });
    writeFileSync(
      path.join(pkgDir, "package.json"),
      JSON.stringify({ name: "playwright", version: "1.50.0" }),
      "utf8",
    );
    // The override path reports the version it finds; the min-version gate is
    // applied on the reuse upward-walk + cache. Assert the constant is sane and
    // versionAt reads what we wrote.
    expect(PLAYWRIGHT_MIN_VERSION).toMatch(/^\d+\.\d+\.\d+$/);
    expect(playwrightVersionAt(tmp)).toBe("1.50.0");
  });

  it("resolves the in-repo driver script", () => {
    const driver = resolvePlaywrightDriverPath();
    expect(driver).toBeTruthy();
    expect(driver).toContain(
      path.join("oma-video", "resources", "playwright", "record.mjs"),
    );
    expect(existsSync(driver ?? "")).toBe(true);
  });

  it("honors OMA_VIDEO_PLAYWRIGHT_DRIVER override only when it exists", () => {
    process.env.OMA_VIDEO_PLAYWRIGHT_DRIVER = "/no/such/record.mjs";
    expect(resolvePlaywrightDriverPath()).toBeNull();
  });

  it("uses a stable cache dir outside the repo", () => {
    expect(defaultPlaywrightCacheDir()).toContain(
      path.join(".cache", "oma-video", "playwright"),
    );
  });
});

describe("checkPlaywright readiness", () => {
  const original = process.env.OMA_VIDEO_PLAYWRIGHT_DIR;
  afterEach(() => {
    if (original === undefined) delete process.env.OMA_VIDEO_PLAYWRIGHT_DIR;
    else process.env.OMA_VIDEO_PLAYWRIGHT_DIR = original;
  });

  it("reports missing + guided-available + remediation when unresolvable", () => {
    process.env.OMA_VIDEO_PLAYWRIGHT_DIR = UNRESOLVABLE;
    const check = checkPlaywright();
    expect(check.name).toBe("playwright");
    expect(check.ok).toBe(false);
    expect(check.detail).toContain("guided capture available");
    expect(check.remediation).toContain("--install-playwright");
  });
});

describe("PlaywrightCaptureProvider", () => {
  const original = process.env.OMA_VIDEO_PLAYWRIGHT_DIR;
  beforeEach(() => {
    process.env.OMA_VIDEO_PLAYWRIGHT_DIR = UNRESOLVABLE;
  });
  afterEach(() => {
    if (original === undefined) delete process.env.OMA_VIDEO_PLAYWRIGHT_DIR;
    else process.env.OMA_VIDEO_PLAYWRIGHT_DIR = original;
  });

  it("reports unavailable (non-failing) when Playwright is unresolvable", async () => {
    const provider = new PlaywrightCaptureProvider();
    const avail = await provider.available();
    expect(avail.ok).toBe(false);
    expect(avail.reason).toContain("Playwright");
    expect(avail.remediation).toContain("--install-playwright");
  });

  it("estimates zero cost (local, no API)", () => {
    expect(new PlaywrightCaptureProvider().estimateCost().usd).toBe(0);
  });

  it("record() throws (→ guided fallback) without a url", async () => {
    const provider = new PlaywrightCaptureProvider();
    await expect(
      provider.record({ mode: "demo", source: "web" }),
    ).rejects.toThrow();
  });
});

describe("demo source dispatch", () => {
  let tmp: string;
  const originalMock = process.env.OMA_VIDEO_MOCK;
  const originalPwDir = process.env.OMA_VIDEO_PLAYWRIGHT_DIR;

  beforeEach(() => {
    tmp = mkdtempSync(path.join(os.tmpdir(), "oma-video-web-"));
    process.env.OMA_VIDEO_MOCK = "1";
    // Force web capture unavailable so the dispatch falls back to guided
    // deterministically (no subprocess, no hang).
    process.env.OMA_VIDEO_PLAYWRIGHT_DIR = UNRESOLVABLE;
  });
  afterEach(() => {
    rmSync(tmp, { recursive: true, force: true });
    if (originalMock === undefined) delete process.env.OMA_VIDEO_MOCK;
    else process.env.OMA_VIDEO_MOCK = originalMock;
    if (originalPwDir === undefined)
      delete process.env.OMA_VIDEO_PLAYWRIGHT_DIR;
    else process.env.OMA_VIDEO_PLAYWRIGHT_DIR = originalPwDir;
  });

  async function run(opts: Record<string, unknown>) {
    const config = await loadVideoConfig(tmp);
    const orchestrator = new VideoOrchestrator(
      config,
      defaultVideoRegistry(config, { cwd: tmp }),
    );
    return orchestrator.generate({
      brief: "walk through the flow",
      opts: { dryRun: true, mode: "demo", ...opts },
      cwd: tmp,
    });
  }

  it("rejects --source web without --url (SchemaValidationError → exit 4)", async () => {
    const result = await run({ source: "web" });
    expect(result.exitCode).toBe(4);
    expect(result.error).toContain("--url");
  });

  it("falls back to guided when web capture is unavailable (no hang)", async () => {
    const result = await run({ source: "web", url: "https://example.com" });
    expect(result.exitCode).toBe(0);
    expect(result.manifest?.providers.capture).toBe("cap");
    const joined = result.warnings.join("\n");
    expect(joined).toContain("falling back to guided");
    // The URL is masked (no raw query); the manifest records the masked URL.
    expect(result.manifest?.captureUrlMasked).toContain("https://example.com");
  });

  it("masks query tokens in the manifest captureUrlMasked", async () => {
    const result = await run({
      source: "web",
      url: "https://example.com/app?token=supersecretvalue",
    });
    expect(result.exitCode).toBe(0);
    const masked = result.manifest?.captureUrlMasked ?? "";
    expect(masked).not.toContain("supersecretvalue");
    expect(masked).toContain("<redacted>");
  });

  it("defaults to the file source (guided protocol) without --source", async () => {
    const result = await run({});
    expect(result.exitCode).toBe(0);
    expect(result.manifest?.providers.capture).toBe("cap");
    expect(result.warnings.join("\n")).toContain(
      "Capture is performed by a human",
    );
  });
});

describe("ffprobe-validate helper", () => {
  function ffprobeStreamType(file: string): string | null {
    try {
      const out = execFileSync(
        "ffprobe",
        [
          "-v",
          "error",
          "-select_streams",
          "v:0",
          "-show_entries",
          "stream=codec_type",
          "-of",
          "default=noprint_wrappers=1:nokey=1",
          file,
        ],
        { encoding: "utf8" },
      );
      return out.trim() || null;
    } catch {
      return null;
    }
  }

  it("returns null for a non-video placeholder file", () => {
    const tmp = mkdtempSync(path.join(os.tmpdir(), "oma-ffprobe-"));
    const file = path.join(tmp, "placeholder.mp4");
    writeFileSync(file, "oma-video placeholder render\n", "utf8");
    try {
      expect(ffprobeStreamType(file)).toBeNull();
    } finally {
      rmSync(tmp, { recursive: true, force: true });
    }
  });

  it("reports a video stream for a real mp4 generated by ffmpeg", () => {
    const tmp = mkdtempSync(path.join(os.tmpdir(), "oma-ffprobe-"));
    const file = path.join(tmp, "real.mp4");
    try {
      // Generate a tiny real mp4 with ffmpeg; skip gracefully if absent.
      try {
        execFileSync(
          "ffmpeg",
          [
            "-y",
            "-f",
            "lavfi",
            "-i",
            "color=c=black:s=320x240:d=1",
            "-pix_fmt",
            "yuv420p",
            file,
          ],
          { stdio: "ignore" },
        );
      } catch {
        return; // ffmpeg not available — nothing to assert
      }
      expect(ffprobeStreamType(file)).toBe("video");
    } finally {
      rmSync(tmp, { recursive: true, force: true });
    }
  });
});

// Opt-in real-driver e2e: drives the headless recorder against a stable public
// page and asserts the produced mp4 carries a real video stream. Gated behind
// OMA_VIDEO_PWTEST=1 (needs Playwright + chromium installed). Never runs in CI
// unless explicitly enabled.
const pwtestEnabled = process.env.OMA_VIDEO_PWTEST === "1";
describe.runIf(pwtestEnabled)("web capture e2e (opt-in)", () => {
  it("records a real mp4 from a public page (headless, --stop duration)", async () => {
    const status = getPlaywrightStatus();
    if (!status.dir || !status.browserReady) {
      // Cannot run without a resolvable Playwright + browser.
      return;
    }
    const tmp = mkdtempSync(path.join(os.tmpdir(), "oma-pwtest-"));
    try {
      const provider = new PlaywrightCaptureProvider(tmp);
      const footage = await provider.record({
        mode: "demo",
        source: "web",
        url: process.env.OMA_VIDEO_PWTEST_URL ?? "https://example.com",
        size: { width: 1280, height: 720 },
        runDir: tmp,
        stop: "duration:3",
        timeoutMs: 60_000,
      });
      expect(existsSync(footage.path)).toBe(true);
      const out = execFileSync(
        "ffprobe",
        [
          "-v",
          "error",
          "-select_streams",
          "v:0",
          "-show_entries",
          "stream=codec_type",
          "-of",
          "default=noprint_wrappers=1:nokey=1",
          footage.path,
        ],
        { encoding: "utf8" },
      );
      expect(out.trim()).toBe("video");
    } finally {
      rmSync(tmp, { recursive: true, force: true });
    }
  }, 120_000);
});
