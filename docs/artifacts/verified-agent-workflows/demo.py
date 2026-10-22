#!/usr/bin/env python3
"""Exercise the published OMA CLI without an LLM account or a software build.

All terminal output is captured verbatim. The demonstration uses scripted edits,
not an autonomous agent run. Each invocation retains its own isolated workspace.
"""
import argparse
import datetime as dt
import hashlib
import json
import os
from pathlib import Path
import shutil
import subprocess
import sys
import tempfile
import time

HERE = Path(__file__).resolve().parent
VERSION = "20.10.3"
SESSION = "icse-demo"
BROKEN = "export function allow(count, limit) { return count <= limit; }\n"
FIXED = "export function allow(count, limit) { return count < limit; }\n"
TEST = """import assert from 'node:assert/strict';
import { test } from 'node:test';
import { allow } from '../src/limit.mjs';
test('allow requests below the limit', () => assert.equal(allow(2, 3), true));
test('reject requests at the limit', () => assert.equal(allow(3, 3), false));
"""


def write(root, name, text):
    path = root / name
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(text)


def task(name, inputs, check, dependencies=()):
    return {
        "id": name,
        "agent": "qa-reviewer",
        "task": f"Verify the {name} acceptance condition",
        "acceptance_criteria": [{"id": "AC1", "description": f"The {name} check passes"}],
        "required_checks": [{"id": "acceptance", "criteria": ["AC1"], "command": check, "cwd": "."}],
        "inputs": inputs,
        "dependencies": list(dependencies),
        "retry_policy": "safe",
    }


