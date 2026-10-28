import { strict as assert } from "node:assert";
import { spawnSync } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  realpathSync,
  writeFileSync,
} from "node:fs";
import { homedir } from "node:os";
import { dirname, isAbsolute, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { DOMAIN_PRESETS } from "../cli/platform/domain-presets.js";
import { runScopedBootstrap } from "./plugin-host-bootstrap.js";

export const HOST_VERSIONS = { codex: "0.164.0", claude: "2.1.311" } as const;
type Host = keyof typeof HOST_VERSIONS;
type JsonRecord = Record<string, unknown>;
type RunOptions = { cwd: string; env: NodeJS.ProcessEnv; timeout: number };
export type HostRunner = (
  command: string,
  args: string[],
  options: RunOptions,
) => string;

const repository = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const catalog = "oh-my-agent";
const names = [
  "oma",
  ...Object.keys(DOMAIN_PRESETS).map((name) => `oma-${name}`),
].sort();

function record(value: unknown): JsonRecord {
  assert(
    value && typeof value === "object" && !Array.isArray(value),
    "Expected host JSON object",
  );
  return value as JsonRecord;
}

export function parseHostJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {}
  // Claude documents one machine-readable result on the final stdout line.
  const last = text.trim().split(/\r?\n/).at(-1);
  assert(last, "Host returned no JSON");
  return JSON.parse(last);
}

function entries(value: unknown): JsonRecord[] {
  if (Array.isArray(value)) return value.map(record);
  const data = record(value);
  return ["installed", "available", "plugins"].flatMap((key) =>
    Array.isArray(data[key]) ? (data[key] as unknown[]).map(record) : [],
  );
}

function ownPlugins(value: unknown): JsonRecord[] {
  return entries(value).filter((item) => {
    const id = item.pluginId ?? item.id;
    return typeof id === "string" && id.endsWith(`@${catalog}`);
  });
}

export function assertFreshHostedRunner(
  env: NodeJS.ProcessEnv,
  root: string,
  host: Host,
  configExists: (file: string) => boolean = existsSync,
): void {
  assert(
    env.CI === "true" &&
      env.GITHUB_ACTIONS === "true" &&
      env.RUNNER_ENVIRONMENT === "github-hosted",
    "Plugin installation smoke only runs on a fresh GitHub-hosted CI runner",
  );
  assert(
    env.GITHUB_WORKSPACE &&
      realpathSync(env.GITHUB_WORKSPACE) === realpathSync(root),
    "CI checkout mismatch",
  );
  assert(
    env.RUNNER_TEMP && isAbsolute(env.RUNNER_TEMP),
    "CI runner temporary directory is required",
  );
  assert(
    !env.CODEX_HOME && !env.CLAUDE_CONFIG_DIR,
    "Use the fresh runner's default host configuration",
  );
  const config =
    host === "codex"
      ? join(homedir(), ".codex/config.toml")
      : join(homedir(), ".claude/settings.json");
  assert(
    !configExists(config),
    "Refusing to change a pre-existing host configuration",
  );
}

function readJson(file: string): JsonRecord {
  return record(JSON.parse(readFileSync(file, "utf8")));
}

export function inspectInstalledSubset(
  pluginRoot: string,
  domain: keyof typeof DOMAIN_PRESETS,
) {
  assert(
    isAbsolute(pluginRoot) && existsSync(pluginRoot),
    "Installed plugin root is missing",
  );
  const preset = DOMAIN_PRESETS[domain];
  const skills = readdirSync(join(pluginRoot, "skills"), {
    withFileTypes: true,
  })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();
  assert.deepEqual(
    skills,
    [...preset.skills].sort(),
    `${domain} installed skill scope changed`,
  );
  for (const skill of skills)
    assert(
      existsSync(join(pluginRoot, "skills", skill, "SKILL.md")),
      `Missing installed skill ${skill}`,
    );
  const agents = readdirSync(join(pluginRoot, "agents"))
    .filter((name) => name.endsWith(".md"))
    .sort();
  assert.deepEqual(
    agents,
    preset.agents.map((name) => `${name}.md`).sort(),
    `${domain} agent file scope changed`,
  );
  const manifest = readJson(join(pluginRoot, ".claude-plugin/plugin.json"));
  const hooks = record(manifest.hooks);
  const start = record(
    (record((hooks.SessionStart as unknown[])[0]).hooks as unknown[])[0],
  );
  assert.equal(
    start.command,
    `sh "\${CLAUDE_PLUGIN_ROOT}/scripts/plugin-bootstrap.sh" ${domain}`,
    "Unexpected scoped bootstrap command",
  );
  assert(
    existsSync(join(pluginRoot, "scripts/plugin-bootstrap.sh")),
    "Installed bootstrap script missing",
  );
  return {
    skills,
    agentFiles: agents,
    hooks: Object.keys(hooks).sort(),
    bootstrapCommand: start.command,
  };
}

