import { readFileSync } from "node:fs";
import { join } from "node:path";
import { parse as parseYaml } from "yaml";

export interface WorkflowDependencies {
  required: readonly string[];
  conditional: readonly string[];
}

// Entry prerequisites only. A task-specific branch can require additional
// specialists; those references must not turn every selective install into All.
export const WORKFLOW_DEPENDENCIES: Readonly<
  Record<string, WorkflowDependencies>
> = {
  architecture: { required: ["oma-architecture"], conditional: [] },
  brainstorm: { required: [], conditional: ["oma-brainstorm", "oma-qa"] },
  convert: { required: [], conditional: ["oma-pdf", "oma-hwp", "oma-video"] },
  debug: { required: [], conditional: ["oma-debug"] },
  deepinit: { required: [], conditional: [] },
  design: { required: ["oma-design"], conditional: ["oma-image"] },
  docs: { required: ["oma-docs"], conditional: [] },
  explain: { required: ["oma-explanation"], conditional: [] },
  orchestrate: {
    required: ["oma-coordination", "oma-orchestration", "oma-qa"],
    conditional: ["oma-pm", "oma-refactor"],
  },
  plan: { required: ["oma-pm"], conditional: [] },
  ralph: {
    required: ["oma-coordination", "oma-pm", "oma-qa"],
    conditional: ["oma-refactor", "oma-scm"],
  },
  recap: { required: ["oma-recap"], conditional: [] },
  review: { required: ["oma-qa"], conditional: [] },
  schedule: { required: [], conditional: [] },
  scm: { required: ["oma-scm"], conditional: ["oma-docs", "oma-dev-workflow"] },
  security: { required: ["oma-security"], conditional: ["oma-debug"] },
  "stack-set": {
    required: [],
    conditional: ["oma-frontend", "oma-backend", "oma-mobile"],
  },
  tools: { required: [], conditional: [] },
  ultrawork: {
    required: ["oma-coordination", "oma-pm", "oma-qa"],
    conditional: ["oma-refactor", "oma-scm"],
  },
  video: {
    required: ["oma-video"],
    conditional: ["oma-image", "oma-voice", "oma-slide"],
  },
  work: {
    required: ["oma-coordination", "oma-pm", "oma-qa"],
    conditional: [
      "oma-backend",
      "oma-frontend",
      "oma-mobile",
      "oma-orchestration",
    ],
  },
};

const IDENTIFIER = /^[A-Za-z0-9_][A-Za-z0-9_-]*$/;

function frontmatter(file: string): Record<string, unknown> {
  const text = readFileSync(file, "utf8");
  const match = /^---\r?\n([\s\S]*?)\r?\n---/.exec(text);
  if (!match?.[1]) {
    if (/^---(?:\r?\n|$)/.test(text)) throw new Error("invalid frontmatter");
    return {};
  }
  const value: unknown = parseYaml(match[1]);
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw new Error("invalid frontmatter");
  return value as Record<string, unknown>;
}

export function isValidSkillManifest(root: string, name: string): boolean {
  if (!IDENTIFIER.test(name)) return false;
  try {
    const metadata = frontmatter(
      join(root, ".agents", "skills", name, "SKILL.md"),
    );
    return (
      metadata.name === name &&
      typeof metadata.description === "string" &&
      metadata.description.trim().length > 0
    );
  } catch {
    return false;
  }
}

export interface WorkflowAvailability extends WorkflowDependencies {
  name: string;
  available: boolean;
  missingRequired: string[];
  missingConditional: string[];
  issue?: string;
}

/** Custom workflows can declare dependencies: { required: [], conditional: [] }. */
export function inspectWorkflowAvailability(
  root: string,
  name: string,
): WorkflowAvailability {
  const builtIn = Object.hasOwn(WORKFLOW_DEPENDENCIES, name);
  let dependencies = (builtIn ? WORKFLOW_DEPENDENCIES[name] : undefined) ?? {
    required: [],
    conditional: [],
  };
  try {
    if (!IDENTIFIER.test(name)) throw new Error("invalid workflow name");
    const metadata = frontmatter(
      join(root, ".agents", "workflows", `${name}.md`),
    );
    // Built-in requirements cannot be weakened by a stale/custom manifest.
    if (!builtIn && metadata.dependencies !== undefined) {
      const value = metadata.dependencies;
      if (!value || typeof value !== "object" || Array.isArray(value))
        throw new Error("invalid workflow dependencies");
      const declared = value as Record<string, unknown>;
      if (
        Object.keys(declared).some(
          (key) => key !== "required" && key !== "conditional",
        )
      )
        throw new Error("invalid workflow dependencies");
      const readSkills = (key: string): string[] => {
        const names = declared[key] === undefined ? [] : declared[key];
        if (
          !Array.isArray(names) ||
          names.some(
            (skill) => typeof skill !== "string" || !IDENTIFIER.test(skill),
          )
        )
          throw new Error("invalid workflow dependencies");
        return [...new Set(names as string[])];
      };
      dependencies = {
        required: readSkills("required"),
        conditional: readSkills("conditional"),
      };
    }
    const missingRequired = dependencies.required.filter(
      (skill) => !isValidSkillManifest(root, skill),
    );
    return {
      name,
      ...dependencies,
      available: missingRequired.length === 0,
      missingRequired,
      missingConditional: dependencies.conditional.filter(
        (skill) => !isValidSkillManifest(root, skill),
      ),
    };
  } catch {
    return {
      name,
      ...dependencies,
      available: false,
      missingRequired: [],
      missingConditional: [],
      issue: "workflow manifest missing, unreadable or invalid",
    };
  }
}
