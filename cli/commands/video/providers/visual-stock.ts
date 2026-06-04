// VisualProvider:stock — Pexels stock video (design §4.5).
//
// Key-optional, two-branch contract (backend rule 11):
//   real     : gated on PEXELS_API_KEY — query the Pexels API, download the
//              clip, localize it into runDir/visuals.
//   fallback : delegate to oma-image stills (the orchestrator's visual chain
//              already lists oma-image after pexels, so when this provider is
//              unavailable the chain advances; when it is available but a query
//              yields nothing we emit a placeholder so the scene is never empty).
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { http } from "@cli/io/http";
import { isMockMode } from "../internal/mock.js";
import type {
  Availability,
  CostEstimate,
  VisualOpts,
  VisualProvider,
} from "../providers.js";
import type { Scene, VisualAsset } from "../types.js";
import { writePlaceholder } from "./visual-shared.js";

const PEXELS_API = "https://api.pexels.com/videos/search";

export class PexelsVisualProvider implements VisualProvider {
  readonly id = "pexels";
  readonly kind = "clip" as const;

  async available(): Promise<Availability> {
    if (isMockMode() || !process.env.PEXELS_API_KEY) {
      return {
        ok: false,
        reason: "PEXELS_API_KEY missing",
        remediation: "Set PEXELS_API_KEY or use the oma-image fallback.",
      };
    }
    return { ok: true };
  }

  estimateCost(): CostEstimate {
    return { usd: 0, basis: "Pexels free API" };
  }

  async produce(scene: Scene, opts: VisualOpts): Promise<VisualAsset> {
    // dry-run plans without hitting the Pexels API.
    if (opts.dryRun) {
      return writePlaceholder(scene, opts, this.id);
    }
    // available() already gated on the key; reaching here means it is present.
    const clipUrl = await this.search(scene);
    if (!clipUrl) {
      // Query miss: emit a placeholder rather than throwing, so the run still
      // completes (the manifest records the fallback).
      return writePlaceholder(scene, opts, this.id);
    }
    const downloaded = await this.download(clipUrl, scene, opts.runDir);
    if (!downloaded) {
      return writePlaceholder(scene, opts, this.id);
    }
    return {
      sceneId: scene.id,
      path: downloaded,
      type: "video",
      providerId: this.id,
      pathTaken: "real",
    };
  }

  private async search(scene: Scene): Promise<string | null> {
    const query =
      scene.visual.prompt || scene.onScreenText.join(" ") || scene.id;
    try {
      const res = await http.get(PEXELS_API, {
        params: { query, per_page: 1, orientation: "portrait" },
        headers: { Authorization: process.env.PEXELS_API_KEY ?? "" },
        timeout: 15000,
        validateStatus: () => true,
      });
      if (res.status !== 200) return null;
      const data = res.data as {
        videos?: Array<{ video_files?: Array<{ link: string }> }>;
      };
      return data.videos?.[0]?.video_files?.[0]?.link ?? null;
    } catch {
      return null;
    }
  }

  private async download(
    url: string,
    scene: Scene,
    runDir: string,
  ): Promise<string | null> {
    try {
      const res = await http.get(url, {
        responseType: "arraybuffer",
        timeout: 60000,
      });
      await mkdir(path.join(runDir, "visuals"), { recursive: true });
      const rel = path.join("visuals", `${scene.id}-pexels.mp4`);
      await writeFile(path.join(runDir, rel), Buffer.from(res.data));
      return rel;
    } catch {
      return null;
    }
  }
}
