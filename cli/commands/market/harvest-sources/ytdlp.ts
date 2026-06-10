/** yt-dlp availability probe shared by the youtube fetcher and default-source resolution. */

import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

export async function ytdlpAvailable(): Promise<boolean> {
  if (process.env.YOUTUBE_SC_AVAILABLE) return true;
  try {
    await execFileAsync("which", ["yt-dlp"]);
    return true;
  } catch {
    return false;
  }
}
