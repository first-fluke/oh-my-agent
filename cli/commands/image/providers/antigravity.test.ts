import { mkdtempSync, rmSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  AntigravityProvider,
  buildInstruction,
  classifyAgyError,
  classifyReplyKeyword,
  sniffImageFormat,
} from "./antigravity.js";
import { runCapture } from "./codex.js";

vi.mock("./codex.js", () => ({
  runCapture: vi.fn(),
}));

describe("sniffImageFormat", () => {
  it("detects JPEG from magic bytes", () => {
    const buf = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10]);
    expect(sniffImageFormat(buf)).toEqual({ ext: "jpg", mime: "image/jpeg" });
  });

  it("detects PNG from magic bytes", () => {
    const buf = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    expect(sniffImageFormat(buf)).toEqual({ ext: "png", mime: "image/png" });
  });

  it("detects WebP from RIFF...WEBP header", () => {
    const buf = Buffer.from([
      0x52, 0x49, 0x46, 0x46, 0x00, 0x00, 0x00, 0x00, 0x57, 0x45, 0x42, 0x50,
    ]);
    expect(sniffImageFormat(buf)).toEqual({ ext: "webp", mime: "image/webp" });
  });

  it("detects GIF89a", () => {
    const buf = Buffer.from([0x47, 0x49, 0x46, 0x38, 0x39, 0x61]);
    expect(sniffImageFormat(buf)).toEqual({ ext: "gif", mime: "image/gif" });
  });

  it("defaults to JPEG for unknown signatures (Gemini default)", () => {
    const buf = Buffer.from([0x00, 0x00, 0x00, 0x00]);
    expect(sniffImageFormat(buf)).toEqual({ ext: "jpg", mime: "image/jpeg" });
  });
});

describe("buildInstruction", () => {
  it("lists every target path the agent must write to", () => {
    const out = buildInstruction({
      prompt: "a red apple",
      size: "1024x1024",
      quality: "auto",
      n: 2,
      targets: ["/tmp/a/img-1.img", "/tmp/a/img-2.img"],
      refPaths: [],
    });
    expect(out).toContain("image[0] -> /tmp/a/img-1.img");
    expect(out).toContain("image[1] -> /tmp/a/img-2.img");
    expect(out).toContain("SAVED:/tmp/a/img-1.img");
    expect(out).toContain("SAVED:/tmp/a/img-2.img");
    expect(out).toContain("2 distinct images");
  });

  it("invokes generate_image by name without naming a model", () => {
    const out = buildInstruction({
      prompt: "a red apple",
      size: "1024x1024",
      quality: "auto",
      n: 1,
      targets: ["/tmp/a/img.img"],
      refPaths: [],
    });
    expect(out).toContain("generate_image");
    expect(out).not.toMatch(/preferred model/i);
    expect(out).not.toMatch(/nano-banana/i);
    expect(out).not.toMatch(/gemini-\d/i);
  });

  it("inlines reference image paths when provided", () => {
    const out = buildInstruction({
      prompt: "same otter, dramatic lighting",
      size: "auto",
      quality: "auto",
      n: 1,
      targets: ["/tmp/o.img"],
      refPaths: ["/tmp/refs/ref-0.jpg"],
    });
    expect(out).toContain("Reference images");
    expect(out).toContain("ref[0]: /tmp/refs/ref-0.jpg");
  });

  it("emits one-image phrasing for n=1", () => {
    const out = buildInstruction({
      prompt: "x",
      size: "auto",
      quality: "auto",
      n: 1,
      targets: ["/tmp/x.img"],
      refPaths: [],
    });
    expect(out).toContain("once");
    expect(out).toContain("one image");
    expect(out).not.toContain("distinct images");
  });
});

