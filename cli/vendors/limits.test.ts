import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { parse as parseJsonc } from "jsonc-parser";
import { parse as parseToml } from "smol-toml";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { syncVendorLimits, vendorLimitTargets } from "./limits.js";

vi.mock("node:os", async (original) => ({
  ...(await original<typeof import("node:os")>()),
  homedir: () => join(root, "home"),
}));

// Every vendor home override must fall back to the temp HOME, or a developer
// machine's real `~/.kimi-code`, `~/.copilot`, … would be rewritten by these
// tests.
const HOME_ENV = [
  "CLAUDE_CONFIG_DIR",
  "CODEX_HOME",
  "KIRO_HOME",
  "KIMI_CODE_HOME",
  "COPILOT_HOME",
];

const HOME_FILES = {
  kimi: "home/.kimi-code/config.toml",
  copilot: "home/.copilot/settings.json",
} as const;

const CLAUDE_ENV = {
  CLAUDE_CODE_DISABLE_BG_SHELL_PRESSURE_REAP: "1",
  BASH_MAX_TIMEOUT_MS: "86400000",
  CLAUDE_CODE_MAX_CONCURRENT_SUBAGENTS: "50",
  MCP_SERVER_CONNECTION_BATCH_SIZE: "10",
  CLAUDE_CODE_PRINT_BG_WAIT_CEILING_MS: "7200000",
};

const ALL = [
  "claude",
  "codex",
  "qwen",
  "grok",
  "kiro",
  "opencode",
  "kilo",
  "kimi",
  "copilot",
  "antigravity",
  "pi",
  "commandcode",
  "cursor",
  "zcode",
  "hermes",
];

let root: string;
beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), "oma-limits-"));
  for (const name of HOME_ENV) vi.stubEnv(name, "");
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
  rmSync(root, { recursive: true, force: true });
});

function write(path: string, content: string): void {
  mkdirSync(dirname(join(root, path)), { recursive: true });
  writeFileSync(join(root, path), content);
}
function text(path: string): string {
  return readFileSync(join(root, path), "utf-8");
}
function read(path: string): Record<string, unknown> {
  const raw = text(path);
  return (path.endsWith(".toml") ? parseToml(raw) : parseJsonc(raw)) as Record<
    string,
    unknown
  >;
}
/** Create the config directory a vendor leaves behind once it has run. */
function vendorHasRun(...vendors: (keyof typeof HOME_FILES)[]): void {
  for (const vendor of vendors) {
    mkdirSync(dirname(join(root, HOME_FILES[vendor])), { recursive: true });
  }
}

