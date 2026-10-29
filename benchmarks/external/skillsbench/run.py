#!/usr/bin/env python3
"""One-task SkillsBench smoke using a host agent and the official Docker grader.

This does not build an image or claim a canonical BenchFlow/leaderboard run.
"""

import argparse
import hashlib
import json
import os
from pathlib import Path
import shutil
import subprocess
import time
import tomllib
import uuid


BASE_IMAGE = "python:3.12.8-slim"
TASK = "dialogue-parser"
UPSTREAM_COMMIT = "b63b7b2"


def sha256(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("mode", choices=["oracle", "oma"])
    parser.add_argument("--checkout", type=Path, default=Path.home() / ".cache/oma-benchmarks/skillsbench-v1.1")
    parser.add_argument("--workspace", type=Path, help="Previously installed, isolated OMA workspace (oma mode)")
    parser.add_argument("--results-dir", type=Path, default=Path(__file__).parent / "results")
    args = parser.parse_args()
    task = args.checkout.resolve() / "tasks" / TASK
    result_dir = args.results_dir.resolve() / (time.strftime("%Y%m%dT%H%M%SZ", time.gmtime()) + "-" + args.mode)
    result_dir.mkdir(parents=True)
    workspace = (args.workspace or Path.home() / ".cache/oma-benchmarks/workspaces" / result_dir.name).resolve()
    workspace.mkdir(parents=True, exist_ok=True)
    existing_outputs = [name for name in ["solution.py", "dialogue.json", "dialogue.dot"] if (workspace / name).exists()]
    if existing_outputs:
        raise SystemExit(f"Use a fresh workspace; task outputs already exist: {existing_outputs}")
    container = "oma-skillsbench-" + uuid.uuid4().hex[:10]
    manifest = {"status": "running", "mode": args.mode, "task": TASK,
                "environment": "prebuilt-base-runtime-setup", "agent_location": "host" if args.mode == "oma" else "container",
                "canonical_benchmark": False, "image": BASE_IMAGE,
                "condition": "oracle-with-official-skills" if args.mode == "oracle" else "oma-config-and-skills-host-agent",
                "hook_activation": "not-applicable" if args.mode == "oracle" else "unverified",
                "workspace_initial_task_outputs": [],
                "upstream_commit": subprocess.check_output(["git", "-C", str(args.checkout), "rev-parse", "HEAD"], text=True).strip(),
                "task_sha256": sha256(task / "task.md"), "dockerfile_sha256": sha256(task / "environment/Dockerfile"),
                "verifier_sha256": {p.name: sha256(p) for p in (task / "verifier").iterdir() if p.is_file()},
                "commands": [], "started_at": time.time(), "workspace": str(workspace)}
    if not manifest["upstream_commit"].startswith(UPSTREAM_COMMIT):
        raise SystemExit("Expected pinned SkillsBench v1.1 checkout")

    def run(command, name, *, cwd=None, stdin=None, timeout=600, check=True):
        manifest["commands"].append(command)
        (result_dir / "manifest.json").write_text(json.dumps(manifest, indent=2) + "\n")
        print(name, flush=True)
        with (result_dir / (name + ".log")).open("w") as log:
            result = subprocess.run(command, cwd=cwd, input=stdin, text=True,
                                    stdout=log, stderr=subprocess.STDOUT, timeout=timeout,
                                    env={**os.environ, "PIP_ONLY_BINARY": ":all:"})
        manifest.setdefault("steps", {})[name] = {"exit_code": result.returncode, "status": "completed" if result.returncode == 0 else "failed"}
        if check and result.returncode:
            raise RuntimeError(f"{name} failed ({result.returncode}); see {result_dir / (name + '.log')}")
        return result

    try:
        manifest["benchflow_version"] = subprocess.check_output(["bench", "--version"], text=True).strip()
        if manifest["benchflow_version"] != "benchflow 0.6.3":
            raise RuntimeError("Use benchflow==0.6.3 for the pinned v1.1 task schema")
        run(["bench", "tasks", "check", str(task)], "task-check")
        run(["docker", "pull", BASE_IMAGE], "pull")
        manifest["image_inspect"] = json.loads(subprocess.check_output(["docker", "image", "inspect", BASE_IMAGE], text=True))[0]["RepoDigests"]
        run(["docker", "run", "-d", "--name", container, "--cpus", "1", "--memory", "4g", "--workdir", "/app", BASE_IMAGE, "sleep", "infinity"], "container-start")
        # Match the upstream Dockerfile's installs without producing an image.
        run(["docker", "exec", "-e", "PIP_ONLY_BINARY=:all:", container, "bash", "-ec",
             "pip install --no-cache-dir graphviz==0.20.3 && apt-get update && apt-get install -y graphviz && rm -rf /var/lib/apt/lists/*"], "runtime-setup")
        run(["docker", "cp", str(task / "environment/script.txt"), container + ":/app/script.txt"], "input-copy")
        shutil.copy2(task / "environment/script.txt", workspace / "script.txt")
        if args.mode == "oracle":
            run(["docker", "exec", container, "mkdir", "-p", "/root/.claude/skills", "/logs/verifier"], "oracle-dirs")
            run(["docker", "cp", str(task / "environment/skills/.") + "/.", container + ":/root/.claude/skills"], "oracle-skills")
            run(["docker", "cp", str(task / "oracle"), container + ":/oracle"], "oracle-copy")
            run(["docker", "exec", container, "bash", "/oracle/solve.sh"], "oracle")
        else:
            if not any((workspace / ".agents" / name).is_file() for name in ["oma-config.yaml", "oma-config.cue"]):
                run(["oma", "-y", "install", "--web-search", "native", "--code-intelligence", "serena", "--semantic-memory", "none"], "oma-install", cwd=workspace)
            run(["oma", "link", "codex"], "oma-link", cwd=workspace)
            manifest["oma_version"] = subprocess.check_output(["oma", "--version"], text=True).strip()
            manifest["codex_version"] = subprocess.check_output(["codex", "--version"], text=True).strip()
            manifest["oma_asset_sha256"] = {str(p.relative_to(workspace)): sha256(p)
                                            for p in [workspace / "AGENTS.md", workspace / ".agents/oma-config.yaml", workspace / ".agents/oma-config.cue", workspace / ".codex/config.toml", workspace / ".codex/hooks.json"] if p.is_file()}
            codex_config = Path(os.environ.get("CODEX_HOME", str(Path.home() / ".codex"))) / "config.toml"
            configured = tomllib.loads(codex_config.read_text()) if codex_config.is_file() else {}
            manifest["configured_model"] = configured.get("model", "cli-default")
            manifest["configured_reasoning_effort"] = configured.get("model_reasoning_effort")
            prompt = (task / "task.md").read_text().split("---", 2)[2].strip()
            prompt = prompt.replace("/app/", str(workspace) + "/")
            prompt += "\n\nThis is a host-agent smoke run. The original task's /app paths map to this workspace. Read AGENTS.md and the applicable OMA skill before implementing. Create solution.py, dialogue.json, and dialogue.dot here. Do not read any benchmark oracle or verifier. Do not build or compile software.\n"
            (result_dir / "prompt.txt").write_text(prompt)
            # Existing subscription login stays on the host; no auth file is copied.
            run(["codex", "exec", "--json", "--skip-git-repo-check", "--ephemeral",
                 "-c", 'approval_policy="never"', "-s", "workspace-write", "-C", str(workspace), "-"], "agent", cwd=workspace, stdin=prompt, timeout=900)
            for filename in ["solution.py", "dialogue.json", "dialogue.dot"]:
                run(["docker", "cp", str(workspace / filename), container + ":/app/" + filename], "output-copy-" + filename)
                manifest.setdefault("output_sha256", {})[filename] = sha256(workspace / filename)
        # Upload the untouched official verifier only after the agent has finished.
        run(["docker", "exec", container, "mkdir", "-p", "/logs/verifier"], "verifier-dirs")
        run(["docker", "cp", str(task / "verifier"), container + ":/verifier"], "verifier-copy")
        run(["docker", "exec", "-e", "PIP_ONLY_BINARY=:all:", container, "bash", "/verifier/test.sh"], "verifier")
        run(["docker", "cp", container + ":/logs/verifier", str(result_dir / "verifier")], "verifier-download")
        manifest["reward"] = float((result_dir / "verifier/reward.txt").read_text().strip())
        manifest["test_summary"] = json.loads((result_dir / "verifier/ctrf.json").read_text())["results"]["summary"]
        manifest["status"] = "completed"
    except Exception as error:
        manifest["status"] = "failed"
        manifest["error"] = str(error)
        raise
    finally:
        run(["docker", "rm", "-f", container], "container-cleanup", check=False)
        manifest["finished_at"] = time.time()
        (result_dir / "manifest.json").write_text(json.dumps(manifest, indent=2) + "\n")
        print(json.dumps({"status": manifest["status"], "reward": manifest.get("reward"), "results": str(result_dir)}), flush=True)


if __name__ == "__main__":
    main()
