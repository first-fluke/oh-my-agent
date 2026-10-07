import { existsSync, readdirSync, readFileSync } from "node:fs";
import { basename, join } from "node:path";
import {
  AGENTS_DIR,
  AGENTS_RESULTS_DIR,
  agentsPathFromRoot,
} from "../../constants/paths.js";
import { TaskContractSchema } from "../../state/task-contract.js";
import type { VerifyCheck } from "../../types/index.js";
import { checkClosure } from "../../utils/skill-outputs.js";
import type { AgentType } from "./agent-types.js";
import { createCheck, runCommand } from "./check-utils.js";
import {
  findResultFile,
  resolveVerifySelection,
  type VerifySelection,
} from "./run-selection.js";

export const TEST_APPROACHES = ["tdd", "test_after", "not_applicable"] as const;
export type TestApproach = (typeof TEST_APPROACHES)[number];

export interface PlanTask {
  required_checks?: unknown;
  id?: string;
  agent?: string;
  scope?: string[];
  test_approach?: string;
  test_scope?: string[];
  tdd_evidence_required?: boolean;
  test_approach_rationale?: string;
  alternative_verification?: string;
}

export function findLatestPlan(
  workspace: string,
  selection: VerifySelection = {},
): string | null {
  workspace = selection.artifactRoot ?? workspace;
  const resultsDir = agentsPathFromRoot(workspace, AGENTS_RESULTS_DIR);
  if (selection.sessionId) {
    const file = join(resultsDir, `plan-${selection.sessionId}.json`);
    return existsSync(file) ? file : null;
  }
  if (existsSync(resultsDir)) {
    const planFiles = readdirSync(resultsDir).filter(
      (f) => f.startsWith("plan-") && f.endsWith(".json"),
    );
    if (planFiles.length > 1)
      throw new Error("Multiple plans found; supply --session-id or --run-id");
    if (planFiles[0]) return join(resultsDir, planFiles[0]);
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
  selection: VerifySelection = {},
): VerifyCheck {
  let planPath: string | null;
  try {
    planPath = findLatestPlan(workspace, selection);
  } catch (error) {
    return createCheck("Scope Check", "fail", (error as Error).message);
  }
  if (!planPath)
    return createCheck("Scope Check", "skip", "No plan file found");

  let plan: { tasks?: { id?: string; agent?: string; scope?: string[] }[] };
  try {
    plan = JSON.parse(readFileSync(planPath, "utf-8"));
  } catch {
    return createCheck("Scope Check", "skip", "Invalid plan file");
  }

  const tasks = plan.tasks?.filter(
    (t) =>
      t.agent?.toLowerCase() === agentType &&
      (!selection.taskId || t.id === selection.taskId),
  );
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
  selection: VerifySelection = {},
): VerifyCheck {
  let resultFile: string | null;
  try {
    resultFile = findResultFile(
      workspace,
      agentType,
      selection,
      !selection.sessionId && !selection.runId,
    );
  } catch {
    return createCheck(
      "Charter Preflight",
      "skip",
      "Select a task/run for per-run preflight",
    );
  }
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

/**
 * Contract validation for the opt-in per-task test strategy (issue #671).
 * `test_approach` is optional; when present it must be a known value,
 * `not_applicable` must carry a rationale plus an alternative verification
 * method, and refactor tasks keep their characterization-test model instead
 * of TDD. Approach selection never waives project-defined coverage requirements.
 */
export function validateTestApproach(tasks: PlanTask[]): string[] {
  const errors: string[] = [];
  tasks.forEach((task, index) => {
    const id = task.id || `tasks[${index}]`;
    const approach = task.test_approach;
    if (approach === undefined || approach === "") return;
    if (!(TEST_APPROACHES as readonly string[]).includes(approach)) {
      errors.push(
        `${id}: invalid test_approach "${approach}" (expected ${TEST_APPROACHES.join("|")})`,
      );
      return;
    }
    if (approach === "tdd" && task.agent?.toLowerCase() === "refactor") {
      errors.push(
        `${id}: refactor tasks keep characterization tests; test_approach must not be "tdd"`,
      );
    }
    if (approach === "not_applicable") {
      if (!task.test_approach_rationale?.trim()) {
        errors.push(`${id}: not_applicable requires test_approach_rationale`);
      }
      if (!task.alternative_verification?.trim()) {
        errors.push(`${id}: not_applicable requires alternative_verification`);
      }
    }
  });
  return errors;
}

export function checkPmPlan(
  workspace: string,
  selection: VerifySelection = {},
): VerifyCheck {
  let planPath: string | null;
  try {
    planPath = findLatestPlan(workspace, selection);
  } catch (error) {
    return createCheck("PM Plan", "fail", (error as Error).message);
  }
  if (!planPath) return createCheck("PM Plan", "warn", "No plan file found");
  let plan: { tasks?: PlanTask[] };
  try {
    plan = JSON.parse(readFileSync(planPath, "utf-8"));
  } catch {
    return createCheck("PM Plan", "fail", "Invalid JSON");
  }
  const errors = validateTestApproach(plan.tasks ?? []);
  for (const task of plan.tasks ?? []) {
    if (task.required_checks === undefined) continue;
    const contract = TaskContractSchema.safeParse(task);
    if (!contract.success)
      errors.push(
        `acceptance contract for ${task.id ?? "unknown task"}: ${contract.error.issues[0]?.message}`,
      );
  }
  if (errors.length > 0) {
    return createCheck(
      "PM Plan",
      "fail",
      `test_approach contract: ${errors[0]}${errors.length > 1 ? ` (+${errors.length - 1} more)` : ""}`,
    );
  }
  return createCheck("PM Plan", "pass", "Valid JSON");
}

/**
 * For tasks marked `test_approach: "tdd"` (unless the task opts out via
 * `tdd_evidence_required: false`), the agent's result file must contain a
 * `TDD_EVIDENCE:` block naming each task id with RED and GREEN entries.
 * Tasks with `test_after` / `not_applicable` are intentionally not checked.
 */
export function checkTddEvidence(
  workspace: string,
  agentType: string,
  identity: VerifySelection = {},
): VerifyCheck {
  let selection: VerifySelection;
  let planPath: string | null;
  try {
    selection = resolveVerifySelection(workspace, agentType, identity);
    if (selection.taskId && !selection.sessionId)
      throw new Error("--task-id requires --session-id or --run-id");
    planPath = findLatestPlan(workspace, selection);
  } catch (error) {
    return createCheck("TDD Evidence", "fail", (error as Error).message);
  }
  if (!planPath)
    return createCheck(
      "TDD Evidence",
      selection.sessionId ? "fail" : "skip",
      "No plan file found",
    );

  let plan: { tasks?: PlanTask[] };
  try {
    plan = JSON.parse(readFileSync(planPath, "utf-8"));
  } catch {
    return createCheck("TDD Evidence", "fail", "Invalid plan file");
  }

  if (
    selection.taskId &&
    !(plan.tasks ?? []).some(
      (task) =>
        task.id === selection.taskId && task.agent?.toLowerCase() === agentType,
    )
  )
    return createCheck(
      "TDD Evidence",
      "fail",
      `No ${agentType} task ${selection.taskId} in the selected plan`,
    );
  const tddTasks = (plan.tasks ?? []).filter(
    (t) =>
      t.agent?.toLowerCase() === agentType &&
      (!selection.taskId || t.id === selection.taskId) &&
      t.test_approach === "tdd" &&
      t.tdd_evidence_required !== false,
  );
  if (tddTasks.length === 0) {
    return createCheck("TDD Evidence", "skip", "No tdd tasks for this agent");
  }

  const sessionId =
    selection.sessionId ??
    (basename(planPath).startsWith("plan-")
      ? basename(planPath, ".json").slice(5)
      : undefined);
  for (const task of tddTasks) {
    let resultFile: string | null;
    try {
      resultFile = findResultFile(
        workspace,
        agentType,
        { ...selection, sessionId, taskId: task.id },
        basename(planPath) === "plan.json" &&
          !identity.sessionId &&
          !identity.runId,
      );
    } catch (error) {
      return createCheck("TDD Evidence", "fail", (error as Error).message);
    }
    if (!resultFile)
      return createCheck(
        "TDD Evidence",
        "fail",
        `No result file for ${task.id ?? "tdd task"}`,
      );
    const content = readFileSync(resultFile, "utf-8");
    const markerIndex = content.indexOf("TDD_EVIDENCE:");
    if (markerIndex === -1)
      return createCheck(
        "TDD Evidence",
        "fail",
        `TDD_EVIDENCE block missing for ${task.id}`,
      );
    const entries = content
      .slice(markerIndex)
      .split(/(?=^[ \t]*-[ \t]*task[ \t]*[:=])/m);
    const evidence = entries.find((entry) => {
      const id = entry.match(
        /^[ \t]*-[ \t]*task[ \t]*[:=][ \t]*["']?([^\s"']+)["']?[ \t]*\r?$/m,
      )?.[1];
      return id === task.id;
    });
    if (!evidence)
      return createCheck("TDD Evidence", "fail", `No evidence for: ${task.id}`);
    const entryLines = evidence.trimStart().split(/\r?\n/).slice(1);
    const boundary = entryLines.findIndex(
      (line) => line.trim() && !/^[ \t]+/.test(line),
    );
    const fields = (
      boundary === -1 ? entryLines : entryLines.slice(0, boundary)
    ).join("\n");
    const hasRed = /^[ \t]+red[ \t]*[:=][ \t]*\S/im.test(fields);
    const hasGreen = /^[ \t]+green[ \t]*[:=][ \t]*\S/im.test(fields);
    if (!hasRed || !hasGreen)
      return createCheck(
        "TDD Evidence",
        "fail",
        `Evidence incomplete for ${task.id}: missing ${[!hasRed && "RED", !hasGreen && "GREEN"].filter(Boolean).join(" and ")} entry`,
      );
  }

  return createCheck(
    "TDD Evidence",
    "pass",
    `RED/GREEN evidence present for ${tddTasks.length} tdd task(s)`,
  );
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
