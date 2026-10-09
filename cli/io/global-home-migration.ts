import { createHash, randomUUID } from "node:crypto";
import {
  constants,
  copyFileSync,
  existsSync,
  linkSync,
  lstatSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  realpathSync,
  renameSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
import { homedir } from "node:os";
import { dirname, join, relative, resolve, sep } from "node:path";
import { SKILLS } from "../constants/skill-data.js";
import { readManagedSkills } from "../platform/managed-skill-ownership.js";
import { acquireLock } from "../utils/install-lock.js";
import { omaHome } from "../utils/oma-home.js";
import { acquireOwnedDirectoryLock } from "../utils/owned-directory-lock.js";
import { migrateGlobalServices } from "./global-home-service-migration.js";

export interface GlobalHomeMigrationResult {
  copied: string[];
  conflicts: string[];
  deferred: string[];
}

export interface GlobalHomeMigrationOptions {
  dryRun?: boolean;
  homeDir?: string;
  env?: NodeJS.ProcessEnv;
}

const definitionDirs = [
  "agents",
  "workflows",
  "rules",
  "hooks",
  "config",
  "scripts",
  "docs",
  "evolution",
];
const definitionFiles = [
  "oma-config.cue",
  "oma-config.yaml",
  "oma-config.local.cue",
  "oma-config.local.yaml",
  "mcp.json",
  "mcp_config.json",
  "hooks.json",
  "skills/_version.json",
  "state/managed-skills.json",
  "state/provider-mcp.json",
  "state/provider-selection.json",
];

function readJson(file: string): Record<string, unknown> | null {
  try {
    const value: unknown = JSON.parse(readFileSync(file, "utf8"));
    return value && typeof value === "object" && !Array.isArray(value)
      ? (value as Record<string, unknown>)
      : null;
  } catch {
    return null;
  }
}

function hash(file: string): string {
  return createHash("sha256").update(readFileSync(file)).digest("hex");
}

function canonicalPath(file: string): string {
  let ancestor = resolve(file);
  const missing: string[] = [];
  while (!existsSync(ancestor)) {
    const parent = dirname(ancestor);
    if (parent === ancestor) break;
    missing.unshift(ancestor.slice(parent.length).replace(/^[/\\]+/, ""));
    ancestor = parent;
  }
  return join(realpathSync(ancestor), ...missing);
}

function within(file: string, parent: string): boolean {
  const rel = relative(parent, file);
  return (
    rel === "" ||
    (rel !== ".." && !rel.startsWith(`..${sep}`) && !rel.startsWith(sep))
  );
}

/** Refuse both leaf symlinks and symlink ancestors inside a migration tree. */
function safePath(anchor: string, file: string): void {
  const rel = relative(anchor, file);
  if (rel.startsWith(`..${sep}`) || rel === "..")
    throw new Error(`Path escapes ${anchor}`);
  let current = anchor;
  for (const part of ["", ...rel.split(sep).filter(Boolean)]) {
    if (part) current = join(current, part);
    if (
      existsSync(current) ||
      (() => {
        try {
          lstatSync(current);
          return true;
        } catch {
          return false;
        }
      })()
    ) {
      const stat = lstatSync(current);
      if (stat.isSymbolicLink())
        throw new Error(`Symlink requires manual migration: ${current}`);
    }
  }
}

function copyTree(
  sourceRoot: string,
  destinationRoot: string,
  relativePath: string,
  dryRun: boolean,
  result: GlobalHomeMigrationResult,
): void {
  const source = join(sourceRoot, relativePath);
  const destination = join(destinationRoot, relativePath);
  try {
    safePath(sourceRoot, source);
    if (!existsSync(source)) return;
    safePath(destinationRoot, destination);
    const stat = lstatSync(source);
    if (stat.isDirectory()) {
      if (existsSync(destination) && !lstatSync(destination).isDirectory()) {
        result.conflicts.push(`${destination}: destination is not a directory`);
        return;
      }
      for (const name of readdirSync(source)) {
        if (name.endsWith(".lock") || name.startsWith(".migration-")) continue;
        copyTree(
          sourceRoot,
          destinationRoot,
          join(relativePath, name),
          dryRun,
          result,
        );
      }
      return;
    }
    if (!stat.isFile()) {
      result.conflicts.push(`${source}: unsupported file type`);
      return;
    }
    if (existsSync(destination)) {
      if (
        !lstatSync(destination).isFile() ||
        hash(source) !== hash(destination)
      )
        result.conflicts.push(
          `${source} -> ${destination}: different destination exists`,
        );
      return;
    }
    if (!dryRun) {
      mkdirSync(dirname(destination), { recursive: true, mode: 0o700 });
      safePath(destinationRoot, destination);
      const temporary = join(
        dirname(destination),
        `.migration-${randomUUID()}.tmp`,
      );
      try {
        copyFileSync(source, temporary, constants.COPYFILE_EXCL);
        if (hash(source) !== hash(temporary)) {
          result.conflicts.push(
            `${source}: changed while copying; retry after stopping old writers`,
          );
          return;
        }
        // Publish only a complete file, without replacing a concurrent destination.
        linkSync(temporary, destination);
      } finally {
        if (existsSync(temporary)) unlinkSync(temporary);
      }
    }
    result.copied.push(`${source} -> ${destination}`);
  } catch (error) {
    result.conflicts.push(
      `${source}: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

function receiptFile(destinationHome: string, area: string): string {
  return join(destinationHome, "state", "migrations", `global-${area}.json`);
}

function completed(
  destinationHome: string,
  source: string,
  area: string,
): boolean {
  const file = receiptFile(destinationHome, area);
  safePath(destinationHome, file);
  const receipt = readJson(file);
  return (
    receipt?.schemaVersion === 1 &&
    receipt.source === source &&
    receipt.completed === true
  );
}

function finish(
  destinationHome: string,
  source: string,
  area: string,
  dryRun: boolean,
): void {
  if (dryRun) return;
  const target = receiptFile(destinationHome, area);
  safePath(destinationHome, target);
  mkdirSync(dirname(target), { recursive: true, mode: 0o700 });
  const temporary = `${target}.${randomUUID()}.tmp`;
  writeFileSync(
    temporary,
    JSON.stringify(
      {
        schemaVersion: 1,
        source,
        completed: true,
        completedAt: new Date().toISOString(),
      },
      null,
      2,
    ),
    { mode: 0o600 },
  );
  renameSync(temporary, target);
}

function migrateDefinitions(
  home: string,
  destinationHome: string,
  dryRun: boolean,
  result: GlobalHomeMigrationResult,
): void {
  const source = join(home, ".agents");
  if (!existsSync(source) || completed(destinationHome, source, "definitions"))
    return;
  const version = readJson(join(source, "skills", "_version.json"));
  const owned = readManagedSkills(home);
  // An unrelated ~/.agents directory is not evidence of an OMA global install.
  if ((!version || typeof version.version !== "string") && owned.size === 0)
    return;
  if (version?.mode === "project") {
    result.deferred.push(
      `${source}: project-mode install in HOME; migrate explicitly after choosing its ownership`,
    );
    return;
  }
  if (existsSync(join(source, "_install.lock"))) {
    result.deferred.push(
      `${source}: legacy install lock exists; finish the old installer first`,
    );
    return;
  }
  const destination = join(destinationHome, ".agents");
  if (resolve(source) === resolve(destination)) return;
  const before = result.conflicts.length;
  // Legacy releases lack ownership metadata. Restrict copies to distribution
  // names under a verified OMA install, leaving all other user skills in place.
  const skills = owned.size
    ? owned
    : new Set([
        "_shared",
        ...Object.values(SKILLS)
          .flat()
          .map((skill) => skill.name),
      ]);
  const sourceLock = dryRun ? null : acquireLock(home);
  if (sourceLock && !sourceLock.ok) {
    result.deferred.push(
      `${source}: legacy installer acquired its lock; retry after it finishes`,
    );
    return;
  }
  try {
    for (const name of [...definitionDirs, ...definitionFiles])
      copyTree(source, destination, name, dryRun, result);
    for (const name of skills)
      copyTree(source, destination, join("skills", name), dryRun, result);
    if (result.conflicts.length === before)
      finish(destinationHome, source, "definitions", dryRun);
  } finally {
    if (sourceLock?.ok) sourceLock.release();
  }
}

function profileSnapshot(root: string): { stamp: string; busy: boolean } {
  const digest = createHash("sha256");
  let busy = false;
  function walk(directory: string) {
    for (const entry of readdirSync(directory, { withFileTypes: true }).sort(
      (a, b) => a.name.localeCompare(b.name),
    )) {
      const file = join(directory, entry.name);
      safePath(root, file);
      digest.update(relative(root, file));
      if (
        entry.name.endsWith(".lock") ||
        (entry.name === "locks" &&
          entry.isDirectory() &&
          readdirSync(file).length)
      )
        busy = true;
      if (entry.isDirectory()) walk(file);
      else if (entry.isFile()) {
        const bytes = readFileSync(file);
        digest.update(bytes);
        if (entry.name.endsWith(".json")) {
          const record = readJson(file);
          if (record?.status === "running" || /lease/i.test(entry.name))
            busy = true;
          for (const key of ["runnerPid", "ownerPid", "pid"]) {
            const pid = record?.[key];
            if (
              typeof pid !== "number" ||
              pid <= 0 ||
              !Number.isSafeInteger(pid)
            )
              continue;
            try {
              process.kill(pid, 0);
              busy = true;
            } catch (error) {
              if ((error as NodeJS.ErrnoException).code !== "ESRCH")
                busy = true;
            }
          }
        }
      }
    }
  }
  walk(root);
  return { stamp: digest.digest("hex"), busy };
}

function activeProfiles(source: string): boolean {
  for (const slot of readdirSync(source, { withFileTypes: true })) {
    if (!slot.isDirectory()) continue;
    const sessions = join(source, slot.name, "sessions");
    if (!existsSync(sessions)) continue;
    for (const session of readdirSync(sessions, { withFileTypes: true })) {
      if (!session.isDirectory()) continue;
      const meta = readJson(join(sessions, session.name, "meta.json"));
      // Unknown state cannot establish that all writers have finished.
      if (meta?.status !== "completed" && meta?.status !== "failed")
        return true;
    }
  }
  return false;
}

function migrateProfiles(
  home: string,
  destinationHome: string,
  env: NodeJS.ProcessEnv,
  dryRun: boolean,
  result: GlobalHomeMigrationResult,
): void {
  if (env.OMA_STATE_HOME !== undefined) return;
  const sourceHome = join(home, ".oma");
  const source = join(sourceHome, "u");
  if (
    resolve(sourceHome) === resolve(destinationHome) ||
    !existsSync(source) ||
    completed(destinationHome, source, "profiles")
  )
    return;
  try {
    safePath(sourceHome, source);
    if (activeProfiles(source)) {
      result.deferred.push(
        `${source}: active or unknown session status; stop old sessions before retrying`,
      );
      return;
    }
    const snapshot = profileSnapshot(source);
    if (snapshot.busy) {
      result.deferred.push(
        `${source}: running agent, lease, or writer lock; stop old writers before retrying`,
      );
      return;
    }
    const before = result.conflicts.length;
    copyTree(sourceHome, destinationHome, "u", dryRun, result);
    const after = profileSnapshot(source);
    if (
      after.busy ||
      after.stamp !== snapshot.stamp ||
      activeProfiles(source)
    ) {
      result.deferred.push(
        `${source}: profile data changed during migration; stop old writers and review copied files before retrying`,
      );
      return;
    }
    if (result.conflicts.length === before)
      finish(destinationHome, source, "profiles", dryRun);
  } catch (error) {
    result.conflicts.push(`${source}: ${String(error)}`);
  }
}

/** Copies OMA-owned legacy data once; originals and unrelated user data remain. */
export async function migrateGlobalHome(
  options: GlobalHomeMigrationOptions = {},
): Promise<GlobalHomeMigrationResult> {
  const homeDir = options.homeDir ?? homedir();
  const env = options.env ?? process.env;
  const destinationHome = omaHome(env, homeDir);
  const result: GlobalHomeMigrationResult = {
    copied: [],
    conflicts: [],
    deferred: [],
  };
  const dryRun = options.dryRun === true;
  const canonicalDestination = canonicalPath(destinationHome);
  for (const legacyTree of [
    join(homeDir, ".agents"),
    join(homeDir, ".config", "oma"),
    join(homeDir, ".oma", "u"),
  ]) {
    if (within(canonicalDestination, canonicalPath(legacyTree))) {
      result.conflicts.push(
        `OMA_HOME overlaps a legacy source tree: ${legacyTree}`,
      );
      return result;
    }
  }
  // Resolve an existing ancestor so a custom destination cannot alias source HOME.
  if (
    resolve(destinationHome) === resolve(homeDir) ||
    (existsSync(destinationHome) &&
      realpathSync(destinationHome) === realpathSync(homeDir))
  ) {
    result.conflicts.push(
      "OMA_HOME must be a dedicated directory, separate from the native HOME",
    );
    return result;
  }
  safePath(destinationHome, join(destinationHome, "state", "migrations"));
  const lock = dryRun
    ? null
    : acquireOwnedDirectoryLock(
        join(destinationHome, "state", "migrations", "global-home.lock"),
      );
  if (lock && !lock.ok) {
    result.deferred.push("Another global home migration is running");
    return result;
  }
  try {
    migrateDefinitions(homeDir, destinationHome, dryRun, result);
    migrateProfiles(homeDir, destinationHome, env, dryRun, result);
    const services = await migrateGlobalServices({
      homeDir,
      destinationHome,
      dryRun,
    });
    result.copied.push(...services.copied);
    result.conflicts.push(...services.conflicts);
    result.deferred.push(...services.deferred);
    return result;
  } catch (error) {
    result.conflicts.push(
      error instanceof Error ? error.message : String(error),
    );
    return result;
  } finally {
    if (lock?.ok) lock.release();
  }
}
