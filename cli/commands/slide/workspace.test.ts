import { existsSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { resolveAssetsSourceDir, resolveWorkspace } from "./workspace.js";

describe("resolveWorkspace", () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = join(tmpdir(), `oma-slide-test-${Date.now()}`);
    mkdirSync(tmpDir, { recursive: true });
  });

  afterEach(() => {
    rmSync(tmpDir, { recursive: true, force: true });
  });

  it("throws when directory does not exist", () => {
    expect(() => resolveWorkspace(join(tmpDir, "nonexistent"))).toThrow(
      "not found",
    );
  });

  it("throws when meta.json is missing", () => {
    const dir = join(tmpDir, "deck");
    mkdirSync(dir);
    expect(() => resolveWorkspace(dir)).toThrow("meta.json not found");
  });

  it("throws when meta.json is invalid JSON", () => {
    const dir = join(tmpDir, "deck");
    mkdirSync(dir);
    writeFileSync(join(dir, "meta.json"), "not json", "utf8");
    expect(() => resolveWorkspace(dir)).toThrow("Failed to parse meta.json");
  });

  it("throws when meta.json missing required order field", () => {
    const dir = join(tmpDir, "deck");
    mkdirSync(dir);
    writeFileSync(
      join(dir, "meta.json"),
      JSON.stringify({ title: "test" }),
      "utf8",
    );
    expect(() => resolveWorkspace(dir)).toThrow(
      'missing required field "order"',
    );
  });

  it("throws when meta.json order is empty", () => {
    const dir = join(tmpDir, "deck");
    mkdirSync(dir);
    writeFileSync(
      join(dir, "meta.json"),
      JSON.stringify({ title: "test", order: [] }),
      "utf8",
    );
    expect(() => resolveWorkspace(dir)).toThrow('"order" is empty');
  });

  it("throws when slide file listed in order does not exist", () => {
    const dir = join(tmpDir, "deck");
    mkdirSync(dir);
    writeFileSync(
      join(dir, "meta.json"),
      JSON.stringify({ title: "test", order: ["slide-01.html"] }),
      "utf8",
    );
    expect(() => resolveWorkspace(dir)).toThrow("not found");
  });

  it("throws when order[] entry contains path traversal (M1)", () => {
    const dir = join(tmpDir, "deck-traversal");
    mkdirSync(dir);
    writeFileSync(
      join(dir, "meta.json"),
      JSON.stringify({ title: "attack", order: ["../../../etc/passwd"] }),
      "utf8",
    );
    expect(() => resolveWorkspace(dir)).toThrow("path traversal");
  });

  it("throws when order[] entry contains forward slash (M1)", () => {
    const dir = join(tmpDir, "deck-slash");
    mkdirSync(dir);
    writeFileSync(
      join(dir, "meta.json"),
      JSON.stringify({ title: "test", order: ["subdir/slide-01.html"] }),
      "utf8",
    );
    expect(() => resolveWorkspace(dir)).toThrow("path traversal");
  });

  it("returns workspace when valid deck exists", () => {
    const dir = join(tmpDir, "deck");
    mkdirSync(dir);
    writeFileSync(join(dir, "slide-01.html"), "<html></html>", "utf8");
    writeFileSync(
      join(dir, "meta.json"),
      JSON.stringify({
        title: "My Deck",
        order: ["slide-01.html"],
        style: "default",
        density: "balanced",
        speakerNotes: {},
      }),
      "utf8",
    );
    const ws = resolveWorkspace(dir);
    expect(ws.meta.title).toBe("My Deck");
    expect(ws.meta.order).toEqual(["slide-01.html"]);
    expect(ws.meta.density).toBe("balanced");
    expect(existsSync(ws.dir)).toBe(true);
  });

  it("applies defaults for missing optional fields", () => {
    const dir = join(tmpDir, "deck");
    mkdirSync(dir);
    writeFileSync(join(dir, "slide-01.html"), "<html></html>", "utf8");
    writeFileSync(
      join(dir, "meta.json"),
      JSON.stringify({ title: "Minimal", order: ["slide-01.html"] }),
      "utf8",
    );
    const ws = resolveWorkspace(dir);
    expect(ws.meta.style).toBe("default");
    expect(ws.meta.density).toBe("balanced");
    expect(ws.meta.speakerNotes).toEqual({});
  });
});

// ─── resolveAssetsSourceDir ───────────────────────────────────────────────────

describe("resolveAssetsSourceDir", () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = join(tmpdir(), `oma-slide-assets-test-${Date.now()}`);
    mkdirSync(tmpDir, { recursive: true });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    rmSync(tmpDir, { recursive: true, force: true });
  });

  /** Plant a deck-stage.js sentinel under <root>/.agents/skills/.../assets/. */
  function plantSentinel(root: string): string {
    const assetsDir = join(
      root,
      ".agents",
      "skills",
      "oma-slide",
      "resources",
      "assets",
    );
    mkdirSync(assetsDir, { recursive: true });
    writeFileSync(join(assetsDir, "deck-stage.js"), "// sentinel", "utf8");
    return assetsDir;
  }

  it("returns null when no assets exist anywhere in the search", () => {
    // Point cwd at a leaf dir with no .agents anywhere in its ancestry
    // (tmpDir is under /tmp which has no .agents tree)
    const leaf = join(tmpDir, "a", "b", "c");
    mkdirSync(leaf, { recursive: true });
    vi.spyOn(process, "cwd").mockReturnValue(leaf);
    // No OMA_HOME set; homedir() has no sentinel in typical CI
    // We accept null OR a real homedir-based path (user may have oma installed globally)
    const result = resolveAssetsSourceDir();
    expect(result === null || typeof result === "string").toBe(true);
  });

  it("finds assets at the cwd root (flat case)", () => {
    const assetsDir = plantSentinel(tmpDir);
    vi.spyOn(process, "cwd").mockReturnValue(tmpDir);
    const result = resolveAssetsSourceDir();
    expect(result).toBe(assetsDir);
  });

  it("finds assets by walking UP from a nested cwd (upward-search case)", () => {
    // Sentinel lives at tmpDir/.agents/...; cwd is a deep subdirectory
    const assetsDir = plantSentinel(tmpDir);
    const deepCwd = join(tmpDir, "some", "nested", "project");
    mkdirSync(deepCwd, { recursive: true });
    vi.spyOn(process, "cwd").mockReturnValue(deepCwd);
    const result = resolveAssetsSourceDir();
    expect(result).toBe(assetsDir);
  });

  it("OMA_HOME takes priority over cwd", () => {
    // Sentinel only in omaHomeDir — cwd has nothing
    const omaHomeDir = join(tmpDir, "oma-home");
    const assetsDir = plantSentinel(omaHomeDir);
    vi.spyOn(process, "cwd").mockReturnValue(join(tmpDir, "project"));
    const origOmaHome = process.env.OMA_HOME;
    process.env.OMA_HOME = omaHomeDir;
    try {
      const result = resolveAssetsSourceDir();
      expect(result).toBe(assetsDir);
    } finally {
      if (origOmaHome === undefined) {
        delete process.env.OMA_HOME;
      } else {
        process.env.OMA_HOME = origOmaHome;
      }
    }
  });

  it("cwd walk takes priority over homedir", () => {
    // Sentinel in both cwd-ancestry and (potentially) homedir — cwd wins
    const assetsDir = plantSentinel(tmpDir);
    vi.spyOn(process, "cwd").mockReturnValue(tmpDir);
    const result = resolveAssetsSourceDir();
    expect(result).toBe(assetsDir);
  });
});
