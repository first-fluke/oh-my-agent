#!/usr/bin/env python3
"""Run and resume every SkillsBench and WorkBuddy task."""

from __future__ import annotations

import argparse
from collections import Counter
import concurrent.futures
import fcntl
import hashlib
import json
import math
import os
from pathlib import Path
import signal
import subprocess
import sys
import threading
import time
import urllib.parse
import urllib.request

from skillsbench.infra_retry import repaired_ungraded_attempt

REPOSITORY = Path(__file__).resolve().parents[2]
DEFAULT_STATE = Path.home() / ".cache/oma-benchmarks/full-20261021"
STOP = threading.Event()


def load(path: Path) -> dict:
    for attempt in range(3):
        try:
            return json.loads(path.read_text()) if path.is_file() else {}
        except FileNotFoundError:
            return {}
        except json.JSONDecodeError:
            if attempt == 2:
                raise
            time.sleep(0.05)
    return {}


def save(path: Path, value: dict) -> None:
    temporary = path.with_name(f"{path.name}.{os.getpid()}.{threading.get_ident()}.tmp")
    temporary.write_text(json.dumps(value, ensure_ascii=False, indent=2) + "\n")
    temporary.replace(path)


def tasks(args: argparse.Namespace, benchmark: str) -> dict[str, dict]:
    if benchmark == "skillsbench":
        rows = load(args.skillsbench_dir / "checkpoint.json").get("tasks", {})
        for name, row in rows.items():
            if row.get("status") in ("scored", "running"):
                continue
            receipt = load(args.skillsbench_dir / "tasks" / name / "receipt.json")
            reward = receipt.get("reward")
            finished = receipt.get("finished_at")
            if (receipt.get("task") == name and receipt.get("status") == "scored"
                    and receipt.get("agent_status") == "completed"
                    and receipt.get("verifier_status") == "completed"
                    and isinstance(reward, (int, float)) and not isinstance(reward, bool)
                    and math.isfinite(reward) and 0 <= reward <= 1
                    and isinstance(finished, (int, float)) and not isinstance(finished, bool)
                    and math.isfinite(finished) and finished >= (row.get("finished_at") or 0)):
                row.update(status="scored", reward=reward, finished_at=finished,
                           task_outcome=receipt.get("task_outcome"),
                           recovered_from_receipt=str(args.skillsbench_dir / "tasks" / name / "receipt.json"))
                row.pop("error", None)
        return rows
    manifest = load(args.workbuddy_dir / "manifest.json")
    constraints = load(args.state_dir / "access-constraints.json").get("blocked_subsets", {})
    result = {}
    for task in manifest.get("tasks", []):
        row = dict(task)
        status = load(args.workbuddy_dir / task["subset"] / task["task"] / "status.json")
        row.update(status)
        if task["subset"] in constraints and row.get("status") != "scored":
            row.update(status="waiting_provider_access", access_constraint=constraints[task["subset"]])
        result[task["id"]] = row
    return result


def hydrate_skills_checkpoint(args: argparse.Namespace) -> None:
    """Merge verified regrades only between children, avoiding stale checkpoint writes."""
    path = args.skillsbench_dir / "checkpoint.json"
    checkpoint = load(path)
    rows = tasks(args, "skillsbench")
    if rows != checkpoint.get("tasks", {}):
        checkpoint["tasks"] = rows
        checkpoint["receipt_hydrated_at"] = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
        if "counts" in checkpoint:
            checkpoint["counts"] = dict(Counter(row.get("status", "pending") for row in rows.values()))
        save(path, checkpoint)


def summary(args: argparse.Namespace) -> dict:
    suites = {}
    for name, expected in (("skillsbench", 87), ("workbuddy", 260)):
        rows = tasks(args, name)
        counts = Counter(row.get("status", "pending") for row in rows.values())
        scores = []
        for row in rows.values():
            score = row.get("reward", row.get("score"))
            if (row.get("status") == "scored" and isinstance(score, (int, float))
                    and not isinstance(score, bool) and math.isfinite(score) and 0 <= score <= 1):
                scores.append(score)
        suites[name] = {"expected_tasks": expected, "registered_tasks": len(rows),
                        "counts": dict(counts), "valid_scores": len(scores),
                        "all_scored": len(rows) == expected and len(scores) == expected,
                        "mean_of_scored_tasks": sum(scores) / len(scores) if scores else None}
    return {"updated_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
            "expected_tasks": 347, "all_scored": all(s["all_scored"] for s in suites.values()),
            "suites": suites}


