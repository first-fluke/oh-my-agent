import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  ARCHIFY_ENV_HOME,
  diagramConfigFrom,
  findArchify,
  loadDiagramConfig,
  resolveDiagramEngine,
} from "./resolve.js";

function fakeArchify(root: string, version = "2.16.0"): void {
  fs.mkdirSync(path.join(root, "bin"), { recursive: true });
  fs.writeFileSync(path.join(root, "bin", "archify.mjs"), "// stub\n");
  fs.writeFileSync(
    path.join(root, "package.json"),
    JSON.stringify({ name: "archify", version }),
  );
}

describe("diagram engine resolution", () => {
  let cwd: string;
  let home: string;

  beforeEach(() => {
    cwd = fs.mkdtempSync(path.join(os.tmpdir(), "oma-diagram-cwd-"));
    home = fs.mkdtempSync(path.join(os.tmpdir(), "oma-diagram-home-"));
  });

  afterEach(() => {
    fs.rmSync(cwd, { recursive: true, force: true });
    fs.rmSync(home, { recursive: true, force: true });
  });

  it("defaults to auto/showcase/managed and tolerates a malformed section", () => {
    expect(diagramConfigFrom(undefined)).toEqual({
      engine: "auto",
      archify: {
        path: undefined,
        quality: "showcase",
        open: false,
        managed: true,
        channel: "stable",
        check_interval_min: 60,
      },
      explain_sidecar: false,
    });
    expect(diagramConfigFrom({ engine: "bogus", archify: "nope" }).engine).toBe(
      "auto",
    );
    expect(
      diagramConfigFrom({
        archify: {
          quality: "standard",
          open: true,
          managed: false,
          channel: "main",
          check_interval_min: 0,
        },
      }).archify,
    ).toEqual({
      path: undefined,
      quality: "standard",
      open: true,
      managed: false,
      channel: "main",
      check_interval_min: 0,
    });
  });

  it("falls back to mermaid when archify is absent (auto)", async () => {
    const res = await resolveDiagramEngine({
      managed: null,
      cwd,
      home,
      env: {},
    });
    expect(res.engine).toBe("mermaid");
    expect(res.ok).toBe(true);
    expect(res.probed.length).toBeGreaterThan(0);
  });

  it("is an error when archify is pinned but missing", async () => {
    const res = await resolveDiagramEngine({
      managed: null,
      cwd,
      home,
      env: {},
      engine: "archify",
    });
    expect(res.engine).toBe("mermaid");
    expect(res.ok).toBe(false);
    expect(res.reason).toContain("oma diagram update");
  });

  it("finds a project-local .agents/skills/archify install", async () => {
    fakeArchify(path.join(cwd, ".agents", "skills", "archify"));
    const res = await resolveDiagramEngine({
      managed: null,
      cwd,
      home,
      env: {},
    });
    expect(res.engine).toBe("archify");
    expect(res.archify?.version).toBe("2.16.0");
    expect(res.archify?.source).toBe("project:.agents/skills");
  });

  it("finds a home ~/.claude/skills/archify install after project dirs", async () => {
    fakeArchify(path.join(home, ".claude", "skills", "archify"));
    const res = await resolveDiagramEngine({
      managed: null,
      cwd,
      home,
      env: {},
    });
    expect(res.engine).toBe("archify");
    expect(res.archify?.source).toBe("home:~/.claude/skills");
  });

  it("prefers config path, then ARCHIFY_HOME, over well-known dirs", async () => {
    const viaConfig = path.join(cwd, "vendor", "archify");
    const viaEnv = path.join(home, "env-archify");
    fakeArchify(viaConfig, "1.0.0");
    fakeArchify(viaEnv, "1.1.0");
    fakeArchify(path.join(home, ".claude", "skills", "archify"), "1.2.0");

    const env = { [ARCHIFY_ENV_HOME]: viaEnv };
    expect((await findArchify({ cwd, home, env })).install?.version).toBe(
      "1.1.0",
    );
    expect(
      (await findArchify({ cwd, home, env, configPath: "vendor/archify" }))
        .install?.version,
    ).toBe("1.0.0");
    // `~` expands against the injected home
    expect(
      (await findArchify({ cwd, home, env: {}, configPath: "~/env-archify" }))
        .install?.version,
    ).toBe("1.1.0");
  });

  it("honours an explicit mermaid pin without probing", async () => {
    fakeArchify(path.join(cwd, ".agents", "skills", "archify"));
    const res = await resolveDiagramEngine({
      managed: null,
      cwd,
      home,
      env: {},
      engine: "mermaid",
    });
    expect(res.engine).toBe("mermaid");
    expect(res.probed).toEqual([]);
  });

  it("reads the diagram section from .agents/oma-config.yaml", async () => {
    fs.mkdirSync(path.join(cwd, ".agents"), { recursive: true });
    fs.writeFileSync(
      path.join(cwd, ".agents", "oma-config.yaml"),
      "language: en\ndiagram:\n  engine: mermaid\n  explain_sidecar: true\n",
    );
    const cfg = loadDiagramConfig(cwd);
    expect(cfg.engine).toBe("mermaid");
    expect(cfg.explain_sidecar).toBe(true);
  });
});
