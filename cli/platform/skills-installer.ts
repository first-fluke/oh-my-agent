import * as fs from "node:fs";
import { homedir } from "node:os";
import { dirname, join, relative, resolve } from "node:path";
import {
  ALL_CLI_VENDORS,
  CLI_SKILLS_DIR,
  EXTENSION_VENDORS,
  INSTALLED_SKILLS_DIR,
  SKILLS,
} from "../constants/index.js";
import type {
  CliTool,
  CliVendor,
  SkillInfo,
  VendorType,
} from "../types/index.js";
import { clearNonDirectory } from "../utils/fs-utils.js";
import { applyRecommendedCursorSettings } from "../vendors/cursor/settings.js";
import { createLink } from "./fs-link.js";
import { getInstallMode } from "./install-context.js";

export * from "../constants/index.js";
export type { CliTool, CliVendor, SkillInfo } from "../types/index.js";
export * from "../utils/fs-utils.js";
export * from "./agent-composer.js";
export * from "./fs-link.js";
export * from "./hooks-composer.js";
export * from "./vendor-adapter.js";

/** Read selected vendors from oma-config.yaml. Falls back to all vendors. */
export function readVendorsFromConfig(installRoot: string): CliVendor[] {
  const configPath = join(installRoot, ".agents", "oma-config.yaml");
  if (!fs.existsSync(configPath)) return [...ALL_CLI_VENDORS];

  const content = fs.readFileSync(configPath, "utf-8");
  const match = content.match(/^vendors:\s*\n((?:\s+-\s+\S+\n?)*)/m);
  if (!match?.[1]) return [...ALL_CLI_VENDORS];

  const vendors = [...match[1].matchAll(/-\s+(\S+)/g)].map(
    (m) => m[1] as CliVendor,
  );
  return vendors.length > 0 ? vendors : [...ALL_CLI_VENDORS];
}

/** Write selected vendors to oma-config.yaml. */
export function writeVendorsToConfig(
  installRoot: string,
  vendors: CliVendor[],
): void {
  const configPath = join(installRoot, ".agents", "oma-config.yaml");
  if (!fs.existsSync(configPath)) return;

  let content = fs.readFileSync(configPath, "utf-8");
  const vendorsBlock = `vendors:\n${vendors.map((v) => `  - ${v}`).join("\n")}`;

  if (/^vendors:/m.test(content)) {
    content = content.replace(
      /^vendors:\s*\n(?:\s+-\s+\S+\n?)*/m,
      `${vendorsBlock}\n`,
    );
  } else {
    content = `${content.trimEnd()}\n${vendorsBlock}\n`;
  }

  fs.writeFileSync(configPath, content);
}

export function installSkill(
  sourceDir: string,
  skillName: string,
  installRoot: string,
  variant?: string,
): boolean {
  const src = join(sourceDir, ".agents", "skills", skillName);
  if (!fs.existsSync(src)) return false;

  const dest = join(installRoot, INSTALLED_SKILLS_DIR, skillName);
  clearNonDirectory(dest);
  fs.mkdirSync(dest, { recursive: true });
  fs.cpSync(src, dest, { recursive: true, force: true });

  const variantSrcDir = join(src, "variants");
  const stackDir = join(dest, "stack");

  if (variant && fs.existsSync(join(variantSrcDir, variant))) {
    fs.mkdirSync(stackDir, { recursive: true });
    fs.cpSync(join(variantSrcDir, variant), stackDir, {
      recursive: true,
      force: true,
    });
    fs.writeFileSync(
      join(stackDir, "stack.yaml"),
      `language: ${variant}\nsource: preset\n`,
    );
  }

  const destVariantsDir = join(dest, "variants");
  if (fs.existsSync(destVariantsDir)) {
    fs.rmSync(destVariantsDir, { recursive: true, force: true });
  }

  return true;
}

export function installShared(sourceDir: string, installRoot: string): void {
  const src = join(sourceDir, ".agents", "skills", "_shared");
  if (!fs.existsSync(src)) return;

  const dest = join(installRoot, INSTALLED_SKILLS_DIR, "_shared");
  clearNonDirectory(dest);
  fs.mkdirSync(dest, { recursive: true });
  fs.cpSync(src, dest, { recursive: true, force: true });
}

