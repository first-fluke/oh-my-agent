// Readiness probes shared by `oma video doctor`, list-providers, and the
// provider `available()` implementations. Each probe is side-effect-free and
// returns a uniform shape so the doctor can render a table and the orchestrator
// can gate real-vs-fallback branches off the same source of truth.
import { findChromeExecutable } from "@cli/io/chrome";
import { http } from "@cli/io/http";
import { readManagedState } from "../../../platform/managed-skill.js";
import { binaryAvailable, resolveOmaInvocation, runCapture } from "./exec.js";
import { getMptProjectStatus } from "./mpt-project.js";
import { describeToolchain, skillsCacheRoot } from "./remotion-workspace.js";
import { getStrudelProjectStatus } from "./strudel-project.js";

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
 * Always-latest Remotion toolchain cache (`~/.cache/oma-video/remotion/<ver>/`):
 * deps + Chrome Headless Shell. `oma video compose` refreshes it per run;
 * `oma video doctor --install` warms it.
 */
export function checkRemotionToolchain(): ReadinessCheck {
  const tc = describeToolchain();
  if (!tc.version) {
    return {
      name: "remotion-toolchain",
      ok: false,
      detail: "not cached",
      remediation:
        "Run `oma video doctor --install` (or any `oma video compose`) once online to fetch the latest remotion.",
    };
  }
  return {
    name: "remotion-toolchain",
    ok: tc.browserReady,
    detail: tc.browserReady
      ? `remotion ${tc.version} (${tc.dir})`
      : `remotion ${tc.version}, headless shell missing (${tc.dir})`,
    remediation: tc.browserReady
      ? undefined
      : "Run `oma video doctor --install` to fetch Remotion's Chrome Headless Shell.",
  };
}

/**
 * remotion-dev/skills at HEAD — what the agent reads to author compositions.
 * Optional (offline authoring still works) but strongly recommended.
 */
export function checkRemotionSkills(): ReadinessCheck {
  const state = readManagedState(skillsCacheRoot());
  return state
    ? {
        name: "remotion-skills",
        ok: true,
        detail: `remotion-dev/skills @ ${state.ref} (checked ${state.lastCheck.slice(0, 10)})`,
      }
    : {
        name: "remotion-skills",
        ok: false,
        detail: "not cached",
        remediation:
          "Run `oma video doctor --install` once online to fetch remotion-dev/skills.",
      };
}

/**
 * Embedded Pretendard in the toolchain cache — copied into each run dir so
 * renders are glyph-identical across machines. Optional (system-font fallback).
 */
export function checkPretendardFont(): ReadinessCheck {
  const tc = describeToolchain();
  if (!tc.version) {
    return {
      name: "pretendard-font",
      ok: false,
      detail: "toolchain not cached",
      remediation: "Run `oma video doctor --install` first.",
    };
  }
  return {
    name: "pretendard-font",
    ok: tc.fontReady,
    detail: tc.fontReady
      ? "embedded (toolchain cache)"
      : "missing — system-font fallback (renders not byte-identical across machines)",
    remediation: tc.fontReady
      ? undefined
      : "Run `oma video doctor --install` to fetch Pretendard once (network required).",
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
 * Strudel BGM renderer — optional; a missing install just means no music track.
 * Its deps are AGPL-3.0-or-later, so they are installed only on explicit
 * request (`oma video doctor --install-strudel`) and never bundled with the CLI.
 */
export function checkStrudel(): ReadinessCheck {
  const status = getStrudelProjectStatus();
  if (!status.dir) {
    return {
      name: "strudel",
      ok: false,
      detail: "not found (renders without music)",
      remediation: "Install the oma-video skill, or set OMA_VIDEO_STRUDEL_DIR.",
    };
  }
  return {
    name: "strudel",
    ok: status.installed,
    detail: status.installed
      ? `ready (${status.dir})`
      : `project found, @strudel/web missing (${status.dir})`,
    remediation: status.installed
      ? undefined
      : "Run `oma video doctor --install-strudel` (installs AGPL-3.0-or-later packages locally).",
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
    checkRemotionToolchain(),
    checkRemotionSkills(),
    checkPretendardFont(),
    checkMptProject(),
    checkStrudel(),
    voicebox,
    omaImage,
    checkPixelle(),
    cap,
  ];
}
