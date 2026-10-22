import assert from "node:assert/strict";
import {
  access,
  copyFile,
  mkdir,
  readFile,
  realpath,
  symlink,
  writeFile,
} from "node:fs/promises";
import { join } from "node:path";
import { test } from "node:test";
import { pathToFileURL } from "node:url";
import { createHookRunner } from "./runner.mjs";
import { fixture } from "./test-support.mjs";

const cleanupTimer = globalThis.setTimeout;

test("default runner resolves the plugin dependency lazily without a host oma command", async (t) => {
  const f = await fixture(t);
  const plugin = join(f.cwd, "plugin");
  await mkdir(plugin);
  await Promise.all(
    ["runner.mjs", "runtime.mjs"].map((file) =>
      copyFile(new URL(file, import.meta.url), join(plugin, file)),
    ),
  );
  const { createHookRunner: createLocalRunner } = await import(
    pathToFileURL(join(plugin, "runner.mjs")).href
  );
  const runner = createLocalRunner({ commandArgs: ["--fixture-prefix"] });
  t.after(() => runner.dispose());
  await assert.rejects(
    runner.run("PreToolUse", { cwd: f.cwd }),
    /OMA CLI dependency is missing/,
  );

  const dependency = join(plugin, "node_modules", "oh-my-agent");
  const installedDependency = join(f.cwd, "installed-oma");
  await mkdir(join(installedDependency, "bin"), { recursive: true });
  await mkdir(join(plugin, "node_modules"));
  await symlink(
    installedDependency,
    dependency,
    process.platform === "win32" ? "junction" : "dir",
  );
  await writeFile(
    join(dependency, "package.json"),
    JSON.stringify({
      name: "oh-my-agent",
      type: "module",
      version: "20.4.1",
    }),
  );
  const cli = join(dependency, "bin", "cli.js");
  await writeFile(
    cli,
    `import ${JSON.stringify(pathToFileURL(f.config.commandArgs[0]).href)};\n`,
  );
  const [command, resolvedCli, ...commandArgs] = runner.invocation();
  // Node's resolver can retain aliases such as Windows 8.3 paths or symlinks.
  assert.deepEqual(
    [command, await realpath(resolvedCli), ...commandArgs],
    [process.execPath, await realpath(cli), "--fixture-prefix"],
  );
  await runner.run("PreToolUse", { cwd: f.cwd, hook_event_name: "PreToolUse" });
  const [call] = await f.calls();
  assert.deepEqual(call.argv, [
    "--fixture-prefix",
    "hook",
    "run",
    "--vendor",
    "claude",
    "--event",
    "PreToolUse",
  ]);
});

test("runner invocation preserves explicit executable and arguments", async (t) => {
  const f = await fixture(t);
  const runner = createHookRunner(f.config);
  t.after(() => runner.dispose());
  assert.deepEqual(runner.invocation(), [
    f.config.command,
    ...f.config.commandArgs,
  ]);
});

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
  t.mock.timers.enable({ apis: ["setTimeout"] });
  const runner = createHookRunner({ ...f.config, timeoutMs: 500 });
  t.after(() => runner.dispose());
  const pending = runner.run("Stop", { cwd: f.cwd, hook_event_name: "Stop" });
  const rejected = assert.rejects(pending, /timed out/);
  const pid = await f.waitStarted();
  t.mock.timers.tick(500);
  t.mock.timers.tick(250);
  await rejected;
  assert.throws(() => process.kill(pid, 0), /ESRCH/);
});

test("cleanup kills descendants after the hook root exits immediately on SIGTERM", {
  skip: process.platform === "win32",
}, async (t) => {
  const f = await fixture(t, { hang: true, descendant: true });
  t.mock.timers.enable({ apis: ["setTimeout"] });
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
  t.mock.timers.tick(500);
  t.mock.timers.tick(250);
  await rejected;
  for (let i = 0; i < 30; i += 1) {
    try {
      process.kill(descendant, 0);
    } catch (error) {
      assert.equal(error.code, "ESRCH");
      return;
    }
    await new Promise((resolve) => cleanupTimer(resolve, 10));
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
