import { describe, expect, it } from "vitest";
import { loadTriggerCorpus } from "./triggers-corpus.js";
import { detectAll } from "./triggers-detect.js";

describe("security workflow routing", () => {
  it("keeps /security out of the keyword corpus", () => {
    const entries = loadTriggerCorpus().filter(
      (entry) => entry.expected === "security",
    );
    expect(entries).toEqual([]);
  });

  it.each([
    "What does the security workflow do?",
    "Compare Cisco Skill Scanner and ARTEX.",
    "Explain Cloudflare security-audit-skill.",
    "시큐리티 워크플로우가 어떻게 동작하는지 설명해줘.",
    "네 그럼 어떻게 스킬을 디자인할거임",
    "Please run /deepsec",
    "/deepsec",
    "Please run /security",
    "/security",
  ])("does not keyword-start /security: %s", async (prompt) => {
    const [outcome] = await detectAll([{ prompt, lang: "en", expected: null }]);
    expect(outcome?.detected).toBeNull();
  });
});
