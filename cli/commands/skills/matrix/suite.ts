import { createHash, randomBytes } from "node:crypto";
import {
  closeSync,
  constants,
  fstatSync,
  lstatSync,
  mkdirSync,
  openSync,
  readdirSync,
  readSync,
  realpathSync,
  writeFileSync,
} from "node:fs";
import path from "node:path";
import { parseDocument } from "yaml";
import { builtinMatrixSuite, MATRIX_CANARY } from "./probes.js";
import { parseMatrixJson } from "./suite-json.js";
import type {
  MatrixCase,
  MatrixSuite,
  MatrixVendor,
  PreparedMatrixCase,
} from "./types.js";

export { MATRIX_CANARY } from "./probes.js";

export const MATRIX_SUITE_LIMITS = {
  bytes: 1024 * 1024,
  cases: 32,
  files: 32,
  fileBytes: 128 * 1024,
  depth: 12,
  pathDepth: 8,
} as const;

const CASE_KEYS = [
  "id",
  "skill",
  "prompt",
  "files",
  "references",
  "missing",
  "expected",
  "canary",
];
const HOST_CONTROL = new Set([
  "agents.md",
  "claude.md",
  "gemini.md",
  "codex.md",
  "settings.json",
  "settings.local.json",
  "mcp.json",
]);

function fail(message: string): never {
  throw new Error(`Invalid matrix suite: ${message}`);
}

function object(value: unknown, label: string): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value))
    fail(`${label} must be an object`);
  return value as Record<string, unknown>;
}

function keys(
  value: Record<string, unknown>,
  allowed: string[],
  label: string,
) {
  if (Object.keys(value).some((key) => !allowed.includes(key)))
    fail(`${label} contains an unknown field`);
}

function text(value: unknown, label: string, maxBytes = 16 * 1024): string {
  if (typeof value !== "string" || !value.trim())
    fail(`${label} must be a nonempty string`);
  if (Buffer.byteLength(value, "utf8") > maxBytes)
    fail(`${label} exceeds its byte limit`);
  return value;
}

function checkJsonDepth(value: unknown, depth = 0): void {
  if (depth > MATRIX_SUITE_LIMITS.depth) fail("JSON exceeds its depth limit");
  if (value === null || typeof value === "string" || typeof value === "boolean")
    return;
  if (typeof value === "number" && Number.isFinite(value)) return;
  if (typeof value !== "object") fail("expected values must be JSON values");
  for (const child of Object.values(value)) checkJsonDepth(child, depth + 1);
}

