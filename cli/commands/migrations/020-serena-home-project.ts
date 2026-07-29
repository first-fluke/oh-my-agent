/**
 * Migration 020: un-register `$HOME` as a Serena project.
 *
 * Through 11.2.0 the install/update flow ran serena's per-project setup against
 * the install root, which is `$HOME` for `oma install --global`. Every
 * (re)install therefore wrote `~/.serena/project.yml` and appended `$HOME` to
 * the `projects:` list in `~/.serena/serena_config.yml` — recreating both on the
 * next run even after the user removed them by hand.
 *
 * The install-time cause is fixed at the call sites (global installs no longer
 * run project setup) plus `isForbiddenSerenaProjectRoot` as the backstop. This
 * migration removes what earlier versions already left behind, so serena stops
 * treating the whole home directory as an indexable project.
 *
 * Scope discipline: the `projects:` entry is oma's own artifact and is always
 * removed. `~/.serena/project.yml` is removed ONLY when it still matches the
 * template oma generates — a hand-written or serena-generated file there is the
 * user's, and is left alone (with `~/.serena/memories/` untouched either way).
 *
 * Idempotent: a home directory that was never registered yields no actions.
 */
import { existsSync, readFileSync, rmSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { unregisterSerenaProject } from "../../io/serena.js";
import type { Migration } from "./index.js";

/**
 * True for a `project.yml` still matching oma's generated template.
 *
 * serena's own project.yml is heavily commented and a hand-written one nearly
 * always carries a comment too, so any `#` line disqualifies the file. The
 * remaining markers are keys oma's template emits verbatim; the `languages:`
 * block is deliberately not matched, since reconcile rewrites it in place.
 */
export function isOmaGeneratedProjectYml(content: string): boolean {
  if (/^\s*#/m.test(content)) return false;
  return (
    content.includes("ls_specific_settings: {}") &&
    content.includes("ignored_paths:") &&
    content.includes("- .serena/cache")
  );
}

export const migrateSerenaHomeProject: Migration = {
  name: "020-serena-home-project",
  up(): string[] {
    const actions: string[] = [];
    const home = homedir();

    if (unregisterSerenaProject(home)) {
      actions.push(
        "~/.serena/serena_config.yml ($HOME un-registered as project)",
      );
    }

    const homeProjectYml = join(home, ".serena", "project.yml");
    if (existsSync(homeProjectYml)) {
      let content: string;
      try {
        content = readFileSync(homeProjectYml, "utf-8");
      } catch {
        return actions; // unreadable — leave it for the user
      }
      if (isOmaGeneratedProjectYml(content)) {
        try {
          rmSync(homeProjectYml);
          actions.push(
            "~/.serena/project.yml (removed — $HOME is not a project)",
          );
        } catch {
          // best-effort; the projects: entry is the part that matters
        }
      }
    }

    return actions;
  },
};
