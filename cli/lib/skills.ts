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
import type {
  CliVendor,
  SkillInfo,
  SkillsRegistry,
  VendorType,
} from "../types/index.js";
import { parseFrontmatter, serializeFrontmatter } from "./frontmatter.js";

export const REPO = "first-fluke/oh-my-agent";
export const INSTALLED_SKILLS_DIR = ".agents/skills";

const ALL_CLI_VENDORS: CliVendor[] = [
  "claude",
  "codex",
  "copilot",
  "gemini",
  "qwen",
];

/** Read selected vendors from oma-config.yaml. Falls back to all vendors. */
export function readVendorsFromConfig(targetDir: string): CliVendor[] {
  const configPath = join(targetDir, ".agents", "oma-config.yaml");
  if (!existsSync(configPath)) return [...ALL_CLI_VENDORS];

  const content = readFileSync(configPath, "utf-8");
  const match = content.match(/^vendors:\s*\n((?:\s+-\s+\S+\n?)*)/m);
  if (!match) return [...ALL_CLI_VENDORS];

  const vendors = [...match[1].matchAll(/-\s+(\S+)/g)].map(
    (m) => m[1] as CliVendor,
  );
  return vendors.length > 0 ? vendors : [...ALL_CLI_VENDORS];
}

/** Write selected vendors to oma-config.yaml. */
export function writeVendorsToConfig(
  targetDir: string,
  vendors: CliVendor[],
): void {
  const configPath = join(targetDir, ".agents", "oma-config.yaml");
  if (!existsSync(configPath)) return;

  let content = readFileSync(configPath, "utf-8");
  const vendorsBlock = `vendors:\n${vendors.map((v) => `  - ${v}`).join("\n")}`;

  if (/^vendors:/m.test(content)) {
    content = content.replace(
      /^vendors:\s*\n(?:\s+-\s+\S+\n?)*/m,
      `${vendorsBlock}\n`,
    );
  } else {
    content = `${content.trimEnd()}\n${vendorsBlock}\n`;
  }

  writeFileSync(configPath, content);
}

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
    {
      name: "oma-pdf",
      desc: "PDF to Markdown conversion via opendataloader-pdf",
    },
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

