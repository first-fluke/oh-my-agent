import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const spawnSyncMock = vi.hoisted(() => vi.fn());

vi.mock("node:child_process", () => ({
  spawnSync: (...args: unknown[]) => spawnSyncMock(...args),
}));

import {
  checkAnyTypes,
  checkHardcodedSecrets,
  checkInlineStyles,
  checkTodoComments,
  checkTypeScript,
} from "./codebase-checks.js";

let workspace: string;

beforeEach(() => {
  workspace = mkdtempSync(join(tmpdir(), "oma-codebase-checks-"));
  spawnSyncMock.mockReset();
  // Default: successful exit. Individual tests override for tsc simulation.
  spawnSyncMock.mockReturnValue({
    status: 0,
    stdout: "",
    stderr: "",
    signal: null,
  });
});

afterEach(() => {
  rmSync(workspace, { recursive: true, force: true });
});

function write(rel: string, content: string): void {
  const full = join(workspace, rel);
  mkdirSync(join(full, ".."), { recursive: true });
  writeFileSync(full, content);
}

describe("checkTypeScript (H1: non-zero tsc exit must FAIL)", () => {
  it("FAILS when tsc exits non-zero with type-error stdout", () => {
    // Regression: the old runner conflated a non-zero exit with "no output"
    // and treated it as PASS. runCheckCommand + checkCommandResult now fail
    // closed on any non-zero exit.
    write("tsconfig.json", "{}");
    spawnSyncMock.mockReturnValue({
      status: 2,
      stdout:
        "src/a.ts(1,1): error TS2322: Type 'string' is not assignable to type 'number'.\n",
      stderr: "",
      signal: null,
    });
    const check = checkTypeScript(workspace);
    expect(check.status).toBe("fail");
  });

  it("FAILS when tsc exits non-zero even with empty output", () => {
    write("tsconfig.json", "{}");
    spawnSyncMock.mockReturnValue({
      status: 1,
      stdout: "",
      stderr: "",
      signal: null,
    });
    expect(checkTypeScript(workspace).status).toBe("fail");
  });

  it("FAILS when the checker binary cannot spawn (fail-closed)", () => {
    write("tsconfig.json", "{}");
    spawnSyncMock.mockReturnValue({
      status: null,
      stdout: "",
      stderr: "",
      signal: null,
      error: new Error("spawn npx ENOENT"),
    });
    expect(checkTypeScript(workspace).status).toBe("fail");
  });

  it("passes when tsc exits zero with no output", () => {
    write("tsconfig.json", "{}");
    spawnSyncMock.mockReturnValue({
      status: 0,
      stdout: "",
      stderr: "",
      signal: null,
    });
    const check = checkTypeScript(workspace);
    expect(check.status).toBe("pass");
  });

  it("passes when tsc exits zero (output alone is not an error)", () => {
    write("tsconfig.json", "{}");
    spawnSyncMock.mockReturnValue({
      status: 0,
      stdout: "tsc: some informational output\n",
      stderr: "",
      signal: null,
    });
    expect(checkTypeScript(workspace).status).toBe("pass");
  });

  it("skips when tsconfig.json is absent", () => {
    expect(checkTypeScript(workspace).status).toBe("skip");
    expect(spawnSyncMock).not.toHaveBeenCalled();
  });
});

describe("checkHardcodedSecrets (H2: must work without POSIX grep)", () => {
  it("FAILS on an obvious hardcoded secret (win32 regression fixture)", () => {
    // This exact fixture returned "pass: None detected" on Windows because
    // grep/wc/head do not exist in cmd.exe and the null was read as clean.
    write("src/config.ts", 'const password = "supersecret123";\n');
    const check = checkHardcodedSecrets(workspace);
    expect(check.status).toBe("fail");
    expect(check.message).toContain("config.ts");
  });

  it("detects secrets in every scanned extension", () => {
    for (const ext of ["py", "ts", "tsx", "js", "dart"]) {
      const dir = mkdtempSync(join(tmpdir(), "oma-secret-ext-"));
      try {
        writeFileSync(
          join(dir, `secrets.${ext}`),
          `api_key = "abcdefgh12345678"\n`,
        );
        expect(checkHardcodedSecrets(dir).status).toBe("fail");
      } finally {
        rmSync(dir, { recursive: true, force: true });
      }
    }
  });

  it("passes on a clean workspace", () => {
    write(
      "src/app.ts",
      "export const add = (a: number, b: number) => a + b;\n",
    );
    expect(checkHardcodedSecrets(workspace).status).toBe("pass");
  });

  it("preserves the grep -v test/example exclusions", () => {
    write("src/config.test.ts", 'const password = "supersecret123";\n');
    write("examples/demo.ts", 'const token = "abcdefgh12345678";\n');
    expect(checkHardcodedSecrets(workspace).status).toBe("pass");
  });

  it("skips node_modules", () => {
    write("node_modules/pkg/index.js", 'const secret = "abcdefgh12345678";\n');
    expect(checkHardcodedSecrets(workspace).status).toBe("pass");
  });

  it("ignores short values below the 8-char threshold", () => {
    write("src/a.ts", 'const password = "short";\n');
    expect(checkHardcodedSecrets(workspace).status).toBe("pass");
  });
});

describe("checkTodoComments", () => {
  it("warns with the matching-line count", () => {
    write("src/a.ts", "// TODO: fix this\n// FIXME: later\nconst x = 1;\n");
    const check = checkTodoComments(workspace);
    expect(check.status).toBe("warn");
    expect(check.message).toBe("2 found");
  });

  it("passes when there are no TODO markers", () => {
    write("src/a.ts", "const x = 1;\n");
    expect(checkTodoComments(workspace).status).toBe("pass");
  });

  it("preserves the .agents/ exclusion", () => {
    write(".agents/skills/x.ts", "// TODO: hidden\n");
    expect(checkTodoComments(workspace).status).toBe("pass");
  });
});

describe("checkAnyTypes", () => {
  it("fails above the limit of 3", () => {
    write(
      "src/a.ts",
      [
        "const a: any = 1;",
        "const b: any = 2;",
        "const c: any = 3;",
        "const d: any = 4;",
      ].join("\n"),
    );
    const check = checkAnyTypes(workspace);
    expect(check.status).toBe("fail");
    expect(check.message).toContain("4 found");
  });

  it("warns at 1-3 occurrences", () => {
    write("src/a.ts", "const a: any = 1;\n");
    expect(checkAnyTypes(workspace).status).toBe("warn");
  });

  it("passes when clean and excludes .d.ts files", () => {
    write("src/a.ts", "const a: number = 1;\n");
    write(
      "src/types.d.ts",
      "declare const a: any;\ndeclare const b: any;\ndeclare const c: any;\ndeclare const d: any;\n",
    );
    expect(checkAnyTypes(workspace).status).toBe("pass");
  });
});

describe("checkInlineStyles", () => {
  it("warns on style={{ in tsx/jsx", () => {
    write(
      "src/App.tsx",
      "export const App = () => <div style={{ color: 'red' }} />;\n",
    );
    const check = checkInlineStyles(workspace);
    expect(check.status).toBe("warn");
    expect(check.message).toContain("1 found");
  });

  it("passes when clean", () => {
    write("src/App.tsx", 'export const App = () => <div className="x" />;\n');
    expect(checkInlineStyles(workspace).status).toBe("pass");
  });
});
