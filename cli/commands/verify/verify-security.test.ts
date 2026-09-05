import { execSync } from "node:child_process";
import { existsSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { hasBinary, runManifestCmd } from "./report.js";

let workspace: string;

beforeEach(() => {
  workspace = mkdtempSync(join(tmpdir(), "oma-verify-sec-"));
});

afterEach(() => {
  rmSync(workspace, { recursive: true, force: true });
});

describe("runManifestCmd (no shell interpretation of stack.yaml cmd)", () => {
  it("does NOT execute shell metacharacters in the manifest cmd", () => {
    // Regression: stack.yaml verify.cmd ran via execSync (`/bin/sh -c`), so a
    // malicious manifest could inject `; touch pwned`. With execFileSync the
    // whole string is argv to a single binary and the injection cannot fire.
    const marker = join(workspace, "pwned");
    runManifestCmd(`echo hi ; touch ${marker}`, workspace);
    expect(existsSync(marker)).toBe(false);
  });

  it("runs a plain command and returns its stdout", () => {
    const result = runManifestCmd("echo hello", workspace);
    expect(result.exitCode).toBe(0);
    expect(result.stdout.trim()).toBe("hello");
  });

  it("preserves stderr and exit code for failed commands", () => {
    // Regression: cargo/swift/compileall/bun emit diagnostics on stderr. The
    // execFileSync rewrite dropped stderr, so a real failure produced empty
    // output and the syntax check reported a false "pass". Both streams and
    // the failed exit must remain available to the checker.
    const out = runManifestCmd(
      `${process.execPath} -e "process.stderr.write('SYNTAX_ERR');process.exit(1)"`,
      workspace,
    );
    expect(out.stderr).toContain("SYNTAX_ERR");
    expect(out.exitCode).toBe(1);
  });
});

describe("hasBinary (no shell injection via skip_if_missing)", () => {
  it("rejects bin tokens containing shell metacharacters", () => {
    const marker = join(workspace, "pwned2");
    // Old code: `which ${bin}` via execSync → injection. New code rejects the
    // token on the SAFE_BIN_RE allowlist before any process runs.
    expect(hasBinary(`bun; touch ${marker}`, workspace)).toBe(false);
    expect(hasBinary("bun && id", workspace)).toBe(false);
    expect(hasBinary("../../bin/sh", workspace)).toBe(false);
    expect(existsSync(marker)).toBe(false);
  });

  it("resolves a real binary by plain name", () => {
    // `sh` exists on every POSIX CI runner.
    const shExists = (() => {
      try {
        execSync("which sh");
        return true;
      } catch {
        return false;
      }
    })();
    if (shExists) expect(hasBinary("sh", workspace)).toBe(true);
  });
});
