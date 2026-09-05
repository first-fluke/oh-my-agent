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
import { parse } from "smol-toml";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { setInstallContext } from "../../platform/install-context.js";
import { loadDevToolsBrowsers } from "../../utils/config.js";
import { ensureAsideInstalled } from "../../vendors/aside.js";
import { updateMcp } from "./mcp.js";

const prompt = vi.hoisted(() => vi.fn());
vi.mock("../../platform/browser-prompts.js", () => ({
  promptDevToolsBrowsers: prompt,
}));
vi.mock("@clack/prompts", () => ({ log: { success: vi.fn() } }));
let root: string;
beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), "oma-update-mcp-"));
  vi.stubEnv("HERMES_HOME", join(root, "test-home", ".hermes"));
  mkdirSync(join(root, ".agents", "skills"), { recursive: true });
  writeFileSync(
    join(root, ".agents", "oma-config.yaml"),
    "language: ko\nvendors: [codex, claude]\n",
  );
  setInstallContext({ installRoot: root, mode: "project" });
  prompt.mockReset();
  vi.mocked(ensureAsideInstalled).mockReset();
});
afterEach(() => {
  vi.unstubAllEnvs();
  rmSync(root, { recursive: true, force: true });
});

it("saves selection and updates recorded vendors without downloading a release", async () => {
  prompt.mockResolvedValue(["aside", "firefox"]);
  await updateMcp();
  expect(prompt).toHaveBeenCalledWith(
    expect.any(Boolean),
    expect.any(Function),
    ["aside"],
  );
  expect(loadDevToolsBrowsers(root)).toEqual(["aside", "firefox"]);
  expect(existsSync(join(root, "test-home", ".hermes", "config.yaml"))).toBe(
    false,
  );
  expect(existsSync(join(root, ".pi", "settings.json"))).toBe(false);
  const config = parse(
    readFileSync(join(root, ".codex", "config.toml"), "utf-8"),
  );
  expect(config.mcp_servers).toMatchObject({
    aside: { command: "aside", args: ["mcp"] },
  });
  prompt.mockResolvedValue([]);
  await updateMcp();
  expect(prompt).toHaveBeenLastCalledWith(
    expect.any(Boolean),
    expect.any(Function),
    ["aside", "firefox"],
  );
  expect(loadDevToolsBrowsers(root)).toEqual([]);
  expect(
    JSON.parse(readFileSync(join(root, ".mcp.json"), "utf-8")).mcpServers,
  ).toEqual({});
});

it("does not change preferences when a vendor config is malformed", async () => {
  mkdirSync(join(root, ".codex"));
  writeFileSync(join(root, ".codex", "config.toml"), "[broken");
  prompt.mockResolvedValue(["aside"]);
  await expect(updateMcp({ yes: true })).rejects.toThrow();
  expect(loadDevToolsBrowsers(root)).toBeUndefined();
});

it.each([
  ["opencode", "opencode.jsonc"],
  ["pi", ".pi/mcp.json"],
  ["copilot", ".github/mcp.json"],
  ["commandcode", ".mcp.json"],
  ["hermes", "test-home/.hermes/config.yaml"],
  ["zcode", ".zcode/config.json"],
])("update mcp reaches recorded %s installations", async (vendor, path) => {
  writeFileSync(
    join(root, ".agents/oma-config.yaml"),
    `language: ko\nvendors: [${vendor}]\n`,
  );
  prompt.mockResolvedValue(["aside"]);
  await updateMcp({ yes: true });
  expect(readFileSync(join(root, path), "utf-8")).toContain("aside");
  expect(existsSync(join(root, ".codex/config.toml"))).toBe(false);
  if (vendor === "pi")
    expect(readFileSync(join(root, ".pi/settings.json"), "utf-8")).toContain(
      "npm:pi-mcp-adapter",
    );
});

vi.mock("../../vendors/aside.js", () => ({
  ensureAsideInstalled: vi.fn(),
  resolveAsideCommand: () => "aside",
}));

it("leaves preferences and vendor configurations untouched when Aside installation fails", async () => {
  prompt.mockResolvedValue(["aside"]);
  vi.mocked(ensureAsideInstalled).mockRejectedValueOnce(
    new Error("Aside installation failed"),
  );
  await expect(updateMcp()).rejects.toThrow("Aside installation failed");
  expect(loadDevToolsBrowsers(root)).toBeUndefined();
  expect(existsSync(join(root, ".codex/config.toml"))).toBe(false);
  expect(existsSync(join(root, ".mcp.json"))).toBe(false);
  await updateMcp(); // Failure also releases the install lock.
  expect(loadDevToolsBrowsers(root)).toEqual(["aside"]);
});
