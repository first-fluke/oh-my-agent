/**
 * Migration 013: Workflows are surfaced via direct symlinks at
 * `.agents/workflows/<name>.md`, not generated `.agents/skills/<name>` wrappers.
 *
 * Earlier installs (Migration 011) materialized each workflow as a canonical
 * `.agents/skills/<name>/SKILL.md` wrapper and exposed it per-vendor via a
 * directory-symlink `.<vendor>/skills/<name> → ../../.agents/skills/<name>`.
 *
 * The workflow file now carries `name` + `disable-model-invocation` frontmatter,
 * so it IS its own skill manifest. Vendors symlink it directly:
 *   .<vendor>/skills/<name>/SKILL.md → .agents/workflows/<name>.md
 *
 * This migration removes the legacy artifacts so the symlink reconciliation that
 * runs immediately after migrations (install + update both call
 * `createVendorWorkflowSymlinks`) can rebuild the direct file-symlinks:
 *   - oma-generated `.agents/skills/<name>` wrappers (marker-gated, backed up)
 *   - legacy vendor directory-symlinks pointing into `.agents/skills/<name>`
 *
 * Safety rules:
 * - `.agents/skills/<name>` WITH oma:generated marker → back up, remove
 * - `.agents/skills/<name>` WITHOUT marker → user-authored, leave untouched
 * - vendor entry that is a symlink into `.agents/skills/<name>` → remove
 *   (regenerable; rebuilt as a file-symlink by reconcile)
 * - vendor entry that is a real dir / file → leave untouched
 *
 * Backup path: <cwd>/.migration-backup/013/.agents/skills/<name>/
 *
 * Idempotent: re-running after migration produces 0 actions.
 */
import {
  cpSync,
  existsSync,
  lstatSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  readlinkSync,
  rmSync,
} from "node:fs";
import { dirname, join, resolve } from "node:path";
import { CLI_SKILLS_DIR } from "../../constants/index.js";
import type { CliTool } from "../../types/index.js";
import type { Migration } from "./index.js";

const OMA_GENERATED_MARKER = "<!-- oma:generated -->";

function listWorkflowNames(workflowsDir: string): string[] {
  if (!existsSync(workflowsDir)) return [];
  return readdirSync(workflowsDir, { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith(".md"))
    .map((entry) => entry.name.slice(0, -".md".length));
}

/** True when `.agents/skills/<name>/SKILL.md` is an oma-generated wrapper. */
function isGeneratedWrapper(skillDir: string): boolean {
  const skillFile = join(skillDir, "SKILL.md");
  if (!existsSync(skillFile)) return false;
  try {
    return readFileSync(skillFile, "utf-8").includes(OMA_GENERATED_MARKER);
  } catch {
    return false;
  }
}

export const migrateWorkflowDirectSymlinks: Migration = {
  name: "013-workflow-direct-symlinks",
  up(cwd: string): string[] {
    const actions: string[] = [];
    const workflowsDir = join(cwd, ".agents", "workflows");
    const ssotSkillsDir = join(cwd, ".agents", "skills");
    const workflowNames = listWorkflowNames(workflowsDir);
    if (workflowNames.length === 0) return actions;
    const workflowSet = new Set(workflowNames);

    // 1. Remove legacy vendor directory-symlinks that point into
    //    `.agents/skills/<workflow>`. Reconcile rebuilds them as file-symlinks.
    for (const [vendor, spec] of Object.entries(CLI_SKILLS_DIR) as [
      CliTool,
      (typeof CLI_SKILLS_DIR)[CliTool],
    ][]) {
      for (const relPath of new Set([spec.projectPath, spec.homePath])) {
        const vendorSkillsDir = join(cwd, relPath);
        if (!existsSync(vendorSkillsDir)) continue;

        for (const name of workflowNames) {
          const entryPath = join(vendorSkillsDir, name);
          let stat: ReturnType<typeof lstatSync>;
          try {
            stat = lstatSync(entryPath);
          } catch {
            continue;
          }
          if (!stat.isSymbolicLink()) continue;

          let resolvedTarget: string;
          try {
            resolvedTarget = resolve(
              dirname(entryPath),
              readlinkSync(entryPath),
            );
          } catch {
            continue;
          }
          const expected = resolve(join(ssotSkillsDir, name));
          if (resolvedTarget !== expected) continue;

          try {
            rmSync(entryPath, { force: true });
            actions.push(
              `${relPath}/${name}: removed legacy wrapper symlink (${vendor})`,
            );
          } catch {
            // best-effort
          }
        }
      }
    }

    // 2. Remove oma-generated `.agents/skills/<workflow>` wrappers, backed up.
    if (existsSync(ssotSkillsDir)) {
      for (const entry of readdirSync(ssotSkillsDir, { withFileTypes: true })) {
        if (!entry.isDirectory()) continue;
        if (!workflowSet.has(entry.name)) continue;
        const skillDir = join(ssotSkillsDir, entry.name);
        if (!isGeneratedWrapper(skillDir)) continue;

        const backup = join(
          cwd,
          ".migration-backup",
          "013",
          ".agents",
          "skills",
          entry.name,
        );
        try {
          mkdirSync(dirname(backup), { recursive: true });
          cpSync(skillDir, backup, { recursive: true, force: true });
        } catch {
          // best-effort backup; continue to removal
        }
        try {
          rmSync(skillDir, { recursive: true, force: true });
          actions.push(
            `.agents/skills/${entry.name}: removed generated workflow wrapper (backed up)`,
          );
        } catch {
          // best-effort
        }
      }
    }

    return actions;
  },
};
