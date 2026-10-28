import { execFileSync } from "node:child_process";
import {
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
import { DOMAIN_PRESETS } from "../cli/platform/domain-presets.js";
import { runScopedBootstrap } from "./plugin-host-bootstrap.js";
import {
  assertClaudeDetails,
  assertFreshHostedRunner,
  type HostRunner,
  inspectInstalledSubset,
  parseHostJson,
  runHostSmoke,
} from "./plugin-host-smoke.js";

const repository = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const roots: string[] = [];
afterEach(() => {
  for (const root of roots.splice(0))
    rmSync(root, { recursive: true, force: true });
});

function fixture() {
  const root = mkdtempSync(join(tmpdir(), "oma-host-control-test-"));
  roots.push(root);
  const env: NodeJS.ProcessEnv = {
    CI: "true",
    GITHUB_ACTIONS: "true",
    RUNNER_ENVIRONMENT: "github-hosted",
    GITHUB_WORKSPACE: repository,
    RUNNER_TEMP: root,
  };
  const copied = new Map<string, string>();
  for (const domain of Object.keys(DOMAIN_PRESETS)) {
    const target = join(root, "cache", domain);
    cpSync(join(repository, ".claude-plugin/domains", domain), target, {
      recursive: true,
    });
    copied.set(`oma-${domain}`, target);
  }
  const installed = new Set<string>();
  const calls: { command: string; args: string[] }[] = [];
  const entry = (name: string) => ({
    pluginId: `${name}@oh-my-agent`,
    name,
    marketplaceName: "oh-my-agent",
    installed: installed.has(name),
    enabled: true,
  });
  const run: HostRunner = (command, args) => {
    calls.push({ command, args });
    if (args[0] === "--version") return "codex-cli 0.164.0\n";
    if (args[1] === "marketplace")
      return JSON.stringify({
        marketplaceName: "oh-my-agent",
        installedRoot: repository,
        alreadyAdded: false,
      });
    if (args[1] === "list")
      return JSON.stringify({
        installed: [...installed].map(entry),
        available: args.includes("--available")
          ? ["oma", "oma-frontend", "oma-security", "oma-research"]
              .filter((name) => !installed.has(name))
              .map(entry)
          : [],
      });
    if (args[1] === "add") {
      const name = args[2]?.split("@")[0] ?? "";
      installed.add(name);
      return JSON.stringify({
        pluginId: `${name}@oh-my-agent`,
        installedPath: copied.get(name),
      });
    }
    throw new Error(
      `Unexpected fake-host command: ${command} ${args.join(" ")}`,
    );
  };
  return {
    root,
    env,
    run,
    calls,
    copied,
    installed,
    output: join(root, "report"),
  };
}

describe("real-host smoke control logic (fake CLI responses; no local host installation)", () => {
  it("refuses local or self-hosted runs before any host command", () => {
    const f = fixture();
    expect(() =>
      runHostSmoke("codex", {
        root: repository,
        output: f.output,
        env: { ...f.env, GITHUB_ACTIONS: undefined },
        run: f.run,
        configExists: () => false,
      }),
    ).toThrow("fresh GitHub-hosted");
    expect(f.calls).toEqual([]);
    expect(() =>
      assertFreshHostedRunner(
        { ...f.env, RUNNER_ENVIRONMENT: "self-hosted" },
        repository,
        "codex",
        () => false,
      ),
    ).toThrow();
  });

  it("rejects existing host config and overridden host configuration roots", () => {
    const f = fixture();
    expect(() =>
      assertFreshHostedRunner(f.env, repository, "claude", () => true),
    ).toThrow("pre-existing");
    expect(() =>
      assertFreshHostedRunner(
        { ...f.env, CODEX_HOME: f.root },
        repository,
        "codex",
        () => false,
      ),
    ).toThrow("default host configuration");
  });

  it("discovers four entries, installs exactly three domains, and records cached subsets", () => {
    const f = fixture();
    const report = runHostSmoke("codex", {
      root: repository,
      output: f.output,
      env: f.env,
      run: f.run,
      configExists: () => false,
    });
    expect(report.status).toBe("passed");
    expect(report.discoveredEntries).toEqual([
      "oma",
      "oma-frontend",
      "oma-research",
      "oma-security",
    ]);
    expect([...f.installed].sort()).toEqual([
      "oma-frontend",
      "oma-research",
      "oma-security",
    ]);
    expect(
      JSON.parse(readFileSync(join(f.output, "report.json"), "utf8")).status,
    ).toBe("passed");
    expect(f.calls.every((call) => call.command === "codex")).toBe(true);
    expect(
      f.calls.some(
        (call) => call.args.includes("exec") || call.args.includes("eval"),
      ),
    ).toBe(false);
  });

  it("fails and saves a receipt when an installed bundle contains another skill", () => {
    const f = fixture();
    mkdirSync(
      join(f.copied.get("oma-frontend") as string, "skills", "oma-backend"),
    );
    expect(() =>
      runHostSmoke("codex", {
        root: repository,
        output: f.output,
        env: f.env,
        run: f.run,
        configExists: () => false,
      }),
    ).toThrow("scope changed");
    expect(
      JSON.parse(readFileSync(join(f.output, "report.json"), "utf8")).status,
    ).toBe("failed");
  });

  it("fails before installation if the real-host list would omit an entry", () => {
    const f = fixture();
    const run: HostRunner = (command, args, options) =>
      args[1] === "list"
        ? JSON.stringify({ installed: [], available: [] })
        : f.run(command, args, options);
    expect(() =>
      runHostSmoke("codex", {
        root: repository,
        output: f.output,
        env: f.env,
        run,
        configExists: () => false,
      }),
    ).toThrow("four marketplace entries");
    expect(f.installed.size).toBe(0);
  });

  it("rejects the wrong pinned binary before marketplace registration", () => {
    const f = fixture();
    const run: HostRunner = (command, args, options) =>
      args[0] === "--version"
        ? "codex-cli 0.1.0"
        : f.run(command, args, options);
    expect(() =>
      runHostSmoke("codex", {
        root: repository,
        output: f.output,
        env: f.env,
        run,
        configExists: () => false,
      }),
    ).toThrow("pinned codex");
    expect(f.calls).toEqual([]);
  });

  it("parses Claude's documented final JSON line", () => {
    expect(parseHostJson('Progress...\n{"success":true}\n')).toEqual({
      success: true,
    });
    expect(() => parseHostJson("Progress only")).toThrow();
  });

  it("replaces only payload transport in an isolated Bun process without running an installer", () => {
    const modulePath = JSON.stringify(join(repository, "cli/io/tarball.ts"));
    const probe = `const source = await import(${modulePath}); const result = await source.downloadAndExtract(); console.log(JSON.stringify({dir: result.dir, source: result.source, releaseAsset: source.RELEASE_ASSET_NAME}));`;
    const output = execFileSync(
      "bun",
      [
        "--preload",
        join(repository, "scripts/plugin-host-payload.ts"),
        "--eval",
        probe,
      ],
      {
        encoding: "utf8",
        timeout: 10_000,
        env: {
          ...process.env,
          GITHUB_ACTIONS: "true",
          RUNNER_ENVIRONMENT: "github-hosted",
          OMA_SMOKE_CHECKOUT: repository,
        },
      },
    );
    expect(JSON.parse(output)).toEqual({
      dir: repository,
      source: "ci-checkout-transport",
      releaseAsset: "agent-skills.tar.gz",
    });
  });

  it("requires bootstrap readiness and exact preset/idempotence receipts, not exit zero alone", () => {
    const f = fixture();
    const domain = "frontend";
    let calls = 0;
    const invoke = (
      _command: string,
      args: string[],
      cwd = "",
      env: NodeJS.ProcessEnv = {},
    ) => {
      calls++;
      expect(args).toEqual([
        join(
          f.copied.get("oma-frontend") as string,
          "scripts/plugin-bootstrap.sh",
        ),
        domain,
      ]);
      expect(env.CLAUDE_PROJECT_DIR).toBe(cwd);
      expect(env.OMA_SMOKE_CHECKOUT).toBe(repository);
      expect(env.OMA_NO_AGENTMEMORY).toBe("1");
      if (calls === 1) {
        for (const skill of DOMAIN_PRESETS.frontend.skills) {
          mkdirSync(join(cwd, ".agents/skills", skill), { recursive: true });
          cpSync(
            join(
              f.copied.get("oma-frontend") as string,
              "skills",
              skill,
              "SKILL.md",
            ),
            join(cwd, ".agents/skills", skill, "SKILL.md"),
          );
        }
        mkdirSync(join(cwd, ".agents/state"), { recursive: true });
        writeFileSync(
          join(cwd, ".agents/state/plugin-bootstrap.frontend.version"),
          "fixture-cli-version",
        );
        writeFileSync(
          join(cwd, ".agents/state/plugin-bootstrap.selection"),
          domain,
        );
        writeFileSync(
          join(f.output, "cli-frontend.args"),
          "--version\ninstall --yes --preset frontend\n--version\n",
        );
      }
      return "";
    };
    const receipt = runScopedBootstrap(
      domain,
      f.copied.get("oma-frontend") as string,
      repository,
      f.output,
      invoke,
    );
    expect(calls).toBe(2);
    expect(receipt.installCalls).toEqual(["install --yes --preset frontend"]);
    expect(receipt.secondSessionSkippedInstall).toBe(true);
    const shim = readFileSync(join(f.output, "cli-bin/oma"), "utf8");
    expect(shim).toContain("exec bun --preload");
    expect(shim).toContain("cli/cli.ts");
  });

  it("does not accept a fail-open bootstrap without installed state", () => {
    const f = fixture();
    expect(() =>
      runScopedBootstrap(
        "frontend",
        f.copied.get("oma-frontend") as string,
        repository,
        f.output,
        () => "",
      ),
    ).toThrow();
  });

  it.each(Object.keys(DOMAIN_PRESETS) as (keyof typeof DOMAIN_PRESETS)[])(
    "checks the real %s details shape without inventing agent discovery",
    (domain) => {
      const text = `Skills (${DOMAIN_PRESETS[domain].skills.length})  ${[...DOMAIN_PRESETS[domain].skills].sort().join(", ")}\nAgents (0)\nHooks (4)  SessionStart, UserPromptSubmit, PreToolUse, Stop  (harness-only)\n`;
      expect(() => assertClaudeDetails(text, domain)).not.toThrow();
      expect(() =>
        assertClaudeDetails(text.replace("Hooks (4)", "Hooks (0)"), domain),
      ).toThrow();
    },
  );

  it("checks emitted bundle contents and exact scoped bootstrap command", () => {
    const f = fixture();
    const inventory = inspectInstalledSubset(
      f.copied.get("oma-frontend") as string,
      "frontend",
    );
    expect(inventory.agentFiles).toHaveLength(5);
    expect(inventory.skills).toHaveLength(8);
    expect(inventory.bootstrapCommand).toContain(
      'plugin-bootstrap.sh" frontend',
    );
    expect(existsSync(join(f.output, "report.json"))).toBe(false);
  });
});
