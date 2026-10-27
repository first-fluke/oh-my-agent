import { spawnSync } from "node:child_process";
import {
  chmodSync,
  cpSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, describe, expect, it } from "vitest";
import { chainTimeoutSeconds } from "../cli/platform/hooks-composer.js";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const roots: string[] = [];

afterEach(() => {
  for (const root of roots.splice(0)) {
    rmSync(root, { recursive: true, force: true });
  }
});

function fixture() {
  const root = mkdtempSync(join(tmpdir(), "oma-plugin-hook-"));
  roots.push(root);
  const plugin = join(root, "plugin cache");
  const project = join(root, "project directory");
  const bin = join(root, "bin");
  mkdirSync(join(plugin, "scripts"), { recursive: true });
  mkdirSync(join(project, ".agents"), { recursive: true });
  mkdirSync(bin);
  cpSync(
    join(repoRoot, "scripts/plugin-hook.sh"),
    join(plugin, "scripts/plugin-hook.sh"),
  );
  writeFileSync(join(project, ".agents/oma-config.yaml"), "language: en\n");
  const args = join(root, "args");
  const payload = join(root, "payload");
  const wrapper = join(root, "wrapper");
  writeFileSync(
    join(bin, "oma"),
    '#!/bin/sh\nprintf "%s\\n" "$@" > "$OMA_FIXTURE_ARGS"\n' +
      'printf "%s" "$OMA_HOOK_WRAPPER" > "$OMA_FIXTURE_WRAPPER"\n' +
      'cat > "$OMA_FIXTURE_PAYLOAD"\n' +
      'printf "%s" \'{"decision":"block","reason":"fixture"}\'\n' +
      'exit "$OMA_FIXTURE_EXIT"\n',
    { mode: 0o755 },
  );
  return {
    root,
    plugin,
    project,
    args,
    payload,
    wrapper,
    env: {
      ...process.env,
      CLAUDE_PLUGIN_ROOT: plugin,
      CLAUDE_PROJECT_DIR: project,
      PATH: `${bin}:${process.env.PATH ?? "/usr/bin:/bin"}`,
      OMA_FIXTURE_ARGS: args,
      OMA_FIXTURE_PAYLOAD: payload,
      OMA_FIXTURE_WRAPPER: wrapper,
      OMA_FIXTURE_EXIT: "0",
    },
  };
}

function registerProjectHook(
  project: string,
  event: string,
  matcher?: string,
  name = `oma-hook-${event}`,
) {
  const wrapper = join(project, ".claude/hooks/oma-hook.sh");
  mkdirSync(dirname(wrapper), { recursive: true });
  writeFileSync(wrapper, "#!/bin/sh\nexit 0\n", { mode: 0o755 });
  writeFileSync(
    join(project, ".claude/settings.json"),
    JSON.stringify({
      hooks: {
        [event]: [
          {
            matcher,
            hooks: [{ name, type: "command", command: `sh "${wrapper}"` }],
          },
        ],
      },
    }),
  );
  return wrapper;
}

