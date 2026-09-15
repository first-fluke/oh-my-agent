import { createHash } from "node:crypto";
import {
  existsSync,
  lstatSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  realpathSync,
  renameSync,
  symlinkSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
import { dirname, join, relative, resolve, sep } from "node:path";
import { AGENTS_SKILLS_DIR } from "../constants/paths.js";

/** Project-owned storage for optimizer-approved replacements of managed skills. */
export const SKILL_OVERLAYS_DIR = ".agents/evolution/skills";
const OVERLAY_FILE = "overlay.json";

function contentHash(text: string): string {
  return createHash("sha256").update(text).digest("hex").slice(0, 16);
}

export interface SkillOverlayMetadata {
  schemaVersion: 1;
  skillId: string;
  baseHash: string;
  parentEffectiveHash: string;
  candidateHash: string;
  /** Immutable directory under versions/ that contains the approved body. */
  version: string;
  appliedAt: string;
}

export interface EffectiveSkill {
  body: string;
  /** Directory a native vendor must link, rather than only the body it evaluates. */
  directory: string;
  skillMdPath: string;
  kind: "base" | "overlay";
  baseHash: string;
  effectiveHash: string;
  conflict?: "base-changed" | "overlay-corrupt";
}

function assertSkillId(skillId: string): void {
  if (
    !skillId ||
    skillId.includes("..") ||
    skillId.includes("/") ||
    skillId.includes(sep)
  )
    throw new Error(`skill ID must be a simple identifier: ${skillId}`);
}

export function managedSkillDirectory(
  workspace: string,
  skillId: string,
): string {
  assertSkillId(skillId);
  return join(workspace, AGENTS_SKILLS_DIR, skillId);
}

export function managedSkillMdPath(workspace: string, skillId: string): string {
  return join(managedSkillDirectory(workspace, skillId), "SKILL.md");
}

export function skillOverlayDirectory(
  workspace: string,
  skillId: string,
): string {
  assertSkillId(skillId);
  return join(workspace, SKILL_OVERLAYS_DIR, skillId);
}

export function skillOverlayMdPath(workspace: string, skillId: string): string {
  const metadata = readMetadata(workspace, skillId);
  return metadata
    ? join(
        skillOverlayDirectory(workspace, skillId),
        "versions",
        metadata.version,
        "SKILL.md",
      )
    : join(
        skillOverlayDirectory(workspace, skillId),
        "versions",
        "inactive",
        "SKILL.md",
      );
}

function metadataPath(workspace: string, skillId: string): string {
  return join(skillOverlayDirectory(workspace, skillId), OVERLAY_FILE);
}

function readBody(path: string): string {
  if (!existsSync(path)) return "";
  try {
    return readFileSync(path, "utf-8");
  } catch {
    return "";
  }
}

function readMetadata(
  workspace: string,
  skillId: string,
): SkillOverlayMetadata | undefined {
  const path = metadataPath(workspace, skillId);
  if (!existsSync(path)) return undefined;
  try {
    const value = JSON.parse(
      readFileSync(path, "utf-8"),
    ) as SkillOverlayMetadata;
    if (
      value.schemaVersion !== 1 ||
      value.skillId !== skillId ||
      typeof value.baseHash !== "string" ||
      typeof value.candidateHash !== "string" ||
      typeof value.parentEffectiveHash !== "string" ||
      typeof value.version !== "string" ||
      !/^[a-f0-9]{16}$/.test(value.version)
    )
      return undefined;
    return value;
  } catch {
    return undefined;
  }
}

function atomicWrite(path: string, text: string): void {
  mkdirSync(dirname(path), { recursive: true });
  const tmp = `${path}.tmp`;
  writeFileSync(tmp, text, "utf-8");
  renameSync(tmp, path);
}

function ensureOwnedDirectory(workspace: string, path: string): void {
  const relativePath = relative(resolve(workspace), resolve(path));
  if (relativePath.startsWith(`..${sep}`) || relativePath === "..")
    throw new Error("[oma skill opt] overlay path escapes the workspace");
  let current = resolve(workspace);
  for (const part of relativePath.split(sep).filter(Boolean)) {
    current = join(current, part);
    if (existsSync(current) && lstatSync(current).isSymbolicLink())
      throw new Error(
        "[oma skill opt] refusing to write through an overlay symlink",
      );
  }
  mkdirSync(path, { recursive: true });
}

function pointsWithin(path: string, root: string): boolean {
  const rel = relative(resolve(root), resolve(path));
  return rel === "" || (!rel.startsWith(`..${sep}`) && rel !== "..");
}

/**
 * Recreate only OMA-owned links in an overlay projection. A projection keeps
 * the same relative resource layout as `.agents/skills/<id>` without writing
 * to the managed source. Linking entries, rather than copying them, also lets
 * an update refresh resources while the pinned SKILL.md remains immutable.
 */
function materializeOverlayResources(
  workspace: string,
  skillId: string,
  versionDir: string,
): void {
  const sourceSkills = join(workspace, AGENTS_SKILLS_DIR);
  const source = managedSkillDirectory(workspace, skillId);
  const target = versionDir;
  if (!existsSync(source) || !lstatSync(source).isDirectory()) return;
  ensureOwnedDirectory(workspace, target);

  for (const entry of readDirNames(source)) {
    if (entry === "SKILL.md") continue;
    linkProjectionEntry(join(source, entry), join(target, entry), sourceSkills);
  }

  // References such as ../_shared/foo.md retain their meaning from the
  // projection's sibling directory. Do not replace another active overlay.
  const projectionRoot = dirname(target);
  ensureOwnedDirectory(workspace, projectionRoot);
  for (const entry of readDirNames(sourceSkills)) {
    if (entry === skillId || entry.startsWith(".")) continue;
    const projected = join(projectionRoot, entry);
    if (existsSync(projected)) continue;
    linkProjectionEntry(join(sourceSkills, entry), projected, sourceSkills);
  }
}

function readDirNames(path: string): string[] {
  try {
    return readdirSync(path).filter((name) => name !== "." && name !== "..");
  } catch {
    return [];
  }
}

function linkProjectionEntry(
  source: string,
  target: string,
  sourceSkillsRoot: string,
): void {
  if (!pointsWithin(source, sourceSkillsRoot)) return;
  if (existsSync(target)) return;
  try {
    const sourceStat = lstatSync(source);
    const realSource = realpathSync(source);
    const realRoot = realpathSync(sourceSkillsRoot);
    if (!pointsWithin(realSource, realRoot)) return;
    const linkTarget = relative(dirname(target), source);
    symlinkSync(linkTarget, target, sourceStat.isDirectory() ? "dir" : "file");
  } catch {
    // A resource missing during an update is equivalent to it missing in the
    // managed source. The resolver remains safe and uses the pinned body.
  }
}

/** Resolve the only body and directory that eval and native vendors may consume. */
export function resolveEffectiveSkill(
  workspace: string,
  skillId: string,
): EffectiveSkill {
  const basePath = managedSkillMdPath(workspace, skillId);
  const baseBody = readBody(basePath);
  const baseHash = contentHash(baseBody);
  const base: EffectiveSkill = {
    body: baseBody,
    directory: dirname(basePath),
    skillMdPath: basePath,
    kind: "base",
    baseHash,
    effectiveHash: baseHash,
  };
  const metadata = readMetadata(workspace, skillId);
  const overlayPath = metadata
    ? join(
        skillOverlayDirectory(workspace, skillId),
        "versions",
        metadata.version,
        "SKILL.md",
      )
    : "";
  const overlayBody = readBody(overlayPath);
  if (!metadata && existsSync(overlayPath))
    return { ...base, conflict: "overlay-corrupt" };
  if (!metadata) return base;
  if (metadata.baseHash !== baseHash)
    return { ...base, conflict: "base-changed" };
  if (contentHash(overlayBody) !== metadata.candidateHash)
    return { ...base, conflict: "overlay-corrupt" };
  materializeOverlayResources(workspace, skillId, dirname(overlayPath));
  return {
    body: overlayBody,
    directory: dirname(overlayPath),
    skillMdPath: overlayPath,
    kind: "overlay",
    baseHash,
    effectiveHash: metadata.candidateHash,
  };
}

export interface ApplySkillOverlayInput {
  workspace: string;
  skillId: string;
  body: string;
  expectedBaseHash: string;
  expectedEffectiveHash: string;
  /** Test seam for simulating an active-pointer write failure. */
  _writeActivePointer?: (path: string, text: string) => void;
}

/**
 * Compare-and-swap an approved body into project-owned overlay storage.
 * Metadata is the activation switch: if a process stops between body and
 * metadata writes, the resolver sees a corrupt/inactive overlay and consumes
 * the base instead of an unverified partial promotion.
 */
export function applySkillOverlay(
  input: ApplySkillOverlayInput,
): SkillOverlayMetadata {
  const current = resolveEffectiveSkill(input.workspace, input.skillId);
  if (current.baseHash !== input.expectedBaseHash)
    throw new Error(
      "[oma skill opt] managed SKILL.md changed before overlay apply; refusing to overwrite or reuse its evaluation",
    );
  if (current.effectiveHash !== input.expectedEffectiveHash || current.conflict)
    throw new Error(
      "[oma skill opt] effective SKILL.md changed before overlay apply; refusing to discard unknown edits",
    );

  const metadata: SkillOverlayMetadata = {
    schemaVersion: 1,
    skillId: input.skillId,
    baseHash: current.baseHash,
    parentEffectiveHash: current.effectiveHash,
    candidateHash: contentHash(input.body),
    version: contentHash(input.body),
    appliedAt: new Date().toISOString(),
  };
  const versionDir = join(
    skillOverlayDirectory(input.workspace, input.skillId),
    "versions",
    metadata.version,
  );
  if (existsSync(versionDir)) {
    // A pointer-write failure can leave a fully written but inactive immutable
    // version. Reusing only byte-identical content makes that failure retryable
    // without ever replacing an existing version's evidence.
    if (
      lstatSync(versionDir).isSymbolicLink() ||
      contentHash(readBody(join(versionDir, "SKILL.md"))) !==
        metadata.candidateHash
    )
      throw new Error(
        "[oma skill opt] overlay version already exists with different content; refusing to replace immutable overlay evidence",
      );
  } else {
    materializeOverlayResources(input.workspace, input.skillId, versionDir);
    atomicWrite(join(versionDir, "SKILL.md"), input.body);
  }
  const pointer = `${JSON.stringify(metadata, null, 2)}\n`;
  (input._writeActivePointer ?? atomicWrite)(
    metadataPath(input.workspace, input.skillId),
    pointer,
  );
  return metadata;
}

export interface RollbackSkillOverlayInput {
  workspace: string;
  skillId: string;
  expectedCandidateHash: string;
  parentHash: string;
  parentBody: string;
}

/** Restore an earlier overlay, or deactivate the first overlay back to base. */
export function rollbackSkillOverlay(input: RollbackSkillOverlayInput): void {
  const metadata = readMetadata(input.workspace, input.skillId);
  if (!metadata)
    throw new Error("[oma skill rollback] no active overlay to restore");
  const overlayPath = join(
    skillOverlayDirectory(input.workspace, input.skillId),
    "versions",
    metadata.version,
    "SKILL.md",
  );
  if (
    !existsSync(overlayPath) ||
    contentHash(readBody(overlayPath)) !== input.expectedCandidateHash
  )
    throw new Error(
      "[oma skill rollback] overlay differs from the promoted candidate; refusing to discard unknown edits",
    );
  // A first overlay's parent is the base pinned at apply time. Even if that
  // managed base has since changed, deactivation is safe: it never writes the
  // managed file and intentionally returns consumption to its newer body.
  if (input.parentHash === metadata.baseHash) {
    const meta = metadataPath(input.workspace, input.skillId);
    if (existsSync(meta)) unlinkSync(meta);
    return;
  }
  if (contentHash(input.parentBody) !== input.parentHash)
    throw new Error(
      "[oma skill rollback] overlay backup does not match the recorded parent body",
    );
  const restoredMetadata: SkillOverlayMetadata = {
    schemaVersion: 1,
    skillId: input.skillId,
    baseHash: metadata.baseHash,
    parentEffectiveHash: input.expectedCandidateHash,
    candidateHash: input.parentHash,
    version: input.parentHash,
    appliedAt: new Date().toISOString(),
  };
  const versionDir = join(
    skillOverlayDirectory(input.workspace, input.skillId),
    "versions",
    restoredMetadata.version,
  );
  if (!existsSync(versionDir)) {
    materializeOverlayResources(input.workspace, input.skillId, versionDir);
    atomicWrite(join(versionDir, "SKILL.md"), input.parentBody);
  }
  atomicWrite(
    metadataPath(input.workspace, input.skillId),
    `${JSON.stringify(restoredMetadata, null, 2)}\n`,
  );
}
