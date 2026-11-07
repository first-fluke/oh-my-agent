import fs from "node:fs";
import { parse as parseYaml } from "yaml";
import { z } from "zod";

export type TaskDefinition = {
  id?: string;
  agent: string;
  task: string;
  workspace?: string;
};

const TaskDefinitionSchema = z.object({
  id: z.string().min(1).optional(),
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

    // A Windows drive path (`C:\repo`) contains the separator itself; rejoin
    // its drive letter so the workspace survives the split.
    const drive = rest.length >= 3 ? rest[rest.length - 2] : undefined;
    if (
      process.platform === "win32" &&
      drive &&
      /^[A-Za-z]$/.test(drive) &&
      /^[\\/]/.test(rest[rest.length - 1] ?? "")
    ) {
      workspace = `${drive}:${rest[rest.length - 1]}`;
      task = rest.slice(0, -2).join(":");
    } else if (rest.length >= 2) {
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
