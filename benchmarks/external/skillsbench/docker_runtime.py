"""Replay supported task Dockerfiles in disposable prebuilt-image containers.

No image is produced. Source builds are blocked, and Python installers must
use wheels. Unsupported instructions are reported rather than approximated.
"""

import glob
import json
from pathlib import Path, PurePosixPath
import re
import shlex
import subprocess
import shutil
import tempfile

from published_images import cache_validation_argv, validate_image_inspect


BUILD_PATTERNS = [
    r"\b(?:npm|pnpm|yarn|bun)\s+(?:run\s+)?(?:build|bundle|pack)\b",
    r"(?:^|&&|\|\||;|[\"'])\s*(?:make|cmake|ninja|meson|gcc|g\+\+|clang|scalac|erlc)(?:\s+|[\"'],)",
    r"(?:^|&&|\|\||;|[\"'])\s*(?:cargo|go|lake)\s+(?:build|install)\b",
    r"\bmvn\b[^\n]*(?:\bcompile\b|\bpackage\b|\binstall\b|\bverify\b|\btest\b)",
    r"\bpip\d?\s+install\b[^\n]*(?:\s-e\s|git\+|--no-build-isolation)",
    r"(?:\./configure|python\d?\s+setup\.py|compileall|compile_commands)",
]

# These exact releases are source-only on PyPI. Existing universal wheels'
# package Python files were checked byte-for-byte against the official sdists.
# Keep the original requirements and binary-only installation policy.
BINARY_FIND_LINKS = {
    "bibtexparser==1.4.2": "https://archive1.piwheels.org/simple/bibtexparser/bibtexparser-1.4.2-py3-none-any.whl#sha256=1063c91db53f6b5d2b6ad9126cbddaf4db56a119001bee31f4277babdbb4e37a",
    "scapy==2.5.0": "https://www.piwheels.org/simple/scapy/scapy-2.5.0-py2.py3-none-any.whl#sha256=e6c9266d0e52ac63a9cdb218799acad6b2de1c5160e27a7c4dff815d940f8f8f",
}


def build_evidence(text):
    return [line.strip()[:500] for line in text.splitlines()
            if not line.lstrip().startswith("#") and any(re.search(pattern, line) for pattern in BUILD_PATTERNS)]


def instructions(path):
    lines = iter(path.read_text().splitlines())
    output = []
    for line in lines:
        if not line.strip() or line.lstrip().startswith("#"):
            continue
        logical = line.strip()
        while logical.endswith("\\"):
            following = next(lines)
            if following.lstrip().startswith("#"):
                continue
            logical = logical[:-1] + " " + following.strip()
        op, _, value = logical.partition(" ")
        marker = re.search(r"<<-?['\"]?([A-Za-z_][A-Za-z_0-9]*)['\"]?", value)
        if marker:
            while True:
                following = next(lines)
                logical += "\n" + following
                if following.strip() == marker[1]:
                    break
            value = logical.partition(" ")[2]
        if op not in {"ARG", "FROM", "ENV", "USER", "WORKDIR", "RUN", "COPY", "SHELL", "ENTRYPOINT", "CMD"}:
            raise ValueError(f"Unsupported Dockerfile instruction: {op}")
        output.append((op, value))
    return output


def expand(value, variables):
    return re.sub(r"\$(?:\{([A-Za-z_][A-Za-z_0-9]*)\}|([A-Za-z_][A-Za-z_0-9]*))",
                  lambda match: variables.get(match[1] or match[2], match[0]), value)