export function installWorkflows(sourceDir: string, installRoot: string): void {
  const src = join(sourceDir, ".agents", "workflows");
  if (!fs.existsSync(src)) return;

  const dest = join(installRoot, ".agents", "workflows");
  clearNonDirectory(dest);
  fs.mkdirSync(dest, { recursive: true });
  fs.cpSync(src, dest, { recursive: true, force: true });
}

const WORKFLOW_GENERATED_MARKER = "<!-- oma:generated -->";

function extractWorkflowDescription(filePath: string): string | null {
  let content: string;
  try {
    content = fs.readFileSync(filePath, "utf-8");
  } catch {
    return null;
  }
  const match = content.match(/^---\s*\n([\s\S]*?)\n---/);
  if (!match?.[1]) return null;
  const descMatch = match[1].match(/^description:\s*(.+?)\s*$/m);
  return descMatch?.[1]?.trim() ?? null;
}

function listWorkflowNames(workflowsDir: string): string[] {
  if (!fs.existsSync(workflowsDir)) return [];
  return fs
    .readdirSync(workflowsDir, { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith(".md"))
    .map((entry) => entry.name.slice(0, -".md".length));
}

/**
 * Names of workflows shipped under `<installRoot>/.agents/workflows/*.md`.
 * These are exposed to vendors via `createVendorWorkflowSymlinks`, NOT as
 * generated `.agents/skills/<name>` wrappers.
 */
export function getInstalledWorkflowNames(installRoot: string): string[] {
  return listWorkflowNames(join(installRoot, ".agents", "workflows"));
}

/**
 * Expose each `.agents/workflows/<name>.md` to vendors as a slash-command skill
 * by symlinking `<vendor-skills-dir>/<name>/SKILL.md` directly at the workflow
 * file. No wrapper is generated under `.agents/skills/` — the workflow file is
 * its own skill manifest (it carries `name` + `disable-model-invocation` in
 * frontmatter).
 *
 * Idempotent. Replaces legacy directory-symlinks (which pointed at the old
 * `.agents/skills/<name>` wrapper) and stale generated SKILL.md copies. Never
 * touches a user-authored real `SKILL.md`.
 */
export function createVendorWorkflowSymlinks(
  installRoot: string,
  cliTools: CliTool[],
  workflowNames: string[],
): { created: string[]; skipped: string[] } {
  const created: string[] = [];
  const skipped: string[] = [];
  const workflowsDir = resolve(installRoot, ".agents", "workflows");

  for (const cli of cliTools) {
    const spec = CLI_SKILLS_DIR[cli];
    const label = spec.requiresHomeConsent ? spec.homePath : spec.projectPath;
    const linkRootDir = resolveCliSkillsDir(installRoot, cli);

    for (const name of workflowNames) {
      const source = join(workflowsDir, `${name}.md`);
      if (!fs.existsSync(source)) {
        skipped.push(`${label}/${name} (workflow missing)`);
        continue;
      }

      const skillDir = join(linkRootDir, name);
      const skillFile = join(skillDir, "SKILL.md");

      let entryStat: fs.Stats | undefined;
      try {
        entryStat = fs.lstatSync(skillDir);
      } catch {
        entryStat = undefined;
      }

      if (entryStat?.isSymbolicLink()) {
        // Legacy dir-symlink → old `.agents/skills/<name>` wrapper. Replace it.
        fs.rmSync(skillDir, { force: true });
      } else if (entryStat?.isDirectory()) {
        let fileStat: fs.Stats | undefined;
        try {
          fileStat = fs.lstatSync(skillFile);
        } catch {
          fileStat = undefined;
        }
        if (fileStat?.isSymbolicLink()) {
          const existing = resolve(skillDir, fs.readlinkSync(skillFile));
          if (existing === resolve(source)) {
            skipped.push(`${label}/${name} (already linked)`);
            continue;
          }
          fs.rmSync(skillFile, { force: true });
        } else if (fileStat?.isFile()) {
          let content = "";
          try {
            content = fs.readFileSync(skillFile, "utf-8");
          } catch {}
          if (content.includes(WORKFLOW_GENERATED_MARKER)) {
            fs.rmSync(skillFile, { force: true }); // stale generated copy
          } else {
            skipped.push(`${label}/${name} (real file exists)`);
            continue;
          }
        }
      } else if (entryStat) {
        skipped.push(`${label}/${name} (unexpected entry)`);
        continue;
      }

      fs.mkdirSync(skillDir, { recursive: true });
      const relativePath = relative(skillDir, source);
      try {
        createLink(relativePath, skillFile, "file", workflowsDir);
      } catch (err) {
        if (
          err instanceof Error &&
          err.message.startsWith("createLink: target")
        ) {
          skipped.push(`${label}/${name} (workflow escapes base)`);
          continue;
        }
        throw err;
      }
      created.push(`${label}/${name}`);
    }
  }

  return { created, skipped };
}

/**
 * Generate `.github/prompts/<name>.prompt.md` wrappers so GitHub Copilot Chat
 * can invoke workflows via slash commands. Copilot's `.prompt.md` format
 * requires `mode: agent` frontmatter and a markdown-link body that cannot be
 * replicated by a symlink, so this vendor keeps a generated wrapper (unlike
 * Claude/Codex/Qwen, which symlink the workflow file directly).
 *
 * Prunes stale oma-generated prompts whose workflow no longer exists in SSOT;
 * never touches user-authored prompts (those lack the oma:generated marker).
 *
 * Path note: paths inside `.prompt.md` are resolved relative to the prompt
 * file itself, not the workspace root, so the wrapper uses `../../.agents/...`.
 * See https://github.com/microsoft/vscode-copilot-release/issues/7317
 */
export function installCopilotWorkflowPrompts(
  sourceDir: string,
  installRoot: string,
): void {
  const workflowsDir = join(sourceDir, ".agents", "workflows");
  const promptsRoot = join(installRoot, ".github", "prompts");
  const names = listWorkflowNames(workflowsDir);

  if (fs.existsSync(promptsRoot)) {
    for (const entry of fs.readdirSync(promptsRoot, { withFileTypes: true })) {
      if (!entry.isFile() || !entry.name.endsWith(".prompt.md")) continue;
      const promptFile = join(promptsRoot, entry.name);
      let existing: string;
      try {
        existing = fs.readFileSync(promptFile, "utf-8");
      } catch {
        continue;
      }
      if (!existing.includes(WORKFLOW_GENERATED_MARKER)) continue;
      const name = entry.name.slice(0, -".prompt.md".length);
      if (!names.includes(name)) {
        fs.rmSync(promptFile, { force: true });
      }
    }
  }

  if (names.length === 0) return;

  fs.mkdirSync(promptsRoot, { recursive: true });
  for (const name of names) {
    const description =
      extractWorkflowDescription(join(workflowsDir, `${name}.md`)) ??
      `Workflow: ${name}`;
    const promptFile = join(promptsRoot, `${name}.prompt.md`);
    const body = `---\ndescription: ${description}\nmode: agent\n---\n${WORKFLOW_GENERATED_MARKER}\n\nRead and follow [.agents/workflows/${name}.md](../../.agents/workflows/${name}.md) step by step.\n`;
    fs.writeFileSync(promptFile, body);
  }
}

export function installRules(sourceDir: string, installRoot: string): void {
  const src = join(sourceDir, ".agents", "rules");
  if (!fs.existsSync(src)) return;

  const dest = join(installRoot, ".agents", "rules");
  clearNonDirectory(dest);
  fs.mkdirSync(dest, { recursive: true });
  fs.cpSync(src, dest, { recursive: true, force: true });
}

export function installConfigs(
  sourceDir: string,
  installRoot: string,
  force = false,
): void {
  const configSrc = join(sourceDir, ".agents", "config");
  if (fs.existsSync(configSrc)) {
    const configDest = join(installRoot, ".agents", "config");
    fs.mkdirSync(configDest, { recursive: true });

    if (force) {
      fs.cpSync(configSrc, configDest, { recursive: true, force: true });
    } else {
      for (const entry of fs.readdirSync(configSrc, { withFileTypes: true })) {
        const destPath = join(configDest, entry.name);
        const srcPath = join(configSrc, entry.name);

        // User-editable config files are never overwritten; the user owns them.
        if (!fs.existsSync(destPath)) {
          fs.cpSync(
            srcPath,
            destPath,
            entry.isDirectory() ? { recursive: true } : {},
          );
        }
      }
    }
  }

  const mcpSrc = join(sourceDir, ".agents", "mcp.json");
  if (fs.existsSync(mcpSrc)) {
    const agentDir = join(installRoot, ".agents");
    fs.mkdirSync(agentDir, { recursive: true });
    const mcpDest = join(agentDir, "mcp.json");
    if (force || !fs.existsSync(mcpDest)) {
      fs.cpSync(mcpSrc, mcpDest);
    }
  }

  // Bootstrap oma-config.yaml on fresh installs so language/model_preset/
  // vendors patches downstream have a file to operate on. User edits are
  // preserved unless `force` is true.
  const omaConfigSrc = join(sourceDir, ".agents", "oma-config.yaml");
  if (fs.existsSync(omaConfigSrc)) {
    const agentDir = join(installRoot, ".agents");
    fs.mkdirSync(agentDir, { recursive: true });
    const omaConfigDest = join(agentDir, "oma-config.yaml");
    if (force || !fs.existsSync(omaConfigDest)) {
      fs.cpSync(omaConfigSrc, omaConfigDest);
    }
  }
}

export function installGlobalWorkflows(sourceDir: string): void {
  const homeDir = homedir();
  const dest = join(homeDir, ".gemini", "antigravity", "global_workflows");
  const src = join(sourceDir, ".agents", "workflows");
  if (!fs.existsSync(src)) return;

  fs.mkdirSync(dest, { recursive: true });
  fs.cpSync(src, dest, { recursive: true, force: true });
}

export function getAllSkills(): SkillInfo[] {
  return [
    ...SKILLS.domain,
    ...SKILLS.design,
    ...SKILLS.coordination,
    ...SKILLS.utility,
    ...SKILLS.infrastructure,
  ];
}

/**
 * Generate Cursor's `.cursor/mcp.json` from the SSOT `.agents/mcp.json`, but
 * with the serena entry overridden to `--context=ide` (Cursor is an IDE
 * extension client per serena upstream docs). Replaces legacy symlinks that
 * previously pointed at `.agents/mcp.json`.
 *
 * Skips if `.agents/mcp.json` is missing.
 */
export function applyCursorMcpConfig(installRoot: string): void {
  const agentsMcp = join(installRoot, ".agents", "mcp.json");
  if (!fs.existsSync(agentsMcp)) return;

  const cursorDir = join(installRoot, ".cursor");
  const cursorMcp = join(cursorDir, "mcp.json");

  let baseConfig: Record<string, unknown> = {};
  try {
    const raw = fs.readFileSync(agentsMcp, "utf-8");
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      baseConfig = parsed as Record<string, unknown>;
    }
  } catch {
    return;
  }

  // Cursor reads only `mcpServers`; strip oma-only keys (memoryConfig, toolGroups).
  const cursorOnly: Record<string, unknown> = {};
  if (baseConfig.mcpServers) cursorOnly.mcpServers = baseConfig.mcpServers;

  const next = applyRecommendedCursorSettings(cursorOnly);

  // If a legacy symlink exists, replace it with a real file.
  try {
    const stat = fs.lstatSync(cursorMcp);
    if (stat.isSymbolicLink()) {
      fs.unlinkSync(cursorMcp);
    }
  } catch {
    // missing — no-op
  }

  fs.mkdirSync(cursorDir, { recursive: true });
  fs.writeFileSync(cursorMcp, `${JSON.stringify(next, null, 2)}\n`);
}