function fixturePath(value: unknown, label: string): string {
  const file = text(value, label, 240);
  const segments = file.split("/");
  if (
    path.posix.isAbsolute(file) ||
    /[\p{Cc}\p{Cf}\\<>:"|?*]/u.test(file) ||
    segments.length > MATRIX_SUITE_LIMITS.pathDepth ||
    Buffer.from(file, "utf8").toString("utf8") !== file ||
    file.normalize("NFC") !== file ||
    segments.some(
      (segment) =>
        !segment ||
        segment.startsWith(".") ||
        /[. ]$/.test(segment) ||
        HOST_CONTROL.has(segment.toLowerCase()) ||
        /^(con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\.|$)/i.test(segment),
    )
  )
    fail(`${label} must be a safe relative POSIX skill path`);
  return file;
}

function pathList(value: unknown, label: string): string[] {
  if (value === undefined) return [];
  if (!Array.isArray(value) || value.length > MATRIX_SUITE_LIMITS.files)
    fail(`${label} must be a bounded array`);
  const paths = value.map((file) => fixturePath(file, label));
  if (new Set(paths.map((file) => file.toLowerCase())).size !== paths.length)
    fail(`${label} contains duplicate paths`);
  return paths;
}

function checkCollisions(files: string[]): void {
  const entries = files.map((file) => file.toLowerCase());
  if (new Set(entries).size !== entries.length)
    fail("skill paths collide as files or directories");
  for (const file of entries) {
    if (entries.some((other) => other.startsWith(`${file}/`)))
      fail("skill paths collide as files or directories");
  }
}

function checkFrontmatter(source: string, skill: string): void {
  const match = /^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/.exec(source);
  if (!match?.[1]) fail("SKILL.md requires YAML frontmatter");
  const document = parseDocument(match[1], { uniqueKeys: true });
  if (document.errors.length) fail("SKILL.md frontmatter is invalid");
  let data: unknown;
  try {
    data = document.toJS({ maxAliasCount: 0 });
  } catch {
    fail("SKILL.md frontmatter cannot contain aliases");
  }
  const frontmatter = object(data, "frontmatter");
  if (frontmatter.name !== skill)
    fail("SKILL.md frontmatter name must match the skill");
  text(frontmatter.description, "frontmatter.description", 4 * 1024);
}

function checkCanary(testCase: MatrixCase): void {
  const occurrences = (value: string) => value.split(MATRIX_CANARY).length - 1;
  if (testCase.canary === undefined) {
    if (JSON.stringify(testCase).includes(MATRIX_CANARY))
      fail("canary placeholders require a canary specification");
    return;
  }
  const canary = object(testCase.canary, "canary");
  keys(canary, ["file", "field"], "canary");
  const file = fixturePath(canary.file, "canary.file");
  const field = text(canary.field, "canary.field", 80);
  if (!Object.hasOwn(testCase.files, file))
    fail("canary file is not installed");
  if (testCase.expected[field] !== MATRIX_CANARY)
    fail("canary field must be a top-level expected placeholder");
  if (occurrences(testCase.files[file] ?? "") !== 1)
    fail("canary file must contain exactly one placeholder");
  if (
    Object.entries(testCase.files).some(
      ([name, body]) => name !== file && occurrences(body) > 0,
    ) ||
    occurrences(JSON.stringify(testCase)) !== 2
  )
    fail("canary placeholder must occur only in its file and expected field");
}

function checkCase(value: unknown): MatrixCase {
  const entry = object(value, "case");
  keys(entry, CASE_KEYS, "case");
  const id = text(entry.id, "case.id", 64);
  const skill = text(entry.skill, "case.skill", 64);
  if (!/^[a-z0-9][a-z0-9._-]*$/.test(id)) fail("case.id is invalid");
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(skill)) fail("case.skill is invalid");
  text(entry.prompt, "case.prompt");
  const files = object(entry.files, "case.files");
  if (!Object.hasOwn(files, "SKILL.md")) fail("case.files requires SKILL.md");
  if (Object.keys(files).length > MATRIX_SUITE_LIMITS.files)
    fail("too many skill files");
  for (const [name, body] of Object.entries(files)) {
    fixturePath(name, "file path");
    if (
      typeof body !== "string" ||
      Buffer.byteLength(body, "utf8") > MATRIX_SUITE_LIMITS.fileBytes ||
      Buffer.from(body, "utf8").toString("utf8") !== body
    )
      fail("skill file content must be a bounded string");
  }
  const references = pathList(entry.references, "references");
  const missing = pathList(entry.missing, "missing");
  checkCollisions([...Object.keys(files), ...missing]);
  if (references.some((file) => !Object.hasOwn(files, file)))
    fail("required references must be installed files");
  object(entry.expected, "case.expected");
  checkFrontmatter(files["SKILL.md"] as string, skill);
  const testCase = entry as unknown as MatrixCase;
  checkCanary(testCase);
  return testCase;
}

function validateSuite(value: unknown): MatrixSuite {
  checkJsonDepth(value);
  const suite = object(value, "suite");
  keys(suite, ["schemaVersion", "cases"], "suite");
  if (suite.schemaVersion !== 1) fail("schemaVersion must be 1");
  if (
    !Array.isArray(suite.cases) ||
    !suite.cases.length ||
    suite.cases.length > MATRIX_SUITE_LIMITS.cases
  )
    fail("cases must be a nonempty bounded array");
  const cases = suite.cases.map(checkCase);
  for (const field of ["id", "skill"] as const) {
    if (new Set(cases.map((entry) => entry[field])).size !== cases.length)
      fail(`cases must have unique ${field} values`);
  }
  if (
    Buffer.byteLength(JSON.stringify(value), "utf8") > MATRIX_SUITE_LIMITS.bytes
  )
    fail("suite exceeds its byte limit");
  return suite as unknown as MatrixSuite;
}

export function loadMatrixSuite(file?: string): MatrixSuite {
  if (!file) return validateSuite(builtinMatrixSuite());
  const descriptor = openSync(
    file,
    constants.O_RDONLY | constants.O_NOFOLLOW | constants.O_NONBLOCK,
  );
  try {
    const source = readBoundedFile(descriptor, MATRIX_SUITE_LIMITS.bytes);
    let parsed: unknown;
    try {
      parsed = parseMatrixJson(source);
    } catch {
      fail("suite file is not valid JSON");
    }
    return validateSuite(parsed);
  } finally {
    closeSync(descriptor);
  }
}

function readBoundedFile(descriptor: number, limit: number): string {
  const before = fstatSync(descriptor);
  if (!before.isFile() || before.size > limit)
    fail("file must be a bounded regular file");
  const buffer = Buffer.alloc(before.size + 1);
  let bytes = 0;
  while (bytes < buffer.length) {
    const count = readSync(
      descriptor,
      buffer,
      bytes,
      buffer.length - bytes,
      null,
    );
    if (!count) break;
    bytes += count;
  }
  const after = fstatSync(descriptor);
  if (
    bytes !== before.size ||
    after.size !== before.size ||
    after.mtimeMs !== before.mtimeMs
  )
    fail("file changed while it was being read");
  const content = buffer.subarray(0, bytes).toString("utf8");
  if (!Buffer.from(content, "utf8").equals(buffer.subarray(0, bytes)))
    fail("file must contain valid UTF-8 text");
  return content;
}

