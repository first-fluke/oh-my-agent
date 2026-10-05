import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { test } from "node:test";
import { registerBridge } from "./bridge.mjs";
import {
  createUserMessage,
  execution,
  fakeAgent,
  fakeContext,
  fixture,
} from "./test-support.mjs";

function install(t, config) {
  const ctx = fakeContext();
  registerBridge(ctx, config, createUserMessage);
  t.after(() => ctx.dispose());
  return ctx;
}

test("tool denial stops dispatch and passes the public hook ABI and OMA tool alias", async (t) => {
  const f = await fixture(t, {
    PreToolUse: {
      hookSpecificOutput: {
        hookEventName: "PreToolUse",
        permissionDecision: "deny",
        permissionDecisionReason: "Use Serena.",
      },
    },
  });
  const ctx = install(t, f.config);
  const agent = fakeAgent(f.cwd);
  let actualExecutions = 0;
  const decision = await ctx.handlers.get("tools/pre-execute")(
    execution(agent),
    async () => {
      actualExecutions += 1;
      return { kind: "allow" };
    },
  );
  assert.deepEqual(decision, { kind: "deny", reason: "Use Serena." });
  assert.equal(actualExecutions, 0);
  const [{ argv, payload }] = await f.calls();
  assert.deepEqual(argv, [
    "hook",
    "run",
    "--vendor",
    "claude",
    "--event",
    "PreToolUse",
  ]);
  assert.equal(payload.tool_name, "Bash");
  assert.equal(payload.session_id, agent.id);
  assert.equal(payload.cwd, f.cwd);
});

test("allow preserves downstream approval and frozen input; context queues for the next step", async (t) => {
  const f = await fixture(t, {
    PreToolUse: {
      hookSpecificOutput: { additionalContext: "Check the result." },
    },
  });
  const ctx = install(t, f.config);
  const agent = fakeAgent(f.cwd);
  const args = Object.freeze({ command: "pwd" });
  const downstream = { kind: "ask", reason: "Host approval" };
  let observed;
  const decision = await ctx.handlers.get("tools/pre-execute")(
    execution(agent, "bash", args),
    async () => {
      observed = args;
      return downstream;
    },
  );
  assert.equal(decision, downstream);
  assert.equal(observed, args);
  assert.equal(agent.contexts[0].content[0].text, "Check the result.");
});

test("bash hooks resolve relative and absolute workdir without changing tool arguments", async (t) => {
  const f = await fixture(t);
  const workdir = join(f.cwd, "cli", "deep");
  const whitespaceWorkdir = join(f.cwd, " ");
  await mkdir(workdir, { recursive: true });
  await mkdir(whitespaceWorkdir);
  const ctx = install(t, f.config);
  const agent = fakeAgent(f.cwd);
  for (const value of ["cli/deep", workdir, " "]) {
    const args = Object.freeze({ command: "rg needle ../..", workdir: value });
    const tool = execution(agent, "bash", args);
    const pre = await ctx.handlers.get("tools/pre-execute")(tool, async () => {
      assert.equal(tool.arguments, args);
      return { kind: "allow" };
    });
    assert.equal(pre.kind, "allow");
    await ctx.handlers.get("tools/post-execute")(
      tool,
      { isError: false, value: "needle", content: [] },
      async () => ({ kind: "accept" }),
    );
    assert.deepEqual(args, { command: "rg needle ../..", workdir: value });
  }
  await ctx.handlers.get("agent/turn-stopping")({
    agent,
    turn: 1,
    signal: new AbortController().signal,
  });
  const calls = await f.calls();
  assert.equal(calls.length, 7);
  for (const [index, call] of calls.slice(0, 6).entries()) {
    assert.equal(call.payload.cwd, index < 4 ? workdir : whitespaceWorkdir);
    assert.equal(call.payload.tool_name, "Bash");
    assert.equal(call.payload.tool_input.command, "rg needle ../..");
  }
  assert.equal(calls[0].payload.tool_input.workdir, "cli/deep");
  assert.equal(calls[2].payload.tool_input.workdir, workdir);
  assert.equal(calls[4].payload.tool_input.workdir, " ");
  assert.equal(calls[6].payload.cwd, f.cwd);
});

