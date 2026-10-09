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
import { dirname, join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { migrateGlobalHome } from "./global-home-migration.js";

let home: string;
function write(relative: string, content: string) {
  const target = join(home, relative);
  mkdirSync(dirname(target), { recursive: true });
  writeFileSync(target, content);
}
function seed() {
  write(
    ".agents/skills/_version.json",
    JSON.stringify({ version: "16.0.1", mode: "global" }),
  );
  write(
    ".agents/state/managed-skills.json",
    JSON.stringify({ schemaVersion: 1, skills: ["oma-debug"] }),
  );
  write(".agents/skills/oma-debug/SKILL.md", "owned skill");
  write(".agents/skills/personal/SKILL.md", "user skill");
  write(".agents/oma-config.yaml", "language: ko\n");
}
beforeEach(() => {
  home = mkdtempSync(join(tmpdir(), "oma-home-migration-"));
});
afterEach(() => rmSync(home, { recursive: true, force: true }));
const run = (dryRun = false) =>
  migrateGlobalHome({ homeDir: home, env: {}, dryRun });

describe("global OMA home migration", () => {
  it("copies managed definitions and settings, preserving originals and unrelated skills", async () => {
    seed();
    const result = await run();
    expect(result.conflicts).toEqual([]);
    expect(result.deferred).toEqual([]);
    expect(
      readFileSync(
        join(home, ".oma/.agents/skills/oma-debug/SKILL.md"),
        "utf8",
      ),
    ).toBe("owned skill");
    expect(existsSync(join(home, ".oma/.agents/skills/personal"))).toBe(false);
    expect(
      readFileSync(join(home, ".agents/skills/personal/SKILL.md"), "utf8"),
    ).toBe("user skill");
    expect(existsSync(join(home, ".agents/skills/oma-debug/SKILL.md"))).toBe(
      true,
    );
  });
  it("does not reintroduce old content after a successful migration and update", async () => {
    seed();
    await run();
    write(".oma/.agents/skills/oma-debug/SKILL.md", "new release");
    const second = await run();
    expect(second.conflicts).toEqual([]);
    expect(second.copied).toEqual([]);
    expect(
      readFileSync(
        join(home, ".oma/.agents/skills/oma-debug/SKILL.md"),
        "utf8",
      ),
    ).toBe("new release");
  });
  it("reports collisions without overwriting and permits retry after resolution", async () => {
    seed();
    write(".oma/.agents/oma-config.yaml", "language: en\n");
    const result = await run();
    expect(
      result.conflicts.some((entry) => entry.includes("oma-config.yaml")),
    ).toBe(true);
    expect(
      readFileSync(join(home, ".oma/.agents/oma-config.yaml"), "utf8"),
    ).toBe("language: en\n");
    rmSync(join(home, ".oma/.agents/oma-config.yaml"));
    expect((await run()).conflicts).toEqual([]);
  });
  it("previews migration without creating the new root", async () => {
    seed();
    expect((await run(true)).copied.length).toBeGreaterThan(0);
    expect(existsSync(join(home, ".oma"))).toBe(false);
  });
  it("ignores a non-OMA global skill directory", async () => {
    write(".agents/skills/personal/SKILL.md", "user skill");
    expect((await run()).copied).toEqual([]);
    expect(existsSync(join(home, ".oma/.agents"))).toBe(false);
  });
  it("does not adopt a project install accidentally placed in HOME", async () => {
    seed();
    write(
      ".agents/skills/_version.json",
      JSON.stringify({ version: "16.0.1", mode: "project" }),
    );
    expect((await run()).deferred.join()).toContain("project-mode");
    expect(existsSync(join(home, ".oma/.agents"))).toBe(false);
  });
  it("defers while the legacy installer has a lock", async () => {
    seed();
    write(".agents/_install.lock", JSON.stringify({ pid: process.pid }));
    expect((await run()).deferred.join()).toContain("legacy install lock");
  });
  it("refuses an escaping skill symlink", async () => {
    seed();
    rmSync(join(home, ".agents/skills/oma-debug"), { recursive: true });
    write("private/secret", "do not read");
    symlinkSync(
      join(home, "private"),
      join(home, ".agents/skills/oma-debug"),
      "dir",
    );
    const result = await run();
    expect(result.conflicts.join()).toContain(
      "Symlink requires manual migration",
    );
    expect(existsSync(join(home, ".oma/.agents/skills/oma-debug/secret"))).toBe(
      false,
    );
  });
  it("moves terminal profile data to a custom root without deleting the source", async () => {
    write(
      ".oma/u/0/sessions/sid/meta.json",
      JSON.stringify({ status: "completed" }),
    );
    write(".oma/u/0/sessions/sid/events.jsonl", "event\n");
    const result = await migrateGlobalHome({
      homeDir: home,
      env: { OMA_HOME: join(home, "custom") },
    });
    expect(result.conflicts).toEqual([]);
    expect(
      readFileSync(join(home, "custom/u/0/sessions/sid/events.jsonl"), "utf8"),
    ).toBe("event\n");
    expect(existsSync(join(home, ".oma/u/0/sessions/sid/events.jsonl"))).toBe(
      true,
    );
  });
  it("defers custom-root profile migration when an old session is active", async () => {
    write(
      ".oma/u/0/sessions/sid/meta.json",
      JSON.stringify({ status: "active" }),
    );
    const result = await migrateGlobalHome({
      homeDir: home,
      env: { OMA_HOME: join(home, "custom") },
    });
    expect(result.deferred.join()).toContain("active or unknown session");
    expect(existsSync(join(home, "custom/u"))).toBe(false);
  });
  it("honors an explicit profile override without copying the old default profiles", async () => {
    write(
      ".oma/u/0/sessions/sid/meta.json",
      JSON.stringify({ status: "active" }),
    );
    const result = await migrateGlobalHome({
      homeDir: home,
      env: {
        OMA_HOME: join(home, "custom"),
        OMA_STATE_HOME: join(home, "profiles"),
      },
    });
    expect(result.deferred).toEqual([]);
    expect(existsSync(join(home, "custom/u"))).toBe(false);
  });
  it("defers an active agent run even when all L1 sessions are terminal", async () => {
    write(
      ".oma/u/0/sessions/sid/meta.json",
      JSON.stringify({ status: "completed" }),
    );
    write(
      ".oma/u/0/projects/project/agent-runs/run.json",
      JSON.stringify({ status: "running", runnerPid: process.pid }),
    );
    const result = await migrateGlobalHome({
      homeDir: home,
      env: { OMA_HOME: join(home, "custom") },
    });
    expect(result.deferred.join()).toContain(
      "running agent, lease, or writer lock",
    );
    expect(existsSync(join(home, "custom/u"))).toBe(false);
  });
  it("does not trust a symlinked completion receipt", async () => {
    seed();
    write(
      "receipt.json",
      JSON.stringify({
        schemaVersion: 1,
        source: join(home, ".agents"),
        completed: true,
      }),
    );
    mkdirSync(join(home, ".oma/state/migrations"), { recursive: true });
    symlinkSync(
      join(home, "receipt.json"),
      join(home, ".oma/state/migrations/global-definitions.json"),
    );
    expect((await run()).conflicts.join()).toContain(
      "Symlink requires manual migration",
    );
    expect(existsSync(join(home, ".oma/.agents/skills/oma-debug"))).toBe(false);
  });
  it("rejects the native HOME as a unified root", async () => {
    const result = await migrateGlobalHome({
      homeDir: home,
      env: { OMA_HOME: home },
    });
    expect(result.conflicts.join()).toContain("dedicated directory");
  });
  it.each([".oma/u/0/new", ".agents/custom", ".config/oma/new"])(
    "rejects destination inside legacy source %s before creating it",
    async (relative) => {
      const destination = join(home, relative);
      const result = await migrateGlobalHome({
        homeDir: home,
        env: { OMA_HOME: destination },
      });
      expect(result.conflicts.join()).toContain(
        "overlaps a legacy source tree",
      );
      expect(existsSync(destination)).toBe(false);
    },
  );
});
