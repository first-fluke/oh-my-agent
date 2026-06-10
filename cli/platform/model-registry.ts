// cli/platform/model-registry.ts
// Layer-1 Model Registry
// CLI-only: api_only:true entries are rejected at initialization.

import { RAW_REGISTRY } from "./model-registry/raw-registry.js";
import { ModelSpecSchema } from "./model-registry/schema.js";
import type { ModelSpec, RuntimeId } from "./model-registry/types.js";
import { loadUserModels } from "./model-registry/user-models.js";

export type {
  EffortLevel,
  EffortSpec,
  ModelSpec,
  RuntimeId,
  ThinkingMode,
} from "./model-registry/types.js";

export { loadUserModels } from "./model-registry/user-models.js";

// ---------------------------------------------------------------------------
// Initialization guard: defensive filter for api_only:true entries
// ---------------------------------------------------------------------------

function buildCoreRegistry(): ReadonlyMap<string, ModelSpec> {
  const filtered = new Map<string, ModelSpec>();
  for (const [slug, spec] of RAW_REGISTRY) {
    if (spec.supports.api_only) continue;
    filtered.set(slug, spec);
  }
  return filtered as ReadonlyMap<string, ModelSpec>;
}

// ---------------------------------------------------------------------------
// Merged registry — lazy initialization with reload escape hatch
// ---------------------------------------------------------------------------

let _mergedRegistry: ReadonlyMap<string, ModelSpec> | null = null;
const _coreRegistry: ReadonlyMap<string, ModelSpec> = buildCoreRegistry();

function getMergedRegistry(): ReadonlyMap<string, ModelSpec> {
  if (_mergedRegistry !== null) return _mergedRegistry;
  return reloadRegistry();
}

/**
 * (Re)initialize the merged registry by merging CORE_REGISTRY with user entries
 * from .agents/config/models.yaml. Call with a cwd to target a specific directory
 * (useful in tests). Without cwd, uses process.cwd().
 *
 * User entries with the same slug as a core entry win (full override).
 * Call this before each test case that needs a fresh registry.
 */
export function reloadRegistry(cwd?: string): ReadonlyMap<string, ModelSpec> {
  const merged = new Map<string, ModelSpec>(_coreRegistry);

  const userModels = loadUserModels(cwd);
  for (const [slug, spec] of userModels) {
    if (_coreRegistry.has(slug)) {
      console.warn(`[model-registry] User override for slug "${slug}"`);
    }
    merged.set(slug, spec);
  }

  _mergedRegistry = merged as ReadonlyMap<string, ModelSpec>;
  return _mergedRegistry;
}

/**
 * Core model registry. Contains exactly 14 CLI-compatible slugs from the
 * built-in RAW_REGISTRY, merged with any user entries from models.yaml.
 * Entries with api_only:true are excluded at initialization.
 *
 * NOTE: This is a lazy-initialized merged registry. Access triggers a one-time
 * load from .agents/config/models.yaml. Use reloadRegistry(cwd) in tests for
 * isolation.
 */
export const CORE_REGISTRY: ReadonlyMap<string, ModelSpec> = new Proxy(
  {} as ReadonlyMap<string, ModelSpec>,
  {
    get(_target, prop, _receiver) {
      const registry = getMergedRegistry();
      const value = Reflect.get(registry, prop, registry);
      if (typeof value === "function") {
        return value.bind(registry);
      }
      return value;
    },
    has(_target, prop) {
      return Reflect.has(getMergedRegistry(), prop);
    },
  },
) as ReadonlyMap<string, ModelSpec>;

// ---------------------------------------------------------------------------
// Helper exports
// ---------------------------------------------------------------------------

/**
 * Returns the ModelSpec for a slug, or undefined if unknown.
 *
 * @param slug - The model slug to look up (e.g. "anthropic/claude-sonnet-4-6").
 * @param userModels - Optional map of inline user-defined model specs from
 *   oma-config.yaml's `models` key. When provided, user slugs are checked
 *   first. A user slug that collides with a core registry slug wins (user
 *   override) and emits a console.warn.
 *
 * Searches: userModels → merged registry (core + models.yaml on disk).
 * Never throws — callers are responsible for handling undefined.
 *
 * NOTE: T18 (debug agent, Phase 3) will audit all call sites to pass
 * userModels from the in-scope OmaConfig.
 */
