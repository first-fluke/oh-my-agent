#!/usr/bin/env python3
"""Inventory and resume all 87 pinned SkillsBench tasks, using OMA on the host."""

import argparse
from collections import Counter
import fcntl
import hashlib
import json
import os
from pathlib import Path
import shutil
import signal
import subprocess
import time
import tomllib
import uuid

from docker_runtime import DockerRuntime, inspect_task
from grading import read_grade
from model_errors import terminal_provider_access_failure, terminal_quota_failure
from published_images import published_image


def write_json(path, value):
    temporary = path.with_suffix(".tmp")
    temporary.write_text(json.dumps(value, ensure_ascii=False, indent=2) + "\n")
    temporary.replace(path)


def digest_tree(root):
    digests = {str(p.relative_to(root)): hashlib.sha256(p.read_bytes()).hexdigest()
               for p in sorted(root.rglob("*")) if p.is_file()}
    return hashlib.sha256(json.dumps(digests, sort_keys=True).encode()).hexdigest()


def initialize(args):
    args.run_dir.mkdir(parents=True, exist_ok=True)
    task_root = args.checkout / "tasks"
    inventory = []
    for task in sorted(task_root.iterdir()):
        if task.is_dir():
            try:
                spec = inspect_task(task)
            except Exception as error:
                spec = {"task": task.name, "blockers": [{"kind": "unsupported_task_environment", "error": str(error)}]}
            inventory.append(spec)
    if len(inventory) != 87:
        raise RuntimeError(f"Pinned SkillsBench v1.1 must have 87 tasks, found {len(inventory)}")
    write_json(args.run_dir / "inventory.json", inventory)
    checkpoint_path = args.run_dir / "checkpoint.json"
    actual_commit = subprocess.check_output(["git", "-C", str(args.checkout), "rev-parse", "HEAD"], text=True).strip()
    if not actual_commit.startswith("b63b7b2"):
        raise RuntimeError("Current checkout must remain pinned to SkillsBench v1.1 commit b63b7b2")
    dirty_tasks = subprocess.check_output(["git", "-C", str(args.checkout), "status", "--porcelain", "--untracked-files=no", "--", "tasks"], text=True)
    if dirty_tasks.strip():
        raise RuntimeError("Tracked benchmark task/environment/verifier files changed; restore the pinned source before resuming")
    checkpoint = json.loads(checkpoint_path.read_text()) if checkpoint_path.exists() else {
        "benchmark": "skillsbench", "task_set": "v1.1-all-87", "canonical_benchmark": False,
        "upstream_commit": actual_commit,
        "model_concurrency": 1, "created_at": time.time(),
        "condition": "fixed-oma-snapshot-host-agent-driving-task-container",
        "tasks": {spec["task"]: {"status": "pending"} for spec in inventory}}
    if checkpoint["upstream_commit"] != actual_commit:
        raise RuntimeError("Expected pinned SkillsBench v1.1 commit b63b7b2")
    if not checkpoint_path.exists():
        write_json(checkpoint_path, checkpoint)
    return inventory, checkpoint


def snapshot_oma(args, checkpoint):
    snapshot = args.run_dir / "oma-snapshot"
    if not snapshot.exists():
        snapshot.mkdir()
        for name in [".agents", ".codex", "AGENTS.md"]:
            source = args.oma_seed / name
            if source.is_dir():
                shutil.copytree(source, snapshot / name, symlinks=False,
                                ignore=shutil.ignore_patterns("state", "results", "backup", "__pycache__", ".DS_Store"))
            elif source.is_file():
                shutil.copy2(source, snapshot / name)
        checkpoint["oma_snapshot_sha256"] = digest_tree(snapshot)
        checkpoint["oma_cli_version"] = subprocess.check_output(["oma", "--version"], text=True).strip()
        checkpoint["codex_cli_version"] = subprocess.check_output(["codex", "--version"], text=True).strip()
    if digest_tree(snapshot) != checkpoint.get("oma_snapshot_sha256"):
        raise RuntimeError("OMA snapshot changed; start a separate run")
    if "configured_model" not in checkpoint:
        config_path = Path(os.environ.get("CODEX_HOME", str(Path.home() / ".codex"))) / "config.toml"
        config = tomllib.loads(config_path.read_text()) if config_path.exists() else {}
        checkpoint["configured_model"] = config.get("model")
        checkpoint["configured_reasoning_effort"] = config.get("model_reasoning_effort")
    return snapshot