/**
 * @deprecated Replaced by `applyCursorMcpConfig`. Kept as a thin alias for
 * any external consumers; will be removed in a future major.
 */
export function applyCursorMcpSymlink(installRoot: string): void {
  applyCursorMcpConfig(installRoot);
}

/**
 * Deprecated compatibility wrapper. Prefer installVendorAdaptations().
 */
export function installClaudeSkills(
  sourceDir: string,
  installRoot: string,
): void {
  const srcSkills = join(sourceDir, ".claude", "skills");
  const srcAgents = join(sourceDir, ".claude", "agents");
  const destSkills = join(installRoot, ".claude", "skills");
  const destAgents = join(installRoot, ".claude", "agents");

  if (fs.existsSync(srcSkills)) {
    clearNonDirectory(destSkills);
    fs.mkdirSync(destSkills, { recursive: true });
    fs.cpSync(srcSkills, destSkills, { recursive: true, force: true });
  }

  if (fs.existsSync(srcAgents)) {
    clearNonDirectory(destAgents);
    fs.mkdirSync(destAgents, { recursive: true });
    fs.cpSync(srcAgents, destAgents, { recursive: true, force: true });
  }
}

/**
 * Vendors with a hook bridge (settings, prompt hooks, agent variants).
 * Vendors NOT in this set (e.g., copilot, hermes) are skill-symlink-only
 * and must NOT be passed to `installVendorAdaptations`.
 */
