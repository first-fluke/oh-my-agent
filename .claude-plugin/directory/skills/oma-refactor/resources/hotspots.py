#!/usr/bin/env python3
"""Join Git churn and installed lizard output without interpreting file names."""
import argparse
from collections import Counter
from pathlib import Path
import shutil
import subprocess

def churn(repo, since="1 year ago"):
    prefix = ["git", "-C", str(repo)]
    commits = subprocess.run(prefix + ["log", "--format=%H", f"--since={since}"],
                             check=True, capture_output=True, text=True).stdout.splitlines()
    counts = Counter()
    for commit in commits:
        result = subprocess.run(prefix + ["diff-tree", "--root", "--no-commit-id",
                                          "--name-only", "--no-renames", "-r", "-z", commit],
                                check=True, capture_output=True)
        counts.update(p.decode("utf-8", "surrogateescape")
                      for p in result.stdout.split(b"\0") if p)
    return counts

def measure(repo, relative_path, tool):
    path = (repo / relative_path).resolve()
    if not path.is_relative_to(repo.resolve()) or not path.is_file():
        return None
    # An absolute path is one argv entry, including spaces/newlines/$()/leading '-'.
    return subprocess.run([tool, "-C", "999", str(path)],
                          check=True, capture_output=True, text=True).stdout

def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--repo", type=Path, default=Path.cwd())
    parser.add_argument("--limit", type=int, default=30)
    args = parser.parse_args()
    tool = shutil.which("lizard")
    if not tool:
        parser.error("lizard is not installed; report that measurement is unavailable")
    for path, count in churn(args.repo).most_common(args.limit):
        output = measure(args.repo, path, tool)
        if output is not None:
            print(f"changes={count} path={path!r}\n{output}")

if __name__ == "__main__":
    main()
