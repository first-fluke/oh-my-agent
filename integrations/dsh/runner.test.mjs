import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import { join } from "node:path";
import { test } from "node:test";
import { createHookRunner } from "./runner.mjs";
import { fixture } from "./test-support.mjs";

test("runner carries unsafe strings as arguments and JSON without shell interpretation", async (t) => {
  const f = await fixture(t);
  const sentinel = join(f.cwd, "shell-was-run");
  const unsafe = `$(touch '${sentinel}')`;
  const runner = createHookRunner({
    ...f.config,
    commandArgs: [...f.config.commandArgs, unsafe],
  });
  t.after(() => runner.dispose());
  const payload = {
    cwd: f.cwd,
    hook_event_name: "PreToolUse",
    tool_input: { command: unsafe },
  };
  await runner.run("PreToolUse", payload);
  const [call] = await f.calls();
  assert.equal(call.argv[0], unsafe);
  assert.equal(call.payload.tool_input.command, unsafe);
  await assert.rejects(access(sentinel), { code: "ENOENT" });
});

test("timeout kills a hook that ignores SIGTERM and drains before returning", async (t) => {
  const f = await fixture(t, { hang: true });
  const runner = createHookRunner({ ...f.config, timeoutMs: 500 });
  t.after(() => runner.dispose());
  const pending = runner.run("Stop", { cwd: f.cwd, hook_event_name: "Stop" });
  const rejected = assert.rejects(pending, /timed out/);
  const pid = await f.waitStarted();
  await rejected;
  assert.throws(() => process.kill(pid, 0), /ESRCH/);
});

test("cleanup kills descendants after the hook root exits immediately on SIGTERM", {
  skip: process.platform === "win32",
}, async (t) => {
  const f = await fixture(t, { hang: true, descendant: true });
  const runner = createHookRunner({ ...f.config, timeoutMs: 500 });
  t.after(() => runner.dispose());
  const pending = runner.run("Stop", { cwd: f.cwd, hook_event_name: "Stop" });
  const rejected = assert.rejects(pending, /timed out/);
  await f.waitStarted();
  const descendant = Number(
    await readFile(join(f.cwd, "descendant-pid"), "utf8"),
  );
  t.after(() => {
    try {
      process.kill(descendant, "SIGKILL");
    } catch {}
  });
  await rejected;
  for (let i = 0; i < 30; i += 1) {
    try {
      process.kill(descendant, 0);
    } catch (error) {
      assert.equal(error.code, "ESRCH");
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
  assert.fail("descendant survived process-group cleanup");
});

test("stdout bounds, stdin bounds, and missing executables fail explicitly", async (t) => {
  const f = await fixture(t, { flood: 4096 });
  const runner = createHookRunner({
    ...f.config,
    maxOutputBytes: 1000,
    maxInputBytes: 500,
  });
  t.after(() => runner.dispose());
  await assert.rejects(
    runner.run("Stop", { cwd: f.cwd, hook_event_name: "Stop" }),
    /maxOutputBytes/,
  );
  await assert.rejects(
    runner.run("Stop", { cwd: f.cwd, text: "x".repeat(1000) }),
    /maxInputBytes/,
  );
  const missing = createHookRunner({ command: join(f.cwd, "missing") });
  t.after(() => missing.dispose());
  await assert.rejects(missing.run("Stop", { cwd: f.cwd }), { code: "ENOENT" });
});

test("owner disposal cancels only owned processes and drains them", async (t) => {
  const f = await fixture(t, { hang: true });
  const runner = createHookRunner(f.config);
  t.after(() => runner.dispose());
  const owner = {};
  const pending = runner.run(
    "Stop",
    { cwd: f.cwd, hook_event_name: "Stop" },
    { owner },
  );
  const rejection = assert.rejects(pending, /cancelled/);
  const pid = await f.waitStarted();
  await runner.cancelOwner({});
  assert.doesNotThrow(() => process.kill(pid, 0));
  await runner.cancelOwner(owner);
  await rejection;
  assert.throws(() => process.kill(pid, 0), /ESRCH/);
  await runner.dispose();
  await assert.rejects(runner.run("Stop", { cwd: f.cwd }), /cancelled/);
});
