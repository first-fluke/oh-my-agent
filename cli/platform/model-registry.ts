// cli/platform/model-registry.ts
// Layer-1 Model Registry
// CLI-only: api_only:true entries are rejected at initialization.

import fs from "node:fs";
import path from "node:path";
import { parse as parseYaml } from "yaml";
import { z } from "zod";

export type RuntimeId = "claude" | "codex" | "gemini" | "antigravity" | "qwen";

export type EffortLevel = "none" | "low" | "medium" | "high" | "xhigh";

export type ThinkingMode = "none" | "dynamic" | "fixed";

export type EffortSpec =
  | {
      type: "granular";
      levels: EffortLevel[];
    }
  | {
      type: "cli-session";
      auto_default: EffortLevel;
    }
  | {
      type: "thinking-budget";
      modes: ThinkingMode[];
    }
  | {
      type: "binary-thinking";
    }
  | null;

export type ModelSpec = {
  // antigravity has no Registry entries — uses built-in models only
  cli: Exclude<RuntimeId, "antigravity">;
  cli_model: string;
  supports: {
    effort: EffortSpec;
    apply_patch: boolean;
    task_budget: boolean;
    prompt_cache: boolean;
    computer_use: boolean;
    native_dispatch_from: RuntimeId[];
    api_only: boolean;
  };
  pricing_note?: string;
  auth_hint: string;
  subscription_tier?: string;
};

// ---------------------------------------------------------------------------
// Raw registry — includes intentionally excluded api_only entries for testing
// the initialization guard. These are filtered out before export.
// ---------------------------------------------------------------------------

