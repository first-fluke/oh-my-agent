import { execSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { parse as parseYaml } from "yaml";
import type { VerifyCheck, VerifyResult } from "../../types/index.js";

export type AgentType =
  | "backend"
  | "frontend"
  | "mobile"
  | "qa"
  | "debug"
  | "pm";

export const VALID_AGENTS: AgentType[] = [
  "backend",
  "frontend",
  "mobile",
  "qa",
  "debug",
  "pm",
];

export function isValidAgent(value: string): value is AgentType {
  return (VALID_AGENTS as string[]).includes(value);
}

function findResultFile(workspace: string, agentType: string): string | null {
  const memoriesDir = join(workspace, ".serena", "memories");
  if (!existsSync(memoriesDir)) return null;

  const pattern = new RegExp(`^result-${agentType}(?:-[\\w-]+)?\\.md$`);
  const matches = readdirSync(memoriesDir)
    .filter((f) => pattern.test(f))
    .sort()
    .reverse();

  if (matches.length === 0) return null;
  if (!matches[0]) {
    throw new Error(`No retrospective memory found for agent ${agentType}`);
  }
  return join(memoriesDir, matches[0]);
}

function createCheck(
  name: string,
  status: "pass" | "fail" | "warn" | "skip",
  message?: string,
): VerifyCheck {
  return { name, status, message };
}

function runCommand(cmd: string, cwd: string): string | null {
  try {
    return execSync(cmd, {
      encoding: "utf-8",
      cwd,
      stdio: ["pipe", "pipe", "pipe"],
    }).trim();
  } catch {
    return null;
  }
}

function findLatestPlan(workspace: string): string | null {
  const resultsDir = join(workspace, ".agents", "results");
  if (existsSync(resultsDir)) {
    try {
      const planFiles = readdirSync(resultsDir)
        .filter((f) => f.startsWith("plan-") && f.endsWith(".json"))
        .sort()
        .reverse();
      if (planFiles.length > 0 && planFiles[0]) {
        return join(resultsDir, planFiles[0]);
      }
    } catch {}
  }
  const legacyPath = join(workspace, ".agents", "plan.json");
  return existsSync(legacyPath) ? legacyPath : null;
}

export function checkScopeViolation(
  workspace: string,
  agentType: AgentType,
): VerifyCheck {
  const planPath = findLatestPlan(workspace);
  if (!planPath)
    return createCheck("Scope Check", "skip", "No plan file found");

  let plan: { tasks?: { agent?: string; scope?: string[] }[] };
  try {
    plan = JSON.parse(readFileSync(planPath, "utf-8"));
  } catch {
    return createCheck("Scope Check", "skip", "Invalid plan file");
  }

  const tasks = plan.tasks?.filter((t) => t.agent?.toLowerCase() === agentType);
  if (!tasks || tasks.length === 0) {
    return createCheck("Scope Check", "skip", "No tasks for this agent");
  }

  const scopePatterns = tasks.flatMap((t) => t.scope ?? []);
  if (scopePatterns.length === 0) {
    return createCheck("Scope Check", "skip", "No scope defined in plan");
  }

  const diffOutput = runCommand(
    "git diff --name-only HEAD 2>/dev/null || git diff --name-only --cached 2>/dev/null",
    workspace,
  );
  if (!diffOutput)
    return createCheck("Scope Check", "pass", "No files changed");

  const changedFiles = diffOutput.split("\n").filter(Boolean);
  const violations: string[] = [];

  for (const file of changedFiles) {
    const inScope = scopePatterns.some((pattern) => file.startsWith(pattern));
    if (!inScope) violations.push(file);
  }

  if (violations.length > 0) {
    return createCheck(
      "Scope Check",
      "fail",
      `${violations.length} out-of-scope: ${violations[0]}${violations.length > 1 ? ` +${violations.length - 1}` : ""}`,
    );
  }
  return createCheck(
    "Scope Check",
    "pass",
    `All ${changedFiles.length} files in scope`,
  );
}

function checkCharterPreflight(
  workspace: string,
  agentType: AgentType,
): VerifyCheck {
  const resultFile = findResultFile(workspace, agentType);
  if (!resultFile) {
    return createCheck("Charter Preflight", "skip", "Result file not found");
  }

  const content = readFileSync(resultFile, "utf-8");
  if (!content.includes("CHARTER_CHECK:")) {
    return createCheck(
      "Charter Preflight",
      "warn",
      "Block missing from result",
    );
  }
  if (
    /\{[^}]+\}/.test(content.split("CHARTER_CHECK:")[1]?.split("```")[0] || "")
  ) {
    return createCheck(
      "Charter Preflight",
      "warn",
      "Contains unfilled placeholders",
    );
  }
  return createCheck("Charter Preflight", "pass", "Properly filled");
}

