import {
  closeSync,
  constants,
  type Dirent,
  fstatSync,
  lstatSync,
  opendirSync,
  openSync,
  readSync,
  type Stats,
} from "node:fs";
import path from "node:path";

export const INSTALLED_MATRIX_LIMITS = {
  skills: 32,
  files: 2048,
  entries: 4096,
  bytes: 8 * 1024 * 1024,
  fileBytes: 128 * 1024,
  depth: 12,
} as const;

const CONTROL_NAMES = new Set([
  "agents.md",
  "claude.md",
  "gemini.md",
  "codex.md",
  "settings.json",
  "settings.local.json",
  "mcp.json",
  "auth.json",
  "credentials",
  "credentials.json",
  "credentials.yaml",
  "credentials.yml",
  "secrets.json",
  "secrets.yaml",
  "secrets.yml",
  "id_rsa",
  "id_ed25519",
]);

export function bundleFailure(message: string): never {
  throw new Error(`Invalid installed matrix bundle: ${message}`);
}

export function validateBundlePath(file: string): void {
  // These existing OMA protocol documents are resources, not host entry files.
  const protocolDocument =
    /^_shared\/runtime\/execution-protocols\/(?:claude|codex)\.md$/.test(file);
  if (
    !file ||
    Buffer.byteLength(file) > 512 ||
    path.posix.isAbsolute(file) ||
    file.normalize("NFC") !== file ||
    Buffer.from(file, "utf8").toString("utf8") !== file ||
    /[\p{Cc}\p{Cf}\\<>:"|?*]/u.test(file) ||
    file
      .split("/")
      .some(
        (segment) =>
          !segment ||
          segment.startsWith(".") ||
          /[. ]$/.test(segment) ||
          (CONTROL_NAMES.has(segment.toLowerCase()) && !protocolDocument) ||
          (/^(?:credentials?|secrets?|tokens?)(?:[._-]|$)/i.test(segment) &&
            !segment.toLowerCase().endsWith(".md")) ||
          /\.(?:pem|key|p12|pfx|keystore)$/i.test(segment) ||
          /^(con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\.|$)/i.test(segment),
      )
  )
    bundleFailure(
      `unsafe, credential or host-control path ${containsCredential(file) ? '"[redacted]"' : JSON.stringify(file.slice(0, 240))}`,
    );
}

function containsCredential(content: string): boolean {
  return (
    /-----BEGIN (?:[A-Z0-9]+ )*PRIVATE KEY-----/.test(content) ||
    /\b(?:AKIA|ASIA)[A-Z0-9]{16}\b/.test(content) ||
    /\b(?:gh[pousr]_[A-Za-z0-9]{30,}|github_pat_[A-Za-z0-9_]{40,})\b/.test(
      content,
    ) ||
    /\bsk-(?:proj-|ant-api\d\d-)?[A-Za-z0-9_-]{24,}\b/.test(content) ||
    /\bxox[baprs]-[0-9A-Za-z-]{24,}\b/.test(content)
  );
}

function fingerprint(stat: Stats): string {
  return [
    stat.dev,
    stat.ino,
    stat.mode,
    stat.size,
    stat.mtimeMs,
    stat.ctimeMs,
  ].join(":");
}

export function regularBundleDirectory(directory: string): void {
  const stat = lstatSync(directory);
  if (!stat.isDirectory() || stat.isSymbolicLink())
    bundleFailure(
      "a source or installation directory is a link or non-directory",
    );
}

function directoryEntries(directory: string): Dirent[] {
  const handle = opendirSync(directory);
  const entries: Dirent[] = [];
  try {
    for (;;) {
      const entry = handle.readSync();
      if (!entry) break;
      if (entries.length >= INSTALLED_MATRIX_LIMITS.entries)
        bundleFailure("directory entry limit exceeded");
      entries.push(entry);
    }
  } finally {
    handle.closeSync();
  }
  return entries.sort((a, b) => a.name.localeCompare(b.name, "en"));
}

/** Collection stamps let the caller reject changes across the whole snapshot. */
export class BundleCollector {
  readonly files = Object.create(null) as Record<string, string>;
  private readonly stamps = new Map<
    string,
    { stamp: string; entries?: string[] }
  >();
  private readonly folded = new Map<string, string>();
  private bytes = 0;

  constructor(readonly root: string) {}

  trackDirectory(absolute: string): Dirent[] {
    regularBundleDirectory(absolute);
    const before = fingerprint(lstatSync(absolute));
    const entries = directoryEntries(absolute);
    const stamp = fingerprint(lstatSync(absolute));
    const names = entries.map((entry) => entry.name).sort();
    const existing = this.stamps.get(absolute);
    if (
      before !== stamp ||
      (existing &&
        (existing.stamp !== stamp ||
          JSON.stringify(existing.entries) !== JSON.stringify(names)))
    )
      bundleFailure("source directory changed during collection");
    if (!existing) this.stamps.set(absolute, { stamp, entries: names });
    return entries;
  }

  collectTree(relative: string): Record<string, string> {
    validateBundlePath(relative);
    const selected = Object.create(null) as Record<string, string>;
    const visit = (prefix: string, depth: number): void => {
      if (depth > INSTALLED_MATRIX_LIMITS.depth)
        bundleFailure("directory depth limit exceeded");
      const absolute = path.join(this.root, prefix);
      for (const entry of this.trackDirectory(absolute)) {
        const file = `${prefix}/${entry.name}`;
        validateBundlePath(file);
        const folded = file.toLowerCase();
        const previous = this.folded.get(folded);
        if (previous !== undefined && previous !== file)
          bundleFailure("case-insensitive path collision");
        this.folded.set(folded, file);
        if (entry.isDirectory()) visit(file, depth + 1);
        else {
          if (!entry.isFile())
            bundleFailure("links and special files are forbidden");
          if (!Object.hasOwn(this.files, file)) {
            if (Object.keys(this.files).length >= INSTALLED_MATRIX_LIMITS.files)
              bundleFailure("file count limit exceeded");
            this.files[file] = this.readFile(path.join(this.root, file));
            this.bytes += Buffer.byteLength(this.files[file] ?? "");
            if (this.bytes > INSTALLED_MATRIX_LIMITS.bytes)
              bundleFailure("total byte limit exceeded");
          }
          selected[file] = this.files[file] ?? "";
        }
      }
    };
    visit(relative, 0);
    return selected;
  }

  collectRoot(): Record<string, string> {
    for (const entry of this.trackDirectory(this.root)) {
      validateBundlePath(entry.name);
      if (!entry.isDirectory())
        bundleFailure("protected skills root contains a non-directory");
      this.collectTree(entry.name);
    }
    return this.files;
  }

  assertUnchanged(): void {
    for (const [absolute, recorded] of this.stamps) {
      const stat = lstatSync(absolute);
      if (stat.isSymbolicLink() || fingerprint(stat) !== recorded.stamp)
        bundleFailure("source changed during collection");
      if (recorded.entries) {
        const current = directoryEntries(absolute)
          .map((entry) => entry.name)
          .sort();
        if (JSON.stringify(current) !== JSON.stringify(recorded.entries))
          bundleFailure("source directory changed during collection");
      }
    }
  }

  private readFile(absolute: string): string {
    const descriptor = openSync(
      absolute,
      constants.O_RDONLY | constants.O_NOFOLLOW | constants.O_NONBLOCK,
    );
    try {
      const before = fstatSync(descriptor);
      if (!before.isFile() || before.size > INSTALLED_MATRIX_LIMITS.fileBytes)
        bundleFailure("file is not a bounded regular file");
      const data = Buffer.alloc(before.size + 1);
      let bytes = 0;
      while (bytes < data.length) {
        const count = readSync(
          descriptor,
          data,
          bytes,
          data.length - bytes,
          null,
        );
        if (!count) break;
        bytes += count;
      }
      const after = fstatSync(descriptor);
      if (bytes !== before.size || fingerprint(before) !== fingerprint(after))
        bundleFailure("file changed while being read");
      const content = data.subarray(0, bytes).toString("utf8");
      if (!Buffer.from(content).equals(data.subarray(0, bytes)))
        bundleFailure("files must contain valid UTF-8 text");
      if (containsCredential(content))
        bundleFailure("credential material is forbidden");
      this.stamps.set(absolute, { stamp: fingerprint(after) });
      return content;
    } finally {
      closeSync(descriptor);
    }
  }
}
