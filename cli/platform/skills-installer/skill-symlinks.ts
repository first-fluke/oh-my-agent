import * as fs from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { CLI_SKILLS_DIR, INSTALLED_SKILLS_DIR } from "../../constants/index.js";
import type { CliTool } from "../../types/index.js";
import { createLink } from "../fs-link.js";
import { resolveCliSkillsDir } from "./vendor-dirs.js";

export function createVendorSymlinks(
  installRoot: string,
  cliTools: CliTool[],
  skillNames: string[],
): { created: string[]; skipped: string[] } {
  const created: string[] = [];
  const skipped: string[] = [];
  const ssotSkillsDir = resolve(installRoot, INSTALLED_SKILLS_DIR);

  try {
    fs.realpathSync(ssotSkillsDir);
  } catch {
    return { created, skipped };
  }

  for (const cli of cliTools) {
    const spec = CLI_SKILLS_DIR[cli];
    const skillsDir = spec.requiresHomeConsent
      ? spec.homePath
      : spec.projectPath;
    const linkRootDir = resolveCliSkillsDir(installRoot, cli);

    if (!fs.existsSync(linkRootDir)) {
      fs.mkdirSync(linkRootDir, { recursive: true });
    }

    for (const skillName of skillNames) {
      const source = join(ssotSkillsDir, skillName);
      const link = join(linkRootDir, skillName);

      if (!fs.existsSync(source)) {
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
        createLink(relativePath, link, "dir", ssotSkillsDir);
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

  return { created, skipped };
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
