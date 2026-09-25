"""Read-only hook client for the project's already-running Serena daemon."""

import argparse
import asyncio
import json
import subprocess
import sys
from pathlib import Path

from mcp import ClientSession
from mcp.client.streamable_http import streamablehttp_client


def git(root, *args):
    return subprocess.check_output(["git", "-C", str(root), *args])


def check_index(root, package):
    # Whole-project diagnostics are only an index check when that whole scope
    # matches disk. Never stash/rewrite a concurrent worker's files.
    changes = git(root, "diff", "--name-only", "-z", "--", package)
    untracked = git(
        root, "ls-files", "--others", "--exclude-standard", "-z", "--", package
    )
    relevant = [
        p.decode()
        for p in (changes + untracked).split(b"\0")
        if p and (p.endswith((b".dart", b".yaml", b".yml", b".lock")))
    ]
    if relevant:
        raise ValueError(
            "Mobile analysis inputs differ from the index: " + ", ".join(relevant[:10])
        )
    return git(root, "ls-files", "--stage", "-z", "--", package)


def validate_result(result, package, expected_sdk):
    if result.get("complete") is not True or result.get("scope") != package:
        raise ValueError(
            "Serena did not return completed analysis for the requested package"
        )
    if Path(result.get("sdk_executable", "")).resolve() != expected_sdk.resolve():
        raise ValueError(
            "Serena uses a different Dart SDK; restart it with the project SDK"
        )
    diagnostics = result.get("diagnostics")
    if not isinstance(diagnostics, dict):
        raise ValueError("Malformed Serena diagnostics response")
    return diagnostics


async def run(args):
    root = Path(args.root).resolve() if args.root else Path(
        git(Path.cwd(), "rev-parse", "--show-toplevel").decode().strip()
    ).resolve()
    package = str((root / args.project).resolve().relative_to(root))
    sdk = Path(args.dart_sdk).expanduser().resolve(strict=True)
    index = check_index(root, package) if args.staged else None
    url = args.url
    async with streamablehttp_client(
        url, timeout=args.timeout, sse_read_timeout=args.timeout
    ) as (read, write, _):
        async with ClientSession(read, write) as session:
            await session.initialize()
            response = await session.call_tool(
                "get_dart_project_diagnostics",
                {
                    "relative_path": package,
                    "timeout_seconds": args.timeout,
                },
            )
            if response.isError:
                raise ValueError("Serena analysis failed: " + str(response.content))
            blocks = [
                c.text for c in response.content if getattr(c, "type", "") == "text"
            ]
            if len(blocks) != 1:
                raise ValueError("Unexpected Serena response")
            result = json.loads(blocks[0])
    diagnostics = validate_result(result, package, sdk)
    if result.get("project_root") != str(root):
        raise ValueError("Serena returned diagnostics for a different repository")
    if args.staged and index != check_index(root, package):
        raise ValueError("Git index changed during analysis; retry")
    issues = 0
    for path, entries in diagnostics.items():
        for entry in entries:
            if entry.get("severity", 1) <= 3:
                issues += 1
                line = entry["range"]["start"]["line"] + 1
                print(
                    f"{path}:{line}: {entry.get('code', 'diagnostic')}: "
                    f"{entry['message']}"
                )
    print(f"Serena Dart: analysis complete, {issues} issue(s); {result['sdk_version']}")
    return 1 if issues else 0


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--project", default="apps/mobile")
    parser.add_argument("--root")
    parser.add_argument("--url", required=True)
    parser.add_argument(
        "--dart-sdk", required=True, help="Project Dart executable (not a mise shim)"
    )
    parser.add_argument("--timeout", type=int, default=60)
    parser.add_argument("--staged", action="store_true")
    args = parser.parse_args()
    if not 1 <= args.timeout <= 120:
        parser.error("--timeout must be between 1 and 120")
    try:
        return asyncio.run(asyncio.wait_for(run(args), timeout=args.timeout))
    except (Exception, KeyboardInterrupt) as error:

        def details(exc):
            children = getattr(exc, "exceptions", None)
            return (
                "; ".join(details(child) for child in children)
                if children
                else str(exc) or type(exc).__name__
            )

        print(f"Serena Dart check incomplete: {details(error)}", file=sys.stderr)
        return 2


if __name__ == "__main__":
    sys.exit(main())
