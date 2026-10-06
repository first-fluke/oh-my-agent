/**
 * Managed archify install — thin binding of the shared managed-skill module.
 * See `cli/platform/managed-skill.ts` for the refresh/caching contract.
 */
import path from "node:path";
import {
  defaultManagedCacheRoot,
  ensureLatestManagedSkill,
  type ManagedChannel,
  type ManagedInstall as ManagedInstallBase,
  type ManagedOptions,
  type ManagedSkillSpec,
  makeDownload,
  makeFetchLatestRef,
  readPackageJsonVersion,
} from "../../platform/managed-skill.js";

export {
  type RemoteRef,
  readManagedState,
} from "../../platform/managed-skill.js";
export type { ManagedOptions };
export type ArchifyChannel = ManagedChannel;
export const ARCHIFY_REPO = "tt-a1i/archify";

export const ARCHIFY_SPEC: ManagedSkillSpec = {
  id: "diagram",
  repo: ARCHIFY_REPO,
  packageSubdir: "archify",
  entryRelative: path.join("bin", "archify.mjs"),
  readVersion: readPackageJsonVersion,
};

/** archify install with the historical `bin` alias kept for callers. */
export interface ManagedInstall extends ManagedInstallBase {
  bin: string;
}

export function defaultCacheRoot(home?: string): string {
  return path.join(defaultManagedCacheRoot(ARCHIFY_SPEC, home), "archify");
}

export const fetchLatestRef = makeFetchLatestRef(ARCHIFY_SPEC);
export const downloadArchify = makeDownload(ARCHIFY_SPEC);

export async function ensureLatestArchify(
  opts: ManagedOptions,
): Promise<ManagedInstall | undefined> {
  const res = await ensureLatestManagedSkill(ARCHIFY_SPEC, {
    ...opts,
    cacheRoot: opts.cacheRoot ?? defaultCacheRoot(),
  });
  return res ? { ...res, bin: res.entry } : undefined;
}
