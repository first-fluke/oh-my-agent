"""Select pinned published environments and validate reviewed cache-only variants."""

import hashlib
import json
from pathlib import Path
import re
import subprocess


MANIFEST = Path(__file__).with_name("published_images.json")


def published_image(task):
    manifest = json.loads(MANIFEST.read_text())
    image = manifest["tasks"].get(task.name)
    if image is None:
        return None
    if not re.fullmatch(r"ghcr\.io/benchflow-ai/skillsbench-task-env@sha256:[0-9a-f]{64}", image["image"]):
        raise ValueError("Published task image must use an immutable official digest")
    if image["platform"] != "linux/amd64":
        raise ValueError("Unexpected published task image platform")
    checkout = task.parent.parent
    source_objects = image["source_git_objects"]
    local_objects = image.get("local_git_objects", source_objects)
    cache_variant = local_objects != source_objects
    if cache_variant:
        if (task.name not in {"debug-trl-grpo", "earthquake-phase-association", "seismic-phase-picking"}
                or any(local_objects.get(part) != source_objects.get(part) for part in ("verifier", "task.md"))
                or not image.get("cache_assets") or not image.get("recipe_differences")
                or not image.get("cache_payload_proof_sha256")):
            raise ValueError("Published image has an unreviewed source difference")
        proof_path = MANIFEST.parent / image["cache_payload_proof"]
        if not proof_path.resolve().is_relative_to(MANIFEST.parent.resolve()):
            raise ValueError("Published cache proof must be inside the adapter directory")
        proof_bytes = proof_path.read_bytes()
        if hashlib.sha256(proof_bytes).hexdigest() != image["cache_payload_proof_sha256"]:
            raise ValueError("Published cache payload proof hash mismatch")
        proof = json.loads(proof_bytes)
        evidence = proof["tasks"][task.name]
        assets = [{"path": "/" + item["path"].lstrip("/"), "bytes": item["bytes"], "sha256": item["sha256"]}
                  for item in evidence["assets"]]
        if (proof["source_revision"] != manifest["source_revision"]
                or evidence["image"] != image["image"]
                or evidence["source_git_objects"] != source_objects
                or evidence["original_git_objects"] != local_objects
                or evidence["original_dockerfile_sha256"] != image["original_dockerfile_sha256"]
                or evidence["published_dockerfile_sha256"] != image["published_dockerfile_sha256"]
                or assets != image["cache_assets"]):
            raise ValueError("Published cache provenance does not match selected image and inputs")
        image = {**image, "cache_layer_diff_id": evidence["layer_diff_id"]}
        actual_dockerfile = hashlib.sha256((task / "environment/Dockerfile").read_bytes()).hexdigest()
        if actual_dockerfile != image.get("original_dockerfile_sha256"):
            raise ValueError("Published cache variant original Dockerfile mismatch")
    for part, expected in local_objects.items():
        actual = subprocess.check_output(
            ["git", "-C", str(checkout), "rev-parse", f"HEAD:tasks/{task.name}/{part}"], text=True).strip()
        if actual != expected:
            raise ValueError(f"Published image source mismatch: {task.name}/{part}")
    dirty = subprocess.check_output(
        ["git", "-C", str(checkout), "status", "--porcelain", "--untracked-files=all", "--", f"tasks/{task.name}"], text=True)
    if dirty.strip():
        raise ValueError(f"Published image task has local changes: {task.name}")
    validation = ("task.md, verifier and every non-Dockerfile environment blob match; only reviewed cache-preload "
                  "retry/transport recipe differs; original environment Git objects and clean worktree verified; "
                  "observed upstream cache bytes must pass SHA256 validation before solver starts" if cache_variant else
                  "environment, verifier and task.md Git objects match exactly; worktree clean")
    return {**{key: value for key, value in manifest.items() if key != "tasks"}, **image,
            "source_validation": validation}


def cache_validation_argv(assets):
    """Read bytes only: never deserialize weights or invoke a model/tokenizer."""
    for asset in assets:
        path = Path(asset["path"])
        if (not path.is_absolute() or ".." in path.parts
                or not str(path).startswith(("/root/.cache/huggingface/", "/root/.seisbench/"))
                or not re.fullmatch(r"[0-9a-f]{64}", asset["sha256"])
                or not isinstance(asset["bytes"], int) or asset["bytes"] < 0):
            raise ValueError("Invalid published cache asset specification")
    script = """import hashlib,json,pathlib,sys
verified=[]
for expected in json.loads(sys.argv[1]):
    data=pathlib.Path(expected['path']).read_bytes()
    actual={'path':expected['path'],'bytes':len(data),'sha256':hashlib.sha256(data).hexdigest()}
    if actual != expected:
        raise SystemExit('Published cache asset mismatch: '+expected['path'])
    verified.append(actual)
print(json.dumps({'validated_cache_assets':verified}))
"""
    return ["python3", "-c", script, json.dumps(assets)]


def validate_image_inspect(config, published):
    platform = config.get("Os", "") + "/" + config.get("Architecture", "")
    if platform != published["platform"]:
        raise ValueError(f"Published image platform mismatch: {platform}")
    if published["image"] not in config.get("RepoDigests", []):
        raise ValueError("Published image inspect does not contain the requested digest")
    expected_layer = published.get("cache_layer_diff_id")
    if expected_layer and expected_layer not in config.get("RootFS", {}).get("Layers", []):
        raise ValueError("Published image cache layer diffID mismatch")
