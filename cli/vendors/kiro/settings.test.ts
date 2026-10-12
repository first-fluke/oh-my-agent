import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { expectOmaSerenaEntry } from "../../__tests__/helpers.js";
import {
  applyKiroProjectMcp,
  KIRO_PROJECT_SETTINGS_PATH,
  needsKiroMcpUpdate,
  RECOMMENDED_KIRO_MCP,
} from "./settings.js";

describe("kiro settings", () => {
  const roots: string[] = [];

  afterEach(() => {
    for (const root of roots.splice(0)) {
      rmSync(root, { recursive: true, force: true });
    }
  });

  function tempRoot(): string {
    const root = mkdtempSync(join(tmpdir(), "oma-kiro-settings-"));
    roots.push(root);
    return root;
  }

  it("adds chrome-devtools and serena MCP servers to project cli settings", () => {
    const root = tempRoot();

    applyKiroProjectMcp(root);

    const parsed = JSON.parse(
      readFileSync(join(root, KIRO_PROJECT_SETTINGS_PATH), "utf-8"),
    );
    expect(parsed.mcpServers["chrome-devtools"]).toEqual(
      RECOMMENDED_KIRO_MCP["chrome-devtools"],
    );
    // No --open-web-dashboard assertion: the default bridge entry has no such
    // flag to carry — the shared daemon it starts passes it itself.
    expectOmaSerenaEntry(parsed.mcpServers.serena, "ide");
    expect(needsKiroMcpUpdate(root)).toBe(false);
  });

  it("preserves existing chrome-devtools config", () => {
    const root = tempRoot();
    const path = join(root, KIRO_PROJECT_SETTINGS_PATH);
    mkdirSync(join(root, ".kiro", "settings"), { recursive: true });
    writeFileSync(
      path,
      `${JSON.stringify({
        mcpServers: {
          "chrome-devtools": { command: "custom-chrome-mcp" },
        },
      })}\n`,
    );

    applyKiroProjectMcp(root);

    const parsed = JSON.parse(readFileSync(path, "utf-8"));
    expect(parsed.mcpServers["chrome-devtools"]).toEqual({
      command: "custom-chrome-mcp",
    });
    expectOmaSerenaEntry(parsed.mcpServers.serena, "ide");
  });

  it("repairs a local Serena bridge pin while preserving its environment", () => {
    const root = tempRoot();
    const path = join(root, KIRO_PROJECT_SETTINGS_PATH);
    mkdirSync(join(root, ".kiro", "settings"), { recursive: true });
    const environment = {
      SERENA_LOG_LEVEL: "debug",
      CUSTOM_SERENA_SETTING: "custom-value",
    };
    const settings = {
      "chat.defaultAgent": "custom-agent",
      mcpServers: {
        serena: {
          command: "oma",
          args: ["bridge", "http://127.0.0.1:12389/mcp", "--context", "oma"],
          env: environment,
        },
        "chrome-devtools": { command: "custom-chrome-mcp" },
        other: { url: "https://other.example.com/mcp" },
      },
    };
    writeFileSync(path, `${JSON.stringify(settings)}\n`);

    expect(needsKiroMcpUpdate(root)).toBe(true);
    applyKiroProjectMcp(root);

    const repairedText = readFileSync(path, "utf-8");
    const repaired = JSON.parse(repairedText);
    expectOmaSerenaEntry(repaired.mcpServers.serena, "ide");
    expect(repaired.mcpServers.serena.env).toEqual(environment);
    expect(repaired.mcpServers["chrome-devtools"]).toEqual(
      settings.mcpServers["chrome-devtools"],
    );
    expect(repaired.mcpServers.other).toEqual(settings.mcpServers.other);
    expect(repaired["chat.defaultAgent"]).toBe("custom-agent");
    expect(needsKiroMcpUpdate(root)).toBe(false);
    applyKiroProjectMcp(root);
    expect(readFileSync(path, "utf-8")).toBe(repairedText);
  });
});
