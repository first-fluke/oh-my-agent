"""Offline protocol checks through the same session and config loader as the CLI."""

import asyncio
import contextlib
import io
import json
import unittest
from unittest.mock import patch

import httpx
import search


class MCPExampleTests(unittest.IsolatedAsyncioTestCase):
    async def execute(self, argv, *, tool_error=False, advertised=True, status=200):
        observed = []
        original_client = httpx.AsyncClient

        def respond(request):
            body = json.loads(request.content) if request.content else {}
            observed.append((request, body))
            if request.method != "POST":
                return httpx.Response(405)
            if status != 200:
                return httpx.Response(status, headers={"Retry-After": "60"})
            method = body["method"]
            if "id" not in body:
                return httpx.Response(202)
            if method == "initialize":
                result = {
                    "protocolVersion": body["params"]["protocolVersion"],
                    "capabilities": {"tools": {}},
                    "serverInfo": {"name": "fixture", "version": "1"},
                }
            elif method == "tools/list":
                result = {
                    "tools": [
                        {"name": name, "inputSchema": {"type": "object"}}
                        for name in (["web_search", "web_fetch"] if advertised else [])
                    ]
                }
            elif method == "tools/call":
                result = {
                    "isError": tool_error,
                    "content": [
                        {
                            "type": "text",
                            "text": "quota exceeded"
                            if tool_error
                            else "source excerpt",
                        }
                    ],
                    **(
                        {}
                        if tool_error
                        else {
                            "structuredContent": {
                                "results": [
                                    {
                                        "url": "https://example.com",
                                        "excerpts": ["source excerpt"],
                                    }
                                ],
                                "warnings": [{"message": "fixture warning"}],
                            }
                        }
                    ),
                }
            else:
                raise AssertionError(method)
            return httpx.Response(
                200, json={"jsonrpc": "2.0", "id": body["id"], "result": result}
            )

        def client(**kwargs):
            self.assertFalse(kwargs["trust_env"])
            self.assertFalse(kwargs["follow_redirects"])
            return original_client(transport=httpx.MockTransport(respond), **kwargs)

        with patch.object(search.httpx, "AsyncClient", side_effect=client):
            output = await search.run(search.parse_args(argv))
        return output, observed

    async def test_search_config_discovery_dispatch_and_anonymous_headers(self):
        output, observed = await self.execute(
            [
                "search",
                "Find source",
                "--query",
                "source documentation",
                "--query",
                "official source docs",
            ]
        )
        self.assertIn("https://example.com", output)
        self.assertIn("fixture warning", output)
        posts = [body for request, body in observed if request.method == "POST"]
        self.assertEqual(
            [body["method"] for body in posts],
            ["initialize", "notifications/initialized", "tools/list", "tools/call"],
        )
        args = posts[-1]["params"]
        self.assertEqual(args["name"], "web_search")
        self.assertEqual(
            args["arguments"]["search_queries"],
            ["source documentation", "official source docs"],
        )
        self.assertEqual(args["arguments"]["objective"], "Find source")
        self.assertEqual(len(args["arguments"]["session_id"]), 36)
        for request, _ in observed:
            self.assertEqual(str(request.url), "https://search.parallel.ai/mcp")
            self.assertEqual(
                request.headers["User-Agent"], "oh-my-agent/parallel-search-example"
            )
            self.assertNotIn("Authorization", request.headers)

    async def test_fetch_dispatch_retains_excerpts_and_warnings(self):
        output, observed = await self.execute(
            ["fetch", "https://example.com", "--objective", "Find details"]
        )
        call = next(body for _, body in observed if body.get("method") == "tools/call")
        self.assertEqual(
            call["params"],
            {
                "name": "web_fetch",
                "arguments": {
                    "urls": ["https://example.com"],
                    "objective": "Find details",
                },
            },
        )
        self.assertIn("source excerpt", output)
        self.assertIn("fixture warning", output)

    async def test_tool_error_is_not_reported_as_success(self):
        with self.assertRaises(Exception) as caught:
            await self.execute(["fetch", "https://example.com"], tool_error=True)
        self.assertIn("quota exceeded", search.error_text(caught.exception))

    async def test_missing_tool_stops_before_dispatch(self):
        with self.assertRaises(Exception) as caught:
            await self.execute(["fetch", "https://example.com"], advertised=False)
        self.assertIn(
            "does not advertise web_fetch", search.error_text(caught.exception)
        )

    async def test_http_rate_limit_is_not_success(self):
        with self.assertRaises(Exception) as caught:
            await self.execute(["fetch", "https://example.com"], status=429)
        self.assertIn("429", search.error_text(caught.exception))

    async def test_overall_deadline_cancels_transport(self):
        original_client = httpx.AsyncClient
        cancelled = asyncio.Event()

        async def respond(request):
            try:
                await asyncio.sleep(10)
            finally:
                cancelled.set()

        def client(**kwargs):
            return original_client(transport=httpx.MockTransport(respond), **kwargs)

        with (
            patch.object(search, "TIMEOUT_SECONDS", 0.01),
            patch.object(search.httpx, "AsyncClient", side_effect=client),
        ):
            with self.assertRaises(TimeoutError):
                await search.run(search.parse_args(["fetch", "https://example.com"]))
        self.assertTrue(cancelled.is_set())

    def test_invalid_input_rejected_before_network(self):
        for argv in (
            ["fetch", "file:///etc/passwd"],
            ["fetch", "https://example.com", "--objective", "x" * 201],
            ["fetch", *(["https://example.com"] * 21)],
            ["search", " ", "--query", "docs"],
        ):
            with self.subTest(argv=argv), contextlib.redirect_stderr(io.StringIO()):
                with self.assertRaises(SystemExit) as caught:
                    search.parse_args(argv)
                self.assertEqual(caught.exception.code, 2)


if __name__ == "__main__":
    unittest.main()
