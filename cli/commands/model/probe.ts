// cli/commands/model/probe.ts
// Probes a model slug against its vendor CLI to verify whether it is accepted.

import { spawnSync } from "node:child_process";
import {
  getModelSpec,
  loadInlineUserModels,
  ownerToVendor,
} from "../../platform/model-registry.js";

export type ProbeStatus =
  | "accepted"
  | "rejected"
  | "auth_required"
  | "quota_exceeded"
  | "unknown";

export type ProbeResult = {
  slug: string;
  cli: string;
  cliModel: string;
  status: ProbeStatus;
  durationMs: number;
  stderr?: string;
};

// ---------------------------------------------------------------------------
// CLI → ping command factory
// ---------------------------------------------------------------------------

type CliArgs = {
  bin: string;
  args: string[];
};

function buildPingCommand(cli: string, cliModel: string): CliArgs | null {
  switch (cli) {
    case "claude":
      return { bin: "claude", args: ["-p", "ping", "--model", cliModel] };
    case "codex":
      return { bin: "codex", args: ["exec", "-m", cliModel, "ping"] };
    case "qwen":
      return { bin: "qwen", args: ["-p", "ping", "-m", cliModel] };
    case "cursor":
      return {
        bin: "cursor",
        args: ["agent", "-p", "--yolo", "--trust", "--model", cliModel, "ping"],
      };
    default:
      return null;
  }
}

// ---------------------------------------------------------------------------
// Error classification — exported for testability
// ---------------------------------------------------------------------------

const REJECTED_PATTERNS = [
  /model not found/i,
  /invalid model/i,
  /unknown model/i,
  /no such model/i,
  /model.*does not exist/i,
  /unsupported model/i,
  /model.*not supported/i,
  /not a valid model/i,
];

const AUTH_PATTERNS = [
  /unauthorized/i,
  /not logged in/i,
  /please log in/i,
  /login required/i,
  /authentication required/i,
  /unauthenticated/i,
  /401/,
  /403/,
  /access denied/i,
  /api key/i,
  /sign in/i,
];

const QUOTA_PATTERNS = [
  /quota/i,
  /rate limit/i,
  /rate.?limit/i,
  /too many requests/i,
  /429/,
  /usage limit/i,
  /exceeded/i,
];

/**
 * Classify the probe result from the combined stderr+stdout and exit code.
 * Exported for unit-testing.
 */
export function classifyProbeError(
  output: string,
  exitCode: number | null,
): ProbeStatus {
  if (exitCode === 0) return "accepted";

  for (const pattern of AUTH_PATTERNS) {
    if (pattern.test(output)) return "auth_required";
  }

  for (const pattern of QUOTA_PATTERNS) {
    if (pattern.test(output)) return "quota_exceeded";
  }

  for (const pattern of REJECTED_PATTERNS) {
    if (pattern.test(output)) return "rejected";
  }

  return "unknown";
}

// ---------------------------------------------------------------------------
// OpenCode list-based probe — checks `opencode models <provider>` stdout
// ---------------------------------------------------------------------------

/**
 * Classify an opencode `models <provider>` result by checking whether the
 * requested model slug appears in stdout's line list.
 * Exported for unit-testing.
 */
export function classifyOpenCodeList(
  stdout: string,
  stderr: string,
  exitCode: number | null,
  slug: string,
  modelId: string,
): ProbeStatus {
  if (exitCode !== 0) {
    const combined = [stdout, stderr].filter(Boolean).join("\n");
    for (const pattern of AUTH_PATTERNS) {
      if (pattern.test(combined)) return "auth_required";
    }
    return "unknown";
  }

  // exit 0: check whether the model appears in the stdout line list
  const lines = stdout
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
  const matched = lines.some((line) => line === slug || line === modelId);
  return matched ? "accepted" : "rejected";
}

// ---------------------------------------------------------------------------
// Core probe function
// ---------------------------------------------------------------------------

