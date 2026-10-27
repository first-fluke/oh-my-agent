import { spawnSync } from "node:child_process";
import {
  cpSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  realpathSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { delimiter, dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { afterEach, describe, expect, it } from "vitest";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const roots: string[] = [];
const response = '{"decision":"block","reason":"integration fixture"}';

type Event = "SessionStart" | "UserPromptSubmit" | "Stop";
type Settings = {
  hooks: Record<string, { hooks: { name?: string; command: string }[] }[]>;
  env?: Record<string, string>;
  permissions?: { allow: string[] };
};
type Invocation = {
  kind: "install" | "hook";
  cwd: string;
  args: string[];
  global: string;
  yes?: string;
  input?: string;
  wrapper?: string;
};

function executable(path: string, body: string): void {
  writeFileSync(path, `#!/bin/sh\nset -eu\n${body}\n`, { mode: 0o755 });
}

function fixture() {
  const bun = (process.env.PATH ?? "")
    .split(delimiter)
    .map((directory) => join(directory, "bun"))
    .find(existsSync);
  if (!bun)
    throw new Error("These integration fixtures require installed Bun.");
  const root = realpathSync(
    mkdtempSync(join(tmpdir(), "oma-plugin-install-integration-")),
  );
  roots.push(root);
  const plugin = join(root, "fresh plugin cache");
  const home = join(root, "home");
  const bin = join(root, "bin");
  const log = join(root, "invocations.jsonl");
  const helper = join(root, "fake-cli.mjs");
  for (const directory of [plugin, home, bin])
    mkdirSync(directory, { recursive: true });
  for (const file of [
    "hooks/hooks.json",
    "scripts/plugin-bootstrap.sh",
    "scripts/plugin-hook.sh",
  ]) {
    mkdirSync(dirname(join(plugin, file)), { recursive: true });
    cpSync(join(repoRoot, file), join(plugin, file));
  }
  executable(join(bin, "oma"), 'exec "$FIXTURE_BUN" "$FIXTURE_HELPER" "$@"');
  executable(
    join(bin, "bun"),
    'if [ "$1" = -e ]; then exec "$FIXTURE_BUN" "$@"; fi\n' +
      'printf "unexpected Bun installation command\\n" >&2\nexit 98',
  );
  for (const command of ["curl", "wget"])
    executable(join(bin, command), "exit 99");
  const composer = pathToFileURL(
    join(repoRoot, "cli/platform/hooks-composer.ts"),
  ).href;
  writeFileSync(
    helper,
    `import { appendFileSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
const args = process.argv.slice(2);
if (args[0] === "--version") {
  process.stdout.write("integration-version\\n");
} else if (args[0] === "install") {
  appendFileSync(process.env.FIXTURE_LOG, JSON.stringify({
    kind: "install", cwd: process.cwd(), args,
    global: process.env.OMA_INSTALL_GLOBAL, yes: process.env.OMA_YES,
  }) + "\\n");
  if (process.env.FIXTURE_INSTALL_FAIL === "1") {
    console.error("integration fixture installation failure");
    process.exit(26);
  }
  const { installHooksFromVariant } = await import(${JSON.stringify(composer)});
  const source = ${JSON.stringify(repoRoot)};
  const variant = JSON.parse(readFileSync(join(source, ".agents/hooks/variants/claude.json"), "utf8"));
  installHooksFromVariant(source, process.cwd(), variant);
  mkdirSync(".agents/skills", { recursive: true });
  writeFileSync(".agents/skills/_version.json", JSON.stringify({
    version: "integration-version", schemaVersion: 2, mode: "project",
  }));
  const cueOnly = process.env.FIXTURE_CUE_ONLY === "1";
  writeFileSync(cueOnly ? ".agents/oma-config.cue" : ".agents/oma-config.yaml",
    cueOnly ? 'package config\\nlanguage: "en"\\n' : "language: en\\n");
} else if (args[0] === "hook") {
  appendFileSync(process.env.FIXTURE_LOG, JSON.stringify({
    kind: "hook", cwd: process.cwd(), args,
    global: process.env.OMA_INSTALL_GLOBAL,
    input: readFileSync(0, "utf8"), wrapper: process.env.OMA_HOOK_WRAPPER,
  }) + "\\n");
  process.stdout.write(${JSON.stringify(response)});
} else {
  throw new Error("Unexpected fake CLI arguments: " + JSON.stringify(args));
}
`,
  );
  const project = (name: string) => {
    const directory = join(root, name);
    mkdirSync(directory, { recursive: true });
    return directory;
  };
  const run = (
    projectDir: string,
    command: string,
    input: string,
    extra: Record<string, string> = {},
    cwd = plugin,
  ) => {
    const result = spawnSync("/bin/sh", ["-c", command], {
      cwd,
      encoding: "utf8",
      input,
      timeout: 10_000,
      env: {
        ...process.env,
        HOME: home,
        PATH: `${bin}:/usr/bin:/bin`,
        CLAUDE_PROJECT_DIR: projectDir,
        CLAUDE_PLUGIN_ROOT: plugin,
        CLAUDE_PLUGIN_DATA: join(root, "plugin data"),
        FIXTURE_BUN: bun,
        FIXTURE_HELPER: helper,
        FIXTURE_LOG: log,
        OMA_BIN: join(bin, "oma"),
        OMA_INSTALL_GLOBAL: "1",
        ...extra,
      },
    });
    expect(result.error).toBeUndefined();
    expect(result.status).toBe(0);
    return result;
  };
  const runManifest = (
    projectDir: string,
    event: Event,
    input = "{}",
    extra: Record<string, string> = {},
  ) => {
    const manifest = JSON.parse(
      readFileSync(join(plugin, "hooks/hooks.json"), "utf8"),
    ) as Settings;
    const hooks = manifest.hooks[event].flatMap((group) => group.hooks);
    expect(hooks).toHaveLength(1);
    return run(projectDir, hooks[0].command, input, extra);
  };
  const runProjectHook = (projectDir: string, event: Event, input: string) => {
    const settings = JSON.parse(
      readFileSync(join(projectDir, ".claude/settings.json"), "utf8"),
    ) as Settings;
    const hooks = settings.hooks[event]
      .flatMap((group) => group.hooks)
      .filter((hook) => hook.name === `oma-hook-${event}`);
    expect(hooks).toHaveLength(1);
    return run(projectDir, hooks[0].command, input, {}, projectDir);
  };
  const invocations = (): Invocation[] =>
    existsSync(log)
      ? readFileSync(log, "utf8")
          .trim()
          .split("\n")
          .map((line) => JSON.parse(line) as Invocation)
      : [];
  return { plugin, project, runManifest, runProjectHook, invocations };
}

afterEach(() => {
  for (const root of roots.splice(0))
    rmSync(root, { recursive: true, force: true });
});

describe.skipIf(process.platform === "win32")(
  "marketplace project installation",
  () => {
    it("bootstraps each project once and delivers a prompt once across both registrations", () => {
      const f = fixture();
      const first = f.project("first project");
      const second = f.project("second project");
      const userHook = { hooks: [{ type: "command", command: "user-hook" }] };
      mkdirSync(join(second, ".claude"));
      writeFileSync(
        join(second, ".claude/settings.json"),
        JSON.stringify({
          hooks: { UserPromptSubmit: [userHook] },
          env: { USER_SETTING: "preserved" },
          permissions: { allow: ["Bash(user-command)"] },
        }),
      );
      expect(f.runManifest(first, "UserPromptSubmit").stdout).toBe("");
      expect(f.invocations()).toEqual([]);
      expect(f.runManifest(first, "SessionStart").stderr).toContain(
        "oma is ready",
      );
      f.runManifest(first, "SessionStart");
      expect(f.runManifest(second, "SessionStart").stderr).toContain(
        "oma is ready",
      );
      f.runManifest(second, "SessionStart");
      const installs = f
        .invocations()
        .filter((call) => call.kind === "install");
      expect(installs.map((call) => call.cwd)).toEqual([first, second]);
      for (const install of installs) {
        expect(install.args).toEqual(["install", "--yes"]);
        expect(install.global).toBe("0");
        expect(install.yes).toBe("1");
      }
      const settings = JSON.parse(
        readFileSync(join(second, ".claude/settings.json"), "utf8"),
      ) as Settings;
      expect(settings.hooks.UserPromptSubmit).toContainEqual(userHook);
      expect(settings.env?.USER_SETTING).toBe("preserved");
      expect(settings.permissions?.allow).toContain("Bash(user-command)");
      const input =
        '{\n  "session_id": "integration", "prompt": "Review 한글"\n}\n';
      const marketplace = f.runManifest(first, "UserPromptSubmit", input);
      const local = f.runProjectHook(first, "UserPromptSubmit", input);
      expect(marketplace.stdout + local.stdout).toBe(response);
      const calls = f.invocations().filter((call) => call.kind === "hook");
      expect(calls).toHaveLength(1);
      expect(calls[0]).toMatchObject({
        cwd: first,
        input,
        wrapper: join(first, ".claude/hooks/oma-hook.sh"),
        args: [
          "hook",
          "run",
          "--vendor",
          "claude",
          "--event",
          "UserPromptSubmit",
        ],
      });
      expect(existsSync(join(f.plugin, ".agents"))).toBe(false);
      expect(existsSync(join(f.plugin, ".claude"))).toBe(false);
    }, 20_000);

    it("delivers Stop once for a CUE-only project without creating YAML config", () => {
      const f = fixture();
      const project = f.project("CUE project");
      f.runManifest(project, "SessionStart", "{}", { FIXTURE_CUE_ONLY: "1" });
      expect(existsSync(join(project, ".agents/oma-config.cue"))).toBe(true);
      expect(existsSync(join(project, ".agents/oma-config.yaml"))).toBe(false);
      const input = '{ "session_id": "cue", "stop_hook_active": false }\n';
      const local = f.runProjectHook(project, "Stop", input);
      const marketplace = f.runManifest(project, "Stop", input);
      expect(local.stdout + marketplace.stdout).toBe(response);
      expect(f.invocations().filter((call) => call.kind === "hook")).toEqual([
        expect.objectContaining({
          cwd: project,
          input,
          wrapper: join(project, ".claude/hooks/oma-hook.sh"),
          args: ["hook", "run", "--vendor", "claude", "--event", "Stop"],
        }),
      ]);
    }, 20_000);

    it("retains failed installation diagnostics and retries without claiming readiness", () => {
      const f = fixture();
      const project = f.project("retry project");
      const failed = f.runManifest(project, "SessionStart", "{}", {
        FIXTURE_INSTALL_FAIL: "1",
      });
      const marker = join(project, ".agents/state/plugin-bootstrap.version");
      const log = join(
        project,
        ".agents/state/plugin-bootstrap.last-error.log",
      );
      expect(failed.stderr).toContain("oma install did not complete");
      expect(failed.stderr).toContain(log);
      expect(failed.stderr).not.toContain("oma is ready");
      expect(existsSync(marker)).toBe(false);
      const diagnostic = readFileSync(log, "utf8");
      expect(diagnostic).toContain("integration fixture installation failure");
      expect(f.runManifest(project, "UserPromptSubmit").stdout).toBe("");
      expect(f.runManifest(project, "SessionStart").stderr).toContain(
        "oma is ready",
      );
      f.runManifest(project, "SessionStart");
      expect(readFileSync(marker, "utf8")).toBe("integration-version");
      expect(readFileSync(log, "utf8")).toBe(diagnostic);
      expect(
        f.invocations().filter((call) => call.kind === "install"),
      ).toHaveLength(2);
      expect(
        f.invocations().filter((call) => call.kind === "hook"),
      ).toHaveLength(0);
    }, 20_000);
  },
);
