import { describe, expect, it } from "vitest";
import {
  applyRecommendedGeminiSettings,
  RECOMMENDED_GEMINI_EXPERIMENTAL,
  needsGeminiSettingsUpdate,
  RECOMMENDED_GEMINI_GENERAL,
  RECOMMENDED_GEMINI_MCP,
  sanitizeGeminiSettings,
} from "./settings.js";

describe("gemini settings", () => {
  it("requires update when general is missing", () => {
    expect(needsGeminiSettingsUpdate({})).toBe(true);
  });

  it("requires update when serena MCP config is missing", () => {
    const settings = {
      general: { enableNotifications: true },
      experimental: { enableAgents: true },
      mcpServers: {},
    };
    expect(needsGeminiSettingsUpdate(settings)).toBe(true);
  });

  it("accepts existing serena command transport", () => {
    const settings = {
      general: { enableNotifications: true },
      experimental: { enableAgents: true },
      mcpServers: {
        serena: {
          command: "uvx",
          args: ["--from", "git+https://github.com/oraios/serena", "serena"],
        },
      },
    };

    expect(needsGeminiSettingsUpdate(settings)).toBe(false);
  });

  it("applies recommended settings without dropping existing keys", () => {
    const settings = {
      general: { theme: "dark" },
      experimental: { anotherFlag: false },
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
    expect(result.experimental).toEqual({
      anotherFlag: false,
      ...RECOMMENDED_GEMINI_EXPERIMENTAL,
    });
    expect(result.mcpServers).toEqual({
      other: { url: "http://localhost:3000/mcp" },
      ...RECOMMENDED_GEMINI_MCP,
    });
    expect(result.hooks).toEqual({ BeforeAgent: [] });
    expect(needsGeminiSettingsUpdate(result)).toBe(false);
  });

  it("requires update when custom agents are not enabled", () => {
    const settings = {
      general: { enableNotifications: true },
      experimental: {},
      mcpServers: RECOMMENDED_GEMINI_MCP,
    };

    expect(needsGeminiSettingsUpdate(settings)).toBe(true);
  });

  it("sanitizes legacy MCP keys to Gemini schema", () => {
    const settings = {
      mcpServers: {
        serena: {
          command: "uvx",
          args: ["serena"],
          available_tools: ["find_symbol", "search_for_pattern"],
          unknown_key: true,
        },
      },
    };

    const result = sanitizeGeminiSettings(settings);
    expect(result.mcpServers?.serena).toEqual({
      command: "uvx",
      args: ["serena"],
      includeTools: ["find_symbol", "search_for_pattern"],
    });
  });

  it("preserves existing serena transport while sanitizing legacy keys", () => {
    const settings = {
      general: {},
      experimental: {},
      mcpServers: {
        serena: {
          command: "uvx",
          args: ["serena"],
          available_tools: ["find_symbol"],
        },
      },
    };

    const result = applyRecommendedGeminiSettings(settings);

    expect(result.mcpServers?.serena).toEqual({
      command: "uvx",
      args: ["serena"],
      includeTools: ["find_symbol"],
    });
  });
});
