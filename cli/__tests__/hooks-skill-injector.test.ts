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
  parseExplicitSlash,
  parseSkillFrontmatter,
  findClaudeSlashSkill,
  formatClaudeSlashSkillContext,
  run,
} = await import("../../.agents/hooks/core/skill-injector.ts");

const { normalizePromptInput } = await import(
  "../../.agents/hooks/core/prompt-input.ts"
);

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
      expect(pat?.test("I want to search docs today")).toBe(true);
      expect(pat?.test("researchdocs")).toBe(false);
    });

    it("drops word boundaries for CJK locale", () => {
      const [pat] = buildTriggerPatterns(["번역해줘"], "ko", [
        "ko",
        "ja",
        "zh",
      ]);
      expect(pat?.test("이거 번역해줘요")).toBe(true);
    });

    it("drops word boundaries for non-ASCII triggers even in en locale", () => {
      const [pat] = buildTriggerPatterns(["翻訳"], "en", ["ko", "ja", "zh"]);
      expect(pat?.test("早く翻訳してほしい")).toBe(true);
    });

    it("is case-insensitive", () => {
      const [pat] = buildTriggerPatterns(["React Component"], "en", []);
      expect(pat?.test("build a react component")).toBe(true);
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
      expect(matches[0]?.name).toBe("oma-search");
      expect(matches[0]?.score).toBe(20);
      expect(matches[0]?.matchedTriggers).toEqual([
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
      expect(matches[0]?.matchedTriggers).toContain("번역해줘");
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
      const [first, second] = matches;
      if (!first || !second) throw new Error("expected two matches");
      expect(first.score).toBeGreaterThan(second.score);
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
      expect(nextState.sessions["sess-1"]?.injected).toHaveLength(2);
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
        (p: string) => {
          const norm = p.replace(/\\/g, "/");
          return (
            norm.endsWith("/skills") ||
            norm.endsWith("/oma-search/SKILL.md") ||
            norm.endsWith("/oma-translator/SKILL.md")
          );
        },
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

  describe("parseExplicitSlash", () => {
    it("extracts a leading slash command name", () => {
      expect(parseExplicitSlash("/ralph")).toBe("ralph");
      expect(parseExplicitSlash("  /oma-image generate cat")).toBe("oma-image");
    });

    it("extracts a slash command after whitespace anywhere in the prompt", () => {
      expect(parseExplicitSlash("플랜 B까지 하세요 /ralph")).toBe("ralph");
      expect(parseExplicitSlash("run /loop /foo")).toBe("loop");
    });

    it("ignores slashes in URLs and paths", () => {
      expect(parseExplicitSlash("see https://example.com/foo")).toBe(null);
      expect(parseExplicitSlash("path/to/file")).toBe(null);
    });

    it("returns null when no slash command is present", () => {
      expect(parseExplicitSlash("just regular text")).toBe(null);
      expect(parseExplicitSlash("")).toBe(null);
    });

    it("requires a name to start with a letter", () => {
      expect(parseExplicitSlash("/123abc")).toBe(null);
    });
  });

  describe("parseSkillFrontmatter", () => {
    it("parses scalar values, booleans, and quotes", () => {
      const content = [
        "---",
        "name: ralph",
        "description: Ralph loop",
        "disable-model-invocation: true",
        'aliases: "r"',
        "---",
        "",
        "# /ralph",
        "Body text.",
      ].join("\n");
      const { frontmatter, body } = parseSkillFrontmatter(content);
      expect(frontmatter.name).toBe("ralph");
      expect(frontmatter["disable-model-invocation"]).toBe(true);
      expect(frontmatter.aliases).toBe("r");
      expect(body.trim().startsWith("# /ralph")).toBe(true);
    });

    it("returns the whole content as body when no frontmatter", () => {
      const { frontmatter, body } = parseSkillFrontmatter("just body");
      expect(frontmatter).toEqual({});
      expect(body).toBe("just body");
    });
  });

  describe("findClaudeSlashSkill", () => {
    it("returns the skill when .claude/skills has disable-model-invocation: true", () => {
      const skillContent = [
        "---",
        "name: ralph",
        "disable-model-invocation: true",
        "---",
        "",
        "# /ralph",
        "Read and follow `.agents/workflows/ralph.md`.",
      ].join("\n");

      (fs.existsSync as unknown as ReturnType<typeof vi.fn>).mockImplementation(
        (p: string) =>
          p.replace(/\\/g, "/").endsWith("/.claude/skills/ralph/SKILL.md"),
      );
      (fs.readFileSync as unknown as ReturnType<typeof vi.fn>).mockReturnValue(
        skillContent,
      );

      const entry = findClaudeSlashSkill("ralph", "/repo");
      expect(entry).not.toBe(null);
      expect(entry?.name).toBe("ralph");
      expect(entry?.skillRelPath).toContain(".claude/skills/ralph/SKILL.md");
      expect(entry?.body).toContain("Read and follow");
    });

    it("returns null when frontmatter lacks disable-model-invocation", () => {
      (fs.existsSync as unknown as ReturnType<typeof vi.fn>).mockReturnValue(
        true,
      );
      (fs.readFileSync as unknown as ReturnType<typeof vi.fn>).mockReturnValue(
        "---\nname: foo\n---\n\nbody",
      );
      expect(findClaudeSlashSkill("foo", "/repo")).toBe(null);
    });

    it("returns null when SKILL.md is missing in both candidate paths", () => {
      (fs.existsSync as unknown as ReturnType<typeof vi.fn>).mockReturnValue(
        false,
      );
      expect(findClaudeSlashSkill("nope", "/repo")).toBe(null);
    });

    it("normalizes backslash paths to forward slashes (Windows)", () => {
      const skillContent =
        "---\nname: ralph\ndisable-model-invocation: true\n---\nbody";
      (fs.existsSync as unknown as ReturnType<typeof vi.fn>).mockReturnValue(
        true,
      );
      (fs.readFileSync as unknown as ReturnType<typeof vi.fn>).mockReturnValue(
        skillContent,
      );

      const entry = findClaudeSlashSkill("ralph", "C:\\repo");
      expect(entry?.skillRelPath).not.toContain("\\");
      expect(entry?.skillRelPath).toBe(".claude/skills/ralph/SKILL.md");
    });

    it("falls back to .agents/skills when .claude/skills lacks the skill", () => {
      const skillContent =
        "---\nname: shared\ndisable-model-invocation: true\n---\nshared body";
      (fs.existsSync as unknown as ReturnType<typeof vi.fn>).mockImplementation(
        (p: string) =>
          p.replace(/\\/g, "/").endsWith("/.agents/skills/shared/SKILL.md"),
      );
      (fs.readFileSync as unknown as ReturnType<typeof vi.fn>).mockReturnValue(
        skillContent,
      );

      const entry = findClaudeSlashSkill("shared", "/repo");
      expect(entry?.skillRelPath).toContain(".agents/skills/shared/SKILL.md");
    });
  });

  describe("formatClaudeSlashSkillContext", () => {
    it("emits the OMA CLAUDE SLASH SKILL INVOKED header and the SKILL.md body", () => {
      const ctx = formatClaudeSlashSkillContext({
        name: "ralph",
        skillRelPath: ".claude/skills/ralph/SKILL.md",
        body: "# /ralph\nRead and follow `.agents/workflows/ralph.md`.",
      });
      expect(ctx).toContain("[OMA CLAUDE SLASH SKILL INVOKED: ralph]");
      expect(ctx).toContain(".claude/skills/ralph/SKILL.md");
      expect(ctx).toContain("Read and follow `.agents/workflows/ralph.md`");
      expect(ctx).toContain("Do NOT respond that the skill is unavailable.");
    });
  });

  // ── FINDING 1: ContentPart[] prompt normalization (Kimi Code CLI) ──
  // skill-injector's stdin read runs the raw `prompt` through
  // normalizePromptInput before delegating to run(). A Kimi ContentPart[]
  // payload must collapse to the same string a native string payload carries,
  // so detection/injection is identical across vendors.

  describe("normalizePromptInput (ContentPart[] payloads)", () => {
    it("collapses a Kimi ContentPart[] to the equivalent string", () => {
      expect(normalizePromptInput([{ type: "text", text: "/ralph" }])).toBe(
        "/ralph",
      );
    });

    it("passes a plain string through unchanged", () => {
      expect(normalizePromptInput("/ralph")).toBe("/ralph");
    });
  });

  describe("ContentPart[] payload drives the same injection as a string", () => {
    const ctx = { vendor: "claude" as const, cwd: "/repo", sid: "sess-1" };

    it("normalized ContentPart[] and the equivalent string yield identical run() results", async () => {
      const skillContent = [
        "---",
        "name: ralph",
        "disable-model-invocation: true",
        "---",
        "",
        "# /ralph",
        "Read and follow `.agents/workflows/ralph.md`.",
      ].join("\n");
      (fs.existsSync as unknown as ReturnType<typeof vi.fn>).mockImplementation(
        (p: string) =>
          p.replace(/\\/g, "/").endsWith("/.claude/skills/ralph/SKILL.md"),
      );
      (fs.readFileSync as unknown as ReturnType<typeof vi.fn>).mockReturnValue(
        skillContent,
      );

      const viaArray = await run(
        {
          kind: "prompt",
          prompt: normalizePromptInput([{ type: "text", text: "/ralph" }]),
          cwd: "/repo",
        },
        ctx,
      );
      const viaString = await run(
        { kind: "prompt", prompt: "/ralph", cwd: "/repo" },
        ctx,
      );
      if (viaArray?.type !== "context") {
        throw new Error("expected a context result");
      }
      expect(viaArray.additionalContext).toContain(
        "[OMA CLAUDE SLASH SKILL INVOKED: ralph]",
      );
      expect(viaArray).toEqual(viaString);
    });
  });
});
