import { execSync, spawn } from "node:child_process";
import { realpathSync } from "node:fs";
import process from "node:process";
import pc from "picocolors";
import { http } from "./http.js";

export const PACKAGE_NAME = "oh-my-agent";

export type PackageManager =
  | "npm"
  | "yarn"
  | "pnpm"
  | "pnpx"
  | "bun"
  | "bunx"
  | "homebrew"
  | "npx"
  | "binary"
  | "unknown";

export interface InstallationInfo {
  packageManager: PackageManager;
  isGlobal: boolean;
  updateCommand?: string;
  updateMessage?: string;
}

/**
 * Detect how oh-my-agent was installed by inspecting the realpath of argv[1].
 * Returns the package manager and the command used to upgrade it.
 */
export function getInstallationInfo(
  argvPath = process.argv[1],
): InstallationInfo {
  if (!argvPath) return { packageManager: "unknown", isGlobal: false };

  if (process.env.IS_BINARY === "true") {
    return {
      packageManager: "binary",
      isGlobal: true,
      updateMessage:
        "Running as a standalone binary. Download the latest release from GitHub.",
    };
  }

  let realPath: string;
  try {
    realPath = realpathSync(argvPath).replace(/\\/g, "/");
  } catch {
    return { packageManager: "unknown", isGlobal: false };
  }

  if (realPath.includes("/.npm/_npx") || realPath.includes("/npm/_npx")) {
    return {
      packageManager: "npx",
      isGlobal: false,
      updateMessage: "Running via npx, auto-update not applicable.",
    };
  }
  if (
    realPath.includes("/.pnpm/_pnpx") ||
    realPath.includes("/.cache/pnpm/dlx")
  ) {
    return {
      packageManager: "pnpx",
      isGlobal: false,
      updateMessage: "Running via pnpx, auto-update not applicable.",
    };
  }
  if (realPath.includes("/.bun/install/cache")) {
    return {
      packageManager: "bunx",
      isGlobal: false,
      updateMessage: "Running via bunx, auto-update not applicable.",
    };
  }

  if (process.platform === "darwin") {
    try {
      const brewPrefix = execSync(`brew --prefix ${PACKAGE_NAME}`, {
        encoding: "utf8",
        stdio: ["ignore", "pipe", "ignore"],
      }).trim();
      if (brewPrefix) {
        const brewRealPath = realpathSync(brewPrefix).replace(/\\/g, "/");
        if (realPath.startsWith(brewRealPath)) {
          return {
            packageManager: "homebrew",
            isGlobal: true,
            updateCommand: `brew upgrade ${PACKAGE_NAME}`,
            updateMessage: "Installed via Homebrew. Updating in background...",
          };
        }
      }
    } catch {
      // brew not installed, or oh-my-agent not installed via brew
    }
  }

  if (
    realPath.includes("/.pnpm/global") ||
    realPath.includes("/.local/share/pnpm")
  ) {
    return {
      packageManager: "pnpm",
      isGlobal: true,
      updateCommand: `pnpm add -g ${PACKAGE_NAME}@latest`,
      updateMessage: "Installed via pnpm. Updating in background...",
    };
  }
  if (realPath.includes("/.yarn/global")) {
    return {
      packageManager: "yarn",
      isGlobal: true,
      updateCommand: `yarn global add ${PACKAGE_NAME}@latest`,
      updateMessage: "Installed via yarn. Updating in background...",
    };
  }
  if (realPath.includes("/.bun/install/global")) {
    return {
      packageManager: "bun",
      isGlobal: true,
      updateCommand: `bun add -g ${PACKAGE_NAME}@latest`,
      updateMessage: "Installed via bun. Updating in background...",
    };
  }

  return {
    packageManager: "npm",
    isGlobal: true,
    updateCommand: `npm install -g ${PACKAGE_NAME}@latest`,
    updateMessage: "Installed via npm. Updating in background...",
  };
}

const VERSION_RE = /^(\d+)\.(\d+)\.(\d+)(?:[-+].*)?$/;

/**
 * Compare two semver strings (X.Y.Z, ignoring prerelease/build metadata).
 * Returns true when `latest` is strictly greater than `current`.
 */
export function isOutdated(current: string, latest: string): boolean {
  const a = current.match(VERSION_RE);
  const b = latest.match(VERSION_RE);
  if (!a || !b) return false;
  for (let i = 1; i <= 3; i++) {
    const ai = Number(a[i]);
    const bi = Number(b[i]);
    if (ai < bi) return true;
    if (ai > bi) return false;
  }
  return false;
}

/**
 * Fetch the latest version from npm registry. Returns null on any failure
 * (network, parse, timeout) so callers can fail open.
 */
export async function fetchLatestVersion(
  packageName: string = PACKAGE_NAME,
  timeoutMs = 2000,
): Promise<string | null> {
  try {
    const res = await http.get<{ version?: string }>(
      `https://registry.npmjs.org/${packageName}/latest`,
      { timeout: timeoutMs },
    );
    return typeof res.data?.version === "string" ? res.data.version : null;
  } catch {
    return null;
  }
}

export interface SelfUpdateResult {
  /** True when a background upgrade was spawned. */
  triggered: boolean;
  /** Latest version reported by registry, when known. */
  latest?: string;
  /** Reason an upgrade was not spawned (for logging/tests). */
  reason?:
    | "disabled"
    | "skipped-env"
    | "fetch-failed"
    | "up-to-date"
    | "non-upgradable"
    | "spawn-failed";
}

export interface SelfUpdateOptions {
  currentVersion: string;
  /** Set false to honor user opt-out via config. */
  enabled: boolean;
  /** Called when the background upgrade spawn succeeds. */
  onSpawnStart?: (msg: string) => void;
  /** Called when the user is on an outdated install we cannot upgrade. */
  onNotice?: (msg: string) => void;
}

/**
 * Run the self-update check. Spawns the upgrade command detached so the
 * current process exits cleanly; the new version takes effect on next run.
 */
export async function maybeSelfUpdate(
  opts: SelfUpdateOptions,
): Promise<SelfUpdateResult> {
  if (!opts.enabled) return { triggered: false, reason: "disabled" };
  if (process.env.OMA_SKIP_VERSION_CHECK === "1") {
    return { triggered: false, reason: "skipped-env" };
  }
  if (process.env.NODE_ENV === "development") {
    return { triggered: false, reason: "skipped-env" };
  }

  const latest = await fetchLatestVersion();
  if (!latest) return { triggered: false, reason: "fetch-failed" };
  if (!isOutdated(opts.currentVersion, latest)) {
    return { triggered: false, reason: "up-to-date", latest };
  }

  const info = getInstallationInfo();
  if (!info.updateCommand) {
    opts.onNotice?.(
      pc.yellow(
        `oh-my-agent ${opts.currentVersion} → ${latest} available. ${info.updateMessage ?? "Update manually."}`,
      ),
    );
    return { triggered: false, reason: "non-upgradable", latest };
  }

  try {
    const child = spawn(info.updateCommand, {
      stdio: "ignore",
      shell: true,
      detached: true,
    });
    child.unref();
    opts.onSpawnStart?.(
      pc.cyan(
        `oh-my-agent ${opts.currentVersion} → ${latest} updating in background. New version applies on next run.`,
      ),
    );
    return { triggered: true, latest };
  } catch {
    opts.onNotice?.(
      pc.yellow(
        `oh-my-agent ${opts.currentVersion} → ${latest} available. Run: ${info.updateCommand}`,
      ),
    );
    return { triggered: false, reason: "spawn-failed", latest };
  }
}
