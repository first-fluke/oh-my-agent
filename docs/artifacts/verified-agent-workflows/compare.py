#!/usr/bin/env python3
"""Compare explicit recovery policies on one shared, scripted fixture.

The reference policies are authored baselines, not implementations of LangGraph
or ExoFlow. OMA is queried with --dry-run; no repair or model call is measured.
"""
import datetime as dt
import hashlib
import json
import os
from pathlib import Path
import subprocess
import sys
import tempfile

import demo

HERE = Path(__file__).resolve().parent


def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def save(path, value):
    path.write_text(json.dumps(value, indent=2) + "\n")


def main():
    stamp = dt.datetime.now(dt.timezone.utc).strftime("%Y%m%dT%H%M%S.%fZ")
    out = HERE / "work" / ("comparison-" + stamp)
    out.mkdir(parents=True)
    root = out / "project"
    demo.setup(root)
    demo.write(root, "src/limit.mjs", demo.FIXED)
    plan = json.loads((root / f".agents/results/plan-{demo.SESSION}.json").read_text())
    tasks = plan["tasks"]
    env = dict(os.environ, OMA_STATE_HOME=str(out / "state-home"),
               OMA_PROFILE="0", OMA_NO_AGENTMEMORY="1", NO_COLOR="1")
    records = []
    with tempfile.TemporaryDirectory(prefix="oma-comparison-cli-") as invocation:
        def execute(label, argv, cwd):
            proc = subprocess.run(argv, cwd=cwd, env=env, text=True,
                                  capture_output=True, timeout=120)
            records.append({"label": label, "argv": argv, "cwd": str(cwd),
                            "exit_code": proc.returncode, "stdout": proc.stdout,
                            "stderr": proc.stderr})
            save(out / "transcript.json", records)
            print(f"{label}: exit={proc.returncode}", flush=True)
            return proc

        def oma(label, args, valid=(0,)):
            p = execute(label, ["npx", "--yes", f"--package=oh-my-agent@{demo.VERSION}",
                                "oma", *args], invocation)
            if p.returncode not in valid:
                raise RuntimeError(f"{label}: {p.stdout}\n{p.stderr}")
            return p.stdout

        def checks(label):
            results = {}
            for task in tasks:
                exits = []
                for check in task["required_checks"]:
                    p = execute(f"{label}/{task['id']}/{check['id']}",
                                check["command"], root / check["cwd"])
                    if p.returncode not in (0, 1):
                        raise RuntimeError("Unexpected test process failure")
                    exits.append(p.returncode)
                results[task["id"]] = "completed" if all(x == 0 for x in exits) else "failed"
            return results

        assert oma("version", ["--version"]).strip() == demo.VERSION
        seed = checks("baseline-initial-checks")
        assert all(v == "completed" for v in seed.values()), seed
        save(out / "last-success.json", seed)
        for task in tasks:
            name = task["id"]
            run_id = json.loads(oma(f"begin-{name}", ["agent", "begin", "qa-reviewer",
                name, demo.SESSION, "--project-root", str(root), "--workspace", str(root)]))["runId"]
            oma(f"verify-{name}", ["agent", "verify", run_id, "--required", "--project-root", str(root)])
            report = f".agents/results/{name}-report.md"
            demo.write(root, report, f"# {name}\nVerified fixture report.\n")
            claim_path = out / f"{name}-claim.json"
            save(claim_path, {"status": "completed", "changedFiles": [],
                              "unresolved": [], "artifacts": [report]})
            result = json.loads(oma(f"finish-{name}", ["agent", "finish", run_id,
                                str(claim_path), "--project-root", str(root)]))
            assert result["status"] == "completed", result

        # Fingerprints below audit the comparison fixture, not OMA's algorithm.
        # Include all test files, inputs, reports and the contract, but no receipts.
        paths = sorted(set([p for task in tasks for p in task["inputs"]] +
                           [f".agents/results/{t['id']}-report.md" for t in tasks] +
                           [f".agents/results/plan-{demo.SESSION}.json"]))

        def snapshot():
            return {p: digest(root / p) for p in paths +
                    (["unrelated.txt"] if (root / "unrelated.txt").exists() else [])}

        initial = snapshot()
        cases = []
        for case in ["unchanged", "unrelated-file", "broken-source", "changed-report"]:
            if case == "unrelated-file":
                demo.write(root, "unrelated.txt", "Outside the declared inputs.\n")
            elif case == "broken-source":
                demo.write(root, "src/limit.mjs", demo.BROKEN)
            elif case == "changed-report":
                demo.write(root, "src/limit.mjs", demo.FIXED)
                demo.write(root, ".agents/results/limit-report.md", "Changed after verification.\n")
            before = snapshot()
            # Reload persisted successful status, with no file freshness policy.
            saved = json.loads((out / "last-success.json").read_text())
            retained = {name: "reused" if status == "completed" else "ready"
                        for name, status in saved.items()}
            # The conservative baseline executes every declared check on recovery.
            # A failing task can be retried after a caller-supplied repair; no repair
            # is supplied here, so failure is retained rather than hidden by retries.
            rechecked = checks(f"{case}/rerun-all")
            resume = json.loads(oma(f"{case}/oma-resume", ["agent", "resume", demo.SESSION,
                "--dry-run", "--max-attempts", "6", "--project-root", str(root)], valid=(0, 1)))
            assert before == snapshot(), "A policy changed the comparison inputs"
            cases.append({"case": case, "files": before,
                          "changed_since_initial": sorted(p for p, h in before.items() if initial.get(p) != h),
                          "last_success": retained, "rerun_all": rechecked,
                          "oma": {t["taskId"]: t["status"] for t in resume["tasks"]},
                          "oma_response": resume,
                          "recovery_check_commands": {"last_success": 0,
                              "rerun_all": sum(len(t["required_checks"]) for t in tasks),
                              "oma_dry_run": 0}})
            save(out / "cases.json", cases)
        summary = {"timestamp_utc": stamp, "oma_version": demo.VERSION,
                   "node_version": subprocess.check_output(["node", "--version"], text=True).strip(),
                   "python_version": sys.version.split()[0],
                   "fixture": "Shared three-task limiter fixture from demo.py",
                   "scope": "Four deterministic recovery probes, no model calls or executed OMA repair",
                   "baseline_scope": "Authored policies; not a benchmark of named workflow products",
                   "driver_sha256": digest(Path(__file__)), "fixture_driver_sha256": digest(Path(demo.__file__)),
                   "transcript_sha256": digest(out / "transcript.json"),
                   "initial_files": initial, "cases": cases}
        save(out / "summary.json", summary)
        (HERE / "work/comparison-latest.txt").write_text(str(out) + "\n")
        print(json.dumps({"output": str(out), "cases": [{"case": c["case"],
            "last_success": c["last_success"], "rerun_all": c["rerun_all"], "oma": c["oma"]} for c in cases]}, indent=2))


if __name__ == "__main__":
    main()
