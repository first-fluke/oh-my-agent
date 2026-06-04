import { existsSync } from "node:fs";
import { platform } from "node:os";

/**
 * Chrome/Chromium executable discovery — shared I/O adapter.
 *
 * Used by the search browser strategy (puppeteer-core via CDP) and by the
 * slide command (doctor / validate / export / editor) to locate a system
 * Chromium-based browser. Lives in `io/` so neither slice imports from the
 * other (see cli/ARCHITECTURE.md boundary rules).
 */

const CHROME_CANDIDATES: Record<string, string[]> = {
  darwin: [
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    "/Applications/Google Chrome Canary.app/Contents/MacOS/Google Chrome Canary",
    "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge",
    "/Applications/Brave Browser.app/Contents/MacOS/Brave Browser",
    "/Applications/Chromium.app/Contents/MacOS/Chromium",
  ],
  linux: [
    "/usr/bin/google-chrome",
    "/usr/bin/google-chrome-stable",
    "/usr/bin/chromium",
    "/usr/bin/chromium-browser",
    "/usr/bin/microsoft-edge",
    "/usr/bin/brave-browser",
  ],
  win32: [
    "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
    "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
    "C:\\Program Files\\BraveSoftware\\Brave-Browser\\Application\\brave.exe",
  ],
};

export function findChromeExecutable(): string | null {
  if (process.env.OMA_CHROME_PATH && existsSync(process.env.OMA_CHROME_PATH)) {
    return process.env.OMA_CHROME_PATH;
  }
  const candidates = CHROME_CANDIDATES[platform()] ?? [];
  for (const candidate of candidates) {
    if (existsSync(candidate)) return candidate;
  }
  return null;
}
