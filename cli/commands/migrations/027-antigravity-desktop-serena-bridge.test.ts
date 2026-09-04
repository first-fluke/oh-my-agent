import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { homedir, tmpdir } from "node:os";
import { join } from "node:path";
import {
  afterAll,
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";

vi.mock("node:os", async () => {
  const actual = await vi.importActual<typeof import("node:os")>("node:os");
  const fs = await vi.importActual<typeof import("node:fs")>("node:fs");
  const path = await vi.importActual<typeof import("node:path")>("node:path");
  const home = fs.mkdtempSync(path.join(actual.tmpdir(), "oma-mig027-home-"));
  return { ...actual, homedir: () => home };
});

const fakeHome = homedir();
const { migrateAntigravityDesktopSerenaBridge } = await import(
  "./027-antigravity-desktop-serena-bridge.js"
);

let root = "";

function configPath(): string {
  return join(fakeHome, ".gemini", "antigravity", "mcp_config.json");
}

function writeConfig(value: unknown): void {
  const path = configPath();
  mkdirSync(join(path, ".."), { recursive: true });
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`, "utf-8");
}

beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), "oma-mig027-root-"));
  rmSync(join(fakeHome, ".gemini"), { recursive: true, force: true });
});

afterEach(() => {
  rmSync(root, { recursive: true, force: true });
});

afterAll(() => {
  rmSync(fakeHome, { recursive: true, force: true });
});

describe("migration 027 — Antigravity Desktop Serena bridge", () => {
  it("replaces the retired fixed-port OMA bridge and preserves other servers", () => {
    writeConfig({
      mcpServers: {
        context7: { serverUrl: "https://mcp.context7.com/mcp" },
        serena: {
          command: "/Users/example/.local/share/mise/shims/npx",
          args: [
            "-y",
            "oh-my-agent@latest",
            "bridge",
            "http://localhost:12341/mcp",
          ],
          disabled: false,
        },
      },
    });

    expect(
      migrateAntigravityDesktopSerenaBridge.up(root, {
        vendors: ["antigravity"],
      }),
    ).toEqual([
      "~/.gemini/antigravity/mcp_config.json (fixed retired Serena bridge)",
    ]);

    const parsed = JSON.parse(readFileSync(configPath(), "utf-8"));
    expect(parsed.mcpServers.context7).toEqual({
      serverUrl: "https://mcp.context7.com/mcp",
    });
    expect(parsed.mcpServers.serena).toMatchObject({
      command: "oma",
      args: ["bridge", "--context", "oma"],
      disabled: false,
    });
    expect(migrateAntigravityDesktopSerenaBridge.up(root)).toEqual([]);
  });

  it("does not rewrite a custom bridge endpoint or an unselected vendor", () => {
    const custom = {
      command: "npx",
      args: [
        "-y",
        "oh-my-agent@latest",
        "bridge",
        "https://serena.example.test/mcp",
      ],
    };
    writeConfig({ mcpServers: { serena: custom } });

    expect(
      migrateAntigravityDesktopSerenaBridge.up(root, {
        vendors: ["antigravity"],
      }),
    ).toEqual([]);
    expect(
      JSON.parse(readFileSync(configPath(), "utf-8")).mcpServers.serena,
    ).toEqual(custom);

    writeConfig({
      mcpServers: {
        serena: {
          ...custom,
          args: [
            "-y",
            "oh-my-agent@latest",
            "bridge",
            "http://127.0.0.1:12341/mcp",
          ],
        },
      },
    });
    expect(
      migrateAntigravityDesktopSerenaBridge.up(root, { vendors: ["codex"] }),
    ).toEqual([]);
  });
});
