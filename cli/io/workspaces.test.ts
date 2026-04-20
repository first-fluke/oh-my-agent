import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { detectWorkspace } from "./workspaces.js";

describe("detectWorkspace", () => {
  const tempRoots: string[] = [];
  const originalCwd = process.cwd();

  function makeTempRoot(): string {
    const root = mkdtempSync(join(tmpdir(), "oma-ws-"));
    tempRoots.push(root);
    return root;
  }

  beforeEach(() => {
    // isolate cwd per test
  });

  afterEach(() => {
    process.chdir(originalCwd);
    for (const root of tempRoots) {
      rmSync(root, { recursive: true, force: true });
    }
    tempRoots.length = 0;
  });

  it("returns '.' when no workspace config or candidate exists", () => {
    const root = makeTempRoot();
    process.chdir(root);
    expect(detectWorkspace("frontend")).toBe(".");
  });

  it("picks candidate directories for frontend when no monorepo config", () => {
    const root = makeTempRoot();
    mkdirSync(join(root, "frontend"), { recursive: true });
    process.chdir(root);
    expect(detectWorkspace("frontend")).toBe("frontend");
  });

  it("prefers apps/web over bare frontend in candidate list", () => {
    const root = makeTempRoot();
    mkdirSync(join(root, "apps", "web"), { recursive: true });
    mkdirSync(join(root, "frontend"), { recursive: true });
    process.chdir(root);
    expect(detectWorkspace("frontend")).toBe("apps/web");
  });

  it("parses pnpm-workspace.yaml and scores packages by agent keywords", () => {
    const root = makeTempRoot();
    mkdirSync(join(root, "packages", "web"), { recursive: true });
    mkdirSync(join(root, "packages", "core"), { recursive: true });
    writeFileSync(
      join(root, "pnpm-workspace.yaml"),
      "packages:\n  - packages/*\n",
    );
    process.chdir(root);
    expect(detectWorkspace("frontend")).toBe("packages/web");
    expect(detectWorkspace("backend")).toBe("packages/core");
  });

  it("parses package.json workspaces array", () => {
    const root = makeTempRoot();
    mkdirSync(join(root, "apps", "api"), { recursive: true });
    writeFileSync(
      join(root, "package.json"),
      JSON.stringify({ workspaces: ["apps/*"] }),
    );
    process.chdir(root);
    expect(detectWorkspace("backend")).toBe("apps/api");
  });

  it("parses package.json workspaces object form", () => {
    const root = makeTempRoot();
    mkdirSync(join(root, "apps", "mobile"), { recursive: true });
    writeFileSync(
      join(root, "package.json"),
      JSON.stringify({ workspaces: { packages: ["apps/*"] } }),
    );
    process.chdir(root);
    expect(detectWorkspace("mobile")).toBe("apps/mobile");
  });

  it("parses lerna.json packages", () => {
    const root = makeTempRoot();
    mkdirSync(join(root, "packages", "client"), { recursive: true });
    writeFileSync(
      join(root, "lerna.json"),
      JSON.stringify({ packages: ["packages/*"] }),
    );
    process.chdir(root);
    expect(detectWorkspace("frontend")).toBe("packages/client");
  });

  it("detects nx workspaces via nx.json + apps/libs/packages", () => {
    const root = makeTempRoot();
    mkdirSync(join(root, "apps", "dashboard"), { recursive: true });
    writeFileSync(join(root, "nx.json"), "{}");
    process.chdir(root);
    expect(detectWorkspace("frontend")).toBe("apps/dashboard");
  });

  it("falls back to '.' when monorepo exists but no match scored", () => {
    const root = makeTempRoot();
    mkdirSync(join(root, "packages", "random"), { recursive: true });
    writeFileSync(
      join(root, "pnpm-workspace.yaml"),
      "packages:\n  - packages/*\n",
    );
    process.chdir(root);
    expect(detectWorkspace("mobile")).toBe(".");
  });

  it("ignores malformed pnpm-workspace.yaml gracefully", () => {
    const root = makeTempRoot();
    mkdirSync(join(root, "frontend"), { recursive: true });
    writeFileSync(join(root, "pnpm-workspace.yaml"), "not: [valid");
    process.chdir(root);
    expect(detectWorkspace("frontend")).toBe("frontend");
  });

  it("ignores malformed package.json gracefully", () => {
    const root = makeTempRoot();
    mkdirSync(join(root, "web"), { recursive: true });
    writeFileSync(join(root, "package.json"), "{ not json");
    process.chdir(root);
    expect(detectWorkspace("frontend")).toBe("web");
  });
});
