import { createHash, randomUUID } from "node:crypto";
import {
  copyFileSync,
  existsSync,
  lstatSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmdirSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { homedir, tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { atomicWriteFileSync } from "../utils/safe-write.js";
import { discoverSkillDirs, emitAgentSkills } from "./emit/agent-skills.js";

export const GROK_BOT_MANIFEST = ".oh-my-agent.json";
export const GROK_BOT_LOCK = ".oh-my-agent.lock";

interface Manifest {
  schemaVersion: 1;
  skills: string[];
  files: Record<string, string>;
}

export interface GrokBotSkillsOptions {
  workflowsDir?: string;
  skills?: readonly string[];
  dryRun?: boolean;
}

export interface GrokBotSkillsResult {
  directory: string;
  installed: string[];
  removed: string[];
  preserved: string[];
}

const validSkill = (value: unknown): value is string =>
  typeof value === "string" &&
  value.length <= 64 &&
  /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value);

function directoryFor(options: GrokBotSkillsOptions): string {
  const directory = resolve(
    options.workflowsDir ?? join(homedir(), "agent-data", "workflows"),
  );
  assertSafePath(directory, "");
  return directory;
}

/** Never follow a library entry or an owned path through a symlink. */
function assertSafePath(directory: string, relativePath: string): void {
  let path = directory;
  const parts = relativePath ? relativePath.split("/") : [];
  for (let index = -1; index < parts.length; index++) {
    if (index >= 0) path = join(path, parts[index] ?? "");
    let stat: ReturnType<typeof lstatSync>;
    try {
      stat = lstatSync(path);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") continue;
      throw error;
    }
    if (stat.isSymbolicLink()) {
      throw new Error(`Refusing Grok Bot symlink: ${path}`);
    }
    if (index < parts.length - 1 && !stat.isDirectory()) {
      throw new Error(`Expected a Grok Bot directory: ${path}`);
    }
  }
}

function readManifest(directory: string): Manifest {
  assertSafePath(directory, GROK_BOT_MANIFEST);
  const path = join(directory, GROK_BOT_MANIFEST);
  if (!existsSync(path)) return { schemaVersion: 1, skills: [], files: {} };
  let value: Manifest;
  try {
    value = JSON.parse(readFileSync(path, "utf8"));
    if (
      value?.schemaVersion !== 1 ||
      !Array.isArray(value.skills) ||
      !value.skills.every(validSkill) ||
      new Set(value.skills).size !== value.skills.length ||
      !value.files ||
      typeof value.files !== "object" ||
      Array.isArray(value.files)
    ) {
      throw new Error("invalid schema");
    }
    for (const [file, hash] of Object.entries(value.files)) {
      const parts = file.split("/");
      if (
        parts.length < 2 ||
        !value.skills.includes(parts[0] ?? "") ||
        parts.some((part) => !part || part === "." || part === "..") ||
        file.includes("\\") ||
        [...file].some((character) => character.charCodeAt(0) < 32) ||
        typeof hash !== "string" ||
        !/^[a-f0-9]{64}$/.test(hash)
      ) {
        throw new Error("invalid owned path or hash");
      }
    }
    if (
      value.skills.some(
        (skill) => !Object.hasOwn(value.files, `${skill}/SKILL.md`),
      )
    ) {
      throw new Error("missing skill ownership");
    }
  } catch {
    throw new Error(`Invalid Grok Bot ownership manifest: ${path}`);
  }
  return value;
}

function digest(path: string): string {
  return createHash("sha256").update(readFileSync(path)).digest("hex");
}

function collectFiles(
  directory: string,
  prefix = "",
  preserveLinks = false,
): string[] {
  const files: string[] = [];
  for (const entry of readdirSync(join(directory, prefix), {
    withFileTypes: true,
  })) {
    const path = prefix ? `${prefix}/${entry.name}` : entry.name;
    if (entry.isSymbolicLink() && preserveLinks) {
      files.push(path);
      continue;
    }
    assertSafePath(directory, path);
    if (entry.isDirectory())
      files.push(...collectFiles(directory, path, preserveLinks));
    else if (entry.isFile()) files.push(path);
    else throw new Error(`Unsupported Grok Bot file: ${path}`);
  }
  return files.sort();
}

function pruneEmptyDirectories(directory: string, skill: string): void {
  const path = join(directory, skill);
  if (!existsSync(path) || !lstatSync(path).isDirectory()) return;
  for (const entry of readdirSync(path, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      pruneEmptyDirectories(directory, `${skill}/${entry.name}`);
    }
  }
  if (readdirSync(path).length === 0) rmdirSync(path);
}

function writeManifest(directory: string, manifest: Manifest): void {
  atomicWriteFileSync(
    join(directory, GROK_BOT_MANIFEST),
    `${JSON.stringify(manifest, null, 2)}\n`,
  );
}

/** One writer owns the shared library. Ambiguous or stale locks fail closed. */
function withLibraryLock<T>(directory: string, action: () => T): T {
  assertSafePath(directory, GROK_BOT_LOCK);
  mkdirSync(directory, { recursive: true });
  const path = join(directory, GROK_BOT_LOCK);
  const token = JSON.stringify({ pid: process.pid, token: randomUUID() });
  try {
    writeFileSync(path, token, { flag: "wx", mode: 0o600 });
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "EEXIST") {
      throw new Error(
        `Grok Bot library is locked: ${path}. Confirm its recorded process has stopped before removing the lock.`,
      );
    }
    throw error;
  }
  try {
    return action();
  } finally {
    // Do not remove a replacement lock written by another owner.
    if (
      existsSync(path) &&
      !lstatSync(path).isSymbolicLink() &&
      readFileSync(path, "utf8") === token
    ) {
      rmSync(path);
    }
  }
}

