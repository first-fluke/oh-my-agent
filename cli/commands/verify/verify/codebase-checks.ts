import { existsSync } from "node:fs";
import { join } from "node:path";
import type { VerifyCheck } from "../../../types/index.js";
import { createCheck, runCommand } from "./check-utils.js";

export function checkHardcodedSecrets(workspace: string): VerifyCheck {
  const patterns = ["*.py", "*.ts", "*.tsx", "*.js", "*.dart"];
  const secretPattern =
    "(password|secret|api_key|token)\\s*=\\s*['\"][^'\"]{8,}";

  for (const pattern of patterns) {
    const result = runCommand(
      `grep -rn --include="${pattern}" -E "${secretPattern}" . 2>/dev/null | grep -v test | grep -v example | grep -v node_modules | head -1`,
      workspace,
    );
    if (result) {
      return createCheck(
        "Hardcoded Secrets",
        "fail",
        `Found in: ${result.split(":")[0]}`,
      );
    }
  }
  return createCheck("Hardcoded Secrets", "pass", "None detected");
}

export function checkTodoComments(workspace: string): VerifyCheck {
  const result = runCommand(
    `grep -rn --include="*.py" --include="*.ts" --include="*.tsx" --include="*.js" --include="*.dart" -E "TODO|FIXME|HACK|XXX" . 2>/dev/null | grep -v node_modules | grep -v ".agents/" | wc -l`,
    workspace,
  );
  const count = Number.parseInt(result || "0", 10);
  if (count > 0) {
    return createCheck("TODO/FIXME Comments", "warn", `${count} found`);
  }
  return createCheck("TODO/FIXME Comments", "pass", "None found");
}

export function checkPythonTests(workspace: string): VerifyCheck {
  const hasUv = runCommand("which uv", workspace);
  const hasPyproject = existsSync(join(workspace, "pyproject.toml"));
  if (!hasUv || !hasPyproject) {
    return createCheck(
      "Python Tests",
      "skip",
      !hasUv ? "uv not available" : "pyproject.toml not found",
    );
  }
  const result = runCommand("uv run pytest -q --tb=no 2>&1", workspace);
  if (result?.includes("passed") || result?.includes("no tests ran")) {
    return createCheck("Python Tests", "pass", "Tests pass");
  }
  return createCheck("Python Tests", "fail", "Tests failing");
}

export function checkTypeScript(workspace: string): VerifyCheck {
  if (!existsSync(join(workspace, "tsconfig.json"))) {
    return createCheck("TypeScript", "skip", "Not configured");
  }
  const result = runCommand("npx tsc --noEmit 2>&1", workspace);
  if (result === null || result === "") {
    return createCheck("TypeScript", "pass", "Compilation clean");
  }
  if (result.includes("error")) {
    return createCheck("TypeScript", "fail", "Type errors found");
  }
  return createCheck("TypeScript", "pass", "Compilation clean");
}

export function checkInlineStyles(workspace: string): VerifyCheck {
  const result = runCommand(
    `grep -rn --include="*.tsx" --include="*.jsx" 'style={{' . 2>/dev/null | grep -v node_modules | wc -l`,
    workspace,
  );
  const count = Number.parseInt(result || "0", 10);
  if (count > 0) {
    return createCheck(
      "Inline Styles",
      "warn",
      `${count} found (prefer Tailwind)`,
    );
  }
  return createCheck("Inline Styles", "pass", "None found");
}

export function checkAnyTypes(workspace: string): VerifyCheck {
  const result = runCommand(
    `grep -rn --include="*.ts" --include="*.tsx" ': any' . 2>/dev/null | grep -v node_modules | grep -v ".d.ts" | wc -l`,
    workspace,
  );
  const count = Number.parseInt(result || "0", 10);
  if (count > 3)
    return createCheck("Any Types", "fail", `${count} found (limit: 3)`);
  if (count > 0) return createCheck("Any Types", "warn", `${count} found`);
  return createCheck("Any Types", "pass", "None found");
}

export function checkFrontendTests(workspace: string): VerifyCheck {
  if (!existsSync(join(workspace, "package.json"))) {
    return createCheck("Frontend Tests", "skip", "No package.json");
  }
  const result = runCommand(
    "npx vitest run --reporter=verbose 2>&1",
    workspace,
  );
  if (result?.includes("passed") || result?.includes("✓")) {
    return createCheck("Frontend Tests", "pass", "Tests pass");
  }
  return createCheck(
    "Frontend Tests",
    "warn",
    "Tests failed or vitest not configured",
  );
}

export function checkFlutterAnalysis(workspace: string): VerifyCheck {
  const hasFlutter = runCommand("which flutter", workspace);
  if (!hasFlutter) {
    const hasDart = runCommand("which dart", workspace);
    if (!hasDart) {
      return createCheck("Flutter/Dart Analysis", "skip", "Not available");
    }
    const result = runCommand("dart analyze 2>&1", workspace);
    if (result?.includes("No issues found")) {
      return createCheck("Dart Analysis", "pass", "Clean");
    }
    return createCheck("Dart Analysis", "fail", "Issues found");
  }
  const result = runCommand("flutter analyze 2>&1", workspace);
  if (result?.includes("No issues found")) {
    return createCheck("Flutter Analysis", "pass", "Clean");
  }
  return createCheck("Flutter Analysis", "fail", "Issues found");
}

export function checkFlutterTests(workspace: string): VerifyCheck {
  const hasFlutter = runCommand("which flutter", workspace);
  if (!hasFlutter)
    return createCheck("Flutter Tests", "skip", "Flutter not available");
  const result = runCommand("flutter test 2>&1", workspace);
  if (result?.includes("All tests passed")) {
    return createCheck("Flutter Tests", "pass", "All tests pass");
  }
  return createCheck("Flutter Tests", "fail", "Tests failed");
}
