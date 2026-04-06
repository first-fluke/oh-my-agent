import * as fs from "node:fs";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("node:fs", () => ({
  existsSync: vi.fn(),
  mkdirSync: vi.fn(),
  readFileSync: vi.fn(),
  writeFileSync: vi.fn(),
  unlinkSync: vi.fn(),
  readdirSync: vi.fn(),
}));

const {
  escapeRegex,
  buildPatterns,
  isInformationalContext,
  stripCodeBlocks,
  startsWithSlashCommand,
  isDeactivationRequest,
  deactivateAllPersistentModes,
  DEACTIVATION_PHRASES,
  detectExtensions,
  resolveAgentFromExtensions,
} = await import("../../.claude/hooks/keyword-detector.ts");

describe("keyword-detector", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("escapeRegex", () => {
    it("should escape special regex characters", () => {
      expect(escapeRegex("foo.bar")).toBe("foo\\.bar");
      expect(escapeRegex("a+b*c?")).toBe("a\\+b\\*c\\?");
      expect(escapeRegex("(test)")).toBe("\\(test\\)");
      expect(escapeRegex("[abc]")).toBe("\\[abc\\]");
    });

    it("should not modify plain strings", () => {
      expect(escapeRegex("hello")).toBe("hello");
      expect(escapeRegex("workflow done")).toBe("workflow done");
    });
  });

  describe("buildPatterns", () => {
    it("should combine wildcard and language-specific keywords", () => {
      const keywords = {
        "*": ["orchestrate"],
        en: ["parallel"],
        ko: ["병렬 실행"],
      };
      const patterns = buildPatterns(keywords, "ko", ["ko", "ja", "zh"]);
      // Should include *, en, and ko keywords
      expect(patterns).toHaveLength(3);
    });

    it("should use word boundaries for non-CJK languages", () => {
      const keywords = { "*": ["debug"], en: ["fix bug"] };
      const patterns = buildPatterns(keywords, "en", ["ko", "ja", "zh"]);
      expect(patterns[0]?.source).toContain("\\b");
    });

    it("should not use word boundaries for CJK languages", () => {
      const keywords = { ko: ["디버그"] };
      const patterns = buildPatterns(keywords, "ko", ["ko", "ja", "zh"]);
      expect(patterns[0]?.source).not.toContain("\\b");
    });

    it("should return empty array when no keywords match language", () => {
      const keywords = { fr: ["débogueur"] };
      const patterns = buildPatterns(keywords, "en", ["ko"]);
      expect(patterns).toHaveLength(0);
    });
  });

  describe("isInformationalContext", () => {
    const infoPatterns = [/\bwhat is\b/i, /\bexplain\b/i];

    it("should detect informational patterns near match", () => {
      const prompt = "what is orchestrate";
      expect(isInformationalContext(prompt, 8, infoPatterns)).toBe(true);
    });

    it("should not flag action prompts", () => {
      const prompt = "orchestrate the deployment";
      expect(isInformationalContext(prompt, 0, infoPatterns)).toBe(false);
    });

    it("should not flag requests ending with question mark", () => {
      const prompt = "can you orchestrate the deployment?";
      expect(isInformationalContext(prompt, 12, infoPatterns)).toBe(false);
    });

    it("should detect meta-discussion with 'keyword' near match", () => {
      const metaPatterns = [/\bkeyword\b/i, /키워드/i];
      const prompt = "keyword-detector가 orchestrate 키워드를 감지";
      const matchIndex = prompt.indexOf("orchestrate");
      expect(isInformationalContext(prompt, matchIndex, metaPatterns)).toBe(
        true,
      );
    });

    it("should detect meta-discussion with 'false positive' near match", () => {
      const metaPatterns = [/\bfalse positive\b/i];
      const prompt = "orchestrate false positive issue";
      expect(isInformationalContext(prompt, 0, metaPatterns)).toBe(true);
    });

    it("should not flag when meta terms are far from match", () => {
      const metaPatterns = [/\bkeyword\b/i];
      const padding = "x".repeat(200);
      const prompt = `keyword issue ${padding} orchestrate the deploy`;
      const matchIndex = prompt.indexOf("orchestrate");
      expect(isInformationalContext(prompt, matchIndex, metaPatterns)).toBe(
        false,
      );
    });
  });

  describe("stripCodeBlocks", () => {
    it("should remove fenced code blocks", () => {
      const text = "before ```code here``` after";
      expect(stripCodeBlocks(text)).toBe("before  after");
    });

    it("should remove inline code", () => {
      const text = "run `orchestrate` command";
      expect(stripCodeBlocks(text)).toBe("run  command");
    });

    it("should handle multiline code blocks", () => {
      const text = "before\n```\nconst x = 1;\n```\nafter";
      expect(stripCodeBlocks(text)).toBe("before\n\nafter");
    });

    it("should remove double-quoted strings", () => {
      const text = 'detected "orchestrate" keyword';
      expect(stripCodeBlocks(text)).toBe("detected  keyword");
    });

    it("should not strip across newlines", () => {
      const text = 'first "line\nsecond" line';
      expect(stripCodeBlocks(text)).toBe('first "line\nsecond" line');
    });
  });

  describe("startsWithSlashCommand", () => {
    it("should detect slash commands", () => {
      expect(startsWithSlashCommand("/orchestrate")).toBe(true);
      expect(startsWithSlashCommand("/commit")).toBe(true);
      expect(startsWithSlashCommand("  /debug something")).toBe(true);
    });

    it("should not match non-commands", () => {
      expect(startsWithSlashCommand("run orchestrate")).toBe(false);
      expect(startsWithSlashCommand("// comment")).toBe(false);
      expect(startsWithSlashCommand("")).toBe(false);
    });
  });

  describe("isDeactivationRequest", () => {
    it("should detect English deactivation phrases", () => {
      expect(isDeactivationRequest("workflow done", "en")).toBe(true);
      expect(isDeactivationRequest("workflow complete", "en")).toBe(true);
      expect(isDeactivationRequest("workflow finished", "en")).toBe(true);
    });

    it("should detect Korean deactivation phrases", () => {
      expect(isDeactivationRequest("워크플로우 완료", "ko")).toBe(true);
      expect(isDeactivationRequest("워크플로우 종료", "ko")).toBe(true);
      expect(isDeactivationRequest("워크플로우 끝", "ko")).toBe(true);
    });

    it("should detect Japanese deactivation phrases", () => {
      expect(isDeactivationRequest("ワークフロー完了", "ja")).toBe(true);
      expect(isDeactivationRequest("ワークフロー終了", "ja")).toBe(true);
    });

    it("should detect Chinese deactivation phrases", () => {
      expect(isDeactivationRequest("工作流完成", "zh")).toBe(true);
      expect(isDeactivationRequest("工作流结束", "zh")).toBe(true);
    });

    it("should be case insensitive", () => {
      expect(isDeactivationRequest("Workflow Done", "en")).toBe(true);
      expect(isDeactivationRequest("WORKFLOW DONE", "en")).toBe(true);
    });

    it("should match phrases within longer messages", () => {
      expect(
        isDeactivationRequest("모든 작업이 끝났으니 워크플로우 완료", "ko"),
      ).toBe(true);
      expect(
        isDeactivationRequest("I think we're done. workflow done.", "en"),
      ).toBe(true);
    });

    it("should not match unrelated prompts", () => {
      expect(isDeactivationRequest("run the workflow", "en")).toBe(false);
      expect(isDeactivationRequest("워크플로우 실행", "ko")).toBe(false);
      expect(isDeactivationRequest("hello world", "en")).toBe(false);
    });

    it("should always include English phrases regardless of language", () => {
      expect(isDeactivationRequest("workflow done", "ko")).toBe(true);
      expect(isDeactivationRequest("workflow done", "ja")).toBe(true);
      expect(isDeactivationRequest("workflow done", "zh")).toBe(true);
    });
  });

  describe("deactivateAllPersistentModes", () => {
    it("should delete session-scoped state files matching sessionId", () => {
      (fs.existsSync as unknown as ReturnType<typeof vi.fn>).mockReturnValue(
        true,
      );
      (fs.readdirSync as unknown as ReturnType<typeof vi.fn>).mockReturnValue([
        "orchestrate-state-sess1.json",
        "ralph-state-sess1.json",
        "work-state-sess2.json",
      ]);

      deactivateAllPersistentModes("/tmp/project", "sess1");

      expect(fs.unlinkSync).toHaveBeenCalledTimes(2);
      expect(fs.unlinkSync).toHaveBeenCalledWith(
        join(
          "/tmp/project",
          ".agents",
          "state",
          "orchestrate-state-sess1.json",
        ),
      );
      expect(fs.unlinkSync).toHaveBeenCalledWith(
        join("/tmp/project", ".agents", "state", "ralph-state-sess1.json"),
      );
    });

    it("should delete all state files when no sessionId provided", () => {
      (fs.existsSync as unknown as ReturnType<typeof vi.fn>).mockReturnValue(
        true,
      );
      (fs.readdirSync as unknown as ReturnType<typeof vi.fn>).mockReturnValue([
        "orchestrate-state-sess1.json",
        "ralph-state-sess2.json",
        "other-file.txt",
      ]);

      deactivateAllPersistentModes("/tmp/project");

      expect(fs.unlinkSync).toHaveBeenCalledTimes(2);
      expect(fs.unlinkSync).toHaveBeenCalledWith(
        join(
          "/tmp/project",
          ".agents",
          "state",
          "orchestrate-state-sess1.json",
        ),
      );
      expect(fs.unlinkSync).toHaveBeenCalledWith(
        join("/tmp/project", ".agents", "state", "ralph-state-sess2.json"),
      );
    });

    it("should skip non-state files", () => {
      (fs.existsSync as unknown as ReturnType<typeof vi.fn>).mockReturnValue(
        true,
      );
      (fs.readdirSync as unknown as ReturnType<typeof vi.fn>).mockReturnValue([
        "orchestrate-state-sess1.json",
        "other-file.txt",
        ".gitkeep",
      ]);

      deactivateAllPersistentModes("/tmp/project", "sess1");

      expect(fs.unlinkSync).toHaveBeenCalledTimes(1);
      expect(fs.unlinkSync).toHaveBeenCalledWith(
        join(
          "/tmp/project",
          ".agents",
          "state",
          "orchestrate-state-sess1.json",
        ),
      );
    });

    it("should do nothing if state directory does not exist", () => {
      (fs.existsSync as unknown as ReturnType<typeof vi.fn>).mockReturnValue(
        false,
      );

      deactivateAllPersistentModes("/tmp/project", "sess1");

      expect(fs.readdirSync).not.toHaveBeenCalled();
      expect(fs.unlinkSync).not.toHaveBeenCalled();
    });

    it("should handle errors gracefully", () => {
      (fs.existsSync as unknown as ReturnType<typeof vi.fn>).mockReturnValue(
        true,
      );
      (
        fs.readdirSync as unknown as ReturnType<typeof vi.fn>
      ).mockImplementation(() => {
        throw new Error("permission denied");
      });

      expect(() => deactivateAllPersistentModes("/tmp/project")).not.toThrow();
    });
  });

  describe("detectExtensions", () => {
    it("should detect standalone extensions", () => {
      expect(detectExtensions("fix the .tsx file")).toEqual(["tsx"]);
    });

    it("should detect extensions in filenames", () => {
      expect(detectExtensions("fix Button.tsx")).toEqual(["tsx"]);
    });

    it("should detect extensions in full paths", () => {
      expect(detectExtensions("fix src/components/Button.tsx")).toEqual([
        "tsx",
      ]);
    });

    it("should detect multiple extensions", () => {
      const result = detectExtensions("fix Button.tsx and styles.css");
      expect(result).toContain("tsx");
      expect(result).toContain("css");
    });

    it("should deduplicate extensions", () => {
      expect(detectExtensions("fix A.tsx and B.tsx")).toEqual(["tsx"]);
    });

    it("should exclude common non-code extensions", () => {
      expect(detectExtensions("see README.md and config.json")).toEqual([]);
    });

    it("should be case-insensitive", () => {
      expect(detectExtensions("fix Component.TSX")).toEqual(["tsx"]);
    });

    it("should return empty for no extensions", () => {
      expect(detectExtensions("fix the bug in the login page")).toEqual([]);
    });

    it("should detect compound extensions like .controller.ts", () => {
      const result = detectExtensions("fix user.controller.ts");
      expect(result).toContain("controller");
      expect(result).toContain("ts");
    });
  });

  describe("resolveAgentFromExtensions", () => {
    const routing = {
      "frontend-engineer": ["tsx", "jsx", "css", "scss"],
      "backend-engineer": ["go", "py", "java", "rs", "controller", "service"],
      "db-engineer": ["sql", "prisma", "graphql"],
      "mobile-engineer": ["dart", "swift", "kt"],
      designer: ["figma", "sketch", "svg"],
    };

    it("should resolve single frontend extension", () => {
      expect(resolveAgentFromExtensions(["tsx"], routing)).toBe(
        "frontend-engineer",
      );
    });

    it("should resolve single backend extension", () => {
      expect(resolveAgentFromExtensions(["go"], routing)).toBe(
        "backend-engineer",
      );
    });

    it("should resolve by highest score when mixed", () => {
      expect(resolveAgentFromExtensions(["tsx", "css", "go"], routing)).toBe(
        "frontend-engineer",
      );
    });

    it("should return null for empty extensions", () => {
      expect(resolveAgentFromExtensions([], routing)).toBeNull();
    });

    it("should return null for unrecognized extensions", () => {
      expect(resolveAgentFromExtensions(["xyz", "abc"], routing)).toBeNull();
    });

    it("should resolve db extensions correctly", () => {
      expect(resolveAgentFromExtensions(["sql"], routing)).toBe("db-engineer");
    });

    it("should resolve mobile extensions correctly", () => {
      expect(resolveAgentFromExtensions(["dart", "swift"], routing)).toBe(
        "mobile-engineer",
      );
    });

    it("should resolve compound extension to backend", () => {
      expect(resolveAgentFromExtensions(["controller", "ts"], routing)).toBe(
        "backend-engineer",
      );
    });
  });

  describe("DEACTIVATION_PHRASES", () => {
    it("should have English phrases", () => {
      expect(DEACTIVATION_PHRASES.en).toBeDefined();
      expect(DEACTIVATION_PHRASES.en?.length).toBeGreaterThan(0);
    });

    it("should have Korean phrases", () => {
      expect(DEACTIVATION_PHRASES.ko).toBeDefined();
      expect(DEACTIVATION_PHRASES.ko?.length).toBeGreaterThan(0);
    });

    it("should cover all supported languages", () => {
      const expectedLangs = [
        "en",
        "ko",
        "ja",
        "zh",
        "es",
        "fr",
        "de",
        "pt",
        "ru",
        "nl",
        "pl",
      ];
      for (const lang of expectedLangs) {
        expect(DEACTIVATION_PHRASES[lang]).toBeDefined();
        expect(DEACTIVATION_PHRASES[lang]?.length).toBeGreaterThan(0);
      }
    });
  });
});
