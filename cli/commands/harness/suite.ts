import { existsSync, lstatSync, readFileSync, realpathSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { parse as parseYaml } from "yaml";
import { z } from "zod";
import { harnessCheckSchema } from "./check-schema.js";
import { assertDirectory, isPathInside } from "./paths.js";
import type { HarnessPartition, HarnessSuite } from "./types.js";

const suiteSchema = z.object({
  schema_version: z.union([z.literal(1), z.literal(2)]),
  id: z.string().regex(/^[A-Za-z0-9][A-Za-z0-9._-]*$/),
  agent: z.string().regex(/^[a-z0-9][a-z0-9-]*$/),
  tasks: z
    .array(
      z.object({
        id: z.string().regex(/^[A-Za-z0-9][A-Za-z0-9._-]*$/),
        prompt: z.string().min(1),
        workspace: z.string().min(1),
        weight: z.number().positive().default(1),
        partition: z.enum(["validation", "final-test"]).optional(),
        checks: z.array(harnessCheckSchema).min(1),
        incident: z
          .object({
            id: z.string().min(1),
            manifestHash: z.string().regex(/^[a-f0-9]{64}$/),
            sourceRunId: z.string().optional(),
            sourceTraceId: z.string().optional(),
          })
          .optional(),
      }),
    )
    .min(1),
});

export const FIXTURE_HARNESS_CONTROLS = [
  ".agents",
  ".claude",
  ".codex",
  ".commandcode",
  ".cursor",
  ".gemini/antigravity-cli",
  ".github/prompts",
  ".github/skills",
  ".hermes",
  ".kiro",
  ".opencode",
  ".pi",
  ".qwen",
  ".zcode",
  "AGENTS.md",
  "CLAUDE.md",
  "GEMINI.md",
];

export function loadHarnessSuite(
  suitePath: string,
  projectRoot: string,
): HarnessSuite {
  const absoluteRoot = resolve(projectRoot);
  const absoluteSuitePath = resolve(absoluteRoot, suitePath);
  if (!isPathInside(absoluteRoot, absoluteSuitePath)) {
    throw new Error("Harness suite must be inside the project root");
  }
  if (!existsSync(absoluteSuitePath)) {
    throw new Error(`Harness suite not found: ${absoluteSuitePath}`);
  }
  if (lstatSync(absoluteSuitePath).isSymbolicLink()) {
    throw new Error("Harness suite must not be a symbolic link");
  }
  if (
    !isPathInside(realpathSync(absoluteRoot), realpathSync(absoluteSuitePath))
  ) {
    throw new Error("Harness suite must resolve inside the project root");
  }

  const copiedBaselineRoots = [
    "agents",
    "config",
    "rules",
    "skills",
    "workflows",
  ].map((name) => resolve(absoluteRoot, ".agents", name));
  copiedBaselineRoots.push(resolve(absoluteRoot, ".agents", "oma-config.yaml"));
  const assertOutsideBaseline = (path: string): void => {
    if (
      copiedBaselineRoots.some((root) =>
        isPathInside(
          existsSync(root) ? realpathSync(root) : root,
          realpathSync(path),
        ),
      )
    )
      throw new Error(
        "Evaluator suite and fixtures must be outside copied baseline definitions",
      );
  };
  assertOutsideBaseline(absoluteSuitePath);
  const raw = parseYaml(readFileSync(absoluteSuitePath, "utf-8"));
  const parsed = suiteSchema.safeParse(raw);
  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
      .join("; ");
    throw new Error(`Invalid harness suite: ${issues}`);
  }

  const seenIds = new Set<string>();
  const suiteDir = dirname(absoluteSuitePath);
  const tasks = parsed.data.tasks.map((task) => {
    if (seenIds.has(task.id)) {
      throw new Error(`Duplicate harness task id: ${task.id}`);
    }
    seenIds.add(task.id);
    if (parsed.data.schema_version === 2 && !task.partition) {
      throw new Error(
        `Task ${task.id} requires a validation or final-test partition`,
      );
    }
    if (parsed.data.schema_version === 1 && task.partition) {
      throw new Error("Task partitions require schema_version: 2");
    }
    const workspace = resolve(suiteDir, task.workspace);
    if (!isPathInside(absoluteRoot, workspace)) {
      throw new Error(`Task ${task.id} workspace escapes the project root`);
    }
    assertDirectory(workspace, `Task ${task.id} workspace`);
    if (lstatSync(workspace).isSymbolicLink()) {
      throw new Error(`Task ${task.id} workspace must not be a symbolic link`);
    }
    if (!isPathInside(realpathSync(absoluteRoot), realpathSync(workspace))) {
      throw new Error(
        `Task ${task.id} workspace resolves outside the project root`,
      );
    }
    assertOutsideBaseline(workspace);
    const control = FIXTURE_HARNESS_CONTROLS.find((path) =>
      existsSync(resolve(workspace, path)),
    );
    if (control) {
      throw new Error(
        `Task ${task.id} workspace contains harness control surface ${control}`,
      );
    }
    if (
      isPathInside(realpathSync(workspace), realpathSync(absoluteSuitePath))
    ) {
      throw new Error(`Task ${task.id} workspace contains the evaluator suite`);
    }
    return { ...task, workspace };
  });

  if (parsed.data.schema_version === 2) {
    for (const partition of ["validation", "final-test"] as const) {
      if (!tasks.some((task) => task.partition === partition)) {
        throw new Error(`Suite requires at least one ${partition} task`);
      }
    }
    for (const task of tasks) {
      for (const other of tasks) {
        if (
          task.partition !== other.partition &&
          (isPathInside(
            realpathSync(task.workspace),
            realpathSync(other.workspace),
          ) ||
            isPathInside(
              realpathSync(other.workspace),
              realpathSync(task.workspace),
            ))
        ) {
          throw new Error(
            "Validation and final-test fixtures must be separate directories",
          );
        }
      }
    }
  }
  return {
    schemaVersion: parsed.data.schema_version,
    id: parsed.data.id,
    agent: parsed.data.agent,
    tasks,
    sourcePath: absoluteSuitePath,
  };
}

export function selectHarnessTasks(
  suite: HarnessSuite,
  partition: HarnessPartition = "validation",
) {
  if (partition !== "validation" && partition !== "final-test") {
    throw new Error("--partition must be validation or final-test");
  }
  if (suite.schemaVersion === 1) {
    if (partition === "final-test")
      throw new Error(
        "Final-test requires a partitioned schema_version: 2 suite",
      );
    return suite.tasks;
  }
  const tasks = suite.tasks.filter((task) => task.partition === partition);
  if (tasks.length === 0)
    throw new Error(`Suite contains no ${partition} tasks`);
  return tasks;
}
