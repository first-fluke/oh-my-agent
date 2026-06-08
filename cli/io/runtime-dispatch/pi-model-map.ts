import { ConfigError } from "./config-error.js";
import type { AgentPlan } from "./types.js";

/**
 * Registry owners whose models pi can actually run. pi is a multi-provider
 * proxy (BYOK) that routes to real LLM providers, so only models owned by a
 * genuine provider are dispatchable. CLI-proprietary owners (cursor, kiro,
 * qwen, antigravity) name models that exist only inside their own CLIs and
 * cannot be addressed through pi's `--model`.
 */
const PI_RUNNABLE_PROVIDERS = new Set(["anthropic", "openai", "google"]);

/**
 * Translate an oma registry slug (`owner/slug`) into pi's `--model` argument
 * (`provider/modelId`). The two share the same shape, and pi performs fuzzy
 * pattern matching on `--model`, so a real-provider slug passes through
 * unchanged and pi resolves it against the user's authenticated catalog.
 *
 * Throws ConfigError when the model's owner is not a provider pi proxies to —
 * pi transport is only meaningful with real-provider presets (claude / codex /
 * gemini / mixed), not CLI-proprietary ones (cursor / kiro / qwen / antigravity).
 *
 * TODO(oma-deferred): pi's catalog is release-tracked and auth-gated; verify
 * unresolved slugs at runtime via `pi --list-models` (see doctor probe).
 */
export function toPiModel(slug: string): string {
  const slashIdx = slug.indexOf("/");
  if (slashIdx === -1) {
    // Bare id (no owner) — let pi's fuzzy matcher resolve it.
    return slug;
  }

  const provider = slug.slice(0, slashIdx);
  if (PI_RUNNABLE_PROVIDERS.has(provider)) {
    return slug;
  }

  throw new ConfigError(
    `Model "${slug}" cannot be dispatched via pi: "${provider}" is a CLI-proprietary ` +
      `owner, not an LLM provider pi proxies to. Use a real-provider preset ` +
      `(claude, codex, gemini, or mixed) when dispatching agents through pi.`,
  );
}

export type PiThinkingLevel =
  | "off"
  | "minimal"
  | "low"
  | "medium"
  | "high"
  | "xhigh";

/**
 * Resolve pi's `--thinking <level>` value from an AgentPlan. pi's levels are a
 * superset of oma's effort levels (`none` maps to pi `off`; the rest are
 * identical), so the translation is near 1:1.
 *
 * Priority: explicit `thinking` boolean override > effort level. Returns null
 * when no thinking signal is present, so the caller omits the flag and pi uses
 * its model default.
 */
export function toPiThinking(plan: AgentPlan): PiThinkingLevel | null {
  if (plan.thinking === false) return "off";
  if (plan.thinking === true && plan.effort === undefined) return "high";

  switch (plan.effort) {
    case "none":
      return "off";
    case "low":
      return "low";
    case "medium":
      return "medium";
    case "high":
      return "high";
    case "xhigh":
      return "xhigh";
    default:
      return null;
  }
}
