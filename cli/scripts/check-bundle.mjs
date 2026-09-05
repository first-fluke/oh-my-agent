#!/usr/bin/env node
// Run the actual Node entrypoint: source tests cannot catch unresolved requires
// left inside bundled UMD dependencies (jsonc-parser in CLI 14.0.0).
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const entry = process.argv[2]
  ? resolve(process.argv[2])
  : fileURLToPath(new URL("../bin/cli.js", import.meta.url));
const { version } = JSON.parse(
  readFileSync(new URL("../package.json", import.meta.url), "utf8"),
);

for (const args of [["--version"], ["--help"], ["update", "--help"]]) {
  const result = spawnSync(process.execPath, [entry, ...args], {
    encoding: "utf8",
    timeout: 30_000,
    env: { ...process.env, OMA_SKIP_VERSION_CHECK: "1" },
  });
  const label = `CLI bundle ${args.join(" ")}`;
  if (result.error) throw result.error;
  assert.equal(
    result.status,
    0,
    `${label} failed (${result.signal ?? result.status}):\n${result.stderr}\n${result.stdout}`,
  );
  if (args[0] === "--version") {
    assert.equal(result.stdout.trim(), version, `${label}: stale bundle`);
  } else {
    assert.match(result.stdout, /Usage:/, `${label}: missing help output`);
    assert.match(result.stdout, /update/, `${label}: missing update command`);
  }
  console.log(`${label} OK`);
}
