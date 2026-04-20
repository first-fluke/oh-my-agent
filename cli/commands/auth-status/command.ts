import type { Command } from "commander";
import {
  addOutputOptions,
  resolveJsonMode,
  runAction,
} from "../../cli-kit/cli-framework.js";
import { checkAuthStatus } from "./auth-status.js";

export { checkAuthStatus } from "./auth-status.js";

export function registerAuthStatus(program: Command): void {
  addOutputOptions(
    program
      .command("auth:status")
      .description("Check authentication status of all supported CLIs"),
  ).action(
    runAction(
      async (options) => {
        await checkAuthStatus(resolveJsonMode(options));
      },
      { supportsJsonOutput: true },
    ),
  );
}
