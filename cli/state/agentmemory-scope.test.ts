import {
  mkdirSync,
  mkdtempSync,
  realpathSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  createAgentMemoryScope,
  filterAgentMemoryResults,
  scopedAgentMemorySessionId,
} from "./agentmemory-scope.js";

describe("AgentMemory project scope", () => {
  const roots: string[] = [];

  afterEach(() => {
    vi.restoreAllMocks();
    for (const root of roots.splice(0)) {
      rmSync(root, { recursive: true, force: true });
    }
  });

  function workspace() {
    const root = mkdtempSync(join(tmpdir(), "oma-memory-scope-"));
    roots.push(root);
    return root;
  }

  function project(root: string, ...parts: string[]) {
    const dir = join(root, ...parts);
    mkdirSync(join(dir, ".git"), { recursive: true });
    return dir;
  }

  it("separates projects with the same basename by canonical path", () => {
    const root = workspace();
    const b = createAgentMemoryScope(project(root, "b", "app"), {
      OMA_PROFILE: "0",
    });
    const d = createAgentMemoryScope(project(root, "d", "app"), {
      OMA_PROFILE: "0",
    });

    expect(b.projectId).toMatch(/^[a-f0-9]{64}$/);
    expect(b.projectId).not.toBe(d.projectId);
    expect(b.project).toBe(`oma:0:${b.projectId}`);
    expect(b.concept).toBe(`oma-project:0:${b.projectId}`);
    expect(b.project).not.toBe(d.project);
    expect(b.concept).not.toBe(d.concept);
  });

  it("keeps one scope for explicit canonical and symlink project paths", () => {
    const root = workspace();
    const original = project(root, "project");
    const alias = join(root, "project-link");
    symlinkSync(original, alias, "dir");
    const env = { OMA_PROFILE: "0" };
    const expected = createAgentMemoryScope(original, env);

    expect(expected.projectDir).toBe(realpathSync(original));
    expect(createAgentMemoryScope(alias, env)).toEqual(expected);
  });

  it("discovers the project root from a nested cwd only when no project is supplied", () => {
    const root = workspace();
    const original = project(root, "project");
    const nested = join(original, "src", "feature");
    mkdirSync(nested, { recursive: true });
    vi.spyOn(process, "cwd").mockReturnValue(nested);
    const env = { OMA_PROFILE: "0" };

    expect(createAgentMemoryScope(undefined, env)).toEqual(
      createAgentMemoryScope(original, env),
    );
    expect(createAgentMemoryScope(nested, env).project).not.toBe(
      createAgentMemoryScope(original, env).project,
    );
  });

  it("retains a nested worktree's identity after its marker and directory are removed", () => {
    const parent = project(workspace(), "parent-repo");
    const worktree = join(parent, ".worktrees", "feature");
    mkdirSync(worktree, { recursive: true });
    writeFileSync(
      join(worktree, ".git"),
      "gitdir: ../../.git/worktrees/feature\n",
    );
    const env = { OMA_PROFILE: "0" };
    const original = createAgentMemoryScope(worktree, env);
    const parentScope = createAgentMemoryScope(parent, env);

    expect(original.project).not.toBe(parentScope.project);
    rmSync(join(worktree, ".git"));
    expect(createAgentMemoryScope(worktree, env)).toEqual(original);
    rmSync(worktree, { recursive: true });
    expect(createAgentMemoryScope(worktree, env)).toEqual(original);
    expect(createAgentMemoryScope(worktree, env).project).not.toBe(
      parentScope.project,
    );
  });

  it("shares a project across vendors and sessions while isolating profiles", () => {
    const dir = project(workspace(), "shared");
    const codex = createAgentMemoryScope(dir, {
      OMA_PROFILE: "0",
      OMA_VENDOR: "codex",
    });
    const claude = createAgentMemoryScope(dir, {
      OMA_PROFILE: "0",
      OMA_VENDOR: "claude",
    });
    const otherProfile = createAgentMemoryScope(dir, { OMA_PROFILE: "1" });

    expect(claude).toEqual(codex);
    expect(scopedAgentMemorySessionId(codex, "codex-session")).toBe(
      `${codex.project}:codex-session`,
    );
    expect(scopedAgentMemorySessionId(claude, "claude-session")).toBe(
      `${codex.project}:claude-session`,
    );
    expect(otherProfile.projectId).toBe(codex.projectId);
    expect(otherProfile.project).not.toBe(codex.project);
    expect(otherProfile.concept).not.toBe(codex.concept);
    expect(scopedAgentMemorySessionId(otherProfile, "codex-session")).not.toBe(
      scopedAgentMemorySessionId(codex, "codex-session"),
    );
  });

  it.each(["", "00", "-1", "team", "1:extra", "10000000000"])(
    "rejects an invalid profile %j instead of creating an ambiguous namespace",
    (profile) => {
      expect(() =>
        createAgentMemoryScope(project(workspace(), "project"), {
          OMA_PROFILE: profile,
        }),
      ).toThrow(/OMA_PROFILE/);
    },
  );
});

