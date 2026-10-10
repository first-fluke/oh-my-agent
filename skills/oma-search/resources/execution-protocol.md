# Search Route Details

The parent SKILL.md owns classification and execution order. Load only the selected route below.

### docs route
1. Call Context7 `resolve-library-id` with the library/framework name
2. If resolved: call `query-docs` with the library ID and query topic
3. If NOT resolved or empty: search the verified official documentation domain with notice, preserving the requested version and source constraints. A web retrieval tool does not broaden `--docs` to community sources.

### web route
1. Use runtime native search tool (WebSearch, Google Search, Bing, etc.)
2. If native search fails or returns blocked/empty:
   - Enter the bypass fallback (see below)
3. Collect top results with URLs

#### Bypass Fallback (on native search failure)
Delegate to the native CLI: `oma search fetch <url>`. The pipeline
auto-escalates through four strategies and stops on the first success:

- **api**: platform-specific handlers (Twitter syndication, Reddit JSON,
  HN Firebase, arXiv Atom, SE v2.3, Bluesky AT Protocol, Mastodon, Wikipedia,
  CrossRef, OpenLibrary, Lobste.rs, dev.to, V2EX, npm, PyPI, Naver blog/finance).
- **probe**: parallel Jina Reader + WebFetch + curl UA variants (first-wins).
- **impersonate**: Python `curl_cffi` subprocess (safari→chrome→firefox;
  Korean hosts prefer safari). Auto-skips remaining TLS targets on
  JS-essential markers.
- **browser**: `puppeteer-core` + system Chrome via CDP. No MCP runtime
  dependency. Install Chrome or set `OMA_CHROME_PATH`.

Sidecar: add `--include-archive` to try AMP → archive.today → Wayback
Machine when all primary strategies fail. Archive hits tag `provenance`
so consumers can deprioritize cached content.

Flags: `--only <list>`, `--skip <list>`, `--timeout <sec>`, `--locale <v>`,
`--pretty`. Exit codes: 0=ok, 2=blocked, 3=not-found, 4=invalid-input,
5=auth-required, 6=timeout, 1=error.

### code route
1. Use the CLI wrapper: `oma search code "<query>"` (wraps `gh search code` / `glab api`)
   - URL contains `gitlab.com` or `--gitlab` flag -> add `--host gitlab`
   - Optional filters: `--language <lang>`, `--repo <owner/repo>`, `--limit <n>`
   - No URL (keyword only) -> default host is github (largest OSS coverage)
2. Parse the JSON output into structured results
3. Include repo name, file path, and match context

### local route
Follow `../references/_shared/core/code-intelligence.md`. Discover configured tools for named symbols, patterns, and structure. If unavailable or timed out, use native search only for paths outside this project or ignored paths; record limitations. Do not install a provider, track a repository, or silently switch providers.

## Result normalization

1. Gather results from all dispatched routes
2. Normalize into uniform format:
   ```
   { source: "docs|web|code|local", title, url, domain, snippet }
   ```
3. Deduplicate by URL

## Trust and result presentation

Use `trust-registry.md` for score resolution, exceptions, and caching. Return the query's selected sources with route, source reference, trust label/score, relevance, and material limitations. Adapt the presentation to the request; no fixed report layout is required.

## On Error
See `error-playbook.md` for recovery steps.
