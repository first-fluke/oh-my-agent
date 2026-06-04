// VisualProvider:aigc — Pixelle-MCP / RunningHub AIGC video (design §4.5, §5).
//
// Off by default (community MCP + paid RunningHub credits). Key-optional,
// two-branch contract (backend rule 11):
//   real     : gated on RUNNINGHUB_API_KEY + one-time consent — Pixelle-MCP at
//              localhost:9004/pixelle/mcp produces an AIGC clip. The live MCP
//              wiring is deferred (cannot be exercised in-process / in tests).
//   fallback : delegate to oma-image stills (the orchestrator's visual chain
//              lists oma-image after pixelle; an unavailable provider advances
//              the chain).
import { isMockMode } from "../internal/mock.js";
import type {
  Availability,
  CostEstimate,
  VisualOpts,
  VisualProvider,
} from "../providers.js";
import type { Scene, VisualAsset } from "../types.js";
import { writePlaceholder } from "./visual-shared.js";

export class PixelleVisualProvider implements VisualProvider {
  readonly id = "pixelle";
  readonly kind = "clip" as const;

  async available(): Promise<Availability> {
    if (isMockMode() || !process.env.RUNNINGHUB_API_KEY) {
      return {
        ok: false,
        reason: "RUNNINGHUB_API_KEY missing (Pixelle off by default)",
        remediation:
          "Optional: run `uvx pixelle@latest`, review the community MCP, then set RUNNINGHUB_API_KEY.",
      };
    }
    return { ok: true };
  }

  estimateCost(): CostEstimate {
    // RunningHub credits are paid; surface a non-zero estimate so the cost gate
    // (--max-usd) engages before any AIGC generation runs.
    return { usd: 0.2, basis: "Pixelle-MCP / RunningHub credits (estimate)" };
  }

  async produce(scene: Scene, opts: VisualOpts): Promise<VisualAsset> {
    // TODO(oma-deferred): pixelle — connect Pixelle-MCP at
    // http://localhost:9004/pixelle/mcp (after consent), submit the scene
    // prompt to a RunningHub workflow, poll for the clip, and localize it into
    // runDir/visuals. The live MCP transport is not wired in this process, so
    // until then we emit a deterministic placeholder.
    return writePlaceholder(scene, opts, this.id);
  }
}
