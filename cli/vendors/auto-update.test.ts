import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { parse as parseToml } from "smol-toml";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  syncVendorAutoUpdate,
  vendorAutoUpdateTargets,
} from "./auto-update.js";

vi.mock("node:os", async (original) => ({
  ...(await original<typeof import("node:os")>()),
  homedir: () => join(root, "home"),
}));

// Every vendor home override must fall back to the temp HOME, or a developer
// machine's real `~/.grok`, `~/.codex`, … would be rewritten by these tests.
const HOME_ENV = [
  "CLAUDE_CONFIG_DIR",
  "CODEX_HOME",
  "GROK_HOME",
  "KIRO_HOME",
  "KIMI_CODE_HOME",
  "COPILOT_HOME",
  "XDG_CONFIG_HOME",
];

const HOME_FILES = {
  grok: "home/.grok/config.toml",
  kiro: "home/.kiro/settings/cli.json",
  opencode: "home/.config/opencode/opencode.jsonc",
  kilo: "home/.config/kilo/kilo.jsonc",
  kimi: "home/.kimi-code/tui.toml",
  copilot: "home/.copilot/settings.json",
} as const;

const ALL = [
  "claude",
  "codex",
  "qwen",
  "grok",
  "kiro",
  "opencode",
  "kilo",
  "kimi",
  "copilot",
  "antigravity",
  "pi",
  "commandcode",
  "cursor",
  "zcode",
  "hermes",
];

let root: string;
beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), "oma-auto-update-"));
  for (const name of HOME_ENV) vi.stubEnv(name, "");
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
  rmSync(root, { recursive: true, force: true });
});

function write(path: string, content: string): void {
  mkdirSync(dirname(join(root, path)), { recursive: true });
  writeFileSync(join(root, path), content);
}
function text(path: string): string {
  return readFileSync(join(root, path), "utf-8");
}
function read(path: string): Record<string, unknown> {
  const raw = text(path);
  return (path.endsWith(".toml") ? parseToml(raw) : JSON.parse(raw)) as Record<
    string,
    unknown
  >;
}
/** Create the config directory a vendor leaves behind once it has run. */
function vendorHasRun(...vendors: (keyof typeof HOME_FILES)[]): void {
  for (const vendor of vendors) {
    mkdirSync(dirname(join(root, HOME_FILES[vendor])), { recursive: true });
  }
}

