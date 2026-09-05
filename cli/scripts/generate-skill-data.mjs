import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const cliDir = resolve(scriptDir, "..");
const repoRoot = resolve(cliDir, "..");
const skillsDir = resolve(repoRoot, ".agents", "skills");
const outputPath = resolve(cliDir, "constants", "skill-data.ts");

const CATEGORY_OVERRIDES = {
  "oma-architecture": "domain",
  "oma-frontend": "domain",
  "oma-backend": "domain",
  "oma-db": "domain",
  "oma-mobile": "domain",
  "oma-design": "design",
  "oma-brainstorm": "coordination",
  "oma-pm": "coordination",
  "oma-qa": "coordination",
  "oma-coordination": "coordination",
  "oma-orchestration": "coordination",
  "oma-tf-infra": "infrastructure",
  "oma-dev-workflow": "infrastructure",
  "oma-observability": "infrastructure",
};

const CATEGORY_ORDER = [
  "domain",
  "design",
  "coordination",
  "utility",
  "infrastructure",
];

const PRESETS = {
  fullstack: [
    "oma-architecture",
    "oma-brainstorm",
    "oma-design",
    "oma-frontend",
    "oma-backend",
    "oma-mobile",
    "oma-db",
    "oma-pm",
    "oma-qa",
    "oma-debug",
    "oma-scm",
    "oma-tf-infra",
    "oma-dev-workflow",
  ],
  "fullstack-web": [
    "oma-architecture",
    "oma-brainstorm",
    "oma-design",
    "oma-frontend",
    "oma-backend",
    "oma-db",
    "oma-pm",
    "oma-qa",
    "oma-debug",
    "oma-scm",
    "oma-dev-workflow",
  ],
  "fullstack-mobile": [
    "oma-architecture",
    "oma-brainstorm",
    "oma-design",
    "oma-mobile",
    "oma-backend",
    "oma-db",
    "oma-pm",
    "oma-qa",
    "oma-debug",
    "oma-scm",
    "oma-dev-workflow",
  ],
  frontend: [
    "oma-architecture",
    "oma-brainstorm",
    "oma-design",
    "oma-frontend",
    "oma-pm",
    "oma-qa",
    "oma-debug",
    "oma-scm",
  ],
  backend: [
    "oma-architecture",
    "oma-brainstorm",
    "oma-backend",
    "oma-db",
    "oma-pm",
    "oma-qa",
    "oma-debug",
    "oma-scm",
    "oma-dev-workflow",
  ],
  mobile: [
    "oma-architecture",
    "oma-brainstorm",
    "oma-mobile",
    "oma-pm",
    "oma-qa",
    "oma-debug",
    "oma-scm",
  ],
  devops: [
    "oma-architecture",
    "oma-brainstorm",
    "oma-tf-infra",
    "oma-dev-workflow",
    "oma-observability",
    "oma-pm",
    "oma-qa",
    "oma-debug",
    "oma-scm",
  ],
  research: [
    "oma-scholar",
    "oma-market",
    "oma-pdf",
    "oma-hwp",
    "oma-academic-writing",
    "oma-search",
    "oma-web-research",
    "oma-translation",
    "oma-scm",
  ],
  content: [
    "oma-design",
    "oma-image",
    "oma-voice",
    "oma-academic-writing",
    "oma-translation",
    "oma-scm",
  ],
};

function parseFrontmatter(content) {
  const match = content.match(/^---\s*\n([\s\S]*?)\n---/);
  if (!match) return {};
  const block = match[1];
  const fields = {};
  let currentKey = null;
  let mode = "inline";
  let buffer = [];

  const flush = () => {
    if (currentKey === null) return;
    const joiner = mode === "literal" ? "\n" : " ";
    fields[currentKey] = buffer.join(joiner).trim();
    currentKey = null;
    mode = "inline";
    buffer = [];
  };

  for (const rawLine of block.split("\n")) {
    const trimmedRight = rawLine.replace(/\s+$/, "");
    const kv = trimmedRight.match(/^([A-Za-z_][\w-]*):\s*(.*)$/);

    if (kv && !/^\s/.test(rawLine)) {
      flush();
      currentKey = kv[1];
      const value = kv[2];
      if (value === ">" || value === ">-") {
        mode = "folded";
        buffer = [];
      } else if (value === "|" || value === "|-") {
        mode = "literal";
        buffer = [];
      } else {
        mode = "inline";
        buffer = value ? [stripQuotes(value)] : [];
      }
    } else if (currentKey && /^\s+/.test(rawLine)) {
      buffer.push(trimmedRight.trim());
    } else if (!trimmedRight) {
    }
  }
  flush();
  return fields;
}

