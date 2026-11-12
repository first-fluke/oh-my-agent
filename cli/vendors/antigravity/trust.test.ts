import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { trustAgyWorkspace } from "./trust.js";

describe("trustAgyWorkspace", () => {
  let dir: string;
  let settings: string;

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), "oma-agy-trust-"));
    settings = join(dir, "settings.json");
  });

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  it("adds the exact project path to trustedWorkspaces once", () => {
    writeFileSync(
      settings,
      JSON.stringify({ model: "m", trustedWorkspaces: ["/other"] }),
    );

    expect(trustAgyWorkspace(settings, "/work/app/")).toEqual({
      changed: true,
      alreadyTrusted: false,
    });
    expect(JSON.parse(readFileSync(settings, "utf-8"))).toEqual({
      model: "m",
      trustedWorkspaces: ["/other", "/work/app"],
    });
    expect(trustAgyWorkspace(settings, "/work/app").alreadyTrusted).toBe(true);
  });

  it("skips when agy has never run", () => {
    expect(trustAgyWorkspace(settings, "/work/app").changed).toBe(false);
  });
});
