// Readiness probes shared by `oma video doctor`, list-providers, and the
// provider `available()` implementations. Each probe is side-effect-free and
// returns a uniform shape so the doctor can render a table and the orchestrator
// can gate real-vs-fallback branches off the same source of truth.
import { findChromeExecutable } from "@cli/io/chrome";
import { http } from "@cli/io/http";
import { binaryAvailable, resolveOmaInvocation, runCapture } from "./exec.js";
import { getMptProjectStatus } from "./mpt-project.js";
import { getPlaywrightStatus } from "./playwright-project.js";
import { getRemotionProjectStatus } from "./remotion-project.js";

export interface ReadinessCheck {
  name: string;
  ok: boolean;
  detail: string;
  remediation?: string;
}

export const VOICEBOX_BASE_URL =
  process.env.OMA_VOICEBOX_URL ?? "http://127.0.0.1:17493";

/** FFmpeg presence — required by Remotion/MPT to mux audio + frames. */
export async function checkFfmpeg(): Promise<ReadinessCheck> {
  const probe = await binaryAvailable("ffmpeg", ["-version"]);
  return {
    name: "ffmpeg",
    ok: probe.ok,
    detail: probe.ok ? probe.detail : "not found",
    remediation: probe.ok
      ? undefined
      : "Install FFmpeg (brew install ffmpeg / apt install ffmpeg).",
  };
}

/** Node runtime — always present when this code runs, reported for completeness. */
export function checkNode(): ReadinessCheck {
  return { name: "node", ok: true, detail: process.version };
}

/** System Chromium — required by Remotion render + oma-slide png export. */
export function checkChromium(): ReadinessCheck {
  const chrome = findChromeExecutable();
  return {
    name: "chromium",
    ok: Boolean(chrome),
    detail: chrome ?? "not found",
    remediation: chrome
      ? undefined
      : "Install Google Chrome / Chromium, or set OMA_CHROME_PATH.",
  };
}

/**
 * Voicebox MCP health — probes the REST /health endpoint that backs the
 * oma-voice MCP server. A short timeout keeps the doctor responsive when the
 * server is down.
 */
export async function checkVoicebox(): Promise<ReadinessCheck> {
  try {
    const res = await http.get(`${VOICEBOX_BASE_URL}/health`, {
      timeout: 1500,
      validateStatus: () => true,
    });
    const ok = res.status >= 200 && res.status < 300;
    return {
      name: "voicebox",
      ok,
      detail: ok ? `healthy (${VOICEBOX_BASE_URL})` : `status ${res.status}`,
      remediation: ok
        ? undefined
        : "Start the Voicebox MCP server (oma-voice) on 127.0.0.1:17493.",
    };
  } catch (err) {
    return {
      name: "voicebox",
      ok: false,
      detail: (err as Error).message,
      remediation:
        "Start the Voicebox MCP server (oma-voice); narration falls back to estimated timing.",
    };
  }
}

/**
 * oma-image vendor availability via the sibling CLI (`oma image doctor`).
 * Boundary-safe: invokes the image slice as a subprocess, never imports it.
 */
export async function checkOmaImage(): Promise<ReadinessCheck> {
  const { bin, prefixArgs } = resolveOmaInvocation();
  const res = await runCapture(
    bin,
    [...prefixArgs, "image", "doctor", "--format", "json"],
    { timeoutMs: 15000 },
  );
  if (res.code !== 0 && !res.stdout.trim()) {
    return {
      name: "oma-image",
      ok: false,
      detail: res.stderr.trim() || `exit ${res.code}`,
      remediation:
        "Run `oma image doctor` to set up at least one image vendor.",
    };
  }
  try {
    const parsed = JSON.parse(res.stdout) as {
      vendors?: Array<{ name: string; health: { ok: boolean } }>;
    };
    const healthy = (parsed.vendors ?? []).filter((v) => v.health?.ok);
    return {
      name: "oma-image",
      ok: healthy.length > 0,
      detail:
        healthy.length > 0
          ? `${healthy.length} vendor(s): ${healthy.map((v) => v.name).join(", ")}`
          : "no healthy vendor",
      remediation:
        healthy.length > 0
          ? undefined
          : "Run `oma image doctor` and authenticate a vendor (codex / antigravity / pollinations).",
    };
  } catch {
    return {
      name: "oma-image",
      ok: false,
      detail: "unparseable doctor output",
      remediation: "Run `oma image doctor` directly to diagnose.",
    };
  }
}

