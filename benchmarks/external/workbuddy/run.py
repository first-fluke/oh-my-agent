#!/usr/bin/env python3
"""Run one WorkBuddy Code task with OMA/Codex and its unmodified native verifier.

This is a local smoke run, not the canonical WorkBuddy Harbor job launcher.
Only downloaded binaries, apt packages, and binary Python wheels are installed.
"""

from __future__ import annotations

import argparse
import base64
import hashlib
import io
import json
import os
from pathlib import Path
import platform
import shutil
import subprocess
import sys
import tarfile
import time
import urllib.request
import zipfile


UPSTREAM = "https://github.com/Tencent/workbuddy-bench.git"
REVISION = "625b2233093ae4f23e76be28c1f341d41cc70373"
TASK = "bug_fix-easy-a_crash_in_local"
DATASET = "wb-bench-code-v1.0"
DATA_SHA256 = "f60394e44341f45f66af17ba69efc51ceadc61f17c08aa89e4af35b51f6f34e1"
OMA_VERSION = "20.10.2"
CODEX_VERSION = "0.163.0"
NODE_VERSION = "24.11.1"
CUE_VERSION = "0.17.1"
BUN_VERSION = "1.3.14"
BASE_IMAGE = "python:3.12-slim"
GENERAL_IMAGE_ID = "sha256:ce9a404c2c0138e747a43e6ea022d2f7e670ed868df35d627a663ba7fb940ea9"
GENERAL_IMAGE_DIGEST = "python@sha256:a6e34c598f2467ed0e9a8d349809fcd8b5c603269512df273a0bb1784edc11b1"
GENERAL_PLATFORM = "linux/arm64"


def execute(argv, *, log=None, **kwargs):
    if log:
        with Path(log).open("w") as output:
            return subprocess.run(argv, stdout=output, stderr=subprocess.STDOUT,
                                  check=True, **kwargs)
    return subprocess.run(argv, check=True, capture_output=True, text=True, **kwargs)


def general_base_image():
    """Resolve the measured arm64 base independently of mutable Docker tags."""
    result = subprocess.run(["docker", "image", "inspect", GENERAL_IMAGE_ID], capture_output=True, text=True)
    if result.returncode:
        execute(["docker", "pull", "--platform", GENERAL_PLATFORM, GENERAL_IMAGE_DIGEST])
        result = execute(["docker", "image", "inspect", GENERAL_IMAGE_ID])
    image = json.loads(result.stdout)[0]
    if image["Id"] != GENERAL_IMAGE_ID or image["Architecture"] != "arm64":
        raise RuntimeError("General WorkBuddy runtime base does not match pinned arm64 image")
    return GENERAL_IMAGE_ID


def fetch(url: str, destination: Path) -> bytes:
    if not destination.exists():
        destination.parent.mkdir(parents=True, exist_ok=True)
        temporary = destination.with_suffix(destination.suffix + ".part")
        with urllib.request.urlopen(url, timeout=90) as source, temporary.open("wb") as target:
            shutil.copyfileobj(source, target)
        temporary.replace(destination)
    return destination.read_bytes()


def unpack(data: bytes, destination: Path, *, strip_package=False):
    destination.mkdir(parents=True, exist_ok=True)
    with tarfile.open(fileobj=io.BytesIO(data)) as archive:
        for member in archive.getmembers():
            if strip_package:
                member.name = member.name.partition("/")[2]
            if member.name:
                archive.extract(member, destination, filter="data")


def npm(cache: Path, package: str, version: str, destination: Path):
    metadata = json.loads(fetch(
        f"https://registry.npmjs.org/{package}/{version}",
        cache / f"{destination.name}-{version}-metadata.json"))
    data = fetch(metadata["dist"]["tarball"], cache / f"{destination.name}-{version}.tgz")
    integrity = metadata["dist"]["integrity"]
    algorithm, expected = integrity.split("-", 1)
    actual = base64.b64encode(hashlib.new(algorithm, data).digest()).decode()
    if actual != expected:
        raise RuntimeError(f"Integrity mismatch for {package}@{version}")
    if not destination.exists():
        unpack(data, destination, strip_package=True)


