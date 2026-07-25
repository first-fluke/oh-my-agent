import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { loadSerenaConfig } from "./config.js";

describe("loadSerenaConfig", () => {
  let dir: string;

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), "oma-config-"));
    mkdirSync(join(dir, ".agents"), { recursive: true });
  });

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  function writeConfig(yaml: string): void {
    writeFileSync(join(dir, ".agents", "oma-config.yaml"), yaml);
  }

  it("defaults autoUpdate to true when the serena block is missing", () => {
    writeConfig("language: en\n");
    expect(loadSerenaConfig(dir).autoUpdate).toBe(true);
  });

  it("defaults autoUpdate to true when serena block omits auto_update", () => {
    writeConfig("serena:\n  mode: stdio\n");
    expect(loadSerenaConfig(dir).autoUpdate).toBe(true);
  });

  it("disables autoUpdate only when auto_update is explicitly false", () => {
    writeConfig("serena:\n  auto_update: false\n");
    expect(loadSerenaConfig(dir).autoUpdate).toBe(false);
  });

  it("keeps autoUpdate enabled when auto_update is true", () => {
    writeConfig("serena:\n  auto_update: true\n");
    expect(loadSerenaConfig(dir).autoUpdate).toBe(true);
  });

  it("defaults mode to bridge and autoUpdate to true with no config file", () => {
    // No oma-config.yaml anywhere under the temp dir. The shared per-project
    // daemon is the default so it needs no setup from the user; `stdio` is the
    // explicit opt-out.
    const result = loadSerenaConfig(dir);
    expect(result.mode).toBe("bridge");
    expect(result.autoUpdate).toBe(true);
  });
});
