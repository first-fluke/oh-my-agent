import { spawn } from "node:child_process";
import { accessSync, constants } from "node:fs";
import { homedir } from "node:os";
import { delimiter, join, resolve } from "node:path";
import * as p from "@clack/prompts";
import type { DevToolsBrowser } from "./serena.js";

export const ASIDE_INSTALL_COMMAND =
  "curl -fsSL https://releases.aside.com/install.sh | bash";

function executable(path: string): boolean {
  try {
    accessSync(path, constants.X_OK);
    return true;
  } catch {
    return false;
  }
}

export function resolveAsideCommand(): string | undefined {
  if (
    (process.env.PATH ?? "")
      .split(delimiter)
      .some((dir) => executable(join(dir, "aside")))
  )
    return "aside";
  const installed = resolve(
    process.env.ASIDE_CLI_BIN_DIR ?? join(homedir(), ".local", "bin"),
    "aside",
  );
  return executable(installed) ? installed : undefined;
}

export async function ensureAsideInstalled(
  browsers: readonly DevToolsBrowser[],
): Promise<void> {
  if (!browsers.includes("aside") || resolveAsideCommand()) return;
  p.log.info("Installing Aside CLI...");
  await new Promise<void>((resolve, reject) => {
    // pipefail also reports download failures instead of accepting an empty script.
    const child = spawn(
      "bash",
      ["-o", "pipefail", "-c", ASIDE_INSTALL_COMMAND],
      { stdio: "inherit" },
    );
    child.once("error", (error) =>
      reject(
        new Error(`Aside installation failed: ${error.message}`, {
          cause: error,
        }),
      ),
    );
    child.once("close", (code, signal) => {
      if (code === 0) resolve();
      else
        reject(
          new Error(
            `Aside installation failed (${signal ?? `exit ${code}`}). Retry: ${ASIDE_INSTALL_COMMAND}`,
          ),
        );
    });
  });
  if (!resolveAsideCommand())
    throw new Error(
      "Aside installer completed, but no executable was found on PATH or in ASIDE_CLI_BIN_DIR (~/.local/bin by default).",
    );
  p.log.success("Aside CLI installed.");
}
