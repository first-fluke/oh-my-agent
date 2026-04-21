import { describe, expect, it } from "vitest";
import {
  applyRecommendedQwenSettings,
  needsQwenSettingsUpdate,
  RECOMMENDED_QWEN_MCP,
  sanitizeQwenSettings,
} from "./settings.js";

describe("qwen settings", () => {
  it("requires update when serena MCP config is missing", () => {
    expect(needsQwenSettingsUpdate({})).toBe(true);
    expect(needsQwenSettingsUpdate({ mcpServers: {} })).toBe(true);
  });

  it("accepts existing serena stdio transport", () => {
    const settings = {
      mcpServers: {
        serena: {
          command: "uvx",
          args: ["--from", "git+https://github.com/oraios/serena", "serena"],
        },
      },
    };
    expect(needsQwenSettingsUpdate(settings)).toBe(false);
  });

  it("accepts existing serena HTTP transport", () => {
    const settings = {
      mcpServers: {
        serena: { url: "http://localhost:12341/mcp" },
      },
    };
    expect(needsQwenSettingsUpdate(settings)).toBe(false);
  });

  it("applies recommended settings without dropping existing keys", () => {
    const settings = {
      hooks: { UserPromptSubmit: [] },
      mcpServers: {
        other: { url: "http://localhost:3000/mcp" },
      },
    };

    const result = applyRecommendedQwenSettings(settings);
    expect(result.mcpServers).toEqual({
      other: { url: "http://localhost:3000/mcp" },
      ...RECOMMENDED_QWEN_MCP,
    });
    expect(result.hooks).toEqual({ UserPromptSubmit: [] });
    expect(needsQwenSettingsUpdate(result)).toBe(false);
  });

  it("preserves existing serena transport when present", () => {
    const settings = {
      mcpServers: {
        serena: {
          command: "uvx",
          args: ["serena"],
        },
      },
    };

    const result = applyRecommendedQwenSettings(settings);
    expect(result.mcpServers?.serena).toEqual({
      command: "uvx",
      args: ["serena"],
    });
  });

  it("strips unknown MCP server keys", () => {
    const settings = {
      mcpServers: {
        serena: {
          command: "uvx",
          args: ["serena"],
          unknown_key: true,
        },
      },
    };

    const result = sanitizeQwenSettings(settings);
    expect(result.mcpServers?.serena).toEqual({
      command: "uvx",
      args: ["serena"],
    });
  });
});
