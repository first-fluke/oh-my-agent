/**
 * scm-guard refuses `git commit` while a subagent of the session is running.
 * Uses a real temp project: the guard reads the open-subagent records that
 * the SubagentStart/SubagentStop lifecycle hook writes.
 */

import { existsSync, mkdirSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  listOpenSubagents,
  OPEN_SUBAGENT_MAX_AGE_MS,
  recordSubagentStart,
  recordSubagentStop,
} from "../../.agents/hooks/core/open-subagents.ts";
import {
  hasGuardedGitCommit,
  run,
} from "../../.agents/hooks/core/scm-guard.ts";
import { recordLifecycleHook } from "../commands/hook/lifecycle.js";

let project: string;

beforeEach(() => {
  project = mkdtempSync(join(tmpdir(), "oma-scm-busy-"));
  mkdirSync(join(project, ".agents"));
});

afterEach(() => {
  rmSync(project, { recursive: true, force: true });
});

function commit(command: string, sid = "host-1") {
  return run(
    {
      kind: "pre_tool",
      toolName: "Bash",
      toolInput: { command },
      cwd: project,
    },
    { vendor: "claude", cwd: project, sid },
  );
}

function lifecycle(nativeEvent: string, payload: Record<string, unknown>) {
  return recordLifecycleHook({
    vendor: "claude",
    nativeEvent,
    rawStdin: JSON.stringify({ cwd: project, ...payload }),
    cwd: project,
    sid: "host-1",
  });
}

describe("scm-guard — commit while subagents run", () => {
  // Regression: a commit ran while 11 subagents were editing the tree. The
  // pre-commit hook stashed their unstaged work, five files failed to restore,
  // and the edits written during the commit were lost.
  it("blocks a commit while an editing subagent is open, then allows it after the stop", async () => {
    lifecycle("SubagentStart", {
      agent_id: "a1",
      agent_type: "backend-engineer",
    });

    const blocked = await commit("git add src/app.ts && git commit -m wip");
    expect(blocked?.type).toBe("block");
    expect((blocked as { reason: string }).reason).toContain(
      "backend-engineer",
    );

    lifecycle("SubagentStop", { agent_id: "a1" });
    expect(await commit("git commit -m wip")).toBeNull();
  });

  it("records the subagent without an active OMA session", () => {
    lifecycle("SubagentStart", { agent_id: "a1", agent_type: "docs-curator" });

    expect(listOpenSubagents(project)).toMatchObject([
      { agentId: "a1", agentType: "docs-curator", vendorSid: "host-1" },
    ]);
  });

  it("allows the commit when the user-confirmed bypass prefixes the segment", async () => {
    recordSubagentStart(project, { agentId: "a1", agentType: "worker" });

    expect(
      await commit("git add a.ts && OMA_SCM_ALLOW_BUSY=1 git commit -m wip"),
    ).toBeNull();
    expect(
      (await commit("echo OMA_SCM_ALLOW_BUSY=1 && git commit"))?.type,
    ).toBe("block");
  });

  it("leaves other git commands alone while a subagent is open", async () => {
    recordSubagentStart(project, { agentId: "a1", agentType: "worker" });

    expect(await commit("git status")).toBeNull();
    expect(await commit("git add src/app.ts")).toBeNull();
    expect(await commit("git log --grep commit")).toBeNull();
  });

  it("ignores subagents that cannot edit and subagents of another host session", async () => {
    recordSubagentStart(project, { agentId: "a1", agentType: "Explore" });
    recordSubagentStart(project, {
      agentId: "a2",
      agentType: "worker",
      vendorSid: "host-2",
    });

    expect(await commit("git commit -m wip", "host-1")).toBeNull();
    expect((await commit("git commit -m wip", "host-2"))?.type).toBe("block");
  });

  it("drops a start that never received its stop", () => {
    const started = new Date("2026-11-16T00:00:00Z");
    recordSubagentStart(
      project,
      { agentId: "a1", agentType: "worker" },
      started,
    );

    expect(
      listOpenSubagents(
        project,
        undefined,
        started.getTime() + OPEN_SUBAGENT_MAX_AGE_MS - 1,
      ),
    ).toHaveLength(1);
    expect(
      listOpenSubagents(
        project,
        undefined,
        started.getTime() + OPEN_SUBAGENT_MAX_AGE_MS,
      ),
    ).toEqual([]);
    expect(listOpenSubagents(project)).toEqual([]);
  });

  it("keeps agent ids from escaping the record directory", () => {
    recordSubagentStart(project, {
      agentId: "../../escape",
      agentType: "worker",
    });

    expect(existsSync(join(project, "escape.json"))).toBe(false);
    expect(listOpenSubagents(project)).toHaveLength(1);
    recordSubagentStop(project, "../../escape");
    expect(listOpenSubagents(project)).toEqual([]);
  });

  it("does not seed .agents in a directory that is not an OMA project", () => {
    const bare = mkdtempSync(join(tmpdir(), "oma-scm-bare-"));
    try {
      recordSubagentStart(bare, { agentId: "a1", agentType: "worker" });
      expect(existsSync(join(bare, ".agents"))).toBe(false);
    } finally {
      rmSync(bare, { recursive: true, force: true });
    }
  });
});

describe("hasGuardedGitCommit", () => {
  it.each([
    "git commit -m x",
    "cd repo && git commit -q -F msg",
    "git -C sub -c user.name=x commit --amend",
    "(cd x && git commit -m y)",
    "FOO=1 git commit",
  ])("detects %s", (command) => {
    expect(hasGuardedGitCommit(command)).toBe(true);
  });

  it.each([
    "OMA_SCM_ALLOW_BUSY=1 git commit -m x",
    "git log --grep commit",
    "git show commit",
    "git commit-tree abc",
    "echo git commit",
    "git status",
  ])("ignores %s", (command) => {
    expect(hasGuardedGitCommit(command)).toBe(false);
  });
});
