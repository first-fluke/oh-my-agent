import {
  isAgentMemoryReachable,
  parseSearchResults,
} from "../../.agents/hooks/core/agentmemory-client.ts";
import { createAgentMemoryScope } from "./agentmemory-scope.js";
import { searchScopedAgentMemory } from "./agentmemory-search.js";
import { resolveAgentMemoryEndpoint } from "./memory-provider.js";

/** Keep the standalone hook's project scope, score and age policy in CLI hooks. */
export async function recallAgentMemoryForHook(
  query: string,
  limit: number,
  projectDir: string,
) {
  if (!query.trim()) return [];
  try {
    const endpoint = resolveAgentMemoryEndpoint({});
    if (!endpoint || !(await isAgentMemoryReachable())) return [];
    const response = await searchScopedAgentMemory({
      endpoint,
      scope: createAgentMemoryScope(projectDir),
      query,
      limit,
      timeoutMs: 2000,
    });
    return parseSearchResults(JSON.stringify(response), limit).map((fact) => ({
      ...fact,
      score: fact.score ?? 0,
    }));
  } catch {
    return [];
  }
}