describe("AgentMemory search ownership", () => {
  const own = createAgentMemoryScope("/tmp/oma-scope-owner", {
    OMA_PROFILE: "0",
  });
  const foreign = createAgentMemoryScope("/tmp/oma-scope-foreign", {
    OMA_PROFILE: "0",
  });
  const otherProfile = createAgentMemoryScope("/tmp/oma-scope-owner", {
    OMA_PROFILE: "1",
  });
  const ownSession = scopedAgentMemorySessionId(own, "session");
  const foreignSession = scopedAgentMemorySessionId(foreign, "session");

  function memory(observation: Record<string, unknown> = {}) {
    return {
      score: 8,
      sessionId: "memory",
      observation: {
        id: "mem-own",
        sessionId: "memory",
        narrative: "owned durable memory",
        concepts: [own.concept],
        ...observation,
      },
    };
  }

  it("keeps marked durable memories and scoped observations with their evidence", () => {
    const durable = memory();
    const observation = {
      score: 6,
      sessionId: ownSession,
      observation: {
        id: "obs-own",
        sessionId: ownSession,
        narrative: "owned event",
        concepts: [],
      },
    };
    const innerSessionOnly = {
      observation: { sessionId: ownSession, facts: ["owned event"] },
    };
    const outerSessionOnly = {
      sessionId: ownSession,
      observation: { narrative: "owned event" },
    };
    const input = {
      results: [durable, observation, innerSessionOnly, outerSessionOnly],
    };

    const filtered = filterAgentMemoryResults(input, own);
    expect(filtered.results).toEqual(input.results);
    expect(filtered.results[0]).toBe(durable);
    expect(input.results).toHaveLength(4);
  });

  it.each([
    ["a foreign concept", memory({ concepts: [foreign.concept] })],
    ["a different profile", memory({ concepts: [otherProfile.concept] })],
    [
      "both own and foreign concepts",
      memory({ concepts: [own.concept, foreign.concept] }),
    ],
    [
      "a foreign inner session despite an own marker",
      memory({ sessionId: foreignSession }),
    ],
    [
      "a foreign outer session despite an own marker",
      { ...memory(), sessionId: foreignSession },
    ],
    [
      "conflicting inner and outer sessions",
      { ...memory({ sessionId: ownSession }), sessionId: foreignSession },
    ],
    [
      "an unscoped legacy session despite an own marker",
      memory({ sessionId: "legacy-session" }),
    ],
    ["an empty scoped session", memory({ sessionId: `${own.project}:` })],
    [
      "a neighboring project prefix",
      memory({ sessionId: `${own.project}extra:session` }),
    ],
    ["a foreign inner project", memory({ project: foreign.project })],
    ["a foreign outer project", { ...memory(), project: foreign.project }],
    ["an empty explicit project", memory({ project: "" })],
    ["a malformed explicit project", memory({ project: 0 })],
    ["an unmarked legacy memory", memory({ concepts: [] })],
    [
      "only an explicit project without ownership evidence",
      memory({ project: own.project, concepts: [] }),
    ],
    [
      "an ordinary concept without ownership evidence",
      memory({ concepts: ["architecture"] }),
    ],
    [
      "scope text in the narrative without metadata",
      memory({ narrative: own.concept, concepts: [] }),
    ],
    ["a malformed concept collection", memory({ concepts: own.concept })],
    ["a missing observation", { sessionId: ownSession }],
    ["an empty observation", { observation: {} }],
    ["a primitive entry", own.concept],
    ["a null entry", null],
  ])("drops %s", (_description, result) => {
    expect(filterAgentMemoryResults({ results: [result] }, own)).toEqual({
      results: [],
    });
  });

  it.each([null, undefined, [], {}, { results: null }, { results: "legacy" }])(
    "returns no results for a malformed envelope %j",
    (data) => {
      expect(filterAgentMemoryResults(data, own)).toEqual({ results: [] });
    },
  );
});
