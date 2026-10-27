import * as fs from "node:fs";
import { dirname, join, relative, resolve, sep } from "node:path";
import { parse as parseYaml } from "yaml";
import { PRESETS } from "../../constants/index.js";
import { AGENT_CONFIG_ALIASES } from "../../platform/agent-config/agent-ids.js";

export interface WorkflowManifestCoverage {
  name: string;
  referencedSkills: string[];
  missingSkills: string[];
  unreadableFiles: string[];
}

export interface InstallManifestSummary {
  selectedSkills: string[];
  installedSkills: string[];
  unavailableSelectedSkills: string[];
  inventoryIssue?: string;
  workflows: WorkflowManifestCoverage[];
}

const IDENTIFIER = /^[A-Za-z0-9_][A-Za-z0-9_-]*$/;
const MAX_DOCUMENTS_PER_WORKFLOW = 128;

/** Inspect file references only; this does not execute or certify a workflow. */
export function inspectInstallManifests(
  root: string,
  selectedSkills: readonly string[],
  workflowNames: readonly string[],
): InstallManifestSummary {
  const agentsDir = resolve(root, ".agents", "agents");
  const workflowsDir = resolve(root, ".agents", "workflows");
  const skillsDir = join(root, ".agents", "skills");
  const knownSkills = new Set(PRESETS.all ?? []);
  const displayPath = (file: string) =>
    relative(root, file).replaceAll("\\", "/");
  const reads = new Map<string, { text?: string; missing?: boolean }>();
  const read = (file: string) => {
    const cached = reads.get(file);
    if (cached) return cached;
    let result: { text?: string; missing?: boolean };
    try {
      result = { text: fs.readFileSync(file, "utf8") };
    } catch (error) {
      const code = (error as NodeJS.ErrnoException).code;
      result = { missing: code === "ENOENT" || code === "ENOTDIR" };
    }
    reads.set(file, result);
    return result;
  };
  const skillFile = (name: string) => join(skillsDir, name, "SKILL.md");
  const hasManifest = (name: string) =>
    read(skillFile(name)).text !== undefined;
  const summary: InstallManifestSummary = {
    selectedSkills: [...selectedSkills],
    installedSkills: [],
    unavailableSelectedSkills: selectedSkills.filter(
      (name) => !hasManifest(name),
    ),
    workflows: [],
  };
  try {
    summary.installedSkills = fs
      .readdirSync(skillsDir)
      .filter(
        (name) =>
          !name.startsWith("_") && IDENTIFIER.test(name) && hasManifest(name),
      )
      .sort();
  } catch {
    summary.inventoryIssue = `Could not list ${displayPath(skillsDir)}`;
  }

  const agentNames = new Map<string, string>();
  for (const [name, aliases] of Object.entries(AGENT_CONFIG_ALIASES)) {
    agentNames.set(name, name);
    for (const alias of aliases) agentNames.set(alias, name);
  }
  try {
    for (const file of fs.readdirSync(agentsDir)) {
      if (file.endsWith(".md")) {
        const name = file.slice(0, -3);
        agentNames.set(name, name);
      }
    }
  } catch {
    // A workflow that calls an agent still inspects its expected definition.
  }

  const inDirectory = (file: string, dir: string) =>
    file.startsWith(`${dir}${sep}`);
  for (const name of [...new Set(workflowNames)].sort()) {
    const skills = new Set<string>();
    const unreadable = new Set<string>();
    const visited = new Set<string>();
    const inspectDocument = (file: string): void => {
      file = resolve(file);
      if (visited.has(file)) return;
      if (visited.size >= MAX_DOCUMENTS_PER_WORKFLOW) {
        unreadable.add("document inspection limit reached");
        return;
      }
      visited.add(file);
      const { text } = read(file);
      if (text === undefined) {
        unreadable.add(displayPath(file));
        return;
      }

      const prose = text.replace(
        /^ {0,3}(`{3,}|~{3,})[^\n]*\n[\s\S]*?^ {0,3}\1[^\n]*(?:\n|$)/gm,
        "",
      );
      for (const match of prose.matchAll(
        /\.agents\/skills\/([A-Za-z0-9_][A-Za-z0-9_-]*)\/([A-Za-z0-9_./-]+\.[A-Za-z0-9]+)\b/g,
      )) {
        const skill = match[1] as string;
        if (
          skill !== "_shared" &&
          (match[2] === "SKILL.md" || knownSkills.has(skill))
        )
          skills.add(skill);
      }
      if (inDirectory(file, agentsDir)) {
        const frontmatter = /^---\r?\n([\s\S]*?)\r?\n---/.exec(text);
        try {
          if (!frontmatter?.[1]) throw new Error("missing frontmatter");
          const metadata = parseYaml(frontmatter[1]) as { skills?: unknown };
          if (!metadata || typeof metadata !== "object")
            throw new Error("invalid frontmatter");
          if (metadata.skills !== undefined && !Array.isArray(metadata.skills))
            throw new Error("invalid skills");
          for (const skill of (metadata.skills ?? []) as unknown[]) {
            if (typeof skill !== "string" || !IDENTIFIER.test(skill))
              throw new Error("invalid skill name");
            skills.add(skill);
          }
        } catch {
          unreadable.add(`${displayPath(file)} (invalid agent frontmatter)`);
        }
      }

      // Follow explicit local Markdown paths, including nested workflow guides.
      const refs = new Set<string>();
      for (const match of prose.matchAll(
        /\.agents\/(?:workflows|agents)\/[A-Za-z0-9_./-]+\.md\b/g,
      ))
        refs.add(match[0]);
      for (const match of prose.matchAll(
        /\]\(([^)\s]+\.md(?:#[^)\s]*)?)\)|`((?:\.{1,2}\/)[A-Za-z0-9_./-]+\.md(?:#[^`\s]*)?)`/g,
      )) {
        const ref = (match[1] ?? match[2] ?? "").split("#")[0] ?? "";
        if (ref && !/[{}<>*?]/.test(ref) && !/^[a-z]+:/i.test(ref))
          refs.add(ref);
      }
      for (const ref of refs) {
        const target = ref.startsWith(".agents/")
          ? resolve(root, ref)
          : resolve(dirname(file), ref);
        if (inDirectory(target, workflowsDir) || inDirectory(target, agentsDir))
          inspectDocument(target);
      }

      // Agent calls own frontmatter dependencies; prose mentions do not.
      for (const match of text.matchAll(
        /\bsubagent_type\s*[:=]\s*["']?([a-z][a-z0-9-]*)|\boma\s+agent\s+spawn\s+["']?([a-z][a-z0-9-]*)/g,
      )) {
        const invoked = match[1] ?? match[2] ?? "";
        if (invoked === "general-purpose") continue;
        const agent =
          agentNames.get(invoked) ??
          agentNames.get(invoked.replace(/-agent$/, "")) ??
          invoked;
        inspectDocument(join(agentsDir, `${agent}.md`));
      }
    };
    if (IDENTIFIER.test(name))
      inspectDocument(join(workflowsDir, `${name}.md`));
    else unreadable.add("invalid workflow filename");
    const missingSkills: string[] = [];
    for (const skill of skills) {
      const file = skillFile(skill);
      const manifest = read(file);
      if (manifest.text === undefined) {
        if (manifest.missing) missingSkills.push(skill);
        else unreadable.add(displayPath(file));
      }
    }
    summary.workflows.push({
      name,
      referencedSkills: [...skills].sort(),
      missingSkills: missingSkills.sort(),
      unreadableFiles: [...unreadable].sort(),
    });
  }
  return summary;
}

export function renderInstallManifestSummary(
  summary: InstallManifestSummary,
  options: { global?: boolean } = {},
): string[] {
  const unavailable = new Set(summary.unavailableSelectedSkills);
  const lines = [
    `Selected skills: ${summary.selectedSkills.length}`,
    ...summary.selectedSkills.map((skill) =>
      unavailable.has(skill)
        ? `! ${skill} (SKILL.md missing or unreadable)`
        : `✓ ${skill}`,
    ),
    summary.inventoryIssue
      ? `Installed skill manifests: not assessed (${summary.inventoryIssue})`
      : `Installed skill manifests: ${summary.installedSkills.length} (selected and retained)`,
  ];
  const incomplete = summary.workflows.filter(
    (workflow) =>
      workflow.missingSkills.length || workflow.unreadableFiles.length,
  );
  lines.push(
    summary.workflows.length
      ? `Workflow referenced skill manifests: ${summary.workflows.length - incomplete.length}/${summary.workflows.length} complete`
      : "Workflow referenced skill manifests: no workflow files found",
  );
  for (const workflow of incomplete) {
    const details = [
      ...(workflow.missingSkills.length
        ? [`missing ${workflow.missingSkills.join(", ")}`]
        : []),
      ...(workflow.unreadableFiles.length
        ? [`not assessed: ${workflow.unreadableFiles.join(", ")}`]
        : []),
    ];
    lines.push(`/${workflow.name}: ${details.join("; ")}`);
  }
  lines.push(
    "Static manifest references only, including conditional branches; resource contents, tools and execution are not verified.",
  );
  if (unavailable.size || incomplete.length || summary.inventoryIssue) {
    const doctorCommand = options.global ? "oma doctor --global" : "oma doctor";
    lines.push(
      `Run ${doctorCommand} from this install root; choose Select individually to add missing skills. Inspect unreadable files manually.`,
    );
  }
  return lines;
}
