import { spawnSync } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
} from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { parseFrontmatter } from "../../utils/frontmatter.js";
import {
  ANTIGRAVITY_DESCRIPTION,
  ANTIGRAVITY_SCHEMA_URL,
  antigravityMcpServers,
  antigravityRuleFrontmatter,
  buildAntigravityManifest,
  emitAntigravityPlugin,
} from "./antigravity.js";

const FIXTURES_REPO = path.resolve(import.meta.dirname, "__fixtures__", "repo");
const REPO_ROOT = path.resolve(import.meta.dirname, "../../..");
// Published schema (https://antigravity.google/schemas/v1/plugin.json),
// stored verbatim so the manifest shape is asserted offline.
const SCHEMA = JSON.parse(
  readFileSync(
    path.join(
      import.meta.dirname,
      "__fixtures__",
      "antigravity-plugin.schema.json",
    ),
    "utf8",
  ),
) as {
  required: string[];
  additionalProperties: boolean;
  properties: Record<
    string,
    {
      type?: string;
      pattern?: string;
      maxItems?: number;
      anyOf?: Array<{ type?: string; pattern?: string }>;
      items?: { type?: string; pattern?: string };
      deprecated?: boolean;
    }
  >;
};

/**
 * Minimal structural check against the published schema: required keys,
 * closed property set, declared types, string patterns, array item types and
 * maxItems, and the `logo` / `author` alternatives.
 */
function schemaProblems(manifest: Record<string, unknown>): string[] {
  const problems: string[] = [];
  for (const key of SCHEMA.required)
    if (!(key in manifest)) problems.push(`missing required ${key}`);
  for (const [key, value] of Object.entries(manifest)) {
    const spec = SCHEMA.properties[key];
    if (!spec) {
      if (SCHEMA.additionalProperties === false)
        problems.push(`unknown key ${key}`);
      continue;
    }
    if (spec.deprecated) problems.push(`deprecated key ${key}`);
    if (spec.type === "string" && typeof value !== "string")
      problems.push(`${key} must be a string`);
    if (spec.type === "boolean" && typeof value !== "boolean")
      problems.push(`${key} must be a boolean`);
    if (spec.type === "array") {
      if (!Array.isArray(value)) {
        problems.push(`${key} must be an array`);
        continue;
      }
      if (spec.maxItems !== undefined && value.length > spec.maxItems)
        problems.push(`${key} exceeds maxItems ${spec.maxItems}`);
      for (const item of value) {
        if (spec.items?.type === "string" && typeof item !== "string")
          problems.push(`${key} items must be strings`);
        if (
          spec.items?.pattern &&
          typeof item === "string" &&
          !new RegExp(spec.items.pattern).test(item)
        )
          problems.push(`${key} item "${item}" fails pattern`);
      }
    }
    if (spec.pattern && typeof value === "string") {
      if (!new RegExp(spec.pattern).test(value))
        problems.push(`${key} "${value}" fails pattern ${spec.pattern}`);
    }
    if (spec.anyOf && key === "logo" && typeof value === "string") {
      const ok = spec.anyOf.some(
        (alt) => alt.pattern && new RegExp(alt.pattern).test(value),
      );
      if (!ok) problems.push(`logo "${value}" matches no alternative`);
    }
    if (key === "author" && value && typeof value === "object") {
      for (const field of Object.keys(value as object))
        if (!["name", "email", "url"].includes(field))
          problems.push(`author.${field} is not allowed`);
    }
  }
  return problems;
}

describe("buildAntigravityManifest", () => {
  it("conforms to the published plugin.json schema", () => {
    const manifest = buildAntigravityManifest(FIXTURES_REPO);
    expect(schemaProblems(manifest)).toEqual([]);
    expect(manifest).toMatchObject({
      $schema: ANTIGRAVITY_SCHEMA_URL,
      name: "oma",
      displayName: "oh-my-agent",
      version: "0.0.1",
      logo: "assets/logo.png",
      license: "MIT",
      author: { name: "Fixture Author", url: "https://github.com/first-fluke" },
    });
    expect(manifest.suggestedPrompts).toHaveLength(3);
    expect(manifest).not.toHaveProperty("hooks");
    expect(manifest).not.toHaveProperty("mcpServers");
  });

  it("keeps the marketplace description inside the 120-160 character window", () => {
    expect(ANTIGRAVITY_DESCRIPTION.length).toBeGreaterThanOrEqual(120);
    expect(ANTIGRAVITY_DESCRIPTION.length).toBeLessThanOrEqual(160);
    expect(ANTIGRAVITY_DESCRIPTION).not.toMatch(
      /^(Antigravity|Gemini|Claude|Cursor)/,
    );
  });

  it("rejects unknown keys through the schema check itself", () => {
    expect(schemaProblems({ name: "oma", hooks: "./hooks.json" })).toEqual([
      "unknown key hooks",
    ]);
    expect(schemaProblems({ name: "bad name" })).toHaveLength(1);
  });
});

