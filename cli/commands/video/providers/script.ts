// ScriptProvider — agent-authored script is the default contract (design 013
// §1.5 "agent-as-key", §4.1). The agent (or a future MPT-LLM call) injects a
// richer script; absent an injection we emit a deterministic skeleton so the
// determinism boundary (script.json) is always well-formed and key-free.
import type {
  Availability,
  CostEstimate,
  ScriptOpts,
  ScriptProvider,
} from "../providers.js";
import { type Brief, type Script, VIDEO_SCHEMA_VERSION } from "../types.js";

/**
 * An injectable script source. The agent runtime (or a workflow step) sets this
 * to hand a fully-authored script to the orchestrator. When unset, the provider
 * falls back to a deterministic skeleton derived from the brief.
 */
export type ScriptInjector = (
  brief: Brief,
  opts: ScriptOpts,
) => Script | undefined;

export class AgentScriptProvider implements ScriptProvider {
  readonly id = "agent-script";

  constructor(private readonly injector?: ScriptInjector) {}

  async available(): Promise<Availability> {
    // Agent-authored scripts need no external key or service.
    return { ok: true };
  }

  estimateCost(): CostEstimate {
    return { usd: 0, basis: "agent-authored (no LLM key)" };
  }

  async generate(brief: Brief, opts: ScriptOpts): Promise<Script> {
    const injected = this.injector?.(brief, opts);
    if (injected) {
      // The agent supplied a richer script; trust it but keep the contract.
      return { ...injected, schemaVersion: VIDEO_SCHEMA_VERSION };
    }
    // TODO(oma-deferred): MPT-LLM — when --compositor mpt + an LLM key is
    // provisioned, route script generation through MoneyPrinterTurbo's
    // custom-script endpoint instead of this deterministic skeleton.
    return buildSkeletonScript(brief, opts);
  }
}

/**
 * Deterministic skeleton script. Pure function of the brief + opts (no clock,
 * no randomness), so script.json is byte-identical on replay.
 */
export function buildSkeletonScript(brief: Brief, opts: ScriptOpts): Script {
  const sceneCount = Math.max(1, Math.min(opts.maxScenes, 3));
  const duration = brief.durationSec ?? (brief.mode === "shorts" ? 30 : 60);
  const perScene = Math.max(1, Math.round(duration / sceneCount));
  const title = makeTitle(brief.text);
  return {
    schemaVersion: VIDEO_SCHEMA_VERSION,
    mode: brief.mode,
    aspect: brief.aspect,
    locale: brief.locale,
    title,
    music: "none",
    brand: {},
    scenes: Array.from({ length: sceneCount }, (_, idx) => {
      const n = idx + 1;
      return {
        id: `scene-${String(n).padStart(2, "0")}`,
        durationSec: perScene,
        narration: `${title}. Scene ${n}.`,
        onScreenText: [`Scene ${n}`],
        visual: {
          kind: brief.mode === "explainer" ? "slide" : "still",
          prompt: `${brief.text} -- scene ${n}`,
          source: "agent-skeleton",
        },
        transition: idx === sceneCount - 1 ? "none" : "cut",
      };
    }),
  };
}

function makeTitle(brief: string): string {
  const clean = brief.trim().replace(/\s+/g, " ");
  if (clean.length <= 64) return clean;
  return clean.slice(0, 61).trimEnd();
}
