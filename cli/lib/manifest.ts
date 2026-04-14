import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import type { Manifest, ManifestFile } from "../types/index.js";
import { http, isAxiosError } from "./http.js";
import { INSTALLED_SKILLS_DIR, REPO } from "./skills.js";

export function calculateSHA256(content: string): string {
  return createHash("sha256").update(content, "utf-8").digest("hex");
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
  if (!existsSync(versionFile)) return null;

  try {
    const content = readFileSync(versionFile, "utf-8");
    const json = JSON.parse(content);
    return json.version || null;
  } catch {
    return null;
  }
}

export function getNeedsReconcile(targetDir: string): boolean {
  const versionFile = join(targetDir, INSTALLED_SKILLS_DIR, "_version.json");
  if (!existsSync(versionFile)) return false;

  try {
    const content = readFileSync(versionFile, "utf-8");
    const json = JSON.parse(content);
    return json.needsReconcile === true;
  } catch {
    return false;
  }
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
    writeFileSync(versionFile, JSON.stringify(json, null, 2), "utf-8");
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

export async function saveLocalVersion(
  targetDir: string,
  version: string,
): Promise<void> {
  const versionFile = join(targetDir, INSTALLED_SKILLS_DIR, "_version.json");
  const versionDir = dirname(versionFile);

  if (!existsSync(versionDir)) {
    mkdirSync(versionDir, { recursive: true });
  }

  writeFileSync(versionFile, JSON.stringify({ version }, null, 2), "utf-8");
}

export async function fetchRemoteManifest(): Promise<Manifest> {
  const url = `https://raw.githubusercontent.com/${REPO}/main/prompt-manifest.json`;
  const res = await http.get<Manifest>(url);
  return res.data;
}

export async function downloadFile(
  manifestFile: ManifestFile,
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

  const targetPath = join(
    process.cwd(),
    mapManifestPathToTargetPath(manifestFile.path),
  );
  const targetDir = dirname(targetPath);

  if (!existsSync(targetDir)) {
    mkdirSync(targetDir, { recursive: true });
  }

  writeFileSync(targetPath, content, "utf-8");
  return {
    path: mapManifestPathToTargetPath(manifestFile.path),
    success: true,
  };
}

function mapManifestPathToTargetPath(path: string): string {
  if (path.startsWith(".agents/skills/")) {
    return path.replace(".agents/skills", INSTALLED_SKILLS_DIR);
  }

  return path;
}
