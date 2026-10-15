import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join, relative } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { parse as parseYaml } from "yaml";

/**
 * Cross-file reference integrity for the shipped `.agents/` SSOT:
 *   - triggers.json `extensionRouting` keys must name a real agent definition;
 *   - every agent frontmatter `skills:` entry must name a shipped skill;
 *   - every `oma-*` skill a workflow mentions must exist under `.agents/skills/`.
 * A dangling reference is silently ignored at runtime (routing drops the
 * agent, the skill never loads), so only a test catches it.
 */

const REPO_ROOT = join(__dirname, "..", "..");

// `oma-*` tokens in workflows that are not skill names.
const NON_SKILL_TOKENS = new Set([
  "oma-config", // .agents/oma-config.{yaml,cue}
  "oma-deferred", // `TODO(oma-deferred)` marker convention
]);

// Skills referenced by path that OMA documents as optional, user-installed
// externals (not shipped). Keyed by workflow file name.
const OPTIONAL_EXTERNAL_SKILLS: Record<string, ReadonlySet<string>> = {
  // Angular team's agent skill; stack-set falls back to oma-frontend.
  "stack-set.md": new Set(["angular-developer"]),
};

function markdownFiles(dir: string): string[] {
  if (!existsSync(dir)) return [];
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return markdownFiles(path);
    return entry.name.endsWith(".md") ? [path] : [];
  });
}

function skillExists(root: string, name: string): boolean {
  return existsSync(join(root, ".agents", "skills", name, "SKILL.md"));
}

function frontmatter(text: string): Record<string, unknown> {
  const match = /^---\r?\n([\s\S]*?)\r?\n---/.exec(text);
  if (!match?.[1]) return {};
  const parsed = parseYaml(match[1]) as unknown;
  return parsed && typeof parsed === "object"
    ? (parsed as Record<string, unknown>)
    : {};
}

function extensionRoutingViolations(root: string): string[] {
  const triggers = JSON.parse(
    readFileSync(
      join(root, ".agents", "hooks", "core", "triggers.json"),
      "utf8",
    ),
  ) as { extensionRouting?: Record<string, unknown> };
  return Object.keys(triggers.extensionRouting ?? {})
    .filter(
      (agent) => !existsSync(join(root, ".agents", "agents", `${agent}.md`)),
    )
    .map((agent) => `extensionRouting → missing .agents/agents/${agent}.md`);
}

function agentSkillViolations(root: string): string[] {
  const agentsDir = join(root, ".agents", "agents");
  const violations: string[] = [];
  for (const entry of readdirSync(agentsDir, { withFileTypes: true })) {
    if (!entry.isFile() || !entry.name.endsWith(".md")) continue;
    const meta = frontmatter(readFileSync(join(agentsDir, entry.name), "utf8"));
    const skills = Array.isArray(meta.skills) ? meta.skills : [];
    for (const skill of skills) {
      if (typeof skill !== "string" || !skillExists(root, skill)) {
        violations.push(
          `${entry.name} skills: ${String(skill)} → missing .agents/skills/${String(skill)}/SKILL.md`,
        );
      }
    }
  }
  return violations;
}

function workflowSkillViolations(root: string): string[] {
  const workflowsDir = join(root, ".agents", "workflows");
  const violations: string[] = [];
  for (const file of markdownFiles(workflowsDir)) {
    const text = readFileSync(file, "utf8");
    const rel = relative(workflowsDir, file);
    const optional = OPTIONAL_EXTERNAL_SKILLS[rel] ?? new Set<string>();
    const names = new Set<string>();
    for (const m of text.matchAll(/\boma-[a-z0-9]+(?:-[a-z0-9]+)*/g)) {
      if (!NON_SKILL_TOKENS.has(m[0])) names.add(m[0]);
    }
    // Literal `.agents/skills/<name>` paths (placeholders like `{target_skill}`
    // and partial `oma-{agent}` templates are skipped by the character class).
    for (const m of text.matchAll(
      /\.agents\/skills\/([A-Za-z0-9_][A-Za-z0-9_-]*)(?=[/`\s)]|$)/g,
    )) {
      const name = m[1] as string;
      if (name !== "_shared" && !optional.has(name)) names.add(name);
    }
    for (const name of names) {
      if (!skillExists(root, name)) {
        violations.push(`workflows/${rel} → missing .agents/skills/${name}/`);
      }
    }
  }
  return violations;
}

describe("shipped .agents reference integrity", () => {
  it("extensionRouting names only defined agents", () => {
    expect(extensionRoutingViolations(REPO_ROOT)).toEqual([]);
  });

  it("agent frontmatter skills all exist", () => {
    expect(agentSkillViolations(REPO_ROOT)).toEqual([]);
  });

  it("workflow oma-* skill references all exist", () => {
    expect(workflowSkillViolations(REPO_ROOT)).toEqual([]);
  });
});

describe("reference integrity detectors", () => {
  let root: string;

  function write(path: string, content: string): void {
    const full = join(root, path);
    mkdirSync(join(full, ".."), { recursive: true });
    writeFileSync(full, content);
  }

  beforeEach(() => {
    root = mkdtempSync(join(tmpdir(), "oma-ref-integrity-"));
    write(
      ".agents/skills/oma-frontend/SKILL.md",
      "---\nname: oma-frontend\n---\n",
    );
    write(
      ".agents/agents/frontend-engineer.md",
      "---\nname: frontend-engineer\nskills:\n  - oma-frontend\n---\n",
    );
  });

  afterEach(() => {
    rmSync(root, { recursive: true, force: true });
  });

  it("flags an extensionRouting agent with no definition", () => {
    write(
      ".agents/hooks/core/triggers.json",
      JSON.stringify({
        extensionRouting: { "frontend-engineer": ["tsx"], designer: ["svg"] },
      }),
    );
    expect(extensionRoutingViolations(root)).toEqual([
      "extensionRouting → missing .agents/agents/designer.md",
    ]);
  });

  it("flags an agent skills: entry with no SKILL.md", () => {
    write(
      ".agents/agents/designer.md",
      "---\nname: designer\nskills:\n  - oma-design\n---\n",
    );
    expect(agentSkillViolations(root)).toEqual([
      "designer.md skills: oma-design → missing .agents/skills/oma-design/SKILL.md",
    ]);
  });

  it("flags unknown oma-* names and skill paths but allows documented exceptions", () => {
    write(
      ".agents/workflows/stack-set.md",
      [
        "Use oma-frontend. Config lives in `.agents/oma-config.yaml`.",
        "Mark `// TODO(oma-deferred): integrate`.",
        "If `.agents/skills/angular-developer/` is installed, use it.",
        "Write `.agents/skills/{target_skill}/stack/`.",
      ].join("\n"),
    );
    expect(workflowSkillViolations(root)).toEqual([]);

    write(
      ".agents/workflows/work.md",
      "Load oma-ghost, then `.agents/skills/angular-developer/SKILL.md`.",
    );
    expect(workflowSkillViolations(root)).toEqual([
      "workflows/work.md → missing .agents/skills/oma-ghost/",
      "workflows/work.md → missing .agents/skills/angular-developer/",
    ]);
  });
});