export function assertClaudeDetails(
  text: string,
  domain: keyof typeof DOMAIN_PRESETS,
): void {
  const skillsLine = /^\s*Skills \((\d+)\)\s*(.*)$/m.exec(text);
  assert(skillsLine, "Claude did not report a skill inventory");
  assert.equal(
    Number(skillsLine[1]),
    DOMAIN_PRESETS[domain].skills.length,
    "Claude skill count differs",
  );
  const observed = (skillsLine[2] ?? "").split(/,\s*/).filter(Boolean).sort();
  assert.deepEqual(
    observed,
    [...DOMAIN_PRESETS[domain].skills].sort(),
    "Claude loaded another domain's skills",
  );
  const hookLine = /^\s*Hooks \((\d+)\)\s*(.*)$/m.exec(text);
  assert(
    hookLine && Number(hookLine[1]) === 4,
    "Claude did not discover four lifecycle hooks",
  );
  for (const name of ["SessionStart", "UserPromptSubmit", "PreToolUse", "Stop"])
    assert(hookLine[2]?.includes(name), `Claude did not discover ${name}`);
}

export function runHostSmoke(
  host: Host,
  options: {
    root: string;
    output: string;
    env: NodeJS.ProcessEnv;
    run: HostRunner;
    configExists?: (file: string) => boolean;
  },
) {
  const { root, output, env, run } = options;
  assertFreshHostedRunner(env, root, host, options.configExists);
  const outputPath = resolve(output);
  const relativeOutput = relative(
    resolve(env.RUNNER_TEMP as string),
    outputPath,
  );
  assert(
    relativeOutput &&
      !relativeOutput.startsWith("..") &&
      !isAbsolute(relativeOutput),
    "Report must stay in RUNNER_TEMP",
  );
  mkdirSync(outputPath, { recursive: true });
  const report: JsonRecord = {
    host,
    pinnedVersion: HOST_VERSIONS[host],
    status: "running",
    commands: [],
    installations: [],
    modelCalls: 0,
    checkoutSha: env.GITHUB_SHA ?? null,
    startedAt: new Date().toISOString(),
    boundary:
      "Real host marketplace registration and installation. Claude hook uses actual checkout CLI with only release-download transport replaced; provider execution and model work are not tested. Agent files are inspected statically because Claude 2.1.311 details reports zero even for a minimal agent fixture.",
  };
  const invoke = (
    command: string,
    args: string[],
    cwd = root,
    extraEnv: NodeJS.ProcessEnv = {},
    timeout = 60_000,
  ) => {
    (report.commands as unknown[]).push({ command, args, cwd, timeout });
    const result = run(command, args, {
      cwd,
      env: { ...env, ...extraEnv },
      timeout,
    });
    writeFileSync(
      join(outputPath, `command-${(report.commands as unknown[]).length}.log`),
      result,
    );
    return result;
  };
  try {
    const version = invoke(host, ["--version"]).trim();
    assert(
      new RegExp(
        `(?:^|\\s)${HOST_VERSIONS[host].replaceAll(".", "\\.")}(?:$|\\s)`,
      ).test(version),
      `Expected pinned ${host} version`,
    );
    report.actualVersion = version;
    if (host === "claude") {
      parseHostJson(
        invoke(host, [
          "plugin",
          "validate",
          "--strict",
          "--json",
          join(root, ".claude-plugin/marketplace.json"),
        ]),
      );
      for (const domain of Object.keys(DOMAIN_PRESETS))
        parseHostJson(
          invoke(host, [
            "plugin",
            "validate",
            "--strict",
            "--json",
            join(root, ".claude-plugin/domains", domain),
          ]),
        );
    }
    const addArgs = [
      "plugin",
      "marketplace",
      "add",
      root,
      ...(host === "claude" ? ["--scope", "user"] : []),
      "--json",
    ];
    parseHostJson(invoke(host, addArgs));
    const available = parseHostJson(
      invoke(host, [
        "plugin",
        "list",
        "--available",
        ...(host === "codex" ? ["--marketplace", catalog] : []),
        "--json",
      ]),
    );
    const found = ownPlugins(available)
      .map(
        (plugin) =>
          String(plugin.name ?? plugin.pluginId ?? plugin.id).split("@")[0],
      )
      .sort();
    assert.deepEqual(
      found,
      names,
      "Real host did not discover all four marketplace entries",
    );
    report.discoveredEntries = found;

    for (const domain of Object.keys(
      DOMAIN_PRESETS,
    ) as (keyof typeof DOMAIN_PRESETS)[]) {
      const selector = `oma-${domain}@${catalog}`;
      const installed = parseHostJson(
        invoke(host, [
          "plugin",
          host === "codex" ? "add" : "install",
          selector,
          ...(host === "claude" ? ["--scope", "user"] : []),
          "--json",
        ]),
      );
      let pluginRoot: string;
      if (host === "codex") {
        const result = record(installed);
        assert.equal(result.pluginId, selector);
        assert.equal(typeof result.installedPath, "string");
        pluginRoot = result.installedPath as string;
      } else {
        const installedList = ownPlugins(
          parseHostJson(invoke(host, ["plugin", "list", "--json"])),
        );
        const entry = installedList.find((plugin) => plugin.id === selector);
        assert(
          entry &&
            entry.enabled === true &&
            typeof entry.installPath === "string",
          `Claude did not install ${selector}`,
        );
        pluginRoot = entry.installPath as string;
      }
      const inventory = inspectInstalledSubset(pluginRoot, domain);
      const receipt: JsonRecord = { domain, pluginRoot, inventory };
      if (host === "claude") {
        const details = invoke(host, ["plugin", "details", selector]);
        assertClaudeDetails(details, domain);
        receipt.details = details;
        receipt.bootstrap = runScopedBootstrap(
          domain,
          pluginRoot,
          root,
          outputPath,
          invoke,
        );
      }
      (report.installations as unknown[]).push(receipt);
    }
    const final = ownPlugins(
      parseHostJson(
        invoke(host, [
          "plugin",
          "list",
          ...(host === "codex" ? ["--marketplace", catalog] : []),
          "--json",
        ]),
      ),
    );
    assert(
      !final.some((entry) => (entry.pluginId ?? entry.id) === `oma@${catalog}`),
      "Full plugin was installed unexpectedly",
    );
    assert.equal(
      final.length,
      3,
      "Expected exactly three installed domain plugins",
    );
    report.status = "passed";
    return report;
  } catch (error) {
    report.status = "failed";
    report.error = error instanceof Error ? error.message : String(error);
    throw error;
  } finally {
    report.finishedAt = new Date().toISOString();
    writeFileSync(
      join(outputPath, "report.json"),
      `${JSON.stringify(report, null, 2)}\n`,
    );
  }
}

export const realHostRunner: HostRunner = (command, args, options) => {
  const result = spawnSync(command, args, {
    ...options,
    encoding: "utf8",
    maxBuffer: 16 * 1024 * 1024,
  });
  if (result.stderr) process.stderr.write(result.stderr);
  assert(
    !result.error && result.status === 0,
    `${command} ${args.join(" ")} failed: ${result.error?.message ?? result.stderr}`,
  );
  return result.stdout;
};

if (import.meta.main) {
  const host = process.argv[2] as Host;
  assert(
    Object.hasOwn(HOST_VERSIONS, host),
    "Usage: bun scripts/plugin-host-smoke.ts <claude|codex>",
  );
  const output = join(
    process.env.RUNNER_TEMP ?? "",
    `oma-plugin-host-smoke-${host}`,
  );
  const result = runHostSmoke(host, {
    root: repository,
    output,
    env: process.env,
    run: realHostRunner,
  });
  console.log(JSON.stringify(result, null, 2));
}
