import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { sanitizeFrontmatterForVendor } from "./agent-composer.js";

// ---------------------------------------------------------------------------
// agent-composer.test.ts
// Tests for sanitizeFrontmatterForVendor (RARDO v2.1 T6 — R14)
//
// Covers:
//   1. claude allow-list: only permitted fields pass through
//   2. claude + effort: field dropped, R14 WARN emitted (regression for R14)
//   3. codex allow-list: only permitted fields pass through
//   4. gemini allow-list: only permitted fields pass through
//   5. antigravity allow-list: only permitted fields pass through
//   6. qwen allow-list: only permitted fields pass through
//   7. Unknown vendor: all fields pass through (no allow-list defined)
//   8. Pure function: input object is never mutated
//   9. Non-effort unknown field on claude: generic WARN emitted
//  10. Fields not in the frontmatter are simply absent from the result
// ---------------------------------------------------------------------------

describe("sanitizeFrontmatterForVendor — claude", () => {
  let warnSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("keeps all allowed claude fields and drops unsupported ones", () => {
    const input = {
      name: "backend-engineer",
      description: "Backend specialist",
      tools: "Read, Write, Bash",
      model: "sonnet",
      maxTurns: 20,
      skills: ["oma-backend"],
      memory: "project",
      permissionMode: "default",
      // unsupported fields:
      effort: "high",
      temperature: 0.5,
      kind: "agent",
    };

    const result = sanitizeFrontmatterForVendor(input, "claude");

    expect(result).toEqual({
      name: "backend-engineer",
      description: "Backend specialist",
      tools: "Read, Write, Bash",
      model: "sonnet",
      maxTurns: 20,
      skills: ["oma-backend"],
      memory: "project",
      permissionMode: "default",
    });
    expect(result).not.toHaveProperty("effort");
    expect(result).not.toHaveProperty("temperature");
    expect(result).not.toHaveProperty("kind");
  });

  it("drops 'effort' and emits R14-specific WARN for claude variant", () => {
    const input = {
      name: "backend-engineer",
      description: "Backend specialist",
      tools: "Read, Write",
      model: "sonnet",
      effort: "high",
    };

    const result = sanitizeFrontmatterForVendor(input, "claude");

    expect(result).not.toHaveProperty("effort");
    expect(warnSpy).toHaveBeenCalledOnce();
    const warnMessage = warnSpy.mock.calls[0][0] as string;
    expect(warnMessage).toContain("Dropped 'effort' from claude variant");
    expect(warnMessage).toContain("R14");
    expect(warnMessage).toContain("--effort");
  });

  it("emits generic WARN (not R14) for non-effort unsupported claude fields", () => {
    const input = {
      name: "backend-engineer",
      description: "desc",
      tools: "Read",
      model: "sonnet",
      temperature: 0.7,
    };

    sanitizeFrontmatterForVendor(input, "claude");

    expect(warnSpy).toHaveBeenCalledOnce();
    const warnMessage = warnSpy.mock.calls[0][0] as string;
    expect(warnMessage).toContain("Dropped 'temperature' from claude variant");
    expect(warnMessage).toContain("not supported by this runtime");
    expect(warnMessage).not.toContain("R14");
  });

  it("emits no WARN when all fields are in the allow-list", () => {
    const input = {
      name: "pm-planner",
      description: "PM agent",
      tools: "Read, Grep",
      model: "sonnet",
      maxTurns: 10,
    };

    const result = sanitizeFrontmatterForVendor(input, "claude");

    expect(result).toEqual(input);
    expect(warnSpy).not.toHaveBeenCalled();
  });
});

describe("sanitizeFrontmatterForVendor — codex", () => {
  let warnSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("keeps all allowed codex fields and drops unsupported ones", () => {
    const input = {
      name: "backend-engineer",
      description: "Backend specialist",
      model: "openai/o3",
      model_reasoning_effort: "high",
      sandbox_mode: "workspace-write",
      // unsupported:
      tools: "Read, Write",
      maxTurns: 20,
      effort: "high",
    };

    const result = sanitizeFrontmatterForVendor(input, "codex");

    expect(result).toEqual({
      name: "backend-engineer",
      description: "Backend specialist",
      model: "openai/o3",
      model_reasoning_effort: "high",
      sandbox_mode: "workspace-write",
    });
    expect(result).not.toHaveProperty("tools");
    expect(result).not.toHaveProperty("maxTurns");
    expect(result).not.toHaveProperty("effort");
  });

  it("warns for each dropped codex field", () => {
    const input = {
      name: "db-engineer",
      description: "DB specialist",
      model: "openai/o3",
      model_reasoning_effort: "medium",
      sandbox_mode: "workspace-write",
      tools: "Read, Bash",
      maxTurns: 15,
    };

    sanitizeFrontmatterForVendor(input, "codex");

    expect(warnSpy).toHaveBeenCalledTimes(2);
    const warnMessages = warnSpy.mock.calls.map((c) => c[0] as string);
    expect(warnMessages.some((m) => m.includes("'tools'"))).toBe(true);
    expect(warnMessages.some((m) => m.includes("'maxTurns'"))).toBe(true);
    expect(warnMessages.every((m) => m.includes("codex variant"))).toBe(true);
  });
});

