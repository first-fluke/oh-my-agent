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
  const home = fs.mkdtempSync(path.join(actual.tmpdir(), "oma-mig026-home-"));
  return { ...actual, homedir: () => home };
});

const fakeHome = homedir();
const { migrateGlobalCodexSerenaTransport } = await import(
  "./026-global-codex-serena-transport.js"
);

let root = "";

beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), "oma-mig026-root-"));
  rmSync(join(fakeHome, ".codex"), { recursive: true, force: true });
});

afterEach(() => {
  rmSync(root, { recursive: true, force: true });
});

afterAll(() => {
  rmSync(root, { recursive: true, force: true });
  rmSync(fakeHome, { recursive: true, force: true });
});

describe("migration 026 — global Codex Serena transport", () => {
  it("replaces only the legacy global uvx launcher with OMA bridge", () => {
    const configPath = join(fakeHome, ".codex", "config.toml");
    mkdirSync(join(fakeHome, ".codex"), { recursive: true });
    writeFileSync(
      configPath,
      `[features]
user_flag = true

[mcp_servers.other]
command = "npx"
args = ["custom-mcp"]

[mcp_servers.serena]
command = "uvx"
args = ["--from", "git+https://github.com/oraios/serena", "serena", "start-mcp-server", "--context", "ide"]
`,
      "utf-8",
    );

    expect(
      migrateGlobalCodexSerenaTransport.up(root, { vendors: ["codex"] }),
    ).toEqual(["~/.codex/config.toml (legacy Serena launcher → OMA bridge)"]);

    const migrated = readFileSync(configPath, "utf-8");
    expect(migrated).toContain('command = "oma"');
    expect(migrated).toContain('args = [ "bridge", "--context", "oma" ]');
    expect(migrated).toContain("user_flag = true");
    expect(migrated).toContain('args = [ "custom-mcp" ]');
    expect(migrated).not.toContain("git+https://github.com/oraios/serena");
    expect(
      migrateGlobalCodexSerenaTransport.up(root, { vendors: ["codex"] }),
    ).toEqual([]);
  });

  it("does not modify global Codex settings when Codex is not selected", () => {
    const configPath = join(fakeHome, ".codex", "config.toml");
    mkdirSync(join(fakeHome, ".codex"), { recursive: true });
    const source = `[mcp_servers.serena]
command = "uvx"
args = ["--from", "git+https://github.com/oraios/serena", "serena"]
`;
    writeFileSync(configPath, source, "utf-8");

    expect(
      migrateGlobalCodexSerenaTransport.up(root, { vendors: ["claude"] }),
    ).toEqual([]);
    expect(readFileSync(configPath, "utf-8")).toBe(source);
  });

  it("preserves custom Serena wrappers", () => {
    const configPath = join(fakeHome, ".codex", "config.toml");
    mkdirSync(join(fakeHome, ".codex"), { recursive: true });
    const source = `[mcp_servers.serena]
command = "my-serena-wrapper"
args = ["--flag"]
`;
    writeFileSync(configPath, source, "utf-8");

    expect(
      migrateGlobalCodexSerenaTransport.up(root, { vendors: ["codex"] }),
    ).toEqual([]);
    expect(readFileSync(configPath, "utf-8")).toBe(source);
  });
});