/** Pixelle-MCP / RunningHub credentials (community MCP, off by default). */
export function checkPixelle(): ReadinessCheck {
  const enabled = Boolean(process.env.RUNNINGHUB_API_KEY);
  return {
    name: "pixelle",
    ok: enabled,
    detail: enabled ? "RUNNINGHUB_API_KEY present" : "off by default",
    remediation: enabled
      ? undefined
      : "Optional: run `uvx pixelle@latest`, review the community MCP, then set RUNNINGHUB_API_KEY.",
  };
}

/**
 * Vendored Remotion compositor project — found on disk + dependencies installed.
 * The compositor's real branch only fires when this is installed; otherwise the
 * deterministic placeholder is used. `oma video doctor --install` installs it.
 */
export function checkRemotionProject(): ReadinessCheck {
  const status = getRemotionProjectStatus();
  if (!status.dir) {
    return {
      name: "remotion-project",
      ok: false,
      detail: "not found",
      remediation:
        "Set OMA_VIDEO_REMOTION_DIR, or ensure the oma-video skill is installed.",
    };
  }
  const ready = status.installed && status.browserReady;
  let detail: string;
  if (ready) detail = `ready (${status.dir})`;
  else if (status.installed)
    detail = `installed, headless shell missing (${status.dir})`;
  else detail = `not installed (${status.dir})`;
  return {
    name: "remotion-project",
    ok: ready,
    detail,
    remediation: ready
      ? undefined
      : "Run `oma video doctor --install` to install Remotion deps + headless shell (one-time).",
  };
}

/**
 * Cloned MoneyPrinterTurbo (MPT) checkout — the alternative shorts compositor
 * (`--compositor mpt`). The MPT real branch only fires when the clone + its venv
 * are present; otherwise the deterministic placeholder is used. The checkout
 * lives in a cache dir OUTSIDE the repo (never vendored into git);
 * `oma video doctor --install-mpt` clones + installs it.
 */
export function checkMptProject(): ReadinessCheck {
  const status = getMptProjectStatus();
  if (!status.dir) {
    return {
      name: "mpt-project",
      ok: false,
      detail: "not found",
      remediation:
        "Run `oma video doctor --install-mpt` (clone + venv + deps, one-time), or set OMA_VIDEO_MPT_DIR.",
    };
  }
  return {
    name: "mpt-project",
    ok: status.installed,
    detail: status.installed
      ? `ready (${status.dir})`
      : `cloned, venv missing (${status.dir})`,
    remediation: status.installed
      ? undefined
      : "Run `oma video doctor --install-mpt` to create the venv + install deps.",
  };
}

/**
 * Playwright — required by the live web-capture branch of demo mode
 * (`--source web`). Real only when a Playwright install is resolvable (reuse or
 * cache) with a chromium browser; otherwise the guided protocol is the fallback
 * (key-optional). `oma video doctor --install-playwright` provisions the cache.
 */
export function checkPlaywright(): ReadinessCheck {
  const status = getPlaywrightStatus();
  if (!status.dir) {
    return {
      name: "playwright",
      ok: false,
      detail: "not found (guided capture available)",
      remediation:
        "Run `oma video doctor --install-playwright` (npm i playwright + chromium), or set OMA_VIDEO_PLAYWRIGHT_DIR.",
    };
  }
  const ready = status.browserReady;
  const where = status.source === "reuse" ? "reuse" : "cache";
  let detail: string;
  if (ready) {
    detail = `ready (${where}: ${status.dir}${status.version ? `, v${status.version}` : ""})`;
  } else {
    detail = `${where} install found, chromium missing (${status.dir})`;
  }
  return {
    name: "playwright",
    ok: ready,
    detail,
    remediation: ready
      ? undefined
      : "Run `oma video doctor --install-playwright` to download the chromium browser.",
  };
}

/** Cap capture CLI — optional; guided capture is the fallback. */
export async function checkCap(): Promise<ReadinessCheck> {
  const probe = await binaryAvailable("cap", ["--version"]);
  return {
    name: "cap",
    ok: probe.ok,
    detail: probe.ok ? probe.detail : "not found (guided capture available)",
    remediation: probe.ok
      ? undefined
      : "Optional: install Cap CLI, or pass --capture <path> for guided demo capture.",
  };
}

export async function runReadinessChecks(): Promise<ReadinessCheck[]> {
  const [ffmpeg, voicebox, omaImage, cap] = await Promise.all([
    checkFfmpeg(),
    checkVoicebox(),
    checkOmaImage(),
    checkCap(),
  ]);
  return [
    checkNode(),
    checkChromium(),
    ffmpeg,
    checkRemotionProject(),
    checkMptProject(),
    checkPlaywright(),
    voicebox,
    omaImage,
    checkPixelle(),
    cap,
  ];
}
