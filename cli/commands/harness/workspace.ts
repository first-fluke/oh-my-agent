import {
  constants,
  cpSync,
  existsSync,
  lstatSync,
  mkdirSync,
  readdirSync,
  readlinkSync,
} from "node:fs";
import { dirname, isAbsolute, join, relative, resolve, sep } from "node:path";
import { CLI_SKILLS_DIR } from "../../constants/index.js";
import { installVendorAgents } from "../../platform/agent-composer.js";
import { mergeRulesIndexForVendor } from "../../platform/rules.js";
import {
  createVendorSymlinks,
  getInstalledSkillNames,
} from "../../platform/skills-installer/skill-symlinks.js";
import {
  createVendorWorkflowSymlinks,
  getInstalledWorkflowNames,
} from "../../platform/skills-installer/workflow-links.js";
import type { CliTool } from "../../types/index.js";
import { isPathInside } from "./paths.js";

const BASE_DEFINITION_DIRS = [
  "agents",
  "config",
  "rules",
  "skills",
  "workflows",
];
const BASE_DEFINITION_FILES = ["oma-config.yaml"];
const GENERATED_DEPENDENCY_DIRS = new Set(["node_modules", ".venv"]);

export function assertNoSymlinks(root: string): void {
  if (lstatSync(root).isSymbolicLink()) {
    throw new Error(`Evaluation input contains a symbolic link: ${root}`);
  }
  if (!lstatSync(root).isDirectory()) return;
  for (const entry of readdirSync(root)) assertNoSymlinks(join(root, entry));
}

function assertSafeBaselineSymlinks(root: string, current = root): void {
  const stat = lstatSync(current);
  if (stat.isSymbolicLink()) {
    const linkTarget = readlinkSync(current);
    const resolved = resolve(dirname(current), linkTarget);
    if (isAbsolute(linkTarget) || !isPathInside(root, resolved)) {
      throw new Error(`Baseline harness symlink escapes its tree: ${current}`);
    }
    return;
  }
  if (!stat.isDirectory()) return;
  for (const entry of readdirSync(current)) {
    const child = join(current, entry);
    if (
      lstatSync(child).isDirectory() &&
      GENERATED_DEPENDENCY_DIRS.has(entry)
    ) {
      continue;
    }
    assertSafeBaselineSymlinks(root, child);
  }
}

function copyFixtureTree(source: string, target: string): void {
  if (!existsSync(source)) return;
  assertNoSymlinks(source);
  mkdirSync(target, { recursive: true });
  cpSync(source, target, { recursive: true, force: true });
}

function copyBaselineTree(source: string, target: string): void {
  if (!existsSync(source)) return;
  assertSafeBaselineSymlinks(source);
  mkdirSync(target, { recursive: true });
  cpSync(source, target, {
    recursive: true,
    force: true,
    verbatimSymlinks: true,
    mode: constants.COPYFILE_FICLONE,
    filter: (entry) => {
      const parts = relative(source, entry).split(sep);
      return !parts.some((part) => GENERATED_DEPENDENCY_DIRS.has(part));
    },
  });
}

export function seedEvaluationWorkspace(
  projectRoot: string,
  fixtureWorkspace: string,
  targetRoot: string,
): void {
  copyFixtureTree(fixtureWorkspace, targetRoot);
  const sourceAgents = join(projectRoot, ".agents");
  const targetAgents = join(targetRoot, ".agents");
  mkdirSync(targetAgents, { recursive: true });
  for (const dir of BASE_DEFINITION_DIRS) {
    copyBaselineTree(join(sourceAgents, dir), join(targetAgents, dir));
  }
  for (const file of BASE_DEFINITION_FILES) {
    const source = join(sourceAgents, file);
    if (existsSync(source))
      cpSync(source, join(targetAgents, file), { force: true });
  }
}

export function materializeVendorHarness(
  workspace: string,
  vendor: string,
): void {
  const spec = CLI_SKILLS_DIR[vendor as keyof typeof CLI_SKILLS_DIR];
  if (!spec) {
    throw new Error(`Vendor ${vendor} has no project-local skill projection`);
  }
  if (spec.requiresHomeConsent) {
    throw new Error(
      `Vendor ${vendor} uses HOME-based harness discovery; isolated live evaluation is unavailable`,
    );
  }

  const cli = vendor as CliTool;
  createVendorSymlinks(workspace, [cli], getInstalledSkillNames(workspace));
  createVendorWorkflowSymlinks(
    workspace,
    [cli],
    getInstalledWorkflowNames(workspace),
  );
  installVendorAgents(workspace, workspace, vendor);
  mergeRulesIndexForVendor(workspace, vendor);
}
