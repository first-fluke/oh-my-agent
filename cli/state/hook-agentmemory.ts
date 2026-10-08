import { basename } from "node:path";
import {
  isAgentMemoryReachable,
  parseSearchResults,
} from "../../.agents/hooks/core/agentmemory-client.ts";
import { http } from "../io/http.js";
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
    const response = await http.post(
      new URL("/agentmemory/search", endpoint).href,
      { query, limit, project: basename(projectDir), cwd: projectDir },
      { timeout: 2000, validateStatus: () => true },
    );
    if (response.status < 200 || response.status >= 300) return [];
    return parseSearchResults(JSON.stringify(response.data), limit).map(
      (fact) => ({
        ...fact,
        score: fact.score ?? 0,
      }),
    );
  } catch {
    return [];
  }
}
