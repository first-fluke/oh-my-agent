import { describe, expect, it } from "vitest";
import {
  applyQwenSettings,
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
      privacy: { usageStatisticsEnabled: false },
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
      privacy: { usageStatisticsEnabled: false },
      mcpServers: {
        serena: { url: "http://localhost:12341/mcp" },
      },
    };
    expect(needsQwenSettingsUpdate(settings)).toBe(false);
  });

  it("requires update when privacy.usageStatisticsEnabled is not set to false (default telemetry off)", () => {
    const settings = {
      mcpServers: {
        serena: { command: "uvx", args: ["serena"] },
      },
    };
    expect(needsQwenSettingsUpdate(settings)).toBe(true);
  });

  it("accepts missing privacy.usageStatisticsEnabled when telemetry is opted in", () => {
    const settings = {
      mcpServers: {
        serena: { command: "uvx", args: ["serena"] },
      },
    };
    expect(needsQwenSettingsUpdate(settings, { telemetry: true })).toBe(false);
  });

  it("applies privacy.usageStatisticsEnabled=false by default", () => {
    const result = applyQwenSettings({});
    expect(result.privacy).toEqual({ usageStatisticsEnabled: false });
  });

  it("strips privacy.usageStatisticsEnabled when telemetry is opted in", () => {
    const result = applyQwenSettings(
      { privacy: { usageStatisticsEnabled: false } },
      { telemetry: true },
    );
    expect(result.privacy).toBeUndefined();
  });

  it("applies recommended settings without dropping existing keys", () => {
    const settings = {
      hooks: { UserPromptSubmit: [] },
      mcpServers: {
        other: { url: "http://localhost:3000/mcp" },
      },
    };

    const result = applyQwenSettings(settings);
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

    const result = applyQwenSettings(settings);
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

describe("T2.9 rename regression — applyQwenSettings", () => {
  it("produces byte-identical output for a minimal empty fixture (applyQwenSettings)", () => {
    // Locks output for the targetDir → installRoot rename (plan T2.9).
    const result = applyQwenSettings({});

    const expected = {
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

  it("needsQwenSettingsUpdate returns false for the recommended-state fixture (needsQwenSettingsUpdate)", () => {
    // Locks output for the targetDir → installRoot rename (plan T2.9).
    const upToDate = {
      privacy: { usageStatisticsEnabled: false },
      mcpServers: {
        serena: {
          command: "serena",
          args: ["start-mcp-server", "--context", "ide", "--project", "."],
          env: { SERENA_LOG_LEVEL: "info" },
        },
      },
    } as const;

    expect(needsQwenSettingsUpdate(upToDate)).toBe(false);
  });
});
