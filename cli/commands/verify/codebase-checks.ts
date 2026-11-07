import {
  type Dirent,
  existsSync,
  readdirSync,
  readFileSync,
  statSync,
} from "node:fs";
import { createRequire } from "node:module";
import { join, relative, resolve, sep } from "node:path";
import type { VerifyCheck } from "../../types/index.js";
import {
  checkCommandResult,
  createCheck,
  findBinary,
  runCheckCommand,
} from "./check-utils.js";

export function checkHardcodedSecrets(workspace: string): VerifyCheck {
  const excludedDirectories = new Set([
    ".git",
    "node_modules",
    "test",
    "tests",
    "__tests__",
    "example",
    "examples",
  ]);
  const secretPattern =
    /(?:^|[\s;,.({[])[\w$]*(?:password|secret|api_key|token)\s*=\s*(['"])[^'"\r\n]{8,}\1/;
  const pending = [workspace];

  try {
    while (pending.length > 0) {
      const directory = pending.pop() as string;
      for (const entry of readdirSync(directory, { withFileTypes: true })) {
        const path = join(directory, entry.name);
        if (entry.isDirectory()) {
          if (!excludedDirectories.has(entry.name)) pending.push(path);
          continue;
        }
        // Match fixture names, not substrings in production paths or values.
        if (
          !entry.isFile() ||
          !/\.(py|ts|tsx|js|dart)$/.test(entry.name) ||
          /(?:^|[._-])(?:test|spec|example)(?:[._-]|$)/.test(entry.name)
        ) {
          continue;
        }
        if (secretPattern.test(readFileSync(path, "utf8"))) {
          return createCheck(
            "Hardcoded Secrets",
            "fail",
            `Found in: ${relative(workspace, path)}`,
          );
        }
      }
    }
  } catch (error) {
    return createCheck(
      "Hardcoded Secrets",
      "fail",
      `Could not scan source files: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
  return createCheck("Hardcoded Secrets", "pass", "None detected");
}

/**
 * In-process line counting replacing the old POSIX `grep -rn ... | grep -v ...
 * | wc -l` pipelines, which silently no-oped on Windows (no grep → null → 0 →
 * false "pass"). Walks the workspace, keeps the grep --include extension
 * filter, and applies exclude terms with grep -v semantics (matched against
 * the whole path:line:content output line). Unreadable/binary files and
 * symlinks are skipped; node_modules/.git are never descended into.
 */
function countSourceMatches(
  workspace: string,
  extensions: string[],
  pattern: RegExp,
  excludeTerms: string[],
): number {
  let count = 0;
  const walk = (dir: string): void => {
    let entries: Dirent[];
    try {
      entries = readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      const full = join(dir, entry.name);
      if (entry.isDirectory()) {
        if (entry.name === "node_modules" || entry.name === ".git") continue;
        walk(full);
      } else if (entry.isFile()) {
        if (!extensions.some((ext) => entry.name.endsWith(ext))) continue;
        let content: string;
        try {
          if (statSync(full).size > 5 * 1024 * 1024) continue;
          content = readFileSync(full, "utf-8");
        } catch {
          continue;
        }
        const rel = `./${relative(workspace, full).split(sep).join("/")}`;
        const lines = content.split("\n");
        for (let i = 0; i < lines.length; i++) {
          const text = lines[i] ?? "";
          if (!pattern.test(text)) continue;
          const grepLine = `${rel}:${i + 1}:${text}`;
          if (excludeTerms.some((term) => grepLine.includes(term))) continue;
          count++;
        }
      }
    }
  };
  walk(workspace);
  return count;
}

export function checkTodoComments(workspace: string): VerifyCheck {
  const count = countSourceMatches(
    workspace,
    [".py", ".ts", ".tsx", ".js", ".dart"],
    /TODO|FIXME|HACK|XXX/,
    [".agents/"],
  );
  if (count > 0) {
    return createCheck("TODO/FIXME Comments", "warn", `${count} found`);
  }
  return createCheck("TODO/FIXME Comments", "pass", "None found");
}

export function checkPythonTests(workspace: string): VerifyCheck {
  const hasUv = findBinary("uv") !== null;
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
  const count = countSourceMatches(
    workspace,
    [".tsx", ".jsx"],
    /style=\{\{/,
    [],
  );
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
  const count = countSourceMatches(workspace, [".ts", ".tsx"], /: any/, [
    ".d.ts",
  ]);
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
  const hasFlutter = findBinary("flutter") !== null;
  if (!hasFlutter) {
    const hasDart = findBinary("dart") !== null;
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
  const hasFlutter = findBinary("flutter") !== null;
  if (!hasFlutter)
    return createCheck("Flutter Tests", "skip", "Flutter not available");
  return checkCommandResult(
    "Flutter Tests",
    runCheckCommand("flutter", ["test"], workspace),
    "All tests pass",
    "Tests failed",
  );
}
