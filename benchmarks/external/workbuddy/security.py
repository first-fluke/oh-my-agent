#!/usr/bin/env python3
"""Run an official Security task image; preserve its native verifier and fixtures."""
from __future__ import annotations

import argparse
import base64
import hashlib
import io
import json
import os
import re
from pathlib import Path
import select
import shlex
import shutil
import socket
import socketserver
import subprocess
import sys
import tarfile
import threading
import time
import zipfile

import run as smoke


def runtime_x64(cache: Path):
    target = cache / "workbuddy-runtime-amd64"
    target.mkdir(parents=True, exist_ok=True)
    smoke.npm(cache, "@openai/codex", f"{smoke.CODEX_VERSION}-linux-x64", target / "codex-amd64")
    if not (target / "oma").exists():
        shutil.copytree(cache / "workbuddy-runtime/oma", target / "oma")
    if not (target / "node/bin/node").exists():
        filename = f"node-v{smoke.NODE_VERSION}-linux-x64.tar.xz"
        origin = f"https://nodejs.org/dist/v{smoke.NODE_VERSION}"
        data = smoke.fetch(f"{origin}/{filename}", cache / filename)
        checksums = smoke.fetch(f"{origin}/SHASUMS256.txt", cache / "node-checksums.txt").decode()
        expected = next(line.split()[0] for line in checksums.splitlines() if line.endswith(filename))
        if hashlib.sha256(data).hexdigest() != expected:
            raise RuntimeError("Node amd64 checksum mismatch")
        smoke.unpack(data, target / "node", strip_package=True)
    if not (target / "cue").exists():
        data = smoke.fetch(f"https://github.com/cue-lang/cue/releases/download/v{smoke.CUE_VERSION}/cue_v{smoke.CUE_VERSION}_linux_amd64.tar.gz", cache / "workbuddy-cue-linux-amd64.tar.gz")
        with tarfile.open(fileobj=io.BytesIO(data)) as archive:
            archive.extract("cue", target, filter="data")
    if not (target / "bun").exists():
        data = smoke.fetch(f"https://github.com/oven-sh/bun/releases/download/bun-v{smoke.BUN_VERSION}/bun-linux-x64.zip", cache / "workbuddy-bun-linux-amd64.zip")
        with zipfile.ZipFile(io.BytesIO(data)) as archive:
            (target / "bun").write_bytes(archive.read("bun-linux-x64/bun"))
        (target / "bun").chmod(0o755)
    return target


def seed_definitions(cache: Path):
    """Copy the public installed skill snapshot, excluding prior task state."""
    target = cache / "workbuddy-security-oma-seed"
    if target.exists():
        return target
    target.mkdir(parents=True)
    for name in ["agents", "config", "hooks", "rules", "skills", "workflows", "mcp.json", "oma-config.cue", "oma-config.local.yaml"]:
        smoke.execute(["docker", "cp", f"oma-workbuddy-smoke-20261021:/workspace/.agents/{name}", str(target / name)])
    return target


def command(container, text, *, cwd="/workspace", user="root", timeout=None, env=None):
    argv = ["docker", "exec", "-u", user, "-w", cwd]
    for key, value in (env or {}).items():
        argv += ["-e", f"{key}={value}"]
    argv += [container, "bash", "-lc", text]
    return subprocess.run(argv, capture_output=True, text=True, timeout=timeout)


