import fs from "node:fs";
import { parse as parseYaml } from "yaml";
import { z } from "zod";

export type TaskDefinition = {
  agent: string;
  task: string;
  workspace?: string;
};

const TaskDefinitionSchema = z.object({
  agent: z.string(),
  task: z.string(),
  workspace: z.string().optional(),
});

const TasksFileSchema = z.object({
  tasks: z.array(TaskDefinitionSchema),
});

export function parseTasksFile(filePath: string): TaskDefinition[] {
  if (!fs.existsSync(filePath)) {
    throw new Error(`Tasks file not found: ${filePath}`);
  }

  const content = fs.readFileSync(filePath, "utf-8");
  const parsed = parseYaml(content);
  const result = TasksFileSchema.safeParse(parsed);

  if (!result.success) {
    throw new Error(`Invalid tasks file format: ${result.error.message}`);
  }

  return result.data.tasks;
}

export function parseInlineTasks(taskSpecs: string[]): TaskDefinition[] {
  return taskSpecs.map((spec) => {
    const parts = spec.split(":");
    if (parts.length < 2 || !parts[0]) {
      throw new Error(
        `Invalid task format: "${spec}". Expected "agent:task" or "agent:task:workspace"`,
      );
    }

    const agent = parts[0];
    const rest = parts.slice(1);
    let task: string;
    let workspace: string | undefined;

    if (rest.length >= 2) {
      const lastPart = rest[rest.length - 1] ?? "";
      if (
        lastPart.startsWith("./") ||
        lastPart.startsWith("/") ||
        lastPart === "."
      ) {
        workspace = lastPart;
        task = rest.slice(0, -1).join(":");
      } else {
        task = rest.join(":");
      }
    } else {
      task = rest.join(":");
    }

    return { agent, task, workspace };
  });
}
