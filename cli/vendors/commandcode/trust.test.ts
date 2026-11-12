import { existsSync, mkdirSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { commandCodeSlug, trustCommandCodeFolder } from "./trust.js";

describe("commandCodeSlug", () => {
  it("matches @sindresorhus/slugify defaults for ASCII paths", () => {
    // The ~/.commandcode/projects entry Command Code itself created.
    expect(commandCodeSlug("/Users/gracefullight/workspace/assignments")).toBe(
      "users-gracefullight-workspace-assignments",
    );
    expect(commandCodeSlug("/Users/me/MyApp/APIs2Go")).toBe(
      "users-me-my-app-apis2-go",
    );
    expect(commandCodeSlug("/a/R&D")).toBe("a-r-and-d");
    expect(commandCodeSlug("/")).toBe("root");
    expect(commandCodeSlug("/Users/me/프로젝트")).toBeUndefined();
  });
});

describe("trustCommandCodeFolder", () => {
  let home: string;

  beforeEach(() => {
    home = mkdtempSync(join(tmpdir(), "oma-cmdcode-trust-"));
  });

  afterEach(() => {
    rmSync(home, { recursive: true, force: true });
  });

  it("initializes the project directory Command Code checks", () => {
    mkdirSync(join(home, ".commandcode"));
    expect(trustCommandCodeFolder(home, "/work/MyApp")).toEqual({
      changed: true,
      alreadyTrusted: false,
    });
    expect(
      existsSync(join(home, ".commandcode", "projects", "work-my-app")),
    ).toBe(true);
    expect(trustCommandCodeFolder(home, "/work/MyApp").alreadyTrusted).toBe(
      true,
    );
  });

  it("skips when Command Code has never run", () => {
    expect(trustCommandCodeFolder(home, "/work/MyApp").changed).toBe(false);
    expect(existsSync(join(home, ".commandcode"))).toBe(false);
  });
});
