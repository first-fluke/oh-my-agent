# Search Agent - Error Playbook

## docs Route Errors

### Context7 library not found
**Symptom**: `resolve-library-id` returns no match
**Recovery**:
1. Try alternative library name spellings (e.g., "nextjs" vs "next.js")
2. If still not found: search the verified official documentation domain, preserving the requested library version and source constraints.
3. Inform the user that Context7 missed and the fallback remains official documentation only; if unavailable, report the gap.

### Context7 returns empty/irrelevant docs
**Symptom**: `query-docs` returns content that doesn't match the query topic
**Recovery**:
1. Try broader or narrower topic parameter
2. Search the verified official documentation domain with the original query and version constraints.
3. Present official results with the Context7 limitation; do not substitute community material for `--docs`.

## web Route Errors

### Native search returns empty
**Symptom**: Runtime search tool returns 0 results
**Recovery**:
1. Simplify query (remove qualifiers, keep core terms)
2. Retry with simplified query
3. If still empty: run `oma search fetch <url>` on candidate URLs

### Native search blocked (402/403)
**Symptom**: Target site returns access denied
**Recovery**:
1. Run `oma search fetch <url>`; this auto-escalates api → probe → impersonate → browser
2. Each strategy tries progressively more aggressive access methods
3. If all primary strategies fail, the pipeline automatically tries its archive sidecar (AMP / archive.today / Wayback). If that also fails, report "Unable to access this source"; `--include-archive` only promotes archive into the ordered strategy list and is not a second recovery attempt.

### `oma search fetch` all strategies fail
**Symptom**: Non-zero exit code after api/probe/impersonate/browser exhausted.
**Recovery**:
1. Read the `attempts` array in JSON output: strategies, `elapsedMs`,
   HTTP status, detected `signals`.
2. Inspect the archive sidecar attempt, which runs automatically after the primary strategies. Do not rerun solely with `--include-archive`; that flag only changes strategy ordering.
3. `paywall` signal → content gated; report auth requirement.
4. `js-essential` + browser failed → site blocks headless Chrome;
   suggest manual fetch or alternative source.
5. Exit code 6 (timeout) → rerun with `--timeout 30` or larger.

### Browser strategy cannot find Chrome
**Symptom**: `"Chrome/Chromium not found ... or set OMA_CHROME_PATH."`
**Recovery**:
1. `oma search doctor` to see detection state.
2. Install Chrome / Edge / Brave / Chromium, or set `OMA_CHROME_PATH`.
3. Or `--skip browser` to rely on api/probe/impersonate only.

### curl_cffi not installed (impersonate strategy)
**Symptom**: `"curl_cffi is not installed. Run: pip install curl_cffi"`.
**Recovery**: `pip install curl_cffi`, or `--skip impersonate`.

## code Route Errors

### gh search code rate limit
**Symptom**: HTTP 403 or "rate limit exceeded" from GitHub API
**Recovery**:
1. Inform user: "GitHub API rate limit reached (30 req/min). Wait briefly or narrow your query."
2. Suggest adding language/repo qualifiers to reduce result set
3. Do NOT retry automatically in a loop

### glab api authentication missing
**Symptom**: `glab` not installed or not authenticated
**Recovery**:
1. Check if `glab` is available: `which glab`
2. If not installed, report that the requested GitLab source is unavailable because `glab` is missing.
3. If not authenticated, report the GitLab authentication requirement.
4. Preserve an explicit host or repository constraint. Use GitHub only when existing authorization permits that source change or no source constraint was supplied.

### gh/glab returns 0 results
**Symptom**: No code matches found
**Recovery**:
1. Suggest broader query terms
2. Suggest removing language filter if one was applied
3. Offer to try `web` route instead: "No code results found. Search web for examples?"

## Trust Scoring Errors

### Domain not in registry
**Symptom**: `oma search trust <domain>` returns `level: "unknown"` (no registry, heuristic, or Tranco hit)
**Recovery**: Label as `unknown` with score `—`. Do NOT exclude from results.

### --strict mode returns 0 results
**Symptom**: All results filtered out by trust score threshold
**Recovery**:
1. Inform user: "No results meet the strict trust threshold (verified+)."
2. Suggest: "Rerun with `--wide` to see all results with trust labels."

## Intent Classification Errors

### Misclassified intent
**Symptom**: User reports results are from wrong source type
**Recovery**:
1. Suggest explicit flag: "Try `--docs` or `--web` to specify the search type."
2. Results footer always shows: "Mode: {mode} ({auto|flag})" for transparency

### docs mode returns 0, user wanted docs
**Symptom**: `docs` classified correctly but Context7 has no match
**Recovery**:
1. Search only verified official documentation domains.
2. Preserve the requested version and label the retrieval route.
3. Report a missing official source if this fallback also fails; broader sources require a scope change.

## Multi-Vendor Errors

### Runtime has no web search tool
**Symptom**: Current vendor doesn't expose a search tool
**Recovery**:
1. Skip native search, go directly to `oma search fetch <url>`
2. The probe strategy (Jina Reader + curl variants) works without vendor-specific tools

### Tool name mismatch across vendors
**Symptom**: Expected tool name doesn't exist in current runtime
**Recovery**: Follow vendor-detection protocol to identify correct tool names.
Execution protocol references generic capabilities, not specific tool names.
