/**
 * Managed third-party skill install — "always the latest".
 *
 * Some oma features wrap an upstream agent skill that ships as a GitHub repo
 * (archify, last30days). Instead of depending on whatever copy a user once
 * installed with `npx skills add`, oma keeps its own copy under
 * `~/.cache/oma-<id>/<pkg>/<ref>/` and refreshes it before use:
 *
 *   stable  → latest GitHub Release tag   (default)
 *   main    → HEAD of the default branch  (dev builds)
 *
 * The source tarball is used (these skills have no install step), extracted
 * with the system `tar`, and stored per ref so an in-flight run never sees a
 * half-written directory. `state.json` names the active ref; older refs are
 * pruned after a successful switch.
 *
 * Network failures are never fatal: the previously cached ref is reused and
 * the reason is surfaced. Only when nothing is cached does the caller fall
 * through to user-installed copies.
 */
import { execSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { http } from "../io/http.js";

export type ManagedChannel = "stable" | "main";

export interface ManagedSkillSpec {
  /** Short id used for the cache directory (`~/.cache/oma-<id>`). */
  id: string;
  /** `owner/name` on GitHub. */
  repo: string;
  /** Path inside the source tarball (after stripping the top dir) that holds the skill package. */
  packageSubdir: string;
  /** File that must exist under the package dir for the install to count. */
  entryRelative: string;
  /** Read the package version from an extracted package dir. */
  readVersion: (packageDir: string) => string | undefined;
  /** Default branch for the `main` channel. */
  defaultBranch?: string;
}

export interface ManagedState {
  channel: ManagedChannel;
  ref: string;
  version?: string;
  lastCheck: string; // ISO
}

export interface ManagedInstall {
  root: string;
  entry: string;
  ref: string;
  version?: string;
  /** `fresh` = downloaded now, `current` = already latest, `stale` = network failed, cached reused */
  status: "fresh" | "current" | "stale";
  note?: string;
}

export interface RemoteRef {
  ref: string;
  version?: string;
}

export interface ManagedOptions {
  channel: ManagedChannel;
  /** Re-check the remote ref only if the last check is older than this. 0 = always. */
  checkIntervalMin: number;
  /** Ignore the throttle and re-check now. */
  force?: boolean;
  /** Skip network entirely; return cached or undefined. */
  offline?: boolean;
  cacheRoot?: string;
  now?: () => Date;
  /** Injectable for tests. */
  fetchLatestRef?: (channel: ManagedChannel) => Promise<RemoteRef>;
  download?: (ref: string, destDir: string) => Promise<void>;
}

const CONNECT_TIMEOUT_MS = 8_000;
const DOWNLOAD_TIMEOUT_MS = 90_000;

export function defaultManagedCacheRoot(
  spec: Pick<ManagedSkillSpec, "id">,
  home = os.homedir(),
): string {
  return path.join(home, ".cache", `oma-${spec.id}`);
}

function statePath(root: string): string {
  return path.join(root, "state.json");
}

export function readManagedState(root: string): ManagedState | undefined {
  try {
    const raw = JSON.parse(fs.readFileSync(statePath(root), "utf-8"));
    if (raw && typeof raw.ref === "string" && typeof raw.lastCheck === "string")
      return raw as ManagedState;
  } catch {
    /* missing or malformed */
  }
  return undefined;
}

function writeManagedState(root: string, state: ManagedState): void {
  fs.mkdirSync(root, { recursive: true });
  const tmp = `${statePath(root)}.${process.pid}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(state, null, 2));
  fs.renameSync(tmp, statePath(root));
}

export function refDir(root: string, ref: string): string {
  // refs are tags (`v2.15.0`) or short shas — safe as a single path segment
  return path.join(root, ref.replace(/[^A-Za-z0-9._-]/g, "_"));
}

/** Read `version: "x"` from a SKILL.md front matter. */
export function readSkillMdVersion(packageDir: string): string | undefined {
  try {
    const head = fs.readFileSync(path.join(packageDir, "SKILL.md"), "utf-8");
    const m = /^version:\s*["']?([^"'\n]+)["']?\s*$/m.exec(head.slice(0, 4000));
    return m?.[1]?.trim();
  } catch {
    return undefined;
  }
}

/** Read `version` from a package.json. */
export function readPackageJsonVersion(packageDir: string): string | undefined {
  try {
    const pkg = JSON.parse(
      fs.readFileSync(path.join(packageDir, "package.json"), "utf-8"),
    ) as { version?: unknown };
    return typeof pkg.version === "string" ? pkg.version : undefined;
  } catch {
    return undefined;
  }
}

function installAt(
  spec: ManagedSkillSpec,
  root: string,
  ref: string,
  version: string | undefined,
  status: ManagedInstall["status"],
  note?: string,
): ManagedInstall | undefined {
  const dir = refDir(root, ref);
  const entry = path.join(dir, spec.entryRelative);
  if (!fs.existsSync(entry)) return undefined;
  return {
    root: dir,
    entry,
    ref,
    version: version ?? spec.readVersion(dir),
    status,
    note,
  };
}

// ---------------------------------------------------------------------------
// Remote
// ---------------------------------------------------------------------------

export function makeFetchLatestRef(
  spec: ManagedSkillSpec,
): (channel: ManagedChannel) => Promise<RemoteRef> {
  return async (channel) => {
    const headers = { Accept: "application/vnd.github+json" };
    if (channel === "main") {
      const branch = spec.defaultBranch ?? "main";
      const res = await http.get<{ sha: string }>(
        `https://api.github.com/repos/${spec.repo}/commits/${branch}`,
        { headers, timeout: CONNECT_TIMEOUT_MS },
      );
      return { ref: res.data.sha.slice(0, 12) };
    }
    const res = await http.get<{ tag_name: string }>(
      `https://api.github.com/repos/${spec.repo}/releases/latest`,
      { headers, timeout: CONNECT_TIMEOUT_MS },
    );
    const tag = res.data.tag_name;
    return { ref: tag, version: tag.replace(/^v/, "") };
  };
}

