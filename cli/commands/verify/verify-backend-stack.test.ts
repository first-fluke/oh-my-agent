import { execSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { collectVerifyReport } from "./verify.js";

function setupWorkspace(): string {
  const workspace = mkdtempSync(join(tmpdir(), "oma-verify-backend-"));
  mkdirSync(join(workspace, ".agents", "skills", "oma-backend", "stack"), {
    recursive: true,
  });
  return workspace;
}

function writeStack(workspace: string, yaml: string): void {
  writeFileSync(
    join(workspace, ".agents", "skills", "oma-backend", "stack", "stack.yaml"),
    yaml,
  );
}

function findCheck(
  result: ReturnType<typeof collectVerifyReport>,
  namePrefix: string,
) {
  return result.checks.find((c) => c.name.startsWith(namePrefix));
}

describe("verify backend — stack.yaml dispatch", () => {
  let workspace: string;

  beforeEach(() => {
    workspace = setupWorkspace();
  });

  afterEach(() => {
    rmSync(workspace, { recursive: true, force: true });
  });

  it("skips backend checks when stack.yaml is missing", () => {
    rmSync(join(workspace, ".agents", "skills", "oma-backend", "stack"), {
      recursive: true,
    });
    const result = collectVerifyReport("backend", workspace);
    const check = findCheck(result, "Backend Stack");
    expect(check?.status).toBe("skip");
    expect(check?.message).toContain("stack.yaml not found");
  });

  it("flags python f-string SQL injection from python variant patterns", () => {
    writeStack(
      workspace,
      [
        "language: python",
        "verify:",
        "  raw_sql:",
        "    patterns:",
        '      - "f[\\"\'].*(SELECT|INSERT|UPDATE|DELETE)"',
        '    include_glob: "*.py"',
        "    exclude_dirs: [test, tests]",
        "",
      ].join("\n"),
    );
    writeFileSync(
      join(workspace, "app.py"),
      'q = f"SELECT * FROM users WHERE id = {uid}"\n',
    );
    const result = collectVerifyReport("backend", workspace);
    const sql = findCheck(result, "SQL Injection");
    expect(sql?.status).toBe("fail");
    expect(sql?.message).toMatch(/app\.py/);
  });

  it("passes SQL injection when python file uses parameterized query", () => {
    writeStack(
      workspace,
      [
        "language: python",
        "verify:",
        "  raw_sql:",
        "    patterns:",
        '      - "f[\\"\'].*(SELECT|INSERT|UPDATE|DELETE)"',
        '    include_glob: "*.py"',
        "    exclude_dirs: [test, tests]",
        "",
      ].join("\n"),
    );
    writeFileSync(
      join(workspace, "app.py"),
      'q = "SELECT * FROM users WHERE id = ?"\n',
    );
    const result = collectVerifyReport("backend", workspace);
    const sql = findCheck(result, "SQL Injection");
    expect(sql?.status).toBe("pass");
  });

  it("flags node Prisma $queryRawUnsafe calls", () => {
    writeStack(
      workspace,
      [
        "language: node",
        "verify:",
        "  raw_sql:",
        "    patterns:",
        '      - "\\\\$queryRawUnsafe\\\\("',
        '      - "sql\\\\.raw\\\\("',
        '    include_glob: "*.ts"',
        "    exclude_dirs: [node_modules, dist]",
        "",
      ].join("\n"),
    );
    writeFileSync(
      join(workspace, "repo.ts"),
      "const row = await prisma.$queryRawUnsafe(userSuppliedQuery);\n",
    );
    const result = collectVerifyReport("backend", workspace);
    const sql = findCheck(result, "SQL Injection");
    expect(sql?.status).toBe("fail");
    expect(sql?.message).toMatch(/repo\.ts/);
  });

  it("skips tests check when skip_if_missing binary is absent", () => {
    writeStack(
      workspace,
      [
        "language: rust",
        "verify:",
        "  tests:",
        '    cmd: "cargo test"',
        "    skip_if_missing: oma-bin-that-does-not-exist-xyz",
        "",
      ].join("\n"),
    );
    const result = collectVerifyReport("backend", workspace);
    const tests = findCheck(result, "Rust Tests");
    expect(tests?.status).toBe("skip");
    expect(tests?.message).toMatch(/not available/);
  });

  it("names checks using the variant language", () => {
    writeStack(
      workspace,
      ["language: rust", "verify:", "  syntax:", '    cmd: "true"', ""].join(
        "\n",
      ),
    );
    const result = collectVerifyReport("backend", workspace);
    expect(findCheck(result, "Rust Syntax")?.status).toBe("pass");
  });

  it("returns skip for raw_sql when no stack.verify.raw_sql present", () => {
    writeStack(workspace, "language: python\n");
    const result = collectVerifyReport("backend", workspace);
    const sql = findCheck(result, "SQL Injection");
    expect(sql?.status).toBe("skip");
  });

  it("reproduces PR #265 scenario: f-string pattern no longer mis-escaped", () => {
    // Regression guard: the buggy command `f['"].*SELECT...` was swallowed by
    // runCommand's try/catch and always returned PASS. New dispatch uses safe
    // single-quoted grep invocation.
    writeStack(
      workspace,
      [
        "language: python",
        "verify:",
        "  raw_sql:",
        "    patterns:",
        '      - "f[\\"\'].*(SELECT|INSERT|UPDATE|DELETE)"',
        '    include_glob: "*.py"',
        "",
      ].join("\n"),
    );
    writeFileSync(join(workspace, "bad2.py"), "q = f'UPDATE t SET x = {v}'\n");
    const result = collectVerifyReport("backend", workspace);
    const sql = findCheck(result, "SQL Injection");
    expect(sql?.status).toBe("fail");
  });
});

// Sanity: ensure `execSync` is the binding we think it is (no mock residue).
describe("verify backend — runtime sanity", () => {
  it("has real execSync available for shell dispatch", () => {
    expect(typeof execSync).toBe("function");
  });
});
