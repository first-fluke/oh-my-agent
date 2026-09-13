import {
  chmodSync,
  existsSync,
  lstatSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, relative, resolve, sep } from "node:path";
import { z } from "zod";
import { sha256Hex } from "../../utils/hash.js";
import { resolveInside } from "./paths.js";
import { FIXTURE_HARNESS_CONTROLS } from "./suite.js";
import type { HarnessTask } from "./types.js";

export function harnessTaskInputHash(
  task: Pick<HarnessTask, "id" | "prompt" | "incident">,
): string {
  return sha256Hex(
    JSON.stringify({
      id: task.id,
      prompt: task.prompt,
      incident: task.incident,
    }),
  );
}
const MAX_FILE_BYTES = 5 * 1024 * 1024;
const MAX_SNAPSHOT_BYTES = 32 * 1024 * 1024;
const MAX_ENTRIES = 2000;
const secretName =
  /^(?:\.env(?:\..*)?|credentials(?:\..*)?|secrets?(?:\..*)?|id_rsa.*|id_ed25519.*|\.npmrc|\.pypirc|\.netrc)$|\.(?:pem|key|p12|pfx|keystore)$/i;
export const harnessSnapshotSchema = z.object({
  schemaVersion: z.literal(1),
  digest: z.string(),
  complete: z.boolean(),
  entries: z
    .array(
      z.object({
        path: z.string(),
        kind: z.enum(["file", "directory"]),
        contentBase64: z.string().optional(),
        sha256: z.string().optional(),
        mode: z.number().int().min(0).max(0o777).optional(),
      }),
    )
    .max(MAX_ENTRIES),
  omissions: z.array(z.object({ path: z.string(), reason: z.string() })),
  excludedPaths: z.array(z.string()),
});
export type HarnessWorkspaceSnapshot = z.infer<typeof harnessSnapshotSchema>;
function snapshotDigest(
  snapshot: Omit<HarnessWorkspaceSnapshot, "digest">,
): string {
  return sha256Hex(
    JSON.stringify({
      schemaVersion: snapshot.schemaVersion,
      complete: snapshot.complete,
      entries: snapshot.entries.map((entry) => ({
        path: entry.path,
        kind: entry.kind,
        ...(entry.contentBase64 === undefined
          ? {}
          : { contentBase64: entry.contentBase64 }),
        ...(entry.sha256 === undefined ? {} : { sha256: entry.sha256 }),
        ...(entry.mode === undefined ? {} : { mode: entry.mode }),
      })),
      omissions: snapshot.omissions.map(({ path, reason }) => ({
        path,
        reason,
      })),
      excludedPaths: snapshot.excludedPaths,
    }),
  );
}
/** Capture bounded task files; unsupported evidence is explicit. */
export function captureHarnessSnapshot(
  root: string,
  options: { strict?: boolean; excludeHarnessControls?: boolean } = {},
): HarnessWorkspaceSnapshot {
  const entries: HarnessWorkspaceSnapshot["entries"] = [];
  const omissions: HarnessWorkspaceSnapshot["omissions"] = [];
  const excludedPaths =
    options.excludeHarnessControls === false
      ? []
      : [...FIXTURE_HARNESS_CONTROLS];
  let bytes = 0;
  let visited = 0;
  const omitted = (path: string, reason: string) => {
    if (omissions.length < MAX_ENTRIES) omissions.push({ path, reason });
  };
  const visit = (absolute: string): void => {
    const path = relative(root, absolute).split(sep).join("/");
    if (++visited > MAX_ENTRIES) {
      omitted(path, "Snapshot entry limit exceeded");
      return;
    }
    if (
      path &&
      excludedPaths.some((item) => path === item || path.startsWith(`${item}/`))
    )
      return;
    if (
      path &&
      FIXTURE_HARNESS_CONTROLS.some(
        (item) => path === item || path.startsWith(`${item}/`),
      )
    ) {
      omitted(path, "Harness controls are not task evidence");
      return;
    }
    if (path?.split("/").some((part) => secretName.test(part))) {
      omitted(path, "Secret-bearing path cannot be captured");
      return;
    }
    if (entries.length >= MAX_ENTRIES) {
      omitted(path, "Snapshot entry limit exceeded");
      return;
    }
    try {
      const stat = lstatSync(absolute);
      if (!path && !stat.isDirectory()) {
        omitted(path, "Workspace root must be a regular directory");
        return;
      }
      if (stat.isSymbolicLink()) {
        omitted(path, "Symbolic links cannot be captured");
        return;
      }
      if (stat.isDirectory()) {
        if (path)
          entries.push({ path, kind: "directory", mode: stat.mode & 0o777 });
        for (const name of readdirSync(absolute).sort()) {
          visit(join(absolute, name));
          if (visited > MAX_ENTRIES) break;
        }
      } else if (stat.isFile()) {
        if (
          stat.size > MAX_FILE_BYTES ||
          bytes + stat.size > MAX_SNAPSHOT_BYTES
        ) {
          omitted(path, "Snapshot byte limit exceeded");
          return;
        }
        const content = readFileSync(absolute);
        bytes += content.byteLength;
        entries.push({
          path,
          kind: "file",
          contentBase64: content.toString("base64"),
          sha256: sha256Hex(content),
          mode: stat.mode & 0o777,
        });
      } else
        omitted(path, "Only regular files and directories can be captured");
    } catch (error) {
      omitted(path, error instanceof Error ? error.message : String(error));
    }
  };
  visit(root);
  const snapshot = {
    schemaVersion: 1 as const,
    complete: omissions.length === 0,
    entries,
    omissions,
    excludedPaths,
  };
  if (options.strict && !snapshot.complete)
    throw new Error(
      "Initial workspace cannot be pinned: " +
        omissions.map((item) => `${item.path}: ${item.reason}`).join("; "),
    );
  return { ...snapshot, digest: snapshotDigest(snapshot) };
}
/** Validate bytes and paths without consulting recorded verdicts. */
export function validateHarnessSnapshot(
  value: unknown,
): HarnessWorkspaceSnapshot {
  const snapshot = harnessSnapshotSchema.parse(value);
  if (snapshot.digest !== snapshotDigest(snapshot))
    throw new Error("Snapshot manifest digest mismatch");
  if (
    snapshot.excludedPaths.some(
      (path) => !FIXTURE_HARNESS_CONTROLS.includes(path),
    )
  )
    throw new Error("Snapshot excludes unrecognized task paths");
  const seen = new Set<string>();
  let bytes = 0;
  for (const entry of snapshot.entries) {
    if (
      !entry.path ||
      entry.path.includes("\\") ||
      entry.path
        .split("/")
        .some((part) => !part || part === "." || part === "..") ||
      entry.path.startsWith("/") ||
      seen.has(entry.path)
    )
      throw new Error("Invalid or duplicate snapshot path");
    if (
      entry.path.split("/").some((part) => secretName.test(part)) ||
      FIXTURE_HARNESS_CONTROLS.some(
        (item) => entry.path === item || entry.path.startsWith(`${item}/`),
      )
    )
      throw new Error("Snapshot contains a protected path");
    seen.add(entry.path);
    if (entry.kind === "file") {
      if (entry.contentBase64 === undefined || entry.sha256 === undefined)
        throw new Error("Snapshot file bytes are missing");
      const content = Buffer.from(entry.contentBase64, "base64");
      if (
        content.toString("base64") !== entry.contentBase64 ||
        sha256Hex(content) !== entry.sha256
      )
        throw new Error("Snapshot file hash mismatch");
      bytes += content.byteLength;
      if (content.byteLength > MAX_FILE_BYTES || bytes > MAX_SNAPSHOT_BYTES)
        throw new Error("Snapshot byte limit exceeded");
    }
  }
  if (snapshot.complete && snapshot.omissions.length > 0)
    throw new Error("Snapshot completeness contradicts omissions");
  return snapshot;
}
/** Materialize complete evidence only, into an empty runner-owned destination. */
export function materializeHarnessSnapshot(
  value: HarnessWorkspaceSnapshot,
  target: string,
): void {
  const snapshot = validateHarnessSnapshot(value);
  if (!snapshot.complete) throw new Error("Snapshot evidence is incomplete");
  // The OS temp root may itself use a system alias. Reject caller-controlled
  // symlinks in the destination and every ancestor below that trusted root.
  let ancestor = resolve(target);
  const temporaryRoot = resolve(tmpdir());
  while (ancestor !== dirname(ancestor)) {
    if (existsSync(ancestor) && lstatSync(ancestor).isSymbolicLink())
      throw new Error("Snapshot destination cannot contain symbolic links");
    if (ancestor === temporaryRoot) break;
    ancestor = dirname(ancestor);
  }
  mkdirSync(target, { recursive: true });
  if (readdirSync(target).length > 0)
    throw new Error("Snapshot destination must be empty");
  for (const entry of snapshot.entries) {
    const absolute = resolveInside(target, entry.path, "Snapshot artifact");
    if (entry.kind === "directory") mkdirSync(absolute, { recursive: true });
    else {
      mkdirSync(dirname(absolute), { recursive: true });
      writeFileSync(
        absolute,
        Buffer.from(entry.contentBase64 ?? "", "base64"),
        { flag: "wx", mode: entry.mode ?? 0o600 },
      );
      chmodSync(absolute, entry.mode ?? 0o600);
    }
  }
  // Apply restrictive directory modes after writing their children.
  for (const entry of [...snapshot.entries].reverse()) {
    if (entry.kind === "directory" && entry.mode !== undefined)
      chmodSync(
        resolveInside(target, entry.path, "Snapshot directory"),
        entry.mode,
      );
  }
}
