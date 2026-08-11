import * as fs from "node:fs";
import { homedir } from "node:os";
import * as path from "node:path";
import * as p from "@clack/prompts";
import pc from "picocolors";
import { CLI_SKILLS_DIR, INSTALLED_SKILLS_DIR } from "../../constants/index.js";
import { getInstallRoot } from "../../platform/install-context.js";
import { vendorSkillsDir } from "../../platform/skills-installer/vendor-dirs.js";
import type { CliTool } from "../../types/index.js";

export type UninstallOptions = {
  yes?: boolean;
  dryRun?: boolean;
  global?: boolean;
};

export type RemovalEntry = {
  path: string;
  kind: "dir" | "file" | "symlink";
  reason: string;
};

/**
 * Files that are user-owned and must never be deleted.
 * Returned in the "preserved" section of the preview.
 */
const OMA_CONFIG_YAML = "oma-config.yaml";
const MCP_JSON = "mcp.json";
const OMA_GENERATED_MARKER = "<!-- oma:generated -->";

/**
 * Detect the kind of a filesystem entry.
 * Returns null when the path does not exist.
 */
function detectKind(entryPath: string): "dir" | "file" | "symlink" | null {
  try {
    const stat = fs.lstatSync(entryPath);
    if (stat.isSymbolicLink()) return "symlink";
    if (stat.isDirectory()) return "dir";
    return "file";
  } catch {
    return null;
  }
}

/**
 * Returns true when the file at `filePath` contains the oma:generated marker.
 */
function hasOmaMarker(filePath: string): boolean {
  try {
    const content = fs.readFileSync(filePath, "utf-8");
    return content.includes(OMA_GENERATED_MARKER);
  } catch {
    return false;
  }
}

/**
 * Returns true when `entryPath` is a vendor workflow entry: a real directory
 * whose `SKILL.md` is a symlink resolving into `.agents/workflows/` (created by
 * `createVendorWorkflowSymlinks`). These are oma-owned, not user-authored.
 */
function isWorkflowSymlinkDir(entryPath: string, installRoot: string): boolean {
  const skillFile = path.join(entryPath, "SKILL.md");
  try {
    if (!fs.lstatSync(skillFile).isSymbolicLink()) return false;
    const target = fs.realpathSync(skillFile);
    const workflowsDir = fs.realpathSync(
      path.join(installRoot, ".agents", "workflows"),
    );
    return (
      target === workflowsDir || target.startsWith(workflowsDir + path.sep)
    );
  } catch {
    return false;
  }
}

/**
 * Returns true when `entryPath` is itself a symlink resolving directly into
 * `.agents/workflows/` (created by `installZcodeWorkflowCommands`). These are
 * the flat `.zcode/commands/<name>.md` workflow links — oma-owned, not
 * user-authored.
 */
function isWorkflowSymlinkFile(
  entryPath: string,
  installRoot: string,
): boolean {
  try {
    if (!fs.lstatSync(entryPath).isSymbolicLink()) return false;
    const target = fs.realpathSync(entryPath);
    const workflowsDir = fs.realpathSync(
      path.join(installRoot, ".agents", "workflows"),
    );
    return path.dirname(target) === workflowsDir;
  } catch {
    return false;
  }
}

/**
 * Returns true when the symlink at `entryPath` resolves into THIS install's
 * `.agents/` tree. Vendor skill dirs that live under HOME (requiresHomeConsent
 * vendors, or any dir shared between installs) can contain symlinks created by
 * a global install or by another project's install — those must be preserved.
 * Dangling symlinks fall back to lexical resolution of the raw link target so
 * a half-removed install can still be cleaned up.
 */
function symlinkTargetsInstall(
  entryPath: string,
  installRoot: string,
): boolean {
  try {
    const raw = fs.readlinkSync(entryPath);
    const lexical = path.resolve(path.dirname(entryPath), raw);

    let target = lexical;
    try {
      target = fs.realpathSync(lexical);
    } catch {
      // Dangling link — keep the lexical resolution.
    }

    let agentsDir = path.resolve(installRoot, ".agents");
    try {
      agentsDir = fs.realpathSync(agentsDir);
    } catch {
      // `.agents/` already gone — compare lexically.
    }

    return target === agentsDir || target.startsWith(agentsDir + path.sep);
  } catch {
    return false;
  }
}

/**
 * Scan a directory for child entries. Returns an empty array when the directory
 * does not exist or cannot be read.
 */
function listDir(dir: string): fs.Dirent[] {
  try {
    return fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return [];
  }
}

/**
 * Build the full removal plan for an oma installation rooted at `installRoot`.
 *
 * Returns:
 *   omaOwned  — entries that oma created and can safely be removed
 *   userOwned — entries the user may have authored; shown in preview but never deleted
 */
