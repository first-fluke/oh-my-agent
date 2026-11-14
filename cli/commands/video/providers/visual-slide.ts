// VisualProvider:slide — oma-slide png frames for explainer mode (design §5).
//
// Key-optional, two-branch contract (backend rule 11):
//   real     : `oma slide export png --workspace <deck> --output-dir
//              <runDir>/visuals/slides` → ingest the exported 1920×1080 frame
//              for the scene.
//   fallback : deterministic placeholder asset.
//
// A deck is only available when the scene carries a slide ref. Mock and dry-run
// take the placeholder branch. A real run that cannot export a frame (missing
// deck, no Chromium, failed export) throws, so the visual chain moves on to the
// next provider instead of settling for a slide placeholder.
// Boundary-safe: invokes the slide slice via its CLI surface.
import { existsSync } from "node:fs";
import { readdir } from "node:fs/promises";
import path from "node:path";
import { findChromeExecutable } from "@cli/io/chrome";
import { resolveOmaInvocation, runCapture } from "../internal/exec.js";
import { isMockMode } from "../internal/mock.js";
import { omaSlideExportPngArgs } from "../internal/sibling-cli.js";
import type {
  Availability,
  CostEstimate,
  VisualOpts,
  VisualProvider,
} from "../providers.js";
import type { Scene, VisualAsset } from "../types.js";
import { ingestVisual, writePlaceholder } from "./visual-shared.js";

export class OmaSlideVisualProvider implements VisualProvider {
  readonly id = "oma-slide";
  readonly kind = "still" as const;

  async available(): Promise<Availability> {
    return { ok: true };
  }

  estimateCost(): CostEstimate {
    // oma-slide internally calls oma-image (same OAuth/free layering).
    return { usd: 0, basis: "oma-slide (Chromium png export)" };
  }

  async produce(scene: Scene, opts: VisualOpts): Promise<VisualAsset> {
    if (isMockMode() || opts.dryRun) {
      return writePlaceholder(scene, opts, this.id);
    }
    const deckDir = scene.visual.ref;
    if (!deckDir || !existsSync(deckDir)) {
      throw new Error(
        `no slide deck for ${scene.id}: ${deckDir ?? "visual.ref is not set"}`,
      );
    }
    if (!findChromeExecutable()) {
      throw new Error("no Chrome/Chromium for the slide png export");
    }
    const frame = await this.exportFrame(deckDir, opts);
    if (!frame) {
      throw new Error(`slide png export produced no frame for ${scene.id}`);
    }
    return ingestVisual(scene, opts.runDir, frame, "slide", this.id);
  }

  /** Run the headless png export and return the first frame path, or null. */
  private async exportFrame(
    deckDir: string,
    opts: VisualOpts,
  ): Promise<string | null> {
    const outDir = path.join(opts.runDir, "visuals", "slides");
    const { bin, prefixArgs } = resolveOmaInvocation();
    const res = await runCapture(
      bin,
      [...prefixArgs, ...omaSlideExportPngArgs(deckDir, outDir)],
      { timeoutMs: opts.timeoutMs },
    );
    if (res.code !== 0 || !existsSync(outDir)) return null;
    const frames = (await readdir(outDir).catch(() => []))
      .filter((file) => /\.png$/i.test(file))
      .sort();
    const first = frames[0];
    return first ? path.join(outDir, first) : null;
  }
}