def command(args: argparse.Namespace, benchmark: str, name: str, retry: bool) -> list[str]:
    if benchmark == "skillsbench":
        result = [str(args.benchflow_python), "-B", "benchmarks/external/skillsbench/batch.py", "run",
                  "--run-dir", str(args.skillsbench_dir), "--runtime-replay", "--binary-only", "--published-prebuilt",
                  "--task", name, "--max-tasks", "1"]
    else:
        result = ["./benchmarks/external/workbuddy/run.sh", "suite", "run", "--output",
                  str(args.workbuddy_dir), "--judge-connection", str(args.state_dir / "judge-connection.json"),
                  "--allow-build", "--subsets", name.split("/", 1)[0],
                  "--task", name.split("/", 1)[1], "--max-tasks", "1"]
    if retry:
        result.append("--retry-errors")
    return result


def runner_hash(benchmark: str) -> str:
    names = ("batch.py", "docker_runtime.py", "grading.py", "model_errors.py", "published_images.py", "published_images.json", "recover_grade.py", "infra_retry.py") if benchmark == "skillsbench" else ("run.py", "suite.py")
    digest = hashlib.sha256()
    for name in names:
        path = REPOSITORY / "benchmarks/external" / benchmark / name
        digest.update(name.encode())
        digest.update(path.read_bytes())
    return digest.hexdigest()


def judge_ready(args: argparse.Namespace) -> tuple[bool, str]:
    """Check the judge without spending a model call or logging credentials."""
    try:
        connection = load(args.state_dir / "judge-connection.json")
        if not isinstance(connection, dict) or not isinstance(connection.get("host_url"), str):
            return False, "Judge connection is missing or invalid"
        parsed = urllib.parse.urlsplit(connection["host_url"])
        health_url = urllib.parse.urlunsplit((parsed.scheme, parsed.netloc, "/healthz", "", ""))
        with urllib.request.urlopen(health_url, timeout=5) as response:
            health = json.load(response)
        if isinstance(health, dict) and health.get("status") == "ok" and health.get("model") == connection.get("model"):
            return True, "ready"
        return False, "Judge health or model does not match the recorded connection"
    except (OSError, ValueError, KeyError) as error:
        return False, f"Judge preflight failed ({type(error).__name__})"


def handoff(args: argparse.Namespace, benchmark: str, state_file: Path, state: dict) -> None:
    """Finish the current model call before replacing the original batch loop."""
    if not args.handoff_pid:
        return
    expected = "batch.py" if benchmark == "skillsbench" else "suite.py"
    state.update(status="waiting_for_current_task", previous_pid=args.handoff_pid)
    save(state_file, state)
    target = args.handoff_task
    while not STOP.is_set():
        process = subprocess.run(["ps", "-p", str(args.handoff_pid), "-o", "args="],
                                 capture_output=True, text=True)
        if process.returncode != 0 or expected not in process.stdout:
            break
        rows = tasks(args, benchmark)
        current = rows.get(target, {})
        task_status = current.get("status", "pending")
        finished = task_status in ("scored", "error", "failed", "prerequisite_error", "prerequisite_blocked", "setup_error",
                                   "environment_error", "timeout", "judge_error", "agent_error",
                                   "verifier_error") or task_status.startswith(("waiting_", "blocked_"))
        if finished:
            # A following task may have reached setup; never interrupt another model call.
            if benchmark == "workbuddy":
                active = [name for name, row in rows.items() if row.get("status") == "running_agent"]
                another_agent = bool(active)
            else:
                progress = args.skillsbench_dir / "progress.jsonl"
                last = {}
                if progress.is_file():
                    for line in progress.read_text().splitlines()[-20:]:
                        try:
                            event = json.loads(line)
                        except json.JSONDecodeError:
                            continue
                        if event.get("event") == "step_started":
                            last = event
                another_agent = last.get("step") == "agent" and any(
                    r.get("status") == "running" for r in rows.values())
                active = [name for name, row in rows.items() if row.get("status") == "running"]
            if another_agent:
                target = active[0]
                state["handoff_task"] = target
                save(state_file, state)
            if not another_agent:
                os.killpg(args.handoff_pid, signal.SIGINT)
                for _ in range(30):
                    time.sleep(1)
                    check = subprocess.run(["ps", "-p", str(args.handoff_pid), "-o", "args="],
                                           capture_output=True, text=True)
                    if check.returncode != 0 or expected not in check.stdout:
                        break
                else:
                    raise RuntimeError("Previous batch has not exited; new tasks were not started")
                break
        time.sleep(1)
    state.update(status="running", previous_pid=None)
    save(state_file, state)


