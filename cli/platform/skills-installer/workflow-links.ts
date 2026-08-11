import * as fs from "node:fs";
import { join, relative, resolve } from "node:path";
import { CLI_SKILLS_DIR } from "../../constants/index.js";
import type { CliTool } from "../../types/index.js";
import { atomicWriteFileSync } from "../../utils/safe-write.js";
import { createLink } from "../fs-link.js";
import { resolveCliSkillsDir } from "./vendor-dirs.js";

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
export function installZcodeWorkflowCommands(installRoot: string): {
  created: string[];
  skipped: string[];
} {
  const created: string[] = [];
  const skipped: string[] = [];
  const workflowsDir = resolve(installRoot, ".agents", "workflows");
  const commandsDir = resolve(installRoot, ".zcode", "commands");
  const names = listWorkflowNames(workflowsDir);

  // Prune oma-owned command symlinks whose workflow no longer exists in SSOT.
  // Ownership = a `.md` symlink resolving directly into the workflows dir; user
  // commands (real files, or links elsewhere) are left untouched.
  if (fs.existsSync(commandsDir)) {
    for (const entry of fs.readdirSync(commandsDir, { withFileTypes: true })) {
      if (!entry.isSymbolicLink() || !entry.name.endsWith(".md")) continue;
      const linkPath = join(commandsDir, entry.name);
      let target: string;
      try {
        target = resolve(commandsDir, fs.readlinkSync(linkPath));
      } catch {
        continue;
      }
      if (resolve(target, "..") !== workflowsDir) continue;
      const name = entry.name.slice(0, -".md".length);
      if (!names.includes(name)) fs.rmSync(linkPath, { force: true });
    }
  }

  if (names.length === 0) return { created, skipped };

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
    } else if (stat) {
      skipped.push(`.zcode/commands/${name} (real file exists)`);
      continue;
    }

    const relativePath = relative(commandsDir, source);
    try {
      createLink(relativePath, commandFile, "file", workflowsDir);
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
    atomicWriteFileSync(promptFile, body);
  }
}
