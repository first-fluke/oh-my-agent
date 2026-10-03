import { execFileSync } from "node:child_process";
import {
  existsSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import https from "node:https";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { REPO } from "../constants/vendors.js";
import { fetchRemoteManifest } from "../platform/manifest.js";
import { sha256Hex } from "../utils/hash.js";
import { http, isAxiosError } from "./http.js";

/**
 * `release` (default) installs the published `cli-v<version>` release;
 * `main` installs unreleased main-branch content and must be opted into.
 */
export type UpdateChannel = "release" | "main";

/** Where the extracted `.agents/` payload came from. */
export type ExtractedRepoSource =
  | "release-asset"
  | "tag-archive"
  | "tag-clone"
  | "main-archive"
  | "main-clone";

export interface ExtractedRepo {
  /** Directory whose `.agents/` subtree is the downloaded payload. */
  dir: string;
  cleanup: () => void;
  source: ExtractedRepoSource;
  /** Release the payload is pinned to; null for the explicit main channel. */
  version: string | null;
  /** Notices for the caller to surface (fallback source, unreleased content). */
  warnings: string[];
}

export interface DownloadOptions {
  /** Release to install. Defaults to the remote manifest's version pointer. */
  version?: string;
  /** Defaults to `OMA_UPDATE_CHANNEL` (`main` opts in; anything else = release). */
  channel?: UpdateChannel;
}

/**
 * An integrity failure (checksum or version mismatch). Never retried through a
 * fallback source: the published release itself is inconsistent or tampered.
 */
export class DownloadIntegrityError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DownloadIntegrityError";
  }
}

export const UPDATE_CHANNEL_ENV = "OMA_UPDATE_CHANNEL";

/** Published by `.github/workflows/release-please.yml` (publish-artifacts). */
export const RELEASE_ASSET_NAME = "agent-skills.tar.gz";

/** Connection timeout — abort if TCP handshake takes longer than this */
const CONNECT_TIMEOUT_MS = 5_000;
/** Total response timeout — abort if entire download takes longer than this */
const RESPONSE_TIMEOUT_MS = 60_000;
const EXTRACT_TIMEOUT_MS = 60_000;
const CLONE_TIMEOUT_MS = 60_000;

const RELEASE_VERSION_RE = /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/;

const MAIN_ARCHIVE_URLS = [
  `https://api.github.com/repos/${REPO}/tarball/main`,
  `https://codeload.github.com/${REPO}/tar.gz/main`,
  `https://github.com/${REPO}/archive/main.tar.gz`,
];

export function resolveUpdateChannel(
  env: NodeJS.ProcessEnv = process.env,
): UpdateChannel {
  return env[UPDATE_CHANNEL_ENV]?.trim().toLowerCase() === "main"
    ? "main"
    : "release";
}

export function releaseTag(version: string): string {
  return `cli-v${version}`;
}

export function releaseAssetUrls(version: string): {
  archive: string;
  checksum: string;
} {
  const base = `https://github.com/${REPO}/releases/download/${releaseTag(version)}`;
  return {
    archive: `${base}/${RELEASE_ASSET_NAME}`,
    checksum: `${base}/${RELEASE_ASSET_NAME}.sha256`,
  };
}

export function tagArchiveUrls(version: string): string[] {
  const tag = releaseTag(version);
  return [
    `https://codeload.github.com/${REPO}/tar.gz/refs/tags/${tag}`,
    `https://github.com/${REPO}/archive/refs/tags/${tag}.tar.gz`,
  ];
}

/** Parse `sha256sum` output (`<64 hex>  <name>`) into a lowercase digest. */
export function parseSha256File(content: string): string | null {
  const match = content.trim().match(/^([0-9a-fA-F]{64})(?:\s|$)/);
  return match?.[1]?.toLowerCase() ?? null;
}

/** Version stamped into the payload's `.agents/skills/_version.json`. */
export function readExtractedVersion(dir: string): string | null {
  try {
    const parsed = JSON.parse(
      readFileSync(join(dir, ".agents", "skills", "_version.json"), "utf-8"),
    ) as { version?: unknown };
    return typeof parsed.version === "string" ? parsed.version : null;
  } catch {
    return null;
  }
}

