import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { collectVerifyReport } from "./report.js";

function setupWorkspace(): string {
  return mkdtempSync(join(tmpdir(), "oma-verify-frontend-"));
}

function writeStack(
  workspace: string,
  yaml: string,
  skill = "oma-frontend",
): void {
  const dir = join(workspace, ".agents", "skills", skill, "stack");
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, "stack.yaml"), yaml);
}

function findCheck(
  result: ReturnType<typeof collectVerifyReport>,
  namePrefix: string,
) {
  return result.checks.find((c) => c.name.startsWith(namePrefix));
}

// The manifest commands below use POSIX binaries (`true`, `false`, `echo`).
describe.skipIf(process.platform === "win32")(
  "verify frontend — stack.yaml dispatch",
  () => {
    let workspace: string;

    beforeEach(() => {
      workspace = setupWorkspace();
    });

    afterEach(() => {
      rmSync(workspace, { recursive: true, force: true });
    });

    it("no manifest keeps the built-in TypeScript and Vitest checks", () => {
      const result = collectVerifyReport("frontend", workspace);

      const ts = findCheck(result, "TypeScript");
      const tests = findCheck(result, "Frontend Tests");
      expect(ts?.status).toBe("skip");
      expect(ts?.message).toBe("Not configured");
      expect(tests?.status).toBe("skip");
      expect(tests?.message).toBe("No package.json");
      expect(findCheck(result, "Inline Styles")).toBeDefined();
      expect(findCheck(result, "Any Types")).toBeDefined();
      expect(result.checks.some((c) => c.name.endsWith(" Syntax"))).toBe(false);
    });

    it("manifest verify block replaces the built-in syntax and test runners", () => {
      writeStack(
        workspace,
        [
          "language: typescript",
          "framework: angular",
          "verify:",
          "  detect: angular.json",
          "  syntax:",
          '    cmd: "true"',
          "  tests:",
          '    cmd: "false"',
          "",
        ].join("\n"),
      );
      const result = collectVerifyReport("frontend", workspace);

      const syntax = findCheck(result, "Typescript Syntax");
      const tests = findCheck(result, "Typescript Tests");
      expect(syntax?.status).toBe("pass");
      expect(tests?.status).toBe("fail");
      expect(tests?.message).toContain("Tests failed");
      expect(result.ok).toBe(false);

      // Built-in runners must not run when the manifest declares its own.
      expect(result.checks.some((c) => c.name === "TypeScript")).toBe(false);
      expect(result.checks.some((c) => c.name === "Frontend Tests")).toBe(
        false,
      );
      // Static frontend scans still apply.
      expect(findCheck(result, "Inline Styles")).toBeDefined();
      expect(findCheck(result, "Any Types")).toBeDefined();
    });

    it("falls back to the angular-developer manifest written by /stack-set", () => {
      // /stack-set writes the Angular stack.yaml under angular-developer when
      // that optional external skill is installed.
      writeStack(
        workspace,
        [
          "language: typescript",
          "framework: angular",
          "verify:",
          "  syntax:",
          '    cmd: "true"',
          "  tests:",
          '    cmd: "true"',
          "",
        ].join("\n"),
        "angular-developer",
      );
      const result = collectVerifyReport("frontend", workspace);

      expect(findCheck(result, "Typescript Syntax")?.status).toBe("pass");
      expect(findCheck(result, "Typescript Tests")?.status).toBe("pass");
      expect(result.checks.some((c) => c.name === "TypeScript")).toBe(false);
      expect(result.checks.some((c) => c.name === "Frontend Tests")).toBe(
        false,
      );
    });

    it("prefers the oma-frontend manifest over angular-developer", () => {
      writeStack(
        workspace,
        [
          "language: typescript",
          "verify:",
          "  tests:",
          '    cmd: "false"',
          "",
        ].join("\n"),
      );
      writeStack(
        workspace,
        [
          "language: typescript",
          "verify:",
          "  tests:",
          '    cmd: "true"',
          "",
        ].join("\n"),
        "angular-developer",
      );
      const result = collectVerifyReport("frontend", workspace);
      expect(findCheck(result, "Typescript Tests")?.status).toBe("fail");
    });

    it("honours tests.pass_signal from the manifest", () => {
      writeStack(
        workspace,
        [
          "language: typescript",
          "verify:",
          "  tests:",
          '    cmd: "echo all good"',
          '    pass_signal: "0 failed"',
          "",
        ].join("\n"),
      );
      const result = collectVerifyReport("frontend", workspace);
      const tests = findCheck(result, "Typescript Tests");
      expect(tests?.status).toBe("fail");
      expect(tests?.message).toContain("pass signal not found");
    });

    it("manifest without a verify block skips syntax and tests", () => {
      writeStack(workspace, "language: typescript\n");
      const result = collectVerifyReport("frontend", workspace);

      const syntax = findCheck(result, "Typescript Syntax");
      const tests = findCheck(result, "Typescript Tests");
      expect(syntax?.status).toBe("skip");
      expect(syntax?.message).toContain("No syntax check configured");
      expect(tests?.status).toBe("skip");
      expect(tests?.message).toContain("No tests check configured");
    });

    it("invalid manifest (no language) falls back to built-in checks", () => {
      writeStack(workspace, "framework: angular\n");
      const result = collectVerifyReport("frontend", workspace);
      expect(findCheck(result, "TypeScript")?.message).toBe("Not configured");
      expect(findCheck(result, "Frontend Tests")).toBeDefined();
    });
  },
);
