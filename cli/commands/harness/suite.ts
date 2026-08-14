import { existsSync, lstatSync, readFileSync, realpathSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { parse as parseYaml } from "yaml";
import { z } from "zod";
import { assertDirectory, isPathInside } from "./paths.js";
import type { HarnessSuite } from "./types.js";

const filePathCheck = z.object({
  type: z.enum(["file_exists", "file_not_exists"]),
  path: z.string().min(1),
});

const fileContentCheck = z.object({
  type: z.enum(["file_contains", "file_not_contains"]),
  path: z.string().min(1),
  value: z.string(),
});

const outputCheck = z.object({
  type: z.enum(["output_contains", "output_not_contains"]),
  value: z.string(),
});

const suiteSchema = z.object({
  schema_version: z.literal(1),
  id: z.string().regex(/^[A-Za-z0-9][A-Za-z0-9._-]*$/),
  agent: z.string().regex(/^[a-z0-9][a-z0-9-]*$/),
  tasks: z
    .array(
      z.object({
        id: z.string().regex(/^[A-Za-z0-9][A-Za-z0-9._-]*$/),
        prompt: z.string().min(1),
        workspace: z.string().min(1),
        weight: z.number().positive().default(1),
        checks: z
          .array(z.union([filePathCheck, fileContentCheck, outputCheck]))
          .min(1),
      }),
    )
    .min(1),
});

const FIXTURE_HARNESS_CONTROLS = [
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
    const control = FIXTURE_HARNESS_CONTROLS.find((path) =>
      existsSync(resolve(workspace, path)),
    );
    if (control) {
      throw new Error(
        `Task ${task.id} workspace contains harness control surface ${control}`,
      );
    }
    return { ...task, workspace };
  });

  return {
    schemaVersion: 1,
    id: parsed.data.id,
    agent: parsed.data.agent,
    tasks,
    sourcePath: absoluteSuitePath,
  };
}