describe("sanitizeFrontmatterForVendor — gemini", () => {
  let warnSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("keeps all allowed gemini fields and drops unsupported ones", () => {
    const input = {
      name: "backend-engineer",
      description: "Backend specialist",
      tools: "read_file, write_file",
      model: "gemini-2.5-pro",
      max_turns: 20,
      timeout_mins: 30,
      kind: "agent",
      // unsupported:
      effort: "high",
      maxTurns: 20,
      skills: ["oma-backend"],
    };

    const result = sanitizeFrontmatterForVendor(input, "gemini");

    expect(result).toEqual({
      name: "backend-engineer",
      description: "Backend specialist",
      tools: "read_file, write_file",
      model: "gemini-2.5-pro",
      max_turns: 20,
      timeout_mins: 30,
      kind: "agent",
    });
    expect(result).not.toHaveProperty("effort");
    expect(result).not.toHaveProperty("maxTurns");
    expect(result).not.toHaveProperty("skills");
  });

  it("warns for each dropped gemini field", () => {
    const input = {
      name: "db-engineer",
      description: "DB specialist",
      model: "gemini-2.5-flash",
      max_turns: 15,
      effort: "medium",
      maxTurns: 15,
    };

    sanitizeFrontmatterForVendor(input, "gemini");

    expect(warnSpy).toHaveBeenCalledTimes(2);
    const warnMessages = warnSpy.mock.calls.map((c) => c[0] as string);
    expect(warnMessages.every((m) => m.includes("gemini variant"))).toBe(true);
  });
});

describe("sanitizeFrontmatterForVendor — antigravity", () => {
  let warnSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("keeps only name, description, model and drops everything else", () => {
    const input = {
      name: "backend-engineer",
      description: "Backend specialist",
      model: "antigravity/flux-1",
      tools: "read_file, write_file",
      maxTurns: 20,
      effort: "high",
      thinking: true,
    };

    const result = sanitizeFrontmatterForVendor(input, "antigravity");

    expect(result).toEqual({
      name: "backend-engineer",
      description: "Backend specialist",
      model: "antigravity/flux-1",
    });
    expect(warnSpy).toHaveBeenCalledTimes(4);
    const warnMessages = warnSpy.mock.calls.map((c) => c[0] as string);
    expect(warnMessages.every((m) => m.includes("antigravity variant"))).toBe(
      true,
    );
  });
});

describe("sanitizeFrontmatterForVendor — qwen", () => {
  let warnSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("keeps name, description, model, thinking and drops unsupported fields", () => {
    const input = {
      name: "backend-engineer",
      description: "Backend specialist",
      model: "qwen/qwen3-coder-plus",
      thinking: true,
      // unsupported:
      tools: "read_file",
      effort: "medium",
      maxTurns: 20,
    };

    const result = sanitizeFrontmatterForVendor(input, "qwen");

    expect(result).toEqual({
      name: "backend-engineer",
      description: "Backend specialist",
      model: "qwen/qwen3-coder-plus",
      thinking: true,
    });
    expect(warnSpy).toHaveBeenCalledTimes(3);
    const warnMessages = warnSpy.mock.calls.map((c) => c[0] as string);
    expect(warnMessages.every((m) => m.includes("qwen variant"))).toBe(true);
  });
});

describe("sanitizeFrontmatterForVendor — unknown vendor", () => {
  it("passes all fields through unchanged for an unknown vendor", () => {
    const input = {
      name: "backend-engineer",
      description: "Backend specialist",
      model: "unknown/model",
      effort: "high",
      tools: "read",
    };

    const result = sanitizeFrontmatterForVendor(input, "unknown-vendor");

    expect(result).toEqual(input);
  });
});

describe("sanitizeFrontmatterForVendor — immutability", () => {
  it("does not mutate the input frontmatter object", () => {
    const input = {
      name: "backend-engineer",
      description: "desc",
      tools: "Read",
      model: "sonnet",
      effort: "high",
      temperature: 0.5,
    };
    const inputCopy = { ...input };

    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    sanitizeFrontmatterForVendor(input, "claude");
    warnSpy.mockRestore();

    // Input must be unchanged
    expect(input).toEqual(inputCopy);
  });

  it("returns a new object even when no fields are dropped", () => {
    const input = {
      name: "backend-engineer",
      description: "desc",
      tools: "Read",
      model: "sonnet",
    };

    const result = sanitizeFrontmatterForVendor(input, "claude");

    expect(result).toEqual(input);
    expect(result).not.toBe(input); // different reference
  });
});

// ---------------------------------------------------------------------------
// Edge cases — defensive inputs (QA MEDIUM-3)
// ---------------------------------------------------------------------------

describe("sanitizeFrontmatterForVendor — edge cases", () => {
  let warnSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("handles empty frontmatter object without throwing", () => {
    const result = sanitizeFrontmatterForVendor({}, "claude");
    expect(result).toEqual({});
    expect(warnSpy).not.toHaveBeenCalled();
  });

  it("preserves null values on allowed fields (per-vendor contract)", () => {
    const input = { name: "x", description: null, model: null };
    const result = sanitizeFrontmatterForVendor(input, "claude");
    // Allowed fields stay; nulls are the caller's concern, not the sanitizer's.
    expect(result).toEqual({ name: "x", description: null, model: null });
  });

  it("drops null values on disallowed fields with WARN", () => {
    const input = { name: "x", effort: null };
    const result = sanitizeFrontmatterForVendor(input, "claude");
    expect(result).toEqual({ name: "x" });
    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining("R14"));
  });

  it("handles array values on allowed fields", () => {
    const input = { name: "x", tools: ["Read", "Write"] };
    const result = sanitizeFrontmatterForVendor(input, "claude");
    expect(result).toEqual({ name: "x", tools: ["Read", "Write"] });
  });
});
