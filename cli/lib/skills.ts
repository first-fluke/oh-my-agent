import {
  cpSync,
  existsSync,
  lstatSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  readlinkSync,
  rmSync,
  symlinkSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import type { SkillInfo, SkillsRegistry, VendorType } from "../types/index.js";
import { parseFrontmatter, serializeFrontmatter } from "./frontmatter.js";

export const REPO = "first-fluke/oh-my-agent";
export const INSTALLED_SKILLS_DIR = ".agents/skills";

export const SKILLS: SkillsRegistry = {
  domain: [
    { name: "oma-frontend", desc: "React/Next.js UI specialist" },
    { name: "oma-backend", desc: "Backend API specialist (multi-language)" },
    {
      name: "oma-db",
      desc: "SQL/NoSQL data modeling, normalization, integrity, and capacity specialist",
    },
    { name: "oma-mobile", desc: "Flutter/Dart mobile specialist" },
  ],
  design: [
    {
      name: "oma-design",
      desc: "Design system, DESIGN.md, accessibility, anti-pattern enforcement",
    },
  ],
  coordination: [
    { name: "oma-brainstorm", desc: "Design-first ideation before planning" },
    { name: "oma-pm", desc: "Product manager - task decomposition" },
    { name: "oma-qa", desc: "QA - OWASP, Lighthouse, WCAG" },
    { name: "oma-coordination", desc: "Manual multi-agent orchestration" },
    { name: "oma-orchestrator", desc: "Automated parallel CLI execution" },
  ],
  utility: [
    { name: "oma-debug", desc: "Bug fixing specialist" },
    { name: "oma-commit", desc: "Conventional Commits helper" },
    { name: "oma-translator", desc: "Context-aware multilingual translation" },
  ],
  infrastructure: [
    {
      name: "oma-tf-infra",
      desc: "Multi-cloud infrastructure with Terraform - AWS, GCP, Azure, OCI support",
    },
    {
      name: "oma-dev-workflow",
      desc: "Monorepo developer workflows - mise tasks, git hooks, CI/CD, release automation",
    },
  ],
};

export const PRESETS: Record<string, string[]> = {
  fullstack: [
    "oma-brainstorm",
    "oma-design",
    "oma-frontend",
    "oma-backend",
    "oma-db",
    "oma-pm",
    "oma-qa",
    "oma-debug",
    "oma-commit",
    "oma-tf-infra",
    "oma-dev-workflow",
  ],
  frontend: [
    "oma-brainstorm",
    "oma-design",
    "oma-frontend",
    "oma-pm",
    "oma-qa",
    "oma-debug",
    "oma-commit",
  ],
  backend: [
    "oma-brainstorm",
    "oma-backend",
    "oma-db",
    "oma-pm",
    "oma-qa",
    "oma-debug",
    "oma-commit",
    "oma-dev-workflow",
  ],
  mobile: [
    "oma-brainstorm",
    "oma-mobile",
    "oma-pm",
    "oma-qa",
    "oma-debug",
    "oma-commit",
  ],
  devops: [
    "oma-brainstorm",
    "oma-tf-infra",
    "oma-dev-workflow",
    "oma-pm",
    "oma-qa",
    "oma-debug",
    "oma-commit",
  ],
  all: [
    ...SKILLS.domain,
    ...SKILLS.design,
    ...SKILLS.coordination,
    ...SKILLS.utility,
    ...SKILLS.infrastructure,
  ].map((s) => s.name),
};

type AgentVariantConfig = {
  vendor: string;
  destDir: string;
  modelDefault: string;
  maxTurnsDefault?: number;
  toolsDefault: string | string[];
  protocolPath: string;
  agents: Record<
    string,
    {
      tools?: string | string[];
      model?: string;
      maxTurns?: number;
      effort?: string;
      extra?: Record<string, unknown>;
    }
  >;
};

/**
 * Remove path if it exists as a symlink or file (not a real directory).
 * Handles re-installation where symlinks from a previous install
 * conflict with directory copies.
 */
function clearNonDirectory(path: string): void {
  try {
    if (!lstatSync(path).isDirectory()) {
      unlinkSync(path);
    }
  } catch {
    // Path doesn't exist
  }
}

export function installSkill(
  sourceDir: string,
  skillName: string,
  targetDir: string,
  variant?: string,
): boolean {
  const src = join(sourceDir, ".agents", "skills", skillName);
  if (!existsSync(src)) return false;

  const dest = join(targetDir, INSTALLED_SKILLS_DIR, skillName);
  clearNonDirectory(dest);
  mkdirSync(dest, { recursive: true });
  cpSync(src, dest, { recursive: true, force: true });

  // Copy selected variant from SOURCE to dest stack/ (use src to avoid partial-copy issues)
  const variantSrcDir = join(src, "variants");
  const stackDir = join(dest, "stack");

  if (variant && existsSync(join(variantSrcDir, variant))) {
    mkdirSync(stackDir, { recursive: true });
    cpSync(join(variantSrcDir, variant), stackDir, {
      recursive: true,
      force: true,
    });
    writeFileSync(
      join(stackDir, "stack.yaml"),
      `language: ${variant}\nsource: preset\n`,
    );
  }

  // Remove variants/ from user project (not needed at runtime)
  const destVariantsDir = join(dest, "variants");
  if (existsSync(destVariantsDir)) {
    rmSync(destVariantsDir, { recursive: true, force: true });
  }

  return true;
}

export function installShared(sourceDir: string, targetDir: string): void {
  const src = join(sourceDir, ".agents", "skills", "_shared");
  if (!existsSync(src)) return;

  const dest = join(targetDir, INSTALLED_SKILLS_DIR, "_shared");
  clearNonDirectory(dest);
  mkdirSync(dest, { recursive: true });
  cpSync(src, dest, { recursive: true, force: true });
}

export function installWorkflows(sourceDir: string, targetDir: string): void {
  const src = join(sourceDir, ".agents", "workflows");
  if (!existsSync(src)) return;

  const dest = join(targetDir, ".agents", "workflows");
  clearNonDirectory(dest);
  mkdirSync(dest, { recursive: true });
  cpSync(src, dest, { recursive: true, force: true });
}

export function installConfigs(
  sourceDir: string,
  targetDir: string,
  force = false,
): void {
  const configSrc = join(sourceDir, ".agents", "config");
  if (existsSync(configSrc)) {
    const configDest = join(targetDir, ".agents", "config");
    mkdirSync(configDest, { recursive: true });

    if (force) {
      cpSync(configSrc, configDest, { recursive: true, force: true });
    } else {
      // Only copy config files that don't already exist (preserve user customizations)
      for (const entry of readdirSync(configSrc, { withFileTypes: true })) {
        const destPath = join(configDest, entry.name);
        if (!existsSync(destPath)) {
          cpSync(
            join(configSrc, entry.name),
            destPath,
            entry.isDirectory() ? { recursive: true } : {},
          );
        }
      }
    }
  }

  const mcpSrc = join(sourceDir, ".agents", "mcp.json");
  if (existsSync(mcpSrc)) {
    const agentDir = join(targetDir, ".agents");
    mkdirSync(agentDir, { recursive: true });
    const mcpDest = join(agentDir, "mcp.json");
    if (force || !existsSync(mcpDest)) {
      cpSync(mcpSrc, mcpDest);
    }
  }
}

export function installGlobalWorkflows(sourceDir: string): void {
  const homeDir = process.env.HOME || process.env.USERPROFILE || "";
  const dest = join(homeDir, ".gemini", "antigravity", "global_workflows");
  const src = join(sourceDir, ".agents", "workflows");
  if (!existsSync(src)) return;

  mkdirSync(dest, { recursive: true });
  cpSync(src, dest, { recursive: true, force: true });
}

/** @deprecated Use installVendorAdaptations() instead for agent/workflow generation. */
export function installClaudeSkills(
  sourceDir: string,
  targetDir: string,
): void {
  const srcSkills = join(sourceDir, ".claude", "skills");
  const srcAgents = join(sourceDir, ".claude", "agents");
  const destSkills = join(targetDir, ".claude", "skills");
  const destAgents = join(targetDir, ".claude", "agents");

  if (existsSync(srcSkills)) {
    clearNonDirectory(destSkills);
    // Clear symlinks inside destination that conflict with source directories
    clearConflictingEntries(srcSkills, destSkills);
    mkdirSync(destSkills, { recursive: true });
    cpSync(srcSkills, destSkills, { recursive: true, force: true });
  }

  if (existsSync(srcAgents)) {
    clearNonDirectory(destAgents);
    clearConflictingEntries(srcAgents, destAgents);
    mkdirSync(destAgents, { recursive: true });
    cpSync(srcAgents, destAgents, { recursive: true, force: true });
  }
}

function loadAgentVariantConfig(
  sourceDir: string,
  vendor: string,
): AgentVariantConfig | null {
  const variantPath = join(
    sourceDir,
    ".agents",
    "agents",
    "variants",
    `${vendor}.json`,
  );
  if (!existsSync(variantPath)) return null;

  try {
    return JSON.parse(readFileSync(variantPath, "utf-8")) as AgentVariantConfig;
  } catch {
    return null;
  }
}

/**
 * Generate markdown-based vendor agent files from abstract agent definitions.
 */
function installMarkdownVariantAgents(
  sourceDir: string,
  targetDir: string,
  vendor: "claude" | "gemini",
): void {
  const agentsDir = join(sourceDir, ".agents", "agents");
  if (!existsSync(agentsDir)) return;

  const variant = loadAgentVariantConfig(sourceDir, vendor);
  if (!variant) return;

  const destDir = join(targetDir, variant.destDir);
  mkdirSync(destDir, { recursive: true });

  for (const dirEntry of readdirSync(agentsDir, { withFileTypes: true })) {
    if (!dirEntry.isFile() || !dirEntry.name.endsWith(".md")) continue;
    const entry = dirEntry.name;

    const content = readFileSync(join(agentsDir, entry), "utf-8");
    const { frontmatter, body } = parseFrontmatter(content);
    const name = (frontmatter.name as string) || entry.replace(".md", "");
    const overrides = variant.agents[name];
    if (!overrides) continue;

    const generatedFrontmatter: Record<string, unknown> = {
      name,
      description: frontmatter.description,
      tools: overrides.tools ?? variant.toolsDefault,
      model: overrides.model ?? variant.modelDefault,
    };

    const maxTurns = overrides.maxTurns ?? variant.maxTurnsDefault;
    if (maxTurns !== undefined) {
      generatedFrontmatter.maxTurns = maxTurns;
    }
    if (overrides.effort) {
      generatedFrontmatter.effort = overrides.effort;
    }
    if (frontmatter.skills) {
      generatedFrontmatter.skills = frontmatter.skills;
    }
    if (overrides.extra) {
      Object.assign(generatedFrontmatter, overrides.extra);
    }

    const generatedBodyRaw = body.replace(
      "Follow the vendor-specific execution protocol:",
      `Follow \`${variant.protocolPath}\`:`,
    );
    const generatedBody = `<!-- Generated by oh-my-agent CLI. Source: .agents/agents/${entry} -->\n${generatedBodyRaw}`;
    writeFileSync(
      join(destDir, entry),
      serializeFrontmatter(generatedFrontmatter, generatedBody),
    );
  }
}

/**
 * Generate workflow router SKILL.md files for Claude Code.
 */
function installClaudeWorkflowRouters(
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
 * Copy shared hook scripts to a vendor's hooks directory.
 * The same TypeScript hooks work across all vendors via auto-detection.
 */
function copyHookScripts(sourceDir: string, hooksDest: string): void {
  const hooksSrc = join(sourceDir, ".claude", "hooks");
  if (!existsSync(hooksSrc)) return;

  mkdirSync(hooksDest, { recursive: true });
  cpSync(hooksSrc, hooksDest, { recursive: true, force: true });
}

/**
 * Merge hook entries (and optional extra fields) into a JSON settings file.
 * Preserves existing settings outside the hooks/extra keys.
 */
function mergeIntoSettings(
  settingsPath: string,
  // biome-ignore lint/suspicious/noExplicitAny: hook config varies by vendor
  hookEntries: Record<string, any>,
  // biome-ignore lint/suspicious/noExplicitAny: extra fields like statusLine
  extra?: Record<string, any>,
): void {
  // biome-ignore lint/suspicious/noExplicitAny: settings.json schema is dynamic
  let settings: any = {};

  if (existsSync(settingsPath)) {
    try {
      settings = JSON.parse(readFileSync(settingsPath, "utf-8"));
    } catch {
      // Corrupted — start fresh
    }
  }

  settings.hooks = { ...(settings.hooks || {}), ...hookEntries };
  if (extra) Object.assign(settings, extra);
  writeFileSync(settingsPath, `${JSON.stringify(settings, null, 2)}\n`);
}

/** Build bun command for a hook script relative to a project dir env var. */
function bunHookCmd(envVar: string, vendorDir: string, script: string): string {
  return `bun "$${envVar}/${vendorDir}/hooks/${script}"`;
}

/**
 * Install Claude Code hooks, HUD statusline, and settings.json.
 */
function installClaudeHooks(sourceDir: string, targetDir: string): void {
  copyHookScripts(sourceDir, join(targetDir, ".claude", "hooks"));

  mergeIntoSettings(
    join(targetDir, ".claude", "settings.json"),
    {
      UserPromptSubmit: [
        {
          hooks: [
            {
              type: "command",
              command: bunHookCmd(
                "CLAUDE_PROJECT_DIR",
                ".claude",
                "keyword-detector.ts",
              ),
              timeout: 5,
            },
          ],
        },
      ],
      Stop: [
        {
          hooks: [
            {
              type: "command",
              command: bunHookCmd(
                "CLAUDE_PROJECT_DIR",
                ".claude",
                "persistent-mode.ts",
              ),
              timeout: 5,
            },
          ],
        },
      ],
    },
    {
      statusLine: {
        type: "command",
        command: bunHookCmd("CLAUDE_PROJECT_DIR", ".claude", "hud.ts"),
      },
    },
  );
}

/**
 * Install Codex CLI hooks, hooks.json, and enable codex_hooks feature.
 * Codex hooks.json requires the codex_hooks feature flag in config.toml.
 */
function installCodexHooks(sourceDir: string, targetDir: string): void {
  const hooksDir = join(targetDir, ".codex", "hooks");
  copyHookScripts(sourceDir, hooksDir);

  // hooks.json — discovered from .codex/
  mergeIntoSettings(join(targetDir, ".codex", "hooks.json"), {
    UserPromptSubmit: [
      {
        hooks: [
          {
            type: "command",
            command: "bun .codex/hooks/keyword-detector.ts",
            timeout: 5,
          },
        ],
      },
    ],
    Stop: [
      {
        hooks: [
          {
            type: "command",
            command: "bun .codex/hooks/persistent-mode.ts",
            timeout: 5,
          },
        ],
      },
    ],
  });

  // Enable codex_hooks feature in config.toml (required for hooks.json to load)
  ensureCodexFeatureFlag(join(targetDir, ".codex", "config.toml"));
}

/**
 * Ensure codex_hooks = true in [features] section of config.toml.
 * Creates file if missing, appends section if not present.
 */
function ensureCodexFeatureFlag(configPath: string): void {
  mkdirSync(dirname(configPath), { recursive: true });

  let content = "";
  if (existsSync(configPath)) {
    content = readFileSync(configPath, "utf-8");
  }

  // Already enabled
  if (/codex_hooks\s*=\s*true/i.test(content)) return;

  // Replace false with true
  if (/codex_hooks\s*=\s*false/i.test(content)) {
    content = content.replace(/codex_hooks\s*=\s*false/i, "codex_hooks = true");
    writeFileSync(configPath, content);
    return;
  }

  // Append to existing [features] section
  if (/\[features\]/i.test(content)) {
    content = content.replace(/(\[features\][^[]*)/i, `$1codex_hooks = true\n`);
    writeFileSync(configPath, content);
    return;
  }

  // Add new [features] section
  const section = `\n[features]\ncodex_hooks = true\n`;
  writeFileSync(configPath, content.trimEnd() + section);
}

/**
 * Install Gemini CLI hooks and settings.json.
 */
function installGeminiHooks(sourceDir: string, targetDir: string): void {
  const hooksDir = join(targetDir, ".gemini", "hooks");
  copyHookScripts(sourceDir, hooksDir);

  mergeIntoSettings(join(targetDir, ".gemini", "settings.json"), {
    BeforeAgent: [
      {
        matcher: "*",
        hooks: [
          {
            type: "command",
            command: bunHookCmd(
              "GEMINI_PROJECT_DIR",
              ".gemini",
              "keyword-detector.ts",
            ),
            timeout: 5,
          },
        ],
      },
    ],
    AfterAgent: [
      {
        matcher: "*",
        hooks: [
          {
            type: "command",
            command: bunHookCmd(
              "GEMINI_PROJECT_DIR",
              ".gemini",
              "persistent-mode.ts",
            ),
            timeout: 5,
          },
        ],
      },
    ],
  });
}

/**
 * Install Qwen Code hooks and settings.json.
 * Qwen Code is a Claude Code fork — uses same event names, hookSpecificOutput format.
 */
function installQwenHooks(sourceDir: string, targetDir: string): void {
  const hooksDir = join(targetDir, ".qwen", "hooks");
  copyHookScripts(sourceDir, hooksDir);

  mergeIntoSettings(join(targetDir, ".qwen", "settings.json"), {
    UserPromptSubmit: [
      {
        hooks: [
          {
            type: "command",
            command: bunHookCmd(
              "QWEN_PROJECT_DIR",
              ".qwen",
              "keyword-detector.ts",
            ),
            timeout: 5,
          },
        ],
      },
    ],
    Stop: [
      {
        hooks: [
          {
            type: "command",
            command: bunHookCmd(
              "QWEN_PROJECT_DIR",
              ".qwen",
              "persistent-mode.ts",
            ),
            timeout: 5,
          },
        ],
      },
    ],
  });
}

const OMA_START = "<!-- OMA:START";
const OMA_END = "<!-- OMA:END -->";

/**
 * Merge OMA instructions into the user-level ~/.claude/CLAUDE.md using markers.
 * Preserves any user content outside the OMA block.
 * Source: .claude/CLAUDE.md.template (from downloaded repo)
 */
function mergeClaudeMd(sourceDir: string): void {
  const templatePath = join(sourceDir, ".claude", "CLAUDE.md.template");
  if (!existsSync(templatePath)) return;

  const homeDir = process.env.HOME || process.env.USERPROFILE || "";
  const omaBlock = readFileSync(templatePath, "utf-8").trim();
  const claudeMdPath = join(homeDir, ".claude", "CLAUDE.md");

  if (existsSync(claudeMdPath)) {
    const existing = readFileSync(claudeMdPath, "utf-8");
    const startIdx = existing.indexOf(OMA_START);
    const endIdx = existing.indexOf(OMA_END);

    if (startIdx !== -1 && endIdx !== -1) {
      // Replace existing OMA block
      const before = existing.slice(0, startIdx);
      const after = existing.slice(endIdx + OMA_END.length);
      writeFileSync(claudeMdPath, `${before}${omaBlock}${after}`);
    } else {
      // Append OMA block to end
      writeFileSync(claudeMdPath, `${existing.trimEnd()}\n\n${omaBlock}\n`);
    }
  } else {
    writeFileSync(claudeMdPath, `${omaBlock}\n`);
  }
}

/**
 * Install vendor-specific agent and workflow adaptations.
 * Replaces installClaudeSkills() for agent/workflow generation.
 */
export function installVendorAdaptations(
  sourceDir: string,
  targetDir: string,
  vendors: VendorType[],
): void {
  const workflowsDir = join(sourceDir, ".agents", "workflows");

  for (const vendor of vendors) {
    switch (vendor) {
      case "claude":
        installMarkdownVariantAgents(sourceDir, targetDir, "claude");
        installClaudeWorkflowRouters(workflowsDir, targetDir);
        installClaudeHooks(sourceDir, targetDir);
        mergeClaudeMd(sourceDir);
        break;
      case "codex":
        installCodexHooks(sourceDir, targetDir);
        break;
      case "gemini":
        installMarkdownVariantAgents(sourceDir, targetDir, "gemini");
        installGeminiHooks(sourceDir, targetDir);
        break;
      case "qwen":
        installQwenHooks(sourceDir, targetDir);
        break;
    }
  }
}

/**
 * For each entry in sourceDir that is a directory, remove the corresponding
 * entry in destDir if it exists as a non-directory (symlink or file).
 * Prevents cpSync from failing when overwriting symlinks with directories.
 */
function clearConflictingEntries(sourceDir: string, destDir: string): void {
  if (!existsSync(destDir)) return;

  try {
    for (const entry of readdirSync(sourceDir, { withFileTypes: true })) {
      if (entry.isDirectory()) {
        clearNonDirectory(join(destDir, entry.name));
      }
    }
  } catch {
    // Best-effort cleanup
  }
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

export type CliTool = "claude" | "copilot";

export const CLI_SKILLS_DIR: Record<CliTool, string> = {
  claude: ".claude/skills",
  copilot: ".github/skills",
};

export function createCliSymlinks(
  targetDir: string,
  cliTools: CliTool[],
  skillNames: string[],
): { created: string[]; skipped: string[] } {
  const created: string[] = [];
  const skipped: string[] = [];
  const ssotSkillsDir = resolve(targetDir, INSTALLED_SKILLS_DIR);

  for (const cli of cliTools) {
    const skillsDir = CLI_SKILLS_DIR[cli];
    const linkRootDir = join(targetDir, skillsDir);

    if (!existsSync(linkRootDir)) {
      mkdirSync(linkRootDir, { recursive: true });
    }

    for (const skillName of skillNames) {
      const source = join(ssotSkillsDir, skillName);
      const link = join(linkRootDir, skillName);

      if (!existsSync(source)) {
        skipped.push(`${skillsDir}/${skillName} (source missing)`);
        continue;
      }

      try {
        const stat = lstatSync(link);
        if (stat.isSymbolicLink()) {
          const existing = resolve(dirname(link), readlinkSync(link));
          if (existing === resolve(source)) {
            skipped.push(`${skillsDir}/${skillName} (already linked)`);
            continue;
          }
          unlinkSync(link);
        } else {
          skipped.push(`${skillsDir}/${skillName} (real dir exists)`);
          continue;
        }
      } catch (_e) {
        // Link doesn't exist yet — will create below
      }

      const relativePath = relative(linkRootDir, source);
      symlinkSync(relativePath, link, "dir");
      created.push(`${skillsDir}/${skillName}`);
    }
  }

  return { created, skipped };
}

export function getInstalledSkillNames(targetDir: string): string[] {
  const skillsDir = join(targetDir, INSTALLED_SKILLS_DIR);
  if (!existsSync(skillsDir)) return [];

  return readdirSync(skillsDir, { withFileTypes: true })
    .filter((d) => d.isDirectory() && !d.name.startsWith("_"))
    .map((d) => d.name);
}

export function detectExistingCliSymlinkDirs(targetDir: string): CliTool[] {
  const tools: CliTool[] = [];
  for (const [cli, dir] of Object.entries(CLI_SKILLS_DIR)) {
    if (existsSync(join(targetDir, dir))) {
      tools.push(cli as CliTool);
    }
  }
  return tools;
}