const HOOK_VENDORS: ReadonlySet<VendorType> = new Set([
  "antigravity",
  "claude",
  "codex",
  "cursor",
  "gemini",
  "grok",
  "kiro",
  "qwen",
]);

/**
 * Type guard: narrows a `CliVendor` to `VendorType` if it supports
 * hook-based vendor adaptation. Use as a `.filter()` predicate to safely
 * derive `hookVendors` from a free-form vendor list.
 */
export function isHookVendor(v: CliVendor): v is VendorType {
  return HOOK_VENDORS.has(v as VendorType);
}

/**
 * True for vendors whose hooks install as in-process extensions (e.g. `pi`)
 * rather than settings-file registrations. Such vendors are NOT `VendorType`
 * and must be routed to their dedicated composer (`installPiExtension`), never
 * to `installVendorAdaptations`. Accepts a raw string because these vendors do
 * not appear in the `CliVendor` union.
 */
export function isExtensionVendor(v: string): boolean {
  return (EXTENSION_VENDORS as readonly string[]).includes(v);
}

/**
 * Resolve the absolute directory where vendor skill symlinks should live.
 *
 * Mode-aware: when the active install context is "global", uses `spec.homePath`
 * under `installRoot` (= homedir() for global mode). Otherwise uses
 * `spec.projectPath`. Vendors with `requiresHomeConsent` always resolve under
 * the user's HOME regardless of mode (matches hermes legacy semantics).
 *
 * This is the canonical mode-aware resolver. `resolveCliSkillsDir` is a
 * compat shim retained for callers that pass `targetDir` explicitly.
 */
