import { describe, expect, it } from "vitest";
import {
  applyGeminiSettings,
  needsGeminiSettingsUpdate,
  RECOMMENDED_GEMINI_EXPERIMENTAL,
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
      privacy: { usageStatisticsEnabled: false },
      mcpServers: {
        serena: {
          command: "uvx",
          args: ["--from", "git+https://github.com/oraios/serena", "serena"],
        },
      },
    };

    expect(needsGeminiSettingsUpdate(settings)).toBe(false);
  });

  it("requires update when privacy.usageStatisticsEnabled is not set to false (default telemetry off)", () => {
    const settings = {
      general: { enableNotifications: true },
      experimental: { enableAgents: true },
      mcpServers: {
        serena: {
          command: "uvx",
          args: ["serena"],
        },
      },
    };
    expect(needsGeminiSettingsUpdate(settings)).toBe(true);
  });

  it("accepts missing privacy.usageStatisticsEnabled when telemetry is opted in", () => {
    const settings = {
      general: { enableNotifications: true },
      experimental: { enableAgents: true },
      mcpServers: {
        serena: {
          command: "uvx",
          args: ["serena"],
        },
      },
    };
    expect(needsGeminiSettingsUpdate(settings, { telemetry: true })).toBe(
      false,
    );
  });

  it("flags stale settings when telemetry is opted in but opt-out key still present", () => {
    const settings = {
      general: { enableNotifications: true },
      experimental: { enableAgents: true },
      privacy: { usageStatisticsEnabled: false },
      mcpServers: {
        serena: {
          command: "uvx",
          args: ["serena"],
        },
      },
    };
    expect(needsGeminiSettingsUpdate(settings, { telemetry: true })).toBe(true);
  });

  it("applies privacy.usageStatisticsEnabled=false by default", () => {
    const result = applyGeminiSettings({});
    expect(result.privacy).toEqual({ usageStatisticsEnabled: false });
  });

  it("strips privacy.usageStatisticsEnabled when telemetry is opted in", () => {
    const result = applyGeminiSettings(
      { privacy: { usageStatisticsEnabled: false } },
      { telemetry: true },
    );
    expect(result.privacy).toBeUndefined();
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

    const result = applyGeminiSettings(settings);
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

    const result = applyGeminiSettings(settings);

    expect(result.mcpServers?.serena).toEqual({
      command: "uvx",
      args: ["serena"],
      includeTools: ["find_symbol"],
    });
  });
});

describe("T2.9 rename regression — applyGeminiSettings", () => {
  it("produces byte-identical output for a minimal empty fixture (applyGeminiSettings)", () => {
    // Locks output for the targetDir → installRoot rename (plan T2.9).
    const result = applyGeminiSettings({});

    const expected = {
      general: { enableNotifications: true },
      experimental: { enableAgents: true },
      mcpServers: {
        serena: {
          command: "serena",
          args: ["start-mcp-server", "--context", "ide", "--project", "."],
          env: { SERENA_LOG_LEVEL: "info" },
        },
      },
      privacy: { usageStatisticsEnabled: false },
    } as const;

    expect(result).toEqual(expected);
  });

  it("needsGeminiSettingsUpdate returns false for the recommended-state fixture (needsGeminiSettingsUpdate)", () => {
    // Locks output for the targetDir → installRoot rename (plan T2.9).
    const upToDate = {
      general: { enableNotifications: true },
      experimental: { enableAgents: true },
      privacy: { usageStatisticsEnabled: false },
      mcpServers: {
        serena: {
          command: "serena",
          args: ["start-mcp-server", "--context", "ide", "--project", "."],
          env: { SERENA_LOG_LEVEL: "info" },
        },
      },
    } as const;

    expect(needsGeminiSettingsUpdate(upToDate)).toBe(false);
  });
});