const RAW_REGISTRY: ReadonlyMap<string, ModelSpec> = new Map([
  // -------------------------------------------------------------------------
  // Anthropic (3)
  // -------------------------------------------------------------------------
  [
    "anthropic/claude-opus-4-7",
    {
      cli: "claude",
      cli_model: "claude-opus-4-7",
      supports: {
        effort: { type: "cli-session", auto_default: "xhigh" },
        apply_patch: false,
        task_budget: true,
        prompt_cache: true,
        computer_use: false,
        native_dispatch_from: ["claude"],
        api_only: false,
      },
      pricing_note: "$5/$25 per Mtok (참고용 — 구독 기반 비용 아님)",
      auth_hint: "Claude Max 구독 필요 ($200/mo)",
      subscription_tier: "claude_max",
    } satisfies ModelSpec,
  ],
  [
    "anthropic/claude-sonnet-4-6",
    {
      cli: "claude",
      cli_model: "claude-sonnet-4-6",
      supports: {
        effort: { type: "cli-session", auto_default: "xhigh" },
        apply_patch: false,
        task_budget: true,
        prompt_cache: true,
        computer_use: false,
        native_dispatch_from: ["claude"],
        api_only: false,
      },
      auth_hint: "Claude Pro 또는 Max 구독 필요",
    } satisfies ModelSpec,
  ],
  [
    "anthropic/claude-haiku-4-5",
    {
      cli: "claude",
      cli_model: "claude-haiku-4-5",
      supports: {
        effort: { type: "cli-session", auto_default: "xhigh" },
        apply_patch: false,
        task_budget: false,
        prompt_cache: true,
        computer_use: false,
        native_dispatch_from: ["claude"],
        api_only: false,
      },
      auth_hint: "Claude Pro 또는 Max 구독 필요",
    } satisfies ModelSpec,
  ],

  // -------------------------------------------------------------------------
  // OpenAI Codex (4)
  // -------------------------------------------------------------------------
  [
    "openai/gpt-5.4",
    {
      cli: "codex",
      cli_model: "gpt-5.4",
      supports: {
        effort: {
          type: "granular",
          levels: ["none", "low", "medium", "high", "xhigh"],
        },
        apply_patch: true,
        task_budget: false,
        prompt_cache: false,
        computer_use: true,
        native_dispatch_from: ["codex"],
        api_only: false,
      },
      auth_hint: "ChatGPT Plus 또는 Pro 구독 필요",
    } satisfies ModelSpec,
  ],
  [
    "openai/gpt-5.4-pro",
    {
      cli: "codex",
      cli_model: "gpt-5.4-pro",
      supports: {
        effort: {
          type: "granular",
          levels: ["none", "low", "medium", "high", "xhigh"],
        },
        apply_patch: true,
        task_budget: false,
        prompt_cache: false,
        computer_use: true,
        native_dispatch_from: ["codex"],
        api_only: false,
      },
      pricing_note: "$30/$180 per Mtok (참고용 — 특수 케이스만 사용)",
      auth_hint: "ChatGPT Pro 구독 필요 ($200/mo)",
      subscription_tier: "chatgpt_pro",
    } satisfies ModelSpec,
  ],
  [
    "openai/gpt-5.4-mini",
    {
      cli: "codex",
      cli_model: "gpt-5.4-mini",
      supports: {
        effort: {
          type: "granular",
          levels: ["none", "low", "medium", "high", "xhigh"],
        },
        apply_patch: true,
        task_budget: false,
        prompt_cache: false,
        computer_use: false,
        native_dispatch_from: ["codex"],
        api_only: false,
      },
      pricing_note: "Codex quota 30%만 소비 — 공식 서브에이전트 권장",
      auth_hint: "ChatGPT Plus 구독 필요",
    } satisfies ModelSpec,
  ],
  [
    "openai/gpt-5.3-codex",
    {
      cli: "codex",
      cli_model: "gpt-5.3-codex",
      supports: {
        effort: {
          type: "granular",
          levels: ["none", "low", "medium", "high", "xhigh"],
        },
        apply_patch: true,
        task_budget: false,
        prompt_cache: false,
        computer_use: false,
        native_dispatch_from: ["codex"],
        api_only: false,
      },
      auth_hint: "ChatGPT Plus 또는 Pro 구독 필요",
    } satisfies ModelSpec,
  ],

  // -------------------------------------------------------------------------
  // Google Gemini (3)
  // -------------------------------------------------------------------------
  [
    "google/gemini-3.1-pro-preview",
    {
      cli: "gemini",
      cli_model: "gemini-3.1-pro-preview",
      supports: {
        effort: {
          type: "thinking-budget",
          modes: ["none", "dynamic", "fixed"],
        },
        apply_patch: false,
        task_budget: false,
        prompt_cache: true,
        computer_use: false,
        native_dispatch_from: ["gemini"],
        api_only: false,
      },
      auth_hint: "Google AI Pro 구독 필요 ($20/mo)",
      subscription_tier: "google_ai_pro",
    } satisfies ModelSpec,
  ],
  [
    "google/gemini-3-flash",
    {
      cli: "gemini",
      cli_model: "gemini-3-flash",
      supports: {
        effort: {
          type: "thinking-budget",
          modes: ["none", "dynamic"],
        },
        apply_patch: false,
        task_budget: false,
        prompt_cache: true,
        computer_use: false,
        native_dispatch_from: ["gemini"],
        api_only: false,
      },
      pricing_note: "$0.50/$3.00 per Mtok (참고용)",
      auth_hint: "Google AI Pro 구독 필요 ($20/mo)",
      subscription_tier: "google_ai_pro",
    } satisfies ModelSpec,
  ],
  [
    "google/gemini-3.1-flash-lite",
    {
      cli: "gemini",
      cli_model: "gemini-3.1-flash-lite",
      supports: {
        effort: {
          type: "thinking-budget",
          modes: ["none", "dynamic"],
        },
        apply_patch: false,
        task_budget: false,
        prompt_cache: true,
        computer_use: false,
        native_dispatch_from: ["gemini"],
        api_only: false,
      },
      pricing_note: "$0.25/$1.50 per Mtok (참고용)",
      auth_hint: "Google AI Pro 구독 필요 ($20/mo)",
      subscription_tier: "google_ai_pro",
    } satisfies ModelSpec,
  ],

  // -------------------------------------------------------------------------
  // Alibaba Qwen (2)
  // -------------------------------------------------------------------------
  [
    "qwen/qwen3-coder-plus",
    {
      cli: "qwen",
      cli_model: "qwen3-coder-plus",
      supports: {
        effort: { type: "binary-thinking" },
        apply_patch: false,
        task_budget: false,
        prompt_cache: false,
        computer_use: false,
        native_dispatch_from: [],
        api_only: false,
      },
      auth_hint:
        "Qwen Code 구독 필요 (API 키 재인증 필요 — OAuth 2026-04-15 폐지)",
    } satisfies ModelSpec,
  ],
  [
    "qwen/qwen3-coder-next",
    {
      cli: "qwen",
      cli_model: "qwen3-coder-next",
      supports: {
        effort: { type: "binary-thinking" },
        apply_patch: false,
        task_budget: false,
        prompt_cache: false,
        computer_use: false,
        native_dispatch_from: [],
        api_only: false,
      },
      auth_hint:
        "Qwen Code 구독 필요 (API 키 재인증 필요 — OAuth 2026-04-15 폐지)",
    } satisfies ModelSpec,
  ],

  // -------------------------------------------------------------------------
  // Intentionally excluded: api_only entries
  // These are present solely to exercise the initialization guard.
  // They MUST never appear in the exported CORE_REGISTRY.
  // -------------------------------------------------------------------------
  [
    "openai/gpt-5.4-nano",
    {
      cli: "codex",
      cli_model: "gpt-5.4-nano",
      supports: {
        effort: {
          type: "granular",
          levels: ["none", "low", "medium", "high", "xhigh"],
        },
        apply_patch: false,
        task_budget: false,
        prompt_cache: false,
        computer_use: false,
        native_dispatch_from: [],
        api_only: true,
      },
      auth_hint: "API 전용 — CLI 미지원",
    } satisfies ModelSpec,
  ],
]);

