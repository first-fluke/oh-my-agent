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
  },
});
