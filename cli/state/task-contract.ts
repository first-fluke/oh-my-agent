import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { z } from "zod";
import {
  type RequiredDecision,
  RequiredDecisionSchema,
} from "./agent-decisions.js";
import { atomicWriteJson } from "./events.js";

const text = z.string().trim().min(1);
const relativePath = text.refine(
  (value) =>
    !/^(?:\/|\\|[a-z]:)/i.test(value) &&
    !value.split(/[\\/]/).includes("..") &&
    !/[\0*?[\]{}]/.test(value),
  "Use a project-relative file or directory, without traversal or globs",
);
export const RequiredCheckSchema = z.object({
  id: text,
  criteria: z.array(text).min(1),
  command: z
    .array(z.string())
    .min(1)
    .refine((argv) => Boolean(argv[0]?.trim()), "Executable is required"),
  cwd: relativePath.default("."),
});
export const RequiredDecisionsSchema = z
  .array(RequiredDecisionSchema)
  .refine(
    (decisions) =>
      new Set(decisions.map((decision) => decision.subject)).size ===
      decisions.length,
    "Required decision subjects must be unique",
  );
export const TaskContractSchema = z
  .object({
    id: text,
    goal_id: text.optional(),
    acceptance_criteria: z
      .array(z.object({ id: text, description: text }))
      .min(1),
    required_checks: z.array(RequiredCheckSchema).min(1),
    required_decisions: RequiredDecisionsSchema.optional(),
    inputs: z.array(relativePath).min(1).optional(),
    dependencies: z.array(text).default([]),
    retry_policy: z.enum(["safe", "manual"]).default("manual"),
  })
  .superRefine((task, ctx) => {
    const criteria = new Set(
      task.acceptance_criteria.map((criterion) => criterion.id),
    );
    const checks = new Set(task.required_checks.map((check) => check.id));
    const commands = new Set(
      task.required_checks.map((check) =>
        JSON.stringify([check.command, check.cwd]),
      ),
    );
    const covered = new Set(
      task.required_checks.flatMap((check) => check.criteria),
    );
    if (
      criteria.size !== task.acceptance_criteria.length ||
      checks.size !== task.required_checks.length
    )
      ctx.addIssue({
        code: "custom",
        message: "Criterion and check IDs must be unique",
      });
    if (commands.size !== task.required_checks.length)
      ctx.addIssue({
        code: "custom",
        message:
          "Use one check with multiple criteria for an identical command and cwd",
      });
    if (
      [...covered].some((id) => !criteria.has(id)) ||
      [...criteria].some((id) => !covered.has(id))
    )
      ctx.addIssue({
        code: "custom",
        message:
          "Every acceptance criterion needs a declared check; references must exist",
      });
    if (
      task.dependencies.includes(task.id) ||
      new Set(task.dependencies).size !== task.dependencies.length
    )
      ctx.addIssue({
        code: "custom",
        message:
          "Task dependencies must be unique and cannot include the task itself",
      });
  });
export type TaskContract = z.infer<typeof TaskContractSchema>;

export function sessionPlanPath(root: string, sessionId: string): string {
  if (!/^[\w-]+$/.test(sessionId))
    throw new Error("Invalid session ID for plan lookup");
  return join(root, ".agents/results", `plan-${sessionId}.json`);
}

export function loadTaskContract(
  root: string,
  sessionId: string,
  taskId: string,
): TaskContract | null {
  const plan = loadSessionPlan(root, sessionId);
  if (!plan) return null;
  const task = plan.tasks.find((task) => task.id === taskId);
  if (!task) throw new Error(`Unknown plan task: ${taskId}`);
  // Legacy plans remain readable, but cannot supply requirement-backed proof.
  if (!task.required_checks) return null;
  return TaskContractSchema.parse(task);
}

export function loadTaskDecisionRequirements(
  root: string,
  sessionId: string,
  taskId: string,
): RequiredDecision[] {
  const plan = loadSessionPlan(root, sessionId);
  if (!plan) return [];
  const task = plan.tasks.find((task) => task.id === taskId);
  if (!task) throw new Error(`Unknown plan task: ${taskId}`);
  if (task.required_decisions === undefined) return [];
  return RequiredDecisionsSchema.parse(task.required_decisions);
}