describe("antigravityRuleFrontmatter", () => {
  const base = { id: "r", description: "d", body: "" };
  it("maps always-on, glob, and model-decision triggers", () => {
    expect(
      antigravityRuleFrontmatter({ ...base, globs: [], alwaysApply: true }),
    ).toEqual({ trigger: "always_on", description: "d" });
    expect(
      antigravityRuleFrontmatter({
        ...base,
        globs: ["**/*.tf", "**/*.tfvars"],
        alwaysApply: false,
      }),
    ).toEqual({
      trigger: "glob",
      globs: "**/*.tf, **/*.tfvars",
      description: "d",
    });
    expect(
      antigravityRuleFrontmatter({ ...base, globs: [], alwaysApply: false }),
    ).toEqual({ trigger: "model_decision", description: "d" });
  });
});

describe("antigravityMcpServers", () => {
  it("drops the explicit transport type the validator flags", () => {
    expect(
      antigravityMcpServers({
        remote: { type: "http", url: "https://x.test/mcp" },
        local: { command: "echo", args: ["hi"] },
      }),
    ).toEqual({
      remote: { url: "https://x.test/mcp" },
      local: { command: "echo", args: ["hi"] },
    });
  });
});

describe("emitAntigravityPlugin", () => {
  let outDir: string;
  afterEach(() => {
    if (outDir) rmSync(outDir, { recursive: true, force: true });
  });

  it("emits a self-contained package with skills, agents, rules, and mcp_config", () => {
    outDir = mkdtempSync(path.join(tmpdir(), "oma-emit-agy-"));
    const report = emitAntigravityPlugin(FIXTURES_REPO, outDir);
    expect(report.target).toBe("antigravity-plugin");
    expect(report.skills).toHaveLength(4);
    expect(report.agents).toEqual(["fixture-agent"]);
    expect(report.rules).toEqual(["fixture-rule"]);
    expect(report.mcp.servers).toContain("good-stdio");

    expect(readdirSync(path.join(outDir, "skills")).sort()).toEqual([
      "folded-desc-skill",
      "invalid-skill",
      "oversized-skill",
      "valid-skill",
    ]);
    const agent = parseFrontmatter(
      readFileSync(path.join(outDir, "agents", "fixture-agent.md"), "utf8"),
    );
    expect(agent.frontmatter).toEqual({
      name: "fixture-agent",
      description: "Fixture agent used for oma emit tests.",
    });
    expect(agent.body.trim()).toBe("# Fixture Agent");

    const rule = parseFrontmatter(
      readFileSync(path.join(outDir, "rules", "fixture-rule.md"), "utf8"),
    );
    expect(rule.frontmatter).toEqual({
      trigger: "glob",
      globs: "**/*.fixture",
      description: "Fixture rule for oma emit tests",
    });
    expect(existsSync(path.join(outDir, "rules", "AGENTS.md"))).toBe(true);

    const mcp = JSON.parse(
      readFileSync(path.join(outDir, "mcp_config.json"), "utf8"),
    );
    expect(mcp.mcpServers["good-http"]).toEqual({
      url: "https://example.com/mcp",
    });
    expect(mcp.mcpServers["good-stdio"]).not.toHaveProperty("available_tools");
    expect(existsSync(path.join(outDir, "hooks.json"))).toBe(false);
    expect(existsSync(path.join(outDir, "README.md"))).toBe(true);

    // The fixture repo has no logo, so the manifest must not point at one.
    const manifest = JSON.parse(
      readFileSync(path.join(outDir, "plugin.json"), "utf8"),
    );
    expect(manifest).not.toHaveProperty("logo");
    expect(schemaProblems(manifest)).toEqual([]);
  });

  it("replaces a stale tree instead of merging into it", () => {
    outDir = mkdtempSync(path.join(tmpdir(), "oma-emit-agy-stale-"));
    emitAntigravityPlugin(FIXTURES_REPO, outDir);
    const stale = path.join(outDir, "skills", "removed-skill");
    mkdirSync(stale, { recursive: true });
    emitAntigravityPlugin(FIXTURES_REPO, outDir);
    expect(existsSync(stale)).toBe(false);
  });

  it("emits the real repository package with a bundled logo and every agent", () => {
    outDir = mkdtempSync(path.join(tmpdir(), "oma-emit-agy-repo-"));
    const report = emitAntigravityPlugin(REPO_ROOT, outDir);
    expect(report.failCount).toBe(0);
    expect(report.agents.length).toBeGreaterThanOrEqual(12);
    expect(existsSync(path.join(outDir, "assets", "logo.png"))).toBe(true);
    const manifest = JSON.parse(
      readFileSync(path.join(outDir, "plugin.json"), "utf8"),
    );
    expect(schemaProblems(manifest)).toEqual([]);
    const frontend = parseFrontmatter(
      readFileSync(path.join(outDir, "rules", "frontend.md"), "utf8"),
    );
    expect(frontend.frontmatter.globs).toBe(
      "**/*.tsx, **/*.jsx, **/*.css, **/*.scss",
    );

    // Real validation when the Antigravity CLI is installed; `validate` only
    // reads the directory and never touches the user's plugin profile.
    const probe = spawnSync("agy", ["--version"], { encoding: "utf8" });
    if (probe.error || probe.status !== 0) return;
    const result = spawnSync(
      "agy",
      ["plugin", "validate", "--strict", "--json", outDir],
      { encoding: "utf8" },
    );
    expect(result.status, result.stdout + result.stderr).toBe(0);
    const parsed = JSON.parse(result.stdout);
    expect(parsed.findings).toEqual([]);
    expect(parsed.components.skills).toBe(report.skills.length);
    expect(parsed.components.agents).toBe(report.agents.length);
  });
});
