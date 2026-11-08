import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  buildClaudeStyleMcpServers,
  expandGlobBraces,
  listAgentFiles,
  readAgents,
  readPackageMetadata,
  readRules,
  splitGlobList,
} from "./native-manifest.js";

const FIXTURES_REPO = path.resolve(import.meta.dirname, "__fixtures__", "repo");

describe("readPackageMetadata", () => {
  it("normalizes package.json with shared defaults", () => {
    const pkg = readPackageMetadata(FIXTURES_REPO);
    expect(pkg).toEqual({
      description: "Fixture repo for oma emit tests",
      version: "0.0.1",
      homepage: "https://example.test/fixture-repo",
      license: "MIT",
      keywords: ["multi-agent", "orchestrator", "skills", "workflows"],
      author: { name: "Fixture Author" },
    });
  });

  it("falls back to the canonical listing copy without a package.json", () => {
    const pkg = readPackageMetadata(path.join(FIXTURES_REPO, "nope"));
    expect(pkg.version).toBe("0.0.0");
    expect(pkg.description).toMatch(/^Portable, vendor-agnostic agent harness/);
    expect(pkg.author.name).toBe("First Fluke");
  });
});

describe("agents and rules", () => {
  it("lists only top-level agent markdown files", () => {
    expect(listAgentFiles(FIXTURES_REPO)).toEqual(["fixture-agent.md"]);
    expect(readAgents(FIXTURES_REPO)).toEqual([
      {
        id: "fixture-agent",
        name: "fixture-agent",
        description: "Fixture agent used for oma emit tests.",
        skills: [],
        body: "# Fixture Agent",
      },
    ]);
  });

  it("parses rule frontmatter and expands glob braces", () => {
    expect(readRules(FIXTURES_REPO)).toEqual([
      {
        id: "fixture-rule",
        description: "Fixture rule for oma emit tests",
        globs: ["**/*.fixture"],
        alwaysApply: false,
        body: "# Fixture Rule\n\nBody content.",
      },
    ]);
  });

  it("expands brace sets and keeps braces together when splitting lists", () => {
    expect(expandGlobBraces("**/*.{tsx,jsx, css}")).toEqual([
      "**/*.tsx",
      "**/*.jsx",
      "**/*.css",
    ]);
    expect(expandGlobBraces("**/*.arb")).toEqual(["**/*.arb"]);
    expect(splitGlobList("**/*.{tf,tfvars}, docs/**/*.md")).toEqual([
      "**/*.{tf,tfvars}",
      "docs/**/*.md",
    ]);
    expect(splitGlobList("")).toEqual([]);
  });
});

describe("buildClaudeStyleMcpServers", () => {
  it("converts stdio and remote servers and drops oma-only keys", () => {
    const result = buildClaudeStyleMcpServers(FIXTURES_REPO);
    // Unlike the Agent Plugins spec, the Claude-style shape has no
    // loopback-only rule for plain http, so insecure-http converts too.
    expect(result?.servers).toEqual([
      "good-stdio",
      "good-http",
      "loopback-http",
      "insecure-http",
    ]);
    expect(result?.mcpServers["good-stdio"]).toEqual({
      command: "echo",
      args: ["hello"],
      env: { FIXTURE: "1" },
    });
    expect(result?.mcpServers["good-http"]).toEqual({
      type: "http",
      url: "https://example.com/mcp",
    });
    expect(result?.mcpServers["loopback-http"]).toEqual({
      type: "http",
      url: "http://localhost:8080/mcp",
    });
    expect(result?.mcpServers["insecure-http"]).toEqual({
      type: "http",
      url: "http://example.com/mcp",
    });
    expect(result?.skipped.map((s) => s.server).sort()).toEqual([
      "bad-entry",
      "shell-string",
    ]);
  });

  it("returns undefined without an SSOT mcp.json", () => {
    expect(
      buildClaudeStyleMcpServers(path.join(FIXTURES_REPO, "nope")),
    ).toBeUndefined();
  });
});
