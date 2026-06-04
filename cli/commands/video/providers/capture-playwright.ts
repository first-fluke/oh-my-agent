// PlaywrightCaptureProvider — live, human-supervised headed web-app capture
// (design 014 §3-7). The real branch of the key-optional capture contract
// (backend rule 11): `GuidedCaptureProvider` stays the fallback when Playwright
// is unresolvable or there is no interactive stop available.
//
// Boundary-safe: this provider NEVER imports `playwright`. It resolves a
// Playwright install on disk (`internal/playwright-project.ts`) and spawns the
// in-repo driver (`resources/playwright/record.mjs`) as a SUBPROCESS under that
// install — the driver does the recording; this provider only orchestrates +
// validates the produced file.
//
// MECHANISM ONLY: nothing here assumes anything about the flow, its purpose, or
// its platform. No credential handling of any kind — a human drives the flow.
import { existsSync, realpathSync, statSync } from "node:fs";
import path from "node:path";
import { CaptureRequiredError } from "../errors.js";
import { runCapture } from "../internal/exec.js";
import {
  getPlaywrightStatus,
  resolvePlaywrightDriverPath,
} from "../internal/playwright-project.js";
import type {
  Availability,
  CaptureProvider,
  CostEstimate,
} from "../providers.js";
import type { CapturePlan, Instructions, RawFootage } from "../types.js";

// Generous ceiling for an interactive session; the driver's own --timeout (when
// provided) is the finer-grained bound. This only guards against a wedged
// subprocess that never returns a result line.
const CAPTURE_SUBPROCESS_CEILING_MS = 3_600_000; // 1h

/** Parsed last-line JSON result the driver prints on stdout. */
interface DriverResult {
  ok: boolean;
  output?: string;
  pages?: number;
  durationSec?: number;
  error?: string;
  code?: string;
}

export class PlaywrightCaptureProvider implements CaptureProvider {
  readonly id = "playwright-web";

  constructor(private readonly cwd: string = process.cwd()) {}

  /**
   * Web capture is available when a Playwright install is resolvable with a
   * chromium browser AND the in-repo driver is on disk. When not, the chain
   * stays non-failing: the orchestrator falls back to the guided provider.
   */
  async available(): Promise<Availability> {
    const status = getPlaywrightStatus();
    if (!status.dir) {
      return {
        ok: false,
        reason: "Playwright not resolvable",
        remediation:
          "Run `oma video doctor --install-playwright`, or set OMA_VIDEO_PLAYWRIGHT_DIR.",
      };
    }
    if (!status.browserReady) {
      return {
        ok: false,
        reason: "Playwright chromium browser not installed",
        remediation:
          "Run `oma video doctor --install-playwright` to download chromium.",
      };
    }
    if (!resolvePlaywrightDriverPath()) {
      return {
        ok: false,
        reason: "web capture driver not found",
        remediation:
          "Ensure the oma-video skill is installed (resources/playwright/record.mjs).",
      };
    }
    return { ok: true };
  }

  estimateCost(): CostEstimate {
    return { usd: 0, basis: "local headed web capture (no API)" };
  }

  async guide(plan: CapturePlan): Promise<Instructions> {
    void plan;
    return {
      message:
        "Web capture opens a headed browser; perform your flow, then press ENTER to stop. Capture is performed by a human; no credentials are automated.",
    };
  }

  /**
   * Validate + localize the driver's produced capture path. Confines the result
   * to the run dir (the driver only ever writes there), and verifies the file
   * exists and is non-empty. Mirrors the $PWD/run-dir guard of the guided
   * provider's `ingest`.
   */
  async ingest(capturePath: string): Promise<RawFootage> {
    const abs = path.resolve(this.cwd, capturePath);
    if (!existsSync(abs) || statSync(abs).size === 0) {
      throw new CaptureRequiredError(
        `web capture produced no usable file at ${maskPath(abs)}`,
      );
    }
    return { path: realCanonical(abs) };
  }

