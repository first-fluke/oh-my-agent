import { describe, expect, it } from "vitest";
import {
  getVendorCapabilities,
  VENDOR_CAPABILITIES,
} from "./vendor-capabilities.js";
import { ALL_CLI_VENDORS, CLI_SKILLS_DIR } from "./vendors.js";

describe("vendor capabilities", () => {
  it("covers every linkable vendor and excludes retired Gemini", () => {
    expect(Object.keys(VENDOR_CAPABILITIES).sort()).toEqual(
      [...ALL_CLI_VENDORS].sort(),
    );
    expect(getVendorCapabilities("gemini")).toBeUndefined();
    expect(getVendorCapabilities("antigravity")?.hooks.kind).toBe("settings");
  });

  it("keeps skill projection destinations aligned with install-mode paths", () => {
    for (const [vendor, paths] of Object.entries(CLI_SKILLS_DIR)) {
      const capabilities = getVendorCapabilities(vendor);
      expect(capabilities?.skills.projectDir).toBe(paths.projectPath);
      expect(capabilities?.skills.globalDir).toBe(paths.homePath);
    }
    expect(getVendorCapabilities("pi")?.skills).toEqual({
      native: true,
      projectDir: ".agents/skills",
      globalDir: ".agents/skills",
    });
  });

  it("distinguishes hook-file vendors, extension bridges, and skill-only hosts", () => {
    expect(getVendorCapabilities("copilot")).toMatchObject({
      agents: { dir: ".github/agents" },
      hooks: {
        kind: "settings",
        variant: ".agents/hooks/variants/copilot.json",
      },
    });
    expect(getVendorCapabilities("pi")?.hooks).toEqual({
      kind: "extension",
      variant: null,
    });
    expect(getVendorCapabilities("hermes")?.hooks.kind).toBe("none");
    expect(getVendorCapabilities("grok")?.skills.projectDir).toBeNull();
    expect(getVendorCapabilities("zcode")?.skills.projectDir).toBeNull();
  });

  it("treats kilo as an opencode-family extension host with native skills", () => {
    expect(getVendorCapabilities("kilo")).toEqual({
      skills: {
        native: true,
        projectDir: ".agents/skills",
        globalDir: ".agents/skills",
      },
      agents: { dir: ".kilo/agents" },
      hooks: { kind: "extension", variant: null },
      plugins: { manifest: "opencode-package/package.json" },
    });
    // No skill symlink projection: kilo reads .agents/skills natively.
    expect(Object.hasOwn(CLI_SKILLS_DIR, "kilo")).toBe(false);
  });

  it("records the root Agent Plugins package for every host that installs it", () => {
    for (const vendor of ["copilot", "kiro", "qwen", "hermes"]) {
      expect(getVendorCapabilities(vendor)?.plugins.manifest).toBe(
        "plugin.json",
      );
    }
    expect(getVendorCapabilities("codex")?.plugins.manifest).toBe(
      "codex-plugin/plugin.json",
    );
    expect(getVendorCapabilities("claude")?.plugins.manifest).toBe(
      ".claude-plugin/plugin.json",
    );
  });

  it("records a package manifest for every emitted native-manifest host", () => {
    expect(getVendorCapabilities("antigravity")?.plugins.manifest).toBe(
      "antigravity-plugin/plugin.json",
    );
    expect(getVendorCapabilities("grok")?.plugins.manifest).toBe(
      ".grok-plugin/plugin.json",
    );
    expect(getVendorCapabilities("zcode")?.plugins.manifest).toBe(
      ".zcode-plugin/plugin.json",
    );
    expect(getVendorCapabilities("kimi")?.plugins.manifest).toBe(
      ".kimi-plugin/plugin.json",
    );
  });

  it("points the JavaScript extension hosts at their emitted packages", () => {
    // opencode and kilo share one npm plugin; commandcode ships a mod package.
    expect(getVendorCapabilities("opencode")?.plugins.manifest).toBe(
      "opencode-package/package.json",
    );
    expect(getVendorCapabilities("kilo")?.plugins.manifest).toBe(
      getVendorCapabilities("opencode")?.plugins.manifest,
    );
    expect(getVendorCapabilities("commandcode")?.plugins.manifest).toBe(
      "commandcode-mod/package.json",
    );
  });

  it("does not resolve inherited object properties as vendors", () => {
    expect(getVendorCapabilities("constructor")).toBeUndefined();
    expect(getVendorCapabilities("__proto__")).toBeUndefined();
  });
});
