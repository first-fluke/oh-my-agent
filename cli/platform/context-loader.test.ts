import { describe, expect, it } from "vitest";
import { COMPLEX_KEYWORDS, classifyDifficulty } from "./context-loader.js";

describe("classifyDifficulty — Simple threshold", () => {
  it("returns Simple for short description, 1 AC, 1 file", () => {
    expect(classifyDifficulty("Add a new button to the header", 1, 1)).toBe(
      "Simple",
    );
  });

  it("returns Simple at exactly 2 AC items and 1 file", () => {
    expect(classifyDifficulty("Change button color", 2, 1)).toBe("Simple");
  });

  it("returns Simple at exactly 199 chars, 1 AC, 1 file", () => {
    const desc = "a".repeat(199);
    expect(classifyDifficulty(desc, 1, 1)).toBe("Simple");
  });

  it("returns Medium when description length reaches 200 chars", () => {
    const desc = "a".repeat(200);
    // 200 chars disqualifies Simple but doesn't trigger Complex
    expect(classifyDifficulty(desc, 1, 1)).toBe("Medium");
  });

  it("returns Medium when AC count is 3 (above Simple max of 2)", () => {
    expect(classifyDifficulty("Add a field to the form", 3, 1)).toBe("Medium");
  });

  it("returns Medium when filesInScope is 2 (above Simple max of 1)", () => {
    expect(classifyDifficulty("Update validation logic", 2, 2)).toBe("Medium");
  });
});

describe("classifyDifficulty — Complex threshold", () => {
  it("returns Complex at exactly 5 AC items", () => {
    expect(classifyDifficulty("Implement feature X", 5, 1)).toBe("Complex");
  });

  it("returns Complex at exactly 3 files in scope", () => {
    expect(classifyDifficulty("Update user flow", 2, 3)).toBe("Complex");
  });

  it("returns Complex for large AC + large file count", () => {
    expect(classifyDifficulty("Big feature", 10, 10)).toBe("Complex");
  });

  it("returns Medium for 4 AC items and 2 files (below all Complex thresholds, no keywords)", () => {
    expect(classifyDifficulty("Implement search", 4, 2)).toBe("Medium");
  });
});

describe("classifyDifficulty — keyword detection", () => {
  for (const keyword of COMPLEX_KEYWORDS) {
    it(`returns Complex when description contains keyword: "${keyword}"`, () => {
      const desc = `We need to ${keyword} the authentication module`;
      expect(classifyDifficulty(desc, 1, 1)).toBe("Complex");
    });
  }

  it("is case-insensitive for keyword detection", () => {
    expect(classifyDifficulty("REFACTOR the payment flow", 1, 1)).toBe(
      "Complex",
    );
    expect(classifyDifficulty("Architecture review needed", 1, 1)).toBe(
      "Complex",
    );
  });

  it("returns Simple when no keywords and all numeric thresholds pass", () => {
    // Ensure common words don't false-positive
    expect(classifyDifficulty("Add a login button", 1, 1)).toBe("Simple");
  });
});
