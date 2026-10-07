import { lstatSync, mkdirSync, realpathSync, writeFileSync } from "node:fs";
import path from "node:path";
import { parseDocument } from "yaml";
import {
  BundleCollector,
  bundleFailure,
  INSTALLED_MATRIX_LIMITS,
  regularBundleDirectory,
  validateBundlePath,
} from "./bundle-io.js";
import {
  installedMarkdownReferences,
  outsideInstalledRoot,
  resolveInstalledReference,
} from "./bundle-refs.js";
import { matrixFixtureHash } from "./suite.js";
import {
  MATRIX_PROTOCOL_VERSION,
  type MatrixCase,
  type MatrixVendor,
  type PreparedMatrixCase,
} from "./types.js";

export type InstalledMatrixDelivery = "native" | "injected";

export interface InstalledMatrixSkillManifest {
  name: string;
  hash: string;
  caseId: string;
  requiredFiles: string[];
  missingFiles: string[];
  excludedReferences: Array<{ path: string; reason: string }>;
}

export interface InstalledMatrixBundle {
  cases: MatrixCase[];
  manifest: { hash: string; skills: InstalledMatrixSkillManifest[] };
  /** Unchanged source files, keyed relative to the native skills root. */
  files: Record<string, string>;
  /** Per-case conservative dependency snapshots, also relative to skills root. */
  caseFiles: Record<string, Record<string, string>>;
}

function skillName(name: string): void {
  if (name.length > 64 || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(name))
    bundleFailure("skill names must be lowercase skill identifiers");
}

function assertEntry(files: Record<string, string>, name: string): string {
  const source = files[`${name}/SKILL.md`];
  if (source === undefined) bundleFailure("selected skill has no SKILL.md");
  const match = /^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/.exec(source);
  if (!match?.[1]) bundleFailure("selected skill has no YAML frontmatter");
  const document = parseDocument(match[1], { uniqueKeys: true });
  if (document.errors.length)
    bundleFailure("selected skill frontmatter is invalid");
  let data: unknown;
  try {
    data = document.toJS({ maxAliasCount: 0 });
  } catch {
    bundleFailure("selected skill frontmatter aliases are forbidden");
  }
  if (
    !data ||
    typeof data !== "object" ||
    Reflect.get(data, "name") !== name ||
    typeof Reflect.get(data, "description") !== "string" ||
    !Reflect.get(data, "description").trim()
  )
    bundleFailure("selected skill frontmatter name/description is invalid");
  return source;
}

function existsWithoutLink(file: string): boolean {
  try {
    const stat = lstatSync(file);
    if (stat.isSymbolicLink()) bundleFailure("source dependency is a symlink");
    return true;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return false;
    throw error;
  }
}

function relativeFiles(
  files: Record<string, string>,
  skill: string,
): Record<string, string> {
  return Object.fromEntries(
    Object.entries(files).map(([file, content]) => [
      path.posix.relative(skill, file),
      content,
    ]),
  );
}

function referenceExclusion(
  name: string,
  reference: string,
): string | undefined {
  const resolved = resolveInstalledReference(name, reference);
  if (outsideInstalledRoot(reference, resolved)) return "outside-skills-root";
  if (/^(?:DESIGN|AGENTS|CLAUDE|GEMINI|CODEX)\.md$/i.test(reference))
    return "project-scope-reference";
  try {
    validateBundlePath(resolved);
  } catch {
    return "unsafe-reference";
  }
  return undefined;
}

export function loadInstalledMatrixBundle(
  projectRoot: string,
  names: string[],
): InstalledMatrixBundle {
  if (
    !names.length ||
    names.length > INSTALLED_MATRIX_LIMITS.skills ||
    new Set(names).size !== names.length
  )
    bundleFailure("select a nonempty, unique bounded skill list");
  for (const name of names) skillName(name);
  regularBundleDirectory(projectRoot);
  const project = realpathSync(projectRoot);
  regularBundleDirectory(path.join(project, ".agents"));
  const root = path.join(project, ".agents", "skills");
  regularBundleDirectory(root);
  const collector = new BundleCollector(root);
  collector.trackDirectory(root);
  const shared = existsWithoutLink(path.join(root, "_shared"))
    ? collector.collectTree("_shared")
    : {};
  const treeCache = new Map<string, Record<string, string>>();
  const tree = (name: string): Record<string, string> => {
    const cached = treeCache.get(name);
    if (cached) return cached;
    skillName(name);
    if (treeCache.size >= INSTALLED_MATRIX_LIMITS.skills)
      bundleFailure("dependency skill limit exceeded");
    const files = collector.collectTree(name);
    assertEntry(files, name);
    treeCache.set(name, files);
    return files;
  };
  const cases: MatrixCase[] = [];
  const skills: InstalledMatrixSkillManifest[] = [];
  const caseFiles = Object.create(null) as InstalledMatrixBundle["caseFiles"];
  for (const name of [...names].sort()) {
    const files = Object.assign(Object.create(null), shared) as Record<
      string,
      string
    >;
    const queue = [name];
    const visited = new Set<string>();
    for (let index = 0; index < queue.length; index++) {
      const dependency = queue[index];
      if (!dependency || visited.has(dependency)) continue;
      visited.add(dependency);
      const dependencyFiles = tree(dependency);
      Object.assign(files, dependencyFiles);
      const entry = dependencyFiles[`${dependency}/SKILL.md`] ?? "";
      for (const reference of installedMarkdownReferences(entry)) {
        const resolved = resolveInstalledReference(dependency, reference);
        if (referenceExclusion(dependency, reference)) continue;
        const sibling = resolved.split("/")[0];
        if (
          sibling &&
          sibling !== "_shared" &&
          !visited.has(sibling) &&
          existsWithoutLink(path.join(root, sibling))
        )
          queue.push(sibling);
      }
    }
    const entry = files[`${name}/SKILL.md`] ?? "";
    const required = new Set([`${name}/SKILL.md`]);
    const missing = new Set<string>();
    const excludedReferences: InstalledMatrixSkillManifest["excludedReferences"] =
      [];
    for (const reference of installedMarkdownReferences(entry)) {
      const resolved = resolveInstalledReference(name, reference);
      const exclusion = referenceExclusion(name, reference);
      if (exclusion) {
        excludedReferences.push({ path: reference, reason: exclusion });
        continue;
      }
      if (Object.hasOwn(files, resolved)) required.add(resolved);
      else missing.add(resolved);
    }
    const testCase: MatrixCase = {
      id: name,
      skill: name,
      prompt: "Read-access audit of an installed skill bundle.",
      files: relativeFiles(files, name),
      references: [...required, ...missing]
        .filter((file) => file !== `${name}/SKILL.md`)
        .sort()
        .map((file) => path.posix.relative(name, file)),
      expected: { read: true },
    };
    cases.push(testCase);
    caseFiles[name] = files;
    skills.push({
      name,
      hash: matrixFixtureHash(files),
      caseId: name,
      requiredFiles: [...required].sort(),
      missingFiles: [...missing].sort(),
      excludedReferences,
    });
  }
  collector.assertUnchanged();
  regularBundleDirectory(project);
  regularBundleDirectory(path.join(project, ".agents"));
  regularBundleDirectory(root);
  return {
    cases,
    manifest: { hash: matrixFixtureHash(collector.files), skills },
    files: collector.files,
    caseFiles,
  };
}

