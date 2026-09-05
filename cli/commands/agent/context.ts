import {
  type Difficulty,
  loadGraphContext,
} from "../../platform/context-loader.js";
import { resolveProjectRoot } from "../../utils/fs-utils.js";

export function showAgentContext(
  agentId: string,
  options: { root?: string; difficulty?: string },
): void {
  const difficulty = options.difficulty ?? "Medium";
  if (!["Simple", "Medium", "Complex"].includes(difficulty))
    throw new Error("Difficulty must be Simple, Medium, or Complex");
  const context = loadGraphContext(
    agentId,
    difficulty as Difficulty,
    options.root ?? resolveProjectRoot(process.cwd()),
  );
  if (!context) throw new Error(`No graph-backed context found for ${agentId}`);
  console.log(context);
}
