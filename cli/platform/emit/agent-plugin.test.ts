import {
  existsSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  buildPluginManifest,
  buildPortableMcpConfig,
  emitAgentPlugin,
  OMA_EXTENSION_NAMESPACE,
} from "./agent-plugin.js";

const FIXTURES_REPO = path.resolve(import.meta.dirname, "__fixtures__", "repo");

/** Spec name shape: 1-64 chars of a-z 0-9 - . with alphanumeric ends. */
function isValidPluginName(name: string): boolean {
  return (
    name.length >= 1 &&
    name.length <= 64 &&
    /^[a-z0-9]([a-z0-9.-]*[a-z0-9])?$/.test(name) &&
    !name.includes("--") &&
    !name.includes("..")
  );
}

describe("buildPortableMcpConfig", () => {
  it("converts stdio and remote entries with explicit transport types", () => {
    const conversion = buildPortableMcpConfig(FIXTURES_REPO);
    expect(conversion).toBeDefined();
    expect(conversion?.mcpServers["good-stdio"]).toEqual({
      type: "stdio",
      command: "echo",
      args: ["hello"],
      env: { FIXTURE: "1" },
    });
    expect(conversion?.mcpServers["good-http"]).toEqual({
      type: "streamable-http",
      url: "https://example.com/mcp",
    });
    expect(conversion?.mcpServers["loopback-http"]).toEqual({
      type: "streamable-http",
      url: "http://localhost:8080/mcp",
    });
  });

  it("drops oma-only fields like available_tools", () => {
    const conversion = buildPortableMcpConfig(FIXTURES_REPO);
    expect(conversion?.mcpServers["good-stdio"]).not.toHaveProperty(
      "available_tools",
    );
  });

  it("skips invalid entries per-server instead of failing the config", () => {
    const conversion = buildPortableMcpConfig(FIXTURES_REPO);
    const skippedNames = conversion?.skipped.map((s) => s.server).sort();
    expect(skippedNames).toEqual([
      "bad-entry",
      "insecure-http",
      "shell-string",
    ]);
    expect(conversion?.servers.sort()).toEqual([
      "good-http",
      "good-stdio",
      "loopback-http",
    ]);
  });
});

describe("buildPluginManifest", () => {
  it("uses the canonical 1.0.0 schema id and the stable oma plugin name", () => {
    const manifest = buildPluginManifest(FIXTURES_REPO, []);
    expect(manifest.$schema).toBe(
      "https://agent-plugins.org/schemas/1.0.0/plugin.schema.json",
    );
    expect(manifest.name).toBe("oma");
    expect(isValidPluginName(manifest.name as string)).toBe(true);
  });

  it("pulls metadata from package.json", () => {
    const manifest = buildPluginManifest(FIXTURES_REPO, []);
    expect(manifest.version).toBe("0.0.1");
    expect(manifest.description).toBe("Fixture repo for oma emit tests");
    expect(manifest.author).toEqual({ name: "Fixture Author" });
    expect(manifest.homepage).toBe("https://example.test/fixture-repo");
  });

  it("declares the extension namespace only when payload entries exist", () => {
    const without = buildPluginManifest(FIXTURES_REPO, []);
    expect(without.extensions).toBeUndefined();

    const withEntries = buildPluginManifest(FIXTURES_REPO, [
      ".agents/workflows",
      ".agents/oma-config.yaml",
    ]);
    const extensions = withEntries.extensions as Record<
      string,
      { entries: string[] }
    >;
    expect(extensions[OMA_EXTENSION_NAMESPACE]?.entries).toEqual([
      `./${OMA_EXTENSION_NAMESPACE}/workflows`,
      `./${OMA_EXTENSION_NAMESPACE}/oma-config.yaml`,
    ]);
  });
});

describe("emitAgentPlugin", () => {
  let outDir: string;

  afterEach(() => {
    if (outDir) rmSync(outDir, { recursive: true, force: true });
  });

  function emit() {
    outDir = mkdtempSync(path.join(tmpdir(), "oma-emit-agent-plugin-"));
    return emitAgentPlugin(FIXTURES_REPO, outDir);
  }

  it("writes a parseable plugin.json manifest at the package root", () => {
    const report = emit();
    expect(report.manifestPath).toBe(path.join(outDir, "plugin.json"));
    const manifest = JSON.parse(readFileSync(report.manifestPath, "utf-8"));
    expect(manifest.name).toBe("oma");
  });

  it("emits conformant skills under skills/ and ships _shared beside them", () => {
    const report = emit();
    expect(report.skills.length).toBeGreaterThan(0);
    expect(
      existsSync(path.join(outDir, "skills", "valid-skill", "SKILL.md")),
    ).toBe(true);
    expect(
      existsSync(
        path.join(outDir, "skills", "_shared", "core", "shared-note.md"),
      ),
    ).toBe(true);
  });

  it("writes a portable mcp.json with only $schema and mcpServers", () => {
    const report = emit();
    expect(report.mcp.emitted).toBe(true);
    const mcp = JSON.parse(
      readFileSync(path.join(outDir, "mcp.json"), "utf-8"),
    );
    expect(Object.keys(mcp).sort()).toEqual(["$schema", "mcpServers"]);
    expect(mcp.$schema).toBe(
      "https://agent-plugins.org/schemas/1.0.0/mcp.schema.json",
    );
    expect(mcp).not.toHaveProperty("memoryConfig");
  });

  it("copies agents, workflows, rules, and oma-config.yaml into the extension dir", () => {
    const report = emit();
    expect(report.extensionEntries).toEqual([
      ".agents/agents",
      ".agents/workflows",
      ".agents/rules",
      ".agents/oma-config.yaml",
    ]);
    const extDir = path.join(outDir, OMA_EXTENSION_NAMESPACE);
    expect(existsSync(path.join(extDir, "agents", "fixture-agent.md"))).toBe(
      true,
    );
    expect(
      existsSync(path.join(extDir, "workflows", "fixture-workflow.md")),
    ).toBe(true);
    expect(existsSync(path.join(extDir, "rules", "fixture-rule.md"))).toBe(
      true,
    );
    expect(existsSync(path.join(extDir, "oma-config.yaml"))).toBe(true);
  });

  it("rebuilds owned artifacts so removed SSOT entries cannot linger", () => {
    const report = emit();
    const staleSkill = path.join(report.outDir, "skills", "stale.txt");
    const staleExtension = path.join(
      report.outDir,
      OMA_EXTENSION_NAMESPACE,
      "stale.txt",
    );
    writeFileSync(staleSkill, "stale");
    writeFileSync(staleExtension, "stale");
    emitAgentPlugin(FIXTURES_REPO, report.outDir);
    expect(existsSync(staleSkill)).toBe(false);
    expect(existsSync(staleExtension)).toBe(false);
  });

  it("never removes the out dir itself — sibling files survive re-emit", () => {
    // The canonical out dir is the repo root; a whole-dir rm here would
    // delete the repository.
    const report = emit();
    const sibling = path.join(report.outDir, "README.md");
    writeFileSync(sibling, "not part of the package");
    emitAgentPlugin(FIXTURES_REPO, report.outDir);
    expect(existsSync(sibling)).toBe(true);
    expect(readFileSync(sibling, "utf-8")).toBe("not part of the package");
  });
});
