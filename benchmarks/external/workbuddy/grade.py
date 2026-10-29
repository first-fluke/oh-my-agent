#!/usr/bin/env python3
"""Invoke the unchanged WorkBuddy CompositeVerifier on an existing container."""
from __future__ import annotations

import argparse
import asyncio
import json
from pathlib import Path
import subprocess
import shutil
from types import SimpleNamespace


class ExistingDocker:
    os = "linux"
    capabilities = SimpleNamespace(mounted=False)

    def __init__(self, container: str):
        self.container = container

    async def exec(self, command, *, cwd=None, env=None, timeout_sec=None, **_):
        argv = ["docker", "exec"]
        if cwd:
            argv += ["-w", str(cwd)]
        for key, value in (env or {}).items():
            argv += ["-e", f"{key}={value}"]
        argv += [self.container, "bash", "-lc", command]
        try:
            result = await asyncio.to_thread(subprocess.run, argv, capture_output=True,
                                             text=True, timeout=timeout_sec)
            return SimpleNamespace(return_code=result.returncode, stdout=result.stdout,
                                   stderr=result.stderr)
        except subprocess.TimeoutExpired as exc:
            raise TimeoutError(f"Verifier command exceeded {timeout_sec} seconds") from exc

    async def upload_dir(self, source_dir, target_dir):
        await self.exec(f"mkdir -p {target_dir}")
        await asyncio.to_thread(subprocess.run, ["docker", "cp", str(source_dir) + "/.",
                                                 f"{self.container}:{target_dir}/"], check=True,
                                capture_output=True)

    async def upload_file(self, source_path, target_path):
        await asyncio.to_thread(subprocess.run, ["docker", "cp", str(source_path),
                                                 f"{self.container}:{target_path}"],
                                check=True, capture_output=True)

    async def download_dir(self, source_dir, target_dir):
        Path(target_dir).mkdir(parents=True, exist_ok=True)
        await asyncio.to_thread(subprocess.run, ["docker", "cp", f"{self.container}:{source_dir}/.",
                                                 str(target_dir)], check=True, capture_output=True)


async def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--task", type=Path, required=True)
    parser.add_argument("--container", required=True)
    parser.add_argument("--output", type=Path, required=True)
    parser.add_argument("--judge-config", type=Path)
    args = parser.parse_args()
    from harbor.models.task.task import Task
    from harbor.models.trial.paths import TrialPaths
    from workbuddy_bench.judge import CompositeVerifier
    task = Task(args.task)
    paths = TrialPaths(args.output)
    paths.mkdir()
    # Agent-produced and previous-attempt rewards cannot stand in for verifier output.
    shutil.rmtree(paths.verifier_dir)
    paths.verifier_dir.mkdir()
    env = {"PYTHONPATH": "/workspace:/workspace/src",
           "WEB_BENCH_LLM_STREAM": "false", "WEB_BENCH_LLM_FORCE_STREAM": "false",
           "LLM_JUDGE_MAX_CONCURRENT": "1", "LLM_JUDGE_TIMEOUT_SEC": "600",
           "WEB_BENCH_LLM_TIMEOUT_SEC": "600", "WEB_BENCH_LLM_TIMEOUT_CAP_SEC": "600",
           "WEB_BENCH_LLM_WALL_TIMEOUT_EXTRA_SEC": "90"}
    if args.judge_config:
        route = json.loads(args.judge_config.read_text())
        host_judge = args.task.parent.parent.name.startswith("wb-bench-office")
        base_url = route.get("host_url" if host_judge else "container_url", route.get("base_url"))
        env.update({"WORKBUDDY_VERIFIER_LLM_BASE_URL": base_url,
                    "WORKBUDDY_VERIFIER_LLM_API_KEY": route["api_key"],
                    "WORKBUDDY_VERIFIER_LLM_MODEL": route["model"]})
    environment = ExistingDocker(args.container)
    await environment.exec("rm -rf /logs/verifier; mkdir -p /logs/verifier")
    if args.task.parent.parent.name.startswith("wb-bench-sec"):
        await environment.upload_dir(args.task / "tests", "/tests")
        result = await environment.exec("bash /tests/test.sh", timeout_sec=task.config.verifier.timeout_sec)
        await environment.download_dir("/logs/verifier", paths.verifier_dir)
        (paths.verifier_dir / "native-stdout.log").write_text(result.stdout)
        (paths.verifier_dir / "native-stderr.log").write_text(result.stderr)
    else:
        verifier = CompositeVerifier(task=task, trial_paths=paths, environment=environment,
                                     verifier_env=env)
        result = await verifier.verify()
        (paths.verifier_dir / "composite-result.json").write_text(result.model_dump_json(indent=2))


if __name__ == "__main__":
    asyncio.run(main())