export function buildRemovalPlan(installRoot: string): {
  omaOwned: RemovalEntry[];
  userOwned: RemovalEntry[];
} {
  const omaOwned: RemovalEntry[] = [];
  const userOwned: RemovalEntry[] = [];

  // ── SSOT directories ──────────────────────────────────────────────────────

  // .agents/skills/*  — individual skill directories created by installSkill
  // plus oma-managed files like _version.json (install metadata, written by
  // saveLocalVersion) and _shared/ (vendor-agnostic shared assets).
  const skillsDir = path.join(installRoot, INSTALLED_SKILLS_DIR);
  for (const entry of listDir(skillsDir)) {
    const entryPath = path.join(skillsDir, entry.name);
    const kind = detectKind(entryPath);
    if (kind === null) continue;

    let reason: string;
    if (entry.name === "_version.json") {
      reason = "oma install metadata (saveLocalVersion)";
    } else if (entry.name === "_shared") {
      reason = "shared assets (installShared)";
    } else {
      reason = "skill directory (installSkill)";
    }

    omaOwned.push({ path: entryPath, kind, reason });
  }

  // .agents/workflows/ — full directory
  const workflowsDir = path.join(installRoot, ".agents", "workflows");
  if (detectKind(workflowsDir) === "dir") {
    omaOwned.push({
      path: workflowsDir,
      kind: "dir",
      reason: "created by installWorkflows",
    });
  }

  // .agents/rules/ — full directory
  const rulesDir = path.join(installRoot, ".agents", "rules");
  if (detectKind(rulesDir) === "dir") {
    omaOwned.push({
      path: rulesDir,
      kind: "dir",
      reason: "created by installRules",
    });
  }

  // .agents/config/ — full directory
  const configDir = path.join(installRoot, ".agents", "config");
  if (detectKind(configDir) === "dir") {
    omaOwned.push({
      path: configDir,
      kind: "dir",
      reason: "created by installConfigs",
    });
  }

  // Install metadata now lives inside `_version.json` (skills/_version.json),
  // which is removed as part of the `.agents/skills/` directory deletion.
  // No separate archive needed.

  // ── User-owned SSOT files (preserved) ────────────────────────────────────

  const omaConfigPath = path.join(installRoot, ".agents", OMA_CONFIG_YAML);
  if (detectKind(omaConfigPath) !== null) {
    userOwned.push({
      path: omaConfigPath,
      kind: "file",
      reason: "user preferences",
    });
  }

  const mcpJsonPath = path.join(installRoot, ".agents", MCP_JSON);
  if (detectKind(mcpJsonPath) !== null) {
    userOwned.push({
      path: mcpJsonPath,
      kind: "file",
      reason: "may contain user MCP servers",
    });
  }

  // ── Vendor skill directories ──────────────────────────────────────────────

  for (const vendor of Object.keys(CLI_SKILLS_DIR) as CliTool[]) {
    // Canonical mode-aware resolver: requiresHomeConsent vendors (hermes,
    // antigravity, kimi) always live under HOME, matching where
    // createVendorSymlinks actually wrote them (previously this loop
    // re-derived the path by hand and missed those in project mode).
    const scanDir = vendorSkillsDir(vendor, installRoot);

    for (const entry of listDir(scanDir)) {
      const entryPath = path.join(scanDir, entry.name);
      const kind = detectKind(entryPath);
      if (kind === null) continue;

      if (kind === "symlink") {
        if (symlinkTargetsInstall(entryPath, installRoot)) {
          omaOwned.push({
            path: entryPath,
            kind: "symlink",
            reason: `created by createVendorSymlinks (${vendor})`,
          });
        } else {
          userOwned.push({
            path: entryPath,
            kind: "symlink",
            reason: "symlink to another install",
          });
        }
      } else if (
        kind === "dir" &&
        isWorkflowSymlinkDir(entryPath, installRoot)
      ) {
        omaOwned.push({
          path: entryPath,
          kind: "dir",
          reason: `created by createVendorWorkflowSymlinks (${vendor})`,
        });
      } else {
        // Real directory or file — user authored
        userOwned.push({
          path: entryPath,
          kind,
          reason: "user-authored skill",
        });
      }
    }
  }

  // ── .github/prompts/*.prompt.md — only oma-generated ones ────────────────

  const promptsDir = path.join(installRoot, ".github", "prompts");
  for (const entry of listDir(promptsDir)) {
    if (!entry.isFile() || !entry.name.endsWith(".prompt.md")) continue;
    const entryPath = path.join(promptsDir, entry.name);
    if (hasOmaMarker(entryPath)) {
      omaOwned.push({
        path: entryPath,
        kind: "file",
        reason: "generated by installCopilotWorkflowPrompts (oma:generated)",
      });
    }
  }

  // ── .zcode/commands/*.md — only oma-owned workflow symlinks ──────────────

  const zcodeCommandsDir = path.join(installRoot, ".zcode", "commands");
  for (const entry of listDir(zcodeCommandsDir)) {
    if (!entry.isSymbolicLink() || !entry.name.endsWith(".md")) continue;
    const entryPath = path.join(zcodeCommandsDir, entry.name);
    if (isWorkflowSymlinkFile(entryPath, installRoot)) {
      omaOwned.push({
        path: entryPath,
        kind: "symlink",
        reason: "created by installZcodeWorkflowCommands",
      });
    }
  }

  return { omaOwned, userOwned };
}