def execute_task(args, spec, snapshot, progress):
    task_name = spec["task"]
    task = args.checkout / "tasks" / task_name
    case = args.run_dir / "tasks" / task_name
    case.mkdir(parents=True, exist_ok=True)
    attempt = case / ("attempt-" + time.strftime("%Y%m%dT%H%M%SZ", time.gmtime()))
    attempt.mkdir()
    workspace = args.work_root / args.run_dir.name / task_name / attempt.name
    shutil.copytree(snapshot, workspace)
    container = "oma-skillsbench-batch-" + uuid.uuid4().hex[:12]
    receipt = {"task": task_name, "status": "running", "started_at": time.time(),
               "attempt_dir": str(attempt), "container": container, "workspace": str(workspace),
               "task_sha256": hashlib.sha256((task / "task.md").read_bytes()).hexdigest(),
               "dockerfile_sha256": hashlib.sha256((task / "environment/Dockerfile").read_bytes()).hexdigest(),
               "verifier_tree_sha256": digest_tree(task / "verifier"),
               "setup_status": "pending", "agent_status": "pending", "verifier_status": "pending",
               "oracle_status": "not-run", "canonical_benchmark": False, "hook_activation": "unverified",
               "requested_resources": spec["config"].get("environment", {}),
               "hidden_data_isolation": "Host workspace is not OS isolation; upstream cache remains host-readable",
               "steps": {}, "commands": []}
    stage = "setup"

    def run(command, label, *, timeout=600, check=True, stdin=None, cwd=None):
        receipt["commands"].append(command)
        progress({"event": "step_started", "task": task_name, "step": label})
        path = attempt / (label + ".log")
        process = subprocess.Popen(command, stdin=subprocess.PIPE if stdin is not None else subprocess.DEVNULL,
                                   stdout=path.open("w"), stderr=subprocess.STDOUT, text=True,
                                   cwd=cwd, start_new_session=True)
        try:
            process.communicate(stdin, timeout=timeout)
        except subprocess.TimeoutExpired:
            os.killpg(process.pid, signal.SIGTERM)
            try:
                process.wait(timeout=10)
            except subprocess.TimeoutExpired:
                os.killpg(process.pid, signal.SIGKILL)
            raise TimeoutError(f"{label} exceeded {timeout} seconds")
        receipt["steps"][label] = {"exit_code": process.returncode}
        if check and process.returncode:
            raise RuntimeError(f"{label} exit {process.returncode}; see {path}")
        return process.returncode

    runtime = DockerRuntime(task, spec, container, run, native_build=not args.runtime_replay, binary_only=args.binary_only or args.runtime_replay)
    try:
        if runtime.published:
            receipt["published_image"] = runtime.published
        runtime.prepare()
        # Binary-only restrictions apply to alternate environment preparation.
        # Preserve the unmodified official verifier's own dependency behavior.
        for key in ["PIP_ONLY_BINARY", "UV_NO_BUILD", "npm_config_ignore_scripts"]:
            runtime.environment.pop(key, None)
        receipt["setup_status"] = "completed"
        inspected = json.loads(subprocess.check_output(["docker", "image", "inspect", runtime.image], text=True))[0]
        receipt["image_inspect"] = {key: inspected.get(key) for key in ["Id", "RepoDigests", "Architecture", "Os"]}
        receipt["environment_execution"] = ("published-official-task-image" if runtime.published else
                                             "native-official-Dockerfile-build" if runtime.native_build else "runtime-instruction-replay")
        stage = "agent"
        original_prompt = (task / "task.md").read_text().split("---", 2)[2].strip()
        environment_file = workspace / "task-environment.env"
        environment_file.write_text("".join(key + "=" + value + "\n" for key, value in runtime.environment.items()))
        docker_exec = "docker exec" + (" --env-file " + str(environment_file) if runtime.environment else "") + " " + container
        bridge = (f"This benchmark task runs in the already prepared Docker container {container}. "
                  f"Its working directory is {runtime.workdir}. All paths in the task refer to that container. "
                  f"Use {docker_exec} bash -c 'COMMAND' and docker cp to work there. Always include that env-file when supplied; it preserves the Dockerfile's environment. "
                  "Read the OMA AGENTS.md and applicable skills in this host workspace. Do not access any benchmark oracle or verifier or upstream cache. " +
                  "The user explicitly authorizes builds required by this benchmark task, including software compilation and packaging. Do not change or bypass the host build gate; report any actual gate denial. " +
                  "Create all requested outputs inside the task container. You may inspect input files and run task checks there.\n\n")
        (attempt / "prompt.txt").write_text(bridge + original_prompt)
        agent_command = ["codex", "exec", "--json", "--skip-git-repo-check", "--ephemeral",
                         "-c", 'approval_policy="never"', "-s", "danger-full-access", "-C", str(workspace)]
        if args.configured_model:
            agent_command += ["--model", args.configured_model]
        if args.configured_reasoning_effort:
            agent_command += ["-c", "model_reasoning_effort=" + json.dumps(args.configured_reasoning_effort)]
        receipt["configured_model"] = args.configured_model
        receipt["configured_reasoning_effort"] = args.configured_reasoning_effort
        code = run(agent_command + ["-"],
                   "agent", timeout=args.agent_timeout or spec["config"].get("agent", {}).get("timeout_sec", 900),
                   stdin=bridge + original_prompt, cwd=workspace, check=False)
        if terminal_quota_failure(attempt / "agent.log"):
            receipt["agent_status"] = "waiting_model_quota"
            receipt["status"] = "waiting_model_quota"
            raise RuntimeError("Codex reported a terminal usage/quota limit; remaining tasks are pending")
        if terminal_provider_access_failure(attempt / "agent.log"):
            receipt["agent_status"] = "blocked"
            receipt["status"] = "waiting_provider_access"
            receipt["provider_access_reason"] = "cybersecurity_review"
            raise RuntimeError("Provider rejected task content for possible cybersecurity risk; access change required before retrying")
        receipt["agent_status"] = "completed" if code == 0 else "error"
        if code:
            raise RuntimeError(f"Agent exited {code}; no task score synthesized")
        for line in (attempt / "agent.log").read_text().splitlines():
            try:
                event = json.loads(line)
            except ValueError:
                continue
            if event.get("type") == "turn.completed":
                receipt["usage"] = event.get("usage")
        stage = "verifier"
        receipt["verifier_runtime_environment"] = runtime.grade_environment()
        runtime.grade(spec["config"].get("verifier", {}).get("timeout_sec", 900))
        run(["docker", "cp", container + ":/logs/verifier", str(attempt / "verifier")], "verifier-download")
        receipt.update(read_grade(attempt))
        receipt["verifier_status"] = "completed"
        receipt["status"] = "scored"
        receipt["task_outcome"] = "passed" if receipt["reward"] >= 1 else "partial" if receipt["reward"] > 0 else "failed"
    except Exception as error:
        if receipt["status"] not in {"waiting_model_quota", "waiting_provider_access"}:
            receipt["status"] = stage + "_error"
            receipt[stage + "_status"] = "error"
        receipt["error"] = str(error)
        if any("build-gate:" in path.read_text(errors="replace")[-4000:] for path in attempt.glob("*.log")):
            receipt["status"] = "waiting_build_gate"
            receipt[stage + "_status"] = "blocked"
    finally:
        subprocess.run(["docker", "rm", "-f", container], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        if runtime.cleanup_image:
            subprocess.run(["docker", "image", "rm", runtime.image], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        receipt["finished_at"] = time.time()
        write_json(attempt / "receipt.json", receipt)
        write_json(case / "receipt.json", receipt)
    return receipt


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("command", choices=["inventory", "run", "status", "regrade"])
    parser.add_argument("--checkout", type=Path, default=Path.home() / ".cache/oma-benchmarks/skillsbench-v1.1")
    parser.add_argument("--run-dir", type=Path, required=True)
    parser.add_argument("--oma-seed", type=Path, default=Path.home() / ".cache/oma-benchmarks/skillsbench-oma-seed")
    parser.add_argument("--work-root", type=Path, default=Path.home() / ".cache/oma-benchmarks/full-workspaces")
    parser.add_argument("--max-tasks", type=int, default=87)
    parser.add_argument("--agent-timeout", type=int)
    parser.add_argument("--retry-errors", action="store_true")
    parser.add_argument("--task", "--include", dest="include", action="append", help="Limit this invocation to exact task IDs; all 87 remain in the checkpoint")
    parser.add_argument("--attempt-dir", type=Path, help="Reparse existing official grader artifacts without model calls or checkpoint changes")
    parser.add_argument("--runtime-replay", action="store_true", help="Use restricted no-image-build runtime replay instead of the official Dockerfile build")
    parser.add_argument("--binary-only", action="store_true", help="Restrict Python installations to wheels; default preserves original task source installs")
    parser.add_argument("--published-prebuilt", action="store_true", help="Use approved pinned task images with exact source or verified cache-only recipe differences")
    args = parser.parse_args()
    args.run_dir = args.run_dir.resolve()
    if args.command == "regrade":
        if not args.attempt_dir:
            parser.error("regrade requires --attempt-dir")
        print(json.dumps(read_grade(args.attempt_dir), ensure_ascii=False), flush=True)
        return
    if args.command == "status":
        checkpoint = json.loads((args.run_dir / "checkpoint.json").read_text())
        print(json.dumps({"run_dir": str(args.run_dir), "tasks": len(checkpoint["tasks"]),
                          "counts": dict(Counter(task["status"] for task in checkpoint["tasks"].values()))}), flush=True)
        return
    if args.command == "run":
        args.run_dir.mkdir(parents=True, exist_ok=True)
        lock = (args.run_dir / ".runner.lock").open("w")
        try:
            fcntl.flock(lock, fcntl.LOCK_EX | fcntl.LOCK_NB)
        except BlockingIOError:
            raise SystemExit("Another runner owns this run directory")
    inventory, checkpoint = initialize(args)
    def save():
        checkpoint["updated_at"] = time.time()
        checkpoint["counts"] = dict(Counter(task["status"] for task in checkpoint["tasks"].values()))
        write_json(args.run_dir / "checkpoint.json", checkpoint)
    def progress(event):
        event["time"] = time.time()
        with (args.run_dir / "progress.jsonl").open("a") as log:
            log.write(json.dumps(event, ensure_ascii=False) + "\n")
        print(json.dumps(event, ensure_ascii=False), flush=True)
    if args.command == "run":
        snapshot = snapshot_oma(args, checkpoint)
        args.configured_model = checkpoint.get("configured_model")
        args.configured_reasoning_effort = checkpoint.get("configured_reasoning_effort")
        write_json(args.run_dir / "runner.json", {"pid": os.getpid(), "started_at": time.time(), "concurrency": 1})
        started = 0
        for spec in inventory:
            if args.include and spec["task"] not in args.include:
                continue
            current = checkpoint["tasks"][spec["task"]]
            retryable = current["status"].endswith("_error") or current["status"] == "waiting_model_quota"
            if current["status"] not in {"pending", "running", "prerequisite_blocked", "waiting_build_gate"} and not (args.retry_errors and retryable):
                continue
            # Reclassify a recorded pre-fix provider rejection before any retry.
            # This branch reads the original terminal log and never starts a solver.
            if current["status"] == "agent_error":
                receipt_path = args.run_dir / "tasks" / spec["task"] / "receipt.json"
                if receipt_path.exists():
                    previous = json.loads(receipt_path.read_text())
                    previous_attempt = Path(previous["attempt_dir"]).resolve()
                    if not previous_attempt.is_relative_to(receipt_path.parent.resolve()):
                        raise ValueError("Prior agent receipt points outside the task result directory")
                    previous_log = previous_attempt / "agent.log"
                    if previous.get("provider_access_reason") and not previous_log.exists():
                        raise ValueError("Provider-blocked task has no retained log; refusing a new request")
                    if previous_log.exists() and terminal_provider_access_failure(previous_log):
                        previous.update(status="waiting_provider_access", agent_status="blocked",
                                        provider_access_reason="cybersecurity_review",
                                        previous_status=previous.get("previous_status", previous["status"]))
                        write_json(receipt_path, previous)
                        checkpoint["tasks"][spec["task"]] = {
                            "status": "waiting_provider_access", "provider_access_reason": "cybersecurity_review",
                            "error": "Provider rejected task content for possible cybersecurity risk; not retried",
                            "finished_at": previous["finished_at"],
                        }
                        save()
                        progress({"event": "provider_denial_reclassified", "task": spec["task"]})
                        started += 1
                        continue
            if args.published_prebuilt:
                try:
                    spec["published_image"] = published_image(args.checkout / "tasks" / spec["task"])
                except (ValueError, subprocess.CalledProcessError) as error:
                    checkpoint["tasks"][spec["task"]] = {"status": "prerequisite_blocked", "error": str(error)}
                    save()
                    continue
            blocked_kinds = {"gpu_required", "unsupported_task_environment"}
            if args.runtime_replay and not spec.get("published_image"):
                blocked_kinds |= {"unsupported_multistage", "unsupported_stage_copy"}
            if (args.binary_only or args.runtime_replay) and not spec.get("published_image"):
                blocked_kinds |= {"source_build_required"}
            active_blockers = [blocker for blocker in spec["blockers"] if blocker["kind"] in blocked_kinds]
            if active_blockers:
                source_build = any(blocker["kind"] in {"source_build_required", "verifier_build_required"} for blocker in active_blockers)
                checkpoint["tasks"][spec["task"]] = {"status": "waiting_build_gate" if source_build else "prerequisite_blocked", "blockers": active_blockers}
                save()
                continue
            if started >= args.max_tasks:
                break
            checkpoint["tasks"][spec["task"]] = {"status": "running", "started_at": time.time()}
            checkpoint.pop("queue_status", None)
            save()
            progress({"event": "task_started", "task": spec["task"]})
            receipt = execute_task(args, spec, snapshot, progress)
            checkpoint["tasks"][spec["task"]] = {key: receipt[key] for key in ["status", "reward", "error", "task_outcome", "finished_at"] if key in receipt}
            save()
            progress({"event": "task_finished", "task": spec["task"], **checkpoint["tasks"][spec["task"]]})
            started += 1
            if receipt["status"] == "waiting_model_quota":
                checkpoint["queue_status"] = "waiting_model_quota"
                save()
                progress({"event": "queue_waiting_model_quota", "task": spec["task"]})
                break
    if args.command == "run":
        save()
    else:
        checkpoint["counts"] = dict(Counter(task["status"] for task in checkpoint["tasks"].values()))
    print(json.dumps({"run_dir": str(args.run_dir), "tasks": len(inventory), "counts": checkpoint["counts"],
                      "restricted_runtime_prerequisites": sum(bool(spec["blockers"]) for spec in inventory)}, ensure_ascii=False), flush=True)
    if args.command == "run":
        lock.close()


if __name__ == "__main__":
    main()
