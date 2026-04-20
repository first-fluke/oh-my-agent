import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join, resolve } from "node:path";

const SERENA_CONFIG_PATH = join(homedir(), ".serena", "serena_config.yml");

const SKILL_LANGUAGE_MAP: Record<string, string[]> = {
  "oma-frontend": ["typescript"],
  "oma-mobile": ["dart"],
  "oma-tf-infra": ["terraform"],
};

const BACKEND_VARIANT_MAP: Record<string, string> = {
  python: "python",
  node: "typescript",
  rust: "rust",
};

/**
 * Resolve Serena language server keys from selected skills and backend variant.
 */
export function resolveSerenaLanguages(
  selectedSkills: string[],
  backendVariant?: string,
): string[] {
  const languages = new Set<string>();

  for (const skill of selectedSkills) {
    const mapped = SKILL_LANGUAGE_MAP[skill];
    if (mapped) {
      for (const lang of mapped) languages.add(lang);
    }
  }

  if (
    selectedSkills.includes("oma-backend") &&
    backendVariant &&
    BACKEND_VARIANT_MAP[backendVariant]
  ) {
    languages.add(BACKEND_VARIANT_MAP[backendVariant]);
  }

  // Fallback: at least typescript
  if (languages.size === 0) {
    languages.add("typescript");
  }

  return [...languages];
}

/**
 * Infer Serena languages from installed skills directory.
 * Used during `oma update` when selections are not available.
 */
export function inferSerenaLanguages(cwd: string): string[] {
  const languages = new Set<string>();
  const skillsDir = join(cwd, ".agents", "skills");

  for (const [skill, langs] of Object.entries(SKILL_LANGUAGE_MAP)) {
    if (existsSync(join(skillsDir, skill))) {
      for (const lang of langs) languages.add(lang);
    }
  }

  // Check backend stack.yaml for language
  const stackYaml = join(skillsDir, "oma-backend", "stack", "stack.yaml");
  if (existsSync(stackYaml)) {
    try {
      const content = readFileSync(stackYaml, "utf-8");
      const match = content.match(/^language:\s*(.+)$/m);
      if (match?.[1]) {
        const variant = match[1].trim();
        const mapped = BACKEND_VARIANT_MAP[variant];
        if (mapped) languages.add(mapped);
      }
    } catch {
      // best-effort
    }
  } else if (existsSync(join(skillsDir, "oma-backend"))) {
    // backend exists but no stack — default to typescript
    languages.add("typescript");
  }

  if (languages.size === 0) {
    languages.add("typescript");
  }

  return [...languages];
}

/**
 * Register the project path in ~/.serena/serena_config.yml if not already present.
 */
export function ensureSerenaRegistered(cwd: string): boolean {
  const projectPath = resolve(cwd);

  if (!existsSync(SERENA_CONFIG_PATH)) {
    return false;
  }

  try {
    const content = readFileSync(SERENA_CONFIG_PATH, "utf-8");

    // Parse existing projects list
    const projectsMatch = content.match(
      /^(projects:\s*\n)((?:\s*-\s*.+\n?)*)/m,
    );
    if (!projectsMatch) {
      return false;
    }

    const projectLines =
      (projectsMatch[2] ?? "").match(/^\s*-\s*(.+)$/gm) || [];
    const existingPaths = projectLines.map((line) =>
      resolve(line.replace(/^\s*-\s*/, "").trim()),
    );

    if (existingPaths.includes(projectPath)) {
      return false; // already registered
    }

    // Insert new project entry at the end of the projects list
    const insertPos = (projectsMatch.index ?? 0) + projectsMatch[0].length;
    const newEntry = `- ${projectPath}\n`;
    const newContent =
      content.slice(0, insertPos) + newEntry + content.slice(insertPos);

    writeFileSync(SERENA_CONFIG_PATH, newContent);
    return true;
  } catch {
    return false;
  }
}

const DEFAULT_PROJECT_YML = (languages: string[], projectName: string) =>
  `languages:
${languages.map((l) => `- ${l}`).join("\n")}

encoding: "utf-8"
ignore_all_files_in_gitignore: true
ignored_paths: []
read_only: false
excluded_tools: []
initial_prompt: ""
project_name: "${projectName}"
included_optional_tools: []
base_modes:
default_modes:
fixed_tools: []
symbol_info_budget:
language_backend:
read_only_memory_patterns: []
line_ending:
ignored_memory_patterns: []
ls_specific_settings: {}
`;

/**
 * Create .serena/project.yml and directory structure if not present.
 * Returns true if created.
 */
export function ensureSerenaProjectConfig(
  cwd: string,
  languages: string[],
): boolean {
  const serenaDir = join(cwd, ".serena");
  const projectYml = join(serenaDir, "project.yml");

  if (existsSync(projectYml)) {
    return false;
  }

  const projectName =
    cwd.split("/").pop() || cwd.split("\\").pop() || "project";

  mkdirSync(serenaDir, { recursive: true });
  writeFileSync(projectYml, DEFAULT_PROJECT_YML(languages, projectName));

  // Ensure .gitignore
  const gitignorePath = join(serenaDir, ".gitignore");
  if (!existsSync(gitignorePath)) {
    writeFileSync(gitignorePath, "/cache\n");
  }

  // Ensure memories directory
  const memoriesDir = join(serenaDir, "memories");
  mkdirSync(memoriesDir, { recursive: true });
  const gitkeep = join(memoriesDir, ".gitkeep");
  if (!existsSync(gitkeep)) {
    writeFileSync(gitkeep, "");
  }

  return true;
}

/**
 * Ensure the project is set up for Serena:
 * 1. Create .serena/project.yml if missing
 * 2. Register in ~/.serena/serena_config.yml if missing
 *
 * Returns { configured: boolean, registered: boolean }
 */
export function ensureSerenaProject(
  cwd: string,
  languages: string[],
): { configured: boolean; registered: boolean } {
  const configured = ensureSerenaProjectConfig(cwd, languages);
  const registered = ensureSerenaRegistered(cwd);
  return { configured, registered };
}
