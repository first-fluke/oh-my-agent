import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { migrateCodexQwenSerena } from "./007-codex-qwen-serena.js";

let cwd: string;

/** A Codex config the user owns — installed and authenticated outside oma. */
const FOREIGN_CODEX_TOML = 'model = "gpt-5"\n';

function seedCodex(): string {
  const path = join(cwd, ".codex", "config.toml");
  mkdirSync(join(cwd, ".codex"), { recursive: true });
  writeFileSync(path, FOREIGN_CODEX_TOML);
  return path;
}

function seedQwen(): string {
  const path = join(cwd, ".qwen", "settings.json");
  mkdirSync(join(cwd, ".qwen"), { recursive: true });
  writeFileSync(path, `${JSON.stringify({ theme: "dark" }, null, 2)}\n`);
  return path;
}

beforeEach(() => {
  cwd = mkdtempSync(join(tmpdir(), "oma-mig007-"));
});

afterEach(() => {
  rmSync(cwd, { recursive: true, force: true });
});

describe("migrateCodexQwenSerena (007) — vendor gating", () => {
  it("leaves .codex/config.toml untouched when codex is not selected", () => {
    const path = seedCodex();

    const actions = migrateCodexQwenSerena.up(cwd, { vendors: ["opencode"] });

    expect(actions).toEqual([]);
    expect(readFileSync(path, "utf-8")).toBe(FOREIGN_CODEX_TOML);
  });

  it("leaves .qwen/settings.json untouched when qwen is not selected", () => {
    const path = seedQwen();
    const before = readFileSync(path, "utf-8");

    const actions = migrateCodexQwenSerena.up(cwd, { vendors: ["claude"] });

    expect(actions).toEqual([]);
    expect(readFileSync(path, "utf-8")).toBe(before);
  });

  it("writes nothing when the selection is empty (install, pre-prompt pass)", () => {
    const codex = seedCodex();
    const qwen = seedQwen();
    const qwenBefore = readFileSync(qwen, "utf-8");

    const actions = migrateCodexQwenSerena.up(cwd, { vendors: [] });

    expect(actions).toEqual([]);
    expect(readFileSync(codex, "utf-8")).toBe(FOREIGN_CODEX_TOML);
    expect(readFileSync(qwen, "utf-8")).toBe(qwenBefore);
  });

  it("registers Serena for the vendors that are selected", () => {
    const codex = seedCodex();
    seedQwen();

    const actions = migrateCodexQwenSerena.up(cwd, { vendors: ["codex"] });

    expect(actions).toEqual([".codex/config.toml (Serena MCP registered)"]);
    expect(readFileSync(codex, "utf-8")).toContain("[mcp_servers.serena]");
  });

  it("stays unrestricted when no context is passed", () => {
    const codex = seedCodex();
    seedQwen();

    const actions = migrateCodexQwenSerena.up(cwd);

    expect(actions).toEqual([
      ".qwen/settings.json (Serena MCP registered)",
      ".codex/config.toml (Serena MCP registered)",
    ]);
    expect(readFileSync(codex, "utf-8")).toContain("[mcp_servers.serena]");
  });

  it("is idempotent for a selected vendor", () => {
    seedCodex();

    const first = migrateCodexQwenSerena.up(cwd, { vendors: ["codex"] });
    const second = migrateCodexQwenSerena.up(cwd, { vendors: ["codex"] });

    expect(first).toHaveLength(1);
    expect(second).toEqual([]);
  });
});
