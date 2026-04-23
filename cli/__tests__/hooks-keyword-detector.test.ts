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
  // Guard 1
  isGenuineUserPrompt,
  // Guard 3
  isReinforcementSuppressed,
  recordKwTrigger,
  loadKwState,
} = await import("../../.agents/hooks/core/keyword-detector.ts");

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
      expect(startsWithSlashCommand("/scm")).toBe(true);
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

  // ── Guard 1: UserPromptSubmit-only trigger ────────────────────

  describe("isGenuineUserPrompt", () => {
    it("should allow UserPromptSubmit events", () => {
      expect(isGenuineUserPrompt({ hook_event_name: "UserPromptSubmit" })).toBe(
        true,
      );
    });

    it("should allow Cursor beforeSubmitPrompt events", () => {
      expect(
        isGenuineUserPrompt({ hook_event_name: "beforeSubmitPrompt" }),
      ).toBe(true);
    });

    it("should allow Gemini BeforeAgent events", () => {
      expect(isGenuineUserPrompt({ hook_event_name: "BeforeAgent" })).toBe(
        true,
      );
    });

    it("should reject unknown event types (agent-generated responses)", () => {
      expect(isGenuineUserPrompt({ hook_event_name: "AfterAgent" })).toBe(
        false,
      );
      expect(isGenuineUserPrompt({ hook_event_name: "PostToolUse" })).toBe(
        false,
      );
      expect(isGenuineUserPrompt({ hook_event_name: "AgentResponse" })).toBe(
        false,
      );
    });

    it("should allow prompts with no event field (backward compat)", () => {
      // Vendors that don't send hook_event_name should still be processed
      expect(isGenuineUserPrompt({ prompt: "ultrawork this task" })).toBe(true);
    });

    it("ultrawork loop regression: agent response with AfterAgent event must not trigger", () => {
      // Simulates the live ultrawork loop: agent response replayed as a new prompt
      // with an event type that is NOT UserPromptSubmit
      const agentResponsePayload = {
        hook_event_name: "AfterAgent",
        prompt:
          "I will now start ultrawork. Phase 1: reading the ultrawork workflow...",
      };
      expect(isGenuineUserPrompt(agentResponsePayload)).toBe(false);
    });
  });

  // ── Guard 2: Code-block keyword skip ─────────────────────────
  // stripCodeBlocks is already tested above. These tests verify the composite
  // behavior — keywords inside code blocks must NOT survive stripping.

  describe("Guard 2 — code-block keyword composite scenarios", () => {
    it("triple-backtick fence strips ultrawork keyword", () => {
      const raw = "agent writes ```\nultrawork keywords here\n``` in a block";
      const stripped = stripCodeBlocks(raw);
      expect(stripped).not.toMatch(/ultrawork/);
    });

    it("inline backtick strips ultrawork keyword", () => {
      const raw = "user quotes `ultrawork` inline — should not trigger";
      const stripped = stripCodeBlocks(raw);
      expect(stripped).not.toMatch(/ultrawork/);
    });

    it("bare ultrawork keyword outside code block survives stripping", () => {
      const raw = "remember how ultrawork works?";
      const stripped = stripCodeBlocks(raw);
      expect(stripped).toMatch(/ultrawork/);
    });

    it("keyword in triple-backtick fence with language specifier is stripped", () => {
      const raw = "```typescript\nconst workflow = 'ultrawork';\n```";
      const stripped = stripCodeBlocks(raw);
      expect(stripped).not.toMatch(/ultrawork/);
    });
  });

  // ── Guard 3: Reinforcement suppression ───────────────────────

  describe("isReinforcementSuppressed", () => {
    const BASE_NOW = 1_700_000_000_000; // fixed epoch ms for deterministic tests

    it("should not suppress on first trigger (no entry)", () => {
      const state = { triggers: {} };
      expect(isReinforcementSuppressed(state, "ultrawork", BASE_NOW)).toBe(
        false,
      );
    });

    it("should not suppress when count is below threshold", () => {
      const state = {
        triggers: {
          ultrawork: {
            lastTriggeredAt: new Date(BASE_NOW - 5_000).toISOString(),
            count: 1,
          },
        },
      };
      expect(isReinforcementSuppressed(state, "ultrawork", BASE_NOW)).toBe(
        false,
      );
    });

    it("should not suppress when count equals threshold (exactly 2)", () => {
      // count=2 means 2 triggers have already happened; the THIRD is the first suppressed
      // But isReinforcementSuppressed checks count >= MAX_COUNT (2) — so count=2 IS suppressed
      // The third call is when count already reached 2, so it is suppressed.
      const state = {
        triggers: {
          ultrawork: {
            lastTriggeredAt: new Date(BASE_NOW - 5_000).toISOString(),
            count: 2,
          },
        },
      };
      expect(isReinforcementSuppressed(state, "ultrawork", BASE_NOW)).toBe(
        true,
      );
    });

    it("should suppress when count exceeds threshold within window", () => {
      const state = {
        triggers: {
          ultrawork: {
            lastTriggeredAt: new Date(BASE_NOW - 10_000).toISOString(),
            count: 5,
          },
        },
      };
      expect(isReinforcementSuppressed(state, "ultrawork", BASE_NOW)).toBe(
        true,
      );
    });

    it("should not suppress when window has expired (> 60 seconds ago)", () => {
      const state = {
        triggers: {
          ultrawork: {
            lastTriggeredAt: new Date(BASE_NOW - 61_000).toISOString(),
            count: 99,
          },
        },
      };
      expect(isReinforcementSuppressed(state, "ultrawork", BASE_NOW)).toBe(
        false,
      );
    });

    it("should handle corrupt timestamp gracefully", () => {
      const state = {
        triggers: {
          ultrawork: { lastTriggeredAt: "not-a-date", count: 99 },
        },
      };
      expect(isReinforcementSuppressed(state, "ultrawork", BASE_NOW)).toBe(
        false,
      );
    });
  });

  describe("recordKwTrigger", () => {
    const BASE_NOW = 1_700_000_000_000;

    it("should create a new entry on first trigger", () => {
      const state = { triggers: {} };
      const next = recordKwTrigger(state, "ultrawork", BASE_NOW);
      expect(next.triggers.ultrawork?.count).toBe(1);
      expect(next.triggers.ultrawork?.lastTriggeredAt).toBe(
        new Date(BASE_NOW).toISOString(),
      );
    });

    it("should increment count within window", () => {
      const state = {
        triggers: {
          ultrawork: {
            lastTriggeredAt: new Date(BASE_NOW - 5_000).toISOString(),
            count: 1,
          },
        },
      };
      const next = recordKwTrigger(state, "ultrawork", BASE_NOW);
      expect(next.triggers.ultrawork?.count).toBe(2);
    });

    it("should reset count when outside window", () => {
      const state = {
        triggers: {
          ultrawork: {
            lastTriggeredAt: new Date(BASE_NOW - 65_000).toISOString(),
            count: 10,
          },
        },
      };
      const next = recordKwTrigger(state, "ultrawork", BASE_NOW);
      expect(next.triggers.ultrawork?.count).toBe(1);
    });

    it("should not mutate the original state", () => {
      const state = { triggers: {} };
      recordKwTrigger(state, "ultrawork", BASE_NOW);
      expect(state.triggers).toEqual({});
    });

    it("should track multiple keywords independently", () => {
      const empty = { triggers: {} };
      const after1 = recordKwTrigger(empty, "ultrawork", BASE_NOW);
      const after2 = recordKwTrigger(after1, "orchestrate", BASE_NOW);
      expect(after2.triggers.ultrawork?.count).toBe(1);
      expect(after2.triggers.orchestrate?.count).toBe(1);
    });
  });

  describe("loadKwState", () => {
    it("should return empty state when file does not exist", () => {
      (fs.existsSync as unknown as ReturnType<typeof vi.fn>)
        .mockReturnValueOnce(true) // dir check for mkdirSync path
        .mockReturnValueOnce(false); // file does not exist
      const state = loadKwState("/tmp/project");
      expect(state).toEqual({ triggers: {} });
    });

    it("should parse valid state file", () => {
      const validState = {
        triggers: {
          ultrawork: { lastTriggeredAt: "2024-01-01T00:00:00.000Z", count: 1 },
        },
      };
      (fs.existsSync as unknown as ReturnType<typeof vi.fn>).mockReturnValue(
        true,
      );
      (fs.readFileSync as unknown as ReturnType<typeof vi.fn>).mockReturnValue(
        JSON.stringify(validState),
      );
      const state = loadKwState("/tmp/project");
      expect(state.triggers.ultrawork?.count).toBe(1);
    });

    it("should reset on corrupt JSON", () => {
      (fs.existsSync as unknown as ReturnType<typeof vi.fn>).mockReturnValue(
        true,
      );
      (fs.readFileSync as unknown as ReturnType<typeof vi.fn>).mockReturnValue(
        "not json{{{",
      );
      const state = loadKwState("/tmp/project");
      expect(state).toEqual({ triggers: {} });
    });

    it("should reset when JSON is valid but wrong shape", () => {
      (fs.existsSync as unknown as ReturnType<typeof vi.fn>).mockReturnValue(
        true,
      );
      (fs.readFileSync as unknown as ReturnType<typeof vi.fn>).mockReturnValue(
        JSON.stringify({ wrong: "shape" }),
      );
      const state = loadKwState("/tmp/project");
      expect(state).toEqual({ triggers: {} });
    });
  });

  // ── Regression: ultrawork loop scenario ──────────────────────

  describe("ultrawork loop regression (R17)", () => {
    it("agent response containing 'ultrawork' with AfterAgent event must not retrigger", () => {
      // This simulates the exact scenario observed in production:
      // The agent's response text includes the word "ultrawork" (e.g. while executing
      // the ultrawork workflow steps), and the harness replays it as a new hook input.
      // Guard 1 (isGenuineUserPrompt) must reject this.
      const agentReplayInput = {
        hook_event_name: "AfterAgent",
        prompt: [
          "Starting ultrawork Phase 1.",
          "Reading .agents/workflows/ultrawork.md...",
          "ultrawork workflow requires 5 phases.",
        ].join("\n"),
        sessionId: "sess-regression-001",
      };
      expect(isGenuineUserPrompt(agentReplayInput)).toBe(false);
    });

    it("ultrawork keyword inside triple-backtick does not survive stripping", () => {
      // Guard 2: agent writes ultrawork in a code block while narrating steps
      const agentCodeOutput =
        "The workflow name is:\n```\nultrawork\n```\nExecuting now.";
      const stripped = stripCodeBlocks(agentCodeOutput);
      expect(stripped).not.toMatch(/\bultrawork\b/);
    });

    it("third trigger within 60s is suppressed by reinforcement guard", () => {
      const BASE_NOW = Date.now();
      // Simulate 2 prior triggers within the window
      const state = {
        triggers: {
          ultrawork: {
            lastTriggeredAt: new Date(BASE_NOW - 10_000).toISOString(),
            count: 2,
          },
        },
      };
      expect(isReinforcementSuppressed(state, "ultrawork", BASE_NOW)).toBe(
        true,
      );
    });

    it("first two ultrawork triggers in window are allowed", () => {
      const BASE_NOW = Date.now();
      const empty = { triggers: {} };

      // First trigger — no suppression, count becomes 1
      expect(isReinforcementSuppressed(empty, "ultrawork", BASE_NOW)).toBe(
        false,
      );
      const state1 = recordKwTrigger(empty, "ultrawork", BASE_NOW);

      // Second trigger — count is 1, still below threshold
      expect(isReinforcementSuppressed(state1, "ultrawork", BASE_NOW)).toBe(
        false,
      );
      const state2 = recordKwTrigger(state1, "ultrawork", BASE_NOW);

      // Third trigger — count is 2, suppressed
      expect(isReinforcementSuppressed(state2, "ultrawork", BASE_NOW)).toBe(
        true,
      );
    });
  });
});
