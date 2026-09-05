import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { z } from "zod";

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
export const TaskContractSchema = z
  .object({
    id: text,
    acceptance_criteria: z
      .array(z.object({ id: text, description: text }))
      .min(1),
    required_checks: z.array(RequiredCheckSchema).min(1),
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
  const file = sessionPlanPath(root, sessionId);
  if (!existsSync(file)) return null;
  const plan = z
    .object({ tasks: z.array(z.object({ id: text }).passthrough()) })
    .parse(JSON.parse(readFileSync(file, "utf8")));
  const ids = plan.tasks.map((task) => task.id);
  if (new Set(ids).size !== ids.length)
    throw new Error("Plan task IDs must be unique");
  const task = plan.tasks.find((task) => task.id === taskId);
  // Legacy plans remain readable, but cannot supply requirement-backed proof.
  if (!task?.required_checks) return null;
  const contract = TaskContractSchema.parse(task);
  if (contract.dependencies.some((id) => !ids.includes(id)))
    throw new Error("Plan dependency refers to an unknown task");
  return contract;
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