/**
 * Format an absolute path for display, replacing the installRoot prefix with
 * a short alias so the output is readable on any machine.
 */
function displayPath(entryPath: string, installRoot: string): string {
  const rel = path.relative(installRoot, entryPath);
  if (!rel.startsWith("..") && !path.isAbsolute(rel)) {
    return path.join("<root>", rel);
  }

  // Outside the install root (home-consent vendor dirs in project mode).
  const home = homedir();
  if (entryPath === home || entryPath.startsWith(home + path.sep)) {
    return path.join("~", path.relative(home, entryPath));
  }
  return entryPath;
}

/**
 * Render the dry-run preview in a two-section `p.note(...)` block.
 */
function renderPreview(
  omaOwned: RemovalEntry[],
  userOwned: RemovalEntry[],
  installRoot: string,
): void {
  const omaLines =
    omaOwned.length === 0
      ? [pc.dim("  (nothing to remove)")]
      : omaOwned.map(
          (e) =>
            `  ${pc.red("✗")} ${displayPath(e.path, installRoot).padEnd(55)} ${pc.dim(`(${e.kind}, ${e.reason})`)}`,
        );

  const userLines =
    userOwned.length === 0
      ? [pc.dim("  (none)")]
      : userOwned.map(
          (e) =>
            `  ${pc.green("✓")} ${displayPath(e.path, installRoot).padEnd(55)} ${pc.dim(`(${e.reason})`)}`,
        );

  const content = [
    pc.bold("The following oma-owned entries will be removed:"),
    ...omaLines,
    "",
    pc.bold("The following user-owned entries will be preserved:"),
    ...userLines,
  ].join("\n");

  p.note(content, "Uninstall preview");
}

/**
 * Perform the actual removal of oma-owned entries.
 *
 * Order: symlinks first (no directory-not-empty issues), then files, then
 * directories bottom-up (deepest path first so parents are removed last).
 */
function applyRemoval(omaOwned: RemovalEntry[]): void {
  // Symlinks first
  for (const entry of omaOwned) {
    if (entry.kind !== "symlink") continue;
    try {
      fs.unlinkSync(entry.path);
    } catch {
      // best-effort
    }
  }

  // Plain files
  for (const entry of omaOwned) {
    if (entry.kind !== "file") continue;
    try {
      fs.unlinkSync(entry.path);
    } catch {
      // best-effort
    }
  }

  // Directories: sort by depth descending so children are removed before parents
  const dirs = omaOwned
    .filter((e) => e.kind === "dir")
    .sort(
      (a, b) => b.path.split(path.sep).length - a.path.split(path.sep).length,
    );

  for (const entry of dirs) {
    try {
      fs.rmSync(entry.path, { recursive: true, force: true });
    } catch {
      // best-effort
    }
  }
}

/**
 * Main entry point for `oma uninstall`.
 */
export async function uninstall(options: UninstallOptions = {}): Promise<void> {
  const installRoot = getInstallRoot();
  const isNonInteractive =
    options.yes === true ||
    process.env.OMA_YES === "1" ||
    process.env.CI === "true" ||
    process.env.CI === "1";

  const { omaOwned, userOwned } = buildRemovalPlan(installRoot);

  // Always show preview (dry-run exits here; real run shows then confirms)
  renderPreview(omaOwned, userOwned, installRoot);

  if (options.dryRun) {
    p.outro(pc.yellow("Dry-run — no files were changed."));
    return;
  }

  if (omaOwned.length === 0) {
    p.outro(pc.dim("Nothing to remove."));
    return;
  }

  // Confirm unless --yes / non-interactive
  if (!isNonInteractive) {
    const confirmed = await p.confirm({
      message: `Remove ${omaOwned.length} oma-owned entries from ${installRoot}?`,
      initialValue: false,
    });

    if (p.isCancel(confirmed) || !confirmed) {
      p.cancel("Uninstall cancelled.");
      return;
    }
  }

  // Remove oma-owned entries (install metadata lives inside
  // skills/_version.json which gets removed with the rest of the SSOT)
  applyRemoval(omaOwned);

  p.outro(pc.green("Uninstall complete. User-owned files were preserved."));
}