describe.skipIf(process.platform === "win32")(
  "marketplace hook dispatch",
  () => {
    it("allows the same handler budgets as project-installed hooks", () => {
      const manifest = JSON.parse(
        readFileSync(join(repoRoot, "hooks/hooks.json"), "utf8"),
      );
      const variant = JSON.parse(
        readFileSync(
          join(repoRoot, ".agents/hooks/variants/claude.json"),
          "utf8",
        ),
      );
      for (const event of ["UserPromptSubmit", "PreToolUse", "Stop"]) {
        expect(
          manifest.hooks[event][0].hooks[0].timeout,
        ).toBeGreaterThanOrEqual(chainTimeoutSeconds(variant.events[event]));
      }
    });

    for (const event of ["UserPromptSubmit", "PreToolUse", "Stop"] as const) {
      it(`dispatches ${event} from a fresh plugin cache`, () => {
        const f = fixture();
        const manifest = JSON.parse(
          readFileSync(join(repoRoot, "hooks/hooks.json"), "utf8"),
        );
        const hooks = manifest.hooks[event].flatMap(
          (group: { hooks: { command: string }[] }) => group.hooks,
        );
        expect(hooks).toHaveLength(1);
        const input = JSON.stringify({
          session_id: "fixture",
          prompt: "Review the form",
        });
        const result = spawnSync("sh", ["-c", hooks[0].command], {
          cwd: f.project,
          env: f.env,
          input,
          encoding: "utf8",
          timeout: 5000,
        });
        expect(result.error).toBeUndefined();
        expect(result.status).toBe(0);
        expect(result.stdout).toBe('{"decision":"block","reason":"fixture"}');
        expect(readFileSync(f.payload, "utf8")).toBe(input);
        expect(readFileSync(f.args, "utf8").trim().split("\n")).toEqual([
          "hook",
          "--vendor",
          "claude",
          "--event",
          event,
          ...(event === "PreToolUse" ? ["--matcher", "Bash"] : []),
        ]);
        expect(readFileSync(f.wrapper, "utf8")).toBe(
          join(f.plugin, "scripts/plugin-hook.sh"),
        );
        expect(existsSync(join(f.plugin, ".claude"))).toBe(false);
      });
    }

    it("waits for project bootstrap before dispatching", () => {
      const f = fixture();
      rmSync(join(f.project, ".agents"), { recursive: true });
      const result = spawnSync(
        "sh",
        [join(f.plugin, "scripts/plugin-hook.sh"), "Stop"],
        {
          cwd: f.project,
          env: f.env,
          input: "{}",
          encoding: "utf8",
          timeout: 5000,
        },
      );
      expect(result.status).toBe(0);
      expect(result.stdout).toBe("");
      expect(existsSync(f.args)).toBe(false);
    });

    it("dispatches when the project uses only CUE configuration", () => {
      const f = fixture();
      rmSync(join(f.project, ".agents/oma-config.yaml"));
      writeFileSync(
        join(f.project, ".agents/oma-config.cue"),
        'language: "en"\n',
      );
      const result = spawnSync(
        "sh",
        [join(f.plugin, "scripts/plugin-hook.sh"), "Stop"],
        {
          cwd: f.project,
          env: f.env,
          input: "{}",
          encoding: "utf8",
          timeout: 5000,
        },
      );
      expect(result.status).toBe(0);
      expect(readFileSync(f.args, "utf8").trim().split("\n")).toEqual([
        "hook",
        "--vendor",
        "claude",
        "--event",
        "Stop",
      ]);
    });

    it("keeps hook output and fails open if the CLI exits with an error", () => {
      const f = fixture();
      const result = spawnSync(
        "sh",
        [join(f.plugin, "scripts/plugin-hook.sh"), "Stop"],
        {
          cwd: f.project,
          env: { ...f.env, OMA_FIXTURE_EXIT: "7" },
          input: "{}",
          encoding: "utf8",
          timeout: 5000,
        },
      );
      expect(result.status).toBe(0);
      expect(result.stdout).toBe('{"decision":"block","reason":"fixture"}');
    });

    for (const event of ["UserPromptSubmit", "PreToolUse", "Stop"]) {
      it(`lets the installed project hook own ${event}`, () => {
        const f = fixture();
        registerProjectHook(
          f.project,
          event,
          event === "PreToolUse" ? "Bash|Grep|Glob" : undefined,
        );
        const result = spawnSync(
          "sh",
          [
            join(f.plugin, "scripts/plugin-hook.sh"),
            event,
            ...(event === "PreToolUse" ? ["Bash"] : []),
          ],
          {
            cwd: f.project,
            env: f.env,
            input: "{}",
            encoding: "utf8",
            timeout: 5000,
          },
        );
        expect(result.status).toBe(0);
        expect(result.stdout).toBe("");
        expect(existsSync(f.args)).toBe(false);
      });
    }

    for (const broken of [
      "unrelated registration",
      "different matcher",
      "nonexecutable wrapper",
      "invalid settings",
    ] as const) {
      it(`keeps plugin fallback for ${broken}`, () => {
        const f = fixture();
        const wrapper = registerProjectHook(
          f.project,
          "PreToolUse",
          broken === "different matcher" ? "Grep|Glob" : "Bash",
          broken === "unrelated registration"
            ? "user-hook"
            : "oma-hook-PreToolUse",
        );
        if (broken === "nonexecutable wrapper") chmodSync(wrapper, 0o644);
        if (broken === "invalid settings")
          writeFileSync(join(f.project, ".claude/settings.json"), "{");
        const result = spawnSync(
          "sh",
          [join(f.plugin, "scripts/plugin-hook.sh"), "PreToolUse", "Bash"],
          {
            cwd: f.project,
            env: f.env,
            input: "{}",
            encoding: "utf8",
            timeout: 5000,
          },
        );
        expect(result.status).toBe(0);
        expect(result.stdout).toBe('{"decision":"block","reason":"fixture"}');
        expect(existsSync(f.args)).toBe(true);
      });
    }
  },
);
