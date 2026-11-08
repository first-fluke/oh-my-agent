// Installs this checkout as an Agent Plugins 1.0 package into a real host
// whose home is pointed at a scratch directory, then checks what the host
// recorded. Hosts: GitHub Copilot CLI (`copilot plugin install <path>`) and
// Qwen Code (`qwen extensions install <path>`). Both are npm-installable and
// register a local package without signing in. Kiro CLI and Hermes Agent also
// accept the same package but are not covered here: kiro-cli is a platform
// installer download that needs a login for anything past `powers install`,
// and Hermes is a Python application with no npm distribution.
//
// Only Node built-ins are imported so the script runs before `bun install`.
import { strict as assert } from "node:assert";
import { spawnSync } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { dirname, isAbsolute, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

export const AGENT_PLUGIN_HOST_VERSIONS = {
  copilot: "1.0.107",
  qwen: "0.26.9",
} as const;
export type AgentPluginHost = keyof typeof AGENT_PLUGIN_HOST_VERSIONS;

export interface SmokeOptions {
  host: AgentPluginHost;
  /** Package directory to install: the checkout root. */
  pkg: string;
  /** Scratch directory the host must use as its home. */
  home: string;
  /** Receipt directory. */
  output: string;
  run?: (
    command: string,
    args: string[],
    env: NodeJS.ProcessEnv,
  ) => { stdout: string; stderr: string; status: number | null };
}

type Receipt = Record<string, unknown>;

const repository = resolve(dirname(fileURLToPath(import.meta.url)), "..");

function defaultRun(
  command: string,
  args: string[],
  env: NodeJS.ProcessEnv,
): { stdout: string; stderr: string; status: number | null } {
  const result = spawnSync(command, args, {
    env,
    encoding: "utf8",
    timeout: 10 * 60_000,
    maxBuffer: 16 * 1024 * 1024,
    shell: process.platform === "win32",
  });
  if (result.error) throw result.error;
  return {
    stdout: result.stdout ?? "",
    stderr: result.stderr ?? "",
    status: result.status,
  };
}

/** Every regular file below `dir`, relative, sorted. */
function listFiles(dir: string, prefix = ""): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const rel = prefix ? `${prefix}/${entry.name}` : entry.name;
    if (entry.isDirectory()) out.push(...listFiles(join(dir, entry.name), rel));
    else if (entry.isFile()) out.push(rel);
  }
  return out.sort();
}

/** The portable parts every host must copy verbatim from the package. */
export function expectedPackageFiles(pkg: string): string[] {
  const files = ["plugin.json"];
  if (existsSync(join(pkg, "mcp.json"))) files.push("mcp.json");
  for (const skill of readdirSync(join(pkg, "skills"), {
    withFileTypes: true,
  })) {
    if (
      skill.isDirectory() &&
      existsSync(join(pkg, "skills", skill.name, "SKILL.md"))
    )
      files.push(`skills/${skill.name}/SKILL.md`);
  }
  return files.sort();
}

export function assertInstalledCopy(pkg: string, installed: string): void {
  const files = new Set(listFiles(installed));
  for (const file of expectedPackageFiles(pkg)) {
    assert(files.has(file), `installed copy is missing ${file}`);
    assert.equal(
      readFileSync(join(installed, file), "utf8"),
      readFileSync(join(pkg, file), "utf8"),
      `installed copy of ${file} differs from the package`,
    );
  }
}

