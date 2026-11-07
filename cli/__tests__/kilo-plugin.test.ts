import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CLI_DEFINITIONS } from "../commands/doctor/environment-checks.js";
import { resolveUpdateVendors } from "../commands/update/vendors.js";
import {
  isOpencodeFamily,
  OPENCODE_FAMILY_HOSTS,
  OPENCODE_FAMILY_VENDORS,
} from "../constants/opencode-family.js";
import {
  _resetInstallContext,
  setInstallContext,
} from "../platform/install-context.js";
import {
  installOpencodePlugin,
  OPENCODE_PLUGIN_ENTRY,
  opencodeFamilyConfigDir,
  opencodeFamilyConfigPath,
  registerOpencodePlugin,
} from "../platform/opencode-plugin-composer.js";

const REPO_ROOT = join(__dirname, "../..");
const KILO_PLUGIN_DIR = join(".kilo", "plugins", "oma");

describe("opencode-family host table", () => {
  it("lists opencode and kilo with their native names", () => {
    expect(OPENCODE_FAMILY_VENDORS).toEqual(["opencode", "kilo"]);
    expect(OPENCODE_FAMILY_HOSTS.kilo).toMatchObject({
      projectDir: ".kilo",
      configDirName: "kilo",
      configBasename: "kilo",
      schema: "https://app.kilo.ai/config.json",
      binary: "kilo",
      autoApproveFlag: "--auto",
      installHint: "npm install -g @kilocode/cli",
    });
    // opencode's values are the literals the composer used before the table.
    expect(OPENCODE_FAMILY_HOSTS.opencode).toMatchObject({
      projectDir: ".opencode",
      configDirName: "opencode",
      schema: "https://opencode.ai/config.json",
      binary: "opencode",
      autoApproveFlag: "--dangerously-skip-permissions",
    });
  });

  it("recognizes only family members", () => {
    expect(isOpencodeFamily("opencode")).toBe(true);
    expect(isOpencodeFamily("kilo")).toBe(true);
    for (const other of ["pi", "claude", "toString", "", undefined]) {
      expect(isOpencodeFamily(other)).toBe(false);
    }
  });
});

describe("installOpencodePlugin (kilo)", () => {
  let target: string;

  beforeEach(() => {
    target = mkdtempSync(join(tmpdir(), "oma-kilo-"));
  });
  afterEach(() => {
    rmSync(target, { recursive: true, force: true });
  });

  it("materializes the shared bridge and kilo-identified handler entries under .kilo/plugins/oma/", () => {
    installOpencodePlugin(REPO_ROOT, target, "kilo");
    const pluginDir = join(target, KILO_PLUGIN_DIR);
    for (const f of [
      "oma.ts",
      "keyword-detector.ts",
      "test-filter.ts",
      "filter-test-output.sh",
    ]) {
      expect(existsSync(join(pluginDir, f)), `missing ${f}`).toBe(true);
    }
    // The bridge is the opencode SSOT file, copied unchanged.
    expect(readFileSync(join(pluginDir, "oma.ts"), "utf-8")).toBe(
      readFileSync(
        join(REPO_ROOT, ".agents", "hooks", "variants", "opencode", "oma.ts"),
        "utf-8",
      ),
    );
    // Generated handler entries dispatch with the kilo vendor identity.
    const entry = readFileSync(join(pluginDir, "keyword-detector.ts"), "utf-8");
    expect(entry).toContain('"--vendor", "kilo"');
    expect(existsSync(join(target, ".opencode"))).toBe(false);
  });

  it("keeps opencode handler entries on the opencode identity", () => {
    installOpencodePlugin(REPO_ROOT, target);
    const entry = readFileSync(
      join(target, ".opencode", "plugins", "oma", "keyword-detector.ts"),
      "utf-8",
    );
    expect(entry).toContain('"--vendor", "opencode"');
    expect(existsSync(join(target, ".kilo"))).toBe(false);
  });
});

