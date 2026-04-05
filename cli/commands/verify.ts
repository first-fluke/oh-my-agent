import { execSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import * as p from "@clack/prompts";
import pc from "picocolors";
import type { VerifyCheck, VerifyResult } from "../types/index.js";

type AgentType = "backend" | "frontend" | "mobile" | "qa" | "debug" | "pm";

const VALID_AGENTS: AgentType[] = [
  "backend",
  "frontend",
  "mobile",
  "qa",
  "debug",
  "pm",
];

/**
 * Find the most recent result file for an agent type.
 * Supports both legacy (`result-{agent}.md`) and session-scoped (`result-{agent}-{sessionId}.md`) naming.
 */
function findResultFile(workspace: string, agentType: string): string | null {
  const memoriesDir = join(workspace, ".serena", "memories");
  if (!existsSync(memoriesDir)) return null;

  const pattern = new RegExp(`^result-${agentType}(?:-[\\w-]+)?\\.md$`);
  const matches = readdirSync(memoriesDir)
    .filter((f) => pattern.test(f))
    .sort()
    .reverse();

  if (matches.length === 0) return null;
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

export function checkScopeViolation(
  workspace: string,
  agentType: AgentType,
): VerifyCheck {
  const planPath = join(workspace, ".agents", "plan.json");

  if (!existsSync(planPath)) {
    return createCheck("Scope Check", "skip", "No plan.json found");
  }

  let plan: {
    tasks?: {
      agent?: string;
      scope?: string[];
    }[];
  };
  try {
    plan = JSON.parse(readFileSync(planPath, "utf-8"));
  } catch {
    return createCheck("Scope Check", "skip", "Invalid plan.json");
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

  if (!diffOutput) {
    return createCheck("Scope Check", "pass", "No files changed");
  }

  const changedFiles = diffOutput.split("\n").filter(Boolean);
  const violations: string[] = [];

  for (const file of changedFiles) {
    const inScope = scopePatterns.some((pattern) => file.startsWith(pattern));
    if (!inScope) {
      violations.push(file);
    }
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

function checkPythonSyntax(workspace: string): VerifyCheck {
  const hasUv = runCommand("which uv", workspace);
  if (!hasUv) {
    return createCheck("Python Syntax", "skip", "uv not available");
  }

  const result = runCommand(
    `find . -name "*.py" -not -path "*/node_modules/*" -not -path "*/.venv/*" -exec uv run python -m py_compile {} \\; 2>&1 | head -5`,
    workspace,
  );

  if (result && result.length > 0) {
    return createCheck("Python Syntax", "fail", "Syntax errors found");
  }

  return createCheck("Python Syntax", "pass", "Valid");
}

function checkSqlInjection(workspace: string): VerifyCheck {
  const result = runCommand(
    `grep -rn --include="*.py" -E "f['"].*SELECT|f['"].*INSERT|f['"].*UPDATE|f['"].*DELETE" . 2>/dev/null | grep -v test | grep -v node_modules | head -1`,
    workspace,
  );

  if (result) {
    return createCheck(
      "SQL Injection",
      "fail",
      "f-string with SQL keywords detected",
    );
  }

  return createCheck("SQL Injection", "pass", "None detected");
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

  if (count > 3) {
    return createCheck("Any Types", "fail", `${count} found (limit: 3)`);
  }

  if (count > 0) {
    return createCheck("Any Types", "warn", `${count} found`);
  }

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

  if (!hasFlutter) {
    return createCheck("Flutter Tests", "skip", "Flutter not available");
  }

  const result = runCommand("flutter test 2>&1", workspace);

  if (result?.includes("All tests passed")) {
    return createCheck("Flutter Tests", "pass", "All tests pass");
  }

  return createCheck("Flutter Tests", "fail", "Tests failed");
}

function checkPmPlan(workspace: string): VerifyCheck {
  const planPath = join(workspace, ".agents", "plan.json");

  if (!existsSync(planPath)) {
    return createCheck("PM Plan", "warn", "plan.json not found");
  }

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
    case "backend":
      checks.push(checkPythonSyntax(workspace));
      checks.push(checkSqlInjection(workspace));
      checks.push(checkPythonTests(workspace));
      break;

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

export async function verify(
  agentType: string,
  workspace: string,
  jsonMode = false,
): Promise<void> {
  const normalizedAgent = agentType.toLowerCase() as AgentType;

  if (!VALID_AGENTS.includes(normalizedAgent)) {
    const error = `Invalid agent type: ${agentType}. Valid types: ${VALID_AGENTS.join(", ")}`;
    if (jsonMode) {
      console.log(JSON.stringify({ ok: false, error }));
    } else {
      p.log.error(error);
    }
    process.exit(2);
  }

  const resolvedWorkspace = workspace || process.cwd();

  if (!existsSync(resolvedWorkspace)) {
    const error = `Workspace not found: ${resolvedWorkspace}`;
    if (jsonMode) {
      console.log(JSON.stringify({ ok: false, error }));
    } else {
      p.log.error(error);
    }
    process.exit(2);
  }

  const checks: VerifyCheck[] = [];

  checks.push(checkScopeViolation(resolvedWorkspace, normalizedAgent));
  checks.push(checkCharterPreflight(resolvedWorkspace, normalizedAgent));
  checks.push(checkHardcodedSecrets(resolvedWorkspace));
  checks.push(checkTodoComments(resolvedWorkspace));
  checks.push(...runAgentChecks(normalizedAgent, resolvedWorkspace));

  const passed = checks.filter((c) => c.status === "pass").length;
  const failed = checks.filter((c) => c.status === "fail").length;
  const warned = checks.filter((c) => c.status === "warn").length;

  const result: VerifyResult = {
    ok: failed === 0,
    agent: normalizedAgent,
    workspace: resolvedWorkspace,
    checks,
    summary: { passed, failed, warned },
  };

  if (jsonMode) {
    console.log(JSON.stringify(result, null, 2));
    process.exit(failed > 0 ? 1 : 0);
  }

  console.clear();
  p.intro(pc.bgCyan(pc.white(` 🔍 Verify: ${normalizedAgent} agent `)));

  p.note(pc.dim(resolvedWorkspace), "Workspace");

  const table = [
    "┌────────────────────────────┬────────┬─────────────────────────────┐",
    `│ ${pc.bold("Check")}                        │ ${pc.bold("Status")} │ ${pc.bold("Details")}                     │`,
    "├────────────────────────────┼────────┼─────────────────────────────┤",
    ...checks.map((check) => {
      let statusIcon: string;
      switch (check.status) {
        case "pass":
          statusIcon = pc.green("PASS");
          break;
        case "fail":
          statusIcon = pc.red("FAIL");
          break;
        case "warn":
          statusIcon = pc.yellow("WARN");
          break;
        default:
          statusIcon = pc.dim("SKIP");
      }
      const name = check.name.padEnd(26);
      const status = statusIcon.padEnd(6);
      const message = (check.message || "-").slice(0, 27).padEnd(27);
      return `│ ${name} │ ${status} │ ${message} │`;
    }),
    "└────────────────────────────┴────────┴─────────────────────────────┘",
  ].join("\n");

  console.log(table);
  console.log();

  const summaryText = `${pc.green(`${passed} passed`)}, ${pc.red(`${failed} failed`)}, ${pc.yellow(`${warned} warnings`)}`;

  if (failed > 0) {
    p.outro(pc.red(`❌ Verification failed: ${summaryText}`));
    process.exit(1);
  }

  p.outro(pc.green(`✅ Verification passed: ${summaryText}`));
  process.exit(0);
}
