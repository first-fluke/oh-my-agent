import { describe, expect, it } from "vitest";
import {
  buildOutputFilename,
  formatTimestamp,
  makeRunId,
  renderPattern,
  sanitizeModelForFilename,
  shortId,
} from "./naming.js";

describe("naming", () => {
  it("formats timestamps as YYYYMMDD-HHMMSS", () => {
    const d = new Date(2026, 3, 24, 14, 30, 52);
    expect(formatTimestamp(d)).toBe("20260424-143052");
  });

  it("generates short ids of the requested length", () => {
    expect(shortId(6)).toHaveLength(6);
    expect(shortId(10)).toHaveLength(10);
    expect(shortId(6)).toMatch(/^[0-9a-z]+$/);
  });

  it("produces a run id with timestamp and shortid", () => {
    const id = makeRunId(new Date(2026, 3, 24, 14, 30, 52));
    expect(id.timestamp).toBe("20260424-143052");
    expect(id.shortid).toMatch(/^[0-9a-z]{6}$/);
  });

  it("renders patterns with known vars", () => {
    const result = renderPattern("{timestamp}-{shortid}-{vendor}", {
      timestamp: "20260424",
      shortid: "ab12cd",
      vendor: "codex",
    });
    expect(result).toBe("20260424-ab12cd-codex");
  });

  it("leaves unknown vars in place", () => {
    expect(renderPattern("{foo}/{bar}", { foo: "x" })).toBe("x/{bar}");
  });
});

describe("sanitizeModelForFilename", () => {
  it("keeps safe characters unchanged", () => {
    expect(sanitizeModelForFilename("gpt-image-2")).toBe("gpt-image-2");
    expect(sanitizeModelForFilename("gemini-2.5-flash-image")).toBe(
      "gemini-2.5-flash-image",
    );
    expect(sanitizeModelForFilename("flux")).toBe("flux");
  });

  it("strips path separators and collapses dot-runs", () => {
    expect(sanitizeModelForFilename("../../evil")).toBe("_evil");
    expect(sanitizeModelForFilename("/etc/passwd")).toBe("_etc_passwd");
    expect(sanitizeModelForFilename("a/b\\c")).toBe("a_b_c");
  });

  it("collapses runs of replacement underscores", () => {
    expect(sanitizeModelForFilename("a///b")).toBe("a_b");
    expect(sanitizeModelForFilename(";rm -rf")).toBe("_rm_-rf");
  });

  it("never allows '..' in output", () => {
    for (const evil of [
      "..",
      "...",
      "....",
      "a..b",
      "a...b",
      "../model/..",
      ".a.b.",
    ]) {
      expect(sanitizeModelForFilename(evil)).not.toContain("..");
    }
  });

  it("falls back to 'model' for empty or all-invalid input", () => {
    expect(sanitizeModelForFilename("")).toBe("model");
    expect(sanitizeModelForFilename("!@#$%^&*")).toBe("_");
  });
});

describe("buildOutputFilename", () => {
  it("single-image filename includes vendor, sanitized model, and runShortid", () => {
    expect(
      buildOutputFilename({
        vendor: "codex",
        model: "gpt-image-2",
        runShortid: "ab12cd",
        total: 1,
        ext: "png",
      }),
    ).toBe("codex-gpt-image-2-ab12cd.png");
  });

  it("multi-image filename appends 1-based index", () => {
    const name = buildOutputFilename({
      vendor: "gemini",
      model: "gemini-2.5-flash-image",
      runShortid: "xy9ef0",
      index: 0,
      total: 3,
      ext: "png",
    });
    expect(name).toBe("gemini-gemini-2.5-flash-image-xy9ef0-1.png");
  });

  it("sanitizes malicious model names", () => {
    const name = buildOutputFilename({
      vendor: "codex",
      model: "../../../etc/passwd",
      runShortid: "ab12cd",
      total: 1,
      ext: "png",
    });
    expect(name).not.toContain("..");
    expect(name).not.toContain("/");
    expect(name).not.toContain("\\");
    expect(name).toMatch(/^codex-[\w.-]+-ab12cd\.png$/);
  });

  it("different runShortid produces different filenames for same model", () => {
    const a = buildOutputFilename({
      vendor: "codex",
      model: "gpt-image-2",
      runShortid: "aaa111",
      total: 1,
      ext: "png",
    });
    const b = buildOutputFilename({
      vendor: "codex",
      model: "gpt-image-2",
      runShortid: "bbb222",
      total: 1,
      ext: "png",
    });
    expect(a).not.toBe(b);
  });
});
