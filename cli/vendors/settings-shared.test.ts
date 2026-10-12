import { describe, expect, it } from "vitest";
import { expectOmaSerenaEntry } from "../__tests__/helpers.js";
import { serenaMcpEntry } from "./serena.js";
import {
  applyRecommendedMcpServers,
  type McpServerEntry,
  needsRecommendedMcpUpdate,
} from "./settings-shared.js";

describe("shared MCP settings", () => {
  it("repairs a local Serena bridge pin while preserving its environment", () => {
    const environment = {
      SERENA_LOG_LEVEL: "debug",
      CUSTOM_SERENA_SETTING: "custom-value",
    };
    const servers: Record<string, McpServerEntry> = {
      serena: {
        command: "oma",
        args: ["bridge", "http://127.0.0.1:12389/mcp", "--context", "oma"],
        env: environment,
      },
      "chrome-devtools": { command: "custom-chrome-mcp" },
      other: { url: "https://other.example.com/mcp" },
    };
    const original = structuredClone(servers);
    const recommended = {
      serena: serenaMcpEntry("ide", "bridge"),
      "chrome-devtools": { command: "recommended-chrome-mcp" },
    };

    expect(needsRecommendedMcpUpdate(servers)).toBe(true);
    const result = applyRecommendedMcpServers(servers, recommended);

    expectOmaSerenaEntry(result.serena, "ide");
    expect(result.serena?.env).toEqual(environment);
    expect(result["chrome-devtools"]).toEqual(servers["chrome-devtools"]);
    expect(result.other).toEqual(servers.other);
    expect(servers).toEqual(original);
    expect(needsRecommendedMcpUpdate(result)).toBe(false);
    expect(applyRecommendedMcpServers(result, recommended)).toEqual(result);
  });
});