export function vendorSkillsDir(cli: CliTool, installRoot: string): string {
  const spec = CLI_SKILLS_DIR[cli];

  if (spec.requiresHomeConsent === true) {
    return join(homedir(), spec.homePath);
  }

  let mode: "project" | "global" = "project";
  try {
    mode = getInstallMode();
  } catch {
    // Context not set yet (early bootstrap or unit tests that don't init).
    mode = "project";
  }

  if (mode === "global") {
    return join(installRoot, spec.homePath);
  }

  return join(installRoot, spec.projectPath);
}

/**
 * Resolve the absolute directory where vendor skill symlinks should live.
 *
 * Project-base vendors live under `targetDir`; vendors that require home
 * consent (e.g. hermes) live under the user's HOME directory. This is the
 * only path that produces HOME paths and is the trust boundary for HOME
 * writes.
 *
 * @deprecated Use `vendorSkillsDir(cli, installRoot)` directly. This shim is
 * retained for callers that pass `installRoot` explicitly and will be removed
 * once all call sites are migrated.
 */
function resolveCliSkillsDir(installRoot: string, cli: CliTool): string {
  return vendorSkillsDir(cli, installRoot);
}

/**
 * Whether installing this vendor's skills writes outside the project
 * directory (i.e., into the user's HOME). Callers MUST obtain explicit
 * user consent before proceeding when this returns true.
 */
export function vendorRequiresHomeConsent(cli: CliTool): boolean {
  return Boolean(CLI_SKILLS_DIR[cli].requiresHomeConsent);
}

/**
 * User-facing display path for a vendor's skill directory.
 * Vendors that require home consent get a `~/...` prefix; project-base
 * vendors return the project-relative path verbatim.
 */
export function getVendorDisplayPath(cli: CliTool): string {
  const spec = CLI_SKILLS_DIR[cli];
  return spec.requiresHomeConsent ? `~/${spec.homePath}` : spec.projectPath;
}

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