function stripQuotes(value) {
  const v = value.trim();
  if (
    (v.startsWith('"') && v.endsWith('"')) ||
    (v.startsWith("'") && v.endsWith("'"))
  ) {
    return v.slice(1, -1);
  }
  return v;
}

function escapeForTemplate(value) {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/`/g, "\\`")
    .replace(/\$/g, "\\$");
}

function discoverSkills() {
  const entries = readdirSync(skillsDir, { withFileTypes: true });
  const skills = [];

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    if (entry.name.startsWith("_") || entry.name.startsWith(".")) continue;

    const skillMdPath = join(skillsDir, entry.name, "SKILL.md");
    let content;
    try {
      content = readFileSync(skillMdPath, "utf-8");
    } catch {
      continue;
    }

    const fm = parseFrontmatter(content);
    const name = fm.name || entry.name;
    const description = fm.description || "";
    if (!description) {
      console.warn(`[generate-skill-data] missing description: ${name}`);
    }

    const category = fm.category || CATEGORY_OVERRIDES[name] || "utility";

    skills.push({ name, desc: description, category });
  }

  skills.sort((a, b) => a.name.localeCompare(b.name));
  return skills;
}

function buildRegistry(skills) {
  const registry = {};
  for (const cat of CATEGORY_ORDER) registry[cat] = [];
  for (const skill of skills) {
    if (!registry[skill.category]) registry[skill.category] = [];
    registry[skill.category].push({ name: skill.name, desc: skill.desc });
  }
  return registry;
}

function formatSkillEntry(skill) {
  return [
    "    {",
    `      name: "${skill.name}",`,
    `      desc: \`${escapeForTemplate(skill.desc)}\`,`,
    "    },",
  ].join("\n");
}

function formatRegistry(registry) {
  const lines = ["export const SKILLS: SkillsRegistry = {"];
  for (const cat of CATEGORY_ORDER) {
    const items = registry[cat] || [];
    lines.push(`  ${cat}: [`);
    for (const item of items) lines.push(formatSkillEntry(item));
    lines.push("  ],");
  }
  lines.push("};");
  return lines.join("\n");
}

function formatPresets() {
  const lines = ["export const PRESETS: Record<string, string[]> = {"];
  for (const [key, names] of Object.entries(PRESETS)) {
    const keyOut = /^[A-Za-z_$][\w$]*$/.test(key) ? key : `"${key}"`;
    lines.push(`  ${keyOut}: [`);
    for (const n of names) lines.push(`    "${n}",`);
    lines.push("  ],");
  }
  lines.push("  all: [");
  lines.push("    ...SKILLS.domain,");
  lines.push("    ...SKILLS.design,");
  lines.push("    ...SKILLS.coordination,");
  lines.push("    ...SKILLS.utility,");
  lines.push("    ...SKILLS.infrastructure,");
  lines.push("  ].map((s) => s.name),");
  lines.push("};");
  return lines.join("\n");
}

const skills = discoverSkills();
const registry = buildRegistry(skills);

const header = `// AUTO-GENERATED by cli/scripts/generate-skill-data.mjs. Do not edit by hand.
// Source: .agents/skills/*/SKILL.md frontmatter.
import type { SkillsRegistry } from "../types/index.js";
`;

const output = `${header}
${formatRegistry(registry)}

${formatPresets()}
`;

writeFileSync(outputPath, output);
console.log(
  `[generate-skill-data] wrote ${skills.length} skills to ${outputPath}`,
);
