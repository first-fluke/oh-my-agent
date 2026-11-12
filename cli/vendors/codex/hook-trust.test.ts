import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  realpathSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { parse as parseToml } from "smol-toml";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  codexHookHash,
  codexOmaHookTrustEntries,
  trustCodexOmaHooks,
} from "./hook-trust.js";

// Hashes Codex 0.167.1 itself stored after "Trust all and continue" for these
// exact oma handlers (oh-my-agent/.codex/hooks.json).
const OMA_HOOKS = {
  hooks: {
    UserPromptSubmit: [
      {
        hooks: [
          {
            name: "oma-hook-UserPromptSubmit",
            type: "command",
            command:
              "'.codex/hooks/oma-hook.sh' --vendor 'codex' --event 'UserPromptSubmit'",
            timeout: 21,
          },
        ],
      },
    ],
    PreToolUse: [
      {
        hooks: [
          {
            name: "oma-hook-PreToolUse",
            type: "command",
            command:
              "'.codex/hooks/oma-hook.sh' --vendor 'codex' --event 'PreToolUse' --matcher 'Bash'",
            timeout: 13,
          },
        ],
        matcher: "Bash",
      },
    ],
    Stop: [
      {
        hooks: [
          {
            name: "oma-hook-Stop",
            type: "command",
            command:
              "'.codex/hooks/oma-hook.sh' --vendor 'codex' --event 'Stop'",
            timeout: 15,
          },
        ],
      },
    ],
  },
};

describe("codexHookHash", () => {
  it("reproduces the trusted_hash Codex records", () => {
    const [prompt] = OMA_HOOKS.hooks.UserPromptSubmit;
    const [pre] = OMA_HOOKS.hooks.PreToolUse;
    const [stop] = OMA_HOOKS.hooks.Stop;
    expect(
      codexHookHash("UserPromptSubmit", undefined, prompt?.hooks[0] ?? {}),
    ).toBe(
      "sha256:a215886ce7a28b706aa61e81b33b82355d43871f791a3e7967a3644d9b1d92e5",
    );
    expect(codexHookHash("PreToolUse", pre?.matcher, pre?.hooks[0] ?? {})).toBe(
      "sha256:cb19f0cfe872338b0460b4c04159fabeb6946a2011d7886460239212a353b074",
    );
    expect(codexHookHash("Stop", undefined, stop?.hooks[0] ?? {})).toBe(
      "sha256:7177d3d85d0a8ea93b5ea5696200149a9b7c08695a41db18a638b282d3d4c46f",
    );
  });

  it("ignores the matcher where Codex does, and clamps SessionEnd timeouts", () => {
    const handler = { type: "command", command: "x" };
    expect(codexHookHash("Stop", "ignored", handler)).toBe(
      codexHookHash("Stop", undefined, handler),
    );
    expect(
      codexHookHash("SessionEnd", undefined, { ...handler, timeout: 30 }),
    ).toBe(codexHookHash("SessionEnd", undefined, { ...handler, timeout: 3 }));
    expect(codexHookHash("Stop", undefined, handler)).toBe(
      codexHookHash("Stop", undefined, { ...handler, timeout: 600 }),
    );
  });
});

describe("codexOmaHookTrustEntries", () => {
  it("keys only oma's handlers by file, event, group and handler index", () => {
    const doc = {
      hooks: {
        Stop: [
          { hooks: [{ type: "command", command: "./user-hook.sh" }] },
          ...OMA_HOOKS.hooks.Stop,
        ],
      },
    };
    expect(
      codexOmaHookTrustEntries(doc, "/w/.codex/hooks.json").map((e) => e.key),
    ).toEqual(["/w/.codex/hooks.json:stop:1:0"]);
  });
});

describe("trustCodexOmaHooks", () => {
  let dir: string;
  let codexHomeDir: string;
  let project: string;
  let hooksPath: string;
  let configPath: string;

  beforeEach(() => {
    dir = realpathSync(mkdtempSync(join(tmpdir(), "oma-codex-trust-")));
    codexHomeDir = join(dir, "codex-home");
    project = join(dir, "project");
    mkdirSync(codexHomeDir);
    mkdirSync(join(project, ".codex"), { recursive: true });
    hooksPath = join(project, ".codex", "hooks.json");
    configPath = join(codexHomeDir, "config.toml");
    writeFileSync(hooksPath, JSON.stringify(OMA_HOOKS));
  });

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  // biome-ignore lint/suspicious/noExplicitAny: parsed TOML under test
  function config(): Record<string, any> {
    // biome-ignore lint/suspicious/noExplicitAny: parsed TOML under test
    return parseToml(readFileSync(configPath, "utf-8")) as Record<string, any>;
  }

  it("trusts the project and every oma hook, keeping the rest of the file", () => {
    writeFileSync(configPath, '# mine\nmodel = "gpt-5"\n');

    const result = trustCodexOmaHooks({
      configPath,
      hooksPath,
      projectRoot: project,
    });

    expect(result.changed).toBe(true);
    expect(result.trusted).toHaveLength(3);
    const text = readFileSync(configPath, "utf-8");
    expect(text.startsWith('# mine\nmodel = "gpt-5"\n')).toBe(true);
    expect(config().projects[project]).toEqual({ trust_level: "trusted" });
    expect(config().hooks.state[`${hooksPath}:pre_tool_use:0:0`]).toEqual({
      trusted_hash:
        "sha256:cb19f0cfe872338b0460b4c04159fabeb6946a2011d7886460239212a353b074",
    });
    expect(
      trustCodexOmaHooks({ configPath, hooksPath, projectRoot: project })
        .changed,
    ).toBe(false);
  });

  it("re-trusts a hook whose command changed", () => {
    trustCodexOmaHooks({ configPath, hooksPath, projectRoot: project });
    const changed = structuredClone(OMA_HOOKS);
    const stop = changed.hooks.Stop[0]?.hooks[0];
    if (stop) stop.command += " --verbose";
    writeFileSync(hooksPath, JSON.stringify(changed));

    const result = trustCodexOmaHooks({
      configPath,
      hooksPath,
      projectRoot: project,
    });

    expect(result.trusted).toEqual([`${hooksPath}:stop:0:0`]);
    expect(config().hooks.state[`${hooksPath}:stop:0:0`].trusted_hash).toBe(
      codexHookHash("Stop", undefined, stop ?? {}),
    );
  });

  it("never overrides an untrusted project or a disabled hook", () => {
    writeFileSync(
      configPath,
      `[projects.${JSON.stringify(project)}]\ntrust_level = "untrusted"\n`,
    );
    const untrusted = trustCodexOmaHooks({
      configPath,
      hooksPath,
      projectRoot: project,
    });
    expect(untrusted.changed).toBe(false);
    expect(untrusted.reason).toContain("untrusted");

    const key = `${hooksPath}:stop:0:0`;
    writeFileSync(
      configPath,
      `[hooks.state.${JSON.stringify(key)}]\nenabled = false\n`,
    );
    trustCodexOmaHooks({ configPath, hooksPath });
    expect(config().hooks.state[key]).toEqual({ enabled: false });
  });

  it("skips when Codex has no home yet", () => {
    const missing = join(dir, "nope", "config.toml");
    const result = trustCodexOmaHooks({ configPath: missing, hooksPath });
    expect(result.changed).toBe(false);
    expect(result.reason).toContain("not initialized");
  });
});
