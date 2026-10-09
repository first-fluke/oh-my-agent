import { http } from "../io/http.js";
import {
  type AgentMemoryScope,
  filterAgentMemoryResults,
} from "./agentmemory-scope.js";

/** Both provider and hook readers use the same request and ownership check. */
export async function searchScopedAgentMemory(args: {
  endpoint: string;
  scope: AgentMemoryScope;
  query: string;
  limit: number;
  timeoutMs?: number;
}): Promise<{ results: unknown[] }> {
  const query = args.query.trim();
  if (!query) return { results: [] };
  const response = await http.post(
    `${args.endpoint.replace(/\/+$/, "")}/agentmemory/search`,
    {
      query,
      limit: args.limit,
      project: args.scope.project,
      cwd: args.scope.projectDir,
      format: "full",
    },
    { timeout: args.timeoutMs ?? 2000, validateStatus: () => true },
  );
  if (response.status < 200 || response.status >= 300) return { results: [] };
  return filterAgentMemoryResults(response.data, args.scope);
}