/**
 * Download the source tarball for `ref` and place the package subdir at
 * `destDir`.
 */
export function makeDownload(
  spec: ManagedSkillSpec,
): (ref: string, destDir: string) => Promise<void> {
  return async (ref, destDir) => {
    const urls = [
      `https://codeload.github.com/${spec.repo}/tar.gz/${ref}`,
      `https://api.github.com/repos/${spec.repo}/tarball/${ref}`,
    ];
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), `oma-${spec.id}-`));
    try {
      let lastErr: unknown;
      let extracted = false;
      for (const url of urls) {
        try {
          const res = await http.get(url, {
            responseType: "arraybuffer",
            maxRedirects: 5,
            timeout: DOWNLOAD_TIMEOUT_MS,
            headers: { Accept: "application/vnd.github+json" },
          });
          const tarPath = path.join(tmp, "src.tar.gz");
          fs.writeFileSync(tarPath, Buffer.from(res.data));
          execSync(`tar -xzf "${tarPath}" -C "${tmp}" --strip-components=1`, {
            stdio: "pipe",
            timeout: 90_000,
          });
          extracted = true;
          break;
        } catch (err) {
          lastErr = err;
        }
      }
      if (!extracted) {
        throw new Error(
          `${spec.id} download failed: ${lastErr instanceof Error ? lastErr.message : String(lastErr)}`,
        );
      }
      const pkgDir = path.join(tmp, spec.packageSubdir);
      if (!fs.existsSync(path.join(pkgDir, spec.entryRelative))) {
        throw new Error(
          `${spec.id} tarball did not contain ${spec.packageSubdir}/${spec.entryRelative}`,
        );
      }
      fs.mkdirSync(path.dirname(destDir), { recursive: true });
      fs.rmSync(destDir, { recursive: true, force: true });
      // rename is atomic on the same fs; fall back to copy across devices
      try {
        fs.renameSync(pkgDir, destDir);
      } catch {
        fs.cpSync(pkgDir, destDir, { recursive: true });
      }
    } finally {
      fs.rmSync(tmp, { recursive: true, force: true });
    }
  };
}

// ---------------------------------------------------------------------------
// ensureLatest
// ---------------------------------------------------------------------------

function pruneOtherRefs(root: string, keep: string): void {
  const keepDir = refDir(root, keep);
  let entries: fs.Dirent[] = [];
  try {
    entries = fs.readdirSync(root, { withFileTypes: true });
  } catch {
    return;
  }
  for (const e of entries) {
    if (!e.isDirectory()) continue;
    const dir = path.join(root, e.name);
    if (dir === keepDir) continue;
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

/**
 * Return the managed install, refreshing it to the latest remote ref when the
 * throttle allows. Never throws for network reasons.
 */
export async function ensureLatestManagedSkill(
  spec: ManagedSkillSpec,
  opts: ManagedOptions,
): Promise<ManagedInstall | undefined> {
  const root = opts.cacheRoot ?? defaultManagedCacheRoot(spec);
  const now = opts.now ?? (() => new Date());
  const fetchRef = opts.fetchLatestRef ?? makeFetchLatestRef(spec);
  const download = opts.download ?? makeDownload(spec);
  const state = readManagedState(root);
  const cached =
    state && state.channel === opts.channel
      ? installAt(spec, root, state.ref, state.version, "current")
      : undefined;

  if (opts.offline) {
    return cached
      ? { ...cached, status: "stale", note: "offline: using cached copy" }
      : undefined;
  }

  if (cached && !opts.force && opts.checkIntervalMin > 0 && state) {
    const ageMin =
      (now().getTime() - new Date(state.lastCheck).getTime()) / 60_000;
    if (ageMin >= 0 && ageMin < opts.checkIntervalMin) return cached;
  }

  let remote: RemoteRef;
  try {
    remote = await fetchRef(opts.channel);
  } catch (err) {
    const why = err instanceof Error ? err.message : String(err);
    return cached
      ? {
          ...cached,
          status: "stale",
          note: `update check failed (${why}); using cached ${cached.ref}`,
        }
      : undefined;
  }

  const already = installAt(spec, root, remote.ref, remote.version, "current");
  if (already) {
    writeManagedState(root, {
      channel: opts.channel,
      ref: remote.ref,
      version: already.version,
      lastCheck: now().toISOString(),
    });
    pruneOtherRefs(root, remote.ref);
    return already;
  }

  try {
    await download(remote.ref, refDir(root, remote.ref));
  } catch (err) {
    const why = err instanceof Error ? err.message : String(err);
    return cached
      ? {
          ...cached,
          status: "stale",
          note: `download of ${remote.ref} failed (${why}); using cached ${cached.ref}`,
        }
      : undefined;
  }
  const fresh = installAt(spec, root, remote.ref, remote.version, "fresh");
  if (!fresh) return cached;
  writeManagedState(root, {
    channel: opts.channel,
    ref: remote.ref,
    version: fresh.version,
    lastCheck: now().toISOString(),
  });
  pruneOtherRefs(root, remote.ref);
  return fresh;
}
