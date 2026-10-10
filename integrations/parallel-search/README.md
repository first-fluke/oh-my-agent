# Parallel Search MCP example

Search the web and fetch page excerpts with the free, anonymous
[Parallel Search MCP](https://docs.parallel.ai/integrations/mcp/search-mcp).
Search uses Fast mode. No Parallel account, API key, or model credentials are
needed. Anonymous access has lower rate limits than authenticated access.

This opt-in example uses the official Python MCP client over Streamable HTTP.
It loads the adjacent `mcp.json`, discovers the tools, and executes one request.
It does not register a provider in `oma search`, change OMA's runtime search
selection, or run an agent loop. Existing Native and Brave selections remain
available as described in the [capability guide](../../docs/capability-providers.md).

## Run

Install [uv](https://docs.astral.sh/uv/getting-started/installation/) and Python
3.11 or newer. From this repository's root:

```sh
uv sync --project integrations/parallel-search
uv run --project integrations/parallel-search python integrations/parallel-search/search.py search \
  "Find the official Python asyncio documentation" --query "Python asyncio documentation"
uv run --project integrations/parallel-search python integrations/parallel-search/search.py fetch \
  https://docs.python.org/3/library/asyncio.html --objective "Explain what asyncio is for"
```

Output includes source URLs and excerpts, plus any service warnings or per-URL
fetch errors. Repeat `--query` for related search queries. Fetch accepts up to 20
HTTP/HTTPS URLs and an optional objective of at most 200 characters. Each command
has a 60-second deadline and exits nonzero on transport or MCP tool errors.
There is no automatic retry or fallback to another provider.

The configuration targets `https://search.parallel.ai/mcp`, which allows anonymous
requests. The client sends `oh-my-agent/parallel-search-example` as its User-Agent
for discovery and tool calls. It does not read API keys or saved MCP credentials.

## Verify

The offline tests exercise the actual MCP client against an in-memory HTTP
transport, including tool discovery, dispatch, headers, and error responses:

```sh
uv run --project integrations/parallel-search python -m unittest discover -s integrations/parallel-search -p 'test_*.py'
```

The search and fetch commands above make live requests. They consume anonymous
quota; run them separately from the offline tests.