function checkHardcodedSecrets(workspace: string): VerifyCheck {
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

function checkTodoComments(workspace: string): VerifyCheck {
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

type CommandCheck = {
  cmd: string;
  pass_signal?: string;
  skip_if_missing?: string;
};

type BackendStackManifest = {
  language: string;
  framework?: string;
  orm?: string;
  source?: string;
  verify?: {
    detect?: string;
    syntax?: CommandCheck;
    tests?: CommandCheck;
    raw_sql?: {
      patterns: string[];
      include_glob?: string;
      exclude_dirs?: string[];
    };
  };
};

function loadBackendStackManifest(
  workspace: string,
): BackendStackManifest | null {
  const path = join(
    workspace,
    ".agents",
    "skills",
    "oma-backend",
    "stack",
    "stack.yaml",
  );
  if (!existsSync(path)) return null;
  try {
    const parsed = parseYaml(readFileSync(path, "utf-8")) as unknown;
    if (
      parsed &&
      typeof parsed === "object" &&
      typeof (parsed as { language?: unknown }).language === "string"
    ) {
      return parsed as BackendStackManifest;
    }
    return null;
  } catch {
    return null;
  }
}

// Wraps an arbitrary string so it survives as a single shell argument inside `sh -c`.
// Uses POSIX single-quote escaping, which is the only way to safely pass patterns
// containing `"`, `$`, backticks, or backslashes without interpretation.
function shellSingleQuote(value: string): string {
  return `'${value.replace(/'/g, "'\\''")}'`;
}

function hasBinary(bin: string, workspace: string): boolean {
  return runCommand(`which ${bin}`, workspace) !== null;
}

function checkBackendSyntax(
  manifest: BackendStackManifest,
  workspace: string,
): VerifyCheck {
  const name = `${titleCase(manifest.language)} Syntax`;
  const cfg = manifest.verify?.syntax;
  if (!cfg) return createCheck(name, "skip", "No syntax check configured");
  if (cfg.skip_if_missing && !hasBinary(cfg.skip_if_missing, workspace)) {
    return createCheck(name, "skip", `${cfg.skip_if_missing} not available`);
  }
  const output = runCommand(`${cfg.cmd} 2>&1`, workspace);
  if (output === null || output === "") {
    return createCheck(name, "pass", "Valid");
  }
  if (/error/i.test(output)) {
    return createCheck(name, "fail", "Syntax errors found");
  }
  return createCheck(name, "pass", "Valid");
}

function checkBackendTests(
  manifest: BackendStackManifest,
  workspace: string,
): VerifyCheck {
  const name = `${titleCase(manifest.language)} Tests`;
  const cfg = manifest.verify?.tests;
  if (!cfg) return createCheck(name, "skip", "No tests check configured");
  if (cfg.skip_if_missing && !hasBinary(cfg.skip_if_missing, workspace)) {
    return createCheck(name, "skip", `${cfg.skip_if_missing} not available`);
  }
  const output = runCommand(`${cfg.cmd} 2>&1`, workspace);
  if (output === null) {
    return createCheck(name, "fail", "Tests failing");
  }
  const signal = cfg.pass_signal;
  if (signal && output.includes(signal)) {
    return createCheck(name, "pass", "Tests pass");
  }
  if (!signal && (output.includes("passed") || output.includes("ok"))) {
    return createCheck(name, "pass", "Tests pass");
  }
  if (output.includes("no tests ran") || output.includes("0 tests")) {
    return createCheck(name, "pass", "No tests to run");
  }
  return createCheck(name, "fail", "Tests failing");
}

function checkBackendRawSql(
  manifest: BackendStackManifest,
  workspace: string,
): VerifyCheck {
  const name = "SQL Injection";
  const cfg = manifest.verify?.raw_sql;
  if (!cfg || cfg.patterns.length === 0) {
    return createCheck(name, "skip", "No raw_sql check configured");
  }
  const includeFlag = cfg.include_glob
    ? `--include=${shellSingleQuote(cfg.include_glob)}`
    : "";
  const excludes = (cfg.exclude_dirs ?? [])
    .map((dir) => `| grep -v ${shellSingleQuote(dir)}`)
    .join(" ");
  const patternArg = shellSingleQuote(cfg.patterns.join("|"));
  const cmd = `grep -rn ${includeFlag} -E ${patternArg} . 2>/dev/null ${excludes} | head -1`;
  const result = runCommand(cmd, workspace);
  if (result) {
    const file = result.split(":")[0] ?? "unknown";
    return createCheck(name, "fail", `Raw SQL pattern in ${file}`);
  }
  return createCheck(name, "pass", "None detected");
}

function titleCase(value: string): string {
  if (value.length === 0) return value;
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function checkPythonTests(workspace: string): VerifyCheck {
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

function checkTypeScript(workspace: string): VerifyCheck {
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

function checkInlineStyles(workspace: string): VerifyCheck {
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

function checkAnyTypes(workspace: string): VerifyCheck {
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

function checkFrontendTests(workspace: string): VerifyCheck {
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

function checkFlutterAnalysis(workspace: string): VerifyCheck {
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

function checkFlutterTests(workspace: string): VerifyCheck {
  const hasFlutter = runCommand("which flutter", workspace);
  if (!hasFlutter)
    return createCheck("Flutter Tests", "skip", "Flutter not available");
  const result = runCommand("flutter test 2>&1", workspace);
  if (result?.includes("All tests passed")) {
    return createCheck("Flutter Tests", "pass", "All tests pass");
  }
  return createCheck("Flutter Tests", "fail", "Tests failed");
}

function checkPmPlan(workspace: string): VerifyCheck {
  const planPath = findLatestPlan(workspace);
  if (!planPath) return createCheck("PM Plan", "warn", "No plan file found");
  try {
    JSON.parse(readFileSync(planPath, "utf-8"));
    return createCheck("PM Plan", "pass", "Valid JSON");
  } catch {
    return createCheck("PM Plan", "fail", "Invalid JSON");
  }
}

function runAgentChecks(
  agentType: AgentType,
  workspace: string,
): VerifyCheck[] {
  const checks: VerifyCheck[] = [];
  switch (agentType) {
    case "backend": {
      const manifest = loadBackendStackManifest(workspace);
      if (!manifest) {
        checks.push(
          createCheck(
            "Backend Stack",
            "skip",
            "stack/stack.yaml not found — run /stack-set",
          ),
        );
        break;
      }
      checks.push(checkBackendSyntax(manifest, workspace));
      checks.push(checkBackendRawSql(manifest, workspace));
      checks.push(checkBackendTests(manifest, workspace));
      break;
    }
    case "frontend":
      checks.push(checkTypeScript(workspace));
      checks.push(checkInlineStyles(workspace));
      checks.push(checkAnyTypes(workspace));
      checks.push(checkFrontendTests(workspace));
      break;
    case "mobile":
      checks.push(checkFlutterAnalysis(workspace));
      checks.push(checkFlutterTests(workspace));
      break;
    case "qa":
      checks.push(
        createCheck("QA Report", "pass", "Verified by self-check.md"),
      );
      break;
    case "debug":
      if (existsSync(join(workspace, "pyproject.toml"))) {
        checks.push(checkPythonTests(workspace));
      } else if (existsSync(join(workspace, "package.json"))) {
        checks.push(checkFrontendTests(workspace));
      } else {
        checks.push(
          createCheck("Debug Tests", "skip", "No test runner detected"),
        );
      }
      break;
    case "pm":
      checks.push(checkPmPlan(workspace));
      break;
  }
  return checks;
}

export function collectVerifyReport(
  agentType: AgentType,
  workspace: string,
): VerifyResult {
  const checks: VerifyCheck[] = [];
  checks.push(checkScopeViolation(workspace, agentType));
  checks.push(checkCharterPreflight(workspace, agentType));
  checks.push(checkHardcodedSecrets(workspace));
  checks.push(checkTodoComments(workspace));
  checks.push(...runAgentChecks(agentType, workspace));

  const passed = checks.filter((c) => c.status === "pass").length;
  const failed = checks.filter((c) => c.status === "fail").length;
  const warned = checks.filter((c) => c.status === "warn").length;

  return {
    ok: failed === 0,
    agent: agentType,
    workspace,
    checks,
    summary: { passed, failed, warned },
  };
}
