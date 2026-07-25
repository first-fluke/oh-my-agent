import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      // Mirror the "@cli/*" -> "./cli/*" path alias from the root tsconfig so
      // tests resolve cross-slice imports the same way the build (bun build,
      // which reads tsconfig paths) does. The config lives in cli/, so "@cli/"
      // maps to this directory.
      "@cli/": fileURLToPath(new URL("./", import.meta.url)),
    },
  },
  test: {
    setupFiles: ["./test/setup-install-context.ts"],
    // The suite spawns many `bun cli.ts …` subprocesses (hook e2e, vendor
    // probes, install flows). Under full parallel load those routinely blow
    // vitest's 5s default even though they pass in isolation, so give every
    // test the headroom of the slowest spawn chain instead of per-file
    // overrides chasing whichever file flakes next.
    testTimeout: 30_000,
    // Same load problem at the other end of a worker's life: with the pool
    // saturated, a fork can need more than the 10s default to wind down, and
    // tinypool then reports "Timeout terminating forks worker" — an unhandled
    // error that fails a run in which every test passed (reproduced ~1 in 3
    // full runs locally, independent of the victim file's content).
    teardownTimeout: 30_000,
  },
});
