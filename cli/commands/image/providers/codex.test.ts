import { describe, expect, it } from "vitest";
import { buildInstruction } from "./codex.js";

function baseInput(): Parameters<typeof buildInstruction>[0] {
  return {
    prompt: "a red apple",
    size: "1024x1024",
    quality: "high",
    n: 1,
    model: "gpt-image-2",
    outDir: "/tmp",
    signal: new AbortController().signal,
  };
}

describe("buildInstruction", () => {
  it("does not mention references when none provided", () => {
    const out = buildInstruction(baseInput());
    expect(out).not.toContain("Reference image");
    expect(out).toContain("a red apple");
    expect(out).toContain("gpt-image-2");
  });

  it("adds a reference hint when referenceImages present", () => {
    const out = buildInstruction({
      ...baseInput(),
      referenceImages: [
        { path: "/tmp/a.png", mime: "image/png" },
        { path: "/tmp/b.jpg", mime: "image/jpeg" },
      ],
    });
    expect(out).toContain("Reference images are attached (2)");
    expect(out).toContain(
      "match their style, subject identity, or composition",
    );
  });

  it("singular reference count also rendered correctly", () => {
    const out = buildInstruction({
      ...baseInput(),
      referenceImages: [{ path: "/tmp/solo.png", mime: "image/png" }],
    });
    expect(out).toContain("Reference images are attached (1)");
  });
});
