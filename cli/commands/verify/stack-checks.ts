import {
  type Dirent,
  existsSync,
  readdirSync,
  readFileSync,
  statSync,
} from "node:fs";
import { join, relative, sep } from "node:path";
import { minimatch } from "minimatch";
import { parse as parseYaml } from "yaml";
import type { VerifyCheck } from "../../types/index.js";
import {
  type CommandResult,
  checkCommandResult,
  createCheck,
  findBinary,
  runCheckCommand,
} from "./check-utils.js";

type CommandCheck = {
  cmd: string;
  pass_signal?: string;
  skip_if_missing?: string;
};

export type StackManifest = {
  language: string;
  framework?: string;
  orm?: string;
  source?: string;
  verify?: {
    detect?: string;
    syntax?: CommandCheck;
    tests?: CommandCheck;
    raw_sql?: {
      patterns: string[];
      include_glob?: string;
      exclude_dirs?: string[];
    };
  };
};

export function loadStackManifest(
  workspace: string,
  skill: string,
): StackManifest | null {
  const path = join(
    workspace,
    ".agents",
    "skills",
    skill,
    "stack",
    "stack.yaml",
  );
  if (!existsSync(path)) return null;
  try {
    const parsed = parseYaml(readFileSync(path, "utf-8")) as unknown;
    if (
      parsed &&
      typeof parsed === "object" &&
      typeof (parsed as { language?: unknown }).language === "string"
    ) {
      return parsed as StackManifest;
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Run a manifest `cmd` string safely without passing it through a shell.
 *
 * stack.yaml `verify.syntax.cmd` and `verify.tests.cmd` are plain strings like
 * `"bun run typecheck"` or `"npx tsc --noEmit"`. Passing them to execSync
 * routes them through `/bin/sh -c`, which interprets shell metacharacters —
 * a malicious manifest can therefore achieve RCE. Instead we split on
 * whitespace (honouring simple quoted tokens) and call spawnSync with an argv
 * array so the command is passed verbatim to the OS without shell interpretation.
 *
 * Preserve both output streams, exit code, signal, and spawn error. Output
 * is additional evidence; it must never override a failed process outcome.
 *
 * Limitations: the splitter is intentionally minimal (no nested quotes, no
 * env-var expansion). Stack manifests are expected to contain simple commands;
 * shell pipelines / redirects are not supported by design (no shell runs).
 */
export function runManifestCmd(cmd: string, cwd: string): CommandResult {
  // Tokenise on whitespace — handles simple `"quoted arg"` and `'quoted arg'`
  // tokens by stripping the outer quotes but NOT expanding anything.
  const tokens: string[] = [];
  const tokenRe = /(?:"([^"]*)")|(?:'([^']*)')|(\S+)/g;
  let m = tokenRe.exec(cmd);
  while (m !== null) {
    tokens.push(m[1] ?? m[2] ?? m[3] ?? "");
    m = tokenRe.exec(cmd);
  }
  const [bin, ...args] = tokens;
  return runCheckCommand(bin ?? "", args, cwd);
}

/**
 * Safe binary-existence check that avoids shell interpolation.
 *
 * `bin` originates from stack.yaml's `skip_if_missing` field (attacker-
 * controlled in a malicious project). findBinary validates the token against
 * a strict identifier allowlist and scans PATH directly (PATHEXT-aware on
 * win32), so no shell ever interprets the value. The previous `which`-based
 * lookup always failed on Windows, making every skip_if_missing check
 * over-skip there.
 */
export function hasBinary(bin: string, _workspace: string): boolean {
  return findBinary(bin) !== null;
}

export function checkBackendSyntax(
  manifest: StackManifest,
  workspace: string,
): VerifyCheck {
  const name = `${titleCase(manifest.language)} Syntax`;
  const cfg = manifest.verify?.syntax;
  if (!cfg) return createCheck(name, "skip", "No syntax check configured");
  if (cfg.skip_if_missing && !hasBinary(cfg.skip_if_missing, workspace)) {
    return createCheck(name, "skip", `${cfg.skip_if_missing} not available`);
  }
  return checkCommandResult(
    name,
    runManifestCmd(cfg.cmd, workspace),
    "Valid",
    "Syntax check failed",
  );
}

export function checkBackendTests(
  manifest: StackManifest,
  workspace: string,
): VerifyCheck {
  const name = `${titleCase(manifest.language)} Tests`;
  const cfg = manifest.verify?.tests;
  if (!cfg) return createCheck(name, "skip", "No tests check configured");
  if (cfg.skip_if_missing && !hasBinary(cfg.skip_if_missing, workspace)) {
    return createCheck(name, "skip", `${cfg.skip_if_missing} not available`);
  }
  const result = runManifestCmd(cfg.cmd, workspace);
  const check = checkCommandResult(name, result, "Tests pass", "Tests failed");
  if (check.status !== "pass") return check;
  const output = `${result.stdout}\n${result.stderr}`;
  const signal = cfg.pass_signal;
  if (signal && !output.includes(signal)) {
    return createCheck(name, "fail", "Expected test pass signal not found");
  }
  return check;
}

/**
 * In-process replacement for the old
 * `grep -rn --include=GLOB -E PATTERN . | grep -v DIR ... | head -1`
 * pipeline, which silently no-oped on Windows (no grep → null → false
 * "pass"). include_glob matches like grep --include (basename glob via
 * matchBase); exclude_dirs keep grep -v semantics (term matched against the
 * whole path:line:content output line). Returns the first matching file.
 */
function firstRawSqlFile(
  workspace: string,
  includeGlob: string | undefined,
  pattern: RegExp,
  excludeTerms: string[],
): string | null {
  const walk = (dir: string): string | null => {
    let entries: Dirent[];
    try {
      entries = readdirSync(dir, { withFileTypes: true });
    } catch {
      return null; // Unreadable directory — nothing to scan.
    }
    for (const entry of entries) {
      const full = join(dir, entry.name);
      if (entry.isDirectory()) {
        if (entry.name === "node_modules" || entry.name === ".git") continue;
        const hit = walk(full);
        if (hit) return hit;
      } else if (entry.isFile()) {
        const rel = relative(workspace, full).split(sep).join("/");
        if (
          includeGlob &&
          !minimatch(rel, includeGlob, { matchBase: true, dot: true })
        ) {
          continue;
        }
        let content: string;
        try {
          if (statSync(full).size > 5 * 1024 * 1024) continue;
          content = readFileSync(full, "utf-8");
        } catch {
          continue; // Unreadable/binary file — skip like grep does.
        }
        const lines = content.split("\n");
        for (let i = 0; i < lines.length; i++) {
          const text = lines[i] ?? "";
          if (!pattern.test(text)) continue;
          const grepLine = `./${rel}:${i + 1}:${text}`;
          if (excludeTerms.some((term) => grepLine.includes(term))) continue;
          return `./${rel}`;
        }
      }
      // Symlinks are skipped entirely (avoids cycles; grep -r does not
      // follow directory symlinks either).
    }
    return null;
  };
  return walk(workspace);
}

export function checkBackendRawSql(
  manifest: StackManifest,
  workspace: string,
): VerifyCheck {
  const name = "SQL Injection";
  const cfg = manifest.verify?.raw_sql;
  if (!cfg || cfg.patterns.length === 0) {
    return createCheck(name, "skip", "No raw_sql check configured");
  }
  let pattern: RegExp;
  try {
    pattern = new RegExp(cfg.patterns.join("|"));
  } catch {
    return createCheck(name, "warn", "Invalid raw_sql pattern in stack.yaml");
  }
  const file = firstRawSqlFile(
    workspace,
    cfg.include_glob,
    pattern,
    cfg.exclude_dirs ?? [],
  );
  if (file) {
    return createCheck(name, "fail", `Raw SQL pattern in ${file}`);
  }
  return createCheck(name, "pass", "None detected");
}

function titleCase(value: string): string {
  if (value.length === 0) return value;
  return value.charAt(0).toUpperCase() + value.slice(1);
}