export type ProbeOptions = {
  timeoutMs?: number;
  /**
   * Inline `models:` entries from oma-config.yaml. Defaults to reading the
   * config found by walking up from process.cwd(). Pass explicitly to probe
   * against a specific config (or `{}` to probe registry/heuristic only).
   */
  userModels?: Record<string, unknown>;
};

export type ProbeTarget = {
  /** CLI binary that owns the model. */
  cli: string;
  /** Model id passed to that CLI (`--model`, list membership, …). */
  cliModel: string;
  /** Provider argument for `opencode models <provider>`. */
  provider: string;
};

/**
 * Resolve which CLI a slug should be probed against, and under what model id.
 *
 * Registry-first, mirroring the dispatch path (`resolveVendorFromModelSlug` in
 * agent-config/vendor-resolution.ts): a registered ModelSpec's `cli`/`cli_model`
 * are authoritative, so a custom slug such as `moonshotai/kimi-k3` declaring
 * `cli: opencode` is probed via the opencode CLI instead of a nonexistent
 * `moonshotai` binary. Unregistered slugs — the common case for probe, which
 * exists to vet a candidate before it is registered — keep the OpenRouter-style
 * owner-prefix heuristic, falling back to the owner itself.
 *
 * Exported for unit-testing and so the command layer prints exactly what the
 * probe will run.
 */
export function resolveProbeTarget(
  slug: string,
  userModels?: Record<string, unknown>,
): ProbeTarget {
  const slashIndex = slug.indexOf("/");
  const owner = slashIndex >= 0 ? slug.slice(0, slashIndex) : "";
  const derivedModel = slashIndex >= 0 ? slug.slice(slashIndex + 1) : slug;

  const spec = getModelSpec(slug, userModels);
  const cli = spec?.cli ?? ownerToVendor(owner) ?? owner;
  const cliModel = spec?.cli_model ?? derivedModel;

  // opencode model ids are `provider/model`; when a registered cli_model
  // carries its own provider, that provider wins over the slug's owner (they
  // differ whenever the slug is an alias, e.g. `my-fast-model`).
  const modelSlashIndex = cliModel.indexOf("/");
  const provider =
    modelSlashIndex >= 0 ? cliModel.slice(0, modelSlashIndex) : owner;

  return { cli, cliModel, provider };
}

/**
 * Probe a model slug against its vendor CLI and classify the result.
 *
 * @param slug   Full model slug, e.g. "anthropic/claude-opus-4.7"
 * @param options  Optional probe configuration (timeout, user models, etc.)
 */
