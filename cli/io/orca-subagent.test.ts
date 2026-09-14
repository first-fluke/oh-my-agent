import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createOrcaSubagent } from "./orca-subagent.js";

describe("Orca child status bridge", () => {
  let directory: string;
  let endpoint: string;
  let parent: NodeJS.ProcessEnv;
  const post = vi.fn<typeof fetch>();
  const writeEndpoint = (port = "12345", token = "test-token") => {
    fs.writeFileSync(
      endpoint,
      [
        `ORCA_AGENT_HOOK_PORT=${port}`,
        `ORCA_AGENT_HOOK_TOKEN=${token}`,
        "ORCA_AGENT_HOOK_ENV=prod",
        "ORCA_AGENT_HOOK_VERSION=1",
      ].join("\n"),
    );
  };
  const create = () => {
    const bridge = createOrcaSubagent(
      "codex",
      "mobile",
      "qwen",
      parent,
      parent,
    );
    if (!bridge) throw new Error("Expected an Orca bridge");
    return bridge;
  };
  const bodies = () =>
    post.mock.calls.map(([, options]) => JSON.parse(String(options?.body)));

  beforeEach(() => {
    vi.useFakeTimers();
    directory = fs.mkdtempSync(path.join(os.tmpdir(), "oma-orca-test-"));
    endpoint = path.join(directory, "endpoint.env");
    writeEndpoint();
    parent = {
      ORCA_PANE_KEY: "parent-pane",
      ORCA_TAB_ID: "parent-tab",
      ORCA_WORKTREE_ID: "parent-worktree",
      ORCA_AGENT_LAUNCH_TOKEN: "launch-test",
      ORCA_AGENT_HOOK_ENDPOINT: endpoint,
      ORCA_AGENT_HOOK_TOKEN: "old-token",
      PATH: "/bin",
      QWEN_API_KEY: "preserve-test",
    };
    post.mockReset();
    post.mockImplementation(async () => new Response(null, { status: 204 }));
    vi.stubGlobal("fetch", post);
  });
  afterEach(() => {
    vi.clearAllTimers();
    vi.useRealTimers();
    vi.unstubAllGlobals();
    fs.rmSync(directory, { recursive: true, force: true });
  });

  it("is inactive without parent context or when disabled", () => {
    expect(
      createOrcaSubagent("qwen", "mobile", "qwen", {}, parent),
    ).toBeUndefined();
    expect(
      createOrcaSubagent("codex", "mobile", "qwen", {}, {}),
    ).toBeUndefined();
    expect(
      createOrcaSubagent(
        "codex",
        "mobile",
        "qwen",
        {},
        {
          ...parent,
          OMA_ORCA_SUBAGENTS: "0",
        },
      ),
    ).toBeUndefined();
    expect(post).not.toHaveBeenCalled();
  });

  it.each(["claude", "codex"])(
    "routes %s parent lifecycle events through its own hook source",
    async (runtimeVendor) => {
      const bridge = createOrcaSubagent(
        runtimeVendor,
        "mobile",
        "qwen",
        parent,
        parent,
      );
      if (!bridge) throw new Error("Expected supported parent adapter");
      bridge.start();
      await bridge.stop();
      expect(post.mock.calls.map(([url]) => url)).toEqual([
        `http://127.0.0.1:12345/hook/${runtimeVendor}`,
        `http://127.0.0.1:12345/hook/${runtimeVendor}`,
      ]);
      expect(bodies().map((body) => body.payload.hook_event_name)).toEqual([
        "SubagentStart",
        "SubagentStop",
      ]);
    },
  );

  it.each([
    "claude",
    "codex",
    "qwen",
    "cursor",
    "antigravity",
    "grok",
    "kimi",
    "kiro",
    "opencode",
    "pi",
    "unknown",
    "custom-cli",
  ])(
    "uses the advertised generic endpoint for a %s parent",
    async (runtimeVendor) => {
      fs.appendFileSync(endpoint, "\nORCA_AGENT_HOOK_SUBAGENTS=1\n");
      const bridge = createOrcaSubagent(
        runtimeVendor,
        "mobile",
        "qwen",
        parent,
        parent,
      );
      if (!bridge) throw new Error("Expected generic bridge");
      bridge.start();
      await bridge.stop();
      expect(post.mock.calls.map(([url]) => url)).toEqual([
        "http://127.0.0.1:12345/hook/subagent",
        "http://127.0.0.1:12345/hook/subagent",
      ]);
      expect(bodies().map((body) => body.payload.action)).toEqual([
        "start",
        "stop",
      ]);
      expect(bodies()[0].payload).toMatchObject({
        parentType: runtimeVendor,
        agentType: "qwen:mobile",
      });
      expect(bodies()[0].payload.id).toBe(bodies()[1].payload.id);
    },
  );

  it("does not silently switch protocols if Orca is downgraded during a run", async () => {
    fs.appendFileSync(endpoint, "\nORCA_AGENT_HOOK_SUBAGENTS=1\n");
    const bridge = create();
    bridge.start();
    writeEndpoint();
    await vi.advanceTimersByTimeAsync(2_000);
    await bridge.stop();
    expect(post).toHaveBeenCalledTimes(1);
  });

  it.each([
    "qwen",
    "cursor",
    "antigravity",
    "grok",
    "kimi",
    "kiro",
    "opencode",
    "pi",
    "unknown",
    "toString",
  ])("does not relabel an unsupported %s parent as Codex", (runtimeVendor) => {
    expect(
      createOrcaSubagent(runtimeVendor, "mobile", "qwen", parent, parent),
    ).toBeUndefined();
    expect(post).not.toHaveBeenCalled();
    expect(parent.ORCA_PANE_KEY).toBe("parent-pane");
  });

  it.each([
    "claude",
    "codex",
    "qwen",
    "cursor",
    "antigravity",
    "grok",
    "kimi",
    "kiro",
    "opencode",
    "pi",
  ])(
    "allows %s as the spawned vendor under either supported parent",
    async (vendor) => {
      for (const runtime of ["claude", "codex"]) {
        const bridge = createOrcaSubagent(
          runtime,
          "worker",
          vendor,
          parent,
          parent,
        );
        if (!bridge) throw new Error("Expected supported parent adapter");
        bridge.start();
        await bridge.stop();
        expect(bodies().at(-1)?.payload.agent_type).toBe(`${vendor}:worker`);
      }
    },
  );

  it("isolates hook identity while preserving the child's execution environment", () => {
    const bridge = create();
    expect(bridge.childEnv.PATH).toBe("/bin");
    expect(bridge.childEnv.QWEN_API_KEY).toBe("preserve-test");
    expect(bridge.childEnv.ORCA_PANE_KEY).toBeUndefined();
    expect(bridge.childEnv.ORCA_AGENT_HOOK_TOKEN).toBeUndefined();
    expect(bridge.childEnv.ORCA_AGENT_LAUNCH_TOKEN).toBeUndefined();
    expect(parent.ORCA_PANE_KEY).toBe("parent-pane");
  });

  it("refreshes a cleared child row and removes it once at exit", async () => {
    const bridge = create();
    bridge.start();
    bridge.start();
    await vi.advanceTimersByTimeAsync(2_000);
    await bridge.stop();
    await bridge.stop();
    await vi.advanceTimersByTimeAsync(10_000);
    expect(bodies().map((body) => body.payload.hook_event_name)).toEqual([
      "SubagentStart",
      "SubagentStart",
      "SubagentStop",
    ]);
    expect(new Set(bodies().map((body) => body.payload.agent_id)).size).toBe(1);
    expect(bodies()[0]).toMatchObject({
      paneKey: "parent-pane",
      tabId: "parent-tab",
      worktreeId: "parent-worktree",
      launchToken: "launch-test",
      payload: { agent_type: "qwen:mobile" },
    });
    expect(bodies()[0].payload).not.toHaveProperty("model");
  });

  it("uses distinct identities for concurrent runs and failover attempts", async () => {
    const a = create();
    const b = create();
    a.start();
    b.start();
    expect(bodies()[0].payload.agent_id).not.toBe(bodies()[1].payload.agent_id);
    await Promise.all([a.stop(), b.stop()]);
  });

  it("reloads endpoint credentials after Orca restarts", async () => {
    const bridge = create();
    bridge.start();
    writeEndpoint("23456", "rotated-token");
    await vi.advanceTimersByTimeAsync(2_000);
    expect(post.mock.calls[1]?.[0]).toBe("http://127.0.0.1:23456/hook/codex");
    expect(post.mock.calls[1]?.[1]?.headers).toMatchObject({
      "X-Orca-Agent-Hook-Token": "rotated-token",
    });
    await bridge.stop();
  });

  it("serializes exit behind an in-flight start without overlapping refreshes", async () => {
    let release!: (response: Response) => void;
    post.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          release = resolve;
        }),
    );
    const bridge = create();
    bridge.start();
    await vi.advanceTimersByTimeAsync(6_000);
    const stopped = bridge.stop();
    expect(post).toHaveBeenCalledTimes(1);
    release(new Response(null, { status: 204 }));
    await stopped;
    expect(bodies().map((body) => body.payload.hook_event_name)).toEqual([
      "SubagentStart",
      "SubagentStop",
    ]);
  });

  it("tolerates missing endpoints and transport failures, and retries on refresh", async () => {
    fs.unlinkSync(endpoint);
    const bridge = create();
    bridge.start();
    expect(post).not.toHaveBeenCalled();
    writeEndpoint();
    post.mockRejectedValueOnce(new Error("offline"));
    await vi.advanceTimersByTimeAsync(2_000);
    await vi.advanceTimersByTimeAsync(2_000);
    expect(post).toHaveBeenCalledTimes(2);
    await expect(bridge.stop()).resolves.toBeUndefined();
  });

  it("rejects invalid port data and never executes endpoint shell content", async () => {
    writeEndpoint("$(touch injected)");
    const bridge = create();
    bridge.start();
    await bridge.stop();
    expect(post).not.toHaveBeenCalled();
  });

  it("does not publish a failed launch that was never started", async () => {
    const bridge = create();
    await bridge.stop();
    bridge.start();
    await vi.advanceTimersByTimeAsync(5_000);
    expect(post).not.toHaveBeenCalled();
  });
});
