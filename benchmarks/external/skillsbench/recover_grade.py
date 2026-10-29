#!/usr/bin/env python3
"""Regrade two preserved BugSwarm candidates without another model invocation."""

import argparse
import hashlib
import json
import os
from pathlib import Path
import shlex
import signal
import subprocess
import time
import uuid

from batch import digest_tree, write_json
from docker_runtime import DockerRuntime, inspect_task
from grading import read_grade


CANDIDATES = {
    "fix-build-agentops": {
        "failed_root": "/home/github/build/failed", "repo_id": "AgentOps-AI/agentops",
        "patches": {"patch_1.diff": "21a6bea4906b5345170467f9eafc19dbf1993a97e7564891095d0b507a322dd9"},
        "note_sha256": "7a6308bcb03fa36a526087951161a8c386ed4ecbe59da1e68c12a92e0c025eca",
    },
    "fix-build-google-auto": {
        "failed_root": "/home/travis/build/failed", "repo_id": "google/auto",
        "patches": {
            "patch_1.diff": "464795d5c23cf155c9974c1afed3177c01e4c704ddb2a6095c3f825a04b31b7d",
            "patch_2.diff": "0ade50d833cd812d19c5368cf02f6d7c4830fcf4389ff032e87c81198a3a9b82",
        },
        "note_sha256": "072f707b825432847bc513c92f03106722bdac782e1205aa07fd595b234c8646",
    },
}


