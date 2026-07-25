import { describe, expect, it } from "vitest";
import { expectOmaSerenaEntry } from "../../__tests__/helpers.js";
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

  it("flags an existing serena stdio transport for migration", () => {
    const settings = {
      privacy: { usageStatisticsEnabled: false },
      mcpServers: {
        "chrome-devtools": {
          command: "npx",
          args: [
            "-y",
            "chrome-devtools-mcp@latest",
            "--no-usage-statistics",
            "--isolated",
          ],
        },
        serena: {
          command: "serena",
          args: [
            "start-mcp-server",
            "--context",
            "ide",
            "--project",
            ".",
            "--open-web-dashboard",
            "false",
          ],
        },
      },
    };
    // Bridge is the default transport, so an oma-written stdio entry is stale.
    expect(needsQwenSettingsUpdate(settings)).toBe(true);
  });

  it("accepts existing serena HTTP transport", () => {
    const settings = {
      privacy: { usageStatisticsEnabled: false },
      mcpServers: {
        "chrome-devtools": {
          command: "npx",
          args: [
            "-y",
            "chrome-devtools-mcp@latest",
            "--no-usage-statistics",
            "--isolated",
          ],
        },
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
        "chrome-devtools": {
          command: "npx",
          args: [
            "-y",
            "chrome-devtools-mcp@latest",
            "--no-usage-statistics",
            "--isolated",
          ],
        },
        serena: RECOMMENDED_QWEN_MCP.serena,
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

  it("migrates a uvx-launched serena onto the managed transport", () => {
    // Another route to the same server, not customization — in scope for the
    // switch, or that install keeps paying for a serena per session.
    const settings = {
      mcpServers: {
        serena: {
          command: "uvx",
          args: ["serena"],
        },
      },
    };

    const result = applyQwenSettings(settings);
    expectOmaSerenaEntry(result.mcpServers?.serena, "ide");
  });

  it("preserves a serena entry oma does not recognize", () => {
    const settings = {
      mcpServers: {
        serena: { command: "my-serena-wrapper", args: ["--flag"] },
      },
    };

    const result = applyQwenSettings(settings);
    expect(result.mcpServers?.serena).toEqual({
      command: "my-serena-wrapper",
      args: ["--flag"],
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
        "chrome-devtools": {
          command: "npx",
          args: [
            "-y",
            "chrome-devtools-mcp@latest",
            "--no-usage-statistics",
            "--isolated",
          ],
        },
        // The serena entry is asserted separately: the default bridge form
        // embeds the absolute path of the running oma, which is machine- and
        // runner-specific and so cannot be pinned in a fixture.
        serena: result.mcpServers?.serena,
      },
      privacy: { usageStatisticsEnabled: false },
    } as const;

    expect(result).toEqual(expected);
    expectOmaSerenaEntry(result.mcpServers?.serena, "ide");
  });

  it("needsQwenSettingsUpdate returns false for the recommended-state fixture (needsQwenSettingsUpdate)", () => {
    // Locks output for the targetDir → installRoot rename (plan T2.9).
    const upToDate = {
      privacy: { usageStatisticsEnabled: false },
      mcpServers: {
        "chrome-devtools": {
          command: "npx",
          args: [
            "-y",
            "chrome-devtools-mcp@latest",
            "--no-usage-statistics",
            "--isolated",
          ],
        },
        // The recommended entry follows the configured transport, so it cannot
        // be spelled out here — the bridge form is machine-specific.
        serena: RECOMMENDED_QWEN_MCP.serena,
      },
    } as const;

    expect(needsQwenSettingsUpdate(upToDate)).toBe(false);
  });
});
