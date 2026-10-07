import { existsSync, lstatSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { atomicWriteFileSync } from "../utils/safe-write.js";

export const SKILL_OWNERSHIP_PATH = ".agents/state/managed-skills.json";
const validName = (name: unknown): name is string =>
  typeof name === "string" &&
  /^(?:_shared|[A-Za-z0-9][A-Za-z0-9._-]*)$/.test(name);

/** Missing or malformed metadata never grants ownership of an existing skill. */
export function readManagedSkills(root: string): Set<string> {
  try {
    const value = JSON.parse(
      readFileSync(join(root, SKILL_OWNERSHIP_PATH), "utf8"),
    );
    if (value?.schemaVersion === 1 && Array.isArray(value.skills)) {
      return new Set(value.skills.filter(validName));
    }
  } catch {
    /* Legacy installs have no ownership evidence. */
  }
  return new Set();
}

export function recordManagedSkills(
  root: string,
  names: Iterable<string>,
): void {
  const skills = readManagedSkills(root);
  for (const name of names) if (validName(name)) skills.add(name);
  atomicWriteFileSync(
    join(root, SKILL_OWNERSHIP_PATH),
    `${JSON.stringify({ schemaVersion: 1, skills: [...skills].sort() }, null, 2)}\n`,
  );
}

/** Bulk updates record only directories shipped by this release and retained locally. */
export function recordUpdatedSkills(source: string, root: string): void {
  const sourceDir = join(source, ".agents/skills");
  if (!existsSync(sourceDir)) return;
  const names = readdirSync(sourceDir, { withFileTypes: true })
    .filter((entry) => {
      if (!entry.isDirectory() || !validName(entry.name)) return false;
      try {
        return lstatSync(
          join(root, ".agents/skills", entry.name),
        ).isDirectory();
      } catch {
        return false;
      }
    })
    .map((entry) => entry.name);
  recordManagedSkills(root, names);
}
