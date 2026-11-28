#!/usr/bin/env python3
"""Paired control/treatment runs of a Harbor dataset: bare host CLI vs host + OMA.

`plan` freezes the pins and a seeded task order before any trial runs.
`run` executes batches from that order, both arms concurrently on the same
tasks, and stops at the first model-quota failure. Raw jobs stay outside the
repository; `analyze.py` turns them into the committed summary.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import os
import random
import shutil
import subprocess
import sys
import time
import tomllib
from pathlib import Path

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
from analyze import load_trials  # noqa: E402

HOSTS = {
    "codex": {
        "arms": {"control": "codex", "treatment": "oma_agent:OmaCodex"},
        "model": "openai/gpt-6.2-sol",
    },
    "claude": {
        "arms": {"control": "claude-code", "treatment": "oma_agent:OmaClaudeCode"},
        "model": "anthropic/claude-sonnet-5-5",
    },
}
RETRY_BATCH_BASE = 90
CLAUDE_TOKEN_FILE = Path.home() / ".cache" / "oma-benchmarks" / "claude-oauth-token"


def tree_digest(root: Path) -> str:
    digest = hashlib.sha256()
    for path in sorted(p for p in root.rglob("*") if p.is_file()):
        digest.update(str(path.relative_to(root)).encode())
        digest.update(hashlib.sha256(path.read_bytes()).digest())
    return digest.hexdigest()


def harbor_bin() -> str:
    found = os.environ.get("HARBOR_BIN") or shutil.which("harbor")
    if not found:
        sys.exit("harbor not found: set HARBOR_BIN or install it (uv tool install harbor)")
    return found


def plan(args: argparse.Namespace) -> None:
    run_dir: Path = args.run_dir
    plan_path = run_dir / "plan.json"
    if plan_path.exists():
        sys.exit(f"{plan_path} exists; a plan is frozen once written")
    dataset_dir = run_dir / "dataset"
    subprocess.run(
        [harbor_bin(), "dataset", "download", args.dataset, "-o", str(dataset_dir)],
        check=True,
    )
    task_root = next(p for p in dataset_dir.iterdir() if p.is_dir())
    tasks = []
    for task in sorted(p for p in task_root.iterdir() if (p / "task.toml").exists()):
        config = tomllib.loads((task / "task.toml").read_text())
        metadata = config.get("metadata", {})
        environment = config.get("environment", {})
        entry = {
            "name": task.name,
            "difficulty": metadata.get("difficulty"),
            "category": metadata.get("category"),
            "agent_timeout_sec": config.get("agent", {}).get("timeout_sec"),
            "cpus": environment.get("cpus"),
            "memory_mb": environment.get("memory_mb"),
            "gpus": environment.get("gpus") or 0,
        }
        # Tasks are never run with resource overrides. A task is eligible only
        # when its declared requirements fit the host with both arms side by side.
        entry["eligible"] = (
            entry["gpus"] <= args.max_gpus
            and (args.max_memory_mb is None or (entry["memory_mb"] or 0) <= args.max_memory_mb)
            and (args.max_cpus is None or (entry["cpus"] or 0) <= args.max_cpus)
        )
        tasks.append(entry)
    order = [task["name"] for task in tasks if task["eligible"]]
    random.Random(args.seed).shuffle(order)
    batches = [order[i : i + args.batch_size] for i in range(0, len(order), args.batch_size)]
    version = subprocess.check_output([harbor_bin(), "--version"], text=True).strip()
    frozen = {
        "created_at_utc": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "dataset": args.dataset,
        "dataset_tree_sha256": tree_digest(task_root),
        "dataset_path": str(task_root),
        "harbor_version": version,
        "host": args.host,
        "model": args.model or HOSTS[args.host]["model"],
        "reasoning_effort": args.effort or "default",
        "agent_version": args.agent_version,
        "oma_version": args.oma_version,
        "attempts_per_task": args.attempts,
        "concurrency_per_arm": args.concurrency,
        "agent_setup_timeout_multiplier": args.setup_multiplier,
        "seed": args.seed,
        "batch_size": args.batch_size,
        "eligibility": {"max_cpus": args.max_cpus, "max_memory_mb": args.max_memory_mb, "max_gpus": args.max_gpus},
        "eligible_tasks": len(order),
        "arms": HOSTS[args.host]["arms"],
        "tasks": tasks,
        "batches": batches,
    }
    plan_path.write_text(json.dumps(frozen, indent=2) + "\n")
    print(f"{len(order)} eligible of {len(tasks)} tasks in {len(batches)} batches -> {plan_path}")


def amend(run_dir: Path, frozen: dict, key: str, value: str, reason: str) -> None:
    """Record an infrastructure change made after the plan was frozen."""
    if frozen.get(key) == value:
        return
    frozen.setdefault("amendments", []).append(
        {
            "at_utc": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
            "key": key,
            "from": frozen.get(key),
            "to": value,
            "reason": reason,
        }
    )
    frozen[key] = value
    (run_dir / "plan.json").write_text(json.dumps(frozen, indent=2) + "\n")


def harbor_command(frozen: dict, run_dir: Path, arm: str, batch: int, tasks: list[str]) -> list[str]:
    environment = ["-e", frozen["environment"]] if frozen.get("environment") else []
    command = [
        harbor_bin(), "run",
        "-p", frozen["dataset_path"],
        "-a", frozen["arms"][arm],
        "-m", frozen["model"],
        "--ak", f"version={frozen.get('agent_version') or frozen['codex_version']}",
        "-k", str(frozen["attempts_per_task"]),
        "-n", str(frozen["concurrency_per_arm"]),
        "--agent-setup-timeout-multiplier", str(frozen["agent_setup_timeout_multiplier"]),
        "-o", str(run_dir / "jobs"),
        "--job-name", f"b{batch:02d}-{arm}",
        "-q", "-y",
        *environment,
    ]
    if frozen["reasoning_effort"] not in {"default", "codex-default"}:
        command += ["--effort", frozen["reasoning_effort"]]
    for task in tasks:
        command += ["-i", task]
    return command


def job_finished(job_dir: Path) -> bool:
    """Harbor writes result.json while a job runs; only a finished one counts."""
    path = job_dir / "result.json"
    if not path.exists():
        return False
    data = json.loads(path.read_text())
    stats = data.get("stats", {})
    return bool(data.get("finished_at")) and not stats.get("n_pending_trials") and not stats.get("n_running_trials")


def host_env(host: str) -> dict[str, str]:
    """Runner environment with subscription login only: API keys are removed."""
    blocked = {"OPENAI_API_KEY", "CODEX_API_KEY", "ANTHROPIC_API_KEY", "ANTHROPIC_AUTH_TOKEN"}
    env = {k: v for k, v in os.environ.items() if k not in blocked}
    if host == "codex":
        auth = env.get("CODEX_AUTH_JSON_PATH") or str(Path(env.get("CODEX_HOME", Path.home() / ".codex")) / "auth.json")
        if not Path(auth).is_file():
            sys.exit(f"Codex auth.json not found at {auth}")
        env["CODEX_AUTH_JSON_PATH"] = auth
        return env
    token = env.get("CLAUDE_CODE_OAUTH_TOKEN", "").strip()
    if not token and CLAUDE_TOKEN_FILE.is_file():
        token = CLAUDE_TOKEN_FILE.read_text().strip()
    if not token:
        sys.exit(f"Claude subscription token not found: run `claude setup-token` and save it to {CLAUDE_TOKEN_FILE}")
    # Harbor forwards several CLAUDE_*/ANTHROPIC_* settings from the caller's
    # shell (thinking, effort, output limits). Drop them so a trial does not
    # inherit the settings of the session that launched the run.
    env = {k: v for k, v in env.items() if not k.startswith(("CLAUDE", "ANTHROPIC", "MAX_THINKING"))}
    env["CLAUDE_CODE_OAUTH_TOKEN"] = token
    env["CLAUDE_FORCE_OAUTH"] = "1"
    return env


def run(args: argparse.Namespace) -> None:
    run_dir: Path = args.run_dir
    frozen = json.loads((run_dir / "plan.json").read_text())
    arms = frozen["arms"]
    env = host_env(frozen.get("host", "codex"))
    env["OMA_BENCH_OMA_VERSION"] = frozen["oma_version"]
    env["PYTHONPATH"] = str(HERE) + os.pathsep + env.get("PYTHONPATH", "")
    (run_dir / "logs").mkdir(exist_ok=True)
    if args.environment:
        amend(run_dir, frozen, "environment", args.environment, args.environment_reason or "unspecified")

    def launch(index: int, per_arm: dict[str, list[str]]) -> None:
        print(f"batch {index}: " + ", ".join(f"{arm} {len(tasks)}" for arm, tasks in per_arm.items()), flush=True)
        processes = []
        for arm, tasks in per_arm.items():
            job_dir = run_dir / "jobs" / f"b{index:02d}-{arm}"
            if job_dir.exists():
                # An interrupted job is rerun from scratch, keeping the old attempt.
                job_dir.rename(job_dir.with_name(f"{job_dir.name}.interrupted-{int(time.time())}"))
            log = (run_dir / "logs" / f"b{index:02d}-{arm}.log").open("w")
            processes.append(
                subprocess.Popen(
                    harbor_command(frozen, run_dir, arm, index, tasks),
                    env=env, stdout=log, stderr=subprocess.STDOUT, cwd=run_dir,
                )
            )
        codes = [process.wait() for process in processes]
        trials = [t for t in load_trials(run_dir) if t["batch"] == index]
        quota = [t for t in trials if t["invalid_reason"] == "model_quota"]
        print(f"batch {index} done: exit {codes}, trials {len(trials)}, quota-blocked {len(quota)}", flush=True)
        if quota:
            sys.exit("model quota reached; rerun `run` later to resume the remaining batches")

    launched = 0
    for index, tasks in enumerate(frozen["batches"]):
        if args.max_batches is not None and launched >= args.max_batches:
            return
        pending = [arm for arm in arms if not job_finished(run_dir / "jobs" / f"b{index:02d}-{arm}")]
        if pending:
            launched += 1
            launch(index, {arm: tasks for arm in pending})

    # Retry rounds: tasks whose trial was invalid (verifier/environment error,
    # model quota) get another attempt so the pair can be scored. A scored
    # trial, pass or fail, is never rerun.
    for round_index in range(args.retry_rounds):
        scored = {(t["task"], t["arm"]) for t in load_trials(run_dir) if t["reward"] is not None}
        planned = [task for batch in frozen["batches"] for task in batch]
        missing = {arm: [task for task in planned if (task, arm) not in scored] for arm in arms}
        missing = {arm: tasks for arm, tasks in missing.items() if tasks}
        index = RETRY_BATCH_BASE + round_index
        if not missing or any((run_dir / "jobs" / f"b{index:02d}-{arm}").exists() for arm in arms):
            continue
        launch(index, missing)


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    sub = parser.add_subparsers(dest="command", required=True)
    p = sub.add_parser("plan")
    p.add_argument("--run-dir", type=Path, required=True)
    p.add_argument("--dataset", default="terminal-bench/terminal-bench-2-1")
    p.add_argument("--host", choices=sorted(HOSTS), default="codex")
    p.add_argument("--model", default=None, help="default: " + ", ".join(f"{h} {v['model']}" for h, v in HOSTS.items()))
    p.add_argument("--effort", default=None)
    p.add_argument("--agent-version", "--codex-version", dest="agent_version", required=True, help="host CLI version")
    p.add_argument("--oma-version", required=True)
    p.add_argument("--attempts", type=int, default=1)
    p.add_argument("--concurrency", type=int, default=2)
    p.add_argument("--setup-multiplier", type=float, default=3.0)
    p.add_argument("--seed", type=int, required=True)
    p.add_argument("--batch-size", type=int, default=10)
    p.add_argument("--max-cpus", type=int, default=None, help="skip tasks declaring more CPUs")
    p.add_argument("--max-memory-mb", type=int, default=None, help="skip tasks declaring more memory")
    p.add_argument("--max-gpus", type=int, default=0, help="skip tasks declaring more GPUs")
    p.set_defaults(func=plan)
    r = sub.add_parser("run")
    r.add_argument("--run-dir", type=Path, required=True)
    r.add_argument("--max-batches", type=int, default=None)
    r.add_argument("--retry-rounds", type=int, default=1, help="extra rounds for tasks left without a scored trial")
    r.add_argument("--environment", default=None, help="Harbor environment type or import path, recorded as a plan amendment")
    r.add_argument("--environment-reason", default=None)
    r.set_defaults(func=run)
    args = parser.parse_args()
    args.run_dir = args.run_dir.expanduser().resolve()
    args.run_dir.mkdir(parents=True, exist_ok=True)
    args.func(args)


if __name__ == "__main__":
    main()
