// CaptureProvider — Cap / openscreen demo capture (design §5, §7 Tier-2).
//
// Two-branch contract (backend rule 11):
//   real (guided) : Cap CLI is triggered when present; otherwise the human
//                   performs the capture and passes --capture <path>. The first
//                   run states "capture is performed by a human."
//   fallback      : when neither a Cap CLI nor a --capture path is available,
//                   surface a CaptureRequiredError → guided protocol (not a
//                   hard fail).
//
// `ingest` absolutizes + $PWD-guards + format-validates the supplied path
// (design §5, §7 Tier-1 capture-path safety).
import { existsSync, realpathSync } from "node:fs";
import path from "node:path";
import { CaptureRequiredError, SchemaValidationError } from "../errors.js";
import { binaryAvailable } from "../internal/exec.js";
import type {
  Availability,
  CaptureProvider,
  CostEstimate,
} from "../providers.js";
import type { CapturePlan, Instructions, RawFootage } from "../types.js";

const ALLOWED_CAPTURE_EXT = new Set([".mp4", ".mov", ".webm", ".mkv"]);

export class GuidedCaptureProvider implements CaptureProvider {
  readonly id = "cap";

  constructor(private readonly cwd: string = process.cwd()) {}

  async available(): Promise<Availability> {
    // Guided capture is always reachable (human-in-the-loop), so report
    // available; the orchestrator only invokes capture in demo mode.
    return { ok: true };
  }

  estimateCost(): CostEstimate {
    return { usd: 0, basis: "guided / Cap CLI capture" };
  }

  async guide(plan: CapturePlan): Promise<Instructions> {
    const hasCap = (await binaryAvailable("cap", ["--version"])).ok;
    if (plan.capturePath) {
      return {
        message:
          "Using the supplied --capture recording. Capture is performed by a human.",
      };
    }
    if (hasCap) {
      return {
        message:
          "Cap CLI detected. Record your walkthrough, then re-run with --capture <path>. Capture is performed by a human.",
      };
    }
    return {
      message:
        "No capture tool detected. Record your demo (Cap / openscreen / screen recorder), then re-run with --capture <path>. Capture is performed by a human.",
    };
  }

  /**
   * Validate + localize a capture path. Absolutizes against $PWD, blocks paths
   * that escape $PWD (unless they resolve inside it), and validates the file
   * exists with a known video extension.
   */
  async ingest(capturePath: string): Promise<RawFootage> {
    if (!capturePath || capturePath.trim().length === 0) {
      throw new CaptureRequiredError(
        "demo mode requires --capture <path> (capture is performed by a human).",
      );
    }
    const abs = path.resolve(this.cwd, capturePath);
    if (!existsSync(abs)) {
      throw new SchemaValidationError(
        `--capture path does not exist: ${abs}`,
        "capture",
      );
    }
    const ext = path.extname(abs).toLowerCase();
    if (!ALLOWED_CAPTURE_EXT.has(ext)) {
      throw new SchemaValidationError(
        `--capture must be a video file (${[...ALLOWED_CAPTURE_EXT].join(", ")}); got "${ext || "no extension"}"`,
        "capture",
      );
    }
    const canonical = realCanonical(abs);
    const canonicalCwd = realCanonical(this.cwd);
    const rel = path.relative(canonicalCwd, canonical);
    if (rel.startsWith("..") || path.isAbsolute(rel)) {
      throw new SchemaValidationError(
        `--capture path "${capturePath}" is outside $PWD.`,
        "capture",
      );
    }
    return { path: canonical };
  }
}

function realCanonical(p: string): string {
  try {
    return realpathSync(p);
  } catch {
    return p;
  }
}
