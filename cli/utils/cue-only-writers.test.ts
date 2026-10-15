// A CUE-only project (`.agents/oma-config.cue`, no `oma-config.yaml`) is a
// supported layout. The config writers used to edit `.agents/oma-config.yaml`
// only: they created that file next to the CUE file, where the loader treats it
// as defaults beneath CUE, so a key the CUE file already set silently won over
// the user's new choice (or, for `oma memory keys`, refused to run at all).
// A saved choice must take effect without creating a second shared config.

import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { parse } from "yaml";
import { saveProviders } from "../commands/install/provider-preferences.js";
import { configureHonchoKey } from "../commands/memory/honcho-keys.js";
import { saveDevToolsBrowsers } from "../platform/browser-preferences.js";
import { loadDevToolsBrowsers } from "./config.js";
import { evaluateCueFile } from "./cue.js";
import { loadHonchoConfig, loadProviders } from "./providers.js";

vi.mock("./cue.js", () => ({ evaluateCueFile: vi.fn() }));
const { storeSecret } = vi.hoisted(() => ({
  storeSecret: vi.fn().mockResolvedValue({ overwrote: false }),
}));
vi.mock("../io/vault.js", () => ({ storeSecret }));
const { log } = vi.hoisted(() => ({
  log: { info: vi.fn(), warn: vi.fn() },
}));
vi.mock("@clack/prompts", () => ({ log }));

const CUE_TEXT = 'package config\n\nlanguage: "ko"\n';
const CUE_CONFIG = {
  language: "ko",
  model_preset: "auto",
  providers: { code_intelligence: "serena" },
  mcp: { devtools_browsers: ["chrome"] },
  honcho: { base_url: "https://honcho.example.com", workspace_id: "team" },
};