export function runAgentPluginHostSmoke(options: SmokeOptions): Receipt {
  const { host, pkg, home, output } = options;
  const run = options.run ?? defaultRun;
  assert(isAbsolute(pkg) && isAbsolute(home), "absolute paths required");
  assert(
    existsSync(join(pkg, "plugin.json")),
    "package root has no plugin.json",
  );
  const manifest = JSON.parse(readFileSync(join(pkg, "plugin.json"), "utf8"));
  // Qwen resolves a directory that carries a Claude marketplace as that
  // marketplace and opens an interactive plugin picker instead of installing
  // the Agent Plugins package; the repository root is such a directory.
  if (host === "qwen")
    assert(
      !existsSync(join(pkg, ".claude-plugin", "marketplace.json")),
      `${pkg} carries .claude-plugin/marketplace.json; point the qwen smoke at codex-plugin/`,
    );
  assert.equal(
    manifest.$schema,
    "https://agent-plugins.org/schemas/1.0.0/plugin.schema.json",
  );
  mkdirSync(home, { recursive: true });
  mkdirSync(output, { recursive: true });
  const env: NodeJS.ProcessEnv = {
    ...process.env,
    HOME: home,
    USERPROFILE: home,
    NO_COLOR: "1",
    // Copilot: `COPILOT_HOME` replaces ~/.copilot entirely; no auto-update.
    COPILOT_HOME: join(home, ".copilot"),
    COPILOT_AUTO_UPDATE: "false",
  };
  const receipt: Receipt = {
    host,
    pinnedVersion: AGENT_PLUGIN_HOST_VERSIONS[host],
    package: pkg,
    pluginName: manifest.name,
    commands: [],
    startedAt: new Date().toISOString(),
    boundary:
      "Real host local-path package installation only: no sign-in, no model call, no hook or MCP execution.",
  };
  const invoke = (command: string, args: string[]) => {
    const result = run(command, args, env);
    (receipt.commands as unknown[]).push({
      command,
      args,
      status: result.status,
    });
    writeFileSync(
      join(output, `command-${(receipt.commands as unknown[]).length}.log`),
      `${result.stdout}\n${result.stderr}`,
    );
    assert.equal(
      result.status,
      0,
      `${command} ${args.join(" ")} exited ${result.status}: ${result.stderr}`,
    );
    return result.stdout;
  };
  try {
    const version = invoke(host, ["--version"]).trim();
    assert(
      version.includes(AGENT_PLUGIN_HOST_VERSIONS[host]),
      `expected pinned ${host} ${AGENT_PLUGIN_HOST_VERSIONS[host]}, got ${version}`,
    );
    receipt.actualVersion = version;
    let installed: string;
    if (host === "copilot") {
      const out = invoke("copilot", ["plugin", "install", pkg]);
      assert(
        /installed successfully/i.test(out),
        `copilot did not report a successful install: ${out}`,
      );
      const list = JSON.parse(
        invoke("copilot", ["plugin", "list", "--json"]),
      ) as Array<Record<string, unknown>>;
      const entry = list.find((plugin) => plugin.name === manifest.name);
      assert(entry?.enabled === true, "copilot did not enable the plugin");
      assert.equal(entry.version, manifest.version);
      const config = JSON.parse(
        readFileSync(join(home, ".copilot", "config.json"), "utf8")
          .split("\n")
          .filter((line) => !line.trimStart().startsWith("//"))
          .join("\n"),
      ) as { installedPlugins: Array<Record<string, unknown>> };
      const record = config.installedPlugins.find(
        (plugin) => plugin.name === manifest.name,
      );
      assert(
        typeof record?.cache_path === "string",
        "copilot cache path missing",
      );
      installed = record.cache_path as string;
      // Copilot keeps its own components beside the portable core.
      for (const rel of [
        "com.github.copilot/hooks/hooks.json",
        "com.github.copilot/scripts/plugin-hook.sh",
        "com.github.copilot/agents",
        "com.github.copilot/commands",
      ])
        assert(existsSync(join(installed, rel)), `installed copy lacks ${rel}`);
    } else {
      const out = invoke("qwen", ["extensions", "install", pkg, "--consent"]);
      assert(
        /installed successfully/i.test(out),
        `qwen did not report a successful install: ${out}`,
      );
      const list = invoke("qwen", ["extensions", "list"]);
      assert(list.includes(manifest.name), "qwen did not list the extension");
      assert(
        list.includes("Origin: AgentPlugins"),
        "qwen did not load the package through its Agent Plugins adapter",
      );
      installed = join(home, ".qwen", "extensions", manifest.name);
      const install = JSON.parse(
        readFileSync(join(installed, ".qwen-extension-install.json"), "utf8"),
      );
      assert.equal(install.originSource, "AgentPlugins");
      // Qwen converts foreign manifests; a native one here would mean the
      // Agent Plugins path was bypassed.
      assert(
        !existsSync(join(installed, "qwen-extension.json")),
        "qwen generated a native manifest instead of loading the package",
      );
      const skills = list
        .split(/\r?\n/)
        .filter((line) => /^\s{2}oma-[a-z0-9-]+$/.test(line)).length;
      assert.equal(
        skills,
        expectedPackageFiles(pkg).filter((f) => f.startsWith("skills/")).length,
        "qwen skill count differs from the package",
      );
      receipt.qwenSkills = skills;
    }
    assertInstalledCopy(pkg, installed);
    receipt.installedPath = installed;
    receipt.status = "passed";
    return receipt;
  } catch (error) {
    receipt.status = "failed";
    receipt.error = error instanceof Error ? error.message : String(error);
    throw error;
  } finally {
    receipt.finishedAt = new Date().toISOString();
    writeFileSync(
      join(output, "report.json"),
      `${JSON.stringify(receipt, null, 2)}\n`,
    );
  }
}

if (import.meta.main) {
  const host = process.argv[2] as AgentPluginHost;
  assert(
    Object.hasOwn(AGENT_PLUGIN_HOST_VERSIONS, host),
    "Usage: bun scripts/agent-plugin-host-smoke.ts <copilot|qwen> [package-dir]",
  );
  const scratch = process.env.OMA_SMOKE_HOME;
  assert(
    scratch && isAbsolute(scratch),
    "OMA_SMOKE_HOME must point at an absolute scratch directory",
  );
  const result = runAgentPluginHostSmoke({
    host,
    pkg: resolve(process.argv[3] ?? repository),
    home: join(scratch, `home-${host}`),
    output: join(scratch, `oma-agent-plugin-smoke-${host}`),
  });
  console.log(JSON.stringify(result, null, 2));
}