export async function probeSlug(
  slug: string,
  options?: ProbeOptions,
): Promise<ProbeResult> {
  const timeoutMs = options?.timeoutMs ?? 30_000;
  const { cli, cliModel, provider } = resolveProbeTarget(
    slug,
    options?.userModels ?? loadInlineUserModels(),
  );

  // ---------------------------------------------------------------------------
  // opencode: list-membership probe — runs `opencode models <provider>`
  // ---------------------------------------------------------------------------
  if (cli === "opencode") {
    const startMs = Date.now();
    let result: ReturnType<typeof spawnSync>;

    try {
      result = spawnSync("opencode", ["models", provider], {
        encoding: "utf-8",
        timeout: timeoutMs,
      });
    } catch (err) {
      const durationMs = Date.now() - startMs;
      const errCode = (err as NodeJS.ErrnoException).code;
      if (errCode === "ENOENT") {
        return {
          slug,
          cli,
          cliModel,
          status: "unknown",
          durationMs,
          stderr: `${cli} CLI not found (ENOENT)`,
        };
      }
      return {
        slug,
        cli,
        cliModel,
        status: "unknown",
        durationMs,
        stderr: err instanceof Error ? err.message : String(err),
      };
    }

    const durationMs = Date.now() - startMs;

    if (result.error) {
      const errCode = (result.error as NodeJS.ErrnoException).code;
      const errMsg =
        result.error instanceof Error
          ? result.error.message
          : String(result.error);
      if (errCode === "ENOENT") {
        return {
          slug,
          cli,
          cliModel,
          status: "unknown",
          durationMs,
          stderr: `${cli} CLI not found (ENOENT)`,
        };
      }
      if (errCode === "ETIMEDOUT") {
        return {
          slug,
          cli,
          cliModel,
          status: "unknown",
          durationMs,
          stderr: `Probe timed out after ${timeoutMs}ms`,
        };
      }
      return {
        slug,
        cli,
        cliModel,
        status: "unknown",
        durationMs,
        stderr: errMsg,
      };
    }

    const stderrStr = result.stderr ? String(result.stderr).trim() : "";
    const stdoutStr = result.stdout ? String(result.stdout).trim() : "";
    const status = classifyOpenCodeList(
      stdoutStr,
      stderrStr,
      result.status,
      slug,
      cliModel,
    );

    return {
      slug,
      cli,
      cliModel,
      status,
      durationMs,
      ...(stderrStr ? { stderr: stderrStr } : {}),
    };
  }

  // ---------------------------------------------------------------------------
  // All other vendors: ping-command probe
  // ---------------------------------------------------------------------------
  const cmd = buildPingCommand(cli, cliModel);
  if (!cmd) {
    return {
      slug,
      cli,
      cliModel,
      status: "unknown",
      durationMs: 0,
      stderr: `No ping command defined for CLI: ${cli}`,
    };
  }

  const startMs = Date.now();
  let result: ReturnType<typeof spawnSync>;

  try {
    result = spawnSync(cmd.bin, cmd.args, {
      encoding: "utf-8",
      timeout: timeoutMs,
    });
  } catch (err) {
    const durationMs = Date.now() - startMs;
    const errCode = (err as NodeJS.ErrnoException).code;
    if (errCode === "ENOENT") {
      return {
        slug,
        cli,
        cliModel,
        status: "unknown",
        durationMs,
        stderr: `${cli} CLI not found (ENOENT)`,
      };
    }
    return {
      slug,
      cli,
      cliModel,
      status: "unknown",
      durationMs,
      stderr: err instanceof Error ? err.message : String(err),
    };
  }

  const durationMs = Date.now() - startMs;

  if (result.error) {
    const errCode = (result.error as NodeJS.ErrnoException).code;
    const errMsg =
      result.error instanceof Error
        ? result.error.message
        : String(result.error);
    if (errCode === "ENOENT") {
      return {
        slug,
        cli,
        cliModel,
        status: "unknown",
        durationMs,
        stderr: `${cli} CLI not found (ENOENT)`,
      };
    }
    if (errCode === "ETIMEDOUT") {
      return {
        slug,
        cli,
        cliModel,
        status: "unknown",
        durationMs,
        stderr: `Probe timed out after ${timeoutMs}ms`,
      };
    }
    return {
      slug,
      cli,
      cliModel,
      status: "unknown",
      durationMs,
      stderr: errMsg,
    };
  }

  const stderrStr = result.stderr ? String(result.stderr).trim() : "";
  const stdoutStr = result.stdout ? String(result.stdout).trim() : "";
  const combinedOutput = [stdoutStr, stderrStr].filter(Boolean).join("\n");

  const status = classifyProbeError(combinedOutput, result.status);

  return {
    slug,
    cli,
    cliModel,
    status,
    durationMs,
    ...(stderrStr ? { stderr: stderrStr } : {}),
  };
}

// ---------------------------------------------------------------------------
// Human-readable description helpers
// ---------------------------------------------------------------------------

export function describeProbeStatus(result: ProbeResult): string {
  switch (result.status) {
    case "accepted":
      return `accepted (${result.durationMs}ms)`;
    case "rejected":
      return `rejected — try ${result.slug.replace(/\./g, "-")} (hyphen form)`;
    case "auth_required":
      return "auth_required — check CLI login";
    case "quota_exceeded":
      return "quota_exceeded — try again later";
    case "unknown":
      return `unknown — ${result.stderr ?? "no details"}`;
  }
}
