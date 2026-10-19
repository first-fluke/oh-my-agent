import { createHash } from "node:crypto";
import {
  existsSync,
  lstatSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  realpathSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
import {
  basename,
  dirname,
  extname,
  isAbsolute,
  join,
  relative,
  resolve,
  sep,
} from "node:path";
import type { Nodes } from "mdast";
import remarkParse from "remark-parse";
import { unified } from "unified";
import {
  profileDir,
  projectIdentity,
} from "../../.agents/hooks/core/session-storage.ts";
import { runtimeStateDir } from "../state/project-runtime.js";
import { atomicWriteFileSync } from "../utils/safe-write.js";

export interface ArtifactLayoutMove {
  from: string;
  to: string;
}

export interface ArtifactLayoutMigrationReport {
  dryRun: boolean;
  moved: ArtifactLayoutMove[];
  rewritten: string[];
  skipped: { path: string; reason: string }[];
  conflicts: ArtifactLayoutMove[];
  actions: string[];
}

interface Candidate {
  from: string;
  desired: string;
  qualifier: string;
  content: Buffer;
  mode: number;
  companion?: {
    source: string;
    suffix: string;
    keepMarkdownExtension: boolean;
  };
}

const DECISION_SOURCES = [
  { path: "docs/design-docs", qualifier: "design-docs" },
  { path: "docs/plans/designs", qualifier: "plan-designs" },
] as const;
const RESULT_SOURCES = [
  { path: ".agents/state/memories", qualifier: "state-memories" },
  { path: ".serena/memories", qualifier: "serena-memories" },
] as const;
const posix = (path: string) => path.split(sep).join("/");
const markdown = (path: string) => /\.md$/i.test(path);
const uiDesign = (path: string) => basename(path).toUpperCase() === "DESIGN.MD";
const markdownParser = unified().use(remarkParse);

/** Locate destinations using parsed Markdown nodes and balanced delimiters. */
function linkDestinations(content: string): { start: number; end: number }[] {
  const ranges: { start: number; end: number }[] = [];
  const visit = (node: Nodes): void => {
    if (["link", "image", "definition"].includes(node.type)) {
      let cursor = node.position?.start.offset;
      const limit = node.position?.end.offset;
      if (cursor !== undefined && limit !== undefined) {
        if (content[cursor] === "!") cursor++;
        let depth = 0;
        for (; cursor < limit; cursor++) {
          if (content[cursor] === "\\") {
            cursor++;
            continue;
          }
          if (content[cursor] === "[") depth++;
          if (content[cursor] === "]" && --depth === 0) {
            cursor++;
            break;
          }
        }
        if (content[cursor] === "(" || content[cursor] === ":") {
          cursor++;
          while (/\s/.test(content[cursor] ?? "") && cursor < limit) cursor++;
          const start = cursor;
          const angled = content[cursor] === "<";
          if (angled) cursor++;
          depth = 0;
          for (; cursor < limit; cursor++) {
            const character = content[cursor];
            if (character === "\\") {
              cursor++;
              continue;
            }
            if (angled) {
              if (character === ">") {
                cursor++;
                break;
              }
            } else {
              if (character === "(") depth++;
              else if (character === ")") {
                if (depth === 0) break;
                depth--;
              } else if (/\s/.test(character ?? "") && depth === 0) break;
            }
          }
          if (cursor > start) ranges.push({ start, end: cursor });
        }
      }
    }
    if ("children" in node) for (const child of node.children) visit(child);
  };
  visit(markdownParser.parse(content));
  return ranges.sort((a, b) => b.start - a.start);
}

function inside(root: string, path: string): boolean {
  const rel = relative(root, path);
  return rel !== ".." && !rel.startsWith(`..${sep}`) && !isAbsolute(rel);
}

/** Reject every symlink component, including dangling links and linked parents. */
function checkedPath(root: string, name: string): string {
  const path = resolve(root, name);
  if (isAbsolute(name) || !inside(root, path))
    throw new Error("Path must stay inside the project");
  let current = root;
  for (const component of relative(root, path).split(sep).filter(Boolean)) {
    current = join(current, component);
    try {
      if (lstatSync(current).isSymbolicLink())
        throw new Error("Symlink paths are not migrated");
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
      break;
    }
  }
  return path;
}

function collectFiles(
  root: string,
  name: string,
  recursive: boolean,
  skip: (path: string, reason: string) => void,
): string[] {
  let path: string;
  try {
    path = checkedPath(root, name);
    if (!existsSync(path)) return [];
    if (!lstatSync(path).isDirectory()) {
      skip(name, "Expected a directory");
      return [];
    }
  } catch (error) {
    skip(name, (error as Error).message);
    return [];
  }
  const files: string[] = [];
  try {
    for (const entry of readdirSync(path, { withFileTypes: true }).sort(
      (a, b) => a.name.localeCompare(b.name),
    )) {
      const child = `${name}/${entry.name}`;
      if (entry.isSymbolicLink()) skip(child, "Symlink paths are not migrated");
      else if (entry.isFile()) files.push(child);
      else if (entry.isDirectory() && recursive)
        files.push(...collectFiles(root, child, true, skip));
    }
  } catch (error) {
    skip(name, `Cannot read directory: ${(error as Error).message}`);
  }
  return files;
}

/** Read receipts and pinned plans without modifying their paths or hashes. */
function evidenceBindings(root: string): {
  bound: (name: string) => boolean;
  uncertain: string[];
} {
  const paths = new Set<string>();
  const uncertain: string[] = [];
  const profileRoot = dirname(profileDir());
  const add = (value: string, base: string) => {
    if (!value || /[\n\r\0]/.test(value)) return;
    let path = resolve(base, value);
    // Receipts may have been recorded through an OS alias (/var on macOS).
    // Bind the actual existing file while keeping all state bytes unchanged.
    try {
      path = realpathSync(path);
    } catch {
      // A missing declared output can still be an exact root-relative path.
    }
    if (inside(root, path)) paths.add(path);
  };
  const pathLists = new Set([
    "artifacts",
    "inputs",
    "outputs",
    "evidence",
    "required_artifacts",
    "requiredArtifacts",
  ]);
  const pathFields = new Set([
    "path",
    "file",
    "artifactPath",
    "reportPath",
    "planPath",
    "taskFile",
  ]);
  const inspectPaths = (value: unknown, base: string): void => {
    if (typeof value === "string") add(value, base);
    else if (Array.isArray(value)) {
      for (const child of value) inspectPaths(child, base);
    } else if (value && typeof value === "object") {
      for (const [key, child] of Object.entries(value)) {
        // A receipt uses a path -> SHA-256 map. Descriptor objects and task
        // contracts bind only named path fields, never IDs or descriptions.
        if (
          typeof child === "string" &&
          (key.includes("/") || /^[a-f0-9]{64}$/.test(child))
        )
          add(key, base);
      }
      inspect(value, base);
    }
  };
  const inspect = (value: unknown, base: string): void => {
    if (Array.isArray(value)) {
      for (const child of value) inspect(child, base);
    } else if (value && typeof value === "object") {
      for (const [key, child] of Object.entries(value)) {
        if (pathLists.has(key)) inspectPaths(child, base);
        else if (pathFields.has(key) && typeof child === "string")
          add(child, base);
        else if (child && typeof child === "object") inspect(child, base);
      }
    }
  };
  const scan = (directory: string): void => {
    try {
      // Local state must obey the same symlink guard as migrated files. The
      // profile store can be external, but is read-only and never traverses
      // symlink entries.
      if (inside(root, directory)) checkedPath(root, relative(root, directory));
      if (inside(profileRoot, directory)) {
        if (existsSync(profileRoot) && lstatSync(profileRoot).isSymbolicLink())
          throw new Error("Symlink profile directory");
        checkedPath(profileRoot, relative(profileRoot, directory));
      }
      if (!existsSync(directory)) return;
      if (lstatSync(directory).isSymbolicLink())
        throw new Error("Symlink evidence directory");
      for (const entry of readdirSync(directory, { withFileTypes: true })) {
        const file = join(directory, entry.name);
        if (entry.isSymbolicLink()) {
          uncertain.push(`Cannot inspect symlink evidence: ${file}`);
        } else if (entry.isDirectory()) scan(file);
        else if (entry.isFile() && entry.name.endsWith(".json")) {
          const document: unknown = JSON.parse(readFileSync(file, "utf8"));
          let artifactRoot =
            document &&
            typeof document === "object" &&
            "artifactRoot" in document &&
            typeof document.artifactRoot === "string"
              ? resolve(document.artifactRoot)
              : root;
          try {
            artifactRoot = realpathSync(artifactRoot);
          } catch {
            // Archived worktrees can no longer exist.
          }
          inspect(document, artifactRoot);
        }
      }
    } catch (error) {
      uncertain.push(
        `Cannot inspect evidence at ${directory}: ${(error as Error).message}`,
      );
    }
  };
  for (const directory of new Set([
    join(root, ".agents/state/agent-runs"),
    join(root, ".agents/state/agent-plans"),
    runtimeStateDir(root, "agent-runs"),
    runtimeStateDir(root, "agent-plans"),
  ]))
    scan(directory);
  // Reports are shared project files. A receipt owned by another local
  // profile still binds the original artifact path.
  try {
    if (existsSync(profileRoot)) {
      if (lstatSync(profileRoot).isSymbolicLink())
        throw new Error("Symlink profile directory");
      for (const slot of readdirSync(profileRoot, { withFileTypes: true })) {
        if (!/^(0|[1-9][0-9]{0,9})$/.test(slot.name)) continue;
        if (slot.isSymbolicLink()) {
          uncertain.push(
            `Cannot inspect symlink profile: ${join(profileRoot, slot.name)}`,
          );
          continue;
        }
        if (!slot.isDirectory()) continue;
        for (const area of ["agent-runs", "agent-plans"])
          scan(
            join(
              profileRoot,
              slot.name,
              "projects",
              projectIdentity(root).projectId,
              area,
            ),
          );
      }
    }
  } catch (error) {
    uncertain.push(
      `Cannot inspect other profiles: ${(error as Error).message}`,
    );
  }
  return {
    bound: (name) => {
      const file = resolve(root, name);
      return [...paths].some(
        (path) =>
          file === path || (path !== root && file.startsWith(`${path}${sep}`)),
      );
    },
    uncertain,
  };
}

function collisionName(
  candidate: Candidate,
  occupied: (name: string) => boolean,
): string {
  const extension = extname(candidate.desired);
  const stem = candidate.desired.slice(
    0,
    candidate.desired.length - extension.length,
  );
  const qualified = `${stem}--from-${candidate.qualifier}`;
  if (!occupied(`${qualified}${extension}`)) return `${qualified}${extension}`;
  const hash = createHash("sha256")
    .update(candidate.content)
    .digest("hex")
    .slice(0, 12);
  let name = `${qualified}-${hash}${extension}`;
  let number = 2;
  while (occupied(name)) name = `${qualified}-${hash}-${number++}${extension}`;
  return name;
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function rewriteMarkdownSection(
  content: string,
  from: string,
  to: string,
  moves: ReadonlyMap<string, string>,
  directories: ReadonlyMap<string, string>,
  root: string,
): string {
  const remap = (name: string): string => {
    const exact = moves.get(name);
    if (exact) return exact;
    for (const [old, next] of directories) {
      if (name === old || name.startsWith(`${old}/`))
        return `${next}${name.slice(old.length)}`;
    }
    return name;
  };
  const target = (raw: string): string => {
    const angled = raw.startsWith("<") && raw.endsWith(">");
    const link = angled ? raw.slice(1, -1) : raw;
    if (/^(?:[a-z][a-z\d+.-]*:|\/\/|#)/i.test(link)) return raw;
    const suffixAt = link.search(/[?#]/);
    const pathname = suffixAt < 0 ? link : link.slice(0, suffixAt);
    const suffix = suffixAt < 0 ? "" : link.slice(suffixAt);
    let decoded: string;
    try {
      decoded = pathname
        .replace(/\\([!"#$%&'()*+,\-./:;<=>?@[\\\]^_`{|}~])/g, "$1")
        .split("/")
        .map(decodeURIComponent)
        .join("/");
    } catch {
      return raw;
    }
    const rooted = decoded.startsWith("/");
    const absolute = rooted
      ? resolve(root, decoded.slice(1))
      : resolve(root, dirname(from), decoded);
    if (!inside(root, absolute)) return raw;
    const original = posix(relative(root, absolute));
    const mapped = remap(original);
    if (mapped === original && from === to) return raw;
    let next = rooted
      ? `/${mapped}`
      : posix(relative(dirname(resolve(root, to)), resolve(root, mapped))) ||
        ".";
    if (decoded.endsWith("/") && !next.endsWith("/")) next += "/";
    if (pathname.includes("%"))
      next = next
        .split("/")
        .map((part) => encodeURIComponent(part))
        .join("/");
    next += suffix;
    return angled ? `<${next}>` : next;
  };
  let next = content;
  for (const { start, end } of linkDestinations(content))
    next =
      next.slice(0, start) +
      target(content.slice(start, end)) +
      next.slice(end);

  // Literal root-relative paths in prose/code spans need the same mapping.
  // Keep remote URLs intact, including repository browser links.
  const rewriteLiterals = (text: string): string => {
    let rewritten = text;
    for (const [old, mapped] of [...moves].sort(
      (a, b) => b[0].length - a[0].length,
    )) {
      rewritten = rewritten.replace(
        new RegExp(
          `(^|[^A-Za-z0-9_.-])${escapeRegex(old)}(?=$|[^A-Za-z0-9_./-]|\\.(?:\\s|$))`,
          "g",
        ),
        (_match, before: string) => `${before}${mapped}`,
      );
    }
    for (const [old, mapped] of directories) {
      rewritten = rewritten.replace(
        new RegExp(
          `(^|[^A-Za-z0-9_.-])${escapeRegex(old)}(?=$|[/\\s\x60'"<>)}\\]])`,
          "g",
        ),
        (_match, before: string) => `${before}${mapped}`,
      );
    }
    return rewritten;
  };
  let cursor = 0;
  let rewritten = "";
  for (const match of next.matchAll(/\b[a-z][a-z\d+.-]*:\/\/[^\s<>"'`]+/gi)) {
    rewritten += rewriteLiterals(next.slice(cursor, match.index));
    rewritten += match[0];
    cursor = (match.index ?? 0) + match[0].length;
  }
  rewritten += rewriteLiterals(next.slice(cursor));
  next = rewritten;
  return next;
}

function rewriteMarkdown(
  content: string,
  from: string,
  to: string,
  moves: ReadonlyMap<string, string>,
  directories: ReadonlyMap<string, string>,
  root: string,
): string {
  let cursor = 0;
  let rewritten = "";
  for (const block of content.matchAll(
    /<!--\s*oma-docs:ignore-start\s*-->[\s\S]*?<!--\s*oma-docs:ignore-end\s*-->/gi,
  )) {
    rewritten += rewriteMarkdownSection(
      content.slice(cursor, block.index),
      from,
      to,
      moves,
      directories,
      root,
    );
    rewritten += block[0];
    cursor = (block.index ?? 0) + block[0].length;
  }
  return (
    rewritten +
    rewriteMarkdownSection(
      content.slice(cursor),
      from,
      to,
      moves,
      directories,
      root,
    )
  );
}

/** Migrate generated artifacts without modifying UI design or execution evidence. */
export function migrateArtifactLayout(
  projectRoot: string,
  options: { dryRun?: boolean } = {},
): ArtifactLayoutMigrationReport {
  const root = realpathSync(resolve(projectRoot));
  const report: ArtifactLayoutMigrationReport = {
    dryRun: options.dryRun === true,
    moved: [],
    rewritten: [],
    skipped: [],
    conflicts: [],
    actions: [],
  };
  const skip = (path: string, reason: string) => {
    if (
      !report.skipped.some(
        (item) => item.path === path && item.reason === reason,
      )
    )
      report.skipped.push({ path, reason });
  };
  const evidence = evidenceBindings(root);
  const protectedPath = (path: string): boolean => {
    if (uiDesign(path)) {
      skip(path, "UI DESIGN.md is preserved");
      return true;
    }
    if (evidence.uncertain.length > 0) {
      skip(
        path,
        `Evidence bindings could not be established: ${evidence.uncertain.join("; ")}`,
      );
      return true;
    }
    if (evidence.bound(path)) {
      skip(
        path,
        "Referenced by an execution receipt, claim, or pinned plan; preserve the original path and bytes",
      );
      return true;
    }
    return false;
  };
  const candidates: Candidate[] = [];
  const addCandidate = (from: string, desired: string, qualifier: string) => {
    if (protectedPath(from)) return;
    try {
      const source = checkedPath(root, from);
      checkedPath(root, desired);
      candidates.push({
        from,
        desired,
        qualifier,
        content: readFileSync(source),
        mode: lstatSync(source).mode,
      });
    } catch (error) {
      skip(from, (error as Error).message);
    }
  };
  for (const source of DECISION_SOURCES) {
    for (const file of collectFiles(root, source.path, true, skip))
      addCandidate(
        file,
        `docs/decisions${file.slice(source.path.length)}`,
        source.qualifier,
      );
  }
  for (const source of RESULT_SOURCES) {
    for (const file of collectFiles(root, source.path, false, skip)) {
      if (/^result-.*\.md$/.test(basename(file)))
        addCandidate(
          file,
          `.agents/results/${basename(file)}`,
          source.qualifier,
        );
    }
  }
  const architectureFiles = new Set(
    collectFiles(root, ".agents/results/architecture", false, skip),
  );
  for (const from of [...architectureFiles].filter((path) =>
    /^adr-.*\.md$/i.test(basename(path)),
  )) {
    const companions = [
      ...[".archify.json", ".archify.html"].map((suffix) => ({
        path: `${from.slice(0, -3)}${suffix}`,
        suffix,
        keepMarkdownExtension: false,
      })),
      ...[".archify.json", ".archify.html"].map((suffix) => ({
        path: `${from}${suffix}`,
        suffix,
        keepMarkdownExtension: true,
      })),
    ].filter(({ path }) => architectureFiles.has(path));
    const group = [from, ...companions.map(({ path }) => path)];
    if (group.map(protectedPath).some(Boolean)) {
      for (const path of group)
        skip(
          path,
          "ADR and its companion files are preserved together because one is protected",
        );
      continue;
    }
    addCandidate(from, `docs/decisions/${basename(from)}`, "architecture");
    for (const companion of companions) {
      addCandidate(
        companion.path,
        `docs/decisions/${basename(companion.path)}`,
        "architecture",
      );
      const candidate = candidates.at(-1);
      if (candidate?.from === companion.path)
        candidate.companion = {
          source: from,
          suffix: companion.suffix,
          keepMarkdownExtension: companion.keepMarkdownExtension,
        };
    }
  }

  const references = new Set([
    ...collectFiles(root, "docs", true, skip).filter(markdown),
    ...RESULT_SOURCES.flatMap((source) =>
      collectFiles(root, source.path, false, skip).filter(markdown),
    ),
    ...[...architectureFiles].filter(markdown),
    ...readdirSync(root).filter((name) =>
      /^(?:README(?:[._-].*)?|AGENTS|DESIGN)\.md$/i.test(name),
    ),
  ]);
  const immutable = new Map<string, string>();
  for (const name of references) {
    if (!evidence.bound(name) && !uiDesign(name)) continue;
    try {
      immutable.set(name, readFileSync(checkedPath(root, name), "utf8"));
    } catch (error) {
      skip(name, (error as Error).message);
    }
  }
  const deferred = new Set<string>();
  let changed: boolean;
  do {
    changed = false;
    for (const candidate of candidates) {
      if (deferred.has(candidate.from)) continue;
      const mapping = new Map([[candidate.from, candidate.desired]]);
      if (candidate.from.startsWith(".agents/state/memories/result-")) {
        const legacy = `.serena/memories/${basename(candidate.from)}`;
        try {
          if (!existsSync(checkedPath(root, legacy)))
            mapping.set(legacy, candidate.desired);
        } catch {
          // Unsafe legacy paths are never compatibility aliases.
        }
      }
      for (const [name, content] of immutable) {
        if (
          rewriteMarkdown(content, name, name, mapping, new Map(), root) ===
          content
        )
          continue;
        const group = candidate.companion?.source ?? candidate.from;
        for (const member of candidates) {
          if (
            (member.companion?.source ?? member.from) !== group ||
            deferred.has(member.from)
          )
            continue;
          deferred.add(member.from);
          skip(
            member.from,
            `Referenced by protected Markdown ${name}; preserve the original path and bytes`,
          );
          if (markdown(member.from))
            immutable.set(member.from, member.content.toString("utf8"));
        }
        changed = true;
        break;
      }
    }
  } while (changed);
  for (let index = candidates.length - 1; index >= 0; index--)
    if (deferred.has(candidates[index]?.from ?? ""))
      candidates.splice(index, 1);

  const moves = new Map<string, string>();
  const reserved = new Set<string>();
  const occupied = (name: string): boolean => {
    const path = checkedPath(root, name);
    return reserved.has(name) || existsSync(path);
  };
  for (const candidate of candidates) {
    try {
      if (candidate.companion) {
        const document = moves.get(candidate.companion.source);
        if (!document) {
          skip(
            candidate.from,
            "ADR companion remains with its deferred document",
          );
          continue;
        }
        candidate.desired = `${candidate.companion.keepMarkdownExtension ? document : document.slice(0, -3)}${candidate.companion.suffix}`;
      }
      const collision = occupied(candidate.desired);
      const to = collision
        ? collisionName(candidate, occupied)
        : candidate.desired;
      moves.set(candidate.from, to);
      reserved.add(to);
      if (collision) report.conflicts.push({ from: candidate.from, to });
    } catch (error) {
      skip(candidate.from, (error as Error).message);
    }
  }

  const directories = new Map<string, string>();
  for (const source of DECISION_SOURCES) {
    if (
      [...moves.keys()].some((path) => path.startsWith(`${source.path}/`)) &&
      !report.skipped.some(
        ({ path }) =>
          path === source.path || path.startsWith(`${source.path}/`),
      )
    )
      directories.set(source.path, "docs/decisions");
  }

  const referenceMoves = new Map(moves);
  for (const [from, to] of moves) {
    if (!from.startsWith(".agents/state/memories/result-")) continue;
    const legacy = `.serena/memories/${basename(from)}`;
    try {
      // Migration 017 used to move these reports into state. Repair old
      // project-document links only when no real legacy file competes.
      if (!existsSync(checkedPath(root, legacy)))
        referenceMoves.set(legacy, to);
    } catch {
      // An unsafe legacy path is not an alias for a migrated file.
    }
  }

  const rewrites = new Map<string, string>();
  const originals = new Map<string, { content: string; mode: number }>();
  for (const candidate of candidates) {
    const to = moves.get(candidate.from);
    if (!to) continue;
    const raw = candidate.content.toString("utf8");
    const content = markdown(candidate.from)
      ? rewriteMarkdown(
          raw,
          candidate.from,
          to,
          referenceMoves,
          directories,
          root,
        )
      : undefined;
    if (content !== undefined && content !== raw) rewrites.set(to, content);
  }
  const sourceNames = new Set([...moves.keys(), ...moves.values()]);
  for (const name of [...references].sort()) {
    if (sourceNames.has(name) || uiDesign(name)) continue;
    let content: string;
    try {
      const path = checkedPath(root, name);
      if (!lstatSync(path).isFile()) continue;
      content = readFileSync(path, "utf8");
    } catch (error) {
      skip(name, (error as Error).message);
      continue;
    }
    const next = rewriteMarkdown(
      content,
      name,
      name,
      referenceMoves,
      directories,
      root,
    );
    if (next !== content && !protectedPath(name)) {
      rewrites.set(name, next);
      originals.set(name, {
        content,
        mode: lstatSync(checkedPath(root, name)).mode,
      });
    }
  }

  if (!report.dryRun) {
    const published: { candidate: Candidate; to: string; content: Buffer }[] =
      [];
    const changedReferences: string[] = [];
    const deleted: Candidate[] = [];
    try {
      // Publish complete, rebased bytes before deleting any source. This also
      // supports read-only Markdown files without a later in-place rewrite.
      for (const candidate of candidates) {
        const to = moves.get(candidate.from);
        if (!to) continue;
        const source = checkedPath(root, candidate.from);
        if (!readFileSync(source).equals(candidate.content))
          throw new Error(`Source changed during migration: ${candidate.from}`);
        const destination = checkedPath(root, to);
        mkdirSync(dirname(destination), { recursive: true });
        checkedPath(root, to);
        const content = rewrites.has(to)
          ? Buffer.from(rewrites.get(to) ?? "")
          : candidate.content;
        writeFileSync(destination, content, {
          flag: "wx",
          mode: candidate.mode,
        });
        published.push({ candidate, to, content });
      }
      // Atomic replacement preserves a referring file's mode and never
      // truncates it. Originals remain available until all references commit.
      for (const [name, original] of originals) {
        const path = checkedPath(root, name);
        if (readFileSync(path, "utf8") !== original.content)
          throw new Error(`Reference file changed during migration: ${name}`);
        atomicWriteFileSync(path, rewrites.get(name) ?? original.content, {
          mode: original.mode,
        });
        changedReferences.push(name);
      }
      for (const { candidate } of published) {
        unlinkSync(checkedPath(root, candidate.from));
        deleted.push(candidate);
      }
    } catch (error) {
      const failures: string[] = [];
      // Restore deleted originals before withdrawing any canonical copy.
      for (const candidate of deleted) {
        try {
          writeFileSync(checkedPath(root, candidate.from), candidate.content, {
            flag: "wx",
            mode: candidate.mode,
          });
        } catch (restoreError) {
          failures.push(
            `Original could not be restored: ${candidate.from}: ${(restoreError as Error).message}`,
          );
        }
      }
      for (const name of changedReferences.reverse()) {
        const original = originals.get(name);
        if (!original) continue;
        try {
          const path = checkedPath(root, name);
          if (readFileSync(path, "utf8") !== rewrites.get(name))
            throw new Error("Reference file changed concurrently");
          atomicWriteFileSync(path, original.content, { mode: original.mode });
        } catch (restoreError) {
          failures.push(
            `Reference could not be restored: ${name}: ${(restoreError as Error).message}`,
          );
        }
      }
      // If rollback cannot restore an original/reference, retain canonical
      // copies as recovery material instead of risking the only surviving file.
      if (failures.length === 0) {
        for (const { to, content } of published.reverse()) {
          try {
            const path = checkedPath(root, to);
            if (!readFileSync(path).equals(content))
              throw new Error("Destination changed concurrently");
            unlinkSync(path);
          } catch (restoreError) {
            failures.push(
              `Canonical copy retained: ${to}: ${(restoreError as Error).message}`,
            );
          }
        }
      }
      const reason = `Migration deferred; ${(error as Error).message}${failures.length ? `; ${failures.join("; ")}` : "; original files and references restored"}`;
      for (const candidate of candidates)
        if (moves.has(candidate.from)) skip(candidate.from, reason);
      for (const item of report.skipped)
        report.actions.push(`deferred ${item.path}: ${item.reason}`);
      return report;
    }
  }
  for (const [from, to] of moves) {
    report.moved.push({ from, to });
    report.actions.push(`moved ${from} → ${to}`);
  }
  for (const name of rewrites.keys()) {
    report.rewritten.push(name);
    report.actions.push(`updated references in ${name}`);
  }
  for (const item of report.skipped)
    report.actions.push(`deferred ${item.path}: ${item.reason}`);
  return report;
}