describe("CUE-only project config writers", () => {
  let root: string;
  let agents: string;

  beforeEach(() => {
    vi.clearAllMocks();
    root = mkdtempSync(join(tmpdir(), "oma-cue-writers-"));
    agents = join(root, ".agents");
    mkdirSync(agents, { recursive: true });
    // Isolate from the developer's real global install.
    vi.stubEnv("OMA_HOME", join(root, "global-home"));
    writeFileSync(join(agents, "oma-config.cue"), CUE_TEXT);
    vi.mocked(evaluateCueFile).mockReturnValue({
      success: true,
      data: CUE_CONFIG,
    });
  });

  afterEach(() => {
    rmSync(root, { recursive: true, force: true });
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  const shared = () => join(agents, "oma-config.yaml");
  const local = () => join(agents, "oma-config.local.yaml");

  it("makes a provider choice take effect over a provider set in CUE", () => {
    saveProviders(root, {
      providers: {
        web: "native",
        code_intelligence: "gortex",
        semantic_memory: "none",
      },
    });

    expect(loadProviders(root)).toMatchObject({
      code_intelligence: "gortex",
      semantic_memory: "none",
      web: "native",
    });
    expect(existsSync(shared())).toBe(false);
    expect(readFileSync(join(agents, "oma-config.cue"), "utf8")).toBe(CUE_TEXT);
  });

  it("writes only the keys CUE does not already resolve to the chosen value", () => {
    saveProviders(root, {
      providers: {
        web: "native",
        code_intelligence: "serena",
        semantic_memory: "honcho",
      },
      honcho: { base_url: "https://honcho.example.com", workspace_id: "team" },
    });

    // web: native is what an unset key already resolves to.
    expect(parse(readFileSync(local(), "utf8"))).toEqual({
      providers: { semantic_memory: "honcho" },
    });
    expect(loadProviders(root).code_intelligence).toBe("serena");
    expect(loadHonchoConfig(root).workspace_id).toBe("team");
  });

  it("creates no file when CUE and the defaults already hold every choice", () => {
    saveProviders(root, {
      providers: {
        web: "native",
        code_intelligence: "serena",
        semantic_memory: "agentmemory",
      },
    });
    saveDevToolsBrowsers(root, ["chrome"]);

    expect(existsSync(local())).toBe(false);
    expect(existsSync(shared())).toBe(false);
  });

  it("makes a browser selection take effect over mcp.devtools_browsers in CUE", () => {
    saveDevToolsBrowsers(root, ["aside"]);
    expect(loadDevToolsBrowsers(root)).toEqual(["aside"]);
    saveDevToolsBrowsers(root, []);
    expect(loadDevToolsBrowsers(root)).toEqual([]);
    expect(existsSync(shared())).toBe(false);
  });

  it("keeps comments and other keys of an existing local overlay", () => {
    writeFileSync(local(), "# machine settings\ntimezone: Asia/Seoul\n");
    saveDevToolsBrowsers(root, ["firefox"]);

    const text = readFileSync(local(), "utf8");
    expect(text).toContain("# machine settings");
    expect(parse(text)).toEqual({
      timezone: "Asia/Seoul",
      mcp: { devtools_browsers: ["firefox"] },
    });
  });

  // `oma install` saves these choices before ensureCueBinary runs, then reads
  // loadProviders(). A new local overlay makes a CUE evaluation failure fatal
  // for every config read, so it must not be created while CUE cannot load.
  it("keeps config reads working when CUE cannot be evaluated yet", () => {
    vi.mocked(evaluateCueFile).mockReturnValue({
      success: false,
      missingCli: true,
      error: "'cue' command not found in PATH",
    });
    vi.spyOn(console, "warn").mockImplementation(() => {});
    saveDevToolsBrowsers(root, ["aside"]);
    saveProviders(root, {
      providers: {
        web: "native",
        code_intelligence: "gortex",
        semantic_memory: "agentmemory",
      },
    });

    expect(() => loadProviders(root)).not.toThrow();
    expect(existsSync(local())).toBe(false);
    expect(existsSync(shared())).toBe(false);
    expect(log.warn).toHaveBeenCalledWith(
      expect.stringMatching(/mcp\.devtools_browsers was not saved/),
    );
    expect(log.warn).toHaveBeenCalledWith(
      expect.stringMatching(/providers\.code_intelligence.* not saved/),
    );
  });

  it("writes to the local overlay over a YAML fallback when CUE cannot be evaluated", () => {
    vi.mocked(evaluateCueFile).mockReturnValue({
      success: false,
      missingCli: true,
      error: "'cue' command not found in PATH",
    });
    vi.spyOn(console, "warn").mockImplementation(() => {});
    const yaml = "mcp:\n  devtools_browsers: [chrome]\n";
    writeFileSync(shared(), yaml);
    saveDevToolsBrowsers(root, ["aside"]);

    expect(parse(readFileSync(local(), "utf8"))).toEqual({
      mcp: { devtools_browsers: ["aside"] },
    });
    expect(loadDevToolsBrowsers(root)).toEqual(["aside"]);
    expect(readFileSync(shared(), "utf8")).toBe(yaml);
  });

  it("refuses rather than writing a second local overlay next to oma-config.local.cue", () => {
    writeFileSync(join(agents, "oma-config.local.cue"), "package config\n");
    expect(() => saveDevToolsBrowsers(root, ["aside"])).toThrow(
      /oma-config\.local\.cue.*mcp\.devtools_browsers/,
    );
    expect(existsSync(local())).toBe(false);
  });

  it("stores the Honcho connection key reference for a CUE-only project", async () => {
    const result = await configureHonchoKey({
      projectDir: root,
      fromEnv: "INPUT_KEY",
      env: { INPUT_KEY: "synthetic-test-key-only" },
    });
    if (!("name" in result)) throw new Error("Expected connection credential");

    expect(storeSecret).toHaveBeenCalledWith(
      result.name,
      "synthetic-test-key-only",
    );
    expect(result.configPath).toBe(local());
    expect(loadHonchoConfig(root)).toMatchObject({
      workspace_id: "team",
      api_key_vault: result.name,
    });
    expect(readFileSync(local(), "utf8")).not.toContain("synthetic");
    expect(existsSync(shared())).toBe(false);
  });

  it("reuses a vault reference already set in CUE without writing a file", async () => {
    vi.mocked(evaluateCueFile).mockReturnValue({
      success: true,
      data: {
        ...CUE_CONFIG,
        honcho: { ...CUE_CONFIG.honcho, api_key_vault: "team-key" },
      },
    });
    const result = await configureHonchoKey({
      projectDir: root,
      fromEnv: "INPUT_KEY",
      env: { INPUT_KEY: "synthetic-test-key-only" },
    });

    expect(storeSecret).toHaveBeenCalledWith(
      "team-key",
      "synthetic-test-key-only",
    );
    expect(result).toMatchObject({ name: "team-key" });
    expect(existsSync(local())).toBe(false);
    expect(existsSync(shared())).toBe(false);
  });
});
