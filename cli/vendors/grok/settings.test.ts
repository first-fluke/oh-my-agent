import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { parse as parseToml, stringify as stringifyToml } from "smol-toml";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  applyGrokProjectMcp,
  GROK_PROJECT_CONFIG_PATH,
  needsGrokProjectMcpUpdate,
} from "./settings.js";

describe("Grok project Serena transport repair", () => {
  let dir: string;
  let configPath: string;

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), "oma-grok-mcp-"));
    mkdirSync(join(dir, ".grok"));
    configPath = join(dir, GROK_PROJECT_CONFIG_PATH);
  });

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  function writeConfig(url: string) {
    const config = {
      model: "custom-model",
      mcp_servers: {
        serena: {
          command: "oma",
          args: ["bridge", url, "--context", "oma"],
          env: { OMA_BRIDGE_TEST: "preserved" },
        },
        "chrome-devtools": { command: "my-devtools" },
        other: { command: "my-other-mcp", args: ["--flag"] },
      },
    };
    writeFileSync(configPath, `${stringifyToml(config)}\n`);
    return config;
  }

  it("detects and repairs a complete config with a pinned local bridge", () => {
    const original = writeConfig("http://127.0.0.1:12389/mcp");

    expect(needsGrokProjectMcpUpdate(dir)).toBe(true);
    applyGrokProjectMcp(dir);

    const repairedContent = readFileSync(configPath, "utf-8");
    expect(parseToml(repairedContent)).toEqual({
      ...original,
      mcp_servers: {
        ...original.mcp_servers,
        serena: {
          ...original.mcp_servers.serena,
          args: ["bridge", "--context", "oma"],
        },
      },
    });
    expect(needsGrokProjectMcpUpdate(dir)).toBe(false);
    applyGrokProjectMcp(dir);
    expect(readFileSync(configPath, "utf-8")).toBe(repairedContent);
  });

  it("preserves an explicitly configured remote bridge", () => {
    const original = writeConfig("https://serena.example.com/mcp");

    expect(needsGrokProjectMcpUpdate(dir)).toBe(false);
    applyGrokProjectMcp(dir);
    expect(parseToml(readFileSync(configPath, "utf-8"))).toEqual(original);
  });
});