describe("classifyReplyKeyword", () => {
  it("maps NO_IMAGE_TOOL to not-installed", () => {
    expect(classifyReplyKeyword("NO_IMAGE_TOOL")?.kind).toBe("not-installed");
  });
  it("maps CONTENT_POLICY_REFUSAL to safety-refused", () => {
    expect(classifyReplyKeyword("CONTENT_POLICY_REFUSAL: explicit")?.kind).toBe(
      "safety-refused",
    );
  });
  it("maps RATE_LIMITED to rate-limit", () => {
    expect(classifyReplyKeyword("RATE_LIMITED")?.kind).toBe("rate-limit");
  });
  it("maps AUTH_REQUIRED to auth-required", () => {
    expect(classifyReplyKeyword("AUTH_REQUIRED")?.kind).toBe("auth-required");
  });
  it("returns null for normal success replies", () => {
    expect(classifyReplyKeyword("SAVED:/tmp/x.jpg")).toBeNull();
  });
});

describe("classifyAgyError", () => {
  it("maps timedOut to timeout", () => {
    expect(
      classifyAgyError({ code: 124, stdout: "", stderr: "", timedOut: true })
        .kind,
    ).toBe("timeout");
  });
  it("maps auth-related stderr to auth-required", () => {
    expect(
      classifyAgyError({
        code: 1,
        stdout: "",
        stderr: "Sign in required to continue",
      }).kind,
    ).toBe("auth-required");
  });
  it("maps 429-style errors to rate-limit", () => {
    expect(
      classifyAgyError({
        code: 1,
        stdout: "HTTP 429 quota exceeded",
        stderr: "",
      }).kind,
    ).toBe("rate-limit");
  });
  it("maps content-policy errors to safety-refused", () => {
    expect(
      classifyAgyError({
        code: 1,
        stdout: "",
        stderr: "Request blocked by content policy",
      }).kind,
    ).toBe("safety-refused");
  });
  it("falls back to other for unknown failures", () => {
    expect(classifyAgyError({ code: 1, stdout: "boom", stderr: "" }).kind).toBe(
      "other",
    );
  });
});

describe("AntigravityProvider.health", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("reports unhealthy when agy CLI is not installed", async () => {
    vi.mocked(runCapture).mockResolvedValue({
      code: 127,
      stdout: "",
      stderr: "command not found",
    });
    const p = new AntigravityProvider();
    const h = await p.health();
    if (h.ok) throw new Error("expected unhealthy");
    expect(h.reason).toBe("not-installed");
    expect(h.hint).toMatch(/agy/);
  });

  it("reports healthy when agy CLI is installed and exposes no model list", async () => {
    vi.mocked(runCapture).mockResolvedValue({
      code: 0,
      stdout: "1.0.0\n",
      stderr: "",
    });
    const p = new AntigravityProvider();
    const h = await p.health();
    if (!h.ok) throw new Error(`expected healthy, got: ${h.hint}`);
    expect(h.supportedModels).toEqual([]);
    expect(h.detail).toContain("Antigravity CLI 1.0.0");
    expect(h.detail).toContain("agy");
  });
});