def inspect_task(task):
    import yaml

    raw = (task / "task.md").read_text().split("---", 2)
    config = yaml.safe_load(raw[1])
    ops = instructions(task / "environment/Dockerfile")
    blockers = []
    if len([1 for op, _ in ops if op == "FROM"]) != 1:
        blockers.append({"kind": "unsupported_multistage", "commands": [v for op, v in ops if op == "FROM"]})
    for op, value in ops:
        if op == "RUN":
            found = build_evidence(value)
            if found:
                blockers.append({"kind": "source_build_required", "file": "environment/Dockerfile", "commands": found})
        if op == "COPY" and "--from=" in value and not any(token in value.split()[0] for token in ["/", ":", "@"]):
            blockers.append({"kind": "unsupported_stage_copy", "commands": [value]})
    for path in sorted(list((task / "verifier").rglob("*")) + list((task / "environment").glob("*.sh"))):
        if path.is_file() and path.suffix in {".sh", ".py", ".js", ".ts"}:
            found = build_evidence(path.read_text(errors="replace"))
            if found:
                blockers.append({"kind": "verifier_build_required", "file": str(path.relative_to(task)), "commands": found})
    environment = config.get("environment", {})
    if environment.get("gpus", 0):
        blockers.append({"kind": "gpu_required", "count": environment["gpus"]})
    variables = dict(v.split("=", 1) for op, v in ops if op == "ARG" and "=" in v)
    stages = {}
    for op, value in ops:
        if op == "FROM":
            stage_tokens = shlex.split(expand(value, variables))
            if "AS" in stage_tokens:
                stages[stage_tokens[stage_tokens.index("AS") + 1]] = next(token for token in stage_tokens if not token.startswith("--"))
    base = [v for op, v in ops if op == "FROM"][-1]
    tokens = shlex.split(expand(base, variables))
    image = next(token for token in tokens if not token.startswith("--"))
    platform = next((token.split("=", 1)[1] for token in tokens if token.startswith("--platform=")), None)
    # Current v1.1 multistage task only copies from an untouched prebuilt stage.
    first_from = next(index for index, (op, _) in enumerate(ops) if op == "FROM")
    last_from = max(index for index, (op, _) in enumerate(ops) if op == "FROM")
    prebuilt_stages_only = all(op in {"ARG", "FROM"} for op, _ in ops[first_from:last_from])
    if prebuilt_stages_only:
        blockers = [blocker for blocker in blockers if blocker["kind"] not in {"unsupported_multistage", "unsupported_stage_copy"}]
    return {"task": task.name, "config": config, "image": image, "platform": platform, "stage_images": stages,
            "blockers": blockers, "instructions": ops,
            "dependency_policy": "PIP_ONLY_BINARY=:all:, UV_NO_BUILD=1, npm_config_ignore_scripts=true"}


