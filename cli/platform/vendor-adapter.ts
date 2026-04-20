import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { join } from "node:path";
import { parseFrontmatter, serializeFrontmatter } from "../lib/frontmatter.js";
import type { VendorType } from "../types/index.js";
import { clearNonDirectory } from "../utils/fs-utils.js";
import { installVendorAgents } from "./agent-composer.js";
import { type HookVariant, installHooksFromVariant } from "./hooks-composer.js";
import { generateClaudeRules } from "./rules.js";

/**
 * Generate workflow router SKILL.md files for Claude Code.
 */
export function installClaudeWorkflowRouters(
  workflowsDir: string,
  targetDir: string,
): void {
  if (!existsSync(workflowsDir)) return;

  for (const dirEntry of readdirSync(workflowsDir, { withFileTypes: true })) {
    // Skip non-files, non-md, and private partials (underscore prefix)
    if (
      !dirEntry.isFile() ||
      !dirEntry.name.endsWith(".md") ||
      dirEntry.name.startsWith("_")
    )
      continue;
    const entry = dirEntry.name;

    const content = readFileSync(join(workflowsDir, entry), "utf-8");
    const { frontmatter } = parseFrontmatter(content);
    const name = entry.replace(".md", "");
    const description = (frontmatter.description as string) || name;

    const skillDir = join(targetDir, ".claude", "skills", name);
    clearNonDirectory(skillDir);

    const routerContent = serializeFrontmatter(
      {
        name,
        description,
        "disable-model-invocation": true,
      },
      `# /${name}\n\nRead and follow \`.agents/workflows/${entry}\` step by step.\n`,
    );

    mkdirSync(skillDir, { recursive: true });
    writeFileSync(join(skillDir, "SKILL.md"), routerContent);
  }
}

/**
 * Install vendor-specific agent and workflow adaptations.
 * Hooks are installed from variant configs in .agents/hooks/variants/.
 */
export function installVendorAdaptations(
  sourceDir: string,
  targetDir: string,
  vendors: VendorType[],
): void {
  const workflowsDir = join(sourceDir, ".agents", "workflows");
  const hookVariantsDir = join(sourceDir, ".agents", "hooks", "variants");

  for (const vendor of vendors) {
    // 1. Install agents from variant (composer design)
    installVendorAgents(sourceDir, targetDir, vendor);

    // 2. Install hooks from variant config
    const variantPath = join(hookVariantsDir, `${vendor}.json`);
    if (existsSync(variantPath)) {
      const variant: HookVariant = JSON.parse(
        readFileSync(variantPath, "utf-8"),
      );
      installHooksFromVariant(sourceDir, targetDir, variant);
    }

    // 3. Claude-specific non-hook adaptations (routers, rules)
    if (vendor === "claude") {
      installClaudeWorkflowRouters(workflowsDir, targetDir);
      generateClaudeRules(targetDir);
    }
  }
}
