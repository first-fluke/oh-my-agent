import {
  copyFileSync,
  existsSync,
  lstatSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  realpathSync,
} from "node:fs";
import { dirname, join, relative, resolve, sep } from "node:path";
import { parseFrontmatter } from "../../utils/frontmatter.js";
import { sha256Hex } from "../../utils/hash.js";
import { assertDirectory, isPathInside } from "./paths.js";
import type { CandidateOverlayManifest } from "./types.js";

const ALLOWED_DEFINITION_DIRS = new Set([
  "agents",
  "rules",
  "skills",
  "workflows",
]);

function collectFiles(root: string, current: string, files: string[]): void {
  for (const entry of readdirSync(current, { withFileTypes: true }).sort(
    (a, b) => a.name.localeCompare(b.name),
  )) {
    const absolute = join(current, entry.name);
    if (entry.isSymbolicLink() || lstatSync(absolute).isSymbolicLink()) {
      throw new Error(
        `Candidate overlay contains a symbolic link: ${absolute}`,
      );
    }
    if (entry.isDirectory()) {
      collectFiles(root, absolute, files);
    } else if (entry.isFile()) {
      files.push(relative(root, absolute).split(sep).join("/"));
    } else {
      throw new Error(
        `Candidate overlay contains an unsupported entry: ${absolute}`,
      );
    }
  }
}

const PROTECTED_AGENT_FIELDS = [
  "effort",
  "maxTurns",
  "mcpServers",
  "model",
  "temperature",
  "timeoutMins",
  "tools",
] as const;

function assertAgentControlsUnchanged(
  relativePath: string,
  candidateRoot: string,
  projectRoot: string,
): void {
  const candidate = parseFrontmatter(
    readFileSync(join(candidateRoot, relativePath), "utf-8"),
  ).frontmatter;
  const baselinePath = join(projectRoot, relativePath);
  const baseline = existsSync(baselinePath)
    ? parseFrontmatter(readFileSync(baselinePath, "utf-8")).frontmatter
    : {};
  for (const field of PROTECTED_AGENT_FIELDS) {
    if (JSON.stringify(candidate[field]) !== JSON.stringify(baseline[field])) {
      throw new Error(
        `Candidate agent field ${field} cannot change model or execution controls: ${relativePath}`,
      );
    }
  }
}

function assertAllowedFile(
  relativePath: string,
  candidateRoot: string,
  projectRoot: string,
): void {
  const parts = relativePath.split("/");
  if (
    parts[0] !== ".agents" ||
    parts.length < 3 ||
    !ALLOWED_DEFINITION_DIRS.has(parts[1] ?? "")
  ) {
    throw new Error(`Candidate file is not allowed: ${relativePath}`);
  }
  if (parts[1] === "agents" && parts[2] === "variants") {
    throw new Error(
      `Candidate agent variants are not allowed because they can change model or permissions: ${relativePath}`,
    );
  }
  if (parts[1] === "agents") {
    if (parts.length !== 3 || !relativePath.endsWith(".md")) {
      throw new Error(`Candidate agent file is not allowed: ${relativePath}`);
    }
    assertAgentControlsUnchanged(relativePath, candidateRoot, projectRoot);
  }
}

export function validateCandidateOverlay(
  candidateRoot: string,
  projectRoot: string,
): CandidateOverlayManifest {
  const root = resolve(projectRoot, candidateRoot);
  if (!isPathInside(projectRoot, root)) {
    throw new Error("Candidate overlay must be inside the project root");
  }
  assertDirectory(root, "Candidate overlay root");
  if (lstatSync(root).isSymbolicLink()) {
    throw new Error("Candidate overlay root must not be a symbolic link");
  }
  if (!isPathInside(realpathSync(projectRoot), realpathSync(root))) {
    throw new Error("Candidate overlay resolves outside the project root");
  }
  const agentsRoot = join(root, ".agents");
  assertDirectory(agentsRoot, "Candidate .agents directory");

  const files: string[] = [];
  collectFiles(root, agentsRoot, files);
  if (files.length === 0) throw new Error("Candidate overlay is empty");
  for (const file of files) assertAllowedFile(file, root, projectRoot);

  const hash = sha256Hex(
    JSON.stringify(
      files.map((file) => ({
        path: file,
        hash: sha256Hex(readFileSync(join(root, file))),
      })),
    ),
  );
  return { root, files, hash };
}

export function applyCandidateOverlay(
  manifest: CandidateOverlayManifest,
  targetRoot: string,
): void {
  for (const file of manifest.files) {
    const target = join(targetRoot, file);
    mkdirSync(dirname(target), { recursive: true });
    copyFileSync(join(manifest.root, file), target);
  }
}