def run_suite(args: argparse.Namespace, benchmark: str) -> dict:
    lock_file = (args.state_dir / f"{benchmark}.supervisor.lock").open("a")
    try:
        fcntl.flock(lock_file, fcntl.LOCK_EX | fcntl.LOCK_NB)
    except BlockingIOError:
        raise RuntimeError(f"Another {benchmark} supervisor is running")
    state_file = args.state_dir / f"{benchmark}-supervisor.json"
    source_hash = hashlib.sha256(Path(__file__).read_bytes()).hexdigest()
    previous = load(state_file)
    reloading = os.environ.pop("OMA_FULL_RUN_RELOAD", None) == benchmark
    history = (previous.get("attempted", [])
               if reloading and previous.get("pid") == os.getpid() else [])
    state = {"benchmark": benchmark, "pid": os.getpid(), "status": "running", "attempted": history,
             "source_sha256": source_hash}
    save(state_file, state)
    handoff(args, benchmark, state_file, state)
    attempted = {row["task"] for row in history}
    attempted_runners = {row["task"]: row.get("runner_sha256") for row in history}
    while not STOP.is_set():
        if benchmark == "skillsbench":
            hydrate_skills_checkpoint(args)
        rows = tasks(args, benchmark)
        quota_tasks = [name for name, row in rows.items() if row.get("status") == "waiting_model_quota"]
        if quota_tasks:
            state.update(status="waiting_model_quota", next_retry_at=time.time() + args.quota_retry_seconds)
            save(state_file, state)
            deadline = time.monotonic() + args.quota_retry_seconds
            while not STOP.is_set() and time.monotonic() < deadline:
                STOP.wait(min(30, max(0, deadline - time.monotonic())))
            if STOP.is_set():
                break
            attempted.discard(quota_tasks[0])
            candidates = [quota_tasks[0]]
            state.update(status="running", next_retry_at=None)
        else:
            candidates = []
            current_runner = runner_hash(benchmark)
            published_tasks = load(REPOSITORY / "benchmarks/external/skillsbench/published_images.json").get("tasks", {}) if benchmark == "skillsbench" else {}
            for name, row in rows.items():
                status = row.get("status", "pending")
                setup_fixed = (benchmark == "skillsbench" and args.retry_errors
                               and (status == "setup_error" or (status == "waiting_build_gate" and name in published_tasks)
                                    or (name in published_tasks and repaired_ungraded_attempt(name, row, args.skillsbench_dir)))
                               and attempted_runners.get(name) != current_runner)
                if (name in attempted and status != "pending" and not setup_fixed) or status in ("scored", "waiting_provider_access"):
                    continue
                if status == "pending" or (args.retry_errors and status != "scored"):
                    candidates.append(name)
        if not candidates:
            break
        if benchmark == "workbuddy":
            priority = {name: index for index, name in enumerate(args.workbuddy_first)}
            candidates.sort(key=lambda name: priority.get(name, len(priority)))
        name = candidates[0]
        if benchmark == "workbuddy" and name.split("/", 1)[0] in ("office", "web"):
            ready, reason = judge_ready(args)
            if not ready:
                state.update(status="waiting_judge", task=name, child_pid=None, error=reason)
                save(state_file, state)
                STOP.wait(30)
                continue
            state.update(status="running")
            state.pop("error", None)
        status_before = rows[name].get("status", "pending")
        retry = status_before != "pending"
        argv = command(args, benchmark, name, retry)
        child_source_hash = runner_hash(benchmark)
        stamp = time.strftime("%Y%m%dT%H%M%SZ", time.gmtime())
        log_path = args.state_dir / f"{benchmark}-{stamp}.log"
        env = dict(os.environ, LLM_JUDGE_MAX_CONCURRENT="1", LLM_JUDGE_TIMEOUT_SEC="600",
                   WEB_BENCH_LLM_TIMEOUT_SEC="600", WEB_BENCH_LLM_TIMEOUT_CAP_SEC="600",
                   WEB_BENCH_LLM_WALL_TIMEOUT_EXTRA_SEC="90")
        with log_path.open("a") as log:
            child = subprocess.Popen(argv, cwd=REPOSITORY, stdin=subprocess.DEVNULL, stdout=log,
                                     stderr=subprocess.STDOUT, env=env, start_new_session=True)
            state.update(task=name, child_pid=child.pid, command=argv, log=str(log_path),
                         runner_sha256=child_source_hash)
            save(state_file, state)
            exit_code = child.wait()
        attempted.add(name)
        attempted_runners[name] = child_source_hash
        state["attempted"].append({"task": name, "exit_code": exit_code,
                                    "runner_sha256": child_source_hash,
                                    "status": tasks(args, benchmark).get(name, {}).get("status", "missing")})
        state.update(child_pid=None, last_exit_code=exit_code)
        save(state_file, state)
        save(args.state_dir / f"{benchmark}-summary.json", summary(args)["suites"][benchmark])
        if (args.benchmark != "both" and not STOP.is_set()
                and (hashlib.sha256(Path(__file__).read_bytes()).hexdigest() != source_hash
                     or runner_hash(benchmark) != child_source_hash)):
            os.environ["OMA_FULL_RUN_RELOAD"] = benchmark
            os.execv(sys.executable, [sys.executable, *sys.argv])
        if tasks(args, benchmark).get(name, {}).get("status", "pending") == "pending":
            state["status"] = "runner_error"
            state["error"] = f"Task made no checkpoint progress; inspect {log_path}"
            save(state_file, state)
            return state
    state.update(status="stopped" if STOP.is_set() else "queue_pass_finished", child_pid=None)
    save(state_file, state)
    return state


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("mode", choices=("run", "status"))
    parser.add_argument("--benchmark", choices=("skillsbench", "workbuddy", "both"), default="both")
    parser.add_argument("--state-dir", type=Path, default=DEFAULT_STATE)
    parser.add_argument("--skillsbench-dir", type=Path,
                        default=REPOSITORY / "benchmarks/external/skillsbench/results/full-v1.1-20261021")
    parser.add_argument("--workbuddy-dir", type=Path, default=Path.home() / ".cache/oma-benchmarks/workbuddy-full")
    parser.add_argument("--benchflow-python", type=Path,
                        default=Path.home() / ".local/share/uv/tools/benchflow/bin/python")
    parser.add_argument("--retry-errors", action="store_true", help="Retry each unscored task once this pass")
    parser.add_argument("--workbuddy-first", action="append", default=[], metavar="SUBSET/TASK",
                        help="Run this unscored WorkBuddy task before the remaining inventory; repeatable")
    parser.add_argument("--handoff-pid", type=int, help="Replace an existing batch after its current task")
    parser.add_argument("--handoff-task", help="Current task ID of the batch being replaced")
    parser.add_argument("--quota-retry-seconds", type=int, default=900)
    args = parser.parse_args()
    if args.quota_retry_seconds < 1:
        parser.error("quota retry interval must be positive")
    if args.mode == "status":
        print(json.dumps(summary(args), ensure_ascii=False, indent=2))
        return
    args.state_dir.mkdir(parents=True, exist_ok=True)
    signal.signal(signal.SIGINT, lambda *_: STOP.set())
    signal.signal(signal.SIGTERM, lambda *_: STOP.set())
    selected = ["skillsbench", "workbuddy"] if args.benchmark == "both" else [args.benchmark]
    if args.handoff_pid and (len(selected) != 1 or not args.handoff_task):
        parser.error("handoff requires one benchmark and its current task ID")
    for name in selected:
        if len(tasks(args, name)) != (87 if name == "skillsbench" else 260):
            parser.error(f"The complete {name} inventory is required before running")
    if any(name not in tasks(args, "workbuddy") for name in args.workbuddy_first):
        parser.error("Unknown WorkBuddy priority task")
    with concurrent.futures.ThreadPoolExecutor(max_workers=len(selected)) as pool:
        results = list(pool.map(lambda name: run_suite(args, name), selected))
    final = summary(args)
    save(args.state_dir / "summary.json", final)
    print(json.dumps({"supervisors": results, "summary": final}, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