def prepare(cache: Path):
    cache.mkdir(parents=True, exist_ok=True)
    upstream = cache / "workbuddy-bench"
    if not upstream.exists():
        execute(["git", "clone", UPSTREAM, str(upstream)])
    revision = execute(["git", "-C", str(upstream), "rev-parse", "HEAD"]).stdout.strip()
    if revision != REVISION:
        raise RuntimeError(f"Expected upstream {REVISION}; found {revision}. Use a separate cache.")
    dataset_url = "https://huggingface.co/datasets/tencent/workbuddy-bench/resolve/main"
    data = fetch(f"{dataset_url}/{DATASET}.tar.gz", cache / "workbuddy-code.tar.gz")
    if hashlib.sha256(data).hexdigest() != DATA_SHA256:
        raise RuntimeError("Official Code dataset SHA256 mismatch")
    if not (upstream / "datasets" / DATASET).exists():
        unpack(data, upstream / "datasets")
    runtime = cache / "workbuddy-runtime"
    runtime.mkdir(exist_ok=True)
    npm(cache, "@openai/codex", f"{CODEX_VERSION}-linux-arm64", runtime / "codex")
    npm(cache, "oh-my-agent", OMA_VERSION, runtime / "oma")
    npm(cache, "jsonc-parser", "3.3.1", runtime / "oma/node_modules/jsonc-parser")
    if not (runtime / "node/bin/node").exists():
        filename = f"node-v{NODE_VERSION}-linux-arm64.tar.xz"
        origin = f"https://nodejs.org/dist/v{NODE_VERSION}"
        data = fetch(f"{origin}/{filename}", cache / filename)
        checksums = fetch(f"{origin}/SHASUMS256.txt", cache / "node-checksums.txt").decode()
        expected = next(line.split()[0] for line in checksums.splitlines() if line.endswith(filename))
        if hashlib.sha256(data).hexdigest() != expected:
            raise RuntimeError("Node SHA256 mismatch")
        unpack(data, runtime / "node", strip_package=True)
    if not (runtime / "cue").exists():
        data = fetch(f"https://github.com/cue-lang/cue/releases/download/v{CUE_VERSION}/"
                     f"cue_v{CUE_VERSION}_linux_arm64.tar.gz", cache / "workbuddy-cue-linux-arm64.tar.gz")
        with tarfile.open(fileobj=io.BytesIO(data)) as archive:
            archive.extract("cue", runtime, filter="data")
    if not (runtime / "bun").exists():
        data = fetch(f"https://github.com/oven-sh/bun/releases/download/bun-v{BUN_VERSION}/"
                     "bun-linux-aarch64.zip", cache / "workbuddy-bun-linux-arm64.zip")
        with zipfile.ZipFile(io.BytesIO(data)) as archive:
            (runtime / "bun").write_bytes(archive.read("bun-linux-aarch64/bun"))
        (runtime / "bun").chmod(0o755)
    venv = cache / "workbuddy-venv"
    if not (venv / "bin/python").exists():
        execute(["uv", "venv", str(venv), "--python", "3.12"])
    execute(["uv", "pip", "install", "--python", str(venv / "bin/python"),
             "--only-binary", ":all:", "harbor==0.18.0", "PyYAML"],
            log=cache / "workbuddy-host-dependencies.log")
    return upstream, runtime, venv


def docker(container, *args, **kwargs):
    return execute(["docker", "exec", "-w", "/workspace", container, *args], **kwargs)


def copy_into(container, source, target):
    execute(["docker", "cp", str(source), f"{container}:{target}"])


def verifier_script(upstream: Path, venv: Path, output: Path):
    program = '''from pathlib import Path
from workbuddy_bench.judge.registry import load_verifier_contract, load_verifier_registry, RegistryBuildContext
from workbuddy_bench.judge.core import EvaluationContext
import sys
task = Path(sys.argv[1])
contract = load_verifier_contract(task)
registry = load_verifier_registry(RegistryBuildContext(contract=contract))
context = EvaluationContext(dataset_id=contract.dataset_id, task_id=task.name, workspace='/workspace', tests_dir='/tests', verifier_dir='/logs/verifier')
plan = registry.plan_builder(context)
assert len(plan.judges) == 1 and plan.judges[0].type == 'rule_script'
print('#!/bin/bash\\n' + plan.judges[0].config['command'])
'''
    env = dict(os.environ, PYTHONPATH=str(upstream / "src"))
    task = upstream / "datasets" / DATASET / "tasks" / TASK
    result = execute([str(venv / "bin/python"), "-c", program, str(task)], env=env)
    output.write_text(result.stdout)


