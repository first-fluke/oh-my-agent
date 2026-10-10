import { describe, expect, it } from "vitest";
import { detectAll } from "./triggers-detect.js";

describe("visual design workflow routing", () => {
  it.each([
    "네 그럼 어떻게 스킬을 디자인할거임",
    "보안 스킬을 디자인해줘",
    "UI 감사용 스킬을 디자인해줘",
    "디자인 스킬 만들어줘",
    "Design a security skill",
    "Design a UI auditing skill",
    "Design an API",
    "Design a database schema",
  ])("does not route nonvisual work to /design: %s", async (prompt) => {
    const [outcome] = await detectAll([{ prompt, lang: "ko", expected: null }]);
    expect(outcome?.detected).not.toBe("design");
  });

  it.each([
    "스킬 관리 화면을 디자인해줘",
    "스킬 설계하고 랜딩페이지도 디자인해줘",
    "UI 디자인해줘",
    "UI를 디자인해줘",
    "Design a landing page",
    "Design a skill management screen",
    "Design the UI",
    "Design a UI for skill management",
    "Define a design system",
    "Choose typography and a color palette",
    "画面をデザインして",
    "设计设置页面",
    "Please run /design",
    "그럼 /design으로 진행해줘",
  ])("preserves visual work: %s", async (prompt) => {
    const [outcome] = await detectAll([
      { prompt, lang: "en", expected: "design" },
    ]);
    expect(outcome?.detected).toBe("design");
  });

  it("leaves explicit slash commands to the command handler", async () => {
    const [outcome] = await detectAll([
      { prompt: "/design", lang: "en", expected: null },
    ]);
    expect(outcome?.detected).toBeNull();
  });
});