export function getModelSpec(
  slug: string,
  userModels?: Record<string, unknown>,
): ModelSpec | undefined {
  if (userModels && Object.hasOwn(userModels, slug)) {
    const raw = userModels[slug];
    const parsed = ModelSpecSchema.safeParse(raw);
    if (parsed.success) {
      const spec = parsed.data as ModelSpec;
      if (spec.supports.api_only) {
        console.warn(
          `[model-registry] User inline model "${slug}": api_only=true is not supported in CLI-only mode — falling back to core registry.`,
        );
      } else {
        if (getMergedRegistry().has(slug)) {
          console.warn(
            `[model-registry] User inline model "${slug}" overrides a core registry entry.`,
          );
        }
        return spec;
      }
    } else {
      console.warn(
        `[model-registry] User inline model "${slug}" failed validation — falling back to core registry. Errors: ${parsed.error.issues.map((i) => i.message).join("; ")}`,
      );
    }
  }
  return getMergedRegistry().get(slug);
}

/**
 * Returns true if the slug is present in the merged registry (core + user).
 */
export function hasModelSpec(slug: string): boolean {
  return getMergedRegistry().has(slug);
}

const OWNER_TO_CLI: Record<string, RuntimeId> = {
  anthropic: "claude",
  openai: "codex",
  google: "gemini",
  cursor: "cursor",
  qwen: "qwen",
};

/**
 * List built-in slugs grouped by owner. Used by buildUnknownSlugError to show
 * the user the catalog they can pick from without adding a `models:` block.
 */
export function listBuiltInSlugsByOwner(owner: string): string[] {
  const prefix = `${owner}/`;
  return Array.from(RAW_REGISTRY.keys())
    .filter((slug) => slug.startsWith(prefix))
    .sort();
}

/**
 * Build an actionable error message for an unknown model slug. Detects whether
 * the slug looks like an OpenRouter entry for a vendor whose CLI we support,
 * and scaffolds the `models:` block the user can paste into oma-config.yaml.
 */
export function buildUnknownSlugError(slug: string, agentId?: string): string {
  const subject = agentId ? `for agent "${agentId}"` : "";
  const parts = slug.split("/");
  const owner = parts[0] ?? "";
  const cliModel = parts.slice(1).join("/");
  const cli = owner ? OWNER_TO_CLI[owner] : undefined;

  const lines: string[] = [
    `Unknown model slug "${slug}"${subject ? ` ${subject}` : ""}.`,
    "",
  ];

  if (cli && cliModel) {
    const builtIn = listBuiltInSlugsByOwner(owner);
    lines.push(
      `This looks like an OpenRouter slug for ${owner} (CLI: ${cli}).`,
      `If your ${cli} CLI accepts this model, register it in .agents/oma-config.yaml:`,
      "",
      "models:",
      `  ${slug}:`,
      `    cli: ${cli}`,
      `    cli_model: ${cliModel}            # confirm via \`${cli} --help\``,
      "    supports:",
      `      native_dispatch_from: [${cli}]`,
      "",
    );
    if (builtIn.length > 0) {
      lines.push(
        `Built-in ${owner} slugs you can use without a models: block:`,
        ...builtIn.map((s) => `  - ${s}`),
        "",
      );
    }
    lines.push("Browse all OpenRouter models: https://openrouter.ai/models");
  } else {
    const supportedOwners = Object.entries(OWNER_TO_CLI)
      .map(([o, c]) => `${o} (${c})`)
      .join(", ");
    lines.push(
      `Owner "${owner ?? "<missing>"}" is not bundled with a forkable CLI.`,
      `Supported owners: ${supportedOwners}.`,
      "",
      `If "${owner ?? "<missing>"}" has a CLI you can shell out to, register it manually:`,
      "models:",
      `  ${slug}:`,
      "    cli: <your-cli-binary>",
      `    cli_model: ${cliModel || "<model-name>"}`,
      "    supports:",
      "      native_dispatch_from: [<your-cli-binary>]",
    );
  }

  return lines.join("\n");
}