function preflightInstall(
  directory: string,
  prior: Manifest,
  skills: string[],
  files: Record<string, string>,
): void {
  for (const skill of skills) {
    assertSafePath(directory, skill);
    if (existsSync(join(directory, skill)) && !prior.skills.includes(skill)) {
      throw new Error(
        `Grok Bot skill already exists and is not OMA-owned: ${skill}`,
      );
    }
  }
  for (const file of new Set([
    ...Object.keys(prior.files),
    ...Object.keys(files),
  ])) {
    assertSafePath(directory, file);
    const path = join(directory, file);
    if (!existsSync(path)) continue;
    if (!lstatSync(path).isFile()) {
      throw new Error(`Expected an owned Grok Bot file: ${path}`);
    }
    const oldHash = prior.files[file];
    if (!oldHash || digest(path) !== oldHash) {
      throw new Error(
        `Preserving locally changed or unowned Grok Bot file: ${path}`,
      );
    }
  }
}

/** Install or update portable skills without configuring a coding-agent vendor. */
export function installGrokBotSkills(
  sourceRoot: string,
  options: GrokBotSkillsOptions = {},
): GrokBotSkillsResult {
  const directory = directoryFor(options);
  readManifest(directory);
  const available = discoverSkillDirs(sourceRoot);
  const skills = [...new Set(options.skills ?? available)].sort();
  if (
    skills.length === 0 ||
    skills.some((skill) => !validSkill(skill) || !available.includes(skill))
  ) {
    throw new Error("No skills selected, or unknown Grok Bot skill requested.");
  }

  const staged = mkdtempSync(join(tmpdir(), "oma-grok-bot-"));
  try {
    const emitted = emitAgentSkills(sourceRoot, staged, {
      skills,
      resolveSharedShorthand: true,
    });
    const invalid = emitted.filter((result) => !result.validation.valid);
    if (emitted.length !== skills.length || invalid.length > 0) {
      throw new Error(
        `Invalid Grok Bot skills: ${invalid.map((result) => result.skill).join(", ") || "missing SKILL.md"}`,
      );
    }
    const files = Object.fromEntries(
      collectFiles(staged).map((file) => [file, digest(join(staged, file))]),
    );

    // Avoid creating a library for invalid/colliding payloads, then re-read and
    // revalidate under the exclusive lock before the first library mutation.
    preflightInstall(directory, readManifest(directory), skills, files);
    return withLibraryLock(directory, () => {
      const prior = readManifest(directory);
      preflightInstall(directory, prior, skills, files);
      for (const file of Object.keys(files)) {
        const target = join(directory, file);
        mkdirSync(dirname(target), { recursive: true });
        copyFileSync(join(staged, file), target);
      }
      for (const file of Object.keys(prior.files)) {
        if (!Object.hasOwn(files, file))
          rmSync(join(directory, file), { force: true });
      }
      for (const skill of prior.skills) pruneEmptyDirectories(directory, skill);
      writeManifest(directory, { schemaVersion: 1, skills, files });
      return {
        directory,
        installed: skills,
        removed: Object.keys(prior.files)
          .filter((file) => !Object.hasOwn(files, file))
          .sort(),
        preserved: [],
      };
    });
  } finally {
    rmSync(staged, { recursive: true, force: true });
  }
}

/** Remove only byte-identical owned files; retain edits and user additions. */
export function uninstallGrokBotSkills(
  options: GrokBotSkillsOptions = {},
): GrokBotSkillsResult {
  const directory = directoryFor(options);
  const run = () => uninstallFromDirectory(directory, options.dryRun ?? false);
  return options.dryRun || !existsSync(directory)
    ? run()
    : withLibraryLock(directory, run);
}

function uninstallFromDirectory(
  directory: string,
  dryRun: boolean,
): GrokBotSkillsResult {
  const prior = readManifest(directory);
  const remaining: Record<string, string> = {};
  const deletions = new Set<string>();
  // Validate every path before the first deletion, including missing parents.
  for (const file of Object.keys(prior.files)) assertSafePath(directory, file);
  for (const [file, hash] of Object.entries(prior.files)) {
    const path = join(directory, file);
    if (!existsSync(path)) continue;
    if (!lstatSync(path).isFile() || digest(path) !== hash)
      remaining[file] = hash;
    else deletions.add(file);
  }
  const skills = prior.skills.filter((skill) =>
    Object.keys(remaining).some((file) => file.startsWith(`${skill}/`)),
  );
  // A partially removed skill can retain an edited resource after SKILL.md was
  // removed. Keep its original entry as ownership evidence for future cleanup.
  for (const skill of skills) {
    const entry = `${skill}/SKILL.md`;
    remaining[entry] = prior.files[entry] ?? "";
  }
  const preserved = [
    ...new Set([
      ...Object.keys(remaining).filter(
        (file) => !deletions.has(file) && existsSync(join(directory, file)),
      ),
      ...prior.skills.flatMap((skill) =>
        existsSync(join(directory, skill))
          ? collectFiles(directory, skill, true).filter(
              (file) => !deletions.has(file),
            )
          : [],
      ),
    ]),
  ].sort();
  if (!dryRun) {
    for (const file of deletions) rmSync(join(directory, file));
    for (const skill of prior.skills) pruneEmptyDirectories(directory, skill);
    if (skills.length > 0) {
      writeManifest(directory, { schemaVersion: 1, skills, files: remaining });
    } else {
      rmSync(join(directory, GROK_BOT_MANIFEST), { force: true });
    }
  }
  return {
    directory,
    installed: [],
    removed: [...deletions].sort(),
    preserved,
  };
}
