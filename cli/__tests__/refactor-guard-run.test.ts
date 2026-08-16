/**
 * Pure in-process tests for the refactor-guard handler's `run()` — no
 * subprocess spawn. Two-phase contract: post_tool events silently RECORD
 * touched code files (never block mid-turn); the stop event ENFORCES by
 * re-counting recorded files and blocking the stop (bounded by
 * MAX_STOP_BLOCKS) while any exceeds the line budget. Opt-in via
 * `refactor_guard.enabled` in oma-config.yaml; fail-open everywhere else.
 * Uses a real temp project dir because the handler reads the edited file,
 * the yaml config, and its own state marker from disk.
 */

import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  countLines,
  extractPatchPaths,
  isRefactorableFile,
  loadGuardConfig,
  MAX_STOP_BLOCKS,
  run,
} from "../../.agents/hooks/core/refactor-guard.ts";

let projectDir: string;

function writeConfig(body: string): void {
  mkdirSync(join(projectDir, ".agents"), { recursive: true });
  writeFileSync(join(projectDir, ".agents", "oma-config.yaml"), body);
}

function enableGuard(maxLines = 500): void {
  writeConfig(`refactor_guard:\n  enabled: true\n  max_lines: ${maxLines}\n`);
}

function writeSource(relPath: string, lines: number): string {
  const abs = join(projectDir, relPath);
  mkdirSync(join(abs, ".."), { recursive: true });
  writeFileSync(abs, `${Array(lines).fill("const x = 1;").join("\n")}\n`);
  return abs;
}

function record(
  filePath: string,
  toolName = "Edit",
  sid = "sid-1",
  toolInput?: Record<string, unknown>,
): ReturnType<typeof run> {
  return run(
    {
      kind: "post_tool",
      toolName,
      toolInput: toolInput ?? { file_path: filePath },
      cwd: projectDir,
    },
    { vendor: "claude", cwd: projectDir, sid },
  );
}

function stop(sid = "sid-1"): ReturnType<typeof run> {
  return run(
    { kind: "stop", cwd: projectDir },
    { vendor: "claude", cwd: projectDir, sid },
  );
}

beforeEach(() => {
  projectDir = mkdtempSync(join(tmpdir(), "oma-refactor-guard-"));
});

afterEach(() => {
  rmSync(projectDir, { recursive: true, force: true });
});

describe("refactor-guard — recorder (post_tool) never blocks", () => {
  it("returns null even for an over-budget file (enforcement is at stop)", async () => {
    enableGuard();
    const abs = writeSource("src/big.ts", 800);
    expect(await record(abs)).toBeNull();
  });

  it("matches tool names case-insensitively (Command Code display names)", async () => {
    enableGuard();
    const abs = writeSource("src/big.ts", 800);
    expect(await record(abs, "WRITE")).toBeNull();
    expect((await stop())?.type).toBe("block");
  });

  it("records codex apply_patch paths from the patch body", async () => {
    enableGuard();
    writeSource("src/big.ts", 800);
    await record("", "apply_patch", "sid-1", {
      input:
        "*** Begin Patch\n*** Update File: src/big.ts\n@@\n+const y = 2;\n*** End Patch",
    });
    const result = await stop();
    expect(result?.type).toBe("block");
    expect((result as { reason: string }).reason).toContain("src/big.ts");
  });
});

describe("refactor-guard — enforcer (stop) blocks over-budget turns", () => {
  it("blocks the stop when a touched file exceeds the budget", async () => {
    enableGuard();
    const abs = writeSource("src/big.ts", 501);
    await record(abs);
    const result = await stop();
    expect(result?.type).toBe("block");
    const reason = (result as { reason: string }).reason;
    expect(reason).toContain("src/big.ts (501 lines)");
    expect(reason).toContain("refactor-engineer");
  });

  it("lists every offender in one block", async () => {
    enableGuard();
    await record(writeSource("src/a.ts", 600));
    await record(writeSource("src/b.ts", 700));
    const reason = ((await stop()) as { reason: string }).reason;
    expect(reason).toContain("src/a.ts");
    expect(reason).toContain("src/b.ts");
  });

  it("honours a custom max_lines budget", async () => {
    enableGuard(100);
    await record(writeSource("src/mid.ts", 150));
    expect((await stop())?.type).toBe("block");
  });

  it("re-counts at stop time — a file split back under budget passes", async () => {
    enableGuard();
    const abs = writeSource("src/big.ts", 800);
    await record(abs);
    writeSource("src/big.ts", 200); // refactored during the turn
    expect(await stop()).toBeNull();
  });

  it("allows the stop once files fit the budget", async () => {
    enableGuard();
    await record(writeSource("src/ok.ts", 500));
    expect(await stop()).toBeNull();
  });

  it(`gives up after ${MAX_STOP_BLOCKS} blocks per file (termination)`, async () => {
    enableGuard();
    await record(writeSource("src/big.ts", 800));
    for (let i = 0; i < MAX_STOP_BLOCKS; i++) {
      expect((await stop())?.type).toBe("block");
    }
    expect(await stop()).toBeNull();
  });

  it("scopes state per session id", async () => {
    enableGuard();
    await record(writeSource("src/big.ts", 800), "Edit", "sid-1");
    expect(await stop("sid-2")).toBeNull();
    expect((await stop("sid-1"))?.type).toBe("block");
  });

  it("merges the unknown bucket for id-less recorders (cursor stop)", async () => {
    enableGuard();
    // Recorder had a session id; the stop payload arrives without one.
    await record(writeSource("src/big.ts", 800), "Edit", "unknown");
    expect((await stop("sid-9"))?.type).toBe("block");
  });

  it("does not leak stop-block counts across sessions via the unknown bucket", async () => {
    enableGuard();
    const abs = writeSource("src/big.ts", 800);
    // Session A (id-less) exhausts its budget.
    await record(abs, "Edit", "unknown");
    for (let i = 0; i < MAX_STOP_BLOCKS; i++) {
      expect((await stop("unknown"))?.type).toBe("block");
    }
    expect(await stop("unknown")).toBeNull();
    // Session B recorded the file itself — its own (fresh) count must win.
    await record(abs, "Edit", "sid-b");
    expect((await stop("sid-b"))?.type).toBe("block");
  });
});

