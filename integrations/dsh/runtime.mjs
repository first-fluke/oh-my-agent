import { createRequire } from "node:module";

const require = createRequire(import.meta.url);

export const OMA_VERSION = "20.4.1";

export function resolveOmaRuntime(config = {}, resolve = require.resolve) {
  const commandArgs = config.commandArgs ?? [];
  if (
    !Array.isArray(commandArgs) ||
    commandArgs.some((value) => typeof value !== "string")
  ) {
    throw new TypeError("commandArgs must be an array of strings");
  }
  if (config.command != null) {
    if (typeof config.command !== "string" || !config.command.trim()) {
      throw new TypeError("command must name an executable");
    }
    return { command: config.command, commandArgs };
  }
  let cli;
  try {
    cli = resolve("oh-my-agent/bin/cli.js");
  } catch (cause) {
    throw new Error(
      "OMA CLI dependency is missing. Reinstall dsh-plugin-oma to install oh-my-agent.",
      { cause },
    );
  }
  return {
    command: process.execPath,
    commandArgs: [cli, ...commandArgs],
    version: OMA_VERSION,
  };
}
