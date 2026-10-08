import { join } from "node:path";
import { projectStateDir } from "../../.agents/hooks/core/session-storage.ts";

export type RuntimeStateArea =
  | "agent-runs"
  | "agent-plans"
  | "agent-resume"
  | "retry";

/** Runtime ownership and its state-index lock share a profile/project scope. */
export function runtimeStateDir(root: string, area: RuntimeStateArea): string {
  return join(projectStateDir(root), area);
}