test("changed updatedInput denies dispatch because pinned DSH cannot apply mutation", async (t) => {
  const f = await fixture(t, {
    PreToolUse: { hookSpecificOutput: { updatedInput: { command: "safe" } } },
  });
  const ctx = install(t, f.config);
  const agent = fakeAgent(f.cwd);
  let calls = 0;
  const args = Object.freeze({ command: "original" });
  const result = await ctx.handlers.get("tools/pre-execute")(
    execution(agent, "bash", args),
    async () => {
      calls += 1;
    },
  );
  assert.equal(result.kind, "deny");
  assert.match(result.reason, /freezes arguments/);
  assert.equal(calls, 0);
  assert.deepEqual(args, { command: "original" });
});

test("post feedback queues beside downstream context without changing the executed result", async (t) => {
  const f = await fixture(t, {
    PostToolUse: {
      decision: "block",
      reason: "Review the changed file.",
      hookSpecificOutput: { additionalContext: "Run the relevant test." },
    },
  });
  const ctx = install(t, f.config);
  const agent = fakeAgent(f.cwd);
  const existing = createUserMessage({
    content: [{ type: "text", text: "Host context" }],
    source: { kind: "host" },
  });
  const result = Object.freeze({
    isError: false,
    value: { saved: true },
    content: [{ type: "text", text: "saved" }],
  });
  const decision = await ctx.handlers.get("tools/post-execute")(
    execution(agent, "write", { file_path: "x.mjs", content: "x" }),
    result,
    async () => ({
      kind: "accept",
      value: { projection: true },
      additionalContexts: [existing],
    }),
  );
  assert.equal(decision.kind, "accept");
  assert.deepEqual(decision.value, { projection: true });
  assert.equal(decision.additionalContexts[1], existing);
  assert.match(
    decision.additionalContexts[0].content[0].text,
    /Run the relevant test.*Review the changed file/s,
  );
  assert.deepEqual(result.value, { saved: true });
  assert.equal((await f.calls())[0].payload.tool_name, "Write");
});

test("runtime initialization avoids identity-changing session and prompt CLI events", async (t) => {
  const f = await fixture(t);
  const ctx = install(t, f.config);
  const agent = fakeAgent(f.cwd);
  await ctx.handlers.get("agent/created")({ agent, source: "startup" });
  await ctx.handlers.get("agent/created")({ agent, source: "startup" });
  assert.equal(agent.contexts.length, 1);
  assert.match(agent.contexts[0].content[0].text, /Runtime: DeepSeek Harness/);
  assert.deepEqual(await f.calls(), []);
  assert.equal(ctx.handlers.has("agent/pre-step"), false);
  const resumed = fakeAgent(f.cwd, agent.id);
  await ctx.handlers.get("agent/created")({ agent: resumed, source: "resume" });
  assert.equal(resumed.contexts.length, 0);
  assert.equal(resumed.id, agent.id);
});

test("OMA absent or missing usable cwd avoids all commands and context", async (t) => {
  const f = await fixture(t, {}, false);
  const ctx = install(t, f.config);
  for (const agent of [
    fakeAgent(f.cwd),
    fakeAgent(undefined),
    fakeAgent("relative"),
  ]) {
    await ctx.handlers.get("agent/created")({ agent, source: "startup" });
    const decision = await ctx.handlers.get("tools/pre-execute")(
      execution(agent),
      async () => ({ kind: "allow" }),
    );
    assert.equal(decision.kind, "allow");
    assert.equal(agent.contexts.length, 0);
  }
  assert.deepEqual(await f.calls(), []);
});

