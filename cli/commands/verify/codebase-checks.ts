import { existsSync, readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { join, resolve } from "node:path";
import type { VerifyCheck } from "../../types/index.js";
import {
  checkCommandResult,
  createCheck,
  runCheckCommand,
  runCommand,
} from "./check-utils.js";

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
  return checkCommandResult(
    "Python Tests",
    runCheckCommand("uv", ["run", "pytest", "-q", "--tb=no"], workspace),
    "Tests pass",
    "Tests failed",
  );
}

export function checkTypeScript(workspace: string): VerifyCheck {
  if (!existsSync(join(workspace, "tsconfig.json"))) {
    return createCheck("TypeScript", "skip", "Not configured");
  }
  return checkCommandResult(
    "TypeScript",
    runCheckCommand("npx", ["--no-install", "tsc", "--noEmit"], workspace),
    "Type check clean",
    "Type check failed",
  );
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
  try {
    if (!hasVitest(workspace)) {
      return createCheck("Frontend Tests", "skip", "Vitest not configured");
    }
  } catch {
    return createCheck("Frontend Tests", "fail", "Could not read package.json");
  }
  return checkCommandResult(
    "Frontend Tests",
    runCheckCommand(
      "npx",
      ["--no-install", "vitest", "run", "--reporter=verbose"],
      workspace,
    ),
    "Tests pass",
    "Tests failed",
  );
}

function hasVitest(workspace: string): boolean {
  const packagePath = join(workspace, "package.json");
  const pkg = JSON.parse(readFileSync(packagePath, "utf8"));
  if (
    pkg?.dependencies?.vitest ||
    pkg?.devDependencies?.vitest ||
    Object.values(pkg?.scripts ?? {}).some(
      (script) => typeof script === "string" && /\bvitest\b/.test(script),
    )
  )
    return true;
  if (
    ["ts", "mts", "cts", "js", "mjs", "cjs"].some((ext) =>
      existsSync(join(workspace, `vitest.config.${ext}`)),
    )
  )
    return true;
  try {
    createRequire(resolve(packagePath)).resolve("vitest/package.json");
    return true;
  } catch {
    return false;
  }
}

export function checkFlutterAnalysis(workspace: string): VerifyCheck {
  const hasFlutter = runCommand("which flutter", workspace);
  if (!hasFlutter) {
    const hasDart = runCommand("which dart", workspace);
    if (!hasDart) {
      return createCheck("Flutter/Dart Analysis", "skip", "Not available");
    }
    return checkCommandResult(
      "Dart Analysis",
      runCheckCommand("dart", ["analyze"], workspace),
      "Clean",
      "Analysis failed",
    );
  }
  return checkCommandResult(
    "Flutter Analysis",
    runCheckCommand("flutter", ["analyze"], workspace),
    "Clean",
    "Analysis failed",
  );
}

export function checkFlutterTests(workspace: string): VerifyCheck {
  const hasFlutter = runCommand("which flutter", workspace);
  if (!hasFlutter)
    return createCheck("Flutter Tests", "skip", "Flutter not available");
  return checkCommandResult(
    "Flutter Tests",
    runCheckCommand("flutter", ["test"], workspace),
    "All tests pass",
    "Tests failed",
  );
}