// ---------------------------------------------------------------------------
// Initialization guard: filter api_only:true entries and warn
// ---------------------------------------------------------------------------

function buildCoreRegistry(): ReadonlyMap<string, ModelSpec> {
  const filtered = new Map<string, ModelSpec>();
  for (const [slug, spec] of RAW_REGISTRY) {
    if (spec.supports.api_only) {
      console.warn(
        `[model-registry] Excluding "${slug}": api_only=true is not supported in CLI-only mode.`,
      );
      continue;
    }
    filtered.set(slug, spec);
  }
  return filtered as ReadonlyMap<string, ModelSpec>;
}

// ---------------------------------------------------------------------------
// Zod schema for user-provided ModelSpec validation
// ---------------------------------------------------------------------------

const RuntimeIdSchema = z.enum([
  "claude",
  "codex",
  "gemini",
  "antigravity",
  "qwen",
]);

const EffortLevelSchema = z.enum(["none", "low", "medium", "high", "xhigh"]);

const ThinkingModeSchema = z.enum(["none", "dynamic", "fixed"]);

const EffortSpecSchema = z.union([
  z.object({ type: z.literal("granular"), levels: z.array(EffortLevelSchema) }),
  z.object({ type: z.literal("cli-session"), auto_default: EffortLevelSchema }),
  z.object({
    type: z.literal("thinking-budget"),
    modes: z.array(ThinkingModeSchema),
  }),
  z.object({ type: z.literal("binary-thinking") }),
  z.null(),
]);

const ModelSpecSchema = z.object({
  cli: z.enum(["claude", "codex", "gemini", "qwen"]),
  cli_model: z.string().min(1),
  supports: z.object({
    effort: EffortSpecSchema,
    apply_patch: z.boolean(),
    task_budget: z.boolean(),
    prompt_cache: z.boolean(),
    computer_use: z.boolean(),
    native_dispatch_from: z.array(RuntimeIdSchema),
    api_only: z.boolean(),
  }),
  pricing_note: z.string().optional(),
  auth_hint: z.string().min(1),
  subscription_tier: z.string().optional(),
});

// ---------------------------------------------------------------------------
// User models.yaml loader — testable internal
// ---------------------------------------------------------------------------

/**
 * Walk up the directory tree from startDir looking for relativePath.
 * Returns the absolute file path if found, or null.
 */
function findFileUp(startDir: string, relativePath: string): string | null {
  let current = path.resolve(startDir);
  const root = path.parse(current).root;
  while (current !== root) {
    const candidate = path.join(current, relativePath);
    if (fs.existsSync(candidate)) return candidate;
    current = path.dirname(current);
  }
  return null;
}

/**
 * Load and validate user-provided model entries from .agents/config/models.yaml.
 * Returns only valid, non-api_only entries as a Map.
 * Malformed YAML → logs error, returns empty Map.
 * Invalid entry → logs error, skips that entry.
 * api_only entry → logs warning, skips that entry.
 *
 * This is exported for unit-testing purposes.
 */
export function loadUserModels(cwd?: string): Map<string, ModelSpec> {
  const result = new Map<string, ModelSpec>();
  const searchDir = cwd ?? process.cwd();

  const filePath = findFileUp(
    searchDir,
    path.join(".agents", "config", "models.yaml"),
  );
  if (!filePath) return result;

  let raw: unknown;
  try {
    const content = fs.readFileSync(filePath, "utf-8");
    raw = parseYaml(content);
  } catch (err) {
    console.error(
      `[model-registry] Failed to parse .agents/config/models.yaml: ${err instanceof Error ? err.message : String(err)}`,
    );
    return result;
  }

  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    console.error(
      "[model-registry] .agents/config/models.yaml: root must be an object with a 'models' key.",
    );
    return result;
  }

  const rootObj = raw as Record<string, unknown>;
  if (
    !("models" in rootObj) ||
    typeof rootObj.models !== "object" ||
    rootObj.models === null ||
    Array.isArray(rootObj.models)
  ) {
    // No models key — treat as empty (not an error, e.g. empty file with comments)
    return result;
  }

  const models = rootObj.models as Record<string, unknown>;

  for (const [slug, entry] of Object.entries(models)) {
    const parsed = ModelSpecSchema.safeParse(entry);
    if (!parsed.success) {
      console.error(
        `[model-registry] User entry "${slug}" failed validation — skipping. Errors: ${parsed.error.issues.map((i) => i.message).join("; ")}`,
      );
      continue;
    }

    const spec = parsed.data as ModelSpec;

    if (spec.supports.api_only) {
      console.warn(
        `[model-registry] User entry "${slug}": api_only=true is not supported in CLI-only mode — skipping.`,
      );
      continue;
    }

    result.set(slug, spec);
  }

  return result;
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
 * Core model registry. Contains exactly 12 CLI-compatible slugs from the
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
