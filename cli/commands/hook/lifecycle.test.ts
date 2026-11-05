import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  activateWorkflowSession,
  readEvents,
  readIndex,
} from "../../state/events.js";
import { runHookDispatch } from "./dispatch.js";

const roots: string[] = [];
afterEach(() => {
  for (const root of roots.splice(0))
    rmSync(root, { recursive: true, force: true });
});
function project(): string {
  const root = mkdtempSync(join(tmpdir(), "oma-native-lifecycle-"));
  roots.push(root);
  mkdirSync(join(root, ".git"));
  mkdirSync(join(root, ".agents"));
  writeFileSync(
    join(root, ".agents/oma-config.yaml"),
    "providers:\n  semantic_memory: none\n",
  );
  return root;
}

describe("native subagent lifecycle observation", () => {
  it("records child start and stop in the active OMA session without closing it", async () => {
    const root = project();
    activateWorkflowSession({
      projectDir: root,
      workflow: "work",
      sid: "parent",
      vendor: "codex",
    });
    for (const nativeEvent of ["SubagentStart", "SubagentStop"]) {
      expect(
        await runHookDispatch({
          vendor: "codex",
          nativeEvent,
          cwd: root,
          sid: "vendor-parent",
          rawStdin: JSON.stringify({
            cwd: root,
            agent_id: "child-1",
            agent_type: "backend-engineer",
          }),
        }),
      ).toEqual({ output: "" });
    }
    expect(
      readEvents(root, "parent").filter((event) =>
        event.kind.startsWith("subagent."),
      ),
    ).toMatchObject([
      {
        kind: "subagent.started",
        vendor: "codex",
        vendorSid: "vendor-parent",
        payload: { agentId: "child-1", agentType: "backend-engineer" },
      },
      { kind: "subagent.stopped", payload: { agentId: "child-1" } },
    ]);
    expect(readIndex(root).active.main).toBe("parent");
    expect(
      readEvents(root, "parent").some(
        (event) => event.kind === "session.ended",
      ),
    ).toBe(false);
  });

  it("accepts Copilot native lifecycle fields and ignores malformed input", async () => {
    const root = project();
    activateWorkflowSession({
      projectDir: root,
      workflow: "work",
      sid: "parent",
      vendor: "copilot",
    });
    await runHookDispatch({
      vendor: "copilot",
      nativeEvent: "subagentStart",
      cwd: root,
      rawStdin: JSON.stringify({
        cwd: root,
        sessionId: "copilot-parent",
        agentName: "backend-engineer",
      }),
    });
    expect(readEvents(root, "parent").at(-1)).toMatchObject({
      kind: "subagent.started",
      vendor: "copilot",
      vendorSid: "copilot-parent",
      payload: { agentName: "backend-engineer" },
    });
    const count = readEvents(root, "parent").length;
    await runHookDispatch({
      vendor: "copilot",
      nativeEvent: "subagentStop",
      cwd: root,
      rawStdin: "null",
    });
    expect(readEvents(root, "parent")).toHaveLength(count);
  });
});