def collect(container: str, upstream: Path, venv: Path, output: Path, *, baseline=True):
    task = upstream / "datasets" / DATASET / "tasks" / TASK
    status = docker(container, "cat", "/logs/agent/exit_code").stdout.strip()
    if status != "0":
        raise RuntimeError(f"Agent failed with exit code {status}; inspect its private logs")
    docker(container, "bash", "-lc", "mkdir -p /scorer /logs/verifier /tests; "
           "if [ ! -f /logs/verifier/agent.patch ]; then "
           "git add -A; git diff --staged > /logs/verifier/agent.patch; git reset >/dev/null; fi")
    copy_into(container, str(task / "tests") + "/.", "/tests/")
    copy_into(container, task / "environment/scorer.py", "/scorer/scorer.py")
    verifier_script(upstream, venv, output / "native-verifier.sh")
    copy_into(container, output / "native-verifier.sh", "/tmp/verify.sh")
    docker(container, "bash", "-lc", "PYTHONPATH=/workspace bash /tmp/verify.sh",
           log=output / "native-verifier.log")
    execute(["docker", "cp", f"{container}:/logs", str(output)])
    if baseline:
        # Only restore the production file; keep the same injected official tests.
        docker(container, "bash", "-lc", "rm -rf /logs/baseline-verifier; "
               "cp asgiref/local.py /tmp/agent-local.py; "
               "git show HEAD:asgiref/local.py > asgiref/local.py; "
               "mv /logs/verifier /logs/agent-verifier; mkdir /logs/verifier; "
               ": > /logs/verifier/agent.patch; "
               "PYTHONPATH=/workspace bash /tmp/verify.sh > /logs/verifier/native-verifier.log 2>&1; "
               "result=$?; mv /logs/verifier /logs/baseline-verifier; "
               "mv /logs/agent-verifier /logs/verifier; cp /tmp/agent-local.py asgiref/local.py; exit $result")
        execute(["docker", "cp", f"{container}:/logs/baseline-verifier", str(output)])
    metadata = docker(container, "python", "-c", '''from pathlib import Path
import hashlib, importlib.metadata, json, platform
result = {}
for path in Path('/root/.codex/sessions').rglob('*.jsonl'):
 for line in path.read_text().splitlines():
  event = json.loads(line)
  if event.get('type') == 'turn_context':
   result['model'] = event['payload'].get('model')
   break
result['skills'] = json.loads(Path('/workspace/.agents/skills/_version.json').read_text())
result['python'] = platform.python_version()
result['packages'] = {name: importlib.metadata.version(name) for name in ['pytest', 'pytest-asyncio', 'serena-agent']}
result['oma_debug_skill_sha256'] = hashlib.sha256(Path('/workspace/.agents/skills/oma-debug/SKILL.md').read_bytes()).hexdigest()
result['agents_md_sha256'] = hashlib.sha256(Path('/workspace/AGENTS.md').read_bytes()).hexdigest()
print(json.dumps(result))
''').stdout
    score = json.loads((output / "logs/verifier/score.json").read_text())
    trajectory = [json.loads(line) for line in (output / "logs/agent/trajectory.jsonl").read_text().splitlines()]
    usage = next((event.get("usage") for event in reversed(trajectory) if event.get("type") == "turn.completed"), None)
    source_files = [task / "instruction.md", task / "environment/Dockerfile",
                    task / "environment/scorer.py", task / "tests/verifier.toml",
                    task / "tests/gold.patch",
                    upstream / "datasets" / DATASET / "shared/verifier/rule.py",
                    upstream / "datasets" / DATASET / "shared/verifier/plugin.py"]
    source_files += sorted((task / "tests/injected").rglob("*.py"))
    source_hashes = {str(path.relative_to(upstream)): hashlib.sha256(path.read_bytes()).hexdigest()
                     for path in source_files if path.is_file()}
    with tarfile.open(upstream.parent / "workbuddy-code.tar.gz") as archive:
        for path, expected in source_hashes.items():
            original = archive.extractfile(path.removeprefix("datasets/"))
            if original is None or hashlib.sha256(original.read()).hexdigest() != expected:
                raise RuntimeError(f"Verifier source differs from verified dataset: {path}")
    base_image = json.loads(execute(["docker", "image", "inspect", GENERAL_IMAGE_ID]).stdout)[0]
    receipt = dict(status="completed", mode="oma-config-and-skills-smoke", task=TASK,
                   upstream_revision=REVISION, dataset_sha256=DATA_SHA256,
                   oma_cli_version=OMA_VERSION, codex_version=CODEX_VERSION,
                   hooks_verified=False, agent_exit_code=0, score=score, usage=usage,
                   runtime=json.loads(metadata), canonical_harbor_run=False,
                   base_image_id=base_image["Id"], source_hashes=source_hashes,
                   verifier_sources_match_verified_archive=True,
                   environment_overrides=["arm64 prebuilt base; runtime package installation",
                                          "Node 24.11.1 arm64 instead of 20.18.1 x64",
                                          "PYTHONPATH source imports instead of editable package build",
                                          "Codex ChatGPT OAuth instead of an API-proxy harness image"],
                   verifier_sha256=hashlib.sha256((output / "native-verifier.sh").read_bytes()).hexdigest())
    if baseline:
        receipt["original_source_score"] = json.loads((output / "baseline-verifier/score.json").read_text())
    (output / "receipt.json").write_text(json.dumps(receipt, indent=2) + "\n")
    print(json.dumps(receipt, indent=2))


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("mode", choices=["prepare", "run", "collect"], nargs="?", default="run")
    parser.add_argument("--cache", type=Path, default=Path.home() / ".cache/oma-benchmarks")
    parser.add_argument("--output", type=Path)
    parser.add_argument("--container", help="Existing completed smoke container for collect")
    parser.add_argument("--timeout-sec", type=int, default=900)
    parser.add_argument("--keep-container", action="store_true")
    args = parser.parse_args()
    if platform.machine() not in ("arm64", "aarch64"):
        parser.error("This pinned smoke runner currently supports arm64 Docker hosts")
    upstream, runtime, venv = prepare(args.cache.resolve())
    if args.mode == "prepare":
        print(f"Prepared {TASK}; no agent was run")
        return
    output = (args.output or args.cache / "workbuddy-results" / time.strftime("%Y%m%d-%H%M%S")).resolve()
    output.mkdir(parents=True, exist_ok=True)
    if args.mode == "collect":
        if not args.container:
            parser.error("collect requires --container")
        collect(args.container, upstream, venv, output)
        return
    auth = Path(os.environ.get("CODEX_HOME", str(Path.home() / ".codex"))) / "auth.json"
    if not auth.is_file():
        parser.error("Codex auth.json not found; sign in with codex login first")
    container = f"oma-workbuddy-{os.getpid()}-{int(time.time())}"
    execute(["docker", "run", "-d", "--platform", GENERAL_PLATFORM, "--name", container, "--cpus", "2", "--memory", "4g",
             "--mount", f"type=bind,source={runtime},target=/opt/prebuilt,readonly",
             "--mount", f"type=bind,source={auth},target=/root/.codex/auth.json,readonly",
             "-e", "CODEX_HOME=/root/.codex", "-e", "CI=true", "-e", "OMA_SKIP_VERSION_CHECK=1",
             general_base_image(), "sleep", "infinity"])
    try:
        task = upstream / "datasets" / DATASET / "tasks" / TASK
        copy_into(container, task / "environment/workspace.tar.gz", "/tmp/workspace.tar.gz")
        execute(["docker", "exec", container, "mkdir", "-p", "/workspace"])
        docker(container, "bash", "-lc", '''set -e
mkdir -p /workspace /logs/agent /logs/verifier
tar xzf /tmp/workspace.tar.gz -C /workspace
rm /tmp/workspace.tar.gz
export DEBIAN_FRONTEND=noninteractive
apt-get update -qq
apt-get install -y -qq --no-install-recommends git curl bash ca-certificates xz-utils procps
python -m pip install --only-binary=:all: pytest pytest-asyncio 'serena-agent==1.0.0'
ln -s /opt/prebuilt/node/bin/node /usr/local/bin/node
ln -s /opt/prebuilt/bun /usr/local/bin/bun
ln -s /opt/prebuilt/cue /usr/local/bin/cue
ln -s /opt/prebuilt/codex/vendor/aarch64-unknown-linux-musl/bin/codex /usr/local/bin/codex
ln -s /opt/prebuilt/codex/vendor/aarch64-unknown-linux-musl/codex-path/rg /usr/local/bin/rg
ln -s /opt/prebuilt/oma/bin/cli.js /usr/local/bin/oma
cd /workspace
git config --global user.email dev@project
git config --global user.name Developer
git init -q -b main
git add -A
git commit -q -m 'initial setup'
codex login status
oma -y install --semantic-memory none
oma link codex
printf '[projects."/workspace"]\ntrust_level = "trusted"\n' > /root/.codex/config.toml
git add -A
git commit -q -m 'Install OMA harness overlay'
''', log=output / "setup.log")
        prompt = ("Use the installed OMA debug skill for this task and follow the workspace instructions. "
                  "Do not start a workflow. Never build, compile, bundle or package software. "
                  "The Python source is importable from /workspace; pytest and pytest-asyncio are already installed. "
                  "Implement and test the requested fix.\n\n" + (task / "instruction.md").read_text())
        (output / "prompt.txt").write_text(prompt)
        copy_into(container, output / "prompt.txt", "/tmp/prompt.txt")
        docker(container, "bash", "-lc", '''codex exec --dangerously-bypass-approvals-and-sandbox --json --output-last-message /logs/agent/final.md - < /tmp/prompt.txt > /logs/agent/trajectory.jsonl 2> /logs/agent/stderr.log
result=$?
printf '%s\n' "$result" > /logs/agent/exit_code
exit "$result"
''', timeout=args.timeout_sec, log=output / "agent-launch.log")
        collect(container, upstream, venv, output)
    finally:
        if args.keep_container:
            print(f"Container retained: {container}")
        else:
            execute(["docker", "rm", "-f", container])


if __name__ == "__main__":
    main()