export function installRules(sourceDir: string, targetDir: string): void {
  const src = join(sourceDir, ".agents", "rules");
  if (!existsSync(src)) return;

  const dest = join(targetDir, ".agents", "rules");
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

// Default Claude frontmatter for each agent role
type ClaudeAgentDefaults = {
  tools: string;
  model: string;
  maxTurns: number;
  effort?: string;
};

const CLAUDE_AGENT_DEFAULTS: Record<string, ClaudeAgentDefaults> = {
  "backend-engineer": {
    tools: "Read, Write, Edit, Bash, Grep, Glob",
    model: "sonnet",
    maxTurns: 20,
  },
  "frontend-engineer": {
    tools: "Read, Write, Edit, Bash, Grep, Glob",
    model: "sonnet",
    maxTurns: 20,
  },
  "db-engineer": {
    tools: "Read, Write, Edit, Bash, Grep, Glob",
    model: "sonnet",
    maxTurns: 15,
  },
  "debug-investigator": {
    tools: "Read, Write, Edit, Bash, Grep, Glob",
    model: "sonnet",
    maxTurns: 15,
  },
  "mobile-engineer": {
    tools: "Read, Write, Edit, Bash, Grep, Glob",
    model: "sonnet",
    maxTurns: 20,
  },
  "pm-planner": {
    tools: "Read, Write, Grep, Glob, Bash",
    model: "sonnet",
    maxTurns: 10,
  },
  "qa-reviewer": {
    tools: "Read, Grep, Glob, Bash",
    model: "sonnet",
    maxTurns: 15,
    effort: "low",
  },
};

/**
 * Copy Claude Code rules from source .claude/rules/ to target .claude/rules/.
 */
function installClaudeRules(sourceDir: string, targetDir: string): void {
  const src = join(sourceDir, ".claude", "rules");
  if (!existsSync(src)) return;

  const dest = join(targetDir, ".claude", "rules");
  mkdirSync(dest, { recursive: true });
  cpSync(src, dest, { recursive: true, force: true });
}

/**
 * Generate Claude-specific agent files from abstract agent definitions.
 */
function installClaudeAgents(agentsDir: string, targetDir: string): void {
  if (!existsSync(agentsDir)) return;

  const destDir = join(targetDir, ".claude", "agents");
  mkdirSync(destDir, { recursive: true });

  for (const dirEntry of readdirSync(agentsDir, { withFileTypes: true })) {
    if (!dirEntry.isFile() || !dirEntry.name.endsWith(".md")) continue;
    const entry = dirEntry.name;

    const content = readFileSync(join(agentsDir, entry), "utf-8");
    const { frontmatter, body } = parseFrontmatter(content);
    const name = (frontmatter.name as string) || entry.replace(".md", "");
    const defaults = CLAUDE_AGENT_DEFAULTS[name] || {
      tools: "Read, Write, Edit, Bash, Grep, Glob",
      model: "sonnet",
      maxTurns: 20,
    };

    const claudeFm: Record<string, unknown> = {
      name,
      description: frontmatter.description,
      tools: defaults.tools,
      model: defaults.model,
      maxTurns: defaults.maxTurns,
    };
    if (defaults.effort) {
      claudeFm.effort = defaults.effort;
    }
    if (frontmatter.skills) {
      claudeFm.skills = frontmatter.skills;
    }

    // Replace vendor-neutral protocol placeholder with Claude-specific path
    const claudeBodyRaw = body.replace(
      "Follow the vendor-specific execution protocol:",
      "Follow `.agents/skills/_shared/runtime/execution-protocols/claude.md`:",
    );
    const claudeBody = `<!-- Generated by oh-my-agent CLI. Source: .agents/agents/${entry} -->\n${claudeBodyRaw}`;
    writeFileSync(
      join(destDir, entry),
      serializeFrontmatter(claudeFm, claudeBody),
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
 * Copy core hook scripts from .agents/hooks/core/ to a vendor's hooks directory.
 */
function copyHookScripts(sourceDir: string, hooksDest: string): void {
  const hooksSrc = join(sourceDir, ".agents", "hooks", "core");
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

// --- Variant-driven hook installation ---

interface HookEvent {
  hook: string;
  matcher?: string;
  timeout: number;
}

interface HookVariant {
  vendor: string;
  hookDir: string;
  settingsFile: string;
  projectDirEnv: string | null;
  runtime: string;
  events: Record<string, HookEvent>;
  statusLine?: { hook: string };
  // biome-ignore lint/suspicious/noExplicitAny: extra settings vary by vendor
  extra?: Record<string, any>;
  featureFlags?: {
    file: string;
    section: string;
    flags: Record<string, boolean>;
  };
}

/** Build hook command string from variant config. */
function buildHookCmd(variant: HookVariant, script: string): string {
  if (variant.projectDirEnv) {
    return `${variant.runtime} "$${variant.projectDirEnv}/${variant.hookDir}/${script}"`;
  }
  return `${variant.runtime} ${variant.hookDir}/${script}`;
}

/**
 * Install hooks for any vendor using its variant config from .agents/hooks/variants/.
 * Reads the variant JSON, copies core hooks, generates settings entries.
 */
function installHooksFromVariant(
  sourceDir: string,
  targetDir: string,
  variant: HookVariant,
): void {
  // 1. Copy core hook files to vendor hooks directory
  copyHookScripts(sourceDir, join(targetDir, variant.hookDir));

  // 2. Build hook entries from events
  // biome-ignore lint/suspicious/noExplicitAny: hook config varies by vendor
  const hookEntries: Record<string, any> = {};
  for (const [eventName, config] of Object.entries(variant.events)) {
    // biome-ignore lint/suspicious/noExplicitAny: hook entry shape varies
    const entry: any = {
      hooks: [
        {
          type: "command",
          command: buildHookCmd(variant, config.hook),
          timeout: config.timeout,
        },
      ],
    };
    if (config.matcher) entry.matcher = config.matcher;
    hookEntries[eventName] = [entry];
  }

  // 3. Build extra settings (statusLine, permissions, etc.)
  // biome-ignore lint/suspicious/noExplicitAny: extra settings are dynamic
  const extra: Record<string, any> = {};
  if (variant.statusLine) {
    extra.statusLine = {
      type: "command",
      command: buildHookCmd(variant, variant.statusLine.hook),
    };
  }
  if (variant.extra) Object.assign(extra, variant.extra);

  // 4. Merge into settings file
  mergeIntoSettings(
    join(targetDir, variant.settingsFile),
    hookEntries,
    Object.keys(extra).length > 0 ? extra : undefined,
  );

  // 5. Vendor-specific feature flags (e.g., Codex config.toml)
  if (variant.featureFlags) {
    ensureFeatureFlags(
      join(targetDir, variant.featureFlags.file),
      variant.featureFlags.section,
      variant.featureFlags.flags,
    );
  }
}

/**
 * Ensure feature flags are enabled in a TOML config file.
 * Creates file if missing, appends section if not present.
 */
function ensureFeatureFlags(
  configPath: string,
  section: string,
  flags: Record<string, boolean>,
): void {
  mkdirSync(dirname(configPath), { recursive: true });

  let content = "";
  if (existsSync(configPath)) {
    content = readFileSync(configPath, "utf-8");
  }

  for (const [key, value] of Object.entries(flags)) {
    const enabledRe = new RegExp(`${key}\\s*=\\s*${value}`, "i");
    if (enabledRe.test(content)) continue;

    const disabledRe = new RegExp(`${key}\\s*=\\s*${!value}`, "i");
    if (disabledRe.test(content)) {
      content = content.replace(disabledRe, `${key} = ${value}`);
      writeFileSync(configPath, content);
      continue;
    }

    const sectionRe = new RegExp(`\\[${section}\\]`, "i");
    if (sectionRe.test(content)) {
      content = content.replace(
        new RegExp(`(\\[${section}\\][^[]*)`, "i"),
        `$1${key} = ${value}\n`,
      );
      writeFileSync(configPath, content);
    } else {
      content = `${content.trimEnd()}\n\n[${section}]\n${key} = ${value}\n`;
      writeFileSync(configPath, content);
    }
  }
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

  mkdirSync(dirname(claudeMdPath), { recursive: true });

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
 * Hooks are installed from variant configs in .agents/hooks/variants/.
 */
export function installVendorAdaptations(
  sourceDir: string,
  targetDir: string,
  vendors: VendorType[],
): void {
  const agentsDir = join(sourceDir, ".agents", "agents");
  const workflowsDir = join(sourceDir, ".agents", "workflows");
  const variantsDir = join(sourceDir, ".agents", "hooks", "variants");

  for (const vendor of vendors) {
    // Install hooks from variant config (all vendors)
    const variantPath = join(variantsDir, `${vendor}.json`);
    if (existsSync(variantPath)) {
      const variant: HookVariant = JSON.parse(
        readFileSync(variantPath, "utf-8"),
      );
      installHooksFromVariant(sourceDir, targetDir, variant);
    }

    // Claude-specific non-hook adaptations
    if (vendor === "claude") {
      installClaudeAgents(agentsDir, targetDir);
      installClaudeWorkflowRouters(workflowsDir, targetDir);
      installClaudeRules(sourceDir, targetDir);
      mergeClaudeMd(sourceDir);
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
