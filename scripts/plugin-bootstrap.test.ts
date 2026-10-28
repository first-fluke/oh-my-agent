import { spawnSync } from "node:child_process";
import {
  chmodSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  realpathSync,
  rmSync,
  symlinkSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, describe, expect, it } from "vitest";
import { DOMAIN_PRESETS } from "../cli/platform/domain-presets.js";

const bootstrap = fileURLToPath(
  new URL("./plugin-bootstrap.sh", import.meta.url),
);
const roots: string[] = [];
const hookEvents = [
  "SessionStart",
  "UserPromptSubmit",
  "PreToolUse",
  "PostToolUse",
  "Stop",
];

function executable(path: string, body: string): void {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, `#!/bin/sh\nset -eu\n${body}\n`);
  chmodSync(path, 0o755);
}

function fixture(
  options: { bun?: boolean; downloader?: "curl" | "wget" } = {},
) {
  const root = realpathSync(
    mkdtempSync(join(tmpdir(), "oma-plugin-bootstrap-")),
  );
  roots.push(root);
  const home = join(root, "home");
  const bin = join(root, "bin");
  const data = join(root, "plugin-data");
  const log = join(root, "install.log");
  const installer = join(root, "installer.sh");
  const bunTemplate = join(root, "bun-template");
  const settings = join(root, "settings.json");
  mkdirSync(bin, { recursive: true });
  mkdirSync(data, { recursive: true });
  for (const command of ["bash", "cat", "chmod", "mkdir", "sh", "tail"]) {
    const target = [`/bin/${command}`, `/usr/bin/${command}`].find(existsSync);
    if (!target) throw new Error(`Missing fixture shell utility: ${command}`);
    symlinkSync(target, join(bin, command));
  }
  writeFileSync(
    settings,
    JSON.stringify({
      hooks: Object.fromEntries(
        hookEvents.map((event) => [
          event,
          [
            {
              hooks: [
                {
                  name: `oma-hook-${event}`,
                  type: "command",
                  command: `"$CLAUDE_PROJECT_DIR/.claude/hooks/oma-hook.sh" --vendor 'claude' --event '${event}'`,
                },
              ],
            },
          ],
        ]),
      ),
    }),
  );
  executable(
    bunTemplate,
    `if [ "\${1:-}" = -e ]; then exec "$FIXTURE_NODE" "$@"; fi
exit 81`,
  );
  executable(
    join(home, ".local/bin/oma"),
    `if [ "\${1:-}" = --version ]; then
  if [ "\${FIXTURE_VERSION_FAIL:-0}" = 1 ]; then printf 'unavailable\\n'; exit 24; fi
  printf '%s\\n' "\${FIXTURE_VERSION-fixture-version}"
  exit 0
fi
if [ "\${1:-}" != install ] || [ "\${2:-}" != --yes ]; then exit 80; fi
if [ "\${OMA_INSTALL_GLOBAL:-0}" = 1 ]; then cd "$HOME"; fi
printf '%s\\n' "$PWD" >> "$FIXTURE_LOG"
printf '%s\\n' "$*" >> "$FIXTURE_ARGS_LOG"
if [ "\${FIXTURE_WIRING_FAIL:-0}" = 1 ]; then
  if [ "\${FIXTURE_LARGE_ERROR:-0}" = 1 ]; then
    "$FIXTURE_NODE" -e 'process.stderr.write("x".repeat(70000))'
  fi
  printf 'fixture wiring diagnostic\\n' >&2
  exit 25
fi
mkdir -p .claude/hooks
cat "$FIXTURE_SETTINGS" > .claude/settings.json
printf '#!/bin/sh\\nexit 0\\n' > .claude/hooks/oma-hook.sh
chmod +x .claude/hooks/oma-hook.sh
if [ "\${FIXTURE_INCOMPLETE:-0}" != 1 ]; then
  mkdir -p .agents/skills
  if [ "\${FIXTURE_SKIP_SKILLS:-0}" != 1 ]; then
    for skill in \${FIXTURE_SKILLS:-}; do
      mkdir -p ".agents/skills/$skill"
      printf 'fixture skill\\n' > ".agents/skills/$skill/SKILL.md"
    done
  fi
  printf '{"version":"fixture-version"}\\n' > .agents/skills/_version.json
  if [ "\${FIXTURE_CONFIG:-yaml}" = cue ]; then
    printf 'package config\\nlanguage: "en"\\n' > .agents/oma-config.cue
  elif [ "\${FIXTURE_CONFIG:-yaml}" != missing ]; then
    printf 'language: en\\n' > .agents/oma-config.yaml
  fi
fi`,
  );
  if (options.bun !== false) {
    symlinkSync(bunTemplate, join(home, ".local/bin/bun"));
  }
  executable(
    join(bin, options.downloader ?? "curl"),
    `if [ "\${FIXTURE_DOWNLOAD_FAIL:-0}" = 1 ]; then exit 22; fi
cat "$FIXTURE_INSTALLER"`,
  );
  writeFileSync(
    installer,
    `set -euo pipefail
[[ "$0" = *bash ]] || { printf 'not running through bash\\n' >&2; exit 21; }
if [[ "\${FIXTURE_INSTALL_FAIL:-0}" = 1 ]]; then
  printf 'fixture provisioning failure\\n' >&2
  exit 23
fi
cat "$FIXTURE_BUN_TEMPLATE" > "$HOME/.local/bin/bun"
chmod +x "$HOME/.local/bin/bun"
`,
  );
  const project = (name: string) => {
    const path = join(root, name);
    mkdirSync(path, { recursive: true });
    return path;
  };
  const run = (cwd: string, extra: Record<string, string> = {}) => {
    const preset = extra.FIXTURE_PRESET as
      | keyof typeof DOMAIN_PRESETS
      | undefined;
    const skills = preset ? (DOMAIN_PRESETS[preset]?.skills ?? []) : [];
    if (preset)
      writeFileSync(
        join(root, "selection.json"),
        JSON.stringify({ preset, skills }),
      );
    return spawnSync("/bin/sh", [bootstrap, ...(preset ? [preset] : [])], {
      cwd,
      encoding: "utf-8",
      env: {
        ...process.env,
        HOME: home,
        PATH: bin,
        CLAUDE_PROJECT_DIR: cwd,
        CLAUDE_PLUGIN_DATA: data,
        FIXTURE_LOG: log,
        FIXTURE_ARGS_LOG: join(root, "args.log"),
        CLAUDE_PLUGIN_ROOT: root,
        FIXTURE_SKILLS: skills.join(" "),
        FIXTURE_INSTALLER: installer,
        FIXTURE_BUN_TEMPLATE: bunTemplate,
        FIXTURE_SETTINGS: settings,
        FIXTURE_NODE: process.execPath,
        OMA_INSTALL_GLOBAL: "0",
        ...extra,
      },
    });
  };
  const installedProjects = () =>
    existsSync(log) ? readFileSync(log, "utf-8").trim().split("\n") : [];
  return {
    root,
    home,
    bin,
    data,
    project,
    run,
    installedProjects,
    installedArgs: () =>
      readFileSync(join(root, "args.log"), "utf8").trim().split("\n"),
  };
}

