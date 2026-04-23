import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  COMPLEX_KEYWORDS,
  classifyDifficulty,
  type Difficulty,
  resolveContextBundle,
} from "./context-loader.js";

// ---------------------------------------------------------------------------
// context-loader.test.ts  (RARDO v2.1 T12)
//
// Covers:
//   1. classifyDifficulty — boundary cases (Simple/Medium/Complex thresholds)
//   2. classifyDifficulty — keyword detection
//   3. resolveContextBundle — resource lists per difficulty
//   4. resolveContextBundle — skipped list invariants
//   5. resolveContextBundle — Simple bundle excludes heavy docs
//   6. resolveContextBundle — Complex bundle includes all heavy docs
//   7. resolveContextBundle — token estimation (≥20% reduction Simple vs Medium)
//   8. resolveContextBundle — graceful handling of missing files (returns 0)
//   9. ContextBundle shape — difficulty field round-trips correctly
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// 1. classifyDifficulty — boundary cases
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// 2. resolveContextBundle — resource list contents per difficulty
// ---------------------------------------------------------------------------

describe("resolveContextBundle — resource lists", () => {
  it("Simple bundle contains quality-principles.md and prompt-structure.md", () => {
    const bundle = resolveContextBundle("backend-engineer", "Simple");
    expect(
      bundle.resources.some((r) => r.includes("quality-principles.md")),
    ).toBe(true);
    expect(
      bundle.resources.some((r) => r.includes("prompt-structure.md")),
    ).toBe(true);
  });

  it("Medium bundle is a superset of Simple bundle", () => {
    const simple = resolveContextBundle("backend-engineer", "Simple");
    const medium = resolveContextBundle("backend-engineer", "Medium");
    for (const r of simple.resources) {
      expect(medium.resources).toContain(r);
    }
    expect(medium.resources.length).toBeGreaterThan(simple.resources.length);
  });

  it("Medium bundle contains clarification-protocol.md", () => {
    const bundle = resolveContextBundle("backend-engineer", "Medium");
    expect(
      bundle.resources.some((r) => r.includes("clarification-protocol.md")),
    ).toBe(true);
  });

  it("Medium bundle contains reasoning-templates.md", () => {
    const bundle = resolveContextBundle("backend-engineer", "Medium");
    expect(
      bundle.resources.some((r) => r.includes("reasoning-templates.md")),
    ).toBe(true);
  });

  it("Complex bundle is a superset of Medium bundle", () => {
    const medium = resolveContextBundle("backend-engineer", "Medium");
    const complex = resolveContextBundle("backend-engineer", "Complex");
    for (const r of medium.resources) {
      expect(complex.resources).toContain(r);
    }
    expect(complex.resources.length).toBeGreaterThan(medium.resources.length);
  });

  it("Complex bundle contains context-budget.md", () => {
    const bundle = resolveContextBundle("backend-engineer", "Complex");
    expect(bundle.resources.some((r) => r.includes("context-budget.md"))).toBe(
      true,
    );
  });

  it("Complex bundle contains common-checklist.md", () => {
    const bundle = resolveContextBundle("backend-engineer", "Complex");
    expect(
      bundle.resources.some((r) => r.includes("common-checklist.md")),
    ).toBe(true);
  });

  it("Complex bundle contains lessons-learned.md", () => {
    const bundle = resolveContextBundle("backend-engineer", "Complex");
    expect(bundle.resources.some((r) => r.includes("lessons-learned.md"))).toBe(
      true,
    );
  });

  it("Complex bundle contains error-playbook.md", () => {
    const bundle = resolveContextBundle("backend-engineer", "Complex");
    expect(bundle.resources.some((r) => r.includes("error-playbook.md"))).toBe(
      true,
    );
  });

  it("difficulty field matches the requested difficulty", () => {
    const difficulties: Difficulty[] = ["Simple", "Medium", "Complex"];
    for (const d of difficulties) {
      const bundle = resolveContextBundle("backend-engineer", d);
      expect(bundle.difficulty).toBe(d);
    }
  });
});

// ---------------------------------------------------------------------------
// 3. resolveContextBundle — Simple MUST NOT include heavy docs
// ---------------------------------------------------------------------------