function stable(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stable).join(",")}]`;
  if (value && typeof value === "object")
    return `{${Object.keys(value)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${stable(Reflect.get(value, key))}`)
      .join(",")}}`;
  return JSON.stringify(value);
}

function hash(value: unknown): string {
  return createHash("sha256").update(stable(value)).digest("hex");
}

export function matrixSuiteHash(suite: MatrixSuite): string {
  return hash(validateSuite(suite));
}

export function preparedMatrixFiles(
  prepared: Pick<PreparedMatrixCase, "testCase" | "canary">,
): Record<string, string> {
  const files = { ...prepared.testCase.files };
  if (prepared.canary) {
    const source = files[prepared.canary.file];
    if (source === undefined) throw new Error("Missing prepared canary file");
    files[prepared.canary.file] = source.replace(
      MATRIX_CANARY,
      prepared.canary.value,
    );
  }
  return files;
}

export function matrixFixtureHash(files: Record<string, string>): string {
  return hash(files);
}

/** Reject links and non-regular files instead of following anything outside the tree. */
export function matrixInstalledTreeHash(skillRoot: string): string {
  const files = Object.create(null) as Record<string, string>;
  let ancestor = path.parse(skillRoot).root;
  for (const segment of path.relative(ancestor, skillRoot).split(path.sep)) {
    ancestor = path.join(ancestor, segment);
    const stat = lstatSync(ancestor);
    if (!stat.isDirectory() || stat.isSymbolicLink())
      throw new Error("Skill tree ancestor changed");
  }
  const visit = (directory: string, prefix: string, depth: number): void => {
    if (depth > MATRIX_SUITE_LIMITS.pathDepth)
      throw new Error("Skill tree depth");
    const stat = lstatSync(directory);
    if (!stat.isDirectory() || stat.isSymbolicLink())
      throw new Error("Skill tree directory changed");
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      const absolute = path.join(directory, entry.name);
      const relative = prefix ? `${prefix}/${entry.name}` : entry.name;
      if (entry.isDirectory()) visit(absolute, relative, depth + 1);
      else {
        if (!entry.isFile()) throw new Error("Skill tree contains a non-file");
        const descriptor = openSync(
          absolute,
          constants.O_RDONLY | constants.O_NOFOLLOW | constants.O_NONBLOCK,
        );
        try {
          if (Object.keys(files).length >= MATRIX_SUITE_LIMITS.files)
            throw new Error("Skill tree file changed");
          files[relative] = readBoundedFile(
            descriptor,
            MATRIX_SUITE_LIMITS.fileBytes,
          );
        } finally {
          closeSync(descriptor);
        }
      }
    }
  };
  visit(skillRoot, "", 0);
  return matrixFixtureHash(files);
}

function ensureDirectory(directory: string): void {
  try {
    mkdirSync(directory);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "EEXIST") throw error;
  }
  const stat = lstatSync(directory);
  if (!stat.isDirectory() || stat.isSymbolicLink())
    throw new Error("Matrix installation path contains a link or file");
}

export function prepareMatrixCase(
  testCase: MatrixCase,
  workspace: string,
  vendor: MatrixVendor,
): PreparedMatrixCase {
  validateSuite({ schemaVersion: 1, cases: [testCase] });
  if (vendor !== "claude" && vendor !== "codex")
    throw new Error("Unsupported matrix vendor");
  const stat = lstatSync(workspace);
  if (!stat.isDirectory() || stat.isSymbolicLink())
    throw new Error("Matrix workspace must be a regular directory");
  const canonicalWorkspace = realpathSync(workspace);
  const vendorRoot = path.join(
    canonicalWorkspace,
    vendor === "claude" ? ".claude" : ".agents",
  );
  ensureDirectory(vendorRoot);
  ensureDirectory(path.join(vendorRoot, "skills"));
  const skillRoot = path.join(vendorRoot, "skills", testCase.skill);
  mkdirSync(skillRoot);
  const prepared: PreparedMatrixCase = {
    testCase: structuredClone(testCase),
    workspace: canonicalWorkspace,
    skillRoot,
    contentHash: matrixFixtureHash(testCase.files),
    ...(testCase.canary
      ? {
          canary: {
            ...testCase.canary,
            value: randomBytes(24).toString("hex"),
          },
        }
      : {}),
  };
  for (const [file, body] of Object.entries(preparedMatrixFiles(prepared))) {
    let directory = skillRoot;
    const segments = file.split("/");
    for (const segment of segments.slice(0, -1)) {
      directory = path.join(directory, segment);
      ensureDirectory(directory);
    }
    writeFileSync(path.join(skillRoot, file), body, {
      flag: "wx",
      mode: 0o600,
    });
  }
  return prepared;
}
