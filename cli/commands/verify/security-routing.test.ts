import { describe, expect, it } from "vitest";
import { loadTriggerCorpus } from "./triggers-corpus.js";
import { detectAll } from "./triggers-detect.js";

describe("security workflow routing", () => {
  it("routes source, skill, MCP, runtime and validation requests to /security", async () => {
    const entries = loadTriggerCorpus().filter(
      (entry) => entry.expected === "security",
    );
    const outcomes = await detectAll(entries);
    expect(entries.length).toBeGreaterThanOrEqual(17);
    for (const outcome of outcomes) {
      expect(outcome.detected, outcome.entry.prompt).toBe("security");
    }
  });

  it.each([
    "What does the security workflow do?",
    "Compare Cisco Skill Scanner and ARTEX.",
    "Explain Cloudflare security-audit-skill.",
    "시큐리티 워크플로우가 어떻게 동작하는지 설명해줘.",
    "네 그럼 어떻게 스킬을 디자인할거임",
    "Please run /deepsec",
    "/deepsec",
  ])(
    "does not start a workflow for research or the removed alias: %s",
    async (prompt) => {
      const [outcome] = await detectAll([
        { prompt, lang: "en", expected: null },
      ]);
      expect(outcome?.detected).toBeNull();
    },
  );

  it("uses the renamed workflow when explicitly requested within a prompt", async () => {
    const [outcome] = await detectAll([
      { prompt: "Please run /security", lang: "en", expected: "security" },
    ]);
    expect(outcome?.detected).toBe("security");
  });
});