describe("registerOpencodePlugin (kilo)", () => {
  let target: string;

  beforeEach(() => {
    target = mkdtempSync(join(tmpdir(), "oma-kilo-cfg-"));
  });
  afterEach(() => {
    rmSync(target, { recursive: true, force: true });
  });

  const kiloJsonc = () => join(target, ".kilo", "kilo.jsonc");

  it("creates .kilo/kilo.jsonc with the bridge entry and Kilo $schema", () => {
    registerOpencodePlugin(target, "kilo");
    const cfg = JSON.parse(readFileSync(kiloJsonc(), "utf-8"));
    expect(cfg).toEqual({
      $schema: "https://app.kilo.ai/config.json",
      plugin: [OPENCODE_PLUGIN_ENTRY],
    });
    expect(existsSync(join(target, ".opencode"))).toBe(false);
  });

  it("is idempotent — byte-identical on rerun", () => {
    registerOpencodePlugin(target, "kilo");
    const first = readFileSync(kiloJsonc(), "utf-8");
    registerOpencodePlugin(target, "kilo");
    expect(readFileSync(kiloJsonc(), "utf-8")).toBe(first);
  });

  it("updates an existing .kilo/kilo.json in place, preserving keys", () => {
    mkdirSync(join(target, ".kilo"), { recursive: true });
    writeFileSync(
      join(target, ".kilo", "kilo.json"),
      JSON.stringify({ mcp: { x: { type: "remote", url: "u" } }, plugin: [] }),
    );
    registerOpencodePlugin(target, "kilo");
    expect(existsSync(kiloJsonc())).toBe(false);
    const cfg = JSON.parse(
      readFileSync(join(target, ".kilo", "kilo.json"), "utf-8"),
    );
    expect(cfg.plugin).toEqual([OPENCODE_PLUGIN_ENTRY]);
    expect(cfg.mcp).toEqual({ x: { type: "remote", url: "u" } });
    expect(cfg.$schema).toBe("https://app.kilo.ai/config.json");
  });

  it("leaves an unparseable kilo config untouched", () => {
    mkdirSync(join(target, ".kilo"), { recursive: true });
    writeFileSync(kiloJsonc(), "{ not json");
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    registerOpencodePlugin(target, "kilo");
    expect(readFileSync(kiloJsonc(), "utf-8")).toBe("{ not json");
    warn.mockRestore();
    error.mockRestore();
  });

  it("resolves config paths per host", () => {
    expect(opencodeFamilyConfigDir(target, "kilo", false)).toBe(
      join(target, ".kilo"),
    );
    expect(opencodeFamilyConfigDir(target, "kilo", true)).toBe(
      join(target, ".config", "kilo"),
    );
    expect(opencodeFamilyConfigDir(target, "opencode", true)).toBe(
      join(target, ".config", "opencode"),
    );
    expect(opencodeFamilyConfigPath(join(target, ".kilo"), "kilo")).toBe(
      join(target, ".kilo", "kilo.jsonc"),
    );
  });
});

describe("kilo global projection", () => {
  let root: string;
  let home: string;
  let oma: string;

  beforeEach(() => {
    root = mkdtempSync(join(tmpdir(), "oma-kilo-global-"));
    home = join(root, "native-home");
    oma = join(root, "oma-home");
    mkdirSync(home);
    mkdirSync(join(oma, ".agents", "hooks", "core"), { recursive: true });
    writeFileSync(
      join(oma, ".agents", "hooks", "core", "keyword-detector.ts"),
      "// fixture handler",
    );
    vi.stubEnv("OMA_HOME", oma);
    _resetInstallContext();
    setInstallContext({ mode: "global", installRoot: oma });
  });
  afterEach(() => {
    _resetInstallContext();
    vi.unstubAllEnvs();
    rmSync(root, { recursive: true, force: true });
  });

  it("projects the bridge and config into ~/.config/kilo with OMA_HOME pinned", () => {
    installOpencodePlugin(oma, home, "kilo");
    registerOpencodePlugin(home, "kilo");
    const dir = join(home, ".config", "kilo", "plugins", "oma");
    const generated = readdirSync(dir)
      .filter((name) => name.endsWith(".ts"))
      .map((name) => readFileSync(join(dir, name), "utf8"))
      .join("\n");
    expect(generated).toContain(`OMA_HOME: ${JSON.stringify(oma)}`);
    expect(existsSync(join(home, ".config", "kilo", "kilo.jsonc"))).toBe(true);
    expect(existsSync(join(home, ".kilo"))).toBe(false);
    expect(existsSync(join(oma, ".config"))).toBe(false);
  });
});

describe("kilo detection & UX surfaces", () => {
  let project: string;

  beforeEach(() => {
    project = mkdtempSync(join(tmpdir(), "oma-kilo-ux-"));
  });
  afterEach(() => {
    rmSync(project, { recursive: true, force: true });
  });

  it("lists kilo in the doctor CLI table with its binary and install hint", () => {
    expect(CLI_DEFINITIONS).toContainEqual([
      "kilo",
      "kilo",
      "npm install -g @kilocode/cli",
    ]);
  });

  it("detects a legacy kilo install from its .kilo marker during update", () => {
    mkdirSync(join(project, ".kilo"));
    expect(resolveUpdateVendors(project)).toContain("kilo");
    expect(resolveUpdateVendors(project, { vendor: "kilo" })).toEqual(["kilo"]);
  });
});
