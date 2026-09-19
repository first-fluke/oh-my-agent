import { execFileSync } from "node:child_process";

/**
 * First Claude Code release that reads `AGENTS.md` natively. From this version
 * on, oma manages `AGENTS.md` for claude too and `CLAUDE.md` becomes purely
 * user-owned (migration 031 strips the legacy OMA block).
 */
export const CLAUDE_AGENTS_MD_MIN_VERSION = "2.1.277";

/** Extract the leading `major.minor.patch` triple from a `--version` line. */
export function parseSemver(text: string): [number, number, number] | null {
  const match = /(\d+)\.(\d+)\.(\d+)/.exec(text);
  if (!match) return null;
  return [Number(match[1]), Number(match[2]), Number(match[3])];
}

/** True when `version` (any string containing a semver triple) is >= `min`. */
export function isVersionAtLeast(
  version: string | undefined | null,
  min: string,
): boolean {
  if (!version) return false;
  const a = parseSemver(version);
  const b = parseSemver(min);
  if (!a || !b) return false;
  for (let i = 0; i < 3; i++) {
    const x = a[i] ?? 0;
    const y = b[i] ?? 0;
    if (x !== y) return x > y;
  }
  return true;
}

/** True when this Claude Code version reads `AGENTS.md` natively. */
export function claudeReadsAgentsMd(
  version: string | undefined | null,
): boolean {
  return isVersionAtLeast(version, CLAUDE_AGENTS_MD_MIN_VERSION);
}

/**
 * Probe the installed Claude Code version (`claude --version`). Returns null
 * when the CLI is missing, fails, or hangs past the timeout.
 */
export function detectClaudeVersion(): string | null {
  try {
    const out = execFileSync("claude", ["--version"], {
      encoding: "utf-8",
      stdio: ["ignore", "pipe", "ignore"],
      timeout: 5000,
    });
    const trimmed = out.trim();
    return trimmed.length > 0 ? trimmed : null;
  } catch {
    return null;
  }
}
