import { resolveProjectRoot } from "../../utils/fs-utils.js";
import { buildGraph, renderAscii, selectGraph } from "../../utils/graph.js";

export async function visualize(options: {
  json?: boolean;
  focus?: string;
  affected?: string[];
}): Promise<void> {
  if (options.focus && options.affected)
    throw new Error("Use either --focus or --affected");
  const full = buildGraph(resolveProjectRoot(process.cwd()));
  const selection = options.focus
    ? selectGraph(full, [options.focus], "dependencies")
    : options.affected
      ? selectGraph(full, options.affected, "dependents")
      : null;
  const graph = selection ?? full;
  if (selection?.unmatched.length) process.exitCode = 1;

  if (options.json) {
    console.log(JSON.stringify(graph, null, 2));
    return;
  }

  if (selection) {
    for (const node of selection.nodes)
      console.log(`${node.id}\t${node.paths?.join(", ") ?? ""}`);
    for (const command of selection.checks)
      console.log(`Check: ${JSON.stringify(command)}`);
    for (const input of selection.unmatched)
      console.error(`No graph node matches: ${input}`);
  } else console.log(renderAscii(graph));
}