describe("refactor-guard — opt-in gate and fail-open paths", () => {
  it("stays silent by default (no config → disabled)", async () => {
    const abs = writeSource("src/big.ts", 800);
    await record(abs);
    expect(await stop()).toBeNull();
  });

  it("stays silent when explicitly disabled", async () => {
    writeConfig("refactor_guard:\n  enabled: false\n");
    await record(writeSource("src/big.ts", 800));
    expect(await stop()).toBeNull();
  });

  it("ignores non-code files and generated trees", async () => {
    enableGuard();
    await record(writeSource("docs/huge.md", 900));
    await record(writeSource("node_modules/pkg/index.ts", 900));
    await record(writeSource("src/types.d.ts", 900));
    expect(await stop()).toBeNull();
  });

  it("ignores non-edit tools, missing paths, and outside-project paths", async () => {
    enableGuard();
    await record(writeSource("src/big.ts", 800), "Bash");
    await record("", "Edit", "sid-1", {});
    const outside = mkdtempSync(join(tmpdir(), "oma-refactor-outside-"));
    try {
      const abs = join(outside, "big.ts");
      writeFileSync(abs, Array(700).fill("const x = 1;").join("\n"));
      await record(abs);
      expect(await stop()).toBeNull();
    } finally {
      rmSync(outside, { recursive: true, force: true });
    }
  });

  it("ignores prompt events and stops with nothing recorded", async () => {
    enableGuard();
    expect(
      await run(
        { kind: "prompt", prompt: "hello", cwd: projectDir },
        { vendor: "claude", cwd: projectDir, sid: "sid-1" },
      ),
    ).toBeNull();
    expect(await stop()).toBeNull();
  });
});

describe("refactor-guard helpers", () => {
  it("countLines ignores a trailing newline and handles empty files", () => {
    expect(countLines("")).toBe(0);
    expect(countLines("a\nb")).toBe(2);
    expect(countLines("a\nb\n")).toBe(2);
    expect(countLines("a\r\nb\r\n")).toBe(2);
  });

  it("isRefactorableFile classifies by extension and location", () => {
    expect(isRefactorableFile("src/app.ts")).toBe(true);
    expect(isRefactorableFile("lib/main.py")).toBe(true);
    expect(isRefactorableFile("README.md")).toBe(false);
    expect(isRefactorableFile("src/gen.d.ts")).toBe(false);
    expect(isRefactorableFile("dist/app.js")).toBe(false);
    expect(isRefactorableFile("a/node_modules/x/y.ts")).toBe(false);
    expect(isRefactorableFile("../outside.ts")).toBe(false);
  });

  it("extractPatchPaths reads Add/Update markers and skips deletes", () => {
    const patch = [
      "*** Begin Patch",
      "*** Add File: src/new.ts",
      "+export const a = 1;",
      "*** Update File: src/old.ts",
      "@@",
      "*** Delete File: src/gone.ts",
      "*** End Patch",
    ].join("\n");
    expect(extractPatchPaths(patch)).toEqual(["src/new.ts", "src/old.ts"]);
  });

  it("loadGuardConfig parses the refactor_guard block with defaults", () => {
    writeConfig(
      "language: en\nrefactor_guard:\n  # opt in\n  enabled: true\n  max_lines: 250\nscm:\n  conventional_commits: true\n",
    );
    expect(loadGuardConfig(projectDir)).toEqual({
      enabled: true,
      maxLines: 250,
    });
    writeConfig("language: en\n");
    expect(loadGuardConfig(projectDir)).toEqual({
      enabled: false,
      maxLines: 500,
    });
  });

  it("loadGuardConfig accepts the values the config template documents", () => {
    // The template annotates every key with a trailing comment; uncommenting
    // those lines verbatim used to parse as "off", so the flag looked broken.
    writeConfig(
      "refactor_guard:  # forced refactor\n  enabled: true      # opt-in — off by default\n  max_lines: 300      # line budget per file\n",
    );
    expect(loadGuardConfig(projectDir)).toEqual({
      enabled: true,
      maxLines: 300,
    });

    // YAML 1.1 booleans and quoted scalars, matching the rest of oma-config.
    for (const truthy of ["True", "yes", "on", '"true"']) {
      writeConfig(`refactor_guard:\n  enabled: ${truthy}\n`);
      expect(loadGuardConfig(projectDir).enabled).toBe(true);
    }
    for (const falsy of ["False", "no", "off", "'false'"]) {
      writeConfig(`refactor_guard:\n  enabled: ${falsy}\n`);
      expect(loadGuardConfig(projectDir).enabled).toBe(false);
    }
  });

  it("loadGuardConfig keeps defaults for unparseable values", () => {
    // Fail closed: a typo'd key or junk value must not silently enable forced
    // refactoring, nor blow up the hook.
    writeConfig("refactor_guard:\n  enable: true\n");
    expect(loadGuardConfig(projectDir)).toEqual({
      enabled: false,
      maxLines: 500,
    });
    writeConfig("refactor_guard:\n  enabled: maybe\n  max_lines: lots\n");
    expect(loadGuardConfig(projectDir)).toEqual({
      enabled: false,
      maxLines: 500,
    });
  });
});