def run(task, args, upstream, venv):
    """Called by suite.py only after an image exists or the GUI gate is open."""
    path = Path(task["path"])
    output = args.output / "sec" / task["task"]
    output.mkdir(parents=True, exist_ok=True)
    result = dict(task, score=None, status="preparing", output=str(output), started_at=time.time())
    result.update(requested_model="gpt-6.1-sol", requested_effort="high", oma_definitions_version="20.10.3")
    def phase(name):
        result["status"] = name
        temporary = output / "status.tmp"
        temporary.write_text(json.dumps(result, indent=2) + "\n")
        temporary.replace(output / "status.json")
    image = f"oma-workbuddy/{task['task']}:local"
    exists = subprocess.run(["docker", "image", "inspect", image], capture_output=True).returncode == 0
    if not exists and not (args.allow_build and args.build_gate_open):
        return dict(result, status="waiting_build_gate", reason="Official task image absent; local build gate awaits physical approval",
                    required_command=["docker", "build", "--platform", "linux/amd64", "-t", image, str(path / "environment")])
    runtime = runtime_x64(args.cache)
    seed = seed_definitions(args.cache)
    if not exists:
        phase("building_task_image")
        with (output / "image-build.log").open("w") as log:
            built = subprocess.run(["docker", "build", "--platform", "linux/amd64", "-t", image, str(path / "environment")], stdout=log, stderr=subprocess.STDOUT)
        if built.returncode:
            return dict(result, status="waiting_build_gate" if built.returncode in {137, 143, -9, -15} else "environment_error",
                        reason=f"Official Docker build exit {built.returncode}; see image-build.log")
    config = json.loads(smoke.execute(["docker", "image", "inspect", image]).stdout)[0]["Config"]
    cwd = config.get("WorkingDir") or "/workspace"
    cmd = config.get("Cmd") or []
    shell_only = not cmd or cmd in [["/bin/bash"], ["bash"], ["/bin/sh"], ["sh"]]
    container = f"oma-wb-sec-{os.getpid()}-{int(time.time())}"
    network = container + "-net"
    proxy_container = container + "-egress"
    auth = Path(os.environ.get("CODEX_HOME", str(Path.home() / ".codex"))) / "auth.json"
    smoke.execute(["docker", "network", "create", "--internal", network])
    env = {"HTTP_PROXY": "http://model-egress:8888",
           "HTTPS_PROXY": "http://model-egress:8888", "NODE_USE_ENV_PROXY": "1",
           "NO_PROXY": "localhost,127.0.0.1,::1", "HOME": "/home/dev", "CODEX_HOME": "/home/dev/.codex",
           "CI": "true", "OMA_SKIP_VERSION_CHECK": "1"}
    argv = ["docker", "run", "-d", "--platform", "linux/amd64", "--name", container, "--network", network,
            "--add-host", "host.docker.internal:host-gateway", "--cpus", "2", "--memory", "6g",
            "--mount", f"type=bind,source={runtime},target=/opt/prebuilt,readonly",
            "--mount", f"type=bind,source={auth},target=/run/oma-auth.json,readonly", image]
    if shell_only:
        argv += ["sleep", "infinity"]
    try:
        smoke.execute(["docker", "run", "-d", "--name", proxy_container, "--network", "bridge",
                       "--sysctl", "net.ipv4.ip_forward=0", "--mount",
                       f"type=bind,source={Path(__file__).with_name('model_proxy.py')},target=/opt/model_proxy.py,readonly",
                       smoke.BASE_IMAGE, "python", "/opt/model_proxy.py"])
        smoke.execute(["docker", "network", "connect", "--alias", "model-egress", network, proxy_container])
        smoke.execute(argv)
        result["container"] = container
        phase("preparing")
        command(container, f"mkdir -p {shlex.quote(cwd)} /workspace /logs/agent /logs/verifier", cwd="/")
        smoke.execute(["docker", "cp", str(seed), f"{container}:{cwd}/.agents"])
        bootstrap = r'''set -e
ln -sf /opt/prebuilt/node/bin/node /usr/local/bin/node
ln -sf /opt/prebuilt/bun /usr/local/bin/bun
ln -sf /opt/prebuilt/cue /usr/local/bin/cue
ln -sf /opt/prebuilt/codex-amd64/vendor/x86_64-unknown-linux-musl/bin/codex /usr/local/bin/codex
ln -sf /opt/prebuilt/codex-amd64/vendor/x86_64-unknown-linux-musl/codex-path/rg /usr/local/bin/rg
ln -sf /opt/prebuilt/oma/bin/cli.js /usr/local/bin/oma
id dev >/dev/null 2>&1 || useradd -m -s /bin/bash dev
mkdir -p /home/dev/.codex
cp /run/oma-auth.json /home/dev/.codex/auth.json
chmod 600 /home/dev/.codex/auth.json
chown -R dev /home/dev/.codex /workspace /logs/agent
OMA_SKIP_VERSION_CHECK=1 CI=true oma link codex
chown -R dev .agents .codex
'''
        boot = command(container, bootstrap, cwd=cwd, env={"CI": "true", "OMA_SKIP_VERSION_CHECK": "1"})
        (output / "setup.log").write_text(boot.stdout + boot.stderr)
        if boot.returncode:
            return dict(result, status="environment_error", reason=f"Offline OMA setup exit {boot.returncode}")
        # Internal networking blocks arbitrary egress; only model CONNECT traffic is proxied.
        probe = command(container, "node -e \"fetch('https://chatgpt.com').then(r=>console.log(r.status)).catch(e=>{console.error(e.message);process.exit(1)})\"", cwd=cwd, env=env, timeout=45)
        (output / "network-probe.log").write_text(probe.stdout + probe.stderr)
        if probe.returncode:
            return dict(result, status="environment_error", reason="Isolated model egress proxy unavailable; task was not exposed to public network")
        prompt = ("Use the installed OMA skills for this benchmark task. Only operate on the task's provided fixture files and local services. "
                  "Do not access real accounts, other containers, host resources, or external targets. Benchmark-local builds/tests are authorized; "
                  "do not bypass machine build gates or spawn additional model processes.\n\n" + (path / "instruction.md").read_text())
        (output / "prompt.txt").write_text(prompt)
        smoke.execute(["docker", "cp", str(output / "prompt.txt"), f"{container}:/tmp/prompt.txt"])
        env["CODEX_HOME"] = "/home/dev/.codex"
        import fcntl
        phase("waiting_model")
        with args.model_lock.open("a+") as lock:
            fcntl.flock(lock, fcntl.LOCK_EX)
            phase("running_agent")
            rollout = command(container, "codex exec -m gpt-6.1-sol -c 'model_reasoning_effort=\"high\"' -c 'projects." + json.dumps(cwd) + ".trust_level=\"trusted\"' --dangerously-bypass-approvals-and-sandbox --json --output-last-message /logs/agent/final.md - < /tmp/prompt.txt > /logs/agent/trajectory.jsonl 2> /logs/agent/stderr.log", cwd=cwd, user="dev", env=env, timeout=args.timeout_sec)
        if rollout.returncode:
            import suite
            runtime = suite.agent_metadata(container, cwd, "/home/dev/.codex")
            failure = command(container, "tail -c 3000 /logs/agent/stderr.log", cwd=cwd).stdout + json.dumps(runtime.get("failure", {}))
            status = "waiting_model_quota" if re.search(r"usage limit|quota|rate.limit|limit reached", failure, re.I) else "blocked_auth" if re.search(r"unauthorized|authentication|not logged|401", failure, re.I) else "agent_error"
            return dict(result, status=status, reason=f"Codex exit {rollout.returncode}", agent_runtime=runtime)
        import suite
        result["agent_runtime"] = suite.agent_metadata(container, cwd, "/home/dev/.codex")
        phase("running_verifier")
        grade = subprocess.run([str(venv / "bin/python"), str(Path(__file__).with_name("grade.py")),
                                "--task", str(path), "--container", container, "--output", str(output)],
                               env=dict(os.environ, PYTHONPATH=str(upstream / "src")), capture_output=True, text=True, timeout=3600)
        (output / "verifier-launch.log").write_text(grade.stdout + grade.stderr)
        if grade.returncode:
            return dict(result, status="verifier_error", reason=f"Native Security verifier exit {grade.returncode}")
        status, score, detail = suite.result_status(output, "sec")
        return dict(result, status=status, score=score, verifier=detail, network="internal-model-only-connect-proxy",
                    judge_condition="native-programmatic", canonical_harbor_run=False, hooks_verified=False)
    except Exception as exc:
        return dict(result, status="environment_error", reason=f"{type(exc).__name__}: {exc}")
    finally:
        subprocess.run(["docker", "cp", f"{container}:/logs/agent", str(output)], capture_output=True)
        if args.keep_containers:
            subprocess.run(["docker", "stop", container], capture_output=True)
        else:
            subprocess.run(["docker", "rm", "-f", container], capture_output=True)
        subprocess.run(["docker", "rm", "-f", proxy_container], capture_output=True)
        if not args.keep_containers:
            subprocess.run(["docker", "network", "rm", network], capture_output=True)
        if not args.keep_containers:
            subprocess.run(["docker", "image", "rm", image], capture_output=True)
