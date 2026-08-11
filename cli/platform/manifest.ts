import { existsSync, mkdirSync, readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { http, isAxiosError } from "../io/http.js";
import type { Manifest, ManifestFile } from "../types/index.js";
import { parseFrontmatter } from "../utils/frontmatter.js";
import { sha256Hex } from "../utils/hash.js";
import { safeReadJson } from "../utils/safe-json.js";
import { atomicWriteFileSync } from "../utils/safe-write.js";
import { assertContainedRelPath } from "./path-containment.js";
import { INSTALLED_SKILLS_DIR, REPO } from "./skills-installer.js";

export function calculateSHA256(content: string): string {
  return sha256Hex(content);
}

export async function getFileSHA256(filePath: string): Promise<string | null> {
  try {
    const content = readFileSync(filePath, "utf-8");
    return calculateSHA256(content);
  } catch {
    return null;
  }
}

export async function getLocalVersion(
  targetDir: string,
): Promise<string | null> {
  const versionFile = join(targetDir, INSTALLED_SKILLS_DIR, "_version.json");
  const json = safeReadJson<{ version?: string }>(versionFile);
  return json?.version ?? null;
}

/**
 * Read the install mode ("project" | "global") stamped into `_version.json`.
 * Returns null if `_version.json` is absent or pre-dates schemaVersion=2
 * (in which case the install is implicitly project mode — backfilled by
 * migration 012 on next install/update).
 */
export function readVersionInstallMode(
  targetDir: string,
): "project" | "global" | null {
  const versionFile = join(targetDir, INSTALLED_SKILLS_DIR, "_version.json");
  const json = safeReadJson<{ mode?: unknown }>(versionFile);
  if (json?.mode === "project" || json?.mode === "global") return json.mode;
  return null;
}

/**
 * Read the schemaVersion of the local `_version.json`. Returns 0 when the
 * file is missing, 1 when the legacy shape (only `version`) is present,
 * and 2+ for current installs that include `mode`/`installedAt`.
 */
export function readVersionSchemaVersion(targetDir: string): number {
  const versionFile = join(targetDir, INSTALLED_SKILLS_DIR, "_version.json");
  const json = safeReadJson<{ schemaVersion?: unknown }>(versionFile);
  if (!json) return 0;
  return typeof json.schemaVersion === "number" ? json.schemaVersion : 1;
}

export function getNeedsReconcile(targetDir: string): boolean {
  const versionFile = join(targetDir, INSTALLED_SKILLS_DIR, "_version.json");
  const json = safeReadJson<{ needsReconcile?: unknown }>(versionFile);
  return json?.needsReconcile === true;
}

export function setNeedsReconcile(targetDir: string, value: boolean): void {
  const versionFile = join(targetDir, INSTALLED_SKILLS_DIR, "_version.json");
  if (!existsSync(versionFile)) return;

  try {
    const content = readFileSync(versionFile, "utf-8");
    const json = JSON.parse(content);
    if (value) {
      json.needsReconcile = true;
    } else {
      delete json.needsReconcile;
    }
    atomicWriteFileSync(versionFile, JSON.stringify(json, null, 2));
  } catch {
    // ignore — best-effort
  }
}

export function hasInstalledProject(targetDir: string): boolean {
  const skillsDir = join(targetDir, INSTALLED_SKILLS_DIR);
  if (!existsSync(skillsDir)) return false;

  const installationMarkers = [
    join(targetDir, ".agents", "oma-config.yaml"),
    join(targetDir, ".agents", "mcp.json"),
    join(targetDir, ".agents", "workflows"),
  ];

  return installationMarkers.some((path) => existsSync(path));
}

export const VERSION_FILE_SCHEMA_VERSION = 2 as const;

export type VersionFile = {
  schemaVersion: number;
  version: string;
  mode?: "project" | "global";
  installedAt?: string;
  needsReconcile?: boolean;
};

/**
 * Save `_version.json` with the version and (optionally) the install mode +
 * timestamp. Preserves any unrelated fields already in the file
 * (e.g., `needsReconcile`).
 *
 * @param mode — when supplied, stamps `schemaVersion: 2` + `mode` + `installedAt`.
 *               When omitted, leaves existing `mode`/`installedAt` intact
 *               (used by code paths that only know the version, not the mode).
 */
export async function saveLocalVersion(
  targetDir: string,
  version: string,
  mode?: "project" | "global",
): Promise<void> {
  const versionFile = join(targetDir, INSTALLED_SKILLS_DIR, "_version.json");
  const versionDir = dirname(versionFile);

  if (!existsSync(versionDir)) {
    mkdirSync(versionDir, { recursive: true });
  }

  // Preserve unrelated fields (needsReconcile etc.) if the file already exists
  let prior: Partial<VersionFile> = {};
  if (existsSync(versionFile)) {
    try {
      prior = JSON.parse(readFileSync(versionFile, "utf-8")) as Partial<
        Record<string, unknown>
      > as Partial<VersionFile>;
    } catch {
      prior = {};
    }
  }

  const next: VersionFile = {
    ...prior,
    schemaVersion: VERSION_FILE_SCHEMA_VERSION,
    version,
  };
  if (mode !== undefined) {
    next.mode = mode;
    next.installedAt = new Date().toISOString();
  }

  atomicWriteFileSync(versionFile, `${JSON.stringify(next, null, 2)}\n`);
}

export interface ArtifactSnapshot {
  skills: string[];
  workflows: string[];
}

export interface ArtifactDiff {
  addedSkills: string[];
  removedSkills: string[];
  addedWorkflows: string[];
  removedWorkflows: string[];
}

export function snapshotArtifacts(targetDir: string): ArtifactSnapshot {
  const skillsDir = join(targetDir, INSTALLED_SKILLS_DIR);
  const workflowsDir = join(targetDir, ".agents", "workflows");

  const skills = existsSync(skillsDir)
    ? readdirSync(skillsDir, { withFileTypes: true })
        .filter((e) => e.isDirectory() && e.name.startsWith("oma-"))
        .map((e) => e.name)
    : [];

  const workflows = existsSync(workflowsDir)
    ? readdirSync(workflowsDir, { withFileTypes: true })
        .filter((e) => e.isFile() && e.name.endsWith(".md"))
        .map((e) => e.name.replace(/\.md$/, ""))
    : [];

  return { skills: skills.sort(), workflows: workflows.sort() };
}

export function diffArtifacts(
  before: ArtifactSnapshot,
  after: ArtifactSnapshot,
): ArtifactDiff {
  const beforeSkills = new Set(before.skills);
  const afterSkills = new Set(after.skills);
  const beforeWorkflows = new Set(before.workflows);
  const afterWorkflows = new Set(after.workflows);

  return {
    addedSkills: after.skills.filter((s) => !beforeSkills.has(s)),
    removedSkills: before.skills.filter((s) => !afterSkills.has(s)),
    addedWorkflows: after.workflows.filter((w) => !beforeWorkflows.has(w)),
    removedWorkflows: before.workflows.filter((w) => !afterWorkflows.has(w)),
  };
}

export function hasArtifactChanges(diff: ArtifactDiff): boolean {
  return (
    diff.addedSkills.length > 0 ||
    diff.removedSkills.length > 0 ||
    diff.addedWorkflows.length > 0 ||
    diff.removedWorkflows.length > 0
  );
}

export function readArtifactDescription(filePath: string): string {
  if (!existsSync(filePath)) return "";

  const { frontmatter } = parseFrontmatter(readFileSync(filePath, "utf-8"));
  const description = frontmatter.description;
  if (typeof description !== "string") return "";

  const firstSentence =
    description.trim().split(/(?<=[.!?])\s+/)[0] ?? description.trim();
  return firstSentence.length > 100
    ? `${firstSentence.slice(0, 97)}...`
    : firstSentence;
}

export function readSkillDescription(
  targetDir: string,
  skillName: string,
): string {
  return readArtifactDescription(
    join(targetDir, INSTALLED_SKILLS_DIR, skillName, "SKILL.md"),
  );
}

export function readWorkflowDescription(
  targetDir: string,
  workflowName: string,
): string {
  return readArtifactDescription(
    join(targetDir, ".agents", "workflows", `${workflowName}.md`),
  );
}

export async function fetchRemoteManifest(): Promise<Manifest> {
  const url = `https://raw.githubusercontent.com/${REPO}/main/prompt-manifest.json`;
  const res = await http.get<Manifest>(url);
  return res.data;
}

export async function downloadFile(
  manifestFile: ManifestFile,
  installRoot: string = process.cwd(),
): Promise<{ path: string; success: boolean; error?: string }> {
  const url = `https://raw.githubusercontent.com/${REPO}/main/${manifestFile.path}`;
  let content: string;

  try {
    const res = await http.get<string>(url, { responseType: "text" });
    content = res.data;
  } catch (error) {
    return {
      path: manifestFile.path,
      success: false,
      error: isAxiosError(error)
        ? `HTTP ${error.response?.status ?? error.code}`
        : String(error),
    };
  }

  const actualSHA256 = calculateSHA256(content);

  if (actualSHA256 !== manifestFile.sha256) {
    return {
      path: manifestFile.path,
      success: false,
      error: "SHA256 mismatch",
    };
  }

  const mappedRelPath = mapManifestPathToTargetPath(manifestFile.path);

  try {
    assertContainedRelPath(installRoot, mappedRelPath, "manifest file path");
  } catch (err) {
    return {
      path: manifestFile.path,
      success: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }

  const targetPath = join(installRoot, mappedRelPath);
  const targetDir = dirname(targetPath);

  if (!existsSync(targetDir)) {
    mkdirSync(targetDir, { recursive: true });
  }

  atomicWriteFileSync(targetPath, content);
  return {
    path: mappedRelPath,
    success: true,
  };
}

function mapManifestPathToTargetPath(path: string): string {
  if (path.startsWith(".agents/skills/")) {
    return path.replace(".agents/skills", INSTALLED_SKILLS_DIR);
  }

  return path;
}
