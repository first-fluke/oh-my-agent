import * as fs from "node:fs";
import { dirname, join, relative, resolve, sep } from "node:path";
import { CLI_SKILLS_DIR, INSTALLED_SKILLS_DIR } from "../../constants/index.js";
import type { CliTool } from "../../types/index.js";
import { createLink } from "../fs-link.js";
import { resolveEffectiveSkill } from "../skill-overlays.js";
import { getVendorDisplayPath, resolveCliSkillsDir } from "./vendor-dirs.js";

/**
 * Remove symlinks in `linkRootDir` whose target no longer exists (e.g. legacy
 * skill names left behind after a rename, or skills removed from SSOT).
 * Only dangling symlinks are touched — real dirs/files and symlinks with a
 * live target are left alone. Best-effort: fs errors abort silently.
 */
function pruneDanglingSymlinks(linkRootDir: string): string[] {
  const removed: string[] = [];
  try {
    for (const entry of fs.readdirSync(linkRootDir, { withFileTypes: true })) {
      if (!entry.isSymbolicLink()) continue;
      const link = join(linkRootDir, entry.name);
      try {
        fs.realpathSync(link);
      } catch {
        fs.unlinkSync(link);
        removed.push(entry.name);
      }
    }
  } catch {
    // Missing dir or unreadable entry — nothing to prune
  }
  return removed;
}

export function createVendorSymlinks(
  installRoot: string,
  cliTools: CliTool[],
  skillNames: string[],
): { created: string[]; skipped: string[]; removed: string[] } {
  const created: string[] = [];
  const skipped: string[] = [];
  const removed: string[] = [];
  const ssotSkillsDir = resolve(installRoot, INSTALLED_SKILLS_DIR);

  try {
    fs.realpathSync(ssotSkillsDir);
  } catch {
    return { created, skipped, removed };
  }

  for (const cli of cliTools) {
    const skillsDir = getVendorDisplayPath(cli);
    const linkRootDir = resolveCliSkillsDir(installRoot, cli);

    if (!fs.existsSync(linkRootDir)) {
      fs.mkdirSync(linkRootDir, { recursive: true });
    }

    removed.push(
      ...pruneDanglingSymlinks(linkRootDir).map(
        (name) => `${skillsDir}/${name}`,
      ),
    );

    for (const skillName of skillNames) {
      const managedSource = join(ssotSkillsDir, skillName);
      // A project-owned overlay must never be projected into a HOME-scoped
      // vendor directory, where it could change another project's runtime.
      const source = isProjectLocalSkillPath(linkRootDir, installRoot)
        ? resolveEffectiveSkill(installRoot, skillName).directory
        : managedSource;
      const link = join(linkRootDir, skillName);

      if (!fs.existsSync(managedSource)) {
        skipped.push(`${skillsDir}/${skillName} (source missing)`);
        continue;
      }

      try {
        const stat = fs.lstatSync(link);
        if (stat.isSymbolicLink()) {
          const existing = resolve(dirname(link), fs.readlinkSync(link));
          if (existing === resolve(source)) {
            skipped.push(`${skillsDir}/${skillName} (already linked)`);
            continue;
          }
          fs.unlinkSync(link);
        } else {
          skipped.push(`${skillsDir}/${skillName} (real dir exists)`);
          continue;
        }
      } catch {
        // link missing
      }

      const relativePath = relative(linkRootDir, source);
      try {
        // Effective overlays are project-owned siblings of the immutable
        // managed source. Keep the containment guard while accepting both.
        createLink(relativePath, link, "dir", join(installRoot, ".agents"));
      } catch (err) {
        if (
          err instanceof Error &&
          err.message.startsWith("createLink: target")
        ) {
          skipped.push(`${skillsDir}/${skillName} (source escapes SSOT base)`);
          continue;
        }
        throw err;
      }
      created.push(`${skillsDir}/${skillName}`);
    }
  }

  return { created, skipped, removed };
}

/**
 * @deprecated Use createVendorSymlinks. Removed in a future release.
 */
export const createCliSymlinks = createVendorSymlinks;

export function getInstalledSkillNames(installRoot: string): string[] {
  const skillsDir = join(installRoot, INSTALLED_SKILLS_DIR);
  if (!fs.existsSync(skillsDir)) return [];

  return fs
    .readdirSync(skillsDir, { withFileTypes: true })
    .filter((d) => d.isDirectory() && !d.name.startsWith("_"))
    .map((d) => d.name);
}

export function detectExistingCliSymlinkDirs(installRoot: string): CliTool[] {
  const tools: CliTool[] = [];
  for (const cli of Object.keys(CLI_SKILLS_DIR) as CliTool[]) {
    if (fs.existsSync(resolveCliSkillsDir(installRoot, cli))) {
      tools.push(cli);
    }
  }
  return tools;
}

/** Refresh already-authorized vendor links after an overlay apply or rollback. */
export function refreshSkillOverlayVendorLinks(
  installRoot: string,
  skillName: string,
): { created: string[]; skipped: string[]; removed: string[] } {
  const tools = detectExistingCliSymlinkDirs(installRoot).filter((tool) =>
    isProjectLocalSkillPath(
      resolveCliSkillsDir(installRoot, tool),
      installRoot,
    ),
  );
  if (tools.length === 0) return { created: [], skipped: [], removed: [] };
  return createVendorSymlinks(installRoot, tools, [skillName]);
}

/** Refuse an overlay apply that would leave a project vendor consuming a stale copy. */
export function assertSkillOverlayVendorLinks(
  installRoot: string,
  skillName: string,
): void {
  for (const tool of detectExistingCliSymlinkDirs(installRoot)) {
    const root = resolveCliSkillsDir(installRoot, tool);
    if (!isProjectLocalSkillPath(root, installRoot)) continue;
    const link = join(root, skillName);
    if (fs.existsSync(link) && !fs.lstatSync(link).isSymbolicLink())
      throw new Error(
        `[oma skill opt] cannot apply overlay: ${link} is a real vendor skill directory and would not consume the effective overlay`,
      );
  }
}

export function isProjectLocalSkillPath(
  path: string,
  installRoot: string,
): boolean {
  const rel = relative(resolve(installRoot), resolve(path));
  return rel === "" || (rel !== ".." && !rel.startsWith(`..${sep}`));
}