export function installedMatrixSuiteHash(
  bundle: InstalledMatrixBundle,
  delivery: InstalledMatrixDelivery,
): string {
  return matrixFixtureHash({
    "contract.json": JSON.stringify({
      protocol: MATRIX_PROTOCOL_VERSION,
      source: "installed",
      scope: "direct-literal-markdown-read-access",
      delivery,
      manifest: bundle.manifest,
    }),
  });
}

function ensureDirectory(directory: string): void {
  try {
    mkdirSync(directory);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "EEXIST") throw error;
  }
  regularBundleDirectory(directory);
}

export function installedMatrixTreeHash(root: string): string {
  let ancestor = path.parse(root).root;
  for (const segment of path.relative(ancestor, root).split(path.sep)) {
    ancestor = path.join(ancestor, segment);
    regularBundleDirectory(ancestor);
  }
  const collector = new BundleCollector(root);
  collector.collectRoot();
  collector.assertUnchanged();
  return matrixFixtureHash(collector.files);
}

export function prepareInstalledMatrixCase(
  bundle: InstalledMatrixBundle,
  testCase: MatrixCase,
  workspace: string,
  vendor: MatrixVendor,
  delivery: InstalledMatrixDelivery,
): PreparedMatrixCase {
  if (
    (vendor !== "claude" && vendor !== "codex") ||
    (delivery !== "native" && delivery !== "injected")
  )
    bundleFailure("unsupported vendor or delivery");
  const manifest = bundle.manifest.skills.find(
    (skill) => skill.caseId === testCase.id && skill.name === testCase.skill,
  );
  const files = bundle.caseFiles[testCase.id];
  if (!manifest || !files || matrixFixtureHash(files) !== manifest.hash)
    bundleFailure("case does not match the collected bundle");
  regularBundleDirectory(workspace);
  const canonicalWorkspace = realpathSync(workspace);
  const vendorRoot = path.join(
    canonicalWorkspace,
    delivery === "native" && vendor === "claude" ? ".claude" : ".agents",
  );
  ensureDirectory(vendorRoot);
  const protectedRoot = path.join(vendorRoot, "skills");
  mkdirSync(protectedRoot);
  for (const [file, content] of Object.entries(files)) {
    validateBundlePath(file);
    let directory = protectedRoot;
    for (const segment of file.split("/").slice(0, -1)) {
      directory = path.join(directory, segment);
      ensureDirectory(directory);
    }
    writeFileSync(path.join(protectedRoot, file), content, {
      flag: "wx",
      mode: 0o600,
    });
  }
  const skillRoot = path.join(protectedRoot, testCase.skill);
  const paths = [...manifest.requiredFiles, ...manifest.missingFiles]
    .sort()
    .map((file) => path.join(protectedRoot, file));
  const audit = [
    "Perform a read-access audit only. Do not invoke the skill's workflow or execute its commands. Do not modify files.",
    "Read the complete content of each following file with native read tools using these exact absolute paths:",
    ...paths.map((file) => `- ${JSON.stringify(file)}`),
    'After the reads, return exactly {"read":true} as the final JSON response, with no commentary. Missing files remain audit failures; do not create or replace them.',
  ].join("\n");
  const prompt =
    delivery === "injected"
      ? `## Skill ${testCase.skill}\nSource: ${path.join(skillRoot, "SKILL.md")}\n${files[`${testCase.skill}/SKILL.md`]}\n\n${audit}`
      : audit;
  return {
    testCase: structuredClone(testCase),
    workspace: canonicalWorkspace,
    skillRoot,
    contentHash: manifest.hash,
    protectedRoot,
    protectedFiles: { ...files },
    coverageComplete:
      manifest.missingFiles.length === 0 &&
      manifest.excludedReferences.length === 0,
    prompt,
  };
}
