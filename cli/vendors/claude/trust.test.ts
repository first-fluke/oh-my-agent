import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { ensureClaudeWorkspaceTrust, trustClaudeWorkspace } from "./trust.js";

const tempRoots: string[] = [];

function makeRoot(): string {
  const root = mkdtempSync(join(tmpdir(), "oma-claude-trust-"));
  tempRoots.push(root);
  return root;
}

function writeConfig(root: string, value: unknown): string {
  const path = join(root, ".claude.json");
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`, "utf-8");
  return path;
}

afterEach(() => {
  for (const r of tempRoots) rmSync(r, { recursive: true, force: true });
  tempRoots.length = 0;
});

describe("trustClaudeWorkspace", () => {
  it("adds hasTrustDialogAccepted for a brand-new project entry", () => {
    const root = makeRoot();
    const path = writeConfig(root, {
      numStartups: 3,
      projects: { "/some/other": { hasTrustDialogAccepted: true } },
    });

    const result = trustClaudeWorkspace(path, "/work/my-app");

    expect(result.changed).toBe(true);
    expect(result.alreadyTrusted).toBe(false);
    const parsed = JSON.parse(readFileSync(path, "utf-8"));
    expect(parsed.projects["/work/my-app"].hasTrustDialogAccepted).toBe(true);
    // Preserves unrelated fields and other project entries.
    expect(parsed.numStartups).toBe(3);
    expect(parsed.projects["/some/other"].hasTrustDialogAccepted).toBe(true);
  });

  it("preserves existing fields on the same project entry", () => {
    const root = makeRoot();
    const path = writeConfig(root, {
      projects: {
        "/work/my-app": {
          mcpServers: { serena: { command: "serena" } },
          hasTrustDialogAccepted: false,
        },
      },
    });

    const result = trustClaudeWorkspace(path, "/work/my-app");

    expect(result.changed).toBe(true);
    const parsed = JSON.parse(readFileSync(path, "utf-8"));
    expect(parsed.projects["/work/my-app"].hasTrustDialogAccepted).toBe(true);
    expect(parsed.projects["/work/my-app"].mcpServers.serena.command).toBe(
      "serena",
    );
  });

  it("is idempotent when already trusted (no write)", () => {
    const root = makeRoot();
    const path = writeConfig(root, {
      projects: { "/work/my-app": { hasTrustDialogAccepted: true } },
    });
    const before = readFileSync(path, "utf-8");

    const result = trustClaudeWorkspace(path, "/work/my-app");

    expect(result.changed).toBe(false);
    expect(result.alreadyTrusted).toBe(true);
    expect(readFileSync(path, "utf-8")).toBe(before);
  });

  it("seeds a projects map when none exists", () => {
    const root = makeRoot();
    const path = writeConfig(root, { numStartups: 1 });

    const result = trustClaudeWorkspace(path, "/work/my-app");

    expect(result.changed).toBe(true);
    const parsed = JSON.parse(readFileSync(path, "utf-8"));
    expect(parsed.projects["/work/my-app"].hasTrustDialogAccepted).toBe(true);
    expect(parsed.numStartups).toBe(1);
  });

  it("skips when ~/.claude.json is absent (Claude not initialized)", () => {
    const root = makeRoot();
    const path = join(root, ".claude.json");

    const result = trustClaudeWorkspace(path, "/work/my-app");

    expect(result.changed).toBe(false);
    expect(result.alreadyTrusted).toBe(false);
    expect(result.reason).toMatch(/not found/);
  });

  it("skips malformed JSON without clobbering it", () => {
    const root = makeRoot();
    const path = join(root, ".claude.json");
    writeFileSync(path, "{ not valid json", "utf-8");

    const result = trustClaudeWorkspace(path, "/work/my-app");

    expect(result.changed).toBe(false);
    expect(result.reason).toMatch(/not valid JSON/);
    // File left untouched.
    expect(readFileSync(path, "utf-8")).toBe("{ not valid json");
  });
});

describe("ensureClaudeWorkspaceTrust", () => {
  it("resolves ~/.claude.json from HOME and merges trust", () => {
    // Sandbox HOME to a temp dir so the real ~/.claude.json is never touched.
    const root = makeRoot();
    writeConfig(root, { projects: {} });
    const originalHome = process.env.HOME;
    process.env.HOME = root;
    try {
      const result = ensureClaudeWorkspaceTrust("/work/my-app");
      expect(result.changed).toBe(true);
      const parsed = JSON.parse(
        readFileSync(join(root, ".claude.json"), "utf-8"),
      );
      expect(parsed.projects["/work/my-app"].hasTrustDialogAccepted).toBe(true);
    } finally {
      if (originalHome === undefined) delete process.env.HOME;
      else process.env.HOME = originalHome;
    }
  });
});
