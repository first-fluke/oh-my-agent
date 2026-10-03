import { join } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { resolveMemoriesDir } from "./state.js";

describe("resolveMemoriesDir", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("uses the explicit project directory", () => {
    vi.stubEnv("MEMORIES_DIR", "");
    expect(resolveMemoriesDir("/tmp/project")).toBe(
      join("/tmp/project", ".agents", "state", "memories"),
    );
  });

  it("defaults to cwd and ignores positional argv (the `web` subcommand)", () => {
    vi.stubEnv("MEMORIES_DIR", "");
    const argv = process.argv;
    process.argv = [argv[0] ?? "node", "cli.js", "dashboard", "web"];
    try {
      expect(resolveMemoriesDir()).toBe(
        join(process.cwd(), ".agents", "state", "memories"),
      );
    } finally {
      process.argv = argv;
    }
  });

  it("honors MEMORIES_DIR", () => {
    vi.stubEnv("MEMORIES_DIR", "/tmp/override-memories");
    expect(resolveMemoriesDir("/tmp/project")).toBe("/tmp/override-memories");
  });
});