describe("AntigravityProvider.generate", () => {
  let tmp: string;

  beforeEach(() => {
    tmp = mkdtempSync(path.join(os.tmpdir(), "oma-agy-"));
  });

  afterEach(() => {
    rmSync(tmp, { recursive: true, force: true });
    vi.restoreAllMocks();
  });

  it("throws timeout error when runCapture times out", async () => {
    vi.mocked(runCapture).mockResolvedValue({
      code: 124,
      stdout: "",
      stderr: "",
      timedOut: true,
    });
    const p = new AntigravityProvider();
    await expect(
      p.generate({
        prompt: "test",
        size: "auto",
        quality: "auto",
        n: 1,
        outDir: tmp,
        signal: new AbortController().signal,
      }),
    ).rejects.toMatchObject({
      kind: "timeout",
    });
  });

  it("throws classified error when runCapture fails with non-zero code", async () => {
    vi.mocked(runCapture).mockResolvedValue({
      code: 1,
      stdout: "",
      stderr: "Sign in required to continue",
    });
    const p = new AntigravityProvider();
    await expect(
      p.generate({
        prompt: "test",
        size: "auto",
        quality: "auto",
        n: 1,
        outDir: tmp,
        signal: new AbortController().signal,
      }),
    ).rejects.toMatchObject({
      kind: "auth-required",
    });
  });

  it("throws classified reply keyword error if stdout contains NO_IMAGE_TOOL", async () => {
    vi.mocked(runCapture).mockResolvedValue({
      code: 0,
      stdout: "NO_IMAGE_TOOL\n",
      stderr: "",
    });
    const p = new AntigravityProvider();
    await expect(
      p.generate({
        prompt: "test",
        size: "auto",
        quality: "auto",
        n: 1,
        outDir: tmp,
        signal: new AbortController().signal,
      }),
    ).rejects.toMatchObject({
      kind: "not-installed",
    });
  });

  it("throws other error if output file is not written", async () => {
    vi.mocked(runCapture).mockResolvedValue({
      code: 0,
      stdout: "SAVED:/tmp/nonexistent.img\n",
      stderr: "",
    });
    const p = new AntigravityProvider();
    await expect(
      p.generate({
        prompt: "test",
        size: "auto",
        quality: "auto",
        n: 1,
        outDir: tmp,
        signal: new AbortController().signal,
      }),
    ).rejects.toMatchObject({
      kind: "other",
    });
  });

  it("creates the files and returns successful results on success", async () => {
    vi.mocked(runCapture).mockImplementation(async (_bin, args) => {
      const instruction = args[args.length - 1];
      if (typeof instruction === "string") {
        const matches = instruction.matchAll(/image\[\d+\]\s+->\s+(\S+)/g);
        for (const match of matches) {
          const filePath = match[1];
          if (filePath) {
            const fs = await import("node:fs/promises");
            const jpegMagic = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10]);
            await fs.writeFile(filePath, jpegMagic);
          }
        }
      }
      return { code: 0, stdout: "SAVED", stderr: "" };
    });

    const p = new AntigravityProvider();
    const results = await p.generate({
      prompt: "test",
      size: "auto",
      quality: "auto",
      n: 2,
      outDir: tmp,
      signal: new AbortController().signal,
    });

    expect(results).toHaveLength(2);
    expect(results[0]?.vendor).toBe("antigravity");
    expect(results[0]?.model).toBe("agy-internal");
    expect(results[0]?.mime).toBe("image/jpeg");
    expect(results[0]?.filePath).toMatch(/\.jpg$/);
    // Filename must not embed a fictional model name; only vendor + runShortid.
    expect(results[0]?.filePath).not.toMatch(/gemini|nano-banana/);
    expect(results[1]?.vendor).toBe("antigravity");
    expect(results[1]?.model).toBe("agy-internal");
    expect(results[1]?.mime).toBe("image/jpeg");
    expect(results[1]?.filePath).toMatch(/\.jpg$/);
  });

  // Regression for 21141241: agy's `-p` (= `--print`) is a VALUE flag — it
  // consumes the NEXT argv token as the prompt. If `-p` leads the argv (as it
  // once did), agy eats `--dangerously-skip-permissions` as the prompt value
  // and the real instruction becomes a stray positional, so the prompt is
  // never delivered. `-p` must sit immediately before the instruction.
  it("passes -p immediately before the prompt, not leading the argv", async () => {
    let captured: readonly string[] = [];
    vi.mocked(runCapture).mockImplementation(async (_bin, args) => {
      captured = args;
      const instruction = args[args.length - 1];
      if (typeof instruction === "string") {
        for (const m of instruction.matchAll(/image\[\d+\]\s+->\s+(\S+)/g)) {
          const filePath = m[1];
          if (filePath) {
            const fs = await import("node:fs/promises");
            await fs.writeFile(
              filePath,
              Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10]),
            );
          }
        }
      }
      return { code: 0, stdout: "SAVED", stderr: "" };
    });

    const p = new AntigravityProvider();
    await p.generate({
      prompt: "a red apple",
      size: "auto",
      quality: "auto",
      n: 1,
      outDir: tmp,
      signal: new AbortController().signal,
    });

    const pIndex = captured.indexOf("-p");
    expect(pIndex).toBeGreaterThanOrEqual(0);
    // `-p` must be the second-to-last token, with the instruction as its value.
    expect(pIndex).toBe(captured.length - 2);
    expect(captured[pIndex + 1]).toContain("a red apple");
    // The bug shipped `-p` first; lock that it never leads and never pairs with
    // a flag instead of the prompt.
    expect(captured[0]).toBe("--dangerously-skip-permissions");
    expect(captured[pIndex + 1]).not.toBe("--dangerously-skip-permissions");
  });
});
