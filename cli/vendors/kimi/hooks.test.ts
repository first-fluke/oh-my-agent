import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { parse as parseToml } from "smol-toml";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { installKimiHooks } from "./hooks.js";

// Repo root, resolved relative to this test file (cli/vendors/kimi/*.test.ts).
const repoRoot = fileURLToPath(new URL("../../../", import.meta.url));

interface KimiTomlHook {
  event: string;
  matcher?: string;
  command: string;
  timeout?: number;
}

function readHooks(configPath: string): KimiTomlHook[] {
  const parsed = parseToml(readFileSync(configPath, "utf-8")) as {
    hooks?: KimiTomlHook[];
  };
  return parsed.hooks ?? [];
}

describe("installKimiHooks", () => {
  let kimiHomeDir: string;
  let configPath: string;

  beforeEach(() => {
    kimiHomeDir = mkdtempSync(join(tmpdir(), "oma-kimi-"));
    configPath = join(kimiHomeDir, "config.toml");
    vi.stubEnv("KIMI_CODE_HOME", kimiHomeDir);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    rmSync(kimiHomeDir, { recursive: true, force: true });
  });

  it("skips with a reason when ~/.kimi-code does not exist", () => {
    rmSync(kimiHomeDir, { recursive: true, force: true });
    const result = installKimiHooks(repoRoot);
    expect(result.installed).toBe(false);
    expect(result.reason).toContain("kimi login");
  });

  it("writes oma-hook.sh and [[hooks]] entries into config.toml", () => {
    const result = installKimiHooks(repoRoot);
    expect(result.installed).toBe(true);

    expect(existsSync(join(kimiHomeDir, "hooks", "oma-hook.sh"))).toBe(true);

    const hooks = readHooks(configPath);
    const events = hooks.map((h) => h.event).sort();
    expect(events).toEqual([
      "PostToolUse",
      "PreToolUse",
      "Stop",
      "UserPromptSubmit",
    ]);
    // Every entry routes through the oma-hook wrapper with --vendor kimi.
    for (const h of hooks) {
      expect(h.command).toContain("oma-hook.sh");
      // Args are POSIX single-quoted by shellQuote (injection-safe), shared
      // with buildOmaHookCmd via buildOmaHookArgs.
      expect(h.command).toContain("--vendor 'kimi'");
      expect(h.command).toContain(`--event '${h.event}'`);
    }
    // PreToolUse carries the Bash matcher (test-filter scope).
    const preTool = hooks.find((h) => h.event === "PreToolUse");
    expect(preTool?.matcher).toBe("Bash");
    // PostToolUse carries the kimi file-edit tool matcher (refactor-guard).
    const postTool = hooks.find((h) => h.event === "PostToolUse");
    expect(postTool?.matcher).toBe("WriteFile|StrReplaceFile");
  });

  it("is idempotent — re-running does not duplicate oma-managed hooks", () => {
    installKimiHooks(repoRoot);
    installKimiHooks(repoRoot);
    const omaHooks = readHooks(configPath).filter((h) =>
      h.command.includes("oma-hook.sh"),
    );
    expect(omaHooks).toHaveLength(4);
  });

  it("preserves the user's own hooks and other config", () => {
    mkdirSync(join(kimiHomeDir), { recursive: true });
    writeFileSync(
      configPath,
      [
        'model = "kimi-k2"',
        "",
        "[[hooks]]",
        'event = "PostToolUse"',
        'command = "echo custom"',
        "",
      ].join("\n"),
    );

    installKimiHooks(repoRoot);

    const parsed = parseToml(readFileSync(configPath, "utf-8")) as {
      model?: string;
      hooks?: KimiTomlHook[];
    };
    expect(parsed.model).toBe("kimi-k2");
    const userHook = parsed.hooks?.find((h) => h.command === "echo custom");
    expect(userHook).toBeDefined();
    expect(userHook?.event).toBe("PostToolUse");
  });
});