afterEach(() => {
  for (const root of roots.splice(0))
    rmSync(root, { recursive: true, force: true });
});

describe.skipIf(process.platform === "win32")("plugin bootstrap", () => {
  it.each(["frontend", "security", "research"] as const)(
    "installs the exact %s preset and verifies selected manifests",
    (preset) => {
      const f = fixture();
      const project = f.project("project");
      expect(f.run(project, { FIXTURE_PRESET: preset }).stderr).toContain(
        "oma is ready",
      );
      f.run(project, { FIXTURE_PRESET: preset });
      expect(f.installedArgs()).toEqual([`install --yes --preset ${preset}`]);
      const skill = DOMAIN_PRESETS[preset].skills[0];
      unlinkSync(join(project, ".agents/skills", skill, "SKILL.md"));
      expect(f.run(project, { FIXTURE_PRESET: preset }).stderr).toContain(
        "oma is ready",
      );
      expect(f.installedArgs()).toHaveLength(2);
    },
  );

  it("reinstalls when changing full to domain and back with the same CLI version", () => {
    const f = fixture();
    const project = f.project("project");
    f.run(project);
    f.run(project, { FIXTURE_PRESET: "frontend" });
    f.run(project);
    expect(f.installedArgs()).toEqual([
      "install --yes",
      "install --yes --preset frontend",
      "install --yes",
    ]);
  });

  it("does not record a domain receipt when a selected skill is missing", () => {
    const f = fixture();
    const project = f.project("project");
    expect(
      f.run(project, { FIXTURE_PRESET: "security", FIXTURE_SKIP_SKILLS: "1" })
        .stderr,
    ).toContain("project wiring is incomplete");
    expect(
      existsSync(
        join(project, ".agents/state/plugin-bootstrap.security.version"),
      ),
    ).toBe(false);
  });

  it.each(["curl", "wget"] as const)(
    "runs the %s-downloaded Bash installer through Bash",
    (downloader) => {
      const f = fixture({ bun: false, downloader });
      const project = f.project("project");
      const result = f.run(project);

      expect(result.status).toBe(0);
      expect(result.stderr).not.toContain("not running through bash");
      expect(result.stderr).toContain("oma is ready");
      expect(f.installedProjects()).toEqual([project]);
    },
  );

  it("reports failed provisioning without wiring or failing the host session", () => {
    const f = fixture({ bun: false });
    const result = f.run(f.project("project"), { FIXTURE_INSTALL_FAIL: "1" });

    expect(result.status).toBe(0);
    expect(result.stderr).toContain("runtime provisioning failed");
    expect(result.stderr).not.toContain("oma is ready");
    expect(f.installedProjects()).toEqual([]);
  });

  it("reports a failed download instead of treating empty output as an installer", () => {
    const f = fixture({ bun: false });
    const result = f.run(f.project("project"), { FIXTURE_DOWNLOAD_FAIL: "1" });

    expect(result.status).toBe(0);
    expect(result.stderr).toContain("could not download the runtime installer");
    expect(f.installedProjects()).toEqual([]);
  });

  it("wires each project independently and reuses each project's receipt", () => {
    const f = fixture();
    const first = f.project("first");
    const second = f.project("second project");
    mkdirSync(join(second, ".claude"));
    writeFileSync(join(second, ".claude/settings.json"), "{}");

    expect(f.run(first).status).toBe(0);
    expect(f.run(second).status).toBe(0);
    expect(f.run(first).status).toBe(0);
    expect(f.run(second).status).toBe(0);
    expect(f.installedProjects()).toEqual([first, second]);
  });

  it("wires the project even when global installation is inherited", () => {
    const f = fixture();
    const project = f.project("project");
    const result = f.run(project, { OMA_INSTALL_GLOBAL: "1" });

    expect(result.status).toBe(0);
    expect(result.stderr).toContain("oma is ready");
    expect(f.installedProjects()).toEqual([project]);
    expect(existsSync(join(f.home, ".agents"))).toBe(false);
  });

  it.each([true, false])(
    "prefers the configured PATH CLI to HOME fallbacks with bun available=%s",
    (bun) => {
      const f = fixture({ bun });
      executable(
        join(f.bin, "oma"),
        `if [ "\${1:-}" = --version ]; then printf 'path-version\\n'; exit 0; fi
exec "$HOME/.local/bin/oma" "$@"`,
      );
      const project = f.project("project");
      const result = f.run(project);

      expect(result.status).toBe(0);
      expect(result.stderr).toContain("oma is ready");
      expect(f.installedProjects()).toEqual([project]);
      expect(
        readFileSync(
          join(project, ".agents/state/plugin-bootstrap.version"),
          "utf-8",
        ),
      ).toBe("path-version");
    },
  );

  it("repairs a project whose recorded .agents wiring was removed", () => {
    const f = fixture();
    const project = f.project("project");
    expect(f.run(project).status).toBe(0);
    unlinkSync(join(project, ".agents/skills/_version.json"));

    expect(f.run(project).status).toBe(0);
    expect(f.installedProjects()).toEqual([project, project]);
  });

  it.each([
    "config",
    "settings",
    "partial hooks",
    "wrapper",
    "version metadata",
  ])("repairs a recorded project with missing %s wiring", (missing) => {
    const f = fixture();
    const project = f.project("project");
    expect(f.run(project).status).toBe(0);
    if (missing === "config") {
      unlinkSync(join(project, ".agents/oma-config.yaml"));
    } else if (missing === "wrapper") {
      unlinkSync(join(project, ".claude/hooks/oma-hook.sh"));
    } else if (missing === "version metadata") {
      writeFileSync(
        join(project, ".agents/skills/_version.json"),
        '{"version":""}',
      );
    } else {
      const settingsPath = join(project, ".claude/settings.json");
      const settings = JSON.parse(readFileSync(settingsPath, "utf-8"));
      if (missing === "partial hooks") delete settings.hooks.Stop;
      else settings.hooks = { Stop: [{ hooks: [{ command: "user-hook" }] }] };
      writeFileSync(settingsPath, JSON.stringify(settings));
    }

    const result = f.run(project);

    expect(result.status).toBe(0);
    expect(result.stderr).toContain("oma is ready");
    expect(f.installedProjects()).toEqual([project, project]);
  });

  it("reuses a complete CUE-only project's receipt", () => {
    const f = fixture();
    const project = f.project("project");

    expect(f.run(project, { FIXTURE_CONFIG: "cue" }).status).toBe(0);
    expect(f.run(project, { FIXTURE_CONFIG: "cue" }).status).toBe(0);
    expect(existsSync(join(project, ".agents/oma-config.yaml"))).toBe(false);
    expect(f.installedProjects()).toEqual([project]);
  });

  it("does not record readiness when installation leaves the project config missing", () => {
    const f = fixture();
    const project = f.project("project");
    const result = f.run(project, { FIXTURE_CONFIG: "missing" });

    expect(result.status).toBe(0);
    expect(result.stderr).toContain("project wiring is incomplete");
    expect(result.stderr).not.toContain("oma is ready");
    expect(
      existsSync(join(project, ".agents/state/plugin-bootstrap.version")),
    ).toBe(false);
  });

  it.each([
    { FIXTURE_VERSION: "unknown" },
    { FIXTURE_VERSION: "" },
    { FIXTURE_VERSION_FAIL: "1" },
  ])("does not record readiness for an unreadable version: %j", (extra) => {
    const f = fixture();
    const project = f.project("project");
    const first = f.run(project, extra);
    const second = f.run(project, extra);

    expect(first.status).toBe(0);
    expect(second.status).toBe(0);
    expect(first.stderr).toContain("could not determine the CLI version");
    expect(first.stderr).not.toContain("oma is ready");
    expect(
      existsSync(join(project, ".agents/state/plugin-bootstrap.version")),
    ).toBe(false);
    expect(f.installedProjects()).toEqual([project, project]);
  });

  it("preserves the last successful receipt and reports why an upgrade retry failed", () => {
    const f = fixture();
    const project = f.project("project");
    expect(f.run(project).status).toBe(0);
    const marker = join(project, ".agents/state/plugin-bootstrap.version");

    const failed = f.run(project, {
      FIXTURE_VERSION: "next-version",
      FIXTURE_WIRING_FAIL: "1",
    });

    expect(failed.status).toBe(0);
    expect(failed.stderr).toContain("oma install did not complete");
    expect(failed.stderr).not.toContain("oma is ready");
    const errorLog = join(
      project,
      ".agents/state/plugin-bootstrap.last-error.log",
    );
    expect(failed.stderr).toContain(errorLog);
    const diagnostic = readFileSync(errorLog, "utf-8");
    expect(diagnostic).toContain("fixture wiring diagnostic");
    expect(readFileSync(marker, "utf-8")).toBe("fixture-version");
    expect(f.run(project, { FIXTURE_VERSION: "next-version" }).status).toBe(0);
    expect(readFileSync(marker, "utf-8")).toBe("next-version");
    expect(readFileSync(errorLog, "utf-8")).toBe(diagnostic);
  });

  it("bounds retained failure diagnostics while preserving the final error", () => {
    const f = fixture();
    const project = f.project("project");
    const result = f.run(project, {
      FIXTURE_WIRING_FAIL: "1",
      FIXTURE_LARGE_ERROR: "1",
    });

    expect(result.status).toBe(0);
    const diagnostic = readFileSync(
      join(project, ".agents/state/plugin-bootstrap.last-error.log"),
    );
    expect(diagnostic.byteLength).toBeLessThanOrEqual(65536);
    expect(diagnostic.toString()).toContain("fixture wiring diagnostic");
    expect(result.stderr).not.toContain("oma is ready");
  });

  it("does not write a successful receipt when project wiring is incomplete", () => {
    const f = fixture();
    const project = f.project("project");
    const first = f.run(project, { FIXTURE_INCOMPLETE: "1" });
    const second = f.run(project, { FIXTURE_INCOMPLETE: "1" });

    expect(first.status).toBe(0);
    expect(first.stderr).toContain("project wiring is incomplete");
    expect(second.status).toBe(0);
    expect(f.installedProjects()).toEqual([project, project]);
  });

  it("reports an unwritable receipt without failing the host session", () => {
    const f = fixture();
    const project = f.project("project");
    mkdirSync(join(project, ".agents"));
    writeFileSync(join(project, ".agents/state"), "occupied");

    const result = f.run(project);

    expect(result.status).toBe(0);
    expect(result.stderr).toContain("could not record project wiring");
    expect(result.stderr).not.toContain("oma is ready");
    expect(f.installedProjects()).toEqual([project]);
  });
});
