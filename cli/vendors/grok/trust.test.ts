import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  realpathSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { parse as parseToml } from "smol-toml";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { grokTrustKey, trustGrokFolder } from "./trust.js";

describe("trustGrokFolder", () => {
  let dir: string;
  let repo: string;
  let store: string;
  const now = new Date("2026-11-12T00:00:00.000Z");

  beforeEach(() => {
    dir = realpathSync(mkdtempSync(join(tmpdir(), "oma-grok-trust-")));
    repo = join(dir, "repo");
    mkdirSync(join(repo, ".git"), { recursive: true });
    mkdirSync(join(repo, "packages", "app"), { recursive: true });
    mkdirSync(join(dir, "grok-home"));
    store = join(dir, "grok-home", "trusted_folders.toml");
  });

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  it("keys trust by the enclosing git root", () => {
    expect(grokTrustKey(join(repo, "packages", "app"))).toBe(repo);
  });

  it("records the git root as trusted and keeps existing folders", () => {
    writeFileSync(store, '[folders."/other"]\ntrusted = true\n');

    expect(
      trustGrokFolder(store, join(repo, "packages", "app"), { now }),
    ).toEqual({ changed: true, alreadyTrusted: false });
    expect(parseToml(readFileSync(store, "utf-8"))).toEqual({
      folders: {
        "/other": { trusted: true },
        [repo]: { trusted: true, decided_at: 1794441600 },
      },
    });
    expect(trustGrokFolder(store, repo, { now }).alreadyTrusted).toBe(true);
  });

  it("keeps an explicit distrust and never trusts HOME", () => {
    writeFileSync(
      store,
      `[folders.${JSON.stringify(repo)}]\ntrusted = false\n`,
    );
    const result = trustGrokFolder(store, repo, { now });
    expect(result.changed).toBe(false);
    expect(result.reason).toContain("untrusted");

    const home = join(dir, "home");
    mkdirSync(home);
    expect(trustGrokFolder(store, home, { now, home }).changed).toBe(false);
  });
});
