import { execSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { http, isAxiosError } from "./http.js";
import { REPO } from "./skills.js";

export interface ExtractedRepo {
  dir: string;
  cleanup: () => void;
}

export async function downloadAndExtract(): Promise<ExtractedRepo> {
  const tempDir = mkdtempSync(join(tmpdir(), "oh-my-agent-"));

  try {
    const url = `https://api.github.com/repos/${REPO}/tarball/main`;
    const res = await http.get(url, {
      headers: { "User-Agent": "oh-my-agent-cli" },
      responseType: "arraybuffer",
      maxRedirects: 5,
    });

    const tarballPath = join(tempDir, "repo.tar.gz");
    writeFileSync(tarballPath, Buffer.from(res.data));

    execSync(`tar -xzf "${tarballPath}" -C "${tempDir}" --strip-components=1`, {
      stdio: "pipe",
      timeout: 30000,
    });

    rmSync(tarballPath);
  } catch (error) {
    rmSync(tempDir, { recursive: true, force: true });
    const detail = isAxiosError(error)
      ? `${error.code ?? "UNKNOWN"}: ${error.message}`
      : error instanceof Error
        ? error.message
        : String(error);
    throw new Error(`Failed to download repository archive: ${detail}`);
  }

  return {
    dir: tempDir,
    cleanup: () => rmSync(tempDir, { recursive: true, force: true }),
  };
}
