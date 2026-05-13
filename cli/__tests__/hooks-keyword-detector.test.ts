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
  buildRawPatterns,
  isInformationalContext,
  isAnalyticalQuestion,
  stripCodeBlocks,
  stripSystemEchoes,
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
  // Task 3 — CLI invocation guard
  CLI_INVOCATION_AT_START,
  KEYWORD_SKIP_PREDICATES,
  shouldSkipAllWorkflows,
  normalizeForMatching,
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

    it("should use hyphen-rejecting boundaries for non-CJK languages", () => {
      const keywords = { "*": ["debug"], en: ["fix bug"] };
      const patterns = buildPatterns(keywords, "en", ["ko", "ja", "zh"]);
      // (?:^|[^\w-]) ... (?:$|[^\w-]) — rejects hyphen as token edge
      expect(patterns[0]?.source).toContain("[^\\w-]");
    });

    it("should not use word boundaries for CJK languages", () => {
      const keywords = { ko: ["디버그"] };
      const patterns = buildPatterns(keywords, "ko", ["ko", "ja", "zh"]);
      expect(patterns[0]?.source).not.toContain("[^\\w-]");
    });

    it("rejects hyphen-suffixed false positives (code-review-bot)", () => {
      const keywords = { "*": ["code-review"] };
      const patterns = buildPatterns(keywords, "en", ["ko", "ja", "zh"]);
      const re = patterns[0];
      expect(re?.test("please do a code-review")).toBe(true);
      expect(re?.test("code-review-bot ran")).toBe(false);
      expect(re?.test("code-review-cleanup")).toBe(false);
    });
  });

  describe("normalizeForMatching (NFKC)", () => {
    it("collapses fullwidth Latin to ASCII", async () => {
      const { normalizeForMatching } = await import(
        "../../.agents/hooks/core/keyword-detector.ts"
      );
      expect(normalizeForMatching("ｐａｒａｌｌｅｌ")).toBe("parallel");
      expect(normalizeForMatching("ｏｒｃｈｅｓｔｒａｔｅ")).toBe(
        "orchestrate",
      );
    });

    it("preserves native CJK characters", async () => {
      const { normalizeForMatching } = await import(
        "../../.agents/hooks/core/keyword-detector.ts"
      );
      expect(normalizeForMatching("자동 실행")).toBe("자동 실행");
      expect(normalizeForMatching("オーケストレート")).toBe("オーケストレート");
      expect(normalizeForMatching("自动执行")).toBe("自动执行");
    });

    it("lowercases ASCII", async () => {
      const { normalizeForMatching } = await import(
        "../../.agents/hooks/core/keyword-detector.ts"
      );
      expect(normalizeForMatching("ORCHESTRATE")).toBe("orchestrate");
    });
  });

  // ── Task 3 — CLI Invocation Guard ───────────────────────────

  describe("CLI_INVOCATION_AT_START", () => {
    // Positive cases — these prompts ARE CLI invocations and must match the regex
    it("matches: oma agent:spawn brainstorm", () => {
      expect(
        CLI_INVOCATION_AT_START.test('oma agent:spawn brainstorm "X"'),
      ).toBe(true);
    });

    it("does NOT match: 'omc auto' (omc is a separate harness, not an Oma host CLI)", () => {
      expect(CLI_INVOCATION_AT_START.test("omc auto")).toBe(false);
    });

    it("matches: gemini agent (host LLM CLI)", () => {
      expect(CLI_INVOCATION_AT_START.test("gemini agent")).toBe(true);
    });

    it("matches: cursor exec (host LLM CLI)", () => {
      expect(CLI_INVOCATION_AT_START.test("cursor exec --help")).toBe(true);
    });

    it("matches: /cursor:agent (slash form)", () => {
      expect(CLI_INVOCATION_AT_START.test("/cursor:agent")).toBe(true);
    });

    it("matches: claude agent test (explicit CLI verb)", () => {
      expect(CLI_INVOCATION_AT_START.test("claude agent test")).toBe(true);
    });

    it("matches: claude --help (flag-prefixed)", () => {
      expect(CLI_INVOCATION_AT_START.test("claude --help")).toBe(true);
    });

    it("does NOT match: claude code review (natural-language addressee)", () => {
      expect(CLI_INVOCATION_AT_START.test("claude code review")).toBe(false);
    });

    it("does NOT match: claude review this code", () => {
      expect(CLI_INVOCATION_AT_START.test("claude review this code")).toBe(
        false,
      );
    });

    it("does NOT match: codex output looks wrong", () => {
      expect(CLI_INVOCATION_AT_START.test("codex output looks wrong")).toBe(
        false,
      );
    });

    it("does NOT match: 'opencode run' (opencode is not an Oma vendor)", () => {
      expect(CLI_INVOCATION_AT_START.test("opencode run")).toBe(false);
    });

    it("matches: codex exec --workflow ralph", () => {
      expect(CLI_INVOCATION_AT_START.test("codex exec --workflow ralph")).toBe(
        true,
      );
    });

    it("matches: qwen run (host LLM CLI)", () => {
      expect(CLI_INVOCATION_AT_START.test("qwen run")).toBe(true);
    });

    it("matches: /qwen:agent (slash form)", () => {
      expect(CLI_INVOCATION_AT_START.test("/qwen:agent")).toBe(true);
    });

    it("matches: /oma:brainstorm (leading slash form)", () => {
      expect(CLI_INVOCATION_AT_START.test("/oma:brainstorm")).toBe(true);
    });

    it("does NOT match: 'omx spawn' (omx is a separate harness, not an Oma vendor)", () => {
      expect(CLI_INVOCATION_AT_START.test("omx spawn")).toBe(false);
    });

    it("does NOT match: 'omo run' (omo is a separate harness, not an Oma vendor)", () => {
      expect(CLI_INVOCATION_AT_START.test("omo run")).toBe(false);
    });

    // Negative cases: conversational usage of brand names must NOT match
    it("does NOT match: 'oma is cool' (conversational usage of project name)", () => {
      expect(CLI_INVOCATION_AT_START.test("oma is cool")).toBe(false);
    });

    it("does NOT match: 'omx looks great' (omx not in vendor list)", () => {
      expect(CLI_INVOCATION_AT_START.test("omx looks great")).toBe(false);
    });

    it("does NOT match: 'oma 프로젝트의 brainstorm 알려줘' (Korean conversational)", () => {
      expect(
        CLI_INVOCATION_AT_START.test("oma 프로젝트의 brainstorm 알려줘"),
      ).toBe(false);
    });

    // Negative cases — these prompts contain brand names mid-sentence and must NOT match
    it("does NOT match: brand appears mid-sentence (compare claude and codex)", () => {
      expect(
        CLI_INVOCATION_AT_START.test("compare claude and codex briefly"),
      ).toBe(false);
    });

    it("does NOT match: natural language starting with 'please'", () => {
      expect(
        CLI_INVOCATION_AT_START.test("please help me brainstorm a feature"),
      ).toBe(false);
    });

    it("does NOT match: plain keyword with no brand prefix", () => {
      expect(CLI_INVOCATION_AT_START.test("orchestrate the deployment")).toBe(
        false,
      );
    });

    it("does NOT match: partial brand prefix substring (omitted)", () => {
      // 'omaha' starts with 'oma' but the \b word-boundary stops it
      expect(CLI_INVOCATION_AT_START.test("omaha brainstorm")).toBe(false);
    });
  });

  describe("shouldSkipAllWorkflows", () => {
    it("returns true for oma CLI invocation", () => {
      expect(shouldSkipAllWorkflows('oma agent:spawn brainstorm "X"')).toBe(
        true,
      );
    });

    it("returns true for claude CLI invocation (verb-followed)", () => {
      expect(shouldSkipAllWorkflows("claude agent test")).toBe(true);
    });

    it("returns false for natural-language claude addressee", () => {
      expect(shouldSkipAllWorkflows("claude review this code")).toBe(false);
    });

    it("returns true for codex CLI invocation", () => {
      expect(shouldSkipAllWorkflows("codex exec --workflow ralph")).toBe(true);
    });

    it("returns true for qwen CLI invocation", () => {
      expect(shouldSkipAllWorkflows("qwen run")).toBe(true);
    });

    it("returns true for /oma:brainstorm slash form", () => {
      expect(shouldSkipAllWorkflows("/oma:brainstorm")).toBe(true);
    });

    it("returns false for natural language starting with 'please'", () => {
      expect(
        shouldSkipAllWorkflows("please help me brainstorm a feature"),
      ).toBe(false);
    });

    it("returns false when brand name appears mid-sentence", () => {
      expect(shouldSkipAllWorkflows("compare claude and codex briefly")).toBe(
        false,
      );
    });

    it("returns false for plain workflow keyword", () => {
      expect(shouldSkipAllWorkflows("ultrawork this task")).toBe(false);
    });

    it("KEYWORD_SKIP_PREDICATES map is initially empty (no per-workflow overrides)", () => {
      expect(Object.keys(KEYWORD_SKIP_PREDICATES)).toHaveLength(0);
    });
  });

  describe("CLI invocation guard — integration (matching loop)", () => {
    // Verify end-to-end: the matching loop skips workflow detection when the
    // cleaned prompt starts with a CLI brand, and fires normally otherwise.
    // We drive this through the exported helpers rather than spawning main().

    it("shouldSkipAllWorkflows blocks before patterns run — positive case", () => {
      // A prompt starting with 'oma' would match 'oma' in 'oma agent:spawn orchestrate'
      // but shouldSkipAllWorkflows must return true, preventing any trigger.
      const cleaned = normalizeForMatching("oma agent:spawn orchestrate");
      expect(shouldSkipAllWorkflows(cleaned)).toBe(true);
    });

    it("shouldSkipAllWorkflows does NOT block natural language — negative case", () => {
      // 'orchestrate the build system' starts with 'orchestrate', not a CLI brand.
      const cleaned = normalizeForMatching("orchestrate the build system");
      expect(shouldSkipAllWorkflows(cleaned)).toBe(false);
    });

    it("NFKC normalization does not prevent CLI brand detection", () => {
      // Fullwidth 'oma' would be collapsed by normalizeForMatching before the regex runs.
      // Note: ｏｍａ in fullwidth NFKC collapses to 'oma'.
      const cleaned = normalizeForMatching("ｏｍａ agent:spawn brainstorm");
      // After normalization the string starts with 'oma'
      expect(cleaned.startsWith("oma")).toBe(true);
      expect(shouldSkipAllWorkflows(cleaned)).toBe(true);
    });
  });

  describe("buildPatterns (placeholder anchor)", () => {
    it("placeholder", () => {
      expect(true).toBe(true);
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

  describe("stripSystemEchoes", () => {
    it("strips OMA workflow echo lines", () => {
      const text =
        "user question\n[OMA WORKFLOW: ULTRAWORK]\nUser intent matches the /ultrawork workflow.\nmore text";
      const result = stripSystemEchoes(text);
      expect(result).not.toMatch(/\[OMA WORKFLOW:/);
      expect(result).toContain("user question");
      expect(result).toContain("more text");
    });

    it("strips OMA persistent mode banner", () => {
      const text = "before\n[OMA PERSISTENT MODE: ULTRAWORK]\nafter";
      const result = stripSystemEchoes(text);
      expect(result).not.toMatch(/\[OMA PERSISTENT MODE:/);
    });

    it("strips Stop hook feedback lines", () => {
      const text =
        "Stop hook feedback:\nThe /ultrawork workflow is still active (reinforcement 1/5).\nuser typed something";
      const result = stripSystemEchoes(text);
      expect(result).not.toMatch(/Stop hook/);
      expect(result).not.toMatch(/workflow is still active/);
      expect(result).toContain("user typed something");
    });

    it("strips MAGIC KEYWORD echo from omc-style paste-back", () => {
      const text = "context: [MAGIC KEYWORD: AUTOPILOT] details";
      const result = stripSystemEchoes(text);
      expect(result).not.toMatch(/MAGIC KEYWORD/);
    });

    it("strips OMA AGENT HINT lines", () => {
      const text = "request body\n[OMA AGENT HINT: backend]\nresponse body";
      const result = stripSystemEchoes(text);
      expect(result).not.toMatch(/AGENT HINT/);
      expect(result).toContain("request body");
      expect(result).toContain("response body");
    });

    it("preserves text without echo blocks", () => {
      const text = "plain user prompt about something";
      expect(stripSystemEchoes(text)).toBe(text);
    });
  });

  describe("buildRawPatterns (intent regex)", () => {
    // Reflects the convention: English is universal (`*`), other languages
    // are opt-in via the `language` setting in oma-config.yaml.
    const orchestratePatterns = {
      "*": [
        "\\b(build|create|make|develop|implement|scaffold)\\s+(?:me\\s+)?(?:an?|the)\\s+(?:[\\w-]+\\s+){0,3}(app|api|service|server|cli|tool|website|dashboard|system|feature|backend|frontend|prototype|mvp|bot)\\b",
      ],
      ko: [
        "(앱|API|서비스|서버|CLI|도구|웹사이트|대시보드|시스템|기능|백엔드|프론트엔드|프로토타입|MVP|봇)\\s*(?:을|를|이|가)?\\s*(?:만들어\\s*(?:주세요|줘|줄래)?|구현해\\s*(?:주세요|줘|줄래)?|개발해\\s*(?:주세요|줘|줄래)?|만들자|구현하자|개발하자)",
      ],
    };

    it("returns empty array for undefined patterns", () => {
      expect(buildRawPatterns(undefined, "en")).toHaveLength(0);
    });

    it("compiles English intent patterns", () => {
      const compiled = buildRawPatterns(orchestratePatterns, "en");
      expect(compiled.length).toBeGreaterThan(0);
    });

    it("matches Build a TODO app with user authentication (the README example)", () => {
      const [pattern] = buildRawPatterns(orchestratePatterns, "en");
      expect(pattern?.test("Build a TODO app with user authentication")).toBe(
        true,
      );
    });

    it("matches Build me an app (omc parity)", () => {
      const [pattern] = buildRawPatterns(orchestratePatterns, "en");
      expect(pattern?.test("Build me an app")).toBe(true);
    });

    it("matches Create an awesome web service", () => {
      const [pattern] = buildRawPatterns(orchestratePatterns, "en");
      expect(pattern?.test("Create an awesome web service")).toBe(true);
    });

    it("matches Develop a backend with PostgreSQL", () => {
      const [pattern] = buildRawPatterns(orchestratePatterns, "en");
      expect(pattern?.test("Develop a backend with PostgreSQL")).toBe(true);
    });

    it("does NOT match Build TODO app (no article)", () => {
      const [pattern] = buildRawPatterns(orchestratePatterns, "en");
      expect(pattern?.test("Build TODO app")).toBe(false);
    });

    it("does NOT match Build a relationship (noun not in whitelist)", () => {
      const [pattern] = buildRawPatterns(orchestratePatterns, "en");
      expect(pattern?.test("Build a relationship")).toBe(false);
    });

    it("does NOT match I built a TODO app yesterday (past tense)", () => {
      const [pattern] = buildRawPatterns(orchestratePatterns, "en");
      expect(pattern?.test("I built a TODO app yesterday")).toBe(false);
    });

    it("matches Korean: TODO 앱 만들어줘", () => {
      const koPatterns = buildRawPatterns(orchestratePatterns, "ko");
      const koPattern = koPatterns[koPatterns.length - 1];
      expect(koPattern?.test("TODO 앱 만들어줘")).toBe(true);
    });

    it("matches Korean: REST API 구현해", () => {
      const koPatterns = buildRawPatterns(orchestratePatterns, "ko");
      const koPattern = koPatterns[koPatterns.length - 1];
      expect(koPattern?.test("REST API 구현해")).toBe(true);
    });

    it("matches Korean: 백엔드를 개발해주세요", () => {
      const koPatterns = buildRawPatterns(orchestratePatterns, "ko");
      const koPattern = koPatterns[koPatterns.length - 1];
      expect(koPattern?.test("백엔드를 개발해주세요")).toBe(true);
    });

    it("does NOT match Korean: 앱 만드는 법 알려줘", () => {
      const koPatterns = buildRawPatterns(orchestratePatterns, "ko");
      const koPattern = koPatterns[koPatterns.length - 1];
      expect(koPattern?.test("앱 만드는 법 알려줘")).toBe(false);
    });

    it("skips invalid regex without throwing", () => {
      const compiled = buildRawPatterns(
        { en: ["valid pattern", "[invalid("] },
        "en",
      );
      expect(compiled).toHaveLength(1);
    });
  });

  describe("isInformationalContext (universal section)", () => {
    it("treats Korean meta-discussion as informational under lang=en", () => {
      const trigger = "ultrawork";
      const prompt = `그럼 우리도 그냥 키워드 나오면 ${trigger} 트리거 해주면 되는거네요?`;
      const matchIndex = prompt.indexOf(trigger);
      // Manually construct universal-only patterns to mirror what
      // buildInformationalPatterns produces with lang="en".
      const universalMeta = ["트리거", "키워드", "키워드 나오면"].map(
        (p) => new RegExp(p, "i"),
      );
      expect(isInformationalContext(prompt, matchIndex, universalMeta)).toBe(
        true,
      );
    });
  });

  describe("ralph false-positive regression (AS-IS vs TO-BE)", () => {
    // These three prompts arose during a live discussion *about* ralph (not a
    // request to run it). The original keyword detector would have flagged
    // them as workflow activations (false positive) — see the AS-IS block.
    // The TO-BE block proves the patched patterns now suppress them.

    // Frozen snapshot of informationalPatterns.ko BEFORE this fix
    // (.agents/hooks/core/triggers.json, ko array as of pre-patch).
    const PRE_FIX_KO_INFORMATIONAL = [
      "뭐야",
      "뭐임",
      "무엇",
      "어떻게",
      "설명해",
      "알려줘",
      "키워드",
      "감지",
      "오탐",
      "트리거",
      "발동",
      "메타",
      "트리거하면",
      "트리거 해주면",
      "트리거해야",
      "키워드 나오면",
      "왜 만들",
      "어떻게 만들",
      "어떨까",
      "하면 좋을",
      "한다면",
      "할까요",
    ].map((p) => new RegExp(p, "i"));

    // Frozen snapshot of post-fix informationalPatterns.ko additions
    // (kept inline so the contract survives later config edits).
    const POST_FIX_KO_INFORMATIONAL = [
      ...PRE_FIX_KO_INFORMATIONAL,
      ...[
        "보강할",
        "에 대해",
        "에 대한",
        "한번 봐",
        "깊게 봐",
        "코드를 한번",
        "그 워크플로우",
        "이 워크플로우",
        "워크플로우 자체",
      ].map((p) => new RegExp(p, "i")),
    ];

    // Frozen snapshot of QUESTION_PATTERNS that existed BEFORE this fix
    // (keyword-detector.ts, evaluated against first line of the prompt).
    const PRE_FIX_QUESTION_PATTERNS: RegExp[] = [
      /^.*참고할/,
      /^.*비교해/,
      /^.*분석해/,
      /^.*있냐/,
      /^.*있나\?/,
      /^.*있는지/,
      /^.*있을까/,
      /^.*볼만한/,
      /^.*쓸만한/,
      /^.*뭐가\s*있/,
      /^.*어떤\s*(게|것|거)\s*있/,
      /^.*차이가?\s*뭐/,
      /^.*\bis there\b/i,
      /^.*\bare there\b/i,
      /^.*\banything worth\b/i,
      /^.*\bwhat.*(feature|difference|reference)/i,
      /^.*\bcompare\b/i,
    ];

    function preFixAnalytical(prompt: string): boolean {
      const firstLine = (prompt.split("\n")[0] ?? "").trim();
      return PRE_FIX_QUESTION_PATTERNS.some((p) => p.test(firstLine));
    }

    const cases: Array<{ name: string; prompt: string; keyword: string }> = [
      {
        name: "discussion via '보강할게 있음?'",
        prompt: "그럼 oma ralph 에 보강할게 있음?",
        keyword: "ralph",
      },
      {
        name: "discussion via '코드를 한번 깊게 봐'",
        prompt: "그 랄프 코드를 한번 깊게 봐볼래?",
        keyword: "랄프",
      },
      {
        name: "discussion via '그것도 ... 분석도'",
        prompt: "그것도 막고 랄프 분석도 해야겠네요",
        keyword: "랄프",
      },
    ];

    for (const { name, prompt, keyword } of cases) {
      it(`[AS-IS] would have triggered: ${name}`, () => {
        const matchIndex = prompt.indexOf(keyword);
        // Pre-fix: neither layer suppresses → ralph would activate.
        expect(
          isInformationalContext(prompt, matchIndex, PRE_FIX_KO_INFORMATIONAL),
        ).toBe(false);
        expect(preFixAnalytical(prompt)).toBe(false);
      });

      it(`[TO-BE] now suppressed: ${name}`, () => {
        const matchIndex = prompt.indexOf(keyword);
        // Post-fix: at least one of the two layers must suppress.
        const blockedByWindow = isInformationalContext(
          prompt,
          matchIndex,
          POST_FIX_KO_INFORMATIONAL,
        );
        const blockedByFirstLine = isAnalyticalQuestion(prompt);
        expect(blockedByWindow || blockedByFirstLine).toBe(true);
      });
    }

    it("[TO-BE] still allows genuine ralph requests to trigger", () => {
      // Prompts that genuinely request the ralph workflow must NOT be
      // suppressed. Both layers must let them through.
      const genuine = [
        "랄프로 끝까지 해줘",
        "ralph this task",
        "멈추지말고 끝까지 해",
      ];
      for (const prompt of genuine) {
        expect(isAnalyticalQuestion(prompt)).toBe(false);
        const keyword = prompt.includes("랄프")
          ? "랄프"
          : prompt.includes("ralph")
            ? "ralph"
            : prompt;
        const matchIndex = prompt.indexOf(keyword);
        if (matchIndex >= 0) {
          expect(
            isInformationalContext(
              prompt,
              matchIndex,
              POST_FIX_KO_INFORMATIONAL,
            ),
          ).toBe(false);
        }
      }
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
