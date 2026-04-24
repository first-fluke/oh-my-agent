import { describe, expect, it } from "vitest";
import type { GenerateInput } from "../types.js";
import { buildCodexExecArgs, buildInstruction } from "./codex.js";

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

function bareInput(): GenerateInput {
  return {
    prompt: "a red apple",
    size: "1024x1024",
    quality: "high",
    n: 1,
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

describe("buildCodexExecArgs", () => {
  it("always emits -- separator before instruction (no references)", () => {
    const args = buildCodexExecArgs(bareInput(), "some instruction");
    expect(args).toEqual([
      "exec",
      "--skip-git-repo-check",
      "--",
      "some instruction",
    ]);
    const dashIdx = args.indexOf("--");
    const instrIdx = args.indexOf("some instruction");
    expect(dashIdx).toBeGreaterThanOrEqual(0);
    expect(dashIdx).toBe(instrIdx - 1);
  });

  it("emits -i per reference and still terminates with -- before instruction", () => {
    const args = buildCodexExecArgs(
      {
        ...bareInput(),
        referenceImages: [
          { path: "/tmp/a.png", mime: "image/png" },
          { path: "/tmp/b.jpg", mime: "image/jpeg" },
        ],
      },
      "prompt text",
    );
    expect(args).toEqual([
      "exec",
      "--skip-git-repo-check",
      "-i",
      "/tmp/a.png",
      "-i",
      "/tmp/b.jpg",
      "--",
      "prompt text",
    ]);
  });

  it("-- is always the arg immediately before the instruction", () => {
    // Regression guard: variadic -i would otherwise consume the prompt.
    for (const refs of [
      [],
      [{ path: "/a.png", mime: "image/png" as const }],
      [
        { path: "/a.png", mime: "image/png" as const },
        { path: "/b.png", mime: "image/png" as const },
        { path: "/c.png", mime: "image/png" as const },
      ],
    ]) {
      const args = buildCodexExecArgs(
        { ...bareInput(), referenceImages: refs },
        "PROMPT",
      );
      expect(args[args.length - 2]).toBe("--");
      expect(args[args.length - 1]).toBe("PROMPT");
    }
  });
});
