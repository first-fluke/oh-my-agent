"""Reconcile OMA's adapter with the interpreter that owns the Serena executable."""

import argparse
import hashlib
import importlib.metadata
import importlib.util
import json
import os
from pathlib import Path
import tempfile

IMPORT = "from .oma_dart import GetDartProjectDiagnosticsTool\n"
CACHE_IMPORT = "from .oma_symbol_cache import install_symbol_cache as _install_symbol_cache\n_install_symbol_cache()\n"
SUPPORTED = {"1.7.0"}


def atomic_write(path, content):
    path.parent.mkdir(parents=True, exist_ok=True)
    fd, temporary = tempfile.mkstemp(dir=path.parent, prefix=".oma-")
    try:
        with os.fdopen(fd, "w") as output:
            output.write(content)
        if path.exists():
            os.chmod(temporary, path.stat().st_mode & 0o777)
        os.replace(temporary, path)
    finally:
        Path(temporary).unlink(missing_ok=True)


def reconcile(package, version, source, check_only=False):
    if version not in SUPPORTED:
        return {
            "status": "unsupported",
            "version": version,
            "error": f"Serena {version} is not supported by this OMA adapter (tested: 1.7.0)",
        }
    payload = (source / "oma_dart.py").read_text()
    cache_payload = (source / "oma_symbol_cache.py").read_text()
    init = package / "tools/__init__.py"
    text = init.read_text()
    updated = text if IMPORT in text else text.rstrip() + "\n" + IMPORT
    if CACHE_IMPORT not in updated:
        updated = updated.rstrip() + "\n" + CACHE_IMPORT
    target = package / "tools/oma_dart.py"
    cache_target = package / "tools/oma_symbol_cache.py"
    changed = (
        updated != text
        or not target.is_file()
        or target.read_text() != payload
        or not cache_target.is_file()
        or cache_target.read_text() != cache_payload
    )
    if changed and not check_only:
        atomic_write(target, payload)
        atomic_write(cache_target, cache_payload)
        if updated != text:
            atomic_write(init, updated)
    revision = hashlib.sha256((version + payload + cache_payload).encode()).hexdigest()
    return {
        "status": "missing" if check_only and changed else "ready",
        "version": version,
        "changed": changed and not check_only,
        "revision": revision,
        "package": str(package),
    }


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--check", action="store_true")
    args = parser.parse_args()
    try:
        version = importlib.metadata.version("serena-agent")
        package = Path(importlib.util.find_spec("serena").origin).parent
        result = reconcile(package, version, Path(__file__).parent, args.check)
    except Exception as error:
        result = {"status": "error", "error": str(error)}
    print(json.dumps(result))


if __name__ == "__main__":
    main()
