import path from "node:path";
import { isDeepStrictEqual } from "node:util";
import {
  matrixFixtureHash,
  matrixInstalledTreeHash,
  preparedMatrixFiles,
} from "./suite.js";
import { parseMatrixJson } from "./suite-json.js";
import type {
  JsonValue,
  MatrixCell,
  MatrixCheck,
  MatrixRun,
  MatrixVendor,
  PreparedMatrixCase,
} from "./types.js";

function parseFinalJson(output: string): Record<string, JsonValue> | null {
  if (Buffer.byteLength(output, "utf8") > 256 * 1024) return null;
  const text = output.trim();
  const fence = /^```(?:json)?[ \t]*\r?\n([\s\S]*?)\r?\n```$/i.exec(text);
  try {
    const value = parseMatrixJson(fence?.[1] ?? text);
    if (!value || typeof value !== "object" || Array.isArray(value))
      return null;
    return value as Record<string, JsonValue>;
  } catch {
    return null;
  }
}

function normalizeContent(content: string): string {
  return content.replaceAll("\r\n", "\n").trimEnd();
}

export function gradeMatrixCase(
  prepared: PreparedMatrixCase,
  run: MatrixRun,
  vendor: MatrixVendor,
): MatrixCell {
  const checks: MatrixCheck[] = [];
  const expected = { ...prepared.testCase.expected };
  const files = preparedMatrixFiles(prepared);
  if (prepared.canary) expected[prepared.canary.field] = prepared.canary.value;
  const actual = parseFinalJson(run.output);
  const processPass =
    !run.error && run.complete && run.nativeSuccess && run.exitCode === 0;
  checks.push({
    id: "process",
    status: processPass ? "pass" : "fail",
    detail: processPass
      ? "Complete native success event and zero process exit."
      : "Native execution did not complete successfully.",
  });
  checks.push({
    id: "output",
    status: actual && isDeepStrictEqual(actual, expected) ? "pass" : "fail",
    detail:
      actual && isDeepStrictEqual(actual, expected)
        ? "Final JSON matches the exact output contract."
        : "Final response does not match the exact JSON output contract.",
  });

  const successfulRead = (relative: string): boolean => {
    const absolute = path.join(prepared.skillRoot, relative);
    const expectedContent = files[relative];
    if (expectedContent === undefined) return false;
    return run.reads.some(
      (read) =>
        read.path === absolute &&
        read.success &&
        !read.missing &&
        normalizeContent(read.content) === normalizeContent(expectedContent),
    );
  };
  const canaryRetrieved =
    prepared.canary &&
    actual?.[prepared.canary.field] === prepared.canary.value;
  const contentPass = canaryRetrieved || successfulRead("SKILL.md");
  checks.push({
    id: "content",
    status: contentPass ? "pass" : "unverifiable",
    detail: contentPass
      ? "Installed skill content retrieval is evidenced."
      : "No successful skill-content retrieval proof was observed.",
    ...(contentPass ? { proof: canaryRetrieved ? "canary" : "read" } : {}),
  });
  for (const reference of prepared.testCase.references ?? []) {
    const canaryProof = canaryRetrieved && prepared.canary?.file === reference;
    const passed = canaryProof || successfulRead(reference);
    checks.push({
      id: `reference:${reference}`,
      status: passed ? "pass" : "unverifiable",
      detail: passed
        ? "Installed reference content retrieval is evidenced."
        : "No successful matching reference-content read was observed.",
      ...(passed ? { proof: canaryProof ? "canary" : "read" } : {}),
    });
  }
  for (const missing of prepared.testCase.missing ?? []) {
    const absolute = path.join(prepared.skillRoot, missing);
    const passed = run.reads.some(
      (read) => read.path === absolute && read.missing && !read.success,
    );
    checks.push({
      id: `missing:${missing}`,
      status: passed ? "pass" : "unverifiable",
      detail: passed
        ? "A correlated read result reported the expected path as missing."
        : "No correlated not-found result for the expected path was observed.",
      ...(passed ? { proof: "read" } : {}),
    });
  }
  let unchanged = false;
  try {
    unchanged =
      matrixInstalledTreeHash(prepared.skillRoot) === matrixFixtureHash(files);
  } catch {
    // Links, missing files and non-regular files invalidate the protected tree.
  }
  checks.push({
    id: "integrity",
    status: unchanged ? "pass" : "fail",
    detail: unchanged
      ? "Installed skill files are unchanged."
      : "Installed skill files were modified, removed, added or replaced.",
  });
  const operationalError =
    Boolean(run.error) || !run.complete || run.exitCode === null;
  return {
    caseId: prepared.testCase.id,
    skill: prepared.testCase.skill,
    vendor,
    status: operationalError
      ? "error"
      : checks.some((check) => check.status === "fail")
        ? "fail"
        : checks.some((check) => check.status === "unverifiable")
          ? "unverifiable"
          : "pass",
    contentHash: prepared.contentHash,
    checks,
    nativeActivation: run.activations.some(
      (activation) =>
        activation === prepared.testCase.skill ||
        activation === prepared.skillRoot ||
        activation === path.join(prepared.skillRoot, "SKILL.md"),
    )
      ? "observed"
      : "unobserved",
    cliVersion: run.cliVersion,
    model: run.model,
    durationMs: run.durationMs,
    ...(run.costUsd !== undefined ? { costUsd: run.costUsd } : {}),
    ...(run.usage ? { usage: run.usage } : {}),
  };
}
