import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  findInstalledSkill,
  installSkills,
  readSkillVersion,
  type SkillsCliSpawn,
  skillCandidateDirs,
  skillsAddCommand,
  type UpstreamSkill,
  updateSkills,
} from "./skill-install.js";

const SKILL: UpstreamSkill = {
  repo: "acme/demo-skill",
  name: "demo",
  entryRelative: path.join("scripts", "demo.py"),
  pluginCache: path.join("demo-skill", "demo"),
};

function fakeSkill(root: string, frontmatter = 'version: "1.2.3"'): void {
  fs.mkdirSync(path.join(root, "scripts"), { recursive: true });
  fs.writeFileSync(path.join(root, "scripts", "demo.py"), "# stub\n");
  fs.writeFileSync(
    path.join(root, "SKILL.md"),
    `---\nname: demo\n${frontmatter}\n---\n# stub\n`,
  );
}

describe("skill-install resolution", () => {
  let cwd: string;
  let home: string;
  beforeEach(() => {
    cwd = fs.mkdtempSync(path.join(os.tmpdir(), "oma-skill-cwd-"));
    home = fs.mkdtempSync(path.join(os.tmpdir(), "oma-skill-home-"));
  });
  afterEach(() => {
    fs.rmSync(cwd, { recursive: true, force: true });
    fs.rmSync(home, { recursive: true, force: true });
  });

  it("probes project dirs, then home dirs, then the universal dir and plugin cache", () => {
    const pc = path.join(
      home,
      ".claude",
      "plugins",
      "cache",
      "demo-skill",
      "demo",
    );
    fs.mkdirSync(path.join(pc, "1.10.0"), { recursive: true });
    fs.mkdirSync(path.join(pc, "1.9.0"), { recursive: true });
    const sources = skillCandidateDirs(SKILL, cwd, home).map((c) => c.source);
    expect(sources[0]).toBe("project:.agents/skills");
    const lastProject = sources.findLastIndex((s) => s.startsWith("project:"));
    const firstHome = sources.findIndex((s) => s.startsWith("home:"));
    expect(lastProject).toBeLessThan(firstHome);
    expect(sources).toContain("home:~/.config/agents/skills");
    expect(sources.slice(-4)).toEqual([
      "home:claude-plugin-cache:1.10.0",
      "home:claude-plugin-cache:1.10.0",
      "home:claude-plugin-cache:1.9.0",
      "home:claude-plugin-cache:1.9.0",
    ]);
  });

  it("returns the first dir that holds the entry file and records every probe", () => {
    fakeSkill(path.join(home, ".claude", "skills", "demo"));
    fs.mkdirSync(path.join(cwd, ".agents", "skills", "demo"), {
      recursive: true,
    }); // present but no entry → skipped
    const { install, probed } = findInstalledSkill(SKILL, { cwd, home });
    expect(install?.source).toBe("home:~/.claude/skills");
    expect(install?.entry).toBe(
      path.join(home, ".claude", "skills", "demo", "scripts", "demo.py"),
    );
    expect(install?.version).toBe("1.2.3");
    expect(probed[0]).toBe(path.join(cwd, ".agents", "skills", "demo"));
  });

  it("prefers a project install over a home install", () => {
    fakeSkill(path.join(home, ".agents", "skills", "demo"));
    fakeSkill(path.join(cwd, ".codex", "skills", "demo"));
    expect(findInstalledSkill(SKILL, { cwd, home }).install?.source).toBe(
      "project:.codex/skills",
    );
  });

  it("finds nothing when no candidate holds the entry", () => {
    const { install, probed } = findInstalledSkill(SKILL, { cwd, home });
    expect(install).toBeUndefined();
    expect(probed.length).toBeGreaterThan(10);
  });

  it("reads top-level, metadata-nested, and package.json versions", () => {
    const a = path.join(cwd, "a");
    fakeSkill(a, "version: 2.0.0");
    expect(readSkillVersion(a)).toBe("2.0.0");
    const b = path.join(cwd, "b");
    fakeSkill(b, 'metadata:\n  version: "6.7.3"\n  license: "MIT"');
    expect(readSkillVersion(b)).toBe("6.7.3");
    const c = path.join(cwd, "c");
    fakeSkill(c, "description: no version");
    fs.writeFileSync(path.join(c, "package.json"), '{"version":"0.4.1"}');
    expect(readSkillVersion(c)).toBe("0.4.1");
    expect(readSkillVersion(path.join(cwd, "missing"))).toBeUndefined();
  });
});

describe("skills CLI invocation", () => {
  function recorder(result: Partial<ReturnType<SkillsCliSpawn>> = {}) {
    const calls: Array<{ args: string[]; env: NodeJS.ProcessEnv }> = [];
    const spawn: SkillsCliSpawn = (args, env) => {
      calls.push({ args, env });
      return { status: 0, stdout: "", stderr: "", error: undefined, ...result };
    };
    return { calls, spawn };
  }

  it("installs globally and non-interactively with telemetry off", () => {
    const { calls, spawn } = recorder();
    expect(installSkills("acme/x", ["a", "b"], spawn)).toEqual({
      ok: true,
      detail: "",
    });
    expect(calls[0]?.args).toEqual([
      "skills",
      "add",
      "acme/x",
      "--skill",
      "a",
      "--skill",
      "b",
      "-g",
      "-y",
    ]);
    expect(calls[0]?.env.DISABLE_TELEMETRY).toBe("1");
    expect(skillsAddCommand("acme/x", ["a"])).toBe(
      "bunx skills add acme/x --skill a -g -y",
    );
  });

  it("updates named skills globally", () => {
    const { calls, spawn } = recorder();
    updateSkills(["a", "b"], spawn);
    expect(calls[0]?.args).toEqual(["skills", "update", "a", "b", "-g", "-y"]);
  });

  it("surfaces the last output lines without ANSI codes on failure", () => {
    const { spawn } = recorder({
      status: 1,
      stderr: "\x1b[31mone\x1b[0m\ntwo\nthree\nfour\n",
    });
    expect(installSkills("acme/x", ["a"], spawn)).toEqual({
      ok: false,
      detail: "skills CLI exit 1: two | three | four",
    });
  });

  it("explains a missing bunx", () => {
    const err = Object.assign(new Error("spawn bunx ENOENT"), {
      code: "ENOENT",
    });
    const { spawn } = recorder({ status: null, error: err });
    expect(updateSkills(["a"], spawn).detail).toMatch(/bunx not found/);
  });
});