def setup(root, only_limit=False):
    write(root, "src/limit.mjs", BROKEN)
    write(root, "tests/limit.test.mjs", TEST)
    write(root, "tests/usage.test.mjs", """import assert from 'node:assert/strict';
import { test } from 'node:test';
import { allow } from '../src/limit.mjs';
test('three requests are admitted', () => {
  assert.deepEqual([0, 1, 2, 3].filter(n => allow(n, 3)), [0, 1, 2]);
});
""")
    write(root, "usage.md", "# Request limit\nRequests at the limit are rejected.\n")
    write(root, "checks/docs.mjs", "import {readFileSync} from 'node:fs';\nif (!readFileSync('usage.md', 'utf8').includes('Request limit')) process.exit(1);\nconsole.log('Documentation check passed');\n")
    tasks = [task("limit", ["src/limit.mjs", "tests/limit.test.mjs"], ["node", "--test", "tests/limit.test.mjs"])]
    if not only_limit:
        tasks += [
            task("usage", ["tests/usage.test.mjs"], ["node", "--test", "tests/usage.test.mjs"], ["limit"]),
            task("docs", ["usage.md", "checks/docs.mjs"], ["node", "checks/docs.mjs"]),
        ]
    write(root, f".agents/results/plan-{SESSION}.json", json.dumps({"max_attempts": 6, "tasks": tasks}, indent=2))


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--cli", nargs="+", help="Optional existing OMA command argv; defaults to pinned npm package")
    args = parser.parse_args()
    cli = args.cli or ["npx", "--yes", f"--package=oh-my-agent@{VERSION}", "oma"]
    stamp = dt.datetime.now(dt.timezone.utc).strftime("%Y%m%dT%H%M%S.%fZ")
    out = HERE / "work" / stamp
    out.mkdir(parents=True)
    root = out / "project"
    missing = out / "missing-checks"
    env = dict(os.environ, OMA_STATE_HOME=str(out / "state-home"), OMA_PROFILE="0", OMA_NO_AGENTMEMORY="1", NO_COLOR="1")
    transcript = []
    observations = []
    # Avoid npm selecting an older workspace-local binary instead of the pinned
    # registry package. Every operation still targets the explicit project root.
    invocation = tempfile.TemporaryDirectory(prefix="oma-icse-cli-")

    def run(label, argv, project=root, valid=(0,)):
        command = [*cli, *argv]
        started = time.monotonic()
        proc = subprocess.run(command, cwd=invocation.name, env=env, text=True, capture_output=True, timeout=120)
        entry = {"label": label, "argv": command, "cwd": invocation.name, "project_root": str(project), "exit_code": proc.returncode,
                 "stdout": proc.stdout, "stderr": proc.stderr, "elapsed_seconds": round(time.monotonic() - started, 3)}
        transcript.append(entry)
        (out / "transcript.json").write_text(json.dumps(transcript, indent=2))
        print(f"{label}: exit={proc.returncode}", flush=True)
        if proc.returncode not in valid:
            raise RuntimeError(f"{label}: unexpected exit {proc.returncode}\n{proc.stdout}\n{proc.stderr}")
        return proc

    def parsed(proc):
        # CLI JSON is unmodified in the transcript. Reject unexpected non-JSON output.
        return json.loads(proc.stdout)

    def begin(name, project=root):
        data = parsed(run(f"begin-{name}", ["agent", "begin", "qa-reviewer", name, SESSION, "--project-root", str(project), "--workspace", str(project)], project))
        return data["runId"]

    def finish(name, run_id, project=root):
        report = f".agents/results/{name}-report.md"
        write(project, report, f"# {name}\nScripted demonstration artifact. See the recorded executable check.\n")
        claim = {"status": "completed", "changedFiles": [], "unresolved": [], "artifacts": [report]}
        claim_path = project / f".agents/results/{name}-claim.json"
        claim_path.write_text(json.dumps(claim, indent=2))
        return parsed(run(f"finish-{name}", ["agent", "finish", run_id, str(claim_path), "--project-root", str(project)], project, valid=(0, 1)))

    def verify(name, run_id, project=root, valid=(0,)):
        return run(f"verify-{name}", ["agent", "verify", run_id, "--required", "--project-root", str(project)], project, valid)

    def resume(label):
        return parsed(run(label, ["agent", "resume", SESSION, "--dry-run", "--max-attempts", "6", "--project-root", str(root)], valid=(0, 1)))

    def statuses(report):
        return {t["taskId"]: t["status"] for t in report["tasks"]}

    def observe(name, actual, expected):
        ok = actual == expected
        observations.append({"case": name, "actual": actual, "expected": expected, "passed": ok})
        if not ok:
            raise AssertionError(f"{name}: {actual!r} != {expected!r}")

    setup(root)
    setup(missing, only_limit=True)
    version = run("version", ["--version"]).stdout.strip()
    if version != VERSION:
        raise RuntimeError(f"Expected OMA {VERSION}, got {version}")
    no_check = finish("limit", begin("limit", missing), missing)
    observe("completion-without-checks", no_check["status"], "partial")

    run_id = begin("limit")
    verify("limit-failing", run_id, valid=(1,))
    failed = finish("limit", run_id)
    observe("failed-check-overrides-completed-claim", failed["status"], "failed")

    write(root, "src/limit.mjs", FIXED)
    transcript.append({"label": "repair", "edit": "src/limit.mjs", "before": BROKEN, "after": FIXED})
    for name in ("limit", "usage", "docs"):
        run_id = begin(name)
        verify(name, run_id)
        completed = finish(name, run_id)
        observe(f"verified-{name}", completed["status"], "completed")

    current = resume("resume-current")
    observe("reuse-current-evidence", statuses(current), {"limit": "reused", "usage": "reused", "docs": "reused"})

    write(root, "unrelated.txt", "An unrelated file is outside the declared inputs.\n")
    unrelated = resume("resume-unrelated-edit")
    observe("unrelated-edit-preserves-reuse", statuses(unrelated), {"limit": "reused", "usage": "reused", "docs": "reused"})

    write(root, "src/limit.mjs", BROKEN)
    transcript.append({"label": "source-change", "edit": "src/limit.mjs", "before": FIXED, "after": BROKEN})
    stale = resume("resume-changed-input")
    observe("changed-input-invalidates-dependent", statuses(stale), {"limit": "ready", "usage": "ready", "docs": "reused"})

    write(root, "src/limit.mjs", FIXED)
    write(root, ".agents/results/limit-report.md", "Changed after verification.\n")
    modified = resume("resume-changed-artifact")
    observe("changed-artifact-requires-evidence-repair", statuses(modified), {"limit": "blocked", "usage": "blocked", "docs": "reused"})

    summary = {"oma_version": version, "timestamp_utc": stamp, "node_version": subprocess.check_output(["node", "--version"], text=True).strip(),
               "kind": "scripted CLI demonstration; no LLM generation", "observations": observations, "all_passed": all(x["passed"] for x in observations),
               "transcript_sha256": hashlib.sha256(json.dumps(transcript, indent=2).encode()).hexdigest(), "output_directory": str(out)}
    (out / "transcript.json").write_text(json.dumps(transcript, indent=2))
    (out / "summary.json").write_text(json.dumps(summary, indent=2))
    (HERE / "work" / "latest.txt").write_text(str(out) + "\n")
    print(json.dumps(summary, indent=2))
    invocation.cleanup()


if __name__ == "__main__":
    main()
