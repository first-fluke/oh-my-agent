"""Run the opt-in Parallel MCP example without model or service credentials."""

import argparse
import asyncio
import json
import sys
from datetime import timedelta
from pathlib import Path
from uuid import uuid4

import httpx
from mcp import ClientSession
from mcp.client.streamable_http import streamable_http_client

CONFIG = Path(__file__).with_name("mcp.json")
TIMEOUT_SECONDS = 60


def parse_args(argv=None):
    parser = argparse.ArgumentParser(description=__doc__)
    commands = parser.add_subparsers(dest="command", required=True)
    search = commands.add_parser("search", help="Search for sources and excerpts")
    search.add_argument("objective")
    search.add_argument("--query", action="append", required=True)
    fetch = commands.add_parser("fetch", help="Fetch excerpts from known URLs")
    fetch.add_argument("urls", nargs="+")
    fetch.add_argument("--objective")
    args = parser.parse_args(argv)
    if args.command == "search":
        if not args.objective.strip() or any(not q.strip() for q in args.query):
            parser.error("objective and queries must not be empty")
    elif len(args.urls) > 20 or any(
        httpx.URL(url).scheme not in ("http", "https") or not httpx.URL(url).host
        for url in args.urls
    ):
        parser.error("fetch requires 1–20 HTTP or HTTPS URLs")
    elif args.objective is not None and len(args.objective) > 200:
        parser.error("fetch objective must be at most 200 characters")
    return args


def tool_request(args):
    if args.command == "search":
        return "web_search", {
            "objective": args.objective,
            "search_queries": args.query,
            "session_id": str(uuid4()),
        }
    return "web_fetch", {
        "urls": args.urls,
        **({"objective": args.objective} if args.objective is not None else {}),
    }


def result_text(result):
    # Keep warnings, per-URL fetch errors, and source metadata in the output.
    if result.structuredContent is not None:
        return json.dumps(result.structuredContent, indent=2, ensure_ascii=False)
    return "\n".join(block.text for block in result.content if block.type == "text")


async def run(args):
    server = json.loads(CONFIG.read_text())["mcpServers"]["parallel-search"]
    name, arguments = tool_request(args)
    # This client never reads environment keys or saved runtime credentials.
    async with asyncio.timeout(TIMEOUT_SECONDS):
        async with httpx.AsyncClient(
            headers=server["headers"],
            timeout=TIMEOUT_SECONDS,
            follow_redirects=False,
        ) as client:
            async with streamable_http_client(server["url"], http_client=client) as (
                read,
                write,
                _,
            ):
                async with ClientSession(read, write) as session:
                    await session.initialize()
                    tools = await session.list_tools()
                    if name not in {tool.name for tool in tools.tools}:
                        raise RuntimeError(f"MCP server does not advertise {name}")
                    result = await session.call_tool(
                        name,
                        arguments,
                        read_timeout_seconds=timedelta(seconds=TIMEOUT_SECONDS),
                    )
                    text = result_text(result)
                    if result.isError:
                        raise RuntimeError(text or f"{name} failed")
                    return text


def error_text(error):
    if isinstance(error, BaseExceptionGroup):
        return "; ".join(error_text(child) for child in error.exceptions)
    return str(error) or type(error).__name__


def main():
    args = parse_args()
    try:
        print(asyncio.run(run(args)))
    except Exception as error:
        print(f"Parallel MCP: {error_text(error)}", file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