describe("vendor limits", () => {
  it("lifts every vendor's limits in the file that vendor reads", () => {
    vendorHasRun("kimi", "copilot");

    const changed = syncVendorLimits(root, ALL);

    expect(read(".claude/settings.json")).toEqual({ env: CLAUDE_ENV });
    expect(read(".codex/config.toml")).toEqual({
      agents: { max_concurrent_threads_per_session: 16 },
    });
    // kiro-cli keeps flat dotted keys.
    expect(read(".kiro/settings/cli.json")).toEqual({
      "api.subagentTimeout": 0,
    });
    expect(read(HOME_FILES.kimi)).toEqual({
      background: { bash_task_timeout_s: 0 },
      subagent: { timeout_ms: 0 },
    });
    expect(read(HOME_FILES.copilot)).toEqual({
      workflows: { maxConcurrentRuns: 16 },
    });
    // One write per file, however many keys it carries.
    expect(changed).toEqual([
      join(root, ".claude/settings.json"),
      join(root, ".codex/config.toml"),
      join(root, ".kiro/settings/cli.json"),
      join(root, HOME_FILES.kimi),
      join(root, HOME_FILES.copilot),
    ]);
  });

  it("is idempotent", () => {
    vendorHasRun("kimi", "copilot");
    syncVendorLimits(root, ALL);
    expect(syncVendorLimits(root, ALL)).toEqual([]);
  });

  it("keeps every value the user already set", () => {
    write(
      ".claude/settings.json",
      '{ "env": { "BASH_MAX_TIMEOUT_MS": "600000", "CLAUDE_CODE_DISABLE_BG_SHELL_PRESSURE_REAP": "" } }\n',
    );
    write(".kiro/settings/cli.json", '{ "api.subagentTimeout": 900 }\n');
    write(
      HOME_FILES.kimi,
      "[background]\nbash_task_timeout_s = 120\nkeep_alive_on_exit = true\n",
    );
    write(HOME_FILES.copilot, '{ "workflows": { "maxConcurrentRuns": 2 } }\n');

    syncVendorLimits(root, ["claude", "kiro", "kimi", "copilot"]);

    expect(read(".claude/settings.json")).toEqual({
      env: {
        ...CLAUDE_ENV,
        BASH_MAX_TIMEOUT_MS: "600000",
        CLAUDE_CODE_DISABLE_BG_SHELL_PRESSURE_REAP: "",
      },
    });
    expect(read(".kiro/settings/cli.json")).toEqual({
      "api.subagentTimeout": 900,
    });
    expect(read(HOME_FILES.kimi)).toEqual({
      background: { bash_task_timeout_s: 120, keep_alive_on_exit: true },
      subagent: { timeout_ms: 0 },
    });
    expect(read(HOME_FILES.copilot)).toEqual({
      workflows: { maxConcurrentRuns: 2 },
    });
  });

  it("treats Codex's earlier `max_threads` spelling as the user's cap", () => {
    write(
      ".codex/config.toml",
      '[agents]\nmax_threads = 4\n\n[agents.reviewer]\ndescription = "reviews"\n',
    );
    expect(syncVendorLimits(root, ["codex"])).toEqual([]);
    expect(read(".codex/config.toml")).toEqual({
      agents: { max_threads: 4, reviewer: { description: "reviews" } },
    });
  });

  it("keeps unrelated settings and JSONC comments", () => {
    write(
      ".claude/settings.json",
      '{\n  // keep me\n  "env": { "FOO": "bar" },\n  "model": "opus",\n}\n',
    );
    write(
      ".codex/config.toml",
      'model = "gpt-5"\n\n[agents.reviewer]\ndescription = "reviews"\n',
    );

    syncVendorLimits(root, ["claude", "codex"]);

    const claude = text(".claude/settings.json");
    expect(claude).toContain("// keep me");
    expect(claude).toContain('"FOO": "bar"');
    expect(claude).toContain('"BASH_MAX_TIMEOUT_MS": "86400000"');
    expect(read(".codex/config.toml")).toEqual({
      model: "gpt-5",
      agents: {
        reviewer: { description: "reviews" },
        max_concurrent_threads_per_session: 16,
      },
    });
  });

  it("skips a HOME config whose vendor has never run", () => {
    expect(syncVendorLimits(root, ["kimi", "copilot"])).toEqual([]);
    expect(existsSync(join(root, "home"))).toBe(false);
  });

  it("writes the user config of every vendor in a global install", () => {
    for (const dir of [".claude", ".codex", ".kiro/settings"]) {
      mkdirSync(join(root, "home", dir), { recursive: true });
    }

    const changed = syncVendorLimits(root, ["claude", "codex", "kiro"], {
      global: true,
    });

    expect(changed).toEqual([
      join(root, "home/.claude/settings.json"),
      join(root, "home/.codex/config.toml"),
      join(root, "home/.kiro/settings/cli.json"),
    ]);
    expect(existsSync(join(root, ".claude"))).toBe(false);
  });

  it("reports the changes without writing under dryRun", () => {
    vendorHasRun("kimi");
    const changed = syncVendorLimits(root, ["claude", "kimi"], {
      dryRun: true,
    });
    expect(changed).toEqual([
      join(root, ".claude/settings.json"),
      join(root, HOME_FILES.kimi),
    ]);
    expect(existsSync(join(root, ".claude"))).toBe(false);
    expect(existsSync(join(root, HOME_FILES.kimi))).toBe(false);
  });

  it("leaves a config that does not parse untouched and goes on", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    write(".claude/settings.json", '{ "env": ');
    write(".codex/config.toml", "[agents\n");

    const changed = syncVendorLimits(root, ["claude", "codex", "kiro"]);

    expect(text(".claude/settings.json")).toBe('{ "env": ');
    expect(text(".codex/config.toml")).toBe("[agents\n");
    expect(changed).toEqual([join(root, ".kiro/settings/cli.json")]);
    expect(warn).toHaveBeenCalled();
  });

  it("declares no target for vendors with nothing to lift", () => {
    expect(
      vendorLimitTargets(root, [
        "qwen",
        "grok",
        "opencode",
        "kilo",
        "pi",
        "commandcode",
        "cursor",
        "antigravity",
        "zcode",
        "hermes",
        "not-a-vendor",
      ]),
    ).toEqual([]);
  });
});
