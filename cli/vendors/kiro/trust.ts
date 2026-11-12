/**
 * Kiro CLI workspace trust for oh-my-agent project installs.
 *
 * An interactive Kiro session on the V3 engine (2.33+) asks "Trust this
 * workspace?" before it loads the folder's hooks, agents and MCP servers —
 * oma's `.kiro/agents/oma-hooks.json` among them — and exits on "No".
 * `--no-interactive` (oma's own dispatch) and the V1/V2 engines are not
 * gated.
 *
 * The decision is `workspaceTrusted: true` in the workspace's permissions
 * file (Kiro 3.2.1 bundle, `wF` / `CT` / `l1`):
 *
 *   <kiroHome>/workspace-roots/<sha256(root).hex[0:16]>/permissions.yaml
 *
 * `root` is the realpath of the exact launch folder with backslashes turned
 * into `/` and trailing slashes removed; a non-empty `permissions.json` there
 * wins over the YAML file. `kiroHome` is `$KIRO_HOME` when absolute and not
 * the home directory or one of its ancestors, else `~/.kiro`. Trust for the
 * home folder is never saved. The same file holds that workspace's permission
 * rules, so it is merged, never replaced.
 *
 * Windows keys depend on per-segment case probing (`caseMode`), which is not
 * reproduced here — skipped on win32. Skipped too when Kiro's home does not
 * exist (Kiro never run).
 */

import { createHash } from "node:crypto";
import {
  chmodSync,
  existsSync,
  mkdirSync,
  readFileSync,
  realpathSync,
  statSync,
} from "node:fs";
import { homedir } from "node:os";
import { isAbsolute, join, relative, resolve } from "node:path";
import { isMap, parseDocument } from "yaml";
import { parseJsonForMerge } from "../../utils/merge-read.js";
import { safeWriteFile } from "../../utils/safe-write.js";

export interface KiroTrustResult {
  changed: boolean;
  alreadyTrusted: boolean;
  reason?: string;
}

/** Kiro's home directory, resolved like the CLI does. */
export function kiroHome(
  env: NodeJS.ProcessEnv = process.env,
  home: string = homedir(),
): string {
  const fallback = join(home, ".kiro");
  const custom = env.KIRO_HOME?.trim();
  if (!custom || !isAbsolute(custom)) return fallback;
  const dir = resolve(custom);
  if (dir === resolve("/")) return fallback;
  const rel = relative(dir, resolve(home));
  // KIRO_HOME at or above HOME is ignored.
  if (rel === "" || (!rel.startsWith("..") && !isAbsolute(rel))) {
    return fallback;
  }
  return dir;
}

/** Kiro's workspace identity for a POSIX folder. */
export function kiroWorkspaceRoot(folder: string): string {
  let root: string;
  try {
    root = realpathSync(folder);
  } catch {
    root = folder;
  }
  root = root.replaceAll("\\", "/");
  if (root.length > 1) root = root.replace(/\/+$/, "") || "/";
  return root;
}

/** `workspace-roots/<id>` directory name for a workspace root. */
export function kiroWorkspaceId(root: string): string {
  return createHash("sha256").update(root).digest("hex").slice(0, 16);
}

function nonEmptyFile(path: string): boolean {
  try {
    return statSync(path).size > 0;
  } catch {
    return false;
  }
}

/** Record workspace trust for `projectRoot` under `home` (Kiro's home). */
export function trustKiroWorkspace(
  home: string,
  projectRoot: string,
  userHome: string = homedir(),
): KiroTrustResult {
  const skip = (reason: string): KiroTrustResult => ({
    changed: false,
    alreadyTrusted: false,
    reason,
  });
  if (process.platform === "win32") {
    return skip("Kiro workspace trust is not pre-approved on Windows");
  }
  if (!existsSync(home)) {
    return skip(`${home} not found (Kiro not initialized) — skipped`);
  }
  const root = kiroWorkspaceRoot(projectRoot);
  if (root === kiroWorkspaceRoot(userHome)) {
    return skip("Kiro never saves trust for the home folder");
  }
  const dir = join(home, "workspace-roots", kiroWorkspaceId(root));
  const jsonPath = join(dir, "permissions.json");
  const yamlPath = join(dir, "permissions.yaml");

  if (nonEmptyFile(jsonPath)) {
    const read = parseJsonForMerge(readFileSync(jsonPath, "utf-8"));
    if (read.status !== "ok") return skip(`${jsonPath} could not be parsed`);
    if (read.value.workspaceTrusted === true) {
      return { changed: false, alreadyTrusted: true };
    }
    if (read.value.workspaceTrusted === false) {
      return skip(`${root} is marked untrusted in ${jsonPath} — left as is`);
    }
    read.value.workspaceTrusted = true;
    safeWriteFile(jsonPath, `${JSON.stringify(read.value, null, 2)}\n`);
    chmodSync(jsonPath, 0o600);
    return { changed: true, alreadyTrusted: false };
  }

  const text = existsSync(yamlPath) ? readFileSync(yamlPath, "utf-8") : "";
  const doc = parseDocument(text);
  if (doc.errors.length > 0) return skip(`${yamlPath} could not be parsed`);
  const current: unknown = doc.get("workspaceTrusted");
  if (current === true) return { changed: false, alreadyTrusted: true };
  if (current === false) {
    return skip(`${root} is marked untrusted in ${yamlPath} — left as is`);
  }
  if (doc.contents != null && !isMap(doc.contents)) {
    return skip(`${yamlPath} is not a map`);
  }
  doc.set("workspaceTrusted", true);
  mkdirSync(dir, { recursive: true, mode: 0o700 });
  safeWriteFile(yamlPath, doc.toString());
  chmodSync(yamlPath, 0o600);
  return { changed: true, alreadyTrusted: false };
}

/** Pre-accept Kiro workspace trust for a project install. */
export function ensureKiroWorkspaceTrust(projectRoot: string): KiroTrustResult {
  return trustKiroWorkspace(kiroHome(), projectRoot);
}