describe("vendor auto-update preference", () => {
  it("writes every vendor's documented opt-out when disabled", () => {
    vendorHasRun("grok", "kiro", "opencode", "kilo", "kimi", "copilot");

    const changed = syncVendorAutoUpdate(root, false, ALL);

    expect(read(".claude/settings.json")).toEqual({
      env: { DISABLE_AUTOUPDATER: "1" },
    });
    expect(read(".codex/config.toml")).toEqual({
      check_for_update_on_startup: false,
    });
    expect(read(".qwen/settings.json")).toEqual({
      general: { enableAutoUpdate: false },
    });
    expect(read(HOME_FILES.grok)).toEqual({ cli: { auto_update: false } });
    // kiro-cli keeps flat dotted keys.
    expect(read(HOME_FILES.kiro)).toEqual({ "app.disableAutoupdates": true });
    expect(read(HOME_FILES.opencode)).toEqual({ update: "disable" });
    expect(read(HOME_FILES.kilo)).toEqual({ autoupdate: false });
    expect(read(HOME_FILES.kimi)).toEqual({
      upgrade: { auto_install: false },
    });
    expect(read(HOME_FILES.copilot)).toEqual({ autoUpdate: false });
    expect(changed).toHaveLength(9);
  });

  it("is idempotent", () => {
    vendorHasRun("grok", "kiro", "opencode", "kilo", "kimi", "copilot");
    syncVendorAutoUpdate(root, false, ALL);
    expect(syncVendorAutoUpdate(root, false, ALL)).toEqual([]);
  });

  it("skips a HOME config whose vendor has never run", () => {
    const changed = syncVendorAutoUpdate(root, false, [
      "grok",
      "kiro",
      "opencode",
      "kilo",
      "kimi",
      "copilot",
    ]);
    expect(changed).toEqual([]);
    expect(existsSync(join(root, "home"))).toBe(false);
  });

  it("declares no target for vendors without a config-file opt-out", () => {
    expect(
      vendorAutoUpdateTargets(root, [
        "antigravity",
        "pi",
        "commandcode",
        "cursor",
        "zcode",
        "hermes",
        "not-a-vendor",
      ]),
    ).toEqual([]);
  });

  it("keeps unrelated settings and JSONC comments", () => {
    write(
      ".claude/settings.json",
      '{\n  // keep me\n  "env": { "FOO": "bar" },\n  "model": "opus",\n}\n',
    );
    write(
      ".codex/config.toml",
      'model = "gpt-5"\n\n[mcp_servers.serena]\ncommand = "oma"\n',
    );
    write(HOME_FILES.opencode, '{\n  // theme\n  "theme": "system"\n}\n');

    syncVendorAutoUpdate(root, false, ["claude", "codex", "opencode"]);

    const claude = text(".claude/settings.json");
    expect(claude).toContain("// keep me");
    expect(claude).toContain('"FOO": "bar"');
    expect(claude).toContain('"DISABLE_AUTOUPDATER": "1"');
    expect(read(".codex/config.toml")).toEqual({
      model: "gpt-5",
      check_for_update_on_startup: false,
      mcp_servers: { serena: { command: "oma" } },
    });
    const opencode = text(HOME_FILES.opencode);
    expect(opencode).toContain("// theme");
    expect(opencode).toContain('"update": "disable"');
  });

  it("writes the opencode opt-out into an existing opencode.json", () => {
    write("home/.config/opencode/opencode.json", '{ "theme": "system" }\n');
    const changed = syncVendorAutoUpdate(root, false, ["opencode"]);
    expect(changed).toEqual([
      join(root, "home/.config/opencode/opencode.json"),
    ]);
    expect(existsSync(join(root, HOME_FILES.opencode))).toBe(false);
  });

  it("removes only the opt-outs oma wrote when re-enabled", () => {
    vendorHasRun("grok", "kiro", "opencode", "kilo", "kimi", "copilot");
    syncVendorAutoUpdate(root, false, ALL);
    write(
      ".claude/settings.json",
      '{ "env": { "DISABLE_AUTOUPDATER": "1", "FOO": "bar" } }\n',
    );

    const changed = syncVendorAutoUpdate(root, true, ALL);

    expect(changed).toHaveLength(9);
    expect(read(".claude/settings.json")).toEqual({ env: { FOO: "bar" } });
    expect(read(".codex/config.toml")).toEqual({});
    // An emptied parent table is dropped with the key.
    expect(read(".qwen/settings.json")).toEqual({});
    expect(read(HOME_FILES.grok)).toEqual({});
    expect(read(HOME_FILES.kiro)).toEqual({});
    expect(read(HOME_FILES.opencode)).toEqual({});
    expect(read(HOME_FILES.kilo)).toEqual({});
    expect(read(HOME_FILES.kimi)).toEqual({});
    expect(read(HOME_FILES.copilot)).toEqual({});
  });

  it("keeps a user's own update setting when re-enabled", () => {
    write(HOME_FILES.opencode, '{ "update": "auto" }\n');
    write(HOME_FILES.kilo, '{ "autoupdate": "notify" }\n');
    write(HOME_FILES.grok, "[cli]\nauto_update = true\n");
    write(
      ".claude/settings.json",
      '{ "env": { "DISABLE_AUTOUPDATER": "0" } }\n',
    );

    expect(
      syncVendorAutoUpdate(root, true, ["opencode", "kilo", "grok", "claude"]),
    ).toEqual([]);
    expect(read(HOME_FILES.opencode)).toEqual({ update: "auto" });
    expect(read(HOME_FILES.kilo)).toEqual({ autoupdate: "notify" });
    expect(read(HOME_FILES.grok)).toEqual({ cli: { auto_update: true } });
  });

  it("never creates a file when re-enabled", () => {
    vendorHasRun("grok", "copilot");
    expect(
      syncVendorAutoUpdate(root, true, ["claude", "codex", "grok", "copilot"]),
    ).toEqual([]);
    expect(existsSync(join(root, ".claude"))).toBe(false);
    expect(existsSync(join(root, HOME_FILES.grok))).toBe(false);
  });

  it("reports the plan without writing under dryRun", () => {
    const changed = syncVendorAutoUpdate(root, false, ["claude", "codex"], {
      dryRun: true,
    });
    expect(changed).toEqual([
      join(root, ".claude/settings.json"),
      join(root, ".codex/config.toml"),
    ]);
    expect(existsSync(join(root, ".claude"))).toBe(false);
    expect(existsSync(join(root, ".codex"))).toBe(false);
  });

  it("targets the user config of project-capable vendors in a global install", () => {
    mkdirSync(join(root, "home/.claude"), { recursive: true });
    mkdirSync(join(root, "home/.codex"), { recursive: true });

    const changed = syncVendorAutoUpdate(
      root,
      false,
      ["claude", "codex", "qwen"],
      {
        global: true,
      },
    );

    // ~/.qwen does not exist, so qwen is skipped.
    expect(changed).toEqual([
      join(root, "home/.claude/settings.json"),
      join(root, "home/.codex/config.toml"),
    ]);
    expect(existsSync(join(root, ".claude"))).toBe(false);
  });

  it("skips a config that does not parse and still handles the others", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    write(".codex/config.toml", "this is = = not toml\n");

    const changed = syncVendorAutoUpdate(root, false, ["codex", "claude"]);

    expect(changed).toEqual([join(root, ".claude/settings.json")]);
    expect(text(".codex/config.toml")).toBe("this is = = not toml\n");
    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining(join(root, ".codex/config.toml")),
    );
  });
});