function describeError(error: unknown): string {
  if (isAxiosError(error)) {
    return error.response?.status
      ? `HTTP ${error.response.status}`
      : `${error.code ?? "UNKNOWN"}: ${error.message}`;
  }
  return error instanceof Error ? error.message : String(error);
}

function downloadAgent(): https.Agent {
  return new https.Agent({ family: 4, timeout: CONNECT_TIMEOUT_MS });
}

async function fetchBinary(
  url: string,
  headers?: Record<string, string>,
): Promise<Buffer> {
  const res = await http.get<ArrayBuffer>(url, {
    headers,
    responseType: "arraybuffer",
    maxRedirects: 5,
    timeout: RESPONSE_TIMEOUT_MS,
    httpsAgent: downloadAgent(),
  });
  return Buffer.from(res.data);
}

async function fetchText(url: string): Promise<string> {
  const res = await http.get<string>(url, {
    responseType: "text",
    maxRedirects: 5,
    timeout: RESPONSE_TIMEOUT_MS,
    httpsAgent: downloadAgent(),
  });
  return String(res.data);
}

/** Extract a gzipped tarball into `destDir` without a shell. */
function extractTarGz(
  archive: Buffer,
  destDir: string,
  stripComponents: number,
): void {
  const archivePath = join(destDir, ".oma-download.tar.gz");
  writeFileSync(archivePath, archive);
  try {
    const args = ["-xzf", archivePath, "-C", destDir];
    if (stripComponents > 0) {
      args.push(`--strip-components=${stripComponents}`);
    }
    execFileSync("tar", args, { stdio: "pipe", timeout: EXTRACT_TIMEOUT_MS });
  } finally {
    rmSync(archivePath, { force: true });
  }
}

function assertPayload(dir: string, label: string): void {
  if (!existsSync(join(dir, ".agents"))) {
    throw new Error(`${label} did not contain an .agents/ directory`);
  }
}

function assertReleaseVersion(
  dir: string,
  version: string,
  label: string,
): void {
  const actual = readExtractedVersion(dir);
  if (actual !== version) {
    throw new DownloadIntegrityError(
      `${label} for ${releaseTag(version)} contains .agents/skills/_version.json version ${actual ?? "(missing)"}; refusing to install mismatched content.`,
    );
  }
}

function makeResult(
  root: string,
  dir: string,
  source: ExtractedRepoSource,
  version: string | null,
  warnings: string[],
): ExtractedRepo {
  return {
    dir,
    cleanup: () => rmSync(root, { recursive: true, force: true }),
    source,
    version,
    warnings,
  };
}

/**
 * Try one source in a fresh temp dir. Integrity errors propagate; any other
 * failure removes the temp dir and returns the failure text for the next
 * source in the chain.
 */
async function attempt(
  load: (root: string) => Promise<ExtractedRepo>,
): Promise<{ result: ExtractedRepo } | { failure: string }> {
  const root = mkdtempSync(join(tmpdir(), "oh-my-agent-"));
  try {
    return { result: await load(root) };
  } catch (error) {
    rmSync(root, { recursive: true, force: true });
    if (error instanceof DownloadIntegrityError) throw error;
    return { failure: describeError(error) };
  }
}

