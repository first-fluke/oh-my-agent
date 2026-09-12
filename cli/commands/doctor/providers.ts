import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { isGortexTracked } from "../../io/gortex.js";
import { createSearchContext } from "../../platform/search-context.js";
import { createSearchProviderRegistry } from "../../platform/search-providers.js";
import { createMemoryProvider } from "../../state/semantic-memory.js";
import type { MemoryProviderStatus } from "../../types/memory.js";
import type { SearchProviderInspection } from "../../types/search-provider.js";
import { loadProviders } from "../../utils/providers.js";
import { isRecord } from "../../utils/type-guards.js";
import { checkCLI } from "./environment-checks.js";

export interface ProviderDoctorCheck {
  web: SearchProviderInspection & {
    credentialConfigured?: boolean;
    reason?: string;
  };
  docs: {
    provider: "context7";
    configured: boolean;
    authentication: "api-key" | "anonymous-or-client-managed";
    reachability: "not-probed";
    fallback: string;
  };
  codeIntelligence: {
    provider: "serena" | "gortex";
    experimental: boolean;
    binaryAvailable?: boolean;
    /**
     * Gortex only: whether `root` is in the daemon's tracked set. `undefined`
     * when the binary is missing or the tracked set could not be read.
     */
    tracked?: boolean;
    fallback: string;
  };
  semanticMemory: MemoryProviderStatus;
  issues: string[];
}

export async function collectProviderCheck(
  root: string,
  legacy: MemoryProviderStatus,
): Promise<ProviderDoctorCheck> {
  const providers = loadProviders(root);
  const issues: string[] = [];
  const registry = createSearchProviderRegistry();
  const web: ProviderDoctorCheck["web"] = registry.inspect(
    providers.web,
    "web",
  );
  if (providers.web === "brave") {
    try {
      const status = await registry.status(
        "brave",
        "web",
        createSearchContext(root, AbortSignal.timeout(1000)),
      );
      web.credentialConfigured = status.available;
      web.reason = status.reason;
    } catch {
      web.credentialConfigured = false;
      web.reason = "Brave credential check timed out or failed.";
    }
    if (!web.credentialConfigured)
      issues.push(web.reason ?? "Brave credential unavailable");
  }
  if (["unregistered", "unsupported", "adapter-missing"].includes(web.status))
    issues.push(
      `Web search provider ${web.provider}: ${web.status}; no automatic provider switch`,
    );
  let context7: unknown;
  const path = join(root, ".agents", "mcp.json");
  if (existsSync(path)) {
    try {
      const parsed = JSON.parse(readFileSync(path, "utf8"));
      context7 = parsed?.mcpServers?.context7;
    } catch {
      issues.push("Cannot read Context7 MCP configuration");
    }
  }
  const semanticMemory =
    providers.semantic_memory === "agentmemory"
      ? legacy
      : await createMemoryProvider({ projectDir: root }).status();
  if (providers.semantic_memory === "honcho" && !semanticMemory.reachable) {
    issues.push(semanticMemory.reason ?? "Honcho unavailable");
  }
  const binary =
    providers.code_intelligence === "gortex"
      ? await checkCLI(
          "gortex",
          "gortex",
          "Install Gortex separately; then explicitly track the intended repositories",
          ["version"],
        )
      : undefined;
  if (binary && !binary.installed)
    issues.push(
      "Selected Gortex binary is unavailable; native search fallback applies",
    );
  // A present binary is not enough: an untracked root makes every Gortex
  // graph tool answer `repo_not_tracked`. Unknown (daemon unresponsive) is
  // reported as neither tracked nor an issue — no false positives.
  const tracked = binary?.installed ? isGortexTracked(root) : null;
  if (tracked === false)
    issues.push(
      "Gortex does not track this project; run `oma update` (or `gortex track <root>`) so graph tools can answer",
    );
  const headers =
    isRecord(context7) && isRecord(context7.headers) ? context7.headers : {};
  const env = isRecord(context7) && isRecord(context7.env) ? context7.env : {};
  return {
    web,
    docs: {
      provider: "context7",
      configured: isRecord(context7),
      authentication:
        headers.CONTEXT7_API_KEY ||
        headers.Authorization ||
        env.CONTEXT7_API_KEY
          ? "api-key"
          : "anonymous-or-client-managed",
      reachability: "not-probed",
      fallback: "official documentation via web search",
    },
    codeIntelligence: {
      provider: providers.code_intelligence,
      experimental: providers.code_intelligence === "gortex",
      ...(binary ? { binaryAvailable: binary.installed } : {}),
      ...(tracked === null ? {} : { tracked }),
      fallback: "native search/read; no automatic provider switch",
    },
    semanticMemory,
    issues,
  };
}
