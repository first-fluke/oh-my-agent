import { strict as assert } from "node:assert";
import {
  chmodSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { join } from "node:path";
import { DOMAIN_PRESETS } from "../cli/platform/domain-presets.js";
import { isValidSkillManifest } from "../cli/platform/skills-installer/workflow-dependencies.js";

export function runScopedBootstrap(
  domain: keyof typeof DOMAIN_PRESETS,
  pluginRoot: string,
  checkout: string,
  output: string,
  invoke: (
    command: string,
    args: string[],
    cwd?: string,
    env?: NodeJS.ProcessEnv,
    timeout?: number,
  ) => string,
) {
  const project = join(output, `project-${domain}`);
  const bin = join(output, "cli-bin");
  mkdirSync(join(project, ".agents"), { recursive: true });
  mkdirSync(bin, { recursive: true });
  // Existing supported choices avoid unrelated service/browser provisioning.
  writeFileSync(
    join(project, ".agents/oma-config.yaml"),
    "language: en\nvendors: [claude]\nmodel_preset: auto\ndev_tools_browsers: []\nproviders:\n  web: native\n  code_intelligence: gortex\n  semantic_memory: none\n",
  );
  const permissions = {
    allow: ["Read(smoke-fixture)"],
    ask: ["Bash(smoke-ask)"],
    deny: ["Read(smoke-secret)"],
  };
  mkdirSync(join(project, ".claude"));
  writeFileSync(
    join(project, ".claude/settings.json"),
    JSON.stringify({ permissions }),
  );
  const quote = (value: string) => `'${value.replaceAll("'", "'\\''")}'`;
  const shim = join(bin, "oma");
  const argsLog = join(output, `cli-${domain}.args`);
  writeFileSync(
    shim,
    `#!/bin/sh\nprintf '%s\\n' "$*" >> ${quote(argsLog)}\nexec bun --preload ${quote(join(checkout, "scripts/plugin-host-payload.ts"))} ${quote(join(checkout, "cli/cli.ts"))} "$@"\n`,
  );
  chmodSync(shim, 0o755);
  const env = {
    PATH: `${bin}:${process.env.PATH ?? ""}`,
    CLAUDE_PROJECT_DIR: project,
    CLAUDE_PLUGIN_ROOT: pluginRoot,
    OMA_SMOKE_CHECKOUT: checkout,
    OMA_NO_AGENTMEMORY: "1",
  };
  invoke(
    "sh",
    [join(pluginRoot, "scripts/plugin-bootstrap.sh"), domain],
    project,
    env,
    90_000,
  );
  const selected = readdirSync(join(project, ".agents/skills"), {
    withFileTypes: true,
  })
    .filter((entry) => entry.isDirectory() && !entry.name.startsWith("_"))
    .map((entry) => entry.name)
    .sort();
  assert.deepEqual(
    selected,
    [...DOMAIN_PRESETS[domain].skills].sort(),
    "Bootstrap installed beyond the selected scope",
  );
  for (const skill of selected)
    assert(
      isValidSkillManifest(project, skill),
      `Bootstrap produced an invalid ${skill} manifest`,
    );
  const marker = join(
    project,
    ".agents/state",
    `plugin-bootstrap.${domain}.version`,
  );
  const cliVersion = readFileSync(marker, "utf8").trim();
  assert(cliVersion, "Bootstrap did not record verified readiness");
  assert.equal(
    readFileSync(
      join(project, ".agents/state/plugin-bootstrap.selection"),
      "utf8",
    ).trim(),
    domain,
  );
  const installedSettings = JSON.parse(
    readFileSync(join(project, ".claude/settings.json"), "utf8"),
  );
  assert(
    installedSettings.permissions &&
      typeof installedSettings.permissions === "object",
    "Bootstrap permissions missing",
  );
  const installedPermissions = installedSettings.permissions as Record<
    string,
    unknown
  >;
  for (const [key, values] of Object.entries(permissions)) {
    const actual = installedPermissions[key];
    assert(Array.isArray(actual), `Bootstrap changed ${key} permission type`);
    for (const value of values)
      assert(actual.includes(value), `Bootstrap lost ${key} permission`);
  }
  invoke(
    "sh",
    [join(pluginRoot, "scripts/plugin-bootstrap.sh"), domain],
    project,
    env,
    30_000,
  );
  const installCalls = readFileSync(argsLog, "utf8")
    .trim()
    .split(/\r?\n/)
    .filter((args) => args.startsWith("install"));
  assert.deepEqual(
    installCalls,
    [`install --yes --preset ${domain}`],
    "Bootstrap scope or second-session idempotence changed",
  );
  return {
    project,
    selected,
    marker,
    cliVersion,
    installCalls,
    secondSessionSkippedInstall: true,
    permissionsPreserved: true,
    transport: "checkout payload; installer/wiring logic unmodified",
  };
}
