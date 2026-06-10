import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import {
  AGENTS_DIR,
  AGENTS_RESULTS_DIR,
  agentsPathFromRoot,
} from "../../../constants/paths.js";
import type { VerifyCheck } from "../../../types/index.js";
import { checkClosure } from "../../../utils/skill-outputs.js";
import type { AgentType } from "./agent-types.js";
import { createCheck, runCommand } from "./check-utils.js";

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

export function findLatestPlan(workspace: string): string | null {
  const resultsDir = agentsPathFromRoot(workspace, AGENTS_RESULTS_DIR);
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
  const legacyPath = join(
    agentsPathFromRoot(workspace, AGENTS_DIR),
    "plan.json",
  );
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

export function checkCharterPreflight(
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

export function checkPmPlan(workspace: string): VerifyCheck {
  const planPath = findLatestPlan(workspace);
  if (!planPath) return createCheck("PM Plan", "warn", "No plan file found");
  try {
    JSON.parse(readFileSync(planPath, "utf-8"));
    return createCheck("PM Plan", "pass", "Valid JSON");
  } catch {
    return createCheck("PM Plan", "fail", "Invalid JSON");
  }
}

export function checkDeclaredOutputs(
  workspace: string,
  agentType: string,
): VerifyCheck {
  const result = checkClosure(workspace, agentType);
  if (!result.hasStructuredOutputs) {
    return createCheck(
      "Declared outputs",
      "skip",
      "No structured outputs block",
    );
  }
  if (result.missingRequired.length === 0) {
    return createCheck(
      "Declared outputs",
      "pass",
      `${result.declared.length} declared, all required artifacts present`,
    );
  }
  const missing = result.missingRequired
    .map((d) => `${d.name} (${d.artifact})`)
    .join(", ");
  return createCheck(
    "Declared outputs",
    "fail",
    `Missing required: ${missing}`,
  );
}
