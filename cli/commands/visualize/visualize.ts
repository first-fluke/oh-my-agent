import { buildGraph, renderAscii } from "../../utils/graph.js";

export async function visualize(options: { json?: boolean }): Promise<void> {
  const graph = buildGraph(process.cwd());

  if (options.json) {
    console.log(JSON.stringify(graph, null, 2));
    return;
  }

  console.log(renderAscii(graph));
}
