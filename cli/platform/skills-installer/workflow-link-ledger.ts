import { createHash } from "node:crypto";
import * as fs from "node:fs";
import { join, resolve } from "node:path";
import { atomicWriteFileSync } from "../../utils/safe-write.js";
import type { LinkMechanism } from "../fs-link.js";

/**
 * Ownership evidence for workflow links that are NOT symlinks.
 *
 * On Windows without symlink privileges `createLink` falls back to a hardlink
 * (or a copy across volumes). A symlink proves oma ownership by pointing into
 * `.agents/workflows/`; a regular file proves nothing, so without this ledger
 * re-installs reported "real file exists", stale links were never pruned, and a
 * hardlink orphaned by a rewritten workflow file was never refreshed.
 *
 * Ownership of a regular file is granted only when it is provably oma's:
 *   - it is the same file (dev + ino) as a workflow source — a hardlink a user
 *     cannot create by accident; or
 *   - the ledger recorded it and its content is still byte-identical to what
 *     oma wrote (a user edit to a copy forfeits ownership).
 * POSIX installs always get symlinks, so they never write this file.
 */
export const WORKFLOW_LINK_LEDGER_PATH = ".agents/state/workflow-links.json";

type FallbackMechanism = Exclude<LinkMechanism, "symlink" | "junction">;

interface LedgerEntry {
  source: string;
  mechanism: FallbackMechanism;
  sha256: string;
}

function hashFile(path: string): string | undefined {
  try {
    return createHash("sha256").update(fs.readFileSync(path)).digest("hex");
  } catch {
    return undefined;
  }
}

/** Same underlying file (hardlink). bigint: win32 file IDs exceed 2^53. */
export function isSameFile(a: string, b: string): boolean {
  try {
    const left = fs.statSync(a, { bigint: true });
    const right = fs.statSync(b, { bigint: true });
    return left.dev === right.dev && left.ino === right.ino && left.ino !== 0n;
  } catch {
    return false;
  }
}

function isFallbackMechanism(value: unknown): value is FallbackMechanism {
  return value === "hardlink" || value === "copy";
}

export class WorkflowLinkLedger {
  private readonly path: string;
  private readonly entries = new Map<string, LedgerEntry>();
  private dirty = false;

  constructor(installRoot: string) {
    this.path = join(installRoot, WORKFLOW_LINK_LEDGER_PATH);
    try {
      const value = JSON.parse(fs.readFileSync(this.path, "utf8"));
      if (value?.schemaVersion !== 1 || typeof value.links !== "object") return;
      for (const [link, entry] of Object.entries(value.links ?? {})) {
        const e = entry as Partial<LedgerEntry>;
        if (
          typeof e.source === "string" &&
          typeof e.sha256 === "string" &&
          isFallbackMechanism(e.mechanism)
        ) {
          this.entries.set(link, {
            source: e.source,
            mechanism: e.mechanism,
            sha256: e.sha256,
          });
        }
      }
    } catch {
      /* Missing or malformed ledger never grants ownership. */
    }
  }

  private key(linkPath: string): string {
    return resolve(linkPath);
  }

  /**
   * True when `linkPath` (a regular file) is an oma-created fallback link.
   * `source` is the workflow it should mirror, when that is known.
   */
  owns(linkPath: string, source?: string): boolean {
    if (source && isSameFile(linkPath, source)) return true;
    const entry = this.entries.get(this.key(linkPath));
    if (!entry) return false;
    return (
      isSameFile(linkPath, entry.source) || hashFile(linkPath) === entry.sha256
    );
  }

  /** The fallback link still mirrors `source` and needs no rewrite. */
  isCurrent(linkPath: string, source: string): boolean {
    if (isSameFile(linkPath, source)) return true;
    const entry = this.entries.get(this.key(linkPath));
    if (entry?.mechanism !== "copy" || !this.owns(linkPath)) return false;
    const current = hashFile(source);
    return current !== undefined && hashFile(linkPath) === current;
  }

  record(linkPath: string, source: string, mechanism: LinkMechanism): void {
    const key = this.key(linkPath);
    if (!isFallbackMechanism(mechanism)) {
      if (this.entries.delete(key)) this.dirty = true;
      return;
    }
    const sha256 = hashFile(linkPath);
    if (!sha256) return;
    this.entries.set(key, { source: resolve(source), mechanism, sha256 });
    this.dirty = true;
  }

  forget(linkPath: string): void {
    if (this.entries.delete(this.key(linkPath))) this.dirty = true;
  }

  save(): void {
    if (!this.dirty) return;
    const links = Object.fromEntries(
      [...this.entries].sort(([a], [b]) => a.localeCompare(b)),
    );
    atomicWriteFileSync(
      this.path,
      `${JSON.stringify({ schemaVersion: 1, links }, null, 2)}\n`,
    );
    this.dirty = false;
  }
}