describe("resolveContextBundle — Simple exclusions (AC: simple task skips heavy docs)", () => {
  it("Simple bundle does NOT include common-checklist.md", () => {
    const bundle = resolveContextBundle("backend-engineer", "Simple");
    expect(
      bundle.resources.some((r) => r.includes("common-checklist.md")),
    ).toBe(false);
  });

  it("Simple bundle does NOT include context-budget.md", () => {
    const bundle = resolveContextBundle("backend-engineer", "Simple");
    expect(bundle.resources.some((r) => r.includes("context-budget.md"))).toBe(
      false,
    );
  });

  it("Simple bundle does NOT include lessons-learned.md", () => {
    const bundle = resolveContextBundle("backend-engineer", "Simple");
    expect(bundle.resources.some((r) => r.includes("lessons-learned.md"))).toBe(
      false,
    );
  });

  it("Simple bundle does NOT include error-playbook.md", () => {
    const bundle = resolveContextBundle("backend-engineer", "Simple");
    expect(bundle.resources.some((r) => r.includes("error-playbook.md"))).toBe(
      false,
    );
  });

  it("Simple bundle does NOT include clarification-protocol.md", () => {
    const bundle = resolveContextBundle("backend-engineer", "Simple");
    expect(
      bundle.resources.some((r) => r.includes("clarification-protocol.md")),
    ).toBe(false);
  });

  it("Simple skipped list includes common-checklist.md", () => {
    const bundle = resolveContextBundle("backend-engineer", "Simple");
    expect(bundle.skipped.some((r) => r.includes("common-checklist.md"))).toBe(
      true,
    );
  });

  it("Complex skipped list is empty (nothing omitted for Complex)", () => {
    const bundle = resolveContextBundle("backend-engineer", "Complex");
    expect(bundle.skipped).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// 4. resolveContextBundle — token estimation with real files
// ---------------------------------------------------------------------------

describe("resolveContextBundle — estimatedTokens", () => {
  const cwd = "/Volumes/gahyun_ex/projects/subagent-orchestrator";

  it("Simple estimatedTokens is a non-negative integer", () => {
    const bundle = resolveContextBundle("backend-engineer", "Simple", cwd);
    expect(bundle.estimatedTokens).toBeGreaterThanOrEqual(0);
    expect(Number.isInteger(bundle.estimatedTokens)).toBe(true);
  });

  it("Medium estimatedTokens >= Simple estimatedTokens (more resources)", () => {
    const simple = resolveContextBundle("backend-engineer", "Simple", cwd);
    const medium = resolveContextBundle("backend-engineer", "Medium", cwd);
    expect(medium.estimatedTokens).toBeGreaterThanOrEqual(
      simple.estimatedTokens,
    );
  });

  it("Complex estimatedTokens >= Medium estimatedTokens (even more resources)", () => {
    const medium = resolveContextBundle("backend-engineer", "Medium", cwd);
    const complex = resolveContextBundle("backend-engineer", "Complex", cwd);
    expect(complex.estimatedTokens).toBeGreaterThanOrEqual(
      medium.estimatedTokens,
    );
  });

  it("Simple bundle estimatedTokens is at least 20% lower than Medium (AC requirement)", () => {
    const simple = resolveContextBundle("backend-engineer", "Simple", cwd);
    const medium = resolveContextBundle("backend-engineer", "Medium", cwd);

    if (medium.estimatedTokens === 0) {
      // Both bundles have no readable files — skip ratio check
      expect(simple.estimatedTokens).toBe(0);
      return;
    }

    const reductionPct =
      (medium.estimatedTokens - simple.estimatedTokens) /
      medium.estimatedTokens;
    expect(reductionPct).toBeGreaterThanOrEqual(0.2);
  });
});

// ---------------------------------------------------------------------------
// 5. resolveContextBundle — graceful handling of missing files
// ---------------------------------------------------------------------------

describe("resolveContextBundle — missing files handled gracefully", () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "ctx-loader-test-"));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it("returns 0 estimatedTokens when cwd has no resource files (no throw)", () => {
    // Empty tmpDir — no .agents/ directory at all
    expect(() => {
      const bundle = resolveContextBundle(
        "backend-engineer",
        "Complex",
        tmpDir,
      );
      expect(bundle.estimatedTokens).toBe(0);
    }).not.toThrow();
  });

  it("returns partial token count when some files exist and others don't", () => {
    // Create partial structure: only quality-principles.md present
    const coreDir = path.join(tmpDir, ".agents", "skills", "_shared", "core");
    fs.mkdirSync(coreDir, { recursive: true });
    fs.writeFileSync(
      path.join(coreDir, "quality-principles.md"),
      "word1 word2 word3 word4 word5",
    );

    const bundle = resolveContextBundle("backend-engineer", "Simple", tmpDir);
    // quality-principles.md has 5 words → ceil(5 / 0.75) = 7 tokens
    // prompt-structure.md is missing → 0 tokens
    expect(bundle.estimatedTokens).toBe(7);
  });
});

// ---------------------------------------------------------------------------
// 6. resolveContextBundle — token arithmetic correctness
// ---------------------------------------------------------------------------

describe("resolveContextBundle — token arithmetic", () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "ctx-loader-tokens-"));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  function writeResource(relPath: string, content: string): void {
    const absPath = path.join(tmpDir, relPath);
    fs.mkdirSync(path.dirname(absPath), { recursive: true });
    fs.writeFileSync(absPath, content);
  }

  it("counts tokens as ceil(wordCount / 0.75)", () => {
    // 3 words → ceil(3 / 0.75) = 4
    writeResource(
      ".agents/skills/_shared/core/quality-principles.md",
      "hello world foo",
    );
    writeResource(
      ".agents/skills/_shared/core/prompt-structure.md",
      "alpha beta",
    );
    // quality-principles: 3 words → 4 tokens
    // prompt-structure: 2 words → ceil(2/0.75) = ceil(2.66) = 3 tokens
    // total Simple: 7
    const bundle = resolveContextBundle("backend-engineer", "Simple", tmpDir);
    expect(bundle.estimatedTokens).toBe(7);
  });

  it("cumulates tokens across all resources in the bundle", () => {
    writeResource(
      ".agents/skills/_shared/core/quality-principles.md",
      "one two three", // 3 words → 4 tokens
    );
    writeResource(
      ".agents/skills/_shared/core/prompt-structure.md",
      "four five six seven", // 4 words → ceil(4/0.75)=6 tokens
    );
    const bundle = resolveContextBundle("backend-engineer", "Simple", tmpDir);
    // Total: 4 + 6 = 10
    expect(bundle.estimatedTokens).toBe(10);
  });
});
