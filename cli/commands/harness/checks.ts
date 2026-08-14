import { existsSync, readFileSync, realpathSync, statSync } from "node:fs";
import { assertExistingPathInside, resolveInside } from "./paths.js";
import type { HarnessCheck, HarnessCheckResult } from "./types.js";

const MAX_CHECK_FILE_BYTES = 5 * 1024 * 1024;

function readCheckedFile(workspace: string, path: string): string {
  const absolute = resolveInside(workspace, path, "Check path");
  assertExistingPathInside(workspace, absolute, "Check path");
  if (!existsSync(absolute) || !statSync(absolute).isFile()) return "";
  if (statSync(absolute).size > MAX_CHECK_FILE_BYTES) {
    throw new Error(
      `Check file exceeds ${MAX_CHECK_FILE_BYTES} bytes: ${path}`,
    );
  }
  return readFileSync(realpathSync(absolute), "utf-8");
}

function evaluateCheck(
  workspace: string,
  output: string,
  check: HarnessCheck,
): HarnessCheckResult {
  if (
    check.type === "output_contains" ||
    check.type === "output_not_contains"
  ) {
    const contains = output.includes(check.value);
    const passed = check.type === "output_contains" ? contains : !contains;
    return {
      check,
      passed,
      message: passed ? "output matched" : "output did not match",
    };
  }

  const absolute = resolveInside(workspace, check.path, "Check path");
  assertExistingPathInside(workspace, absolute, "Check path");
  const exists = existsSync(absolute);
  if (check.type === "file_exists" || check.type === "file_not_exists") {
    const passed = check.type === "file_exists" ? exists : !exists;
    return {
      check,
      passed,
      message: passed ? "file state matched" : "file state did not match",
    };
  }

  const content = readCheckedFile(workspace, check.path);
  const contains = exists && content.includes(check.value);
  const passed =
    check.type === "file_contains" ? contains : exists && !contains;
  return {
    check,
    passed,
    message: passed ? "file content matched" : "file content did not match",
  };
}

export function evaluateChecks(
  workspace: string,
  output: string,
  checks: HarnessCheck[],
): HarnessCheckResult[] {
  return checks.map((check) => evaluateCheck(workspace, output, check));
}