const PlanSchema = z
  .object({
    lineage_id: text.regex(/^[\w-]+$/).optional(),
    max_attempts: z.number().int().positive().default(3),
    tasks: z.array(
      z
        .object({
          id: text,
          goal_id: text.optional(),
          dependencies: z.array(text).default([]),
        })
        .passthrough(),
    ),
  })
  .passthrough();
type SessionPlan = z.infer<typeof PlanSchema>;
const PlanPinSchema = z.object({
  lineageId: text.regex(/^[\w-]+$/),
  hash: text,
});

function planPin(root: string, kind: "sessions" | "lineages", id: string) {
  return join(root, ".agents/state/agent-plans", kind, `${id}.json`);
}

function canonical(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonical);
  if (value && typeof value === "object")
    return Object.fromEntries(
      Object.entries(value)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([key, item]) => [key, canonical(item)]),
    );
  return value;
}

function planIdentity(plan: SessionPlan, sessionId: string) {
  // A resumed session may have a new transport ID/date, but the contract is fixed.
  const {
    session_id: _session,
    created: _created,
    lineage_id: _lineage,
    ...contract
  } = plan;
  return {
    lineageId: plan.lineage_id ?? sessionId,
    hash: createHash("sha256")
      .update(JSON.stringify(canonical(contract)))
      .digest("hex"),
  };
}

export function loadSessionPlan(
  root: string,
  sessionId: string,
): SessionPlan | null {
  const file = sessionPlanPath(root, sessionId);
  const sessionPin = planPin(root, "sessions", sessionId);
  if (!existsSync(file)) {
    if (existsSync(sessionPin))
      throw new Error("Plan is immutable after dispatch: missing plan");
    return null;
  }
  let rawPlan: unknown;
  try {
    rawPlan = JSON.parse(readFileSync(file, "utf8"));
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    throw new Error(`Invalid session plan JSON at ${file}: ${detail}`);
  }
  const plan = PlanSchema.parse(rawPlan);
  const ids = plan.tasks.map((task) => task.id);
  if (new Set(ids).size !== ids.length)
    throw new Error("Plan task IDs must be unique");
  const identity = planIdentity(plan, sessionId);
  for (const pin of [
    sessionPin,
    planPin(root, "lineages", identity.lineageId),
  ]) {
    if (!existsSync(pin)) continue;
    const saved = PlanPinSchema.parse(JSON.parse(readFileSync(pin, "utf8")));
    if (saved.lineageId !== identity.lineageId || saved.hash !== identity.hash)
      throw new Error(
        "Plan is immutable after dispatch; contract changes require an explicit new session and lineage",
      );
  }
  const tasks = new Map(plan.tasks.map((task) => [task.id, task]));
  const visited = new Set<string>();
  const visiting = new Set<string>();
  const visit = (id: string) => {
    if (visiting.has(id)) throw new Error(`Cycle in task dependencies: ${id}`);
    if (visited.has(id)) return;
    const task = tasks.get(id);
    if (!task) throw new Error("Plan dependency refers to an unknown task");
    visiting.add(id);
    for (const dependency of task.dependencies) visit(dependency);
    visiting.delete(id);
    visited.add(id);
  };
  for (const id of ids) visit(id);
  return plan;
}

/** Caller holds the state index lock, shared with run creation. */
export function pinSessionPlan(root: string, sessionId: string): void {
  const plan = loadSessionPlan(root, sessionId);
  if (!plan) return;
  const identity = planIdentity(plan, sessionId);
  atomicWriteJson(planPin(root, "lineages", identity.lineageId), identity);
  atomicWriteJson(planPin(root, "sessions", sessionId), identity);
}

export function contractHash(contract: TaskContract | null): string {
  return createHash("sha256").update(JSON.stringify(contract)).digest("hex");
}

export function contractStillCurrent(
  root: string,
  sessionId: string,
  taskId: string,
  expected: TaskContract | undefined,
): boolean {
  try {
    return (
      contractHash(loadTaskContract(root, sessionId, taskId)) ===
      contractHash(expected ?? null)
    );
  } catch {
    return false;
  }
}