class DockerRuntime:
    def __init__(self, task, spec, name, run, native_build=True, binary_only=False):
        self.task, self.spec, self.name, self.run = task, spec, name, run
        self.published = spec.get("published_image")
        self.native_build = native_build and self.published is None
        self.cleanup_image = self.native_build
        self.image = (self.published["image"] if self.published else
                      "oma-skillsbench-task:" + name.removeprefix("oma-skillsbench-batch-") if native_build else spec["image"])
        self.environment = {"PIP_ONLY_BINARY": ":all:", "UV_NO_BUILD": "1", "npm_config_ignore_scripts": "true"} if binary_only else {}
        self.variables = {}
        self.workdir = "/"
        self.shell = ["/bin/sh", "-c"]

    def exec(self, command, label, timeout=600, check=True):
        argv = ["docker", "exec", "--workdir", self.workdir]
        for key, value in self.environment.items():
            argv += ["--env", f"{key}={value}"]
        return self.run(argv + [self.name] + self.shell + [command], label, timeout=timeout, check=check)

    def prepare(self):
        if self.published:
            self.cleanup_image = subprocess.run(["docker", "image", "inspect", self.image],
                                                stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL).returncode != 0
            self.run(["docker", "pull", "--platform", self.published["platform"], self.image],
                     "published-image-pull", timeout=1800)
            inspected = json.loads(subprocess.check_output(["docker", "image", "inspect", self.image], text=True))[0]
            validate_image_inspect(inspected, self.published)
            config = self.spec["config"].get("environment", {})
            self.run(["docker", "run", "-d", "--name", self.name,
                      "--platform", self.published["platform"], "--cpus", str(config.get("cpus", 1)),
                      "--memory", str(config.get("memory_mb", 2048)) + "m", self.image, "sleep", "infinity"],
                     "container-start")
            self.workdir = inspected["Config"].get("WorkingDir") or "/"
            self.shell = inspected["Config"].get("Shell") or self.shell
            if self.published.get("cache_assets"):
                self.run(["docker", "exec", self.name] + cache_validation_argv(self.published["cache_assets"]),
                         "published-cache-validation", timeout=60)
            self.exec("mkdir -p /logs/agent /logs/verifier /logs/artifacts /app /tests", "log-dirs")
            return
        if self.native_build:
            build_timeout = self.spec["config"].get("environment", {}).get("build_timeout_sec", 600)
            self.run(["docker", "build", "--progress", "plain", "-t", self.image,
                      str(self.task / "environment")], "image-build", timeout=build_timeout)
            config = self.spec["config"].get("environment", {})
            self.run(["docker", "run", "-d", "--name", self.name,
                      "--cpus", str(config.get("cpus", 1)), "--memory", str(config.get("memory_mb", 2048)) + "m",
                      self.image, "sleep", "infinity"], "container-start")
            image_config = json.loads(subprocess.check_output(["docker", "image", "inspect", self.image], text=True))[0]["Config"]
            self.workdir = image_config.get("WorkingDir") or "/"
            self.exec("mkdir -p /logs/agent /logs/verifier /logs/artifacts /app /tests", "log-dirs")
            return
        pull = ["docker", "pull"]
        if self.spec["platform"]:
            pull += ["--platform", self.spec["platform"]]
        self.run(pull + [self.spec["image"]], "image-pull", timeout=600)
        config = self.spec["config"].get("environment", {})
        start = ["docker", "run", "-d", "--name", self.name, "--user", "root", "--entrypoint", "/bin/sh",
                 "--cpus", str(config.get("cpus", 1)), "--memory", str(config.get("memory_mb", 2048)) + "m"]
        if self.spec["platform"]:
            start += ["--platform", self.spec["platform"]]
        self.run(start + [self.spec["image"], "-c", "while :; do sleep 3600; done"], "container-start")
        last_from = max(index for index, (op, _) in enumerate(self.spec["instructions"]) if op == "FROM")
        for index, (op, value) in enumerate(self.spec["instructions"]):
            if index < last_from and op != "ARG":
                continue
            label = f"setup-{index:03}-{op.lower()}"
            if op == "ARG":
                key, _, val = value.partition("=")
                self.variables[key] = val
            elif op == "FROM":
                continue
            elif op == "ENV":
                words = shlex.split(value)
                pairs = words if "=" in words[0] else [words[0] + "=" + " ".join(words[1:])]
                for pair in pairs:
                    key, _, val = pair.partition("=")
                    if key == "PATH" and "PATH" not in self.variables:
                        self.variables["PATH"] = "/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin"
                    self.environment[key] = expand(val, self.variables)
                    self.variables[key] = self.environment[key]
            elif op == "USER":
                if value.strip() not in {"root", "0"}:
                    raise ValueError(f"Unsupported non-root USER: {value}")
            elif op == "WORKDIR":
                destination = expand(value, self.variables)
                self.workdir = str(PurePosixPath(self.workdir) / destination)
                self.run(["docker", "exec", self.name, "mkdir", "-p", self.workdir], label)
            elif op == "SHELL":
                self.shell = json.loads(value)
            elif op == "RUN":
                # ARGs exist during Dockerfile RUN, without persisting into the task.
                exported = " ".join(f"{key}={shlex.quote(val)}" for key, val in self.variables.items() if key not in self.environment)
                extra_links = [url for requirement, url in BINARY_FIND_LINKS.items() if requirement in value]
                original_links = self.environment.get("PIP_FIND_LINKS")
                if extra_links and self.environment.get("PIP_ONLY_BINARY") == ":all:":
                    self.environment["PIP_FIND_LINKS"] = " ".join(([original_links] if original_links else []) + extra_links)
                try:
                    self.exec(("export " + exported + "; " if exported else "") + value, label,
                              timeout=self.spec["config"].get("environment", {}).get("build_timeout_sec", 600))
                finally:
                    if original_links is None:
                        self.environment.pop("PIP_FIND_LINKS", None)
                    else:
                        self.environment["PIP_FIND_LINKS"] = original_links
            elif op == "COPY":
                words = json.loads(value) if value.startswith("[") else shlex.split(value)
                if words[0].startswith("--from="):
                    source_image = words.pop(0).split("=", 1)[1]
                    source_image = self.spec.get("stage_images", {}).get(source_image, source_image)
                    source_container = self.name + "-source"
                    temporary = Path(tempfile.mkdtemp(prefix="oma-skillsbench-copy-"))
                    try:
                        self.run(["docker", "create", "--name", source_container, source_image, "true"], label + "-source-create")
                        destination = str(PurePosixPath(self.workdir) / words[-1])
                        self.run(["docker", "exec", self.name, "mkdir", "-p", destination], label + "-mkdir")
                        for source in words[:-1]:
                            local = temporary / PurePosixPath(source).name
                            self.run(["docker", "cp", source_container + ":" + source, str(local)], label + "-source-copy")
                            copied_source = str(local) + "/." if local.is_dir() else str(local)
                            copied_destination = destination if local.is_dir() else destination + "/" + local.name
                            self.run(["docker", "cp", copied_source, self.name + ":" + copied_destination], label + "-copy")
                    finally:
                        subprocess.run(["docker", "rm", "-f", source_container], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
                        shutil.rmtree(temporary)
                    continue
                if words[0].startswith("--"):
                    raise ValueError(f"Unsupported COPY option: {value}")
                sources, destination = words[:-1], expand(words[-1], self.variables)
                target = str(PurePosixPath(self.workdir) / destination)
                for source in sources:
                    matches = glob.glob(str(self.task / "environment" / source))
                    if not matches:
                        raise ValueError(f"COPY source missing: {source}")
                    for source_path in matches:
                        path = Path(source_path)
                        if path.is_dir():
                            self.run(["docker", "exec", self.name, "mkdir", "-p", target], label + "-mkdir")
                            self.run(["docker", "cp", str(path) + "/.", self.name + ":" + target], label + "-copy")
                        else:
                            final_target = target + "/" + path.name if destination.endswith("/") or len(sources) > 1 or len(matches) > 1 else target
                            self.run(["docker", "exec", self.name, "mkdir", "-p", str(PurePosixPath(final_target).parent)], label + "-mkdir")
                            self.run(["docker", "cp", str(path), self.name + ":" + final_target], label + "-copy")
            elif op == "ENTRYPOINT" and value.strip() != "[]":
                # Preserve declared services rather than silently dropping startup.
                command = json.loads(value) if value.startswith("[") else self.shell + [value]
                self.run(["docker", "exec", "-d", self.name] + command + ["sleep", "infinity"], label)
        self.exec("mkdir -p /logs/agent /logs/verifier /logs/artifacts /app /tests", "log-dirs")

    def grade_environment(self):
        environment = {key: str(value) for key, value in self.spec["config"].get("verifier", {}).get("env", {}).items()}
        if self.task.name == "simpo-code-reproduction":
            # The original verifier intentionally specifies both PyPI and the
            # CPU index. uv otherwise hides torch's +cpu release behind PyPI.
            environment["UV_INDEX_STRATEGY"] = "unsafe-best-match"
        return environment

    def grade(self, timeout):
        original_environment = dict(self.environment)
        self.environment.update(self.grade_environment())
        try:
            self.exec("rm -rf /logs/verifier /verifier /tests && mkdir -p /logs/verifier /verifier /tests", "verifier-clear")
            self.run(["docker", "cp", str(self.task / "verifier") + "/.", self.name + ":/verifier"], "verifier-copy")
            self.run(["docker", "cp", str(self.task / "verifier") + "/.", self.name + ":/tests"], "verifier-compat-copy")
            return self.exec("bash /verifier/test.sh", "verifier", timeout=timeout, check=False)
        finally:
            self.environment = original_environment
