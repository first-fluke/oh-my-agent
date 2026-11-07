import * as fs from "node:fs";
import { join, relative, resolve } from "node:path";
import type { CliTool } from "../../types/index.js";
import { atomicWriteFileSync } from "../../utils/safe-write.js";
import { createLink } from "../fs-link.js";
import { getVendorDisplayPath, resolveCliSkillsDir } from "./vendor-dirs.js";
import {
  inspectWorkflowAvailability,
  WORKFLOW_DEPENDENCIES,
} from "./workflow-dependencies.js";
import { isSameFile, WorkflowLinkLedger } from "./workflow-link-ledger.js";

export const WORKFLOW_GENERATED_MARKER = "<!-- oma:generated -->";

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

function availableWorkflowNames(root: string, names: string[]): string[] {
  return names.filter(
    (name) => inspectWorkflowAvailability(root, name).available,
  );
}

/** Record a fallback link that already mirrors `source` (refreshes its hash). */
function adoptCurrentLink(
  ledger: WorkflowLinkLedger,
  linkPath: string,
  source: string,
): void {
  ledger.record(
    linkPath,
    source,
    isSameFile(linkPath, source) ? "hardlink" : "copy",
  );
}

function pruneUnavailableWorkflowSkills(
  linkRoot: string,
  workflowsDir: string,
  available: Set<string>,
  ledger: WorkflowLinkLedger,
): void {
  if (!fs.existsSync(linkRoot)) return;
  for (const entry of fs.readdirSync(linkRoot, { withFileTypes: true })) {
    if (available.has(entry.name)) continue;
    const skillDir = join(linkRoot, entry.name);
    const skillFile = join(skillDir, "SKILL.md");
    let ownedEntry = false;
    try {
      if (entry.isSymbolicLink()) {
        const target = resolve(linkRoot, fs.readlinkSync(skillDir));
        const legacy = resolve(workflowsDir, "..", "skills", entry.name);
        if (
          target === legacy &&
          fs.readFileSync(skillFile, "utf8").includes(WORKFLOW_GENERATED_MARKER)
        ) {
          ownedEntry = true;
          // unlink, not rm: rmSync throws EISDIR on a Windows junction.
          fs.unlinkSync(skillDir);
        }
        continue;
      }
      if (!entry.isDirectory()) continue;
      const stat = fs.lstatSync(skillFile);
      const knownWorkflow =
        Object.hasOwn(WORKFLOW_DEPENDENCIES, entry.name) ||
        fs.existsSync(join(workflowsDir, `${entry.name}.md`));
      const workflowSource = join(workflowsDir, `${entry.name}.md`);
      const owned = stat.isSymbolicLink()
        ? resolve(skillDir, fs.readlinkSync(skillFile)) === workflowSource
        : stat.isFile() &&
          // Windows hardlink/copy fallback for the symlink above.
          (ledger.owns(skillFile, workflowSource) ||
            (knownWorkflow &&
              fs
                .readFileSync(skillFile, "utf8")
                .includes(WORKFLOW_GENERATED_MARKER)));
      if (!owned) continue;
      ownedEntry = true;
      fs.rmSync(skillFile, { force: true });
      ledger.forget(skillFile);
      // Other files in the directory remain user-owned.
      try {
        fs.rmdirSync(skillDir);
      } catch {}
    } catch (error) {
      if (ownedEntry) throw error;
      // Missing/unreadable or user-owned entries are left intact.
    }
  }
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
  const available = new Set(availableWorkflowNames(installRoot, workflowNames));
  const ledger = new WorkflowLinkLedger(installRoot);
  try {
    for (const cli of cliTools) {
      const label = getVendorDisplayPath(cli);
      const linkRootDir = resolveCliSkillsDir(installRoot, cli);
      pruneUnavailableWorkflowSkills(
        linkRootDir,
        workflowsDir,
        available,
        ledger,
      );

      for (const name of workflowNames) {
        const source = join(workflowsDir, `${name}.md`);
        if (!fs.existsSync(source)) {
          skipped.push(`${label}/${name} (workflow missing)`);
          continue;
        }
        if (!available.has(name)) {
          const state = inspectWorkflowAvailability(installRoot, name);
          skipped.push(
            `${label}/${name} (disabled: ${state.issue ?? `missing required skills ${state.missingRequired.join(", ")}`})`,
          );
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
          // unlink, not rm: rmSync throws EISDIR on a Windows junction (the
          // createLink fallback for directory links).
          fs.unlinkSync(skillDir);
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
            if (ledger.isCurrent(skillFile, source)) {
              // Windows hardlink/copy fallback that still mirrors the workflow.
              adoptCurrentLink(ledger, skillFile, source);
              skipped.push(`${label}/${name} (already linked)`);
              continue;
            }
            let content = "";
            try {
              content = fs.readFileSync(skillFile, "utf-8");
            } catch {}
            if (
              ledger.owns(skillFile, source) ||
              content.includes(WORKFLOW_GENERATED_MARKER)
            ) {
              // Stale fallback link (workflow rewritten) or generated copy.
              fs.rmSync(skillFile, { force: true });
              ledger.forget(skillFile);
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
          const mechanism = createLink(
            relativePath,
            skillFile,
            "file",
            workflowsDir,
          );
          ledger.record(skillFile, source, mechanism);
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
  } finally {
    ledger.save();
  }
  return { created, skipped };
}

/**
 * Expose each `.agents/workflows/<name>.md` to ZCode as a workspace slash-command
 * by symlinking it at `.zcode/commands/<name>.md`. ZCode reads workspace commands
 * as flat `.md` files under `.zcode/commands/` (user-level: `~/.zcode/commands`),
 * so — unlike Claude/Codex/Qwen, which symlink at `<skills>/<name>/SKILL.md` —
 * the link is a flat file, not a nested skill manifest. The workflow file is its
 * own command body (its frontmatter is inert to ZCode's plain-markdown reader).
 *
 * Idempotent. Replaces stale oma-owned links (symlinks resolving into the
 * workflows dir) and prunes commands whose workflow no longer exists in SSOT.
 * Never touches a user-authored real `.md` command.
 */
export function installZcodeWorkflowCommands(
  installRoot: string,
  targetRoot = installRoot,
): {
  created: string[];
  skipped: string[];
} {
  const created: string[] = [];
  const skipped: string[] = [];
  const workflowsDir = resolve(installRoot, ".agents", "workflows");
  const commandsDir = resolve(targetRoot, ".zcode", "commands");
  const names = availableWorkflowNames(
    installRoot,
    listWorkflowNames(workflowsDir),
  );

  const ledger = new WorkflowLinkLedger(installRoot);
  try {
    // Prune oma-owned commands whose workflow no longer exists in SSOT.
    // Ownership = a `.md` symlink resolving directly into the workflows dir, or
    // its Windows hardlink/copy fallback proven by the ledger; user commands
    // (real files, or links elsewhere) are left untouched.
    if (fs.existsSync(commandsDir)) {
      for (const entry of fs.readdirSync(commandsDir, {
        withFileTypes: true,
      })) {
        if (!entry.name.endsWith(".md")) continue;
        const name = entry.name.slice(0, -".md".length);
        if (names.includes(name)) continue;
        const linkPath = join(commandsDir, entry.name);
        if (entry.isSymbolicLink()) {
          let target: string;
          try {
            target = resolve(commandsDir, fs.readlinkSync(linkPath));
          } catch {
            continue;
          }
          if (resolve(target, "..") !== workflowsDir) continue;
          fs.rmSync(linkPath, { force: true });
        } else if (
          entry.isFile() &&
          ledger.owns(linkPath, join(workflowsDir, entry.name))
        ) {
          fs.rmSync(linkPath, { force: true });
          ledger.forget(linkPath);
        }
      }
    }

    if (names.length > 0) {
      fs.mkdirSync(commandsDir, { recursive: true });
      for (const name of names) {
        const source = join(workflowsDir, `${name}.md`);
        const commandFile = join(commandsDir, `${name}.md`);

        let stat: fs.Stats | undefined;
        try {
          stat = fs.lstatSync(commandFile);
        } catch {
          stat = undefined;
        }

        if (stat?.isSymbolicLink()) {
          const existing = resolve(commandsDir, fs.readlinkSync(commandFile));
          if (existing === resolve(source)) {
            skipped.push(`.zcode/commands/${name} (already linked)`);
            continue;
          }
          fs.rmSync(commandFile, { force: true }); // stale link → rewrite
        } else if (stat?.isFile() && ledger.isCurrent(commandFile, source)) {
          // Windows hardlink/copy fallback that still mirrors the workflow.
          adoptCurrentLink(ledger, commandFile, source);
          skipped.push(`.zcode/commands/${name} (already linked)`);
          continue;
        } else if (stat?.isFile() && ledger.owns(commandFile, source)) {
          fs.rmSync(commandFile, { force: true }); // stale fallback → rewrite
          ledger.forget(commandFile);
        } else if (stat) {
          skipped.push(`.zcode/commands/${name} (real file exists)`);
          continue;
        }

        const relativePath = relative(commandsDir, source);
        try {
          const mechanism = createLink(
            relativePath,
            commandFile,
            "file",
            workflowsDir,
          );
          ledger.record(commandFile, source, mechanism);
        } catch (err) {
          if (
            err instanceof Error &&
            err.message.startsWith("createLink: target")
          ) {
            skipped.push(`.zcode/commands/${name} (workflow escapes base)`);
            continue;
          }
          throw err;
        }
        created.push(`.zcode/commands/${name}`);
      }
    }
  } finally {
    ledger.save();
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
  const names = availableWorkflowNames(
    sourceDir,
    listWorkflowNames(workflowsDir),
  );

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
    const promptFile = join(promptsRoot, `${name}.prompt.md`);
    try {
      const existing = fs.lstatSync(promptFile);
      if (
        !existing.isFile() ||
        !fs
          .readFileSync(promptFile, "utf-8")
          .includes(WORKFLOW_GENERATED_MARKER)
      ) {
        continue;
      }
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") continue;
    }
    const description =
      extractWorkflowDescription(join(workflowsDir, `${name}.md`)) ??
      `Workflow: ${name}`;
    const body = `---\ndescription: ${description}\nmode: agent\n---\n${WORKFLOW_GENERATED_MARKER}\n\nRead and follow [.agents/workflows/${name}.md](../../.agents/workflows/${name}.md) step by step.\n`;
    atomicWriteFileSync(promptFile, body);
  }
}
