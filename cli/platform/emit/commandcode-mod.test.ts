import {
  cpSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  COMMANDCODE_BRIDGE_SOURCE,
  COMMANDCODE_MOD_PACKAGE_NAME,
  emitCommandcodeMod,
} from "./commandcode-mod.js";

const REPO_ROOT = resolve(import.meta.dirname, "../../..");
const fixture = resolve(import.meta.dirname, "__fixtures__/repo");
const roots: string[] = [];

function scratch(): string {
  const root = mkdtempSync(join(tmpdir(), "oma-commandcode-mod-"));
  roots.push(root);
  return root;
}

afterEach(() => {
  for (const root of roots.splice(0)) {
    rmSync(root, { recursive: true, force: true });
  }
});

describe("emitCommandcodeMod", () => {
  it("emits the mod manifest Command Code reads, the bridge and the skills tree", () => {
    const root = scratch();
    const source = join(root, "source");
    cpSync(fixture, source, { recursive: true });
    // Give the fixture the SSOT bridge and filter script so the copy paths run.
    mkdirSync(join(source, ".agents/hooks/variants/commandcode"), {
      recursive: true,
    });
    cpSync(
      join(REPO_ROOT, COMMANDCODE_BRIDGE_SOURCE),
      join(source, COMMANDCODE_BRIDGE_SOURCE),
    );
    mkdirSync(join(source, ".agents/hooks/core"), { recursive: true });
    writeFileSync(
      join(source, ".agents/hooks/core/filter-test-output.sh"),
      "#!/bin/bash\ncat\n",
    );
    mkdirSync(join(source, ".agents/skills/demo"), { recursive: true });
    writeFileSync(
      join(source, ".agents/skills/demo/SKILL.md"),
      "---\nname: demo\ndescription: Demo skill\n---\nBody\n",
    );

    const output = join(root, "commandcode-mod");
    const report = emitCommandcodeMod(source, output);
    const manifest = JSON.parse(readFileSync(report.manifestPath, "utf-8"));

    expect(report.target).toBe("commandcode-mod");
    expect(manifest).toMatchObject({
      name: COMMANDCODE_MOD_PACKAGE_NAME,
      version: "0.0.1",
      type: "module",
      keywords: expect.arrayContaining(["cmd-mod", "cmd-mod-hook"]),
      files: ["mods", "skills", "filter-test-output.sh", "README.md"],
      commandcode: { mods: ["./mods/oma.ts"], skills: ["./skills"] },
    });
    expect(manifest).not.toHaveProperty("dependencies");
    expect(manifest).not.toHaveProperty("private");
    expect(report.modPath).toBe(join(output, "mods", "oma.ts"));
    expect(readFileSync(report.modPath, "utf-8")).toBe(
      readFileSync(join(REPO_ROOT, COMMANDCODE_BRIDGE_SOURCE), "utf-8"),
    );
    expect(existsSync(join(output, "filter-test-output.sh"))).toBe(true);
    expect(existsSync(join(output, "skills/demo/SKILL.md"))).toBe(true);
    expect(report.skills.some((skill) => skill.skill === "demo")).toBe(true);
    expect(report.passCount + report.failCount).toBe(report.skills.length);
  });

  it("retires removed skills while preserving unrelated package siblings", () => {
    const root = scratch();
    const source = join(root, "source");
    cpSync(fixture, source, { recursive: true });
    const output = join(root, "commandcode-mod");
    const stale = join(output, "skills/removed/SKILL.md");
    mkdirSync(join(output, "skills/removed"), { recursive: true });
    writeFileSync(stale, "old skill");
    writeFileSync(join(output, "notes.txt"), "user notes");
    emitCommandcodeMod(source, output);
    expect(existsSync(stale)).toBe(false);
    expect(readFileSync(join(output, "notes.txt"), "utf-8")).toBe("user notes");
  });

  it("documents the install forms in the README", () => {
    const output = join(scratch(), "commandcode-mod");
    emitCommandcodeMod(REPO_ROOT, output);
    const readme = readFileSync(join(output, "README.md"), "utf-8");
    expect(readme).toContain(`cmd mods add ${COMMANDCODE_MOD_PACKAGE_NAME}`);
    expect(readme).toContain("cmd mods add ./path/to/commandcode-mod");
    expect(readme).toContain("cmd --mod");
  });
});

describe("commandcode bridge source — locked hook names", () => {
  const src = readFileSync(join(REPO_ROOT, COMMANDCODE_BRIDGE_SOURCE), "utf-8");

  it("registers the ModApi hooks the mapping documents", () => {
    for (const hook of [
      "transformInput",
      "appendSystemPrompt",
      "onSessionStart",
      "beforeToolCall",
      "onStop",
    ]) {
      expect(src, hook).toContain(`${hook}:`);
    }
    // onRunEnd cannot force-continue; persistent-mode must ride onStop.
    expect(src).not.toContain("onRunEnd:");
  });

  it("dispatches through the oma CLI with the commandcode identity", () => {
    expect(src).toContain('"--vendor", "commandcode"');
    expect(src).toContain("OMA_HOOK_BRIDGE_DIR");
  });

  it("runs scm-guard before test-filter and blocks via the documented return shape", () => {
    expect(src.indexOf('"scm-guard.ts"')).toBeLessThan(
      src.indexOf('"test-filter.ts"'),
    );
    expect(src).toContain("block: true");
    expect(src).toContain("continue: true");
    expect(src).toContain('action: "continue"');
  });

  it("stays dependency-free", () => {
    expect(src).not.toMatch(/from ["']@commandcode\//);
  });
});