def candidate_files(task, source):
    expected = CANDIDATES[task]
    files = {}
    for name, digest in expected["patches"].items():
        matches = list((source / "verifier/diffs").rglob(name))
        if len(matches) != 1:
            raise ValueError(f"Expected exactly one saved {name}")
        files[name] = (matches[0], digest)
    files["failed_reasons.txt"] = (source / "verifier/failed_reasons.txt", expected["note_sha256"])
    for name, (path, digest) in files.items():
        if hashlib.sha256(path.read_bytes()).hexdigest() != digest:
            raise ValueError(f"Saved candidate hash mismatch: {name}")
    return files


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--task", choices=CANDIDATES, required=True)
    parser.add_argument("--source-attempt", type=Path, required=True)
    parser.add_argument("--output-dir", type=Path, required=True)
    parser.add_argument("--checkout", type=Path, default=Path.home() / ".cache/oma-benchmarks/skillsbench-v1.1")
    parser.add_argument("--promote", action="store_true", help="Update only the task receipt after a valid native score; never write the full checkpoint")
    args = parser.parse_args()
    source, output = args.source_attempt.resolve(), args.output_dir.resolve()
    original = json.loads((source / "receipt.json").read_text())
    if original["task"] != args.task:
        parser.error("Source receipt task mismatch")
    if original.get("agent_status") != "completed":
        parser.error("Only a completed original solver candidate can be recovered")
    files = candidate_files(args.task, source)
    task = args.checkout / "tasks" / args.task
    actual_commit = subprocess.check_output(["git", "-C", str(args.checkout), "rev-parse", "HEAD"], text=True).strip()
    if actual_commit != "b63b7b2850226b6aa4fb5929a8c1ac7bc4d9a6af":
        parser.error("Expected the original pinned v1.1 checkout")
    for key, actual in [("task_sha256", hashlib.sha256((task / "task.md").read_bytes()).hexdigest()),
                        ("dockerfile_sha256", hashlib.sha256((task / "environment/Dockerfile").read_bytes()).hexdigest()),
                        ("verifier_tree_sha256", digest_tree(task / "verifier"))]:
        if original[key] != actual:
            parser.error(f"Original task source changed: {key}")
    output.mkdir(parents=True, exist_ok=False)
    container = "oma-skillsbench-regrade-" + uuid.uuid4().hex[:12]
    receipt = {"task": args.task, "status": "running", "started_at": time.time(),
               "attempt_dir": str(output), "source_attempt": str(source), "container": container,
               "source_receipt_sha256": hashlib.sha256((source / "receipt.json").read_bytes()).hexdigest(),
               "candidate_artifacts": {name: {"path": str(path), "sha256": digest} for name, (path, digest) in files.items()},
               "model_calls_this_attempt": 0, "canonical_benchmark": False,
               "environment_execution": "recreated-original-runtime-replay-with-original-base-digest",
               "restoration": "Hash-verified saved patches and note restored with the original exact-repo Git trust setting; prior venv/cache/build outputs were not preserved",
               "setup_status": "pending", "agent_status": "completed", "verifier_status": "pending",
               "candidate_origin": "completed solver from source_attempt; restored exact saved patch and note bytes",
               "oracle_status": "not-run", "steps": {}, "commands": []}
    for key in ["task_sha256", "dockerfile_sha256", "verifier_tree_sha256", "configured_model", "configured_reasoning_effort", "usage", "hook_activation"]:
        if key in original:
            receipt[key] = original[key]

    def run(command, label, timeout=600, check=True):
        receipt["commands"].append(command)
        print(json.dumps({"step": label, "time": time.time()}), flush=True)
        with (output / (label + ".log")).open("w") as log:
            process = subprocess.Popen(command, stdin=subprocess.DEVNULL, stdout=log, stderr=subprocess.STDOUT, start_new_session=True)
            try:
                process.wait(timeout=timeout)
            except subprocess.TimeoutExpired:
                os.killpg(process.pid, signal.SIGTERM)
                try:
                    process.wait(timeout=10)
                except subprocess.TimeoutExpired:
                    os.killpg(process.pid, signal.SIGKILL)
                raise TimeoutError(f"{label} exceeded {timeout} seconds")
        receipt["steps"][label] = {"exit_code": process.returncode}
        if check and process.returncode:
            raise RuntimeError(f"{label} exit {process.returncode}; see {output / (label + '.log')}")
        return process.returncode

    spec = inspect_task(task)
    spec["image"] = original["image_inspect"]["RepoDigests"][0]
    for stage, image in spec.get("stage_images", {}).items():
        inspected = json.loads(subprocess.check_output(["docker", "image", "inspect", image], text=True))[0]
        receipt.setdefault("recreated_stage_images", {})[stage] = {key: inspected.get(key) for key in ["Id", "RepoDigests", "Os", "Architecture"]}
        spec["stage_images"][stage] = (inspected.get("RepoDigests") or [inspected["Id"]])[0]
    if spec.get("stage_images"):
        receipt["stage_image_provenance"] = "COPY-from stage pinned to the current cached immutable identity; the original attempt did not record that stage ID"
    receipt["requested_resources"] = spec["config"].get("environment", {})
    runtime = DockerRuntime(task, spec, container, run, native_build=False, binary_only=True)
    stage = "setup"
    try:
        runtime.prepare()
        inspected = json.loads(subprocess.check_output(["docker", "image", "inspect", runtime.image], text=True))[0]
        if inspected["Id"] != original["image_inspect"]["Id"]:
            raise ValueError("Recreated base differs from original attempt image")
        receipt["image_inspect"] = {key: inspected.get(key) for key in ["Id", "RepoDigests", "Os", "Architecture"]}
        for key in ["PIP_ONLY_BINARY", "UV_NO_BUILD", "npm_config_ignore_scripts"]:
            runtime.environment.pop(key, None)
        receipt["setup_status"] = "completed"
        stage = "restoration"
        candidate = CANDIDATES[args.task]
        repo = candidate["failed_root"] + "/" + candidate["repo_id"]
        # Ubuntu 20's older Git safety backport ignores command-line trust for
        # repository discovery. The original solver used this exact exception.
        runtime.exec("git config --global --add safe.directory " + shlex.quote(repo), "restore-git-trust")
        receipt["restored_git_config"] = {"safe.directory": repo, "scope": "global in disposable container"}
        git = "git -c " + shlex.quote("safe.directory=" + repo) + " -C " + shlex.quote(repo)
        for name, (path, digest) in files.items():
            destination = (candidate["failed_root"] if name == "failed_reasons.txt" else repo) + "/" + name
            run(["docker", "cp", str(path), container + ":" + destination], "restore-" + name)
            runtime.exec("printf '%s\\n' " + shlex.quote(digest + "  " + destination) + " | sha256sum -c -", "hash-" + name)
        for name in candidate["patches"]:
            patch = shlex.quote(repo + "/" + name)
            runtime.exec(git + " apply --check " + patch + " && " + git + " apply " + patch,
                         "apply-" + name)
        for name in candidate["patches"]:
            runtime.exec(git + " apply --reverse --check " + shlex.quote(repo + "/" + name), "reverse-check-" + name)
        runtime.exec(git + " rev-parse HEAD && " + git + " status --short && " + git + " diff --stat", "restored-status")
        stage = "verifier"
        runtime.grade(spec["config"].get("verifier", {}).get("timeout_sec", 900))
        run(["docker", "cp", container + ":/logs/verifier", str(output / "verifier")], "verifier-download")
        receipt.update(read_grade(output))
        receipt.update(status="scored", verifier_status="completed")
        receipt["task_outcome"] = "passed" if receipt["reward"] >= 1 else "partial" if receipt["reward"] > 0 else "failed"
    except Exception as error:
        receipt["status"] = stage + "_error"
        receipt[stage + "_status"] = "error"
        receipt["error"] = str(error)
        if any("build-gate:" in path.read_text(errors="replace")[-4000:] for path in output.glob("*.log")):
            receipt["status"] = "waiting_build_gate"
    finally:
        subprocess.run(["docker", "rm", "-f", container], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        receipt["finished_at"] = time.time()
        write_json(output / "receipt.json", receipt)
        if args.promote and receipt["status"] == "scored":
            write_json(source.parent / "receipt.json", receipt)
    print(json.dumps({key: receipt[key] for key in ["task", "status", "reward", "error", "attempt_dir"] if key in receipt}), flush=True)
    return 0 if receipt["status"] == "scored" else 1


if __name__ == "__main__":
    raise SystemExit(main())