async function downloadRelease(version: string): Promise<ExtractedRepo> {
  if (!RELEASE_VERSION_RE.test(version)) {
    throw new Error(
      `Invalid release version from the remote manifest: ${JSON.stringify(version)}`,
    );
  }
  const tag = releaseTag(version);
  const failures: string[] = [];

  // 1. The release asset: `.agents/` only (~1MB), checksum-verified before
  //    anything is extracted.
  const { archive, checksum } = releaseAssetUrls(version);
  const asset = await attempt(async (root) => {
    const expected = parseSha256File(await fetchText(checksum));
    if (!expected) {
      throw new Error(`${RELEASE_ASSET_NAME}.sha256 is not a sha256 digest`);
    }
    const bytes = await fetchBinary(archive);
    const actual = sha256Hex(bytes);
    if (actual !== expected) {
      throw new DownloadIntegrityError(
        `Checksum mismatch for ${tag}/${RELEASE_ASSET_NAME}: expected ${expected}, got ${actual}. Refusing to install.`,
      );
    }
    extractTarGz(bytes, root, 0);
    assertPayload(root, `${tag}/${RELEASE_ASSET_NAME}`);
    assertReleaseVersion(root, version, `Release asset ${RELEASE_ASSET_NAME}`);
    return makeResult(root, root, "release-asset", version, []);
  });
  if ("result" in asset) return asset.result;
  failures.push(`release asset: ${asset.failure}`);

  const fallbackNote = (source: string): string =>
    `Release asset ${tag}/${RELEASE_ASSET_NAME} unavailable (${failures[0]}); installed ${tag} from the ${source} instead (no checksum available).`;

  // 2. The tag's source archive (whole repository, pinned to the release).
  for (const url of tagArchiveUrls(version)) {
    const archiveAttempt = await attempt(async (root) => {
      extractTarGz(await fetchBinary(url), root, 1);
      assertPayload(root, `${tag} source archive`);
      assertReleaseVersion(root, version, "Source archive");
      return makeResult(root, root, "tag-archive", version, [
        fallbackNote("tag source archive"),
      ]);
    });
    if ("result" in archiveAttempt) return archiveAttempt.result;
    failures.push(`${url}: ${archiveAttempt.failure}`);
  }

  // 3. Last resort: a shallow clone of the tag.
  const clone = await attempt(async (root) => {
    const cloneDir = join(root, "repo");
    execFileSync(
      "git",
      [
        "clone",
        "--depth",
        "1",
        "--branch",
        tag,
        `https://github.com/${REPO}.git`,
        cloneDir,
      ],
      { stdio: "pipe", timeout: CLONE_TIMEOUT_MS },
    );
    assertPayload(cloneDir, `${tag} clone`);
    assertReleaseVersion(cloneDir, version, "Tag clone");
    return makeResult(root, cloneDir, "tag-clone", version, [
      fallbackNote("tag clone"),
    ]);
  });
  if ("result" in clone) return clone.result;
  failures.push(`git clone ${tag}: ${clone.failure}`);

  throw new Error(
    `Failed to download oh-my-agent ${tag}: ${failures.join("; ")}. ` +
      `If the release was just cut it may still be publishing — retry shortly, ` +
      `or set ${UPDATE_CHANNEL_ENV}=main to install unreleased main-branch content.`,
  );
}

async function downloadMain(): Promise<ExtractedRepo> {
  const warning = `${UPDATE_CHANNEL_ENV}=main: installing unreleased content from the main branch — not a tagged release and not checksum-verified.`;
  const failures: string[] = [];

  for (const url of MAIN_ARCHIVE_URLS) {
    const archiveAttempt = await attempt(async (root) => {
      extractTarGz(
        await fetchBinary(url, { Accept: "application/vnd.github+json" }),
        root,
        1,
      );
      assertPayload(root, "main archive");
      return makeResult(root, root, "main-archive", null, [warning]);
    });
    if ("result" in archiveAttempt) return archiveAttempt.result;
    failures.push(`${url}: ${archiveAttempt.failure}`);
  }

  const clone = await attempt(async (root) => {
    const cloneDir = join(root, "repo");
    execFileSync(
      "git",
      [
        "clone",
        "--depth",
        "1",
        "--branch",
        "main",
        `https://github.com/${REPO}.git`,
        cloneDir,
      ],
      { stdio: "pipe", timeout: CLONE_TIMEOUT_MS },
    );
    assertPayload(cloneDir, "main clone");
    return makeResult(root, cloneDir, "main-clone", null, [warning]);
  });
  if ("result" in clone) return clone.result;
  failures.push(`git clone main: ${clone.failure}`);

  throw new Error(
    `Failed to download the oh-my-agent main branch: ${failures.join("; ")}`,
  );
}

/**
 * Download the `.agents/` payload for a release. Default order: the
 * checksum-verified release asset, then the tag's source archive, then a
 * shallow clone of the tag. Unreleased main-branch content is used only when
 * the caller (or `OMA_UPDATE_CHANNEL=main`) opts in — never as a silent
 * fallback.
 */
export async function downloadAndExtract(
  options: DownloadOptions = {},
): Promise<ExtractedRepo> {
  const channel = options.channel ?? resolveUpdateChannel();
  if (channel === "main") return downloadMain();
  const version = options.version ?? (await fetchRemoteManifest()).version;
  return downloadRelease(version);
}