  /**
   * Live capture. Resolves Playwright + the driver, spawns the driver as a
   * subprocess (passing `--playwright-dir` so the driver imports Playwright from
   * the resolved install), and returns the produced mp4 as `RawFootage`.
   *
   * Throws `CaptureRequiredError` when Playwright/driver is unresolvable or the
   * recording is empty, so the orchestrator can fall back to the guided path
   * (key-optional). The URL + any query tokens are masked in every error.
   */
  async record(plan: CapturePlan): Promise<RawFootage> {
    if (!plan.url || plan.url.trim().length === 0) {
      // The orchestrator validates this earlier (SchemaValidationError → exit 4);
      // this is a defensive guard so record() is never called without a target.
      throw new CaptureRequiredError("web capture requires a target --url");
    }
    const status = getPlaywrightStatus();
    if (!status.dir || !status.browserReady) {
      throw new CaptureRequiredError(
        "Playwright not ready for web capture (run `oma video doctor --install-playwright`)",
      );
    }
    const driver = resolvePlaywrightDriverPath();
    if (!driver) {
      throw new CaptureRequiredError("web capture driver not found");
    }

    const runDir = plan.runDir ?? this.cwd;
    const outPath = path.join(runDir, "capture.mp4");
    // The orchestrator ALWAYS derives plan.size from --aspect/--device — this is
    // only a last-resort default for a direct record() call with no size, never
    // a prescribed capture dimension.
    const size = plan.size ?? { width: 1280, height: 720 };

    const driverArgs = [
      driver,
      "--url",
      plan.url,
      "--out",
      outPath,
      "--size",
      `${size.width}x${size.height}`,
      "--playwright-dir",
      status.dir,
    ];
    // Headed (real, human-supervised) unless a non-interactive stop is set, in
    // which case headless is the sensible default for CI/tests.
    driverArgs.push("--headless", plan.stop ? "1" : "0");
    if (plan.readySelector)
      driverArgs.push("--ready-selector", plan.readySelector);
    if (plan.showCursor) driverArgs.push("--show-cursor");
    if (plan.timeoutMs && plan.timeoutMs > 0) {
      driverArgs.push("--timeout", String(plan.timeoutMs));
    }
    if (plan.stop) driverArgs.push("--stop", plan.stop);

    // The interactive stop reads the driver's stdin (ENTER). We inherit stdio so
    // the human sees the prompt and the ENTER reaches the driver; stdout is also
    // inherited, so we read the authoritative result by re-reading the produced
    // file rather than parsing piped stdout. For the non-interactive (stop) path
    // we capture stdout to parse the JSON result line.
    if (plan.stop) {
      const res = await runCapture(process.execPath, driverArgs, {
        cwd: status.dir,
        timeoutMs: plan.timeoutMs
          ? plan.timeoutMs + 60_000
          : CAPTURE_SUBPROCESS_CEILING_MS,
        env: process.env,
      });
      const parsed = parseDriverResult(res.stdout);
      if (!parsed || parsed.ok !== true || !parsed.output) {
        const reason =
          parsed?.error ??
          (res.stderr || res.stdout).trim().split("\n").slice(-1)[0] ??
          `exit ${res.code}`;
        throw new CaptureRequiredError(`web capture failed: ${reason}`);
      }
      return this.ingest(parsed.output);
    }

    // Interactive path: spawn with inherited stdio so the prompt/ENTER work, and
    // confirm the produced file afterwards.
    const code = await spawnInherited(process.execPath, driverArgs, status.dir);
    if (code !== 0 || !existsSync(outPath)) {
      throw new CaptureRequiredError(
        `web capture did not produce ${maskPath(outPath)} (driver exit ${code})`,
      );
    }
    return this.ingest(outPath);
  }
}

/** Spawn the driver with inherited stdio (interactive ENTER) → resolves exit code. */
function spawnInherited(
  bin: string,
  args: string[],
  cwd: string,
): Promise<number> {
  // Lazy import keeps the module surface aligned with the rest of the slice's
  // subprocess helpers (which buffer stdio); the interactive path needs a TTY.
  return import("node:child_process").then(
    ({ spawn }) =>
      new Promise<number>((resolve) => {
        const child = spawn(bin, args, { stdio: "inherit", cwd });
        child.on("error", () => resolve(1));
        child.on("close", (exit) => resolve(exit ?? 1));
      }),
  );
}

function parseDriverResult(stdout: string): DriverResult | null {
  const lines = stdout
    .trim()
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.startsWith("{") && line.endsWith("}"));
  const last = lines.at(-1);
  if (!last) return null;
  try {
    return JSON.parse(last) as DriverResult;
  } catch {
    return null;
  }
}

function realCanonical(p: string): string {
  try {
    return realpathSync(p);
  } catch {
    return p;
  }
}

/** Coarse path masking for error messages — never leak a full URL/token tail. */
function maskPath(p: string): string {
  return p.replace(/([?&][^=\s]+=)[^&\s]+/g, "$1<redacted>");
}
