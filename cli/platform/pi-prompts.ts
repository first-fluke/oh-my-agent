import * as fs from "node:fs";
import * as path from "node:path";
import { clearNonDirectory } from "../utils/fs-utils.js";

const PI_PROMPT_MARKER = "<!-- oma:generated -->";

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
    .map((entry) => entry.name.slice(0, -".md".length))
    .sort();
}

/**
 * Generate pi prompt-template wrappers for OMA workflows.
 *
 * pi discovers project-local prompt templates from `.pi/prompts/*.md` and
 * exposes them as slash commands (`/work`, `/plan`, `/review`, ...). The
 * wrapper stays tiny and delegates to `.agents/workflows/<name>.md`, keeping
 * `.agents/` as the source of truth.
 */
export function installPiPromptTemplates(
  sourceDir: string,
  targetDir: string,
): string[] {
  const workflowsDir = path.join(sourceDir, ".agents", "workflows");
  const promptsRoot = path.join(targetDir, ".pi", "prompts");
  const names = listWorkflowNames(workflowsDir);

  if (fs.existsSync(promptsRoot)) {
    for (const entry of fs.readdirSync(promptsRoot, { withFileTypes: true })) {
      if (!entry.isFile() || !entry.name.endsWith(".md")) continue;
      const promptFile = path.join(promptsRoot, entry.name);
      let existing: string;
      try {
        existing = fs.readFileSync(promptFile, "utf-8");
      } catch {
        continue;
      }
      if (!existing.includes(PI_PROMPT_MARKER)) continue;
      const name = entry.name.slice(0, -".md".length);
      if (!names.includes(name)) {
        fs.rmSync(promptFile, { force: true });
      }
    }
  }

  if (names.length === 0) return [];

  clearNonDirectory(promptsRoot);
  fs.mkdirSync(promptsRoot, { recursive: true });

  const written: string[] = [];
  for (const name of names) {
    const description =
      extractWorkflowDescription(path.join(workflowsDir, `${name}.md`)) ??
      `Workflow: ${name}`;
    const promptFile = path.join(promptsRoot, `${name}.md`);
    if (fs.existsSync(promptFile)) {
      if (!fs.statSync(promptFile).isFile()) continue;
      const existing = fs.readFileSync(promptFile, "utf-8");
      if (!existing.includes(PI_PROMPT_MARKER)) continue;
    }
    const body = `---\ndescription: ${description}\n---\n${PI_PROMPT_MARKER}\n\nRead and follow \`.agents/workflows/${name}.md\` step by step.\n\nUser request:\n$ARGUMENTS\n`;
    fs.writeFileSync(promptFile, body);
    written.push(path.relative(targetDir, promptFile));
  }

  return written;
}
