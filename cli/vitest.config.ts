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
    setupFiles: [
      "./test/setup-install-context.ts",
      "./test/setup-session-storage.ts",
      "./test/setup-orca-context.ts",
    ],
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
    projects: [
      {
        extends: true,
        test: {
          name: "main",
          exclude: [
            "**/node_modules/**",
            "io/serena-daemon.test.ts",
            "commands/doctor/serena-daemons.test.ts",
          ],
        },
      },
      {
        // Repo scripts (scripts/sns, scripts/utils) live outside cli/ but are
        // first-party source with first-party tests, so they run in the same
        // vitest suite. They need the "@cli/" alias — scripts/utils/agent-spawn
        // reuses the cli's vendor resolution — but not the cli setup files,
        // which resolve relative to cli/ and seed cli-only globals.
        resolve: {
          alias: {
            "@cli/": fileURLToPath(new URL("./", import.meta.url)),
          },
        },
        test: {
          name: "scripts",
          root: fileURLToPath(new URL("../scripts/", import.meta.url)),
          include: ["**/*.test.ts"],
          testTimeout: 30_000,
        },
      },
      {
        // Quarantine for the serena-daemon tests: their forks worker kept
        // dying or wedging during COLLECTION (tests 0ms) under load — locally
        // and on CI — and it survived removal of child spawns, top-level
        // await, and module mocks, so the file's content was ruled out. The
        // threads pool sidesteps the fork+IPC lifecycle entirely; these files
        // are safe there because they mutate no process-global state (env,
        // cwd) and use a direct state-dir seam instead of module mocks.
        extends: true,
        test: {
          name: "daemon-threads",
          include: [
            "io/serena-daemon.test.ts",
            "commands/doctor/serena-daemons.test.ts",
          ],
          pool: "threads",
        },
      },
    ],
  },
});
