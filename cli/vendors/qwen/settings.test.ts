import { describe, expect, it } from "vitest";
import { expectOmaSerenaEntry } from "../../__tests__/helpers.js";
import {
  applyQwenSettings,
  needsQwenSettingsUpdate,
  QWEN_REQUEST_TIMEOUT_MS,
  RECOMMENDED_QWEN_MCP,
  sanitizeQwenSettings,
} from "./settings.js";

/**
 * oma pins a model request timeout, so any fixture that must read as
 * "already up to date" has to carry it — otherwise needsQwenSettingsUpdate
 * reports true for the timeout alone and the assertion under test says
 * nothing about the property it was written for.
 */
const PINNED_TIMEOUT = {
  model: { generationConfig: { timeout: QWEN_REQUEST_TIMEOUT_MS } },
} as const;

describe("qwen settings", () => {
  it("trusts recommended MCP servers on a fresh install", () => {
    const result = applyQwenSettings({});
    expect(result.mcpServers?.serena?.trust).toBe(true);
    expect(result.mcpServers?.["chrome-devtools"]?.trust).toBe(true);
    expect(needsQwenSettingsUpdate(result)).toBe(false);
  });

  it.each(["serena", "chrome-devtools"])(
    "migrates missing trust for %s without changing its transport",
    (name) => {
      const settings = applyQwenSettings({});
      const server = settings.mcpServers?.[name];
      if (!server) throw new Error(`Missing ${name}`);
      delete server.trust;
      const original = structuredClone(server);

      expect(needsQwenSettingsUpdate(settings)).toBe(true);
      const result = applyQwenSettings(settings);
      expect(result.mcpServers?.[name]).toEqual({ ...original, trust: true });
      expect(settings.mcpServers?.[name]).toEqual(original);
      expect(needsQwenSettingsUpdate(result)).toBe(false);
    },
  );

  it("preserves explicit distrust during transport migration and leaves other servers alone", () => {
    const result = applyQwenSettings({
      mcpServers: {
        serena: { command: "uvx", args: ["serena"], trust: false },
        "chrome-devtools": { command: "custom-devtools", trust: false },
        other: { url: "http://localhost:3000/mcp" },
      },
    });
    expectOmaSerenaEntry(result.mcpServers?.serena, "ide");
    expect(result.mcpServers?.serena?.trust).toBe(false);
    expect(result.mcpServers?.["chrome-devtools"]).toEqual({
      command: "custom-devtools",
      trust: false,
    });
    expect(result.mcpServers?.other).toEqual({
      url: "http://localhost:3000/mcp",
    });
    expect(needsQwenSettingsUpdate(result)).toBe(false);
  });

  it("requires update when serena MCP config is missing", () => {
    expect(needsQwenSettingsUpdate({})).toBe(true);
    expect(needsQwenSettingsUpdate({ mcpServers: {} })).toBe(true);
  });

  it("flags an existing serena stdio transport for migration", () => {
    const settings = {
      privacy: { usageStatisticsEnabled: false },
      mcpServers: {
        "chrome-devtools": {
          trust: true,
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
      ...PINNED_TIMEOUT,
      mcpServers: {
        "chrome-devtools": {
          trust: true,
          command: "npx",
          args: [
            "-y",
            "chrome-devtools-mcp@latest",
            "--no-usage-statistics",
            "--isolated",
          ],
        },
        serena: { url: "http://localhost:12341/mcp", trust: true },
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
      ...PINNED_TIMEOUT,
      mcpServers: {
        "chrome-devtools": {
          trust: true,
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
      trust: true,
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
          trust: true,
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
      ...PINNED_TIMEOUT,
      privacy: { usageStatisticsEnabled: false },
    } as const;

    expect(result).toEqual(expected);
    expectOmaSerenaEntry(result.mcpServers?.serena, "ide");
  });

  it("needsQwenSettingsUpdate returns false for the recommended-state fixture (needsQwenSettingsUpdate)", () => {
    // Locks output for the targetDir → installRoot rename (plan T2.9).
    const upToDate = {
      privacy: { usageStatisticsEnabled: false },
      ...PINNED_TIMEOUT,
      mcpServers: {
        "chrome-devtools": {
          trust: true,
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

describe("qwen model request timeout", () => {
  /** Recommended-state fixture minus the model/timeout slot under test. */
  const baseline = () => ({
    privacy: { usageStatisticsEnabled: false },
    mcpServers: {
      "chrome-devtools": RECOMMENDED_QWEN_MCP["chrome-devtools"],
      serena: RECOMMENDED_QWEN_MCP.serena,
    },
  });

  it("pins the timeout on model.generationConfig when modelProviders is absent", () => {
    const result = applyQwenSettings({});
    expect(result.model?.generationConfig?.timeout).toBe(
      QWEN_REQUEST_TIMEOUT_MS,
    );
  });

  it("preserves sibling model and generationConfig keys while pinning", () => {
    const result = applyQwenSettings({
      model: {
        name: "qwen3-coder-plus",
        generationConfig: { temperature: 0.2 },
      },
    });
    expect(result.model).toEqual({
      name: "qwen3-coder-plus",
      generationConfig: {
        temperature: 0.2,
        timeout: QWEN_REQUEST_TIMEOUT_MS,
      },
    });
  });

  it("requires update when the timeout is missing or stale", () => {
    expect(needsQwenSettingsUpdate(baseline())).toBe(true);
    expect(
      needsQwenSettingsUpdate({
        ...baseline(),
        model: { generationConfig: { timeout: 60_000 } },
      }),
    ).toBe(true);
  });

  it("pins the timeout on every modelProviders entry instead", () => {
    const result = applyQwenSettings({
      modelProviders: {
        openai: [
          { model: "a" },
          { model: "b", generationConfig: { top_p: 1 } },
        ],
      },
    });
    expect(result.modelProviders).toEqual({
      openai: [
        { model: "a", generationConfig: { timeout: QWEN_REQUEST_TIMEOUT_MS } },
        {
          model: "b",
          generationConfig: { top_p: 1, timeout: QWEN_REQUEST_TIMEOUT_MS },
        },
      ],
    });
  });

  it("clears the top-level timeout once modelProviders owns it", () => {
    // Both slots set at once is the migration case: modelProviders wins, so
    // the stale top-level copy must go or the two can silently disagree.
    const result = applyQwenSettings({
      model: { generationConfig: { timeout: 60_000, temperature: 0.2 } },
      modelProviders: { openai: [{ model: "a" }] },
    });
    expect(result.model?.generationConfig).toEqual({ temperature: 0.2 });
    expect(needsQwenSettingsUpdate(result)).toBe(false);
  });

  it("requires update when a modelProviders entry has a stale timeout", () => {
    expect(
      needsQwenSettingsUpdate({
        ...baseline(),
        modelProviders: {
          openai: [{ model: "a", generationConfig: { timeout: 60_000 } }],
        },
      }),
    ).toBe(true);
  });

  it("drops a stale contentGenerator and reports it as needing update", () => {
    // Regression: the removal used to be unreachable because
    // needsQwenSettingsUpdate never reported the leftover key, so an
    // otherwise-current config kept contentGenerator forever.
    const stale = {
      ...baseline(),
      ...PINNED_TIMEOUT,
      contentGenerator: { apiKey: "legacy" },
    };
    expect(needsQwenSettingsUpdate(stale)).toBe(true);
    expect(applyQwenSettings(stale).contentGenerator).toBeUndefined();
  });

  it("leaves the top-level timeout unpinned when user-level modelProviders own it", () => {
    // Qwen Code seals user-level provider entries, so a project top-level
    // timeout is ignored for them and only prints a startup warning.
    const options = { userModelProviders: true };
    expect(needsQwenSettingsUpdate(baseline(), options)).toBe(false);

    const result = applyQwenSettings(baseline(), options);
    expect(result.model).toBeUndefined();
    expect(needsQwenSettingsUpdate(result, options)).toBe(false);
  });

  it("removes a stale top-level timeout when user-level modelProviders own it", () => {
    const options = { userModelProviders: true };
    const stale = {
      ...baseline(),
      model: {
        name: "qwen3-coder-plus",
        generationConfig: { timeout: QWEN_REQUEST_TIMEOUT_MS },
      },
    };
    expect(needsQwenSettingsUpdate(stale, options)).toBe(true);

    const result = applyQwenSettings(stale, options);
    expect(result.model).toEqual({ name: "qwen3-coder-plus" });
    expect(needsQwenSettingsUpdate(result, options)).toBe(false);
  });

  it("still pins project modelProviders entries when user-level ones exist", () => {
    const result = applyQwenSettings(
      { modelProviders: { openai: [{ model: "a" }] } },
      { userModelProviders: true },
    );
    expect(result.modelProviders).toEqual({
      openai: [
        { model: "a", generationConfig: { timeout: QWEN_REQUEST_TIMEOUT_MS } },
      ],
    });
  });

  it("is idempotent — a freshly applied config needs no further update", () => {
    expect(needsQwenSettingsUpdate(applyQwenSettings({}))).toBe(false);
    expect(
      needsQwenSettingsUpdate(
        applyQwenSettings({ modelProviders: { openai: [{ model: "a" }] } }),
      ),
    ).toBe(false);
  });
});
