import { execSync } from "node:child_process";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const FILTER_PATH = join(
  __dirname,
  "../../.agents/hooks/core/filter-test-output.sh",
);

function filter(input: string, env?: Record<string, string>): string {
  return execSync(`bash "${FILTER_PATH}"`, {
    input,
    encoding: "utf-8",
    env: { ...process.env, ...env },
  });
}

// filter-test-output.sh is a POSIX shell script. Windows CI's Git Bash
// has subtle grep/regex differences that break some patterns; the script
// is exercised at runtime only on POSIX agents, so skip on Windows.
describe.skipIf(process.platform === "win32")("filter-test-output.sh", () => {
  describe("vitest/jest", () => {
    it("should remove passing test lines (✓)", () => {
      const input = [
        " ✓ should do A",
        " ✓ should do B",
        " × should do C",
        "   → expected 1 to be 2",
      ].join("\n");
      const result = filter(input);
      expect(result).not.toContain("should do A");
      expect(result).not.toContain("should do B");
      expect(result).toContain("should do C");
      expect(result).toContain("expected 1 to be 2");
    });

    it("should remove PASS file headers", () => {
      const input = [" PASS src/utils.test.ts", " FAIL src/hooks.test.ts"].join(
        "\n",
      );
      const result = filter(input);
      expect(result).not.toContain("PASS src");
      expect(result).toContain("FAIL src");
    });

    it("should keep summary lines", () => {
      const input = [
        " Test Files  1 failed | 2 passed (3)",
        " Tests       1 failed | 9 passed (10)",
        " Duration    1.23s",
      ].join("\n");
      const result = filter(input);
      expect(result).toContain("Test Files");
      expect(result).toContain("Tests");
      expect(result).toContain("Duration");
    });
  });

  describe("pytest", () => {
    it("should remove PASSED lines", () => {
      const input = [
        "test_foo.py::test_one PASSED",
        "test_foo.py::test_two PASSED",
        "test_foo.py::test_three FAILED",
      ].join("\n");
      const result = filter(input);
      expect(result).not.toContain("test_one PASSED");
      expect(result).toContain("test_three FAILED");
    });
  });

  describe("go test", () => {
    it("should remove --- PASS lines", () => {
      const input = [
        "--- PASS: TestFoo (0.00s)",
        "--- FAIL: TestBar (0.01s)",
        "    expected 1, got 2",
      ].join("\n");
      const result = filter(input);
      expect(result).not.toContain("PASS: TestFoo");
      expect(result).toContain("FAIL: TestBar");
    });

    it("should remove ok package lines", () => {
      const input = "ok  \tgithub.com/foo/bar\t0.5s\n";
      const result = filter(input);
      expect(result.trim()).toBe("");
    });
  });

  describe("cargo test", () => {
    it("should remove 'test ... ok' lines", () => {
      const input = [
        "test utils::test_add ... ok",
        "test utils::test_overflow ... FAILED",
        "",
        "test result: FAILED. 1 passed; 1 failed",
      ].join("\n");
      const result = filter(input);
      expect(result).not.toContain("test_add ... ok");
      expect(result).toContain("test_overflow ... FAILED");
      expect(result).toContain("test result:");
    });
  });

  describe("flutter/dart", () => {
    it("should remove passing tests (+N without -N)", () => {
      const input = [
        "00:02 +1: loading test/widget_test.dart",
        "00:02 +2: counter increments",
        "00:03 +2 -1: login fails",
        "00:05 +2 -1: Some tests failed.",
      ].join("\n");
      const result = filter(input);
      expect(result).not.toContain("loading test");
      expect(result).not.toContain("counter increments");
      expect(result).toContain("login fails");
      expect(result).toContain("Some tests failed");
    });

    it("should keep 'All tests passed' summary", () => {
      const input = "00:05 +10: All tests passed!\n";
      const result = filter(input);
      expect(result).toContain("All tests passed");
    });
  });

  describe("swift", () => {
    it("should remove passed test cases", () => {
      const input = [
        "Test Case '-[FooTests testBar]' passed (0.001 seconds)",
        "Test Case '-[FooTests testBaz]' failed (0.002 seconds)",
      ].join("\n");
      const result = filter(input);
      expect(result).not.toContain("testBar");
      expect(result).toContain("testBaz");
    });
  });

  describe("dotnet", () => {
    it("should remove Passed lines but keep Passed! summary", () => {
      const input = [
        "  Passed TestFoo",
        "  Passed TestBar",
        "Passed!  - 10 tests passed",
      ].join("\n");
      const result = filter(input);
      expect(result).not.toContain("Passed TestFoo");
      expect(result).toContain("Passed!");
    });
  });

  describe("bypass", () => {
    it("should pass through all output when OMA_TEST_FILTER=0", () => {
      const input = " ✓ should pass\n ✓ should also pass\n";
      const result = filter(input, { OMA_TEST_FILTER: "0" });
      expect(result).toContain("should pass");
      expect(result).toContain("should also pass");
    });
  });
});