test("stop denial wakes the agent, retries the same reason, and bounds reentry per turn", async (t) => {
  const f = await fixture(t, {
    Stop: { decision: "block", reason: "First task" },
  });
  const ctx = install(t, f.config);
  const agent = fakeAgent(f.cwd);
  const stop = (turn = 1) =>
    ctx.handlers.get("agent/turn-stopping")({
      agent,
      turn,
      signal: new AbortController().signal,
    });
  await stop();
  await stop();
  assert.equal(agent.steering.length, 2);
  await f.set({ Stop: { decision: "block", reason: "Second task" } });
  await stop();
  await f.set({ Stop: { decision: "block", reason: "Third task" } });
  await stop();
  assert.equal(agent.steering.length, 2);
  assert.equal(
    ctx.warnings.filter((warning) => warning.includes("remains unresolved"))
      .length,
    1,
  );
  await stop(2);
  assert.equal(agent.steering.length, 3);
  assert.equal(agent.contexts.length, 0);
  assert.equal(
    (await f.calls()).filter((x) => x.payload.hook_event_name === "Stop")
      .length,
    5,
  );
});

test("nested project cwd inherits OMA markers up to the nearest git boundary", async (t) => {
  const f = await fixture(t);
  await mkdir(join(f.cwd, ".git"));
  const nested = join(f.cwd, "src", "nested");
  await mkdir(nested, { recursive: true });
  const ctx = install(t, f.config);
  const agent = fakeAgent(nested);
  await ctx.handlers.get("tools/pre-execute")(execution(agent), async () => ({
    kind: "allow",
  }));
  assert.equal((await f.calls())[0].payload.cwd, nested);
  const separate = join(f.cwd, "separate");
  await mkdir(separate);
  await writeFile(join(separate, ".git"), "gitdir: elsewhere\n");
  await ctx.handlers.get("tools/pre-execute")(
    execution(fakeAgent(separate)),
    async () => ({ kind: "allow" }),
  );
  assert.equal((await f.calls()).length, 1);
});

test("Stop receives current completed assistant text and excludes interrupted or earlier turns", async (t) => {
  const f = await fixture(t);
  const ctx = install(t, f.config);
  const agent = fakeAgent(f.cwd);
  const event = (turn, text, interrupted = false) => ({
    type: "assistant/message",
    data: {
      turn,
      interrupted,
      message: { content: [{ type: "text", text }] },
    },
  });
  ctx.handlers.get("session/event")(agent.session, event(1, "workflow done"));
  ctx.handlers.get("session/event")(
    agent.session,
    event(1, "interrupted", true),
  );
  await ctx.handlers.get("agent/turn-stopping")({
    agent,
    turn: 1,
    signal: new AbortController().signal,
  });
  await ctx.handlers.get("agent/turn-stopping")({
    agent,
    turn: 2,
    signal: new AbortController().signal,
  });
  const calls = await f.calls();
  assert.equal(calls[0].payload.response, "workflow done");
  assert.equal(calls[1].payload.response, undefined);
});

test("malformed hook output denies pre execution and post failures reach model context", async (t) => {
  const f = await fixture(t, { invalid: true });
  const ctx = install(t, f.config);
  const agent = fakeAgent(f.cwd);
  const pre = await ctx.handlers.get("tools/pre-execute")(
    execution(agent),
    async () => {
      assert.fail("dispatch must be denied");
    },
  );
  assert.equal(pre.kind, "deny");
  const post = await ctx.handlers.get("tools/post-execute")(
    execution(agent),
    { isError: true, error: { message: "tool failed" }, content: [] },
    async () => ({ kind: "accept" }),
  );
  assert.match(
    post.additionalContexts[0].content[0].text,
    /OMA post-tool validation failed/,
  );
});

test("aborted tool hook returns cancel and unloading drains an active subprocess", async (t) => {
  const f = await fixture(t, { hang: true });
  const ctx = install(t, f.config);
  const agent = fakeAgent(f.cwd);
  const abort = new AbortController();
  const pending = ctx.handlers.get("tools/pre-execute")(
    execution(agent, "bash", {}, abort.signal),
    async () => {
      assert.fail("must not dispatch");
    },
  );
  const pid = await f.waitStarted();
  abort.abort();
  assert.deepEqual(await pending, { kind: "cancel" });
  assert.throws(() => process.kill(pid, 0), /ESRCH/);
  const second = ctx.handlers.get("tools/pre-execute")(
    execution(agent),
    async () => {
      assert.fail("must not dispatch");
    },
  );
  await new Promise((resolve) => setTimeout(resolve, 80));
  await ctx.dispose();
  assert.deepEqual(await second, { kind: "cancel" });
});
