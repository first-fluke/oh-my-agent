/**
 * oma hook latency benchmark — design 019 §T2 (one-shot SLO).
 *
 * Measures wall-clock time for a single `oma hook run --vendor claude --event
 * UserPromptSubmit` invocation with a representative stdin payload.
 * Each run is an independent child process — this is the realistic cost
 * paid by a vendor's hook system on every user prompt.
 *
 * Measured on 2026-06-06 (macOS Darwin 25.5.0, Apple Silicon):
 *   p50 ~624 ms  |  p95 ~821 ms  |  max ~848 ms
 *   (after fixing the runWithTimeout dangling-setTimeout leak in dispatch.ts
 *    that previously kept the event loop alive ~5 s on every invocation.)
 *
 * Latency SLO (design 019):
 *   - p95 ceiling: 1500 ms (~1.8x headroom over the measured ~821 ms).
 *   - The dominant cost is node startup + loading the ~6.5 MB bundled cli.js
 *     (`oma --version` alone is ~640 ms). A leaner hook entrypoint and/or the
 *     future daemon phase (SocketTransport, keeps oma warm → sub-ms IPC)
 *     eliminate this one-shot cost.
 *
 * Invocation (do NOT use `bun run test` — this is on-demand only):
 *   node --loader ts-node/esm cli/__bench__/oma-hook-latency.bench.ts
 *   -- OR with bun directly (no TS transform needed, bun handles it) --
 *   bun run bench:oma-hook
 *
 * The script exits non-zero if p95 exceeds the SLO ceiling.
 */

import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { resolve } from "node:path";

const REPO_ROOT = resolve(import.meta.dirname, "../..");
const CLI_JS = resolve(REPO_ROOT, "cli/bin/cli.js");
const TOTAL_RUNS = 25;
const WARMUP_RUNS = 3;
const P95_SLO_MS = 1500;

const STDIN_PAYLOAD = JSON.stringify({
  prompt: "orchestrate this",
  cwd: REPO_ROOT,
});

// ---------------------------------------------------------------------------
// Preflight: build if cli.js is missing
// ---------------------------------------------------------------------------
if (!existsSync(CLI_JS)) {
  console.log("[bench] cli/bin/cli.js not found — building once...");
  const build = spawnSync("bun", ["run", "build"], {
    cwd: REPO_ROOT,
    stdio: "inherit",
    encoding: "utf-8",
  });
  if (build.status !== 0) {
    console.error("[bench] build failed — aborting");
    process.exit(1);
  }
}

// ---------------------------------------------------------------------------
// Run one iteration and return wall-clock nanoseconds
// ---------------------------------------------------------------------------
function runOnce(): bigint {
  const start = process.hrtime.bigint();

  spawnSync(
    process.execPath, // node
    [
      CLI_JS,
      "hook",
      "run",
      "--vendor",
      "claude",
      "--event",
      "UserPromptSubmit",
    ],
    {
      input: STDIN_PAYLOAD,
      encoding: "utf-8",
      // stderr silenced so handler warnings don't pollute bench output
      stdio: ["pipe", "pipe", "pipe"],
      env: {
        ...process.env,
        // Disable color/TTY detection to avoid ANSI-init overhead
        NO_COLOR: "1",
        FORCE_COLOR: "0",
      },
    },
  );

  return process.hrtime.bigint() - start;
}

// ---------------------------------------------------------------------------
// Warmup
// ---------------------------------------------------------------------------
console.log(`[bench] warming up (${WARMUP_RUNS} runs, discarded)...`);
for (let i = 0; i < WARMUP_RUNS; i++) {
  runOnce();
}

// ---------------------------------------------------------------------------
// Measured runs
// ---------------------------------------------------------------------------
const measured = TOTAL_RUNS - WARMUP_RUNS;
console.log(`[bench] measuring ${measured} runs...`);

const samples: number[] = [];
for (let i = 0; i < measured; i++) {
  const ns = runOnce();
  const ms = Number(ns) / 1_000_000;
  samples.push(ms);
  process.stdout.write(
    `  run ${String(i + 1).padStart(2)}: ${ms.toFixed(1)} ms\n`,
  );
}

// ---------------------------------------------------------------------------
// Percentile helpers
// ---------------------------------------------------------------------------
function percentile(sorted: number[], pct: number): number {
  const idx = Math.ceil((pct / 100) * sorted.length) - 1;
  return sorted[Math.max(0, idx)] ?? 0;
}

const sorted = [...samples].sort((a, b) => a - b);
const p50 = percentile(sorted, 50);
const p95 = percentile(sorted, 95);
const max = sorted[sorted.length - 1] ?? 0;

// ---------------------------------------------------------------------------
// Report
// ---------------------------------------------------------------------------
console.log("\n[bench] oma hook run --vendor claude --event UserPromptSubmit");
console.log(`  runs  : ${measured} (${WARMUP_RUNS} warmup discarded)`);
console.log(`  p50   : ${p50.toFixed(1)} ms`);
console.log(`  p95   : ${p95.toFixed(1)} ms`);
console.log(`  max   : ${max.toFixed(1)} ms`);
console.log(`  SLO   : p95 <= ${P95_SLO_MS} ms`);

if (p95 > P95_SLO_MS) {
  console.error(
    `\n[bench] FAIL: p95 ${p95.toFixed(1)} ms exceeds SLO ceiling ${P95_SLO_MS} ms`,
  );
  process.exit(1);
} else {
  console.log(
    `\n[bench] PASS: p95 ${p95.toFixed(1)} ms is within SLO ceiling ${P95_SLO_MS} ms`,
  );
}
