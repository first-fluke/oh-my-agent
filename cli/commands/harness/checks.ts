import { existsSync, readFileSync, realpathSync, statSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { isDeepStrictEqual } from "node:util";
import { sha256Hex } from "../../utils/hash.js";
import { assertExistingPathInside, resolveInside } from "./paths.js";
import {
  evaluateTrustedCommand,
  type TrustedCheckers,
} from "./trusted-checks.js";
import type { HarnessCheck, HarnessCheckResult } from "./types.js";

export const checksImplementationHash = sha256Hex(
  readFileSync(fileURLToPath(import.meta.url)),
);

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
  trustedCheckers?: TrustedCheckers,
): HarnessCheckResult {
  if (check.type === "command") {
    return evaluateTrustedCommand(
      workspace,
      check,
      trustedCheckers?.get(JSON.stringify(check)),
    );
  }
  if (
    check.type === "file_json_equals" ||
    check.type === "output_json_equals"
  ) {
    try {
      let actual: unknown = JSON.parse(
        check.type === "output_json_equals"
          ? output
          : readCheckedFile(workspace, check.path),
      );
      for (const part of (check.pointer ?? "").split("/").slice(1)) {
        const key = part.replaceAll("~1", "/").replaceAll("~0", "~");
        if (
          actual === null ||
          typeof actual !== "object" ||
          !Object.hasOwn(actual, key)
        ) {
          return { check, passed: false, message: "JSON pointer is missing" };
        }
        actual = (actual as Record<string, unknown>)[key];
      }
      const passed = isDeepStrictEqual(actual, check.value);
      return {
        check,
        passed,
        message: passed ? "JSON state matched" : "JSON state did not match",
      };
    } catch (error) {
      return {
        check,
        passed: false,
        message: `JSON check failed: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  }
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
  trustedCheckers?: TrustedCheckers,
): HarnessCheckResult[] {
  return checks.map((check) =>
    evaluateCheck(workspace, output, check, trustedCheckers),
  );
}
