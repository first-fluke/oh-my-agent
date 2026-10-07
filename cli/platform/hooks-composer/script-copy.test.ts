import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { copyHookScripts } from "./script-copy.js";

const roots: string[] = [];
afterEach(() => {
  for (const root of roots.splice(0))
    rmSync(root, { recursive: true, force: true });
});

function fixture() {
  const root = mkdtempSync(join(tmpdir(), "oma-hook-ownership-"));
  roots.push(root);
  const core = join(root, ".agents/hooks/core");
  const dest = join(root, ".claude/hooks");
  mkdirSync(core, { recursive: true });
  mkdirSync(dest, { recursive: true });
  writeFileSync(join(core, "hud.ts"), "// managed HUD\n");
  writeFileSync(join(core, "old.ts"), "// managed old hook\n");
  return { root, core, dest };
}

describe("hook script ownership", () => {
  it("preserves user scripts and symlinks while pruning only recorded stale copies", () => {
    const { root, dest } = fixture();
    const userFile = join(dest, "user-lint.sh");
    const external = join(root, "external.sh");
    writeFileSync(userFile, "echo user\n");
    writeFileSync(external, "echo external\n");
    symlinkSync(external, join(dest, "user-link.sh"));
    copyHookScripts(root, dest);
    copyHookScripts(root, dest, new Set(["hud.ts"]));
    expect(readFileSync(userFile, "utf8")).toBe("echo user\n");
    expect(readFileSync(join(dest, "user-link.sh"), "utf8")).toBe(
      "echo external\n",
    );
    expect(existsSync(join(dest, "old.ts"))).toBe(false);
    expect(existsSync(join(dest, "hud.ts"))).toBe(true);
  });

  it("preserves untracked collisions and user-modified managed scripts", () => {
    const { root, dest } = fixture();
    writeFileSync(join(dest, "hud.ts"), "// user HUD\n");
    copyHookScripts(root, dest);
    writeFileSync(join(dest, "old.ts"), "// user customization\n");
    copyHookScripts(root, dest, new Set(["hud.ts"]));
    expect(readFileSync(join(dest, "hud.ts"), "utf8")).toBe("// user HUD\n");
    expect(readFileSync(join(dest, "old.ts"), "utf8")).toBe(
      "// user customization\n",
    );
  });

  it("preserves a user symlink colliding with a required hook filename", () => {
    const { root, dest } = fixture();
    const external = join(root, "user-hud.ts");
    writeFileSync(external, "// user HUD\n");
    symlinkSync(external, join(dest, "hud.ts"));
    copyHookScripts(root, dest, new Set(["hud.ts"]));
    expect(readFileSync(join(dest, "hud.ts"), "utf8")).toBe("// user HUD\n");
    expect(readFileSync(external, "utf8")).toBe("// user HUD\n");
  });

  it("preserves recorded customizations across repeated namespace upgrades", () => {
    const { root, core, dest } = fixture();
    const options = { ownedNamespace: true };
    copyHookScripts(root, dest, undefined, options);
    writeFileSync(join(dest, "hud.ts"), "// user customization\n");
    writeFileSync(join(core, "hud.ts"), "// next HUD\n");
    copyHookScripts(root, dest, undefined, options);
    copyHookScripts(root, dest, undefined, options);
    expect(readFileSync(join(dest, "hud.ts"), "utf8")).toBe(
      "// user customization\n",
    );
  });

  it("preserves customizations when a removed script is shipped again", () => {
    const { root, core, dest } = fixture();
    const options = { ownedNamespace: true };
    copyHookScripts(root, dest, undefined, options);
    writeFileSync(join(dest, "hud.ts"), "// user customization\n");
    rmSync(join(core, "hud.ts"));
    copyHookScripts(root, dest, undefined, options);
    writeFileSync(join(core, "hud.ts"), "// reintroduced HUD\n");
    copyHookScripts(root, dest, undefined, options);
    expect(readFileSync(join(dest, "hud.ts"), "utf8")).toBe(
      "// user customization\n",
    );
  });
});
