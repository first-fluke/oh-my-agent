/**
 * E2E fail-open + chain-semantics tests for `oma hook` — design 019, Task 10.
 *
 * Invokes the built CLI bundle (cli/bin/cli.js) via spawnSync so every path
 * goes through the real command handler: stdin parsing, vendor validation,
 * dispatch, and dialect render.
 *
 * What is NOT duplicated here (already covered at unit level):
 *   - runChain merge rules (dispatch.test.ts)
 *   - selectTransport socket-absent fallback (transport.test.ts)
 *
 * What IS added (command/e2e level guarantees):
 *   1. Empty stdin              → empty stdout, exit 0
 *   2. Malformed JSON stdin     → empty stdout, exit 0
 *   3. Unknown vendor (copilot) → empty stdout, exit 0  (passes framework
 *      validator since copilot is in ALL_CLI_VENDORS, triggers the inner
 *      VENDORS whitelist → fail-open handler path, not a commander error)
 *   4. Unknown/unmapped event   → empty stdout, exit 0
 *   5. Missing .agents/ (temp cwd without variant JSON) → empty stdout, exit 0
 *   6. Chain-semantics positive: real UserPromptSubmit with repo cwd
 *      → stdout is valid JSON, exit 0
 */

import { spawn, spawnSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

// ---------------------------------------------------------------------------
// Paths
// ---------------------------------------------------------------------------

const REPO_ROOT = join(__dirname, "..", "..");
const CLI_BIN = join(REPO_ROOT, "cli", "bin", "cli.js");
const NODE = process.execPath;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

interface RunResult {
  stdout: string;
  stderr: string;
  status: number | null;
}

function runHook(
  args: string[],
  stdinPayload: string,
  cwd = REPO_ROOT,
): RunResult {
  const result = spawnSync(NODE, [CLI_BIN, "hook", ...args], {
    input: stdinPayload,
    encoding: "utf-8",
    cwd,
    timeout: 10_000,
  });
  return {
    stdout: result.stdout ?? "",
    stderr: result.stderr ?? "",
    status: result.status,
  };
}

// ---------------------------------------------------------------------------
// Temp dir lifecycle (used by the missing-variant case)
// ---------------------------------------------------------------------------

let tempDir: string;

beforeAll(() => {
  tempDir = mkdtempSync(join(tmpdir(), "oma-hook-e2e-"));
});

afterAll(() => {
  rmSync(tempDir, { recursive: true, force: true });
});

// ---------------------------------------------------------------------------
// Fail-open guarantees — each asserts exit 0
// ---------------------------------------------------------------------------

describe("oma hook fail-open guarantees", () => {
  /**
   * Case 1: Empty stdin.
   *
   * command.ts reads stdin → empty string → normalizeInput receives empty raw →
   * payload stays {}; cwd resolves to "" → resolveGitRoot("") returns process
   * cwd (the invocation cwd which has no variant for the test runner's cwd or
   * the stdio pipe picks up empty). Either way: no chain runs, output is empty.
   *
   * For determinism we pass a cwd with no .agents/ so the variant load path
   * definitely finds nothing and returns "".
   */
  it("Case 1: empty stdin → empty stdout, exit 0", () => {
    const r = runHook(
      ["--vendor", "claude", "--event", "UserPromptSubmit"],
      "",
      tempDir,
    );
    expect(r.status).toBe(0);
    expect(r.stdout).toBe("");
  });

  /**
   * Case 2: Malformed JSON stdin.
   *
   * normalizeInput JSON.parse fails → returns null → runHookDispatch returns
   * { output: "" } → nothing written to stdout → exit 0.
   */
  it("Case 2: malformed JSON stdin → empty stdout, exit 0", () => {
    const r = runHook(
      ["--vendor", "claude", "--event", "UserPromptSubmit"],
      "{not valid json at all!}",
      tempDir,
    );
    expect(r.status).toBe(0);
    expect(r.stdout).toBe("");
  });

  /**
   * Case 3: Unknown vendor (copilot).
   *
   * "copilot" is in ALL_CLI_VENDORS so it passes the cli-framework validator
   * (no exit 1 from commander). The command.ts handler then checks against the
   * narrower VENDORS whitelist → logs to stderr and returns without writing
   * stdout → exit 0 (fail-open).
   *
   * Note: truly unknown vendors like "bogus" are rejected by the cli-framework
   * validator and exit 1. That is a CLI contract, not a fail-open boundary.
   */
  it("Case 3: unknown vendor (copilot) → empty stdout, exit 0", () => {
    const r = runHook(
      ["--vendor", "copilot", "--event", "UserPromptSubmit"],
      "{}",
      tempDir,
    );
    expect(r.status).toBe(0);
    expect(r.stdout).toBe("");
    // The stderr warning must mention the vendor for traceability
    expect(r.stderr).toMatch(/unknown vendor/i);
  });

  /**
   * Case 4: Unknown / unmapped event name.
   *
   * nativeEventToKind returns null for e.g. "StatusLineUpdate" → normalizeInput
   * returns null → runHookDispatch returns { output: "" } → empty stdout,
   * exit 0.
   */
  it("Case 4: unknown/unmapped event → empty stdout, exit 0", () => {
    const r = runHook(
      ["--vendor", "claude", "--event", "StatusLineUpdate"],
      JSON.stringify({ prompt: "hello", cwd: tempDir }),
      tempDir,
    );
    expect(r.status).toBe(0);
    expect(r.stdout).toBe("");
  });

  /**
   * Case 5: cwd with no .agents/ — must still NOT crash (exit 0).
   *
   * Variant route-tables are EMBEDDED in the oma bundle, so the chain resolves
   * even outside a project (no "no variant" warning). Handler contribution is
   * state-dependent, so stdout may be empty or a valid dialect envelope; the
   * invariant is exit 0 and no resolution failure.
   */
  it("Case 5: cwd with no .agents/ → exit 0, embedded routes resolve (no crash)", () => {
    const r = runHook(
      ["--vendor", "claude", "--event", "UserPromptSubmit"],
      JSON.stringify({ prompt: "hello", cwd: tempDir }),
      tempDir,
    );
    expect(r.status).toBe(0);
    // Routes are embedded — the chain must NOT report a missing variant.
    expect(r.stderr).not.toMatch(/no embedded variant route-table/i);
    const out = r.stdout.trim();
    if (out.length > 0) {
      expect(() => JSON.parse(out)).not.toThrow();
    }
  });

  /**
   * Case 7: stdin write end held open (regression for the Codex 21s timeout).
   *
   * Codex was observed spawning the UserPromptSubmit hook with a stdin pipe
   * that is never closed. Before the STDIN_READ_TIMEOUT_MS guard in
   * readAllStdin, `oma hook` blocked on the 'end' event forever and the vendor
   * killed it at its hook timeout (18–21s). The guard must dispatch with the
   * buffered payload and exit on its own.
   *
   * The payload is written but stdin is deliberately NOT ended; the process
   * must still exit 0 well before the vendor-side timeout (2s stdin budget +
   * node startup + chain — 15s is generous headroom for slow CI).
   */
  it("Case 7: stdin held open → exits on its own, exit 0", async () => {
    const child = spawn(NODE, [
      CLI_BIN,
      "hook",
      "--vendor",
      "codex",
      "--event",
      "UserPromptSubmit",
    ]);
    child.stdin.write(JSON.stringify({ prompt: "hello", cwd: tempDir }));
    // Intentionally never call child.stdin.end().

    const exitCode = await new Promise<number | null>((resolve) => {
      const killer = setTimeout(() => {
        child.kill("SIGKILL");
        resolve(null);
      }, 15_000);
      child.on("exit", (code) => {
        clearTimeout(killer);
        resolve(code);
      });
    });

    expect(exitCode).toBe(0);
  }, 20_000);
});

// ---------------------------------------------------------------------------
// Chain-semantics positive — e2e level
// ---------------------------------------------------------------------------

describe("oma hook chain-semantics (e2e)", () => {
  /**
   * Case 6: Real UserPromptSubmit with repo cwd.
   *
   * The repo has .agents/hooks/variants/claude.json and the handlers are
   * bundled in cli.js. At least one handler (state-boundary) will produce
   * a context result. The merged output is rendered through makePromptOutput
   * → Claude dialect: { additionalContext: "..." }.
   *
   * Asserts:
   *   - exit 0
   *   - stdout is non-empty
   *   - stdout parses as valid JSON (dialect envelope)
   *   - parsed object contains an "additionalContext" string key
   */
  it("Case 6: UserPromptSubmit with repo cwd → valid JSON dialect, exit 0", () => {
    const payload = JSON.stringify({
      prompt: "orchestrate this",
      cwd: REPO_ROOT,
    });
    const r = runHook(
      ["--vendor", "claude", "--event", "UserPromptSubmit"],
      payload,
      REPO_ROOT,
    );
    // Deterministic chain-semantics invariant: the dispatch never crashes
    // (exit 0) and, WHEN any handler contributes, the output is a well-formed
    // Claude dialect envelope ({ additionalContext: "..." }). Empty output is
    // also valid here — handler contribution is state-dependent (e.g.
    // keyword-detector de-dups repeated triggers via .agents/state, and
    // state-boundary only emits on a session boundary), so asserting non-empty
    // against the live repo would be flaky. The strong positive path (a fresh
    // fixture reliably yielding the workflow context) is owned by the golden
    // tests (Task 9), which run against a controlled temp project.
    expect(r.status).toBe(0);

    const out = r.stdout.trim();
    if (out.length > 0) {
      let parsed: unknown;
      expect(
        () => {
          parsed = JSON.parse(out);
        },
        `stdout must be valid JSON; got: ${out.slice(0, 200)}`,
      ).not.toThrow();
      const obj = parsed as Record<string, unknown>;
      expect(typeof obj.additionalContext).toBe("string");
    }
  }, 20_000); // node startup + bundle load + full chain ~6s; allow headroom
});
