import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";
import { OMA_VERSION, resolveOmaRuntime } from "./runtime.mjs";

test("default runtime executes the installed CLI with the current Node executable", () => {
  const cli = "/plugin/node_modules/oh-my-agent/bin/cli.js";
  const runtime = resolveOmaRuntime({ commandArgs: ["--verbose"] }, (id) => {
    assert.equal(id, "oh-my-agent/bin/cli.js");
    return cli;
  });
  assert.deepEqual(runtime, {
    command: process.execPath,
    commandArgs: [cli, "--verbose"],
    version: OMA_VERSION,
  });
});

test("explicit commands bypass dependency resolution and retain their arguments", () => {
  const runtime = resolveOmaRuntime(
    { command: "/custom/oma", commandArgs: ["--custom"] },
    () => assert.fail("explicit commands must not resolve the OMA dependency"),
  );
  assert.deepEqual(runtime, {
    command: "/custom/oma",
    commandArgs: ["--custom"],
  });
});

test("missing dependencies report a reinstall action and preserve the resolver error", () => {
  const cause = new Error("Cannot find module oh-my-agent/bin/cli.js");
  assert.throws(
    () =>
      resolveOmaRuntime({}, () => {
        throw cause;
      }),
    (error) => {
      assert.match(error.message, /Reinstall dsh-plugin-oma/);
      assert.equal(error.cause, cause);
      return true;
    },
  );
});

test("runtime asset version matches the exact installed CLI dependency", async () => {
  const manifest = JSON.parse(
    await readFile(new URL("./package.json", import.meta.url), "utf8"),
  );
  assert.equal(manifest.dependencies["oh-my-agent"], OMA_VERSION);
});
