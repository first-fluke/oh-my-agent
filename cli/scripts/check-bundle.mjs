#!/usr/bin/env node
// Run the actual Node entrypoint: source tests cannot catch unresolved requires
// left inside bundled UMD dependencies (jsonc-parser in CLI 14.0.0).
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
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

// A missing installation must reach update's own validation, not group help.
// Use an isolated cwd/home so this never updates a user's project or downloads.
const root = mkdtempSync(join(tmpdir(), "oma-bundle-update-"));
try {
  const result = spawnSync(process.execPath, [entry, "update"], {
    cwd: root,
    encoding: "utf8",
    timeout: 30_000,
    env: {
      ...process.env,
      OMA_HOME: root,
      OMA_INSTALL_GLOBAL: "0",
      OMA_SKIP_VERSION_CHECK: "1",
      OMA_YES: "1",
      CI: "true",
    },
  });
  if (result.error) throw result.error;
  const output = `${result.stdout}\n${result.stderr}`;
  assert.equal(
    result.status,
    1,
    `CLI bundle update must reject a missing install:\n${output}`,
  );
  assert.match(output, /oh-my-agent is not installed in this project/);
  assert.doesNotMatch(output, /Usage:/);
  console.log("CLI bundle update default action OK");
} finally {
  rmSync(root, { recursive: true, force: true });
}
