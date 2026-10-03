import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { mergeIntoSettings } from "./settings-merge.js";

const OMA_GROUP = {
  hooks: [{ name: "oma-hook-Stop", type: "command", command: "oma-hook.sh" }],
};

describe("mergeIntoSettings — unparseable settings", () => {
  let dir: string;

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), "oma-settings-merge-"));
  });

  afterEach(() => {
    vi.restoreAllMocks();
    rmSync(dir, { recursive: true, force: true });
  });

  it("skips (returns false) and leaves a broken file byte-identical", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const path = join(dir, "settings.json");
    const broken = '{ "permissions": { "allow": [';
    writeFileSync(path, broken);

    expect(mergeIntoSettings(path, { Stop: [OMA_GROUP] })).toBe(false);

    expect(readFileSync(path, "utf-8")).toBe(broken);
    expect(String(warn.mock.calls[0]?.[0])).toContain(path);
  });

  it("merges into a file that only has a trailing comma, keeping user keys", () => {
    const path = join(dir, "settings.json");
    writeFileSync(
      path,
      '{ "permissions": { "allow": ["Bash(npm test)"] }, "env": { "X": "1" }, }',
    );

    expect(mergeIntoSettings(path, { Stop: [OMA_GROUP] })).toBe(true);

    const after = JSON.parse(readFileSync(path, "utf-8"));
    expect(after.permissions.allow).toEqual(["Bash(npm test)"]);
    expect(after.env).toEqual({ X: "1" });
    expect(after.hooks.Stop).toEqual([OMA_GROUP]);
  });
});
