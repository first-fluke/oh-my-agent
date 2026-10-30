#!/usr/bin/env python3
"""Run existing app checks for staged changes or a complete branch diff."""
import argparse
from pathlib import Path
import subprocess

APPS = ("web", "api", "mobile")
# Adapt each entry to applicable apps; absent required tasks must fail.
CHECK_APPS = {kind: APPS for kind in ("check", "lint", "typecheck", "test")}

def affected_apps(paths):
    """Unknown/shared/root paths conservatively affect every example app."""
    affected = set()
    for path in paths:
        parts = path.split("/")
        if len(parts) >= 3 and parts[0] == "apps" and parts[1] in APPS:
            affected.add(parts[1])
        else:
            return list(APPS)
    return [app for app in APPS if app in affected]

def changed_paths(repo, *, staged=False, base=None):
    prefix = ["git", "-C", str(repo)]
    if staged:
        args = ["diff", "--cached", "--name-only", "-z"]
        result = subprocess.run(prefix + args, check=True, capture_output=True)
        return [p.decode("utf-8", "surrogateescape") for p in result.stdout.split(b"\0") if p]
    if not base:
        return None # unknown base: run every app instead of silently skipping
    result = subprocess.run(prefix + ["diff", "--name-only", "-z", f"{base}...HEAD"],
                            capture_output=True)
    if result.returncode:
        return None
    working = subprocess.run(prefix + ["diff", "--name-only", "-z", "HEAD"],
                             check=True, capture_output=True)
    return [p.decode("utf-8", "surrogateescape")
            for p in (result.stdout + working.stdout).split(b"\0") if p]

def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--kind", choices=tuple(CHECK_APPS), required=True)
    parser.add_argument("--staged", action="store_true")
    parser.add_argument("--base", help="PR target revision or configured target branch")
    parser.add_argument("--repo", type=Path, default=Path.cwd())
    parser.add_argument("--list", action="store_true", help="Print app names without running checks")
    args = parser.parse_args()
    paths = changed_paths(args.repo, staged=args.staged, base=args.base)
    apps = list(APPS) if paths is None else affected_apps(paths)
    apps = [app for app in apps if app in CHECK_APPS[args.kind]]
    for app in apps:
        if args.list:
            print(app)
        else:
            subprocess.run(["mise", "run", f"//apps/{app}:{args.kind}"],
                           cwd=args.repo, check=True)

if __name__ == "__main__":
    main()
