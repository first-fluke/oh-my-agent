import { accessSync, constants } from "node:fs";
import { homedir } from "node:os";
import { delimiter, join } from "node:path";
import * as p from "@clack/prompts";
import type { DevToolsBrowser } from "./serena.js";

export const EGO_LITE_URL = "https://lite.ego.app/";

function executable(path: string): boolean {
  try {
    accessSync(path, constants.X_OK);
    return true;
  } catch {
    return false;
  }
}

function commandNames(platform: NodeJS.Platform): string[] {
  return platform === "win32"
    ? ["ego-browser.exe", "ego-browser.cmd", "ego-browser"]
    : ["ego-browser"];
}

/**
 * Locate the `ego-browser` CLI that ego lite registers during onboarding:
 * PATH first, then `~/.local/bin`, where onboarding links it on macOS.
 */
export function resolveEgoCommand(
  env: NodeJS.ProcessEnv = process.env,
  home: string = homedir(),
  platform: NodeJS.Platform = process.platform,
): string | undefined {
  const names = commandNames(platform);
  const dirs = (env.PATH ?? "").split(delimiter).filter(Boolean);
  for (const dir of dirs) {
    for (const name of names) {
      if (executable(join(dir, name))) return "ego-browser";
    }
  }
  for (const name of names) {
    const installed = join(home, ".local", "bin", name);
    if (executable(installed)) return installed;
  }
  return undefined;
}

/**
 * ego lite has no MCP server and no unattended installer: it ships as a GUI
 * app whose first-run onboarding registers `ego-browser`. Selecting it never
 * installs anything or fails the command; a missing CLI only prints the steps.
 */
export function reportEgoStatus(
  browsers: readonly DevToolsBrowser[],
  resolve: () => string | undefined = () => resolveEgoCommand(),
): boolean {
  if (!browsers.includes("ego")) return true;
  const command = resolve();
  if (command) {
    p.log.info(
      `ego lite detected (${command}). Agents read its guide with \`ego-browser skill\`; no MCP entry is written.`,
    );
    return true;
  }
  p.log.warn(
    [
      "ego lite is selected, but `ego-browser` was not found on PATH or in ~/.local/bin.",
      `Install ego lite from ${EGO_LITE_URL} (macOS or Windows), open the app, and finish onboarding;`,
      "onboarding registers `ego-browser`. Then confirm with `ego-browser skill`.",
    ].join("\n"),
  );
  return false;
}
