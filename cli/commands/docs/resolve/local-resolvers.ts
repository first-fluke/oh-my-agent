/**
 * CLI binary, package.json script, env var, and config key resolution
 * for the docs resolver.
 *
 * Design: docs/plans/designs/008-oma-docs.md § Resolver
 */

import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { toPosixPath } from "../../../utils/fs-utils.js";

// ---------------------------------------------------------------------------
// CLI binary resolution
// ---------------------------------------------------------------------------

export function resolveCli(target: string): {
  ok: boolean;
  skipped?: boolean;
  reason?: string;
} {
  const firstToken = target.trim().split(/\s+/)[0] ?? "";
  if (!firstToken) return { ok: false, reason: "cli_empty" };

  try {
    const which = process.platform === "win32" ? "where" : "which";
    execSync(`${which} ${firstToken}`, {
      stdio: ["ignore", "pipe", "ignore"],
      encoding: "utf-8",
    });
    return { ok: true };
  } catch {
    return { ok: false, skipped: true, reason: "cli-unavailable" };
  }
}

// ---------------------------------------------------------------------------
// Script resolution
// ---------------------------------------------------------------------------

export function resolveScript(
  scriptName: string,
  docPath: string,
  repoRoot: string,
): { ok: boolean; reason?: string } {
  // Walk up from the doc's directory and check every ancestor package.json
  // up to (and including) the repo root. Workspace-aware: a doc in
  // `web/docs/` may legitimately reference root scripts even though
  // `web/package.json` doesn't declare them. Resolution succeeds when
  // ANY ancestor package.json declares the script.
  let current = path.dirname(path.join(repoRoot, docPath));
  const fsRoot = path.parse(current).root;
  const checked: string[] = [];
  let parseError: string | null = null;

  while (current.startsWith(repoRoot)) {
    const pkgPath = path.join(current, "package.json");
    if (fs.existsSync(pkgPath)) {
      try {
        const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf-8")) as {
          scripts?: Record<string, string>;
        };
        if (pkg.scripts && Object.hasOwn(pkg.scripts, scriptName)) {
          return { ok: true };
        }
        checked.push(
          toPosixPath(path.relative(repoRoot, pkgPath)) || "package.json",
        );
      } catch {
        parseError =
          toPosixPath(path.relative(repoRoot, pkgPath)) || "package.json";
      }
    }

    if (current === repoRoot || current === fsRoot) break;
    const parent = path.dirname(current);
    if (parent === current) break;
    current = parent;
  }

  if (checked.length > 0) {
    return {
      ok: false,
      reason: `script_not_in_package_json (${checked.join(", ")})`,
    };
  }
  if (parseError) {
    return { ok: false, reason: `package_json_parse_error (${parseError})` };
  }
  return { ok: false, reason: "package_json_not_found" };
}

// ---------------------------------------------------------------------------
// Env var resolution
// ---------------------------------------------------------------------------

// Detect ripgrep availability once per process. ripgrep (`rg`) is 5-10x
// faster than `git grep` on large repos, ships with VS Code and many dev
// distros. Falls back to `git grep` when unavailable so we don't add a
// hard dependency.
let _hasRipgrep: boolean | null = null;
function hasRipgrep(): boolean {
  if (_hasRipgrep !== null) return _hasRipgrep;
  try {
    execSync("rg --version", { stdio: ["ignore", "ignore", "ignore"] });
    _hasRipgrep = true;
  } catch {
    _hasRipgrep = false;
  }
  return _hasRipgrep;
}

export function resolveEnv(
  varName: string,
  repoRoot: string,
): { ok: boolean; skipped?: boolean; reason?: string } {
  // Simple grep for process.env.X or import.meta.env.X
  const patterns = [
    `process\\.env\\.${varName}`,
    `import\\.meta\\.env\\.${varName}`,
  ];

  try {
    for (const pattern of patterns) {
      try {
        // ripgrep first (fast); fall back to git grep when rg is absent.
        // Both honor .gitignore so we don't maintain a manual exclude list.
        const cmd = hasRipgrep()
          ? `rg -l --type ts --type js "${pattern}"`
          : `git grep -l "${pattern}" -- "*.ts" "*.js" "*.mjs" "*.tsx" "*.jsx"`;
        execSync(cmd, {
          cwd: repoRoot,
          stdio: ["ignore", "pipe", "ignore"],
          encoding: "utf-8",
        });
        return { ok: true };
      } catch {
        // grep exits non-zero if no matches
      }
    }

    // Check .env.example
    const envExample = path.join(repoRoot, ".env.example");
    if (fs.existsSync(envExample)) {
      const content = fs.readFileSync(envExample, "utf-8");
      if (new RegExp(`^${varName}=`, "m").test(content)) {
        return { ok: true };
      }
    }

    // Not found — warn-only (not broken, external injection possible)
    return { ok: false, skipped: true, reason: "env-not-found-locally" };
  } catch {
    return { ok: false, skipped: true, reason: "env-check-error" };
  }
}

// ---------------------------------------------------------------------------
// Config key resolution
// ---------------------------------------------------------------------------

function getOmaConfigDeepPaths(): Set<string> {
  // Build a set of all valid deep dot-paths from OmaConfig zod schema.
  // We enumerate known paths from the design and agent-config schema.
  const paths = new Set<string>([
    "language",
    "model_preset",
    "date_format",
    "timezone",
    "auto_update_cli",
    "telemetry",
    "agents",
    "models",
    "custom_presets",
    "vendors",
    "session",
    "docs",
    "docs.auto_verify",
    "docs.check_urls",
    "default_cli",
    "agents.orchestrator",
    "agents.architecture",
    "agents.qa",
    "agents.pm",
    "agents.backend",
    "agents.frontend",
    "agents.mobile",
    "agents.db",
    "agents.debug",
    "agents.tf-infra",
    "agents.retrieval",
    "session.quota_cap",
    // Vendor-specific config paths used by skills. These are NOT in the
    // root OmaConfig schema — they live in vendor adapter configs but
    // are referenced by docs (oma-image, oma-observability, etc.).
    // Whitelisted to avoid false positives until v2 introduces a proper
    // vendor-config schema lookup.
    "vendors.gemini.strategies",
    "vendors.codex.strategies",
    "vendors.claude.strategies",
    "session.id",
  ]);
  return paths;
}

const OMA_CONFIG_PATHS = getOmaConfigDeepPaths();

export function resolveConfig(target: string): {
  ok: boolean;
  reason?: string;
} {
  if (OMA_CONFIG_PATHS.has(target)) {
    return { ok: true };
  }
  return { ok: false, reason: "config_key_not_found" };
}
