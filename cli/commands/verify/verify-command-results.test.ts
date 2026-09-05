import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  checkFlutterAnalysis,
  checkFlutterTests,
  checkFrontendTests,
  checkPythonTests,
  checkTypeScript,
} from "./codebase-checks.js";
import { checkBackendSyntax, checkBackendTests } from "./stack-checks.js";

describe.skipIf(process.platform === "win32")(
  "verification command outcomes",
  () => {
    let workspace: string;

    beforeEach(() => {
      workspace = mkdtempSync(join(tmpdir(), "oma-verify-outcomes-"));
      mkdirSync(join(workspace, "bin"));
      writeFileSync(join(workspace, "tsconfig.json"), "{}");
      writeFileSync(
        join(workspace, "package.json"),
        JSON.stringify({ devDependencies: { vitest: "*" } }),
      );
      vi.stubEnv("PATH", `${join(workspace, "bin")}:${process.env.PATH}`);
    });

    afterEach(() => {
      vi.unstubAllEnvs();
      rmSync(workspace, { recursive: true, force: true });
    });

    function runner(body: string, binary = "npx"): string {
      const script = join(workspace, "runner.cjs");
      writeFileSync(script, body);
      writeFileSync(
        join(workspace, "bin", binary),
        `#!/bin/sh\nexec '${process.execPath}' '${script}'\n`,
        { mode: 0o755 },
      );
      return `"${process.execPath}" "${script}"`;
    }

    it("fails TypeScript when diagnostics accompany a nonzero exit", () => {
      runner('console.error("error TS2322: type mismatch"); process.exit(2);');
      expect(checkTypeScript(workspace).status).toBe("fail");
    });

    it("fails TypeScript even when the failed command produces no output", () => {
      runner("process.exit(1);");
      expect(checkTypeScript(workspace).status).toBe("fail");
    });

    it("accepts successful checks without requiring English output", () => {
      runner('console.log("0 errors");');
      expect(checkTypeScript(workspace).status).toBe("pass");
      expect(checkFrontendTests(workspace).status).toBe("pass");
    });

    it("fails frontend tests with both passing and failing tests", () => {
      runner('console.log("1 failed | 1 passed"); process.exit(1);');
      expect(checkFrontendTests(workspace).status).toBe("fail");
    });

    it("skips frontend tests when Vitest is not configured", () => {
      writeFileSync(join(workspace, "package.json"), "{}");
      runner("process.exit(1);");
      expect(checkFrontendTests(workspace).status).toBe("skip");
    });

    it("fails a configured frontend check when its runner cannot execute", () => {
      runner('console.error("tool unavailable"); process.exit(127);');
      expect(checkFrontendTests(workspace).status).toBe("fail");
    });

    it("does not skip a workspace that inherits an installed Vitest dependency", () => {
      writeFileSync(join(workspace, "package.json"), "{}");
      const dependency = join(workspace, "node_modules", "vitest");
      mkdirSync(dependency, { recursive: true });
      writeFileSync(join(dependency, "package.json"), '{"name":"vitest"}');
      runner("process.exit(1);");
      expect(checkFrontendTests(workspace).status).toBe("fail");
    });

    it("does not skip a workspace with a Vitest config but missing dependencies", () => {
      writeFileSync(join(workspace, "package.json"), "{}");
      writeFileSync(join(workspace, "vitest.config.ts"), "export default {};");
      runner("process.exit(1);");
      expect(checkFrontendTests(workspace).status).toBe("fail");
    });

    it("reports an invalid package manifest as a check failure", () => {
      writeFileSync(join(workspace, "package.json"), "invalid json");
      expect(checkFrontendTests(workspace).status).toBe("fail");
    });

    it.each([
      ["Python", "uv", checkPythonTests],
      ["Flutter tests", "flutter", checkFlutterTests],
      ["Flutter analysis", "flutter", checkFlutterAnalysis],
    ] as const)(
      "uses the process outcome for %s checks",
      (_name, binary, check) => {
        writeFileSync(
          join(workspace, "pyproject.toml"),
          "[project]\nname = 'fixture'\n",
        );
        runner(
          'console.log("All tests passed; No issues found"); process.exit(1);',
          binary,
        );
        expect(check(workspace).status).toBe("fail");
        runner("process.exit(0);", binary);
        expect(check(workspace).status).toBe("pass");
      },
    );

    it.each([undefined, "passed"])(
      "does not let backend output override exit failure (signal %s)",
      (pass_signal) => {
        const cmd = runner(
          'console.log("1 failed | 1 passed"); process.exit(1);',
        );
        expect(
          checkBackendTests(
            { language: "node", verify: { tests: { cmd, pass_signal } } },
            workspace,
          ).status,
        ).toBe("fail");
      },
    );

    it("fails backend syntax when the tool exits silently with an error", () => {
      const cmd = runner("process.exit(1);");
      expect(
        checkBackendSyntax(
          { language: "node", verify: { syntax: { cmd } } },
          workspace,
        ).status,
      ).toBe("fail");
    });

    it("fails a configured syntax check when its executable is missing", () => {
      const cmd = join(workspace, "missing-executable");
      expect(
        checkBackendSyntax(
          { language: "node", verify: { syntax: { cmd } } },
          workspace,
        ).status,
      ).toBe("fail");
    });

    it("accepts silent backend success when no pass signal is configured", () => {
      const cmd = runner("process.exit(0);");
      expect(
        checkBackendTests(
          { language: "node", verify: { tests: { cmd } } },
          workspace,
        ).status,
      ).toBe("pass");
    });

    it("still requires an explicitly configured pass signal", () => {
      const cmd = runner('console.log("finished");');
      expect(
        checkBackendTests(
          {
            language: "node",
            verify: { tests: { cmd, pass_signal: "passed" } },
          },
          workspace,
        ).status,
      ).toBe("fail");
    });

    it("returns a failing CLI exit and JSON result when frontend tests fail", () => {
      runner('console.log("1 failed | 1 passed"); process.exit(1);');
      const entry = resolve("commands/verify/command.ts");
      const result = spawnSync(
        "bun",
        [
          "-e",
          `import { verify } from ${JSON.stringify(entry)}; await verify("frontend", ${JSON.stringify(workspace)}, true);`,
        ],
        { encoding: "utf8", env: { ...process.env }, timeout: 15_000 },
      );
      expect(result.error).toBeUndefined();
      expect(result.status).toBe(1);
      const report = JSON.parse(result.stdout);
      expect(report.ok).toBe(false);
      expect(report.checks).toContainEqual({
        name: "Frontend Tests",
        status: "fail",
        message: expect.any(String),
      });
    });
  },
);
