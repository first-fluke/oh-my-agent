import * as fs from "node:fs";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("node:fs", () => ({
  readFileSync: vi.fn(),
  writeFileSync: vi.fn(),
  readdirSync: vi.fn(),
  existsSync: vi.fn(),
  mkdirSync: vi.fn(),
}));

const {
  buildTriggerPatterns,
  matchSkills,
  filterFreshMatches,
  isPersistentWorkflowActive,
  formatContext,
  escapeRegex,
  startsWithSlashCommand,
  stripCodeBlocks,
  discoverSkills,
} = await import("../../.agents/hooks/core/skill-injector.ts");

describe("skill-injector", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("escapeRegex", () => {
    it("escapes regex metacharacters", () => {
      expect(escapeRegex("a.b*c")).toBe("a\\.b\\*c");
      expect(escapeRegex("(group)")).toBe("\\(group\\)");
    });
  });

  describe("buildTriggerPatterns", () => {
    it("uses word boundaries for ASCII triggers in non-CJK locale", () => {
      const [pat] = buildTriggerPatterns(["search docs"], "en", [
        "ko",
        "ja",
        "zh",
      ]);
      expect(pat.test("I want to search docs today")).toBe(true);
      expect(pat.test("researchdocs")).toBe(false);
    });

    it("drops word boundaries for CJK locale", () => {
      const [pat] = buildTriggerPatterns(["번역해줘"], "ko", [
        "ko",
        "ja",
        "zh",
      ]);
      expect(pat.test("이거 번역해줘요")).toBe(true);
    });

    it("drops word boundaries for non-ASCII triggers even in en locale", () => {
      const [pat] = buildTriggerPatterns(["翻訳"], "en", ["ko", "ja", "zh"]);
      expect(pat.test("早く翻訳してほしい")).toBe(true);
    });

    it("is case-insensitive", () => {
      const [pat] = buildTriggerPatterns(["React Component"], "en", []);
      expect(pat.test("build a react component")).toBe(true);
    });
  });

  describe("matchSkills", () => {
    const skillA = {
      name: "oma-search",
      absolutePath: "/repo/.agents/skills/oma-search/SKILL.md",
      relPath: ".agents/skills/oma-search/SKILL.md",
    };
    const skillB = {
      name: "oma-translator",
      absolutePath: "/repo/.agents/skills/oma-translator/SKILL.md",
      relPath: ".agents/skills/oma-translator/SKILL.md",
    };

    it("matches English triggers and scores by hit count", () => {
      const config = {
        skills: {
          "oma-search": {
            keywords: { en: ["search docs", "find library"] },
          },
          "oma-translator": {
            keywords: { en: ["translate strings"] },
          },
        },
      };
      const matches = matchSkills(
        "I want to search docs and find library references",
        "en",
        [skillA, skillB],
        config,
      );
      expect(matches).toHaveLength(1);
      expect(matches[0].name).toBe("oma-search");
      expect(matches[0].score).toBe(20);
      expect(matches[0].matchedTriggers).toEqual([
        "search docs",
        "find library",
      ]);
    });

    it("merges multilingual triggers from triggers.json by language", () => {
      const config = {
        skills: {
          "oma-translator": {
            keywords: {
              "*": [],
              en: [],
              ko: ["번역해줘"],
            },
          },
        },
      };
      const matches = matchSkills("이거 번역해줘 빨리", "ko", [skillB], config);
      expect(matches).toHaveLength(1);
      expect(matches[0].matchedTriggers).toContain("번역해줘");
    });

    it("returns multiple skills sorted by score desc", () => {
      const config = {
        skills: {
          "oma-search": {
            keywords: { en: ["search docs", "find library"] },
          },
          "oma-translator": {
            keywords: { en: ["translate strings"] },
          },
        },
      };
      const multiHitPrompt = "search docs translate strings find library";
      const matches = matchSkills(
        multiHitPrompt,
        "en",
        [skillA, skillB],
        config,
      );
      expect(matches.map((m) => m.name)).toEqual([
        "oma-search",
        "oma-translator",
      ]);
      expect(matches[0].score).toBeGreaterThan(matches[1].score);
    });

    it("caps results at top 3", () => {
      const manySkills = Array.from({ length: 5 }, (_, i) => ({
        name: `oma-s${i}`,
        absolutePath: `/p/oma-s${i}/SKILL.md`,
        relPath: `.agents/skills/oma-s${i}/SKILL.md`,
      }));
      const config = {
        skills: Object.fromEntries(
          manySkills.map((s, i) => [
            s.name,
            { keywords: { en: [`trigger${i}`] } },
          ]),
        ),
      };
      const prompt = "trigger0 trigger1 trigger2 trigger3 trigger4";
      const matches = matchSkills(prompt, "en", manySkills, config);
      expect(matches).toHaveLength(3);
    });

    it("returns empty when no triggers match", () => {
      const config = {
        skills: {
          "oma-search": { keywords: { en: ["search docs"] } },
        },
      };
      const matches = matchSkills(
        "totally unrelated text",
        "en",
        [skillA],
        config,
      );
      expect(matches).toEqual([]);
    });

    it("skips skills with no triggers.json entry", () => {
      const config = { skills: {} };
      const matches = matchSkills("search docs please", "en", [skillA], config);
      expect(matches).toEqual([]);
    });
  });

  describe("filterFreshMatches", () => {
    const makeMatch = (name: string) => ({
      name,
      relPath: `.agents/skills/${name}/SKILL.md`,
      score: 10,
      matchedTriggers: ["x"],
    });

    it("returns all matches on fresh session", () => {
      (fs.existsSync as unknown as ReturnType<typeof vi.fn>).mockReturnValue(
        false,
      );
      const { fresh, nextState } = filterFreshMatches(
        [makeMatch("a"), makeMatch("b")],
        "/repo",
        "sess-1",
        Date.now(),
      );
      expect(fresh).toHaveLength(2);
      expect(nextState.sessions["sess-1"].injected).toHaveLength(2);
    });

    it("filters out skills already injected in session", () => {
      const now = Date.now();
      (fs.existsSync as unknown as ReturnType<typeof vi.fn>).mockReturnValue(
        true,
      );
      (fs.readFileSync as unknown as ReturnType<typeof vi.fn>).mockReturnValue(
        JSON.stringify({
          sessions: {
            "sess-1": {
              injected: [".agents/skills/a/SKILL.md"],
              timestamp: now - 1000,
            },
          },
        }),
      );
      const { fresh } = filterFreshMatches(
        [makeMatch("a"), makeMatch("b")],
        "/repo",
        "sess-1",
        now,
      );
      expect(fresh.map((m) => m.name)).toEqual(["b"]);
    });

    it("treats expired sessions as fresh", () => {
      const now = Date.now();
      const twoHoursAgo = now - 2 * 60 * 60 * 1000;
      (fs.existsSync as unknown as ReturnType<typeof vi.fn>).mockReturnValue(
        true,
      );
      (fs.readFileSync as unknown as ReturnType<typeof vi.fn>).mockReturnValue(
        JSON.stringify({
          sessions: {
            "sess-1": {
              injected: [".agents/skills/a/SKILL.md"],
              timestamp: twoHoursAgo,
            },
          },
        }),
      );
      const { fresh } = filterFreshMatches(
        [makeMatch("a")],
        "/repo",
        "sess-1",
        now,
      );
      expect(fresh).toHaveLength(1);
    });

    it("survives corrupted state file", () => {
      (fs.existsSync as unknown as ReturnType<typeof vi.fn>).mockReturnValue(
        true,
      );
      (fs.readFileSync as unknown as ReturnType<typeof vi.fn>).mockReturnValue(
        "not json",
      );
      const { fresh } = filterFreshMatches([makeMatch("a")], "/repo", "sess-1");
      expect(fresh).toHaveLength(1);
    });
  });

  describe("isPersistentWorkflowActive", () => {
    it("returns true when a workflow state file matches session", () => {
      (fs.existsSync as unknown as ReturnType<typeof vi.fn>).mockReturnValue(
        true,
      );
      (fs.readdirSync as unknown as ReturnType<typeof vi.fn>).mockReturnValue([
        "orchestrate-state-sess-1.json",
        "skill-sessions.json",
      ]);
      expect(isPersistentWorkflowActive("/repo", "sess-1")).toBe(true);
    });

    it("returns false when only skill-sessions.json exists", () => {
      (fs.existsSync as unknown as ReturnType<typeof vi.fn>).mockReturnValue(
        true,
      );
      (fs.readdirSync as unknown as ReturnType<typeof vi.fn>).mockReturnValue([
        "skill-sessions.json",
      ]);
      expect(isPersistentWorkflowActive("/repo", "sess-1")).toBe(false);
    });

    it("returns false when state file is for a different session", () => {
      (fs.existsSync as unknown as ReturnType<typeof vi.fn>).mockReturnValue(
        true,
      );
      (fs.readdirSync as unknown as ReturnType<typeof vi.fn>).mockReturnValue([
        "orchestrate-state-other-session.json",
      ]);
      expect(isPersistentWorkflowActive("/repo", "sess-1")).toBe(false);
    });

    it("returns false when state dir missing", () => {
      (fs.existsSync as unknown as ReturnType<typeof vi.fn>).mockReturnValue(
        false,
      );
      expect(isPersistentWorkflowActive("/repo", "sess-1")).toBe(false);
    });
  });

  describe("startsWithSlashCommand", () => {
    it("detects slash commands", () => {
      expect(startsWithSlashCommand("/search query")).toBe(true);
      expect(startsWithSlashCommand("  /oma-search ")).toBe(true);
      expect(startsWithSlashCommand("not a command")).toBe(false);
      expect(startsWithSlashCommand("/")).toBe(false);
    });
  });

  describe("stripCodeBlocks", () => {
    it("removes fenced code blocks", () => {
      const input = "before\n```ts\nconst x = 1;\n```\nafter";
      expect(stripCodeBlocks(input).includes("const x")).toBe(false);
    });

    it("removes inline code and quoted strings", () => {
      const input = 'use `backtick` and "quoted" text';
      const out = stripCodeBlocks(input);
      expect(out.includes("backtick")).toBe(false);
      expect(out.includes("quoted")).toBe(false);
    });
  });

  describe("formatContext", () => {
    it("emits OMA SKILLS DETECTED header and skill list", () => {
      const ctx = formatContext([
        {
          name: "oma-search",
          relPath: ".agents/skills/oma-search/SKILL.md",
          score: 10,
          matchedTriggers: ["search docs"],
        },
      ]);
      expect(ctx).toContain("[OMA SKILLS DETECTED: oma-search]");
      expect(ctx).toContain(".agents/skills/oma-search/SKILL.md");
      expect(ctx).toContain("search docs");
    });
  });

  describe("discoverSkills", () => {
    it("derives names from directory names and skips underscore dirs", () => {
      (fs.existsSync as unknown as ReturnType<typeof vi.fn>).mockImplementation(
        (p: string) =>
          p.endsWith("/skills") ||
          p.endsWith("/oma-search/SKILL.md") ||
          p.endsWith("/oma-translator/SKILL.md"),
      );
      (fs.readdirSync as unknown as ReturnType<typeof vi.fn>).mockReturnValue([
        { name: "_shared", isDirectory: () => true },
        { name: "oma-search", isDirectory: () => true },
        { name: "oma-translator", isDirectory: () => true },
        { name: "stray.txt", isDirectory: () => false },
      ]);
      (fs.readFileSync as unknown as ReturnType<typeof vi.fn>).mockReturnValue(
        "",
      );
      const skills = discoverSkills("/repo");
      expect(skills.map((s) => s.name).sort()).toEqual([
        "oma-search",
        "oma-translator",
      ]);
    });

    it("returns empty when skills dir missing", () => {
      (fs.existsSync as unknown as ReturnType<typeof vi.fn>).mockReturnValue(
        false,
      );
      expect(discoverSkills("/repo")).toEqual([]);
    });
  });
});
