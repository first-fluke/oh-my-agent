import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { parseFrontmatter } from "../../utils/frontmatter.js";
import {
  buildKimiManifest,
  emitKimiPlugin,
  KIMI_NAME_RE,
} from "./kimi-plugin.js";

const FIXTURES_REPO = path.resolve(import.meta.dirname, "__fixtures__", "repo");
const REPO_ROOT = path.resolve(import.meta.dirname, "../../..");

// Documented manifest surface
// (moonshotai.github.io/kimi-code/en/customization/plugins.html). Fields the
// runtime rejects (`tools`, `apps`, `inject`, `configFile`) are excluded.
const MANIFEST_FIELDS = new Set([
  "name",
  "version",
  "description",
  "keywords",
  "author",
  "homepage",
  "license",
  "interface",
  "skills",
  "agents",
  "commands",
  "mcpServers",
  "hooks",
  "sessionStart",
  "skillInstructions",
  "systemPrompt",
  "systemPromptPath",
]);
const INTERFACE_FIELDS = new Set([
  "displayName",
  "shortDescription",
  "longDescription",
  "developerName",
  "websiteURL",
  "defaultLocale",
  "locales",
  "mcpOverrides",
  "skillOverrides",
]);
const KIMI_HOOK_EVENTS = new Set([
  "UserPromptSubmit",
  "UserPromptQueued",
  "PreToolUse",
  "Stop",
  "TurnStarted",
  "PostToolUse",
  "PostToolUseFailure",
  "PermissionRequest",
  "PermissionResult",
  "SessionStart",
  "SessionEnd",
  "SessionHeartbeat",
  "SubagentStart",
  "SubagentStop",
  "TaskStarted",
  "StopFailure",
  "Interrupt",
  "PreCompact",
  "PostCompact",
  "Notification",
]);

function isPluginPath(value: unknown): boolean {
  return (
    typeof value === "string" && value.startsWith("./") && !value.includes("..")
  );
}

function manifestProblems(manifest: Record<string, unknown>): string[] {
  const problems: string[] = [];
  if (!KIMI_NAME_RE.test(String(manifest.name)))
    problems.push(`bad name ${manifest.name}`);
  for (const key of Object.keys(manifest))
    if (!MANIFEST_FIELDS.has(key)) problems.push(`unknown field ${key}`);
  for (const key of ["skills", "agents", "commands"]) {
    const value = manifest[key];
    if (value === undefined) continue;
    const list = Array.isArray(value) ? value : [value];
    for (const item of list)
      if (!isPluginPath(item))
        problems.push(`${key}: ${item} must be a ./ path`);
  }
  const iface = manifest.interface as Record<string, unknown> | undefined;
  for (const key of Object.keys(iface ?? {}))
    if (!INTERFACE_FIELDS.has(key)) problems.push(`interface.${key} unknown`);
  const servers = manifest.mcpServers as Record<
    string,
    Record<string, unknown>
  >;
  for (const [name, server] of Object.entries(servers ?? {})) {
    const stdio = typeof server.command === "string";
    const http = typeof server.url === "string";
    if (!stdio && !http) problems.push(`mcpServers.${name}: command or url`);
    if (stdio && server.cwd !== undefined && !isPluginPath(server.cwd))
      problems.push(`mcpServers.${name}: cwd must be a ./ path`);
  }
  const hooks = manifest.hooks as Array<Record<string, unknown>> | undefined;
  for (const hook of hooks ?? []) {
    if (!KIMI_HOOK_EVENTS.has(String(hook.event)))
      problems.push(`hook event ${hook.event} unsupported`);
    for (const key of Object.keys(hook))
      if (!["event", "matcher", "command", "timeout"].includes(key))
        problems.push(`hook field ${key} not allowed`);
  }
  return problems;
}

describe("buildKimiManifest", () => {
  it("stays within the documented manifest surface", () => {
    const manifest = buildKimiManifest(FIXTURES_REPO);
    expect(manifestProblems(manifest)).toEqual([]);
    expect(manifest).toMatchObject({
      name: "oma",
      version: "0.0.1",
      author: "Fixture Author",
      license: "MIT",
      skills: ["./skills"],
      agents: ["./.agents/agents/fixture-agent.md"],
      interface: {
        displayName: "oh-my-agent",
        developerName: "Fixture Author",
        websiteURL: "https://example.test/fixture-repo",
        defaultLocale: "en-US",
      },
    });
    expect(manifest.keywords).toContain("kimi");
    // Plugin hooks run from the per-user managed copy for every project, so
    // the project-scoped Claude hook scripts are not advertised here.
    expect(manifest).not.toHaveProperty("hooks");
    expect(manifest).not.toHaveProperty("systemPromptPath");
    expect(
      (manifest.mcpServers as Record<string, unknown>)["good-http"],
    ).toEqual({ type: "http", url: "https://example.com/mcp" });
  });

  it("accepts dotted and scoped ids but not slashes", () => {
    expect(KIMI_NAME_RE.test("oma")).toBe(true);
    expect(KIMI_NAME_RE.test("com.firstfluke.oma@beta")).toBe(true);
    expect(KIMI_NAME_RE.test("first-fluke/oma")).toBe(false);
  });

  it("flags unsupported fields through the surface check itself", () => {
    expect(
      manifestProblems({
        name: "x",
        tools: [],
        skills: ["skills"],
        hooks: [{ event: "PreInvocation", command: "true", async: true }],
      }),
    ).toEqual([
      "unknown field tools",
      "skills: skills must be a ./ path",
      "hook event PreInvocation unsupported",
      "hook field async not allowed",
    ]);
  });
});

describe("emitKimiPlugin", () => {
  let outDir: string;
  afterEach(() => {
    if (outDir) rmSync(outDir, { recursive: true, force: true });
  });

  it("writes plugin.json into the given directory", () => {
    outDir = mkdtempSync(path.join(tmpdir(), "oma-emit-kimi-"));
    const report = emitKimiPlugin(FIXTURES_REPO, outDir);
    expect(report.manifestPath).toBe(path.join(outDir, "plugin.json"));
    expect(report.agents).toEqual(["fixture-agent"]);
    expect(report.mcp.servers).toContain("good-stdio");
    expect(existsSync(report.manifestPath)).toBe(true);
  });

  it("references real-repo skills and Kimi-compatible agent files", () => {
    outDir = mkdtempSync(path.join(tmpdir(), "oma-emit-kimi-repo-"));
    emitKimiPlugin(REPO_ROOT, outDir);
    const manifest = JSON.parse(
      readFileSync(path.join(outDir, "plugin.json"), "utf8"),
    );
    expect(manifestProblems(manifest)).toEqual([]);
    for (const dir of manifest.skills)
      expect(existsSync(path.join(REPO_ROOT, dir, "oma-pm", "SKILL.md"))).toBe(
        true,
      );
    for (const file of manifest.agents) {
      const { frontmatter, body } = parseFrontmatter(
        readFileSync(path.join(REPO_ROOT, file), "utf8"),
      );
      // Kimi agents: kebab-case name (or filename), required description,
      // Markdown body as the system prompt; unknown keys are ignored.
      expect(String(frontmatter.name)).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
      expect(typeof frontmatter.description).toBe("string");
      expect(body.trim().length).toBeGreaterThan(0);
    }
  });
});
