import { spawnSync } from "node:child_process";

/**
 * Optional agy CLI capabilities detected from `agy --help`.
 *
 * agy 1.0 predates these flags; 1.1+ added `--model`, `--add-dir`, and
 * `--print-timeout`. Capabilities are detected from the installed binary's help
 * text instead of a version compare, so newly added flags are picked up
 * regardless of how the version string is formatted.
 */
export interface AgyCaps {
  /** `--model <id>` — per-session model selection (agy 1.1+). */
  modelFlag: boolean;
  /** `--add-dir <path>` — grant workspace access outside agy's trusted root (agy 1.1+). */
  addDir: boolean;
  /** `--print-timeout <dur>` — raise print mode's 5m default ceiling (agy 1.1+). */
  printTimeout: boolean;
  /** `--mode <mode>` — per-session execution mode such as `accept-edits`. */
  modeFlag: boolean;
}

let cached: AgyCaps | null = null;

function runAgyHelp(): string {
  // Go CLIs print usage to stdout or stderr depending on flag wiring; capture
  // both. Any failure (binary missing, timeout) yields "" → no caps, which
  // reproduces the legacy agy-1.0 behavior of dropping the flags.
  const result = spawnSync("agy", ["--help"], {
    encoding: "utf8",
    timeout: 5_000,
  });
  return `${result.stdout ?? ""}${result.stderr ?? ""}`;
}

/**
 * Probe the installed agy binary once per process and cache the result.
 * Pass `runHelp` to inject help text in tests, or seed with `primeAgyCaps`.
 */
export function detectAgyCaps(runHelp: () => string = runAgyHelp): AgyCaps {
  if (cached) return cached;
  let help = "";
  try {
    help = runHelp();
  } catch {
    help = "";
  }
  cached = {
    modelFlag: /^\s*--model\b/m.test(help),
    addDir: /^\s*--add-dir\b/m.test(help),
    printTimeout: /^\s*--print-timeout\b/m.test(help),
    modeFlag: /^\s*--mode\b/m.test(help),
  };
  return cached;
}

/**
 * agy's print mode (`-p`) gives up after `--print-timeout`, default 5m. A
 * subagent doing real work routinely runs past that, and agy then exits with no
 * result — which reads to the orchestrator as a hang followed by a crash at
 * exactly the 5-minute mark. oma has no outer spawn timeout of its own, so this
 * ceiling is the only one in play; raise it well past the default.
 */
const DEFAULT_PRINT_TIMEOUT = "30m";

/** Go duration literal, e.g. `45m`, `1.5h`, `90s`. */
const GO_DURATION = /^\d+(\.\d+)?(ms|s|m|h)$/;

/**
 * Build the `--print-timeout` args for an agy print-mode invocation, or `[]`
 * when the installed agy predates the flag. Override the default with
 * `OMA_AGY_PRINT_TIMEOUT` (Go duration, e.g. `90m`); an unparseable value is
 * ignored rather than passed through, since agy rejects the whole invocation on
 * a bad duration.
 */
export function agyPrintTimeoutArgs(
  env: NodeJS.ProcessEnv = process.env,
): string[] {
  if (!detectAgyCaps().printTimeout) return [];
  const override = env.OMA_AGY_PRINT_TIMEOUT?.trim();
  if (override && !GO_DURATION.test(override)) {
    console.warn(
      `[agent-spawn] OMA_AGY_PRINT_TIMEOUT='${override}' is not a Go duration (e.g. 30m); using ${DEFAULT_PRINT_TIMEOUT}`,
    );
  }
  const value =
    override && GO_DURATION.test(override) ? override : DEFAULT_PRINT_TIMEOUT;
  return ["--print-timeout", value];
}

/**
 * Seed the capability cache (tests / pre-probed environments). Omitted caps
 * default to unsupported, so a caller that only cares about one flag does not
 * have to restate the rest.
 */
export function primeAgyCaps(caps: Partial<AgyCaps>): void {
  cached = {
    modelFlag: false,
    addDir: false,
    printTimeout: false,
    modeFlag: false,
    ...caps,
  };
}

/** Clear the cached probe so the next detectAgyCaps() re-runs it. */
export function resetAgyCapsCache(): void {
  cached = null;
}
