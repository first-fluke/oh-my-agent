import { execSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import https from "node:https";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { http, isAxiosError } from "./http.js";
import { REPO } from "./skills.js";

export interface ExtractedRepo {
  dir: string;
  cleanup: () => void;
}

/** Connection timeout — abort if TCP handshake takes longer than this */
const CONNECT_TIMEOUT_MS = 5_000;
/** Total response timeout — abort if entire download takes longer than this */
const RESPONSE_TIMEOUT_MS = 60_000;

const TARBALL_URLS = [
  `https://api.github.com/repos/${REPO}/tarball/main`,
  `https://codeload.github.com/${REPO}/tar.gz/main`,
  `https://github.com/${REPO}/archive/main.tar.gz`,
];

async function downloadTarball(tempDir: string): Promise<void> {
  const tarballPath = join(tempDir, "repo.tar.gz");
  const agent = new https.Agent({ family: 4, timeout: CONNECT_TIMEOUT_MS });
  let lastError: unknown;

  for (const url of TARBALL_URLS) {
    try {
      const res = await http.get(url, {
        headers: { Accept: "application/vnd.github+json" },
        responseType: "arraybuffer",
        maxRedirects: 5,
        timeout: RESPONSE_TIMEOUT_MS,
        httpsAgent: agent,
      });

      writeFileSync(tarballPath, Buffer.from(res.data));

      execSync(
        `tar -xzf "${tarballPath}" -C "${tempDir}" --strip-components=1`,
        { stdio: "pipe", timeout: 30_000 },
      );

      rmSync(tarballPath);
      return;
    } catch (error) {
      lastError = error;
    }
  }

  // All HTTP attempts failed — try git clone as last resort
  try {
    execSync(
      `git clone --depth 1 --branch main https://github.com/${REPO}.git "${join(tempDir, "_clone")}"`,
      { stdio: "pipe", timeout: 15_000 },
    );
    execSync(`cp -a "${join(tempDir, "_clone")}/." "${tempDir}/"`, {
      stdio: "pipe",
    });
    rmSync(join(tempDir, "_clone"), { recursive: true, force: true });
    return;
  } catch {
    // git clone also failed — throw the last HTTP error
  }

  const detail = isAxiosError(lastError)
    ? `${lastError.code ?? "UNKNOWN"}: ${lastError.message}`
    : lastError instanceof Error
      ? lastError.message
      : String(lastError);
  throw new Error(`Failed to download repository archive: ${detail}`);
}

export async function downloadAndExtract(): Promise<ExtractedRepo> {
  const tempDir = mkdtempSync(join(tmpdir(), "oh-my-agent-"));

  try {
    await downloadTarball(tempDir);
  } catch (error) {
    rmSync(tempDir, { recursive: true, force: true });
    throw error;
  }

  return {
    dir: tempDir,
    cleanup: () => rmSync(tempDir, { recursive: true, force: true }),
  };
}
