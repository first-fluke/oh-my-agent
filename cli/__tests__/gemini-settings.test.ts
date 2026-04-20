import { describe, expect, it } from "vitest";
import {
  applyRecommendedGeminiSettings,
  needsGeminiSettingsUpdate,
  RECOMMENDED_GEMINI_GENERAL,
  RECOMMENDED_GEMINI_MCP,
} from "../vendors/gemini/settings.js";

describe("gemini settings", () => {
  it("requires update when general is missing", () => {
    expect(needsGeminiSettingsUpdate({})).toBe(true);
  });

  it("requires update when serena MCP URL differs", () => {
    const settings = {
      general: { enableNotifications: true },
      mcpServers: { serena: { url: "http://localhost:9999/mcp" } },
    };
    expect(needsGeminiSettingsUpdate(settings)).toBe(true);
  });

  it("applies recommended settings without dropping existing keys", () => {
    const settings = {
      general: { theme: "dark" },
      mcpServers: {
        other: { url: "http://localhost:3000/mcp" },
      },
      hooks: { BeforeAgent: [] },
    };

    const result = applyRecommendedGeminiSettings(settings);
    expect(result.general).toEqual({
      theme: "dark",
      ...RECOMMENDED_GEMINI_GENERAL,
    });
    expect(result.mcpServers).toEqual({
      other: { url: "http://localhost:3000/mcp" },
      ...RECOMMENDED_GEMINI_MCP,
    });
    expect(result.hooks).toEqual({ BeforeAgent: [] });
    expect(needsGeminiSettingsUpdate(result)).toBe(false);
  });
});
