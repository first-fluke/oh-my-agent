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
import { emitPiPackage } from "./pi-package.js";

const fixture = resolve(import.meta.dirname, "__fixtures__/repo");
const roots: string[] = [];

function setup(): { source: string; output: string } {
  const root = mkdtempSync(join(tmpdir(), "oma-pi-package-"));
  roots.push(root);
  const source = join(root, "source");
  cpSync(fixture, source, { recursive: true });
  return { source, output: join(root, "package") };
}

afterEach(() => {
  for (const root of roots.splice(0)) {
    rmSync(root, { recursive: true, force: true });
  }
});

describe("emitPiPackage", () => {
  it("emits independently loadable skills with the Pi package manifest", () => {
    const { source, output } = setup();
    mkdirSync(join(source, ".agents/skills/demo/resources"), {
      recursive: true,
    });
    writeFileSync(
      join(source, ".agents/skills/demo/SKILL.md"),
      "---\nname: demo\ndescription: Demo skill\n---\nRead [guide](resources/guide.md).\n",
    );
    writeFileSync(
      join(source, ".agents/skills/demo/resources/guide.md"),
      "# Guide\n",
    );
    const report = emitPiPackage(source, output);
    const manifest = JSON.parse(readFileSync(report.manifestPath, "utf-8"));
    expect(manifest).toMatchObject({
      name: "oh-my-agent-pi",
      version: "0.0.1",
      keywords: expect.arrayContaining(["pi-package"]),
      pi: { skills: ["./skills"], extensions: [], prompts: [], themes: [] },
    });
    expect(manifest).not.toHaveProperty("private");
    expect(manifest).not.toHaveProperty("dependencies");
    expect(manifest).not.toHaveProperty("workspaces");
    expect(report.skills.some((skill) => skill.skill === "demo")).toBe(true);
    expect(
      readFileSync(join(output, "skills/demo/SKILL.md"), "utf-8"),
    ).toContain("resources/guide.md");
    expect(
      readFileSync(join(output, "skills/demo/resources/guide.md"), "utf-8"),
    ).toBe("# Guide\n");
    expect(report.passCount + report.failCount).toBe(report.skills.length);
  });

  it("retires removed skills while preserving unrelated package siblings", () => {
    const { source, output } = setup();
    const stale = join(output, "skills/removed/SKILL.md");
    mkdirSync(join(output, "skills/removed"), { recursive: true });
    writeFileSync(stale, "old skill");
    writeFileSync(join(output, "notes.txt"), "user notes");
    emitPiPackage(source, output);
    expect(existsSync(stale)).toBe(false);
    expect(readFileSync(join(output, "notes.txt"), "utf-8")).toBe("user notes");
  });
});
