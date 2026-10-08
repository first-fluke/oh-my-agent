import { existsSync, readdirSync, readFileSync } from "node:fs";
import { basename, join, resolve } from "node:path";
import { getCoordinationStoreDirs } from "../../io/memory.js";
import { runtimeStateDir } from "../../state/project-runtime.js";

function receiptFiles(root: string): string[] {
  const dir = runtimeStateDir(root, "agent-runs");
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter(
      (name) =>
        name.endsWith(".json") &&
        !name.endsWith(".claim.json") &&
        name !== "_sequence.json",
    )
    .map((name) => join(dir, name));
}

export interface VerifySelection {
  sessionId?: string;
  taskId?: string;
  runId?: string;
  artifactRoot?: string;
}

export function resolveVerifySelection(
  workspace: string,
  agentType: string,
  selection: VerifySelection = {},
): VerifySelection {
  for (const [key, value] of Object.entries(selection)) {
    if (
      key !== "artifactRoot" &&
      value !== undefined &&
      !/^[\w-]+$/.test(value)
    )
      throw new Error(`Invalid verification ${key}`);
  }
  if (!selection.runId) return selection;

  for (const root of new Set([
    selection.artifactRoot ?? workspace,
    process.cwd(),
  ])) {
    const file = join(
      runtimeStateDir(root, "agent-runs"),
      `${selection.runId}.json`,
    );
    if (!existsSync(file)) continue;
    const run = JSON.parse(readFileSync(file, "utf8")) as Record<
      string,
      unknown
    >;
    if (
      run.runId !== selection.runId ||
      run.agentId !== agentType ||
      typeof run.workspace !== "string" ||
      resolve(run.workspace) !== resolve(workspace) ||
      typeof run.sessionId !== "string" ||
      !/^[\w-]+$/.test(run.sessionId) ||
      typeof run.taskId !== "string" ||
      !/^[\w-]+$/.test(run.taskId) ||
      (selection.sessionId && run.sessionId !== selection.sessionId) ||
      (selection.taskId && run.taskId !== selection.taskId)
    )
      throw new Error(
        "Agent run does not match the verification identity/workspace",
      );
    return {
      ...selection,
      sessionId: run.sessionId,
      taskId: run.taskId,
      artifactRoot: root,
    };
  }
  if (!selection.sessionId || !selection.taskId)
    throw new Error(
      "Run receipt not found; supply --session-id and --task-id with --run-id",
    );
  return selection;
}

export function findResultFile(
  workspace: string,
  agentType: string,
  selection: VerifySelection = {},
  allowLegacy = false,
): string | null {
  const root = selection.artifactRoot ?? workspace;
  const expected = new Set<string>();
  if (selection.sessionId && selection.taskId && selection.runId) {
    expected.add(
      `result-${agentType}-${selection.taskId}-${selection.runId}-${selection.sessionId}.md`,
    );
  } else if (selection.sessionId) {
    for (const file of receiptFiles(root)) {
      const name = basename(file);
      try {
        const run = JSON.parse(readFileSync(file, "utf8"));
        if (
          run.agentId !== agentType ||
          run.sessionId !== selection.sessionId ||
          typeof run.workspace !== "string" ||
          resolve(run.workspace) !== resolve(workspace) ||
          typeof run.taskId !== "string" ||
          !/^[\w-]+$/.test(run.taskId) ||
          typeof run.runId !== "string" ||
          !/^[\w-]+$/.test(run.runId) ||
          name !== `${run.runId}.json` ||
          (selection.taskId && run.taskId !== selection.taskId)
        )
          continue;
        expected.add(
          `result-${agentType}-${run.taskId}-${run.runId}-${run.sessionId}.md`,
        );
      } catch {
        // An unreadable receipt cannot bind a report to this task/session.
      }
    }
  }
  if (expected.size > 1)
    throw new Error(
      "Multiple runs match; supply --session-id, --task-id and --run-id",
    );
  const matches = new Map<string, string>();
  let unboundReport = false;
  for (const dir of getCoordinationStoreDirs(root)) {
    if (!existsSync(dir)) continue;
    for (const name of readdirSync(dir)) {
      let selected = expected.has(name);
      if (
        selection.sessionId &&
        !selection.runId &&
        !selected &&
        name.startsWith(`result-${agentType}-`) &&
        name.endsWith(`-${selection.sessionId}.md`)
      )
        unboundReport = true;
      if (
        allowLegacy &&
        (name === `result-${agentType}.md` ||
          name === `result-${agentType}-${selection.sessionId}.md`)
      )
        selected = true;
      // The canonical coordination store takes precedence over its legacy mirror.
      if (selected && !matches.has(name)) matches.set(name, join(dir, name));
    }
  }
  const unique = [...matches.values()];
  if (unique.length === 0 && unboundReport)
    throw new Error(
      "Result report has no matching run receipt; supply --session-id, --task-id and --run-id",
    );
  if (unique.length > 1)
    throw new Error(
      "Multiple result reports match; supply --session-id, --task-id and --run-id",
    );
  return unique[0] ?? null;
}
