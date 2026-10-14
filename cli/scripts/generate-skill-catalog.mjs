import { existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { parse as parseYaml } from "yaml";

const REPOSITORY_URL = "https://github.com/first-fluke/oh-my-agent";
const scriptDir = dirname(fileURLToPath(import.meta.url));
const defaultRepoRoot = resolve(scriptDir, "..", "..");

export const START_MARKER = "<!-- oma:generated skill-catalog:start -->";
export const END_MARKER = "<!-- oma:generated skill-catalog:end -->";

const SOURCE_DOC = join("web", "docs", "core-concepts", "agents.md");
const LOCALE_DOC = join(
  "docusaurus-plugin-content-docs",
  "current",
  "core-concepts",
  "agents.md",
);

// SKILL.md frontmatter is YAML: descriptions are usually quoted scalars, but
// some use folded (`>`) blocks, so a real YAML parser keeps both readable.
export function parseSkillFrontmatter(content) {
  const match = /^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/.exec(content);
  if (!match) return {};
  const data = parseYaml(match[1] ?? "");
  return data && typeof data === "object" ? data : {};
}

// One row per `.agents/skills/<dir>/SKILL.md`. Directories starting with `_`
// (shared resources) or `.` and directories without a SKILL.md are skipped.
export function collectSkills(skillsDir) {
  const skills = [];
  for (const entry of readdirSync(skillsDir, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    if (entry.name.startsWith("_") || entry.name.startsWith(".")) continue;
    const skillPath = join(skillsDir, entry.name, "SKILL.md");
    if (!existsSync(skillPath)) continue;
    const frontmatter = parseSkillFrontmatter(readFileSync(skillPath, "utf-8"));
    const name =
      typeof frontmatter.name === "string" && frontmatter.name.trim()
        ? frontmatter.name.trim()
        : entry.name;
    const description =
      typeof frontmatter.description === "string"
        ? frontmatter.description.trim()
        : "";
    skills.push({ dir: entry.name, name, description });
  }
  return skills.sort((a, b) => a.name.localeCompare(b.name));
}

function tableCell(text) {
  return text.replace(/\s+/g, " ").trim().replace(/\|/g, "\\|");
}

export function renderCatalog(skills) {
  const rows = skills.map((skill) => {
    const url = `${REPOSITORY_URL}/blob/main/.agents/skills/${skill.dir}/SKILL.md`;
    return `| [\`${skill.name}\`](${url}) | ${tableCell(skill.description)} |`;
  });
  return [
    "<!-- Generated from .agents/skills/*/SKILL.md frontmatter by cli/scripts/generate-skill-catalog.mjs. Do not edit this block by hand. -->",
    "",
    "| Skill | Use it for |",
    "|---|---|",
    ...rows,
  ].join("\n");
}

// Replaces only the text between the markers. Returns null when either marker
// is missing or they are out of order, so callers can skip or fail explicitly.
export function replaceGeneratedBlock(document, block) {
  const start = document.indexOf(START_MARKER);
  const end = document.indexOf(END_MARKER);
  if (start === -1 || end === -1 || end < start) return null;
  const before = document.slice(0, start + START_MARKER.length);
  const after = document.slice(end);
  return `${before}\n${block}\n${after}`;
}

// The English page must carry the markers. A locale copy is updated only when
// it already contains both markers (translation adds them later).
export function catalogTargets(repoRoot) {
  const targets = [{ path: join(repoRoot, SOURCE_DOC), required: true }];
  const i18nDir = join(repoRoot, "web", "i18n");
  if (existsSync(i18nDir)) {
    const locales = readdirSync(i18nDir, { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name)
      .sort();
    for (const locale of locales) {
      const path = join(i18nDir, locale, LOCALE_DOC);
      if (existsSync(path)) targets.push({ path, required: false });
    }
  }
  return targets;
}

export function syncSkillCatalog({
  repoRoot = defaultRepoRoot,
  check = false,
} = {}) {
  const skills = collectSkills(join(repoRoot, ".agents", "skills"));
  const block = renderCatalog(skills);
  const result = {
    skills: skills.length,
    updated: [],
    drifted: [],
    missing: [],
  };

  for (const target of catalogTargets(repoRoot)) {
    const rel = relative(repoRoot, target.path);
    const current = readFileSync(target.path, "utf-8");
    const next = replaceGeneratedBlock(current, block);
    if (next === null) {
      if (target.required) result.missing.push(rel);
      continue;
    }
    if (next === current) continue;
    if (check) {
      result.drifted.push(rel);
    } else {
      writeFileSync(target.path, next);
      result.updated.push(rel);
    }
  }
  return result;
}

function main(argv) {
  const check = argv.includes("--check");
  const result = syncSkillCatalog({ check });
  for (const rel of result.missing) {
    console.error(
      `[generate-skill-catalog] ${rel} is missing the "${START_MARKER}" / "${END_MARKER}" markers`,
    );
  }
  if (check) {
    for (const rel of result.drifted) {
      console.error(`[generate-skill-catalog] out of date: ${rel}`);
    }
    if (result.drifted.length || result.missing.length) {
      console.error(
        "[generate-skill-catalog] run `node cli/scripts/generate-skill-catalog.mjs` to regenerate",
      );
      return 1;
    }
    console.log(
      `[generate-skill-catalog] skill catalog is current (${result.skills} skills)`,
    );
    return 0;
  }
  for (const rel of result.updated) {
    console.log(`[generate-skill-catalog] updated ${rel}`);
  }
  console.log(
    `[generate-skill-catalog] ${result.skills} skills, ${result.updated.length} file(s) updated`,
  );
  return result.missing.length ? 1 : 0;
}

if (resolve(process.argv[1] ?? "") === fileURLToPath(import.meta.url)) {
  process.exitCode = main(process.argv.slice(2));
}
