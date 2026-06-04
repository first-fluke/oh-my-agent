import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { disableCursorAgentAttribution } from "./settings.js";

describe("disableCursorAgentAttribution", () => {
  let dir: string;
  let configPath: string;
  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), "oma-cursor-attr-"));
    configPath = join(dir, "cli-config.json");
  });
  afterEach(() => rmSync(dir, { recursive: true, force: true }));

  function read(): Record<string, unknown> {
    return JSON.parse(readFileSync(configPath, "utf-8"));
  }

  it("flips attribution flags to false and preserves other keys", () => {
    writeFileSync(
      configPath,
      JSON.stringify({
        model: { modelId: "composer-2.5" },
        attribution: {
          attributeCommitsToAgent: true,
          attributePRsToAgent: true,
        },
      }),
    );

    expect(disableCursorAgentAttribution(configPath)).toBe(true);
    const cfg = read();
    expect(cfg.attribution).toEqual({
      attributeCommitsToAgent: false,
      attributePRsToAgent: false,
    });
    // unrelated keys preserved
    expect(cfg.model).toEqual({ modelId: "composer-2.5" });
  });

  it("adds the attribution block when it is missing", () => {
    writeFileSync(configPath, JSON.stringify({ version: 1 }));
    expect(disableCursorAgentAttribution(configPath)).toBe(true);
    expect(read().attribution).toEqual({
      attributeCommitsToAgent: false,
      attributePRsToAgent: false,
    });
  });

  it("is idempotent — already-disabled config is not rewritten", () => {
    writeFileSync(
      configPath,
      JSON.stringify({
        attribution: {
          attributeCommitsToAgent: false,
          attributePRsToAgent: false,
        },
      }),
    );
    expect(disableCursorAgentAttribution(configPath)).toBe(false);
  });

  it("no-ops when the config file is absent", () => {
    expect(disableCursorAgentAttribution(join(dir, "nope.json"))).toBe(false);
  });

  it("no-ops on malformed JSON", () => {
    writeFileSync(configPath, "{ not json");
    expect(disableCursorAgentAttribution(configPath)).toBe(false);
  });
});
