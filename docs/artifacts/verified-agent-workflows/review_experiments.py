#!/usr/bin/env python3
"""Run offline source-level scheduler and protocol probes at the evaluated commit."""
import datetime as dt
import hashlib
import json
from pathlib import Path
import os
import subprocess

import demo

HERE = Path(__file__).resolve().parent
REPO = HERE.parents[2]
BASE = "6df65bc42db756f2e7dd73c8f3d48fc474cb3ae7"


def main():
    sources = ["cli/state/agent-results.ts", "cli/state/agent-resume.ts",
               "cli/state/task-contract.ts", "cli/state/agent-decisions.ts"]
    hashes = {}
    for name in sources:
        expected = subprocess.check_output(["git", "show", f"{BASE}:{name}"], cwd=REPO)
        actual = (REPO / name).read_bytes()
        if actual != expected:
            raise RuntimeError(f"Evaluated source differs: {name}")
        hashes[name] = hashlib.sha256(actual).hexdigest()
    # Dependencies must also be the evaluated source, not a modified implementation.
    subprocess.run(["git", "diff", "--quiet", BASE, "--", "cli", ".agents/hooks"], cwd=REPO, check=True)
    stamp = dt.datetime.now(dt.timezone.utc).strftime("%Y%m%dT%H%M%S.%fZ")
    out = HERE / "work" / f"review-{stamp}"
    out.mkdir(parents=True)
    for name in ["unchanged", "unrelated-file", "broken-source", "changed-report"]:
        root = out / name
        demo.setup(root)
        demo.write(root, "src/limit.mjs", demo.FIXED)
    env = dict(os.environ, OMA_STATE_HOME=str(out / "state-home"), OMA_PROFILE="0",
               OMA_NO_AGENTMEMORY="1", NO_COLOR="1")
    with (out / "execution.txt").open("w") as log:
        proc = subprocess.run(["bun", str(HERE / "review_experiments.ts"), str(out)],
                              cwd=REPO, env=env, stdout=log, stderr=subprocess.STDOUT)
    if proc.returncode:
        print((out / "execution.txt").read_text()[-5000:])
        raise SystemExit(proc.returncode)
    summary = json.loads((out / "summary.json").read_text())
    summary["source_commit"] = BASE
    summary["source_sha256"] = hashes
    summary["driver_sha256"] = {name: hashlib.sha256((HERE / name).read_bytes()).hexdigest()
                                 for name in ["review_experiments.py", "review_experiments.ts", "demo.py"]}
    summary["execution_sha256"] = hashlib.sha256((out / "execution.txt").read_bytes()).hexdigest()
    (out / "summary.json").write_text(json.dumps(summary, indent=2) + "\n")
    (HERE / "work/review-latest.txt").write_text(str(out) + "\n")
    print(json.dumps({"output": str(out), "comparison": summary["comparison"],
                      "protocol": summary["protocol"]}, indent=2))


if __name__ == "__main__":
    main()
