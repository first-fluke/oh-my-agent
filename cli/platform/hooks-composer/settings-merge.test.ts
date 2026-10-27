import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { mergeIntoSettings } from "./settings-merge.js";

const OMA_GROUP = {
  hooks: [{ name: "oma-hook-Stop", type: "command", command: "oma-hook.sh" }],
};

describe("mergeIntoSettings", () => {
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

  it("preserves custom permission rules and unrelated permission keys", () => {
    const path = join(dir, "settings.json");
    writeFileSync(
      path,
      JSON.stringify({
        permissions: {
          allow: ["Bash(user-command)"],
          ask: ["Bash(deploy)"],
          deny: ["Read(.env)"],
          defaultMode: "default",
          additionalDirectories: ["../shared"],
        },
      }),
    );

    expect(
      mergeIntoSettings(
        path,
        { Stop: [OMA_GROUP] },
        {
          permissions: { allow: ["Bash(oma *)"] },
        },
      ),
    ).toBe(true);

    const after = JSON.parse(readFileSync(path, "utf-8"));
    expect(after.permissions).toEqual({
      allow: ["Bash(user-command)", "Bash(oma *)"],
      ask: ["Bash(deploy)"],
      deny: ["Read(.env)"],
      defaultMode: "default",
      additionalDirectories: ["../shared"],
    });
  });

  it.each(["allow", "ask", "deny"])(
    "adds %s defaults once across repeated installations",
    (rule) => {
      const path = join(dir, "settings.json");
      writeFileSync(
        path,
        JSON.stringify({
          permissions: {
            [rule]: ["Bash(custom)", "Bash(shared)", "Bash(custom)"],
          },
        }),
      );
      const extra = {
        permissions: {
          [rule]: ["Bash(shared)", "Bash(default)", "Bash(default)"],
        },
      };

      expect(mergeIntoSettings(path, { Stop: [OMA_GROUP] }, extra)).toBe(true);
      expect(mergeIntoSettings(path, { Stop: [OMA_GROUP] }, extra)).toBe(true);

      const after = JSON.parse(readFileSync(path, "utf-8"));
      expect(after.permissions[rule]).toEqual([
        "Bash(custom)",
        "Bash(shared)",
        "Bash(default)",
      ]);
      expect(after.hooks.Stop).toEqual([OMA_GROUP]);
    },
  );

  it("keeps other extra settings shallow", () => {
    const path = join(dir, "settings.json");
    writeFileSync(
      path,
      JSON.stringify({
        ui: {
          theme: "Dark",
          items: ["user-item"],
          nested: { user: true },
        },
      }),
    );

    expect(
      mergeIntoSettings(
        path,
        {},
        {
          ui: { items: ["default-item"], nested: { default: true } },
        },
      ),
    ).toBe(true);

    const after = JSON.parse(readFileSync(path, "utf-8"));
    expect(after.ui).toEqual({
      theme: "Dark",
      items: ["default-item"],
      nested: { default: true },
    });
  });
});
