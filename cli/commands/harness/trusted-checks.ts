import { spawnSync } from "node:child_process";
import {
  cpSync,
  existsSync,
  lstatSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  realpathSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { basename, dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { sha256Hex } from "../../utils/hash.js";
import { isPathInside } from "./paths.js";
import { FIXTURE_HARNESS_CONTROLS } from "./suite.js";
import type {
  CandidateOverlayManifest,
  HarnessCheck,
  HarnessCheckResult,
  HarnessSuite,
} from "./types.js";

export const trustedCheckerImplementationHash = sha256Hex(
  readFileSync(fileURLToPath(import.meta.url)),
);
const MAX_CHECKER_BYTES = 5 * 1024 * 1024;
export type CommandCheck = Extract<HarnessCheck, { type: "command" }>;
export interface TrustedChecker {
  source: Buffer;
  sourcePath: string;
  hash: string;
  executable: string;
  executableHash: string;
}
export type TrustedCheckers = ReadonlyMap<string, TrustedChecker>;

export function snapshotTrustedCheckers(
  suite: HarnessSuite,
  projectRoot: string,
  candidate: CandidateOverlayManifest,
): TrustedCheckers {
  const candidatePath = realpathSync(candidate.root);
  if (isPathInside(candidatePath, realpathSync(suite.sourcePath))) {
    throw new Error(
      "Evaluator suite must be separate from the candidate overlay",
    );
  }
  for (const task of suite.tasks) {
    const fixturePath = realpathSync(task.workspace);
    if (
      isPathInside(candidatePath, fixturePath) ||
      isPathInside(fixturePath, candidatePath)
    ) {
      throw new Error(
        `Candidate overlay must be separate from fixture workspace ${task.id}`,
      );
    }
  }
  const snapshots = new Map<string, TrustedChecker>();
  for (const task of suite.tasks)
    for (const check of task.checks) {
      if (check.type !== "command") continue;
      if (snapshots.has(JSON.stringify(check))) continue;
      const sourcePath = resolve(dirname(suite.sourcePath), check.checker);
      if (!isPathInside(projectRoot, sourcePath) || !existsSync(sourcePath)) {
        throw new Error("Trusted checker must exist inside the project root");
      }
      if (
        lstatSync(sourcePath).isSymbolicLink() ||
        !lstatSync(sourcePath).isFile() ||
        !isPathInside(realpathSync(projectRoot), realpathSync(sourcePath))
      ) {
        throw new Error(
          "Trusted checker must be a regular project file without escaping symlinks",
        );
      }
      if (
        [
          join(projectRoot, ".agents"),
          candidate.root,
          ...suite.tasks.map((item) => item.workspace),
        ].some((root) =>
          isPathInside(
            existsSync(root) ? realpathSync(root) : resolve(root),
            realpathSync(sourcePath),
          ),
        )
      ) {
        throw new Error(
          "Trusted checker must be separate from baseline, candidate, and fixture inputs",
        );
      }
      if (lstatSync(sourcePath).size > MAX_CHECKER_BYTES)
        throw new Error("Trusted checker is too large");
      const executable = realpathSync(check.argv[0] ?? "");
      if (
        isPathInside(realpathSync(projectRoot), executable) ||
        !lstatSync(executable).isFile()
      ) {
        throw new Error(
          "Trusted checker executable must be a regular file outside the project",
        );
      }
      const source = readFileSync(sourcePath);
      const snapshot = {
        source,
        sourcePath,
        hash: sha256Hex(source),
        executable,
        executableHash: sha256Hex(readFileSync(executable)),
      };
      snapshots.set(JSON.stringify(check), snapshot);
    }
  return snapshots;
}

export function assertTrustedCheckerIntegrity(checkers: TrustedCheckers): void {
  for (const checker of checkers.values()) {
    if (
      sha256Hex(readFileSync(checker.sourcePath)) !== checker.hash ||
      sha256Hex(readFileSync(checker.executable)) !== checker.executableHash
    ) {
      throw new Error(
        "Trusted evaluator source or executable changed during evaluation",
      );
    }
  }
}

function copyArtifacts(source: string, target: string): void {
  // Vendor projections may contain generated symlinks. Only task artifacts are
  // exposed to trusted checks; every artifact symlink is rejected before copy.
  const excluded = (path: string) =>
    FIXTURE_HARNESS_CONTROLS.some((control) =>
      isPathInside(join(source, control), path),
    );
  const visit = (path: string): void => {
    if (excluded(path)) return;
    const stat = lstatSync(path);
    if (stat.isSymbolicLink())
      throw new Error(
        `Check artifact contains a symbolic link: ${relative(source, path)}`,
      );
    if (stat.isDirectory())
      for (const item of readdirSync(path)) visit(join(path, item));
    else if (!stat.isFile())
      throw new Error("Check artifact must be a regular file");
  };
  visit(source);
  cpSync(source, target, {
    recursive: true,
    filter: (path) => !excluded(path),
  });
}

export function evaluateTrustedCommand(
  workspace: string,
  check: CommandCheck,
  snapshot: TrustedChecker | undefined,
): HarnessCheckResult {
  if (!snapshot)
    return {
      check,
      passed: false,
      message: "Trusted checker snapshot is missing",
    };
  const root = mkdtempSync(join(tmpdir(), "oma-harness-check-"));
  try {
    const artifacts = join(root, "artifacts");
    copyArtifacts(workspace, artifacts);
    const checkerDir = join(root, "evaluator");
    mkdirSync(checkerDir);
    const checkerPath = join(checkerDir, basename(snapshot.sourcePath));
    // The trusted bytes are materialized only after agent dispatch has ended.
    writeFileSync(checkerPath, snapshot.source, { mode: 0o400 });
    if (
      sha256Hex(readFileSync(snapshot.executable)) !== snapshot.executableHash
    ) {
      throw new Error("Trusted checker executable changed during evaluation");
    }
    const result = spawnSync(
      snapshot.executable,
      check.argv
        .slice(1)
        .map((arg) => (arg === "{checker}" ? checkerPath : arg)),
      {
        cwd: artifacts,
        shell: false,
        timeout: check.timeout_ms,
        killSignal: "SIGKILL",
        maxBuffer: MAX_CHECKER_BYTES,
        env: {
          PATH: process.env.PATH,
          HOME: root,
          TMPDIR: root,
          LANG: "C.UTF-8",
        },
        encoding: "utf-8",
      },
    );
    const timedOut =
      (result.error as NodeJS.ErrnoException | undefined)?.code === "ETIMEDOUT";
    const passed =
      !result.error &&
      result.signal === null &&
      result.status === check.expected_exit_code;
    return {
      check,
      passed,
      exitCode: result.status,
      timedOut,
      checkerHash: snapshot.hash,
      message: timedOut
        ? "Trusted check timed out"
        : result.error
          ? `Trusted check failed: ${result.error.message}`
          : `Trusted check exited ${result.status}; expected ${check.expected_exit_code}`,
    };
  } catch (error) {
    return {
      check,
      passed: false,
      checkerHash: snapshot.hash,
      message: error instanceof Error ? error.message : String(error),
    };
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}
