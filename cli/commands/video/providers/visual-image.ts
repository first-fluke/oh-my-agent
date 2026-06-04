// VisualProvider:generate — oma-image stills (design 013 §5).
//
// Key-optional, two-branch contract (backend rule 11):
//   real     : spawn `oma image generate "<prompt>" --vendor auto
//              --size <16-multiple> --format json --out <runDir>/visuals`,
//              parse the JSON manifest, localize the produced file.
//   fallback : deterministic placeholder asset.
//
// Boundary-safe: invokes the image slice via its CLI surface, never imports it
// (cli/ARCHITECTURE.md). Availability is gated on oma-image having a healthy
// vendor; in mock mode we always take the deterministic placeholder branch.
import { readFile } from "node:fs/promises";
import path from "node:path";
import { resolveOmaInvocation, runCapture } from "../internal/exec.js";
import { isMockMode } from "../internal/mock.js";
import { checkOmaImage } from "../internal/readiness.js";
import type {
  Availability,
  CostEstimate,
  VisualOpts,
  VisualProvider,
} from "../providers.js";
import {
  type Scene,
  snapAspectToImageSize,
  type VisualAsset,
} from "../types.js";
import { ingestVisual, writePlaceholder } from "./visual-shared.js";

export class OmaImageVisualProvider implements VisualProvider {
  readonly id = "oma-image";
  readonly kind = "still" as const;

  async available(): Promise<Availability> {
    // The placeholder fallback is always available, so this provider never
    // hard-fails the visual chain; produce() decides real-vs-fallback.
    return { ok: true };
  }

  estimateCost(): CostEstimate {
    // oma-image vendors are OAuth/free-tier (codex / antigravity / pollinations);
    // treat as zero for the cost gate, which is reserved for paid AIGC credits.
    return { usd: 0, basis: "oma-image (OAuth / free vendors)" };
  }

  async produce(scene: Scene, opts: VisualOpts): Promise<VisualAsset> {
    // dry-run / mock plan the run without probing or generating real assets.
    if (isMockMode() || opts.dryRun) {
      return writePlaceholder(scene, opts, this.id);
    }
    const health = await checkOmaImage();
    if (!health.ok) {
      return writePlaceholder(scene, opts, this.id);
    }
    const produced = await this.runOmaImage(scene, opts);
    if (!produced) {
      return writePlaceholder(scene, opts, this.id);
    }
    return ingestVisual(scene, opts.runDir, produced, "image", this.id);
  }

  /** Spawn oma-image and return the produced file path, or null on any miss. */
  private async runOmaImage(
    scene: Scene,
    opts: VisualOpts,
  ): Promise<string | null> {
    const { width, height } = snapAspectToImageSize(opts.aspect);
    const prompt =
      scene.visual.prompt || scene.onScreenText.join(" ") || scene.id;
    const outDir = path.join(opts.runDir, "visuals");
    const { bin, prefixArgs } = resolveOmaInvocation();
    const res = await runCapture(
      bin,
      [
        ...prefixArgs,
        "image",
        "generate",
        prompt,
        "--vendor",
        "auto",
        "--size",
        `${width}x${height}`,
        "--format",
        "json",
        "--out",
        outDir,
      ],
      { timeoutMs: opts.timeoutMs },
    );
    if (!res.stdout.trim()) return null;
    return extractFirstFile(res.stdout);
  }
}

/**
 * Parse `oma image generate --format json` output and return the first produced
 * file. The CLI prints `{ exitCode, manifestPath, runs: [{ files: [...] }] }`;
 * we read either an inline `files` array or fall back to the manifest's runs.
 */
export async function extractFirstFile(stdout: string): Promise<string | null> {
  let parsed: {
    runs?: Array<{ files?: string[]; status?: string }>;
    manifestPath?: string;
  };
  try {
    parsed = JSON.parse(lastJsonLine(stdout));
  } catch {
    return null;
  }
  const inline = parsed.runs
    ?.filter((run) => run.status === "ok" || run.status === undefined)
    .flatMap((run) => run.files ?? [])[0];
  if (inline) return inline;
  if (parsed.manifestPath) {
    try {
      const manifest = JSON.parse(
        await readFile(parsed.manifestPath, "utf8"),
      ) as {
        runs?: Array<{ files?: string[]; status?: string }>;
      };
      return (
        manifest.runs
          ?.filter((run) => run.status === "ok")
          .flatMap((run) => run.files ?? [])[0] ?? null
      );
    } catch {
      return null;
    }
  }
  return null;
}

function lastJsonLine(stdout: string): string {
  const lines = stdout
    .trim()
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
  for (let i = lines.length - 1; i >= 0; i -= 1) {
    const line = lines[i];
    if (line && (line.startsWith("{") || line.startsWith("["))) return line;
  }
  return stdout.trim();
}
