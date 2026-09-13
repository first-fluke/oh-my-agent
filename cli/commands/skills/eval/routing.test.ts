import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  buildRoutingPrompt,
  catalogHash,
  loadRoutingRecord,
  loadSkillCatalog,
  measureRouting,
  parseRoutingChoice,
  summarizeRouting,
  writeRoutingRecord,
} from "./routing.js";
import type { TaskFixture } from "./types.js";

const roots: string[] = [];
afterEach(() => {
  vi.restoreAllMocks();
  for (const root of roots.splice(0))
    rmSync(root, { recursive: true, force: true });
});

function workspaceWithSkills(
  skills: Record<string, { description?: string; name?: string }>,
): string {
  const root = mkdtempSync(join(tmpdir(), "oma-routing-"));
  roots.push(root);
  for (const [dir, meta] of Object.entries(skills)) {
    const skillDir = join(root, ".agents", "skills", dir);
    mkdirSync(skillDir, { recursive: true });
    const frontmatter = [
      "---",
      ...(meta.name ? [`name: ${meta.name}`] : []),
      ...(meta.description ? [`description: "${meta.description}"`] : []),
      "---",
    ].join("\n");
    writeFileSync(join(skillDir, "SKILL.md"), `${frontmatter}\n\n# ${dir}\n`);
  }
  return root;
}

const task = (id: string, prompt = `do ${id}`): TaskFixture => ({
  id,
  skill: "skill-x",
  domain: "d",
  prompt,
  checker: { type: "assert", expect_contains: ["x"] },
  weight: 1,
});

const catalog = [
  { name: "skill-x", description: "Handle x requests." },
  { name: "skill-xy", description: "Handle xy requests." },
  { name: "skill-y", description: "Handle y requests." },
];

describe("skill catalog", () => {
  it("lists installed skills that declare a description, sorted by name", async () => {
    const root = workspaceWithSkills({
      zeta: { description: "Zeta things." },
      alpha: { description: "Alpha things.", name: "alpha-skill" },
      nodesc: {},
      _private: { description: "hidden" },
    });
    expect(loadSkillCatalog(root)).toEqual([
      { name: "alpha-skill", description: "Alpha things." },
      { name: "zeta", description: "Zeta things." },
    ]);
    expect(loadSkillCatalog(join(root, "missing"))).toEqual([]);
    expect(catalogHash(loadSkillCatalog(root))).toMatch(/^[a-f0-9]{16}$/);
  });
});

describe("routing prompt and choice parsing", () => {
  it("lists every catalog entry and the request", async () => {
    const prompt = buildRoutingPrompt(catalog, "please do x");
    expect(prompt).toContain("- skill-x — Handle x requests.");
    expect(prompt).toContain("- skill-y — Handle y requests.");
    expect(prompt).toContain("please do x");
    expect(prompt).toContain("NONE");
  });

  it("maps answers to target, other, none, or unparsed", async () => {
    expect(parseRoutingChoice("skill-x", catalog, "skill-x")).toEqual({
      choice: "skill-x",
      outcome: "target",
    });
    expect(
      parseRoutingChoice("`skill-y`\n\nbecause…", catalog, "skill-x"),
    ).toEqual({
      choice: "skill-y",
      outcome: "other",
    });
    expect(parseRoutingChoice("NONE", catalog, "skill-x")).toEqual({
      choice: null,
      outcome: "none",
    });
    expect(
      parseRoutingChoice("none of these apply", catalog, "skill-x"),
    ).toEqual({
      choice: null,
      outcome: "none",
    });
    expect(
      parseRoutingChoice("I would pick skill-xy here", catalog, "skill-x"),
    ).toEqual({
      choice: "skill-xy",
      outcome: "other",
    });
    expect(parseRoutingChoice("", catalog, "skill-x")).toEqual({
      choice: null,
      outcome: "unparsed",
    });
    expect(parseRoutingChoice("banana", catalog, "skill-x").outcome).toBe(
      "unparsed",
    );
  });

  it("reads the choice from a vendor envelope", async () => {
    const envelope = JSON.stringify({
      type: "result",
      is_error: false,
      subagent_stats: { failed: 0 },
      result: "skill-x",
    });
    expect(parseRoutingChoice(envelope, catalog, "skill-x").outcome).toBe(
      "target",
    );
  });
});

describe("measure, summarize, record, replay", () => {
  it("dispatches one routing prompt per task through the baseline arm and summarizes", async () => {
    const root = mkdtempSync(join(tmpdir(), "oma-routing-ws-"));
    roots.push(root);
    const arms: string[] = [];
    const dispatch = vi.fn((arm: string, prompt: string) => {
      arms.push(arm);
      if (prompt.includes("do t1")) return "skill-x";
      if (prompt.includes("do t2")) return "skill-y";
      if (prompt.includes("do t3")) throw new Error("boom");
      return "NONE";
    });
    const tasks = [task("t1"), task("t2"), task("t3"), task("t4")];
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const entries = await measureRouting({
      tasks,
      target: "skill-x",
      catalog,
      dispatchFn: dispatch,
      workspace: root,
    });
    expect(arms).toEqual(["baseline", "baseline", "baseline", "baseline"]);
    expect(entries.map((e) => [e.taskId, e.outcome])).toEqual([
      ["t1", "target"],
      ["t2", "other"],
      ["t4", "none"],
    ]);
    expect(warn).toHaveBeenCalledWith(expect.stringContaining("t3"));
    const summary = summarizeRouting(tasks, entries, "stale", catalog.length);
    expect(summary).toEqual({
      status: "stale",
      measured: 3,
      activated: 1,
      misrouted: 1,
      none: 1,
      unparsed: 0,
      activationRate: 1 / 3,
      misroutedTo: { "skill-y": 1 },
      catalogSize: 3,
    });
  });

  it("replays a recording only under the same catalog and tasks", async () => {
    const taskDir = mkdtempSync(join(tmpdir(), "oma-routing-rec-"));
    roots.push(taskDir);
    const tasks = [task("t1"), task("t2")];
    const hash = catalogHash(catalog);
    const entries = await measureRouting({
      tasks,
      target: "skill-x",
      catalog,
      dispatchFn: () => "skill-x",
      workspace: taskDir,
    });
    const path = writeRoutingRecord(taskDir, "skill-x", hash, entries);
    expect(path).toMatch(/_rollouts\/[a-f0-9]{16}\.routing\.json$/);

    const same = loadRoutingRecord(taskDir, "skill-x", hash, tasks);
    expect(same.status).toBe("measured");
    expect(same.entries).toHaveLength(2);

    const otherCatalog = loadRoutingRecord(taskDir, "skill-x", "0000", tasks);
    expect(otherCatalog).toEqual({ entries: [], status: "stale" });

    const changedTask = loadRoutingRecord(taskDir, "skill-x", hash, [
      task("t1"),
      task("t2", "a different prompt"),
    ]);
    expect(changedTask.status).toBe("stale");
    expect(changedTask.entries.map((e) => e.taskId)).toEqual(["t1"]);

    expect(loadRoutingRecord(taskDir, "skill-z", hash, tasks).status).toBe(
      "unavailable",
    );
  });
});
