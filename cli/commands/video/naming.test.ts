import { describe, expect, it } from "vitest";
import { slugify } from "./naming.js";
import { outputFileName } from "./types.js";

describe("slugify", () => {
  it("lowercases and dashes ASCII titles", () => {
    expect(slugify("Explain the Local Test Runner")).toBe(
      "explain-the-local-test-runner",
    );
  });

  it("keeps unicode letters (CJK titles stay readable)", () => {
    expect(slugify("제주 커피 이야기")).toBe("제주-커피-이야기");
  });

  it("collapses punctuation runs and trims edge dashes", () => {
    expect(slugify("  -- hello, world!! --  ")).toBe("hello-world");
  });

  it("caps length without leaving a trailing dash", () => {
    const long = "a ".repeat(50);
    const slug = slugify(long);
    expect(slug.length).toBeLessThanOrEqual(40);
    expect(slug.endsWith("-")).toBe(false);
  });

  it("falls back to a stable token when nothing survives", () => {
    expect(slugify("!!!")).toBe("video");
  });
});

describe("outputFileName", () => {
  it("appends the slug when present", () => {
    expect(outputFileName({ composition: "Shorts", slug: "jeju-coffee" })).toBe(
      "shorts-jeju-coffee.mp4",
    );
  });

  it("stays unslugged for legacy specs without a slug", () => {
    expect(outputFileName({ composition: "Explainer" })).toBe("explainer.mp4");
  });
});
